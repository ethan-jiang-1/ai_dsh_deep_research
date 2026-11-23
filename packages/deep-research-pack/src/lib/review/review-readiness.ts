/**
 * review-readiness.ts —— review.md **终局** readiness 判定（纯函数，keyless 单测面）。
 *
 * 为什么存在（2026-10-11，③-a 新断言当场抓出）：终局 readiness 的读法曾在 node-gate、run-dashboard、
 * 客户端和浏览器冒烟间分叉。`drt_deepseek-default-upgrade` 已交付且终局 `readiness: PASS`，但
 * review.md 文末附录按 critic skill 契约保留了首轮 `readiness: FAIL` 血统记录；未锚行首的末位匹配把
 * 历史 FAIL 读成终局，仪表盘/镜像遂报「审查修复中」。node-gate 的 `readinessOf` 现直接委托本模块
 * （BUG-040 后不再有本地 mirror）；门契约的测试边界由交付门回归钉住。
 *
 * 本模块把**终局**语义收成一处（D51，判据不猜）：判定只认结构化位置——**行首**（仅 Markdown 装饰）
 * 或 `；;。` 分隔符之后的**裸写** `readiness: PASS|FAIL`；正文/附录里的行内引用（反引号、加粗、括号包裹）
 * 与散文前缀（`旧轮记录：`、`结论行：`、`本轮 `）都不构成判定。空模板 `PASS | FAIL` 两词并存按未判定处理。
 *
 * 歧义即无法判定：同一行出现互斥裸写判定、或行首判定与同行裸写判定不一致 → 返回 `null`（不取最后一个
 * 冒充、不按关键词挑「最像的」）。轮次标题（`# 第 2 轮（复审）—— readiness: PASS`）作为轮次信号保留：
 * 无轮次标注者为终局；全带轮次时轮次高者胜（文末附录的旧轮记录因此不夺权）。
 *
 * 残留边界：轮次标题的「第 N 轮」与判定之间允许至多 24 字插入语；这一段是下一片声明件要替代的形态，
 * 不在本函数里再加宽容。
 *
 * 消费方：驾驶舱 `ResearchStatusTab.tsx`、真机装载冒烟与只读投影核心直接调用本函数；门禁的
 * `readinessOf` 直接委托本函数的 `terminalVerdictLine`（BUG-040 后不再有第二份 mirror），由门级回归
 * 与产品级裁决一致性回归（变异矩阵 + 不变量）覆盖。
 */

import { maskMarkdownLines } from '../shared/markdown-mask.ts'

type Readiness = 'PASS' | 'FAIL'
/** 同一行出现互斥裸写判定 = 无法判定（D51：不取最后一个冒充）。 */
const AMBIGUOUS = 'ambiguous' as const

/**
 * 把非正文行（fence / HTML 注释 / indented code）替换为空行（BUG-169/178/179/183/185）：
 * 委托全仓唯一实现 `markdown-mask.ts`（与 L0 文档扫描同源，由 Markdown 掩码一致性回归
 * 直接对照 `mdast-util-from-markdown` 守卫）。
 */
export function maskReadinessLines(text: string): string[] {
  return maskMarkdownLines(text)
}

function maskFencedLines(text: string): string[] {
  return maskMarkdownLines(text)
}

/**
 * 剥去**行首 Markdown 装饰**，返回以 `readiness` 开头的剩余文本；未到判定词返回 null。
 *
 * 只认 Markdown 结构（空白/引用/列表符/标题/加粗/反引号），不认散文：`结论行：`、`本轮 `、`旧轮记录：`
 * 都是文字，不是装饰——把任意短标签当装饰正是历史引用夺权的入口（D51，BUG-150 的类）。
 * 判定行要独立成行；写入纪律见研究手册。
 */
