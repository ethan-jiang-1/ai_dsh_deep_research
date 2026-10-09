// evidence-audit-core.mjs — run bundle 证据溯源审计的判据核心（keyless 纯逻辑）。
// 从 scripts/run-gates/evidence-audit.mjs 拆出（2026-10-09 layering 二代：tests/
// evidence-audit.test.mjs 消费 auditBundle——驱动壳起子进程（zstd CLI），不得被 tests
// import；三条断言与语料窗的判据注释住在驱动壳头注，本文件只搬函数与判据内注释）。
// readLog 注入（company keyless-imports 的 injected readers 同型）：默认纯 reader 只读
// .jsonl——.zstd 报线索后返回 null（调用方跳过该文件，语料缺失偏红方向）；zstd CLI
// reader 由驱动壳注入（scripts/run-gates/evidence-audit.mjs——多帧拼接日志靠 CLI 解全帧，
// 行为不变）。返回 null 与抛错都按"跳过该文件"处理，不吞整个目录。
// 消费方：scripts/run-gates/evidence-audit.mjs（驱动壳）+ tests/evidence-audit.test.mjs（纯 .jsonl 夹具直调）。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

/** 纯日志 reader：.jsonl 直读；.zstd 报线索后返回 null（跳过文件，语料缺失偏红方向）。
 *  zstd CLI 解压由驱动壳注入，本模块零子进程。 */
export const plainLogReader = (p) => {
  if (p.endsWith('.zstd')) {
    console.error(`evidence-audit-core: ${p} 是压缩日志——纯 reader 不解压，跳过该文件（语料缺失偏红方向）；zstd 读取由驱动壳注入（scripts/run-gates/evidence-audit.mjs）`)
    return null
  }
  return readFileSync(p, 'utf8')
}

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
// ⚠ 反斜杠也必须排除（2026-09-26 实测）：tool/call 的 `arguments` 是内嵌 JSON 字符串，`JSON.stringify`
// 会把内层引号转义成 `\"`，于是 URL 尾巴上粘一个 `\`——抽成 `https://x/y\` 与卡片的干净 URL 对不上，
// 直接导致"真抓过的 source_url 被判没抓过"。URL 内本就不会出现反斜杠。
const URL_RE = /https?:\/\/[^\s>)）』」"'\]，。；`（\\]+/g
const urlsOf = (text) => [...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:)\]`）】」'"\\]+$/, ''))
/** 规范化（CJK 安全）：去全部空白 + markdown 强调符 + 小写。 */
// 去空白 + markdown 语法符（强调/引用/标题/列表/表格分隔 `|`）+ **引号/书名号类装饰符** +
// **反斜杠转义**。引号与转义都是实测补的：59 条逐字摘录只因卡片用 `"…"` 包住原文被判失败；
// 第四场 run 又有 33+ 条只因 `128K\<Token≤256K`（卡片把 `<` 转义成 `\<` 防止被当 HTML 标签、
// 来源页无转义）整条失配——判据是"文字是否来自来源"，不是"装饰与转义是否一致"。
export const normalize = (s) => s.replace(/[\\\s>*_`#·•|"'“”‘’「」『』]+/gu, '').toLowerCase()
const stripTrailing = (u) => u.replace(/\/+$/, '')

/**
 * 会话日志语料——**只认 web 工具事件**（`web_fetch` / `web_search` 的 call 与 result）。
 *
 * ⚠ 为什么必须剔除 agent 自撰文本（2026-09-26 实测的重大缺陷）：原版吞掉**全部** tool/call 与
 * tool/result，其中 `write` 的 arguments **就是被审的那张证据卡本身**、`read`/`grep` 的 result 又把
 * 它读回来——于是"摘录可回溯"在很大程度上是**自证**。实测：判"已溯源"的摘录里，deep-research 有
 * 102/279、infra 有 266/333 仅由自撰事件命中；把语料限到 web 结果后，真实可回溯降到 196/446 与
 * 51/368。更糟的是：任何 normalize 放宽都会把它推成 446/446 满堂红（实测未溯源的 167/167、35/35
 * 全部被"修好"）——**一个能自证的审计等于不存在**。
 *
 * 返回：webUrls（web 事件里出现过的 URL，含搜索结果列表）/ fetchedOk / fetchFailed（web_fetch 的
 * 成败，按 call 的 url 与 result 的 `Fetched …` vs `Error:` 判定）/ webChunks（web 结果正文分片）。
 */
