#!/usr/bin/env node
// evidence-audit —— run bundle 证据溯源审计（keyless：纯 fs + zstd CLI；防伪造链接/转写幻觉/
// 溯源断链——RFC evidence-reliability L3）。
//
// 为什么存在：evidence/*.md 是模型从 tool result **手写**的——URL 可伪造、引句可转写错/编造、
// final 引用可断链。会话日志存着全部真相（model-visible ⟺ logged：每次 web 工具调用的
// 原始结果都在 zstd 日志里），本工具拿它对账，把"谁知道是不是幻觉"变成机检报告。
//
// 三条断言（RFC 判据）：
//   ① source_url 溯源：evidence 声称的每个 URL（frontmatter source_url，无 frontmatter 的
//      存量文件则取正文全部 http(s) 链接）必须在会话日志的**工具事件**（tool/call 与
//      tool/result）里真实出现过——模型口头提过的 URL 不算（防伪造链接）；
//   ② 摘录转写回溯：原文摘录（blockquote）规范化后在工具结果语料中可找到（防转写幻觉；
//      规范化 = 去空白/markdown 强调符 + 小写——CJK 安全；匹配不到的如实列出，报告覆盖率）；
//   ③ final 溯源链：final/ 当前版每条 [来源: evidence/xx.md] 指向真实存在的证据文件
//      （**反引号内的格式说明占位不算引用**——首场 run 审计的假阳性，实测修正）。
// 附带：契约符合性（frontmatter 硬五字段；无 frontmatter = 契约不符 MAJOR——首场 run 31 份
// 全无 frontmatter，如实揭出）与佐证结构（按 supports 分组数独立域名，<2 标单域）。
//
// 输出：审计报告写 <bundle>/audit.md（run bundle 的新增文件，不改既有文件）+ 控制台摘要；
//       存在 CRITICAL（伪造链接 / final 断链）→ exit 1（供 CI/收尾判据用）。
//       （auditBundle() 可导入——tests/ 层禁子进程，keyless 测试走纯 .jsonl 夹具直调。）
// 用法：node scripts/evidence-audit.mjs <run-bundle-dir> [--sessions <会话根>]（缺省 $DSH_HOME/sessions）
//       node scripts/evidence-audit.mjs --latest（取 research-workspace 最新 drt_*）
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 拆 frontmatter（与 run-dashboard 同款逻辑；独立副本——audit 不依赖 dashboard 的副作用面）。 */
export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  if (!m) return { fm: null, body: text }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (kv) fm[kv[1]] = kv[2].trim()
  }
  return { fm, body: m[2] }
}

// 尾部清理集（2026-09-26 实测修复）：原版只剥 ASCII `.,;:)]`，于是证据卡里形如
// `` `https://x/y`（HTTP 200） `` 的写法被抽成 `https://x/y`（HTTP`——**不匹配语料 → 假 CRITICAL**。
// 现把反引号与全角括号一并排除/剥除（URL 内本就不会出现这两类字符）。
const URL_RE = /https?:\/\/[^\s>)）』」"'\]，。；`（]+/g
const urlsOf = (text) => [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:)\]`）】」'"]+$/, ''))
/** 规范化（CJK 安全）：去全部空白 + markdown 强调符 + 小写。 */
// 去空白 + markdown 语法符（强调/引用/标题/列表/表格分隔 `|`）——表格行摘录要能与来源原文对齐。
export const normalize = (s) => s.replace(/[\s>*_`#·•|]+/gu, '').toLowerCase()
const stripTrailing = (u) => u.replace(/\/+$/, '')

/** 会话日志语料（全部会话；只认工具事件——模型口述的 URL 不算数）。.jsonl 直读、.zstd 走 CLI。 */
export function buildCorpus(root) {
  const urls = new Set()
  const chunks = [] // 逐事件规范化分片（**不要** join 成一个大字符串）
  let sessionFiles = 0
  if (!existsSync(root)) return { urls, chunks, sessionFiles }
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.jsonl(\.zstd)?$/.test(ent.name)) {
        sessionFiles += 1
        let text = ''
        if (ent.name.endsWith('.zstd')) {
          const r = spawnSync('zstd', ['-dc', p], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
          if (r.status !== 0) return
          text = r.stdout
        } else text = readFileSync(p, 'utf8')
        for (const line of text.split('\n')) {
          if (!line.includes('"type":"tool/')) continue
          let e
          try { e = JSON.parse(line) } catch { continue }
          if (e?.type !== 'tool/call' && e?.type !== 'tool/result' && e?.type !== 'tool-call' && e?.type !== 'tool-result') continue
          // ⚠ 反转义斜杠（2026-09-26 实测的关键修复）：tool/call 的 `arguments` 是**内嵌 JSON 字符串**，
          // 其中的 URL 在日志里是 `https:\/\/host\/path` 形态；不反转义则 URL_RE 一条也匹配不到
          // ——后果是**把真实抓取过的来源判成"伪造链接"**（实测 5 个 host 各命中 11–19 次仍被误判）。
          const payload = JSON.stringify(e.data ?? {}).replace(/\\\//g, '/')
          // 分片存储（2026-09-26 实测修复）：原先 `texts.join('\n')` 在会话日志长到十几 MB
          // 压缩量时超出 V8 单字符串上限 → `RangeError: Invalid string length`，**审计整条崩掉**。
          // 摘录回溯本来只需"在某一个工具事件里出现过"，逐片判定等价且内存安全。
          chunks.push(normalize(payload.slice(0, 4 * 1024 * 1024)))
          for (const u of urlsOf(payload)) urls.add(u)
        }
      }
    }
  }
  walk(root)
  return { urls, chunks, sessionFiles }
}

