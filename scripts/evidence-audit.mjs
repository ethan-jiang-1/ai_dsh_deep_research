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

const URL_RE = /https?:\/\/[^\s>)）』」"'\]，。；]+/g
const urlsOf = (text) => [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:)\]]+$/, ''))
/** 规范化（CJK 安全）：去全部空白 + markdown 强调符 + 小写。 */
export const normalize = (s) => s.replace(/[\s>*_`#·•]+/gu, '').toLowerCase()
const stripTrailing = (u) => u.replace(/\/+$/, '')

/** 会话日志语料（全部会话；只认工具事件——模型口述的 URL 不算数）。.jsonl 直读、.zstd 走 CLI。 */
export function buildCorpus(root) {
  const urls = new Set()
  const texts = []
  let sessionFiles = 0
  if (!existsSync(root)) return { urls, text: '', sessionFiles }
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
          const payload = JSON.stringify(e.data ?? {})
          texts.push(payload)
          for (const u of urlsOf(payload)) urls.add(u)
        }
      }
    }
  }
  walk(root)
  return { urls, text: texts.join('\n'), sessionFiles }
}

/**
 * 审计一个 run bundle（核心逻辑，可导入；keyless）。
 * @param bundleDir - run bundle 目录（drt_*）。
 * @param sessionsRoot - 会话日志根。
 * @returns { findings, criticalCount, stats, report }——findings: { level: CRITICAL|MAJOR|INFO, file, kind, detail }。
 */
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
  const corpusNorm = normalize(corpus.text)
  const corpusUrlSet = new Set([...corpus.urls].map(stripTrailing))

  // ① URL 溯源
  let urlOk = 0
  let urlTotal = 0
  for (const rec of evidence) {
    for (const u of rec.claimedUrls) {
      urlTotal += 1
      if (corpusUrlSet.has(stripTrailing(u))) { urlOk += 1; continue }
      findings.push({ level: 'CRITICAL', file: rec.file, kind: '伪造链接/未溯源', detail: `URL 不在任何会话日志的工具事件里：${u.slice(0, 100)}` })
    }
  }
  // ② 摘录转写回溯
  let quoteOk = 0
  let quoteTotal = 0
  for (const rec of evidence) {
    for (const q of rec.quotes) {
      quoteTotal += 1
      const n = normalize(q)
      if (n.length >= 8 && corpusNorm.includes(n)) { quoteOk += 1; continue }
      findings.push({ level: 'MAJOR', file: rec.file, kind: '转写不符', detail: `摘录在工具结果语料中不可回溯（前 60 字）：${q.slice(0, 60)}` })
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
      if (!existsSync(join(evDir, m[1].trim()))) {
        finalBroken += 1
        findings.push({ level: 'CRITICAL', file: 'final.md', kind: '溯源断链', detail: `[来源: evidence/${m[1]}] 指向的文件不存在` })
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
  const sessionsRoot = sessionsIdx !== -1 ? resolve(argv[sessionsIdx + 1]) : (process.env.DSH_HOME ? join(resolve(process.env.DSH_HOME), 'sessions') : join(ROOT, 'dev', 'harness-home', 'sessions'))
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
