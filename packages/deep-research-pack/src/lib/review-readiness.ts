/**
 * review-readiness.ts —— review.md **终局** readiness 判定（纯函数，keyless 单测面）。
 *
 * 为什么存在（2026-10-11，③-a 新断言当场抓出）：终局 readiness 的读法曾在 node-gate、run-dashboard、
 * 客户端和浏览器冒烟间分叉。`drt_deepseek-default-upgrade` 已交付且终局 `readiness: PASS`，但
 * review.md 文末附录按 critic skill 契约保留了首轮 `readiness: FAIL` 血统记录；未锚行首的末位匹配把
 * 历史 FAIL 读成终局，仪表盘/镜像遂报「审查修复中」。node-gate 的 `readinessOf` 现直接委托本模块
 * （BUG-040 后不再有本地 mirror）；门契约的测试边界见 `tests/run/node-gate-delivery.test.mjs`。
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
 * 消费方：驾驶舱 `ResearchStatusTab.tsx`、`scripts/smoke/client-load-smoke.mjs` 与
 * `scripts/lib/run-dashboard-core.mjs` 直接调用本函数；门禁的 `readinessOf` 直接委托本函数的
 * `terminalVerdictLine`（BUG-040 后不再有第二份 mirror），由 `tests/run/review-readiness.test.mjs`
 * 与 `tests/contracts/verdict-conformance.test.mjs`（变异矩阵 + 不变量）覆盖。
 */

type Readiness = 'PASS' | 'FAIL'
/** 同一行出现互斥裸写判定 = 无法判定（D51：不取最后一个冒充）。 */
const AMBIGUOUS = 'ambiguous' as const

/**
 * 剥去**行首 Markdown 装饰**，返回以 `readiness` 开头的剩余文本；未到判定词返回 null。
 *
 * 只认 Markdown 结构（空白/引用/列表符/标题/加粗/反引号），不认散文：`结论行：`、`本轮 `、`旧轮记录：`
 * 都是文字，不是装饰——把任意短标签当装饰正是历史引用夺权的入口（D51，BUG-150 的类）。
 * 判定行要独立成行；写入纪律见研究手册。
 */
function stripVerdictDecor(line: string): string | null {
  let s = line
  for (let i = 0; i < 12; i++) {
    if (/^readiness\b/i.test(s)) return s
    const next = s
      .replace(/^[\s>]+/, '')
      .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/^#{1,6}\s*/, '')
      .replace(/^(?:\*\*|__|`{1,2})\s*/, '')
    if (next === s) break
    s = next
  }
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
 * review.md 文本 → 终局 readiness；无判定行或输入缺席/畸形时返回 `null`（不猜、不 throw）。
 *
 * @param reviewText review.md 全文（null/undefined/空白 → null）
 * @returns `'PASS' | 'FAIL' | null`
 */
export function terminalVerdictLine(reviewText: string | null | undefined): { value: Readiness; line: string } | null {
  if (typeof reviewText !== 'string' || reviewText.trim() === '') return null
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
  const lines = reviewText.split('\n')
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
  if (ambiguous) return null
  if (candidates.length === 0) return null
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
  return { value: winner.value, line: lines[winner.index] ?? '' }
}

/** 终局 readiness 值（`terminalVerdictLine` 的薄壳——**判据单一正本**，消费方别各写一份）。 */
export function terminalReadiness(reviewText: string | null | undefined): Readiness | null {
  return terminalVerdictLine(reviewText)?.value ?? null
}