/**
 * 审计一个 run bundle（核心逻辑，可导入；keyless）。
 * @param bundleDir - run bundle 目录（drt_*）。
 * @param sessionsRoot - 会话日志根。
 * @returns { findings, criticalCount, stats, report }——findings: { level: CRITICAL|MAJOR|INFO, file, kind, detail }。
 */
// 已知限制（2026-09-26 跑 run 实测，如实记档）：
//   · ① URL 溯源 = 逐字 / 仅域名 / 都没有 三档——"域名抓过但路径是派生态"不再误判为伪造。
//   · ② 摘录回溯对**表格行**逐格判定；但**翻译或改写过的摘录永远对不上**（本仓 run 的卡片是
//     中文交付、来源多为英文，卡内译文属正常实践）。故 ② 的未命中数**不等于**伪造数，
//     读报告时看 kind 分档，别只看总数。
export function auditBundle(bundleDir, sessionsRoot) {
  const evDir = join(bundleDir, 'evidence')
  const findings = []
  const evidence = []
  if (existsSync(evDir)) {
    for (const f of readdirSync(evDir).filter((x) => x.endsWith('.md')).sort()) {
      const raw = readFileSync(join(evDir, f), 'utf8')
      const { fm, body } = splitFrontmatter(raw)
      const rec = { file: f, fm, claimedUrls: [], quotes: [] }
      if (fm?.source_url) rec.claimedUrls.push(fm.source_url)
      rec.claimedUrls.push(...urlsOf(body))
      rec.claimedUrls = [...new Set(rec.claimedUrls)]
      for (const line of body.split('\n')) {
        const m = /^>\s*(.+)$/.exec(line)
        if (m && m[1].trim().length >= 16) rec.quotes.push(m[1].trim())
      }
      if (!fm) findings.push({ level: 'MAJOR', file: f, kind: '契约不符', detail: '无 frontmatter（硬五字段全缺）——存量散文式证据卡' })
      else {
        for (const k of ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports']) {
          if (!fm[k]) findings.push({ level: 'MAJOR', file: f, kind: '契约不符', detail: `缺硬字段 ${k}` })
        }
        if (!fm.source_tier || !fm.publisher) findings.push({ level: 'INFO', file: f, kind: '未分级', detail: '软二字段（source_tier/publisher）缺失' })
      }
      evidence.push(rec)
    }
  }
  const corpus = buildCorpus(sessionsRoot)
  const corpusUrlSet = new Set([...corpus.urls].map(stripTrailing))

  // ① URL 溯源（三档——2026-09-26 实测细化：原版只有"逐字命中/CRITICAL"两档，把
  //    「域名抓过、路径是派生态（ar5iv/PDF 变体、站点根）」也打成 CRITICAL，假阳性淹没真问题）
  //    · 逐字命中 → OK
  //    · 域名（scheme+host）命中但路径没命中 → MAJOR「仅域名可溯源」
  //    · 域名也没命中 → CRITICAL「域名与 URL 都未出现」
  // 比 host（含端口）而不是 origin：实测 run 的卡片常写 `http://…` 而日志里是 `https://…`
  // （或反之），用 origin 比会把**同一站点**判成"域名也没抓过"→ 假 CRITICAL（实测 61 次命中被误判）。
  const hosts = new Set()
  for (const u of corpusUrlSet) {
    try { hosts.add(new URL(u).host) } catch { /* 非法 URL 跳过 */ }
  }
  let urlOk = 0
  let urlTotal = 0
  for (const rec of evidence) {
    for (const u of rec.claimedUrls) {
      urlTotal += 1
      if (corpusUrlSet.has(stripTrailing(u))) { urlOk += 1; continue }
      let host = null
      try { host = new URL(u).host } catch { /* 非法 URL */ }
      if (host !== null && hosts.has(host)) {
        findings.push({ level: 'MAJOR', file: rec.file, kind: '仅域名可溯源', detail: `具体路径未在工具事件中出现（域名已抓过）：${u.slice(0, 100)}` })
        continue
      }
      findings.push({ level: 'CRITICAL', file: rec.file, kind: '伪造链接/未溯源', detail: `域名与 URL 都未出现在任何工具事件里：${u.slice(0, 100)}` })
    }
  }
  // ② 摘录转写回溯
  let quoteOk = 0
  let quoteTotal = 0
  for (const rec of evidence) {
    for (const q of rec.quotes) {
      quoteTotal += 1
      const n = normalize(q)
      if (n.length >= 8 && corpus.chunks.some((c) => c.includes(n))) { quoteOk += 1; continue }
      // 逐字命中失败时的分级（2026-09-26 实测细化）：长摘录里含表格行/改写时，整串必然对不上，
      // 但**开头**通常仍逐字来自来源——把"头部可溯源"降为 INFO，只在**头部都对不上**时才判
      // MAJOR 转写不符（那才是"凭空写摘录"的信号）。原版一律 MAJOR，实测 505 条假阳性。
      // 表格行摘录（原串含 `|`）：语义单位是**单元格**，不是整行——逐格回溯，
      // 全部格可溯源即通过，部分可溯源降 INFO，一格都对不上才 MAJOR。
      if (q.includes('|')) {
        const cells = q.split('|').map((x) => normalize(x)).filter((x) => x.length >= 8)
        if (cells.length > 0) {
          const okCells = cells.filter((x) => corpus.chunks.some((c) => c.includes(x))).length
          if (okCells === cells.length) { quoteOk += 1; continue }
          if (okCells > 0) {
            findings.push({ level: 'INFO', file: rec.file, kind: '摘录部分可溯源', detail: `表格行 ${okCells}/${cells.length} 格可回溯：${q.slice(0, 60)}` })
            continue
          }
        }
      }
      const head = n.slice(0, 60)
      if (head.length >= 8 && corpus.chunks.some((c) => c.includes(head))) {
        findings.push({ level: 'INFO', file: rec.file, kind: '摘录非逐字', detail: `头部可溯源、整段非逐字（表格/改写）：${q.slice(0, 60)}` })
        continue
      }
      findings.push({ level: 'MAJOR', file: rec.file, kind: '转写不符', detail: `摘录头部即不可回溯（前 60 字）：${q.slice(0, 60)}` })
    }
  }
  // ③ final 溯源链（反引号内的格式说明占位不算引用——先剥 code span）
  let finalRefs = 0
  let finalBroken = 0
  const finalPath = join(bundleDir, 'final.md')
  if (existsSync(finalPath)) {
    const finalText = readFileSync(finalPath, 'utf8').replace(/`[^`]*`/g, '')
    for (const m of finalText.matchAll(/\[来源:\s*evidence\/([^\]]+?)\]/g)) {
      finalRefs += 1
      const whole = m[1].trim()
      const path = whole.split(/[\s§]/)[0] // 路径只取到空白/§ 为止（`xx.md §四` 是节指引，不是文件名）
      if (!existsSync(join(evDir, path))) {
        finalBroken += 1
        findings.push({ level: 'CRITICAL', file: 'final.md', kind: '溯源断链', detail: `[来源: evidence/${whole}] 指向的文件不存在` })
      } else if (path !== whole) {
        // 文件在，但引用括号里塞了节指引——契约格式是 `[来源: evidence/<file>.md]`
        findings.push({ level: 'MAJOR', file: 'final.md', kind: '引用格式偏差', detail: `[来源: evidence/${whole}] 括号内含节指引；契约格式只写文件路径（文件本身存在）` })
      }
    }
  }
  // 佐证结构（有 frontmatter 的 evidence 才能评估）
  const byTopic = new Map()
  for (const rec of evidence) {
    if (!rec.fm?.supports) continue
    const t = rec.fm.supports
    let domain = rec.fm.publisher ?? null
    if (domain === null && rec.claimedUrls[0] !== undefined) {
      try { domain = new URL(rec.claimedUrls[0]).hostname } catch { domain = null }
    }
    if (!byTopic.has(t)) byTopic.set(t, new Set())
    if (domain) byTopic.get(t).add(domain)
  }
  for (const [t, domains] of byTopic) {
    if (domains.size < 2) findings.push({ level: 'INFO', file: '(佐证结构)', kind: '单域 topic', detail: `${t} 仅 ${domains.size} 个独立域名（交叉验证纪律：关键结论 ≥2 独立信源——判定归 critic，此处机械提示）` })
  }

  const critical = findings.filter((f) => f.level === 'CRITICAL')
  const major = findings.filter((f) => f.level === 'MAJOR')
  const info = findings.filter((f) => f.level === 'INFO')
  const report = `# Evidence Audit — ${bundleDir.split('/').pop()}（${new Date().toISOString()}）

> 由 scripts/evidence-audit.mjs 生成（keyless 机械对账；正本判据 = 研究手册 §证据文件契约）。
> 会话语料：${corpus.sessionFiles} 个日志文件、${corpus.urls.size} 个工具事件 URL。

## 概要

| 检查 | 结果 |
|---|---|
| 证据文件 | ${evidence.length} 份（frontmatter 契约符合：${evidence.filter((r) => r.fm).length} 份） |
| ① URL 溯源 | ${urlOk}/${urlTotal} 可回溯到会话日志工具事件 |
| ② 摘录转写回溯 | ${quoteOk}/${quoteTotal} 可在工具结果语料中找到 |
| ③ final 溯源链 | ${finalRefs} 条引用，断链 ${finalBroken} 条 |
| 发现 | CRITICAL ${critical.length} · MAJOR ${major.length} · INFO ${info.length} |

## CRITICAL（伪造链接 / 溯源断链）

${critical.length === 0 ? '（无）' : critical.map((f) => `- **${f.file}** [${f.kind}] ${f.detail}`).join('\n')}

## MAJOR（契约不符 / 转写不符）

${major.length === 0 ? '（无）' : major.map((f) => `- **${f.file}** [${f.kind}] ${f.detail}`).join('\n')}

## INFO（未分级 / 佐证结构提示）

${info.length === 0 ? '（无）' : info.map((f) => `- **${f.file}** [${f.kind}] ${f.detail}`).join('\n')}
`
  return { findings, criticalCount: critical.length, stats: { evidence: evidence.length, withFm: evidence.filter((r) => r.fm).length, urlOk, urlTotal, quoteOk, quoteTotal, finalRefs, finalBroken, critical: critical.length, major: major.length, info: info.length }, report }
}

// ── CLI ──
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2)
  const latest = argv.includes('--latest')
  const sessionsIdx = argv.indexOf('--sessions')
  // 会话根解析（2026-09-26 实测修复）：**不能盲信继承来的 DSH_HOME**。实测：在日用 GUI 的 shell 里
  // DSH_HOME 常已被设成 `~/.dsh`（日用 home），于是本脚本会去审计**另一个 home 的会话**——
  // 同一 bundle 两次跑出 7/88 与 85/88（1807 vs 330 个日志文件），足以把好报告判成"伪造链接"。
  // 处置：默认锚定本仓 dev home；DSH_HOME 指向别处时**先自拒**（同 L1/L2 的 exit 2 纪律），
  // 要审别的 home 就显式 `--sessions <dir>`。
  const repoHome = join(ROOT, 'dev', 'harness-home')
  const envHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
  if (sessionsIdx === -1 && envHome !== null && envHome !== repoHome) {
    console.error(`evidence-audit: DSH_HOME=${envHome} 不是本仓 dev home（${repoHome}）——先 \`source dev/env.sh\`，或显式 --sessions <dir>；本脚本不自作主张换 home（实测会审到别的 home 的会话，结论不可比）`)
    process.exit(2)
  }
  const sessionsRoot = sessionsIdx !== -1 ? resolve(argv[sessionsIdx + 1]) : join(repoHome, 'sessions')
  const bundleArg = argv.find((a) => !a.startsWith('--') && a !== sessionsRoot)
  const statMs = (p) => { try { return statSync(p).mtimeMs } catch { return 0 } }
  let bundleDir = null
  if (latest) {
    const dir = join(ROOT, 'research-workspace')
    const cands = readdirSync(dir).filter((d) => /^drt_/.test(d)).map((d) => ({ d, m: statMs(join(dir, d)) })).sort((a, b) => b.m - a.m)
    bundleDir = cands.length > 0 ? join(dir, cands[0].d) : null
  } else if (bundleArg) bundleDir = resolve(bundleArg)
  if (bundleDir === null || !existsSync(bundleDir)) {
    console.error('evidence-audit: 用法 node scripts/evidence-audit.mjs <run-bundle-dir> | --latest（bundle 不存在）')
    process.exit(2)
  }
  const { stats, report, criticalCount } = auditBundle(bundleDir, sessionsRoot)
  writeFileSync(join(bundleDir, 'audit.md'), report)
  console.log(`evidence-audit: ${stats.evidence} 份证据 · URL 溯源 ${stats.urlOk}/${stats.urlTotal} · 摘录回溯 ${stats.quoteOk}/${stats.quoteTotal} · final 链 ${stats.finalRefs - stats.finalBroken}/${stats.finalRefs}`)
  console.log(`  发现：CRITICAL ${stats.critical} · MAJOR ${stats.major} · INFO ${stats.info} —— 报告已写 ${join(bundleDir, 'audit.md')}`)
  process.exit(criticalCount === 0 ? 0 : 1)
}