export function buildCorpus(root, slug = null, readLog = plainLogReader) {
  const webUrls = new Set()
  const fetchedOk = new Set()
  const fetchFailed = new Set()
  const webChunks = []
  let sessionFiles = 0
  let windowFiles = 0
  let windowSkipped = 0
  let webEvents = 0
  if (!existsSync(root)) return { webUrls, fetchedOk, fetchFailed, webChunks, sessionFiles, windowFiles, windowSkipped, webEvents }
  const isWeb = (name) => name === 'web_fetch' || name === 'web_search'
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.jsonl(\.zstd)?$/.test(ent.name)) {
        sessionFiles += 1
        const text = readLog(p)
        // reader 返回 null（压缩日志纯 reader 不解压 / 驱动解压失败）= 跳过该文件，不吞目录
        if (text === null || text === undefined) continue
        // 语料窗（审计 P3 件⑧）：只认提及本 bundle slug 的会话——跨 run 会话里的 URL
        // 不得为本 run 作证（污染实证：全 home 语料让别的 run 抓过的 URL 过审）。
        // 真实 run 会话必含 slug（写 bundle 路径的调用）；I/O 不变（解压后才知道是否在窗内），
        // 按会话组名预筛是 vendor 私有编码耦合，被否（见 RFC 输掉的方案）。
        if (slug && !text.includes(slug)) { windowSkipped += 1; continue }
        windowFiles += 1
        const callName = new Map()
        const callUrl = new Map()
        for (const line of text.split('\n')) {
          if (!line.includes('"type":"tool/')) continue
          let e
          try { e = JSON.parse(line) } catch { continue }
          if (e?.type !== 'tool/call' && e?.type !== 'tool/result' && e?.type !== 'tool-call' && e?.type !== 'tool-result') continue
          // 反转义斜杠：tool/call 的 `arguments` 是内嵌 JSON 字符串，URL 在日志里是 `https:\/\/…`
          const payload = JSON.stringify(e.data ?? {}).replace(/\\\//g, '/')
          if (e.type === 'tool/call' || e.type === 'tool-call') {
            const name = e.data?.name
            callName.set(e.data?.callId, name)
            if (isWeb(name)) {
              webEvents += 1
              const us = urlsOf(payload)
              for (const u of us) webUrls.add(u)
              if (name === 'web_fetch' && us.length > 0) callUrl.set(e.data.callId, us[0])
            }
            continue
          }
          // tool/result：按 callId 反查工具名（result 自身不带名字）
          const id = e.data?.message?.toolCallId ?? e.data?.toolCallId
          const name = callName.get(id)
          if (!isWeb(name)) continue
          webEvents += 1
          for (const u of urlsOf(payload)) webUrls.add(u)
          const body = JSON.stringify(e.data?.message?.content ?? '')
          if (name === 'web_fetch') {
            const target = callUrl.get(id)
            if (target !== undefined) {
              if (/^\[\{"type":"text","text":"Error:/.test(body)) fetchFailed.add(target)
              else if (body.includes('Fetched ')) fetchedOk.add(target)
            }
          }
          // 分片存储（不要 join 成一个大字符串——历史上 RangeError: Invalid string length 就是这么来的）
          webChunks.push(normalize(body.slice(0, 4 * 1024 * 1024)))
        }
      }
    }
  }
  walk(root)
  return { webUrls, fetchedOk, fetchFailed, webChunks, sessionFiles, windowFiles, windowSkipped, webEvents }
}

/**
 * 审计一个 run bundle（核心逻辑，可导入；keyless）。opts.readLog 注入日志 reader（默认纯
 * reader——.zstd 跳过文件偏红；驱动壳注入 zstd CLI reader 读全帧）。
 * @param bundleDir - run bundle 目录（drt_*）。
 * @param sessionsRoot - 会话日志根。
 * @returns { findings, criticalCount, stats, report }——findings: { level: CRITICAL|MAJOR|INFO, file, kind, detail }。
 */
// 已知限制（2026-09-26 跑 run 实测，如实记档）：
//   · ① URL 溯源 = 逐字 / 仅域名 / 都没有 三档——"域名抓过但路径是派生态"不再误判为伪造。
//   · ② 摘录回溯对**表格行**逐格判定；但**翻译或改写过的摘录永远对不上**（本仓 run 的卡片是
//     中文交付、来源多为英文，卡内译文属正常实践）。故 ② 的未命中数**不等于**伪造数，
//     读报告时看 kind 分档，别只看总数。
export function auditBundle(bundleDir, sessionsRoot, { readLog = plainLogReader } = {}) {
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
      // 只认 `## 原文摘录` 节内的 `>` 行（2026-09-26 实测：原版扫全文，5 条未溯源行根本不在摘录节里；
      // 且 `>` 被复用为卡片自己的注——指针/标签，那些不是摘录主张）。
      const secLines = []
      let inQuoteSec = false
      for (const line of body.split('\n')) {
        if (/^##\s/.test(line)) { inQuoteSec = /^##\s*原文摘录/.test(line); continue }
        if (inQuoteSec) secLines.push(line)
      }
      for (const line of secLines) {
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
  const corpus = buildCorpus(sessionsRoot, basename(bundleDir), readLog)
  if (basename(bundleDir) && corpus.windowFiles === 0) {
    findings.push({ level: 'MAJOR', file: '—', kind: '语料窗零命中', detail: `没有会话日志提及 ${basename(bundleDir)}——审计对象与语料不匹配（核对 --sessions 根或 run 是否在本机跑过）；窗内 0 文件 = 三条溯源断言全部失据` })
  }
  const corpusUrlSet = new Set([...corpus.webUrls].map(stripTrailing))

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
  const fetchedOkSet = new Set([...corpus.fetchedOk].map(stripTrailing))
  const fetchFailedSet = new Set([...corpus.fetchFailed].map(stripTrailing))
  let urlOk = 0
  let urlTotal = 0
  let srcFetched = 0
  let srcNeverFetched = 0
  for (const rec of evidence) {
    // ④ source_url 的**抓取强度**（2026-09-26 实测补的最大缺口）：契约（研究手册 :56）要求
    //    source_url 是"**真实抓取过**的 URL"，而原审计只要求它出现在**任何**工具事件里——
    //    搜索结果列表里出现过就算过。实测两场 run 共 13 张卡的 source_url **从未被抓取**。
    const src = rec.fm?.source_url
    if (typeof src === 'string' && src.length > 0) {
      const su = stripTrailing(src)
      if (fetchedOkSet.has(su)) srcFetched += 1
      else {
        srcNeverFetched += 1
        const kind = fetchFailedSet.has(su) ? '声明抓取但抓取失败' : (corpusUrlSet.has(su) ? '仅出现在搜索结果、未真正抓取' : 'source_url 从未出现在任何 web 工具事件里')
        findings.push({ level: 'MAJOR', file: rec.file, kind: 'source_url 未抓取', detail: `${kind}：${src.slice(0, 100)}` })
      }
    }
    for (const u of rec.claimedUrls) {
      urlTotal += 1
      if (corpusUrlSet.has(stripTrailing(u))) { urlOk += 1; continue }
      let host = null
      try { host = new URL(u).host } catch { /* 非法 URL */ }
      if (host !== null && hosts.has(host)) {
        findings.push({ level: 'MAJOR', file: rec.file, kind: '仅域名可溯源', detail: `具体路径未在 web 工具事件中出现（域名出现过）：${u.slice(0, 100)}` })
        continue
      }
      findings.push({ level: 'CRITICAL', file: rec.file, kind: '伪造链接/未溯源', detail: `域名与 URL 都未出现在任何 web 工具事件里：${u.slice(0, 100)}` })
    }
  }
  // ② 摘录转写回溯（web-only 语料 + **限定在 `## 原文摘录` 节内** + 覆盖率分档）
  //    为什么限节：原版扫正文全部 `^>` 行，实测 5 条未溯源行根本不在摘录节里（在 §解读 或节外），
  //    而且 `>` 被复用为"卡片自己的注"（指针/标签），那些不是摘录主张。
  //    为什么用覆盖率而不是二值：语料修正后，**复合摘录**（多段拼接）与**被截断的抓取**是合法形态，
  //    二值判定会把它们一律打成伪造——实测 A2/B 桶（113 条）是逐字、E/D 桶（60 条）是复合。
  const webText = corpus.webChunks.join('\u0000')
  const inWeb = (x) => x.length >= 8 && webText.includes(x)
  const coverage = (n) => {
    if (inWeb(n)) return 1
    const N = 16
    const STRIDE = 8
    const sh = []
    for (let i = 0; i + N <= n.length; i += STRIDE) sh.push(n.slice(i, i + N))
    if (sh.length === 0) return 0
    const cap = 40
    const step = Math.max(1, Math.ceil(sh.length / cap))
    const use = sh.filter((_, i) => i % step === 0)
    return use.filter(inWeb).length / use.length
  }
  let quoteOk = 0
  let quoteTotal = 0
  let quoteComposite = 0
  let quoteBad = 0
  for (const rec of evidence) {
    for (const q of rec.quotes) {
      quoteTotal += 1
      const n = normalize(q)
      const cov = coverage(n)
      if (cov >= 0.95) { quoteOk += 1; continue }
      if (cov >= 0.6) {
        quoteComposite += 1
        findings.push({ level: 'INFO', file: rec.file, kind: '摘录非逐字（复合/标注/截断）', detail: `web 语料覆盖率 ${cov.toFixed(2)}：${q.slice(0, 60)}` })
        continue
      }
      quoteBad += 1
      findings.push({ level: 'MAJOR', file: rec.file, kind: '转写不符', detail: `web 语料覆盖率仅 ${cov.toFixed(2)}（摘录文字在抓取到的来源里基本找不到）：${q.slice(0, 60)}` })
    }
  }
  // ③ final 溯源链（反引号内的格式说明占位不算引用——先剥 code span）
  // ⚠ 防空语料（2026-09-26 第五场 run 实测）：原版在 final.md 缺席时**静默跳过**本检查——final 链
  //   报 0/0 看着像"无引用"，实为"没查"（第五场 lead 把当前版放进了 final/final.md，审计静默放行）。
  //   现在：缺席即 findings（契约钉死在 run 根），但**仍对实际位置执行链检查**，不丢检查。
  let finalRefs = 0
  let finalBroken = 0
  const finalPath = join(bundleDir, 'final.md')
  const finalAltPath = join(bundleDir, 'final', 'final.md')
  if (!existsSync(finalPath) && !existsSync(finalAltPath)) {
    findings.push({ level: 'CRITICAL', file: 'final.md', kind: '防空语料', detail: 'run 根与 final/ 下都没有 final.md——final 溯源链无处可查；这不是"通过"，是没有对象' })
  } else if (!existsSync(finalPath)) {
    findings.push({ level: 'MAJOR', file: 'final.md', kind: '当前版位置违约', detail: '当前版在 final/final.md——契约钉死在 run 根（[来源: evidence/] 相对 run 根解析）；链检查按实际位置执行' })
  }
  const finalActual = existsSync(finalPath) ? finalPath : finalAltPath
  if (existsSync(finalActual)) {
    const finalText = readFileSync(finalActual, 'utf8').replace(/`[^`]*`/g, '')
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

> 由 scripts/run-gates/evidence-audit.mjs 生成（keyless 机械对账；正本判据 = 研究手册 §证据文件契约）。
> 会话语料：${corpus.sessionFiles} 个日志文件（**语料窗**：提及本 run slug 的 ${corpus.windowFiles} 个在窗内${corpus.windowSkipped > 0 ? `、${corpus.windowSkipped} 个窗外不计入对账` : ''}——跨 run URL 不得作证）、${corpus.webEvents} 个 **web 工具事件**（${corpus.webUrls.size} 个 URL；已剔除 agent 自撰文本——否则摘录审计自证）。

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
  return { findings, criticalCount: critical.length, stats: { evidence: evidence.length, withFm: evidence.filter((r) => r.fm).length, urlOk, urlTotal, srcFetched, srcNeverFetched, quoteOk, quoteTotal, quoteComposite, quoteBad, finalRefs, finalBroken, critical: critical.length, major: major.length, info: info.length, sessionFiles: corpus.sessionFiles, windowFiles: corpus.windowFiles, windowSkipped: corpus.windowSkipped }, report }
}