function stripVerdictDecor(line: string): string | null {
  let s = line
  // 标签本身的加粗/反引号也是装饰（BUG-170/178）：`**readiness**：FAIL`、
  // `**readiness**（终局）：FAIL`、`**readiness（终局）**：FAIL` 都归一后再匹配。
  const normalizeLabelDecor = (value: string): string => {
    const tail = value.replace(/^(readiness(?:[（(][^）)\n]{1,8}[）)])?)(?:\*\*|__|`{1,2})(?=\s*[:：])/i, '$1')
    return tail.replace(/^readiness(?:\*\*|__|`{1,2})(?=\s*(?:[（(][^）)\n]{1,8}[）)])?\s*[:：])/i, 'readiness')
  }
  for (let i = 0; i < 12; i++) {
    s = normalizeLabelDecor(s)
    if (/^readiness\b/i.test(s)) return s
    const next = s
      .replace(/^[\s>]+/, '')
      .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/^#{1,6}\s*/, '')
      .replace(/^(?:\*\*|__|`{1,2})\s*/, '')
    if (next === s) break
    s = next
  }
  s = normalizeLabelDecor(s)
  return /^readiness\b/i.test(s) ? s : null
}

/** 判定行：`readiness` + 可选**判定词后的短括号标签**（手册形态 `readiness（终局）:`）+ 冒号 +
 *  可选包裹 + 值（大小写不敏感）。括号段 ≤8 字、不许含 `|`/换行——行首锚定不变，长标签仍不夺权。 */
const VERDICT_LINE = /^readiness(?:\s*[（(][^）)\n|]{1,8}[）)])?\s*[:：]\s*(?:\*\*|__|`{1,2})?\s*(PASS|FAIL)\b/i
/** 空模板 `readiness（终局）: PASS | FAIL` 是完整占位行（装饰形态同样豁免）；带额外说明的是判定，不是模板。 */
const EMPTY_TEMPLATE = /^readiness(?:\s*[（(][^）)\n|]{1,8}[）)])?\s*[:：]\s*(?:\*\*|__|`{1,2})?\s*PASS\s*\|\s*FAIL[\s`*_]*$/i

/** 同一行内、未被反引号/加粗/括号包裹的 `readiness:` 判定（裸写）。包裹内的是引用，不夺权。 */
const INLINE_VERDICT = /readiness(?:\s*[（(][^）)\n|]{1,8}[）)])?\s*[:：]\s*(?:\*\*|__|`{1,2})?\s*(PASS|FAIL)\b/gi

/**
 * 一行里的判定候选（D51）：只有「行首（仅 Markdown 装饰）」或「分隔符之后**立即**是判定词」的裸写才算；
 * 散文前缀（`旧轮记录：`、`本轮 `、`随后 `）一律不算——措辞不是结构，位置才是。
 *
 * 反证：`readiness: PASS；随后 readiness: FAIL` 里，第一个是裸写、第二个是散文前缀；两者值互斥时返回
 * `ambiguous`（拒绝在两种读法里挑一个），不是取最后一个。
 */
function lastInlineVerdict(line: string): Readiness | typeof AMBIGUOUS | null {
  if (/^\s*\|/.test(line)) return null // 表格单元不夺权
  const ranges: Array<[number, number]> = []
  for (const m of line.matchAll(/(`+)[\s\S]*?\1/g)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length])
  for (const m of line.matchAll(/(\*\*|__)[\s\S]*?\1/g)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length])
  // 括号内的判定是历史引用（`（第 1 轮 readiness: FAIL）`），不夺权。
  for (const m of line.matchAll(/[（(][^）)]*[）)]/g)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length])
  let bare: Readiness | null = null
  const prose: Readiness[] = []
  for (const match of line.matchAll(INLINE_VERDICT)) {
    const index = match.index ?? 0
    if (ranges.some(([start, end]) => index >= start && index < end)) continue
    const before = line.slice(0, index)
    const segment = before.split(/[；;。]/).pop() ?? before
    const value = match[1]!.toUpperCase() as Readiness
    // 分隔符到判定词之间只许有 Markdown 装饰；有文字 = 散文提及。
    if (segment.replace(/[\s>*#\-+`]/g, '') !== '') { prose.push(value); continue }
    if (bare !== null && bare !== value) return AMBIGUOUS
    bare = value
  }
  if (bare === null) return null
  // 裸写判定与同一行的散文提及互斥 = 两种读法，拒绝挑一个（不取「更晚/更像」的）。
  if (prose.some((value) => value !== bare)) return AMBIGUOUS
  return bare
}

/**
 * 判定分析：值 + 命中行 + **是否互斥**。互斥时 value=null——调用方不得把它当「无判定」
 * （否则「声明 PASS + 散文互斥」会被当成散文缺席而放行，D51 的 fail-open 复现）。
 */
export interface VerdictAnalysis {
  readonly value: Readiness | null
  readonly line: string | null
  readonly ambiguous: boolean
}

export function verdictAnalysisOf(reviewText: string | null | undefined): VerdictAnalysis {
  if (typeof reviewText !== 'string' || reviewText.trim() === '') return { value: null, line: null, ambiguous: false }
  // 两条候选路径 + 一种仲裁（BUG-036，2026-10-18 实测）：
  //  · 规范路径 = 装饰剥离后行首即 `readiness:`（现状，含 `## readiness:` 等）；
  //  · 轮次路径 = **行首标记之后直接是「第 N 轮」**的标题行（`# 第 2 轮（复审）—— readiness: PASS`）
  //    ——规范路径的前缀预算吃不下这种插入语，而它恰恰是**最新一轮**最自然的写法；
  //  · 仲裁：**无轮次标注者视为终局**（canonical 形态优先，取最后一条）；**全带轮次时轮次高者胜**
  //    （文末附录保留的旧轮记录因此不再夺权——BUG-036 的现场形态）。
  // 行内引用（`- **第 1 轮**：\`readiness: FAIL\` 血统`）两条路径都不认：轮次路径要求标记后**紧接**「第」，
  // 加粗/散文前缀即落空。
  const ROUND_HEADING = /^\s*(?:[>#\-+]\s*)*第\s*([0-9]+)\s*轮[^\n]{0,24}?readiness\s*[:：]\s*(?:\*\*|__|`{1,2})?\s*(PASS|FAIL)\b/i
  interface Candidate { readonly value: Readiness; readonly round: number | null; readonly index: number }
  const candidates: Candidate[] = []
  const lines = maskFencedLines(reviewText)
  let ambiguous = false
  for (const [index, line] of lines.entries()) {
    const rest = stripVerdictDecor(line)
    // 空模板 `readiness: PASS | FAIL` 不是判定（含装饰形态）——任何路径都要先排除。
    const template = (rest !== null && EMPTY_TEMPLATE.test(rest)) || EMPTY_TEMPLATE.test(line)
    const inline = template ? null : lastInlineVerdict(line)
    if (inline === AMBIGUOUS) { ambiguous = true; continue }
    if (inline !== null) {
      const round = /第\s*([0-9]+)\s*轮|轮次\s*[:：]?\s*([0-9]+)|\bround\s*([0-9]+)\b/i.exec(line)
      const roundText = round?.[1] ?? round?.[2] ?? round?.[3]
      candidates.push({ value: inline, round: roundText === undefined ? null : Number(roundText), index })
      continue
    }
    // 无裸写时，只接受「整行就是判定」的包裹形态（`**readiness: PASS**（附条件）`）：
    // 判定词之后只许收尾包裹与短括号，后面还有正文 = 引用，不夺权。
    if (rest !== null && !template) {
      const match = VERDICT_LINE.exec(rest)
      const tail = match === null ? '' : rest.slice(match[0].length)
      if (match !== null && /^\s*(?:\*\*|__|`{1,2})?\s*(?:[（(][^）)\n]*[）)])?\s*$/.test(tail)) {
        const round = /第\s*([0-9]+)\s*轮|轮次\s*[:：]?\s*([0-9]+)|\bround\s*([0-9]+)\b/i.exec(line)
        const roundText = round?.[1] ?? round?.[2] ?? round?.[3]
        candidates.push({ value: match[1]!.toUpperCase() as Readiness, round: roundText === undefined ? null : Number(roundText), index })
        continue
      }
    }
    const roundMatch = ROUND_HEADING.exec(line)
    const roundValue = roundMatch?.[2]
    const roundNo = roundMatch?.[1]
    if (roundValue !== undefined && roundNo !== undefined) {
      candidates.push({ value: roundValue.toUpperCase() as Readiness, round: Number(roundNo), index })
    }
  }
  if (ambiguous) return { value: null, line: null, ambiguous: true }
  if (candidates.length === 0) return { value: null, line: null, ambiguous: false }
  const unlabeled = candidates.filter((c) => c.round === null)
  const winner = unlabeled.length > 0
    ? unlabeled[unlabeled.length - 1]!
    : (() => {
        // 全带轮次：轮次最大者胜；同轮次取更靠后的一条（末位为准）。
        let best = candidates[0]!
        for (const candidate of candidates) {
          const rank = candidate.round ?? 0
          const bestRank = best.round ?? 0
          if (rank > bestRank || (rank === bestRank && candidate.index > best.index)) best = candidate
        }
        return best
      })()
  return { value: winner.value, line: lines[winner.index] ?? '', ambiguous: false }
}

/** 终局 readiness 值与命中行；无判定行/输入缺席 **或互斥** 时返回 `null`（不猜、不 throw）。 */
export function terminalVerdictLine(reviewText: string | null | undefined): { value: Readiness; line: string } | null {
  const analysis = verdictAnalysisOf(reviewText)
  return analysis.value === null ? null : { value: analysis.value, line: analysis.line ?? '' }
}

/** 终局 readiness 值（`terminalVerdictLine` 的薄壳——**判据单一正本**，消费方别各写一份）。 */
export function terminalReadiness(reviewText: string | null | undefined): Readiness | null {
  return terminalVerdictLine(reviewText)?.value ?? null
}

/** 结构化声明（`review/readiness.json` v2）的解析结果。 */
export interface ReadinessCounts {
  readonly critical: number
  readonly major: number
  readonly minor: number
  readonly unverified: number
  readonly rechecked_urls: number
}
export interface ReadinessDeclaration {
  readonly readiness: Readiness
  readonly conditional: boolean
  readonly counts: ReadinessCounts
}

const DECLARATION_KEYS = ['version', 'readiness', 'conditional', 'round', 'at', 'counts']
const COUNT_KEYS = ['critical', 'major', 'minor', 'unverified', 'rechecked_urls']

/**
 * 解析 `review/readiness.json`（D51；v2）：只认已知键，坏 JSON/未知键/错值 = 非法。
 * v2 = 计数收进 `counts`（critic 必须给出四项判定计数 + 重核 URL 数）；不做 v1 兼容。
 * 门禁与驾驶舱共用本函数——同一份声明在两侧必须同判。
 */
export function parseReadinessDeclaration(text: string): { readonly ok: true; readonly value: ReadinessDeclaration } | { readonly ok: false; readonly detail: string } {
  // 重复键 = 两种读法（JSON.parse 静默取末值）——按已知键计数，fail-closed（含 counts 子键）。
  const declaredKeys = [...text.matchAll(/"(version|readiness|conditional|round|at|critical|major|minor|unverified|rechecked_urls)"\s*:/g)].map((match) => match[1])
  const duplicate = declaredKeys.find((key, index) => declaredKeys.indexOf(key) !== index)
  if (duplicate !== undefined) return { ok: false, detail: `review/readiness.json 重复键 ${duplicate}（拒绝取末值）` }
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { ok: false, detail: 'review/readiness.json 不是合法 JSON' } }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, detail: 'review/readiness.json 顶层必须是对象' }
  const record = raw as Record<string, unknown>
  const problems: string[] = []
  for (const key of Object.keys(record)) {
    if (!DECLARATION_KEYS.includes(key)) problems.push(`未知键 ${key}`)
  }
  if (record.version !== 2) problems.push('version 必须为 2')
  if (record.readiness !== 'PASS' && record.readiness !== 'FAIL') problems.push('readiness 必须为 PASS/FAIL')
  if ('conditional' in record && typeof record.conditional !== 'boolean') problems.push('conditional 必须是布尔')
  if ('round' in record && (!Number.isInteger(record.round) || (record.round as number) < 1)) problems.push('round 必须是 ≥1 的整数')
  if ('at' in record && (typeof record.at !== 'string' || record.at.trim() === '')) problems.push('at 必须是非空字符串（写入时刻）')
  let counts: ReadinessCounts | null = null
  if (!('counts' in record)) {
    problems.push('counts 必填（critical/major/minor/unverified/rechecked_urls）')
  } else if (typeof record.counts !== 'object' || record.counts === null || Array.isArray(record.counts)) {
    problems.push('counts 必须是对象')
  } else {
    const rawCounts = record.counts as Record<string, unknown>
    for (const key of Object.keys(rawCounts)) if (!COUNT_KEYS.includes(key)) problems.push(`counts 未知键 ${key}`)
    const normalized: Record<string, number> = {}
    for (const key of COUNT_KEYS) {
      if (!(key in rawCounts)) { problems.push(`counts 缺 ${key}`); continue }
      const value = rawCounts[key]
      if (!Number.isInteger(value) || (value as number) < 0) { problems.push(`counts.${key} 必须是 ≥0 的整数`); continue }
      normalized[key] = value as number
    }
    if (problems.length === 0) counts = normalized as unknown as ReadinessCounts
  }
  if (problems.length > 0 || counts === null) return { ok: false, detail: `review/readiness.json 不合法：${problems.join('；')}` }
  return { ok: true, value: { readiness: record.readiness as Readiness, conditional: record.conditional === true, counts } }
}

/** 终局 readiness 的判据来源（声明件优先；散文只做副本；无 review/ 的旧场回退散文）。 */
export interface ReadinessReading {
  readonly pass: boolean | null
  readonly conditional: boolean
  readonly source: 'declaration' | 'prose' | 'missing' | 'invalid' | 'mismatch' | 'ambiguous' | 'absent'
  readonly detail?: string
}

/**
 * 由（review.md 文本 + 声明文本 + 是否有 review/ 目录）判终局 readiness。
 * 门禁 `readinessOfBundle` 与驾驶舱状态页共用——**同一事实一个判据**。
 */
export function readinessOfSources(input: {
  readonly reviewText: string | null | undefined
  readonly declarationText: string | null | undefined
  readonly hasReviewDir: boolean
}): ReadinessReading {
  const analysis = verdictAnalysisOf(input.reviewText)
  if (analysis.ambiguous) {
    return {
      pass: false,
      conditional: false,
      source: 'ambiguous',
      detail: 'review.md 的判定行互斥（同一行两个相反的裸写判定）——无法与声明对账（修正 = 保留一条终局判定）',
    }
  }
  const terminal = analysis.value === null ? null : { value: analysis.value, line: analysis.line ?? '' }
  const proseValue = analysis.value
  if (typeof input.declarationText !== 'string') {
    if (!input.hasReviewDir) {
      // BUG-347：没有 review/ 目录、也没有 review.md 文本 = 没审过（absent）；pass=null 不得折成 FAIL。
      // review.md 存在但没有终局判定行 = 审查未给结论，仍是 FAIL（pass=false）。
      if (terminal === null && (input.reviewText === undefined || input.reviewText === null || input.reviewText.trim() === '')) {
        return { pass: null, conditional: false, source: 'absent', detail: '无 review 面（未审查）——不是审查未过' }
      }
      return { pass: terminal?.value === 'PASS', conditional: terminal !== null && /附条件|条件\s*[=＝：:]/.test(terminal.line), source: 'prose' }
    }
    return {
      pass: false,
      conditional: false,
      source: 'missing',
      detail: 'review/ 在场但 review/readiness.json 缺席——结构化审查必须声明终局（修正 = critic 按 adversarial-review skill 写声明）',
    }
  }
  const parsed = parseReadinessDeclaration(input.declarationText)
  if (!parsed.ok) return { pass: false, conditional: false, source: 'invalid', detail: parsed.detail }
  if (proseValue !== null && proseValue !== parsed.value.readiness) {
    return {
      pass: false,
      conditional: false,
      source: 'mismatch',
      detail: `声明 ${parsed.value.readiness} 与 review.md 判定行 ${proseValue} 不一致——散文与声明必须同判（修正 = 改一处或删旧行）`,
    }
  }
  return { pass: parsed.value.readiness === 'PASS', conditional: parsed.value.conditional, source: 'declaration' }
}

/** 观察面共享审查判定：pass/fail/conflict/unconfirmed/absent（BUG-369/374）。 */
export type ReviewVerdict = 'pass' | 'fail' | 'conflict' | 'unconfirmed' | 'absent'

/** 读取态的最小形状（与 ArtifactState 同形；本模块不依赖 run/artifact-read）。 */
export interface ReviewVerdictStates {
  readonly review?: 'ok' | 'absent' | 'unreadable' | 'empty' | 'invalid'
  readonly readiness?: 'ok' | 'absent' | 'unreadable' | 'empty' | 'invalid'
}

/**
 * 由 readiness reading + 读取态判共享审查结论。
 *
 * 规则：mismatch/ambiguous = conflict（声明与散文冲突，不能单边取 PASS/FAIL）；
 * review/readiness 空/不可读/非法 = unconfirmed；无 review 面 = absent；其余按 pass/fail。
 * 状态页、brief、终稿页签共用本函数，禁止各自把 source 折成 unconfirmed。
 * @param reading - readinessOfSources 的判据。
 * @param states - review.md / readiness.json 的 ArtifactState（可选）。
 * @returns 共享判定。
 */
export function reviewVerdictOf(reading: ReadinessReading, states: ReviewVerdictStates = {}): ReviewVerdict {
  const reviewBad = states.review === 'empty' || states.review === 'unreadable' || states.review === 'invalid'
  const readinessBad = states.readiness === 'empty' || states.readiness === 'unreadable' || states.readiness === 'invalid'
  if (reviewBad || readinessBad) return 'unconfirmed'
  if (reading.source === 'mismatch' || reading.source === 'ambiguous') return 'conflict'
  if (reading.source === 'absent') return 'absent'
  if (reading.source === 'missing' || reading.source === 'invalid') return 'unconfirmed'
  if (typeof reading.pass !== 'boolean') return 'unconfirmed'
  return reading.pass ? 'pass' : 'fail'
}
