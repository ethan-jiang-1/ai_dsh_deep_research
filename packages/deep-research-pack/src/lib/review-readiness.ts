/**
 * review-readiness.ts —— review.md **终局** readiness 判定（纯函数，keyless 单测面）。
 *
 * 为什么存在（2026-10-11，③-a 新断言当场抓出）：终局 readiness 的读法曾在 node-gate、run-dashboard、
 * 客户端和浏览器冒烟间分叉。`drt_deepseek-default-upgrade` 已交付且终局 `readiness: PASS`，但
 * review.md 文末附录按 critic skill 契约保留了首轮 `readiness: FAIL` 血统记录；未锚行首的末位匹配把
 * 历史 FAIL 读成终局，仪表盘/镜像遂报「审查修复中」。node-gate 现遵循同一终局行规则，在纯 .mjs
 * 判据核内本地镜像（不导入 pack TS）；该测试边界见 `tests/node-gate.test.mjs`。
 *
 * 本模块把**终局**语义收成一处，规则 = 只认**行首判定行**，取最后一条；正文/附录里的**行内引用**
 * （如「第 1 轮：`readiness: FAIL`」）是历史留痕，不得夺权。空模板 `PASS | FAIL` 两词并存的行按
 * 未判定处理（不猜）。
 *
 * 装饰容忍（2026-10-16 窄放宽 (A)，13 场真实 review.md 实证）：判定行的**行首装饰**不改变它是判定行
 * ——块引用/列表符/箭头、标题标记与**短标题文字**、加粗与反引号包裹、短标签（`结论行：`/`复核结论：`/
 * `第 2 轮结论：` 这类 ≤10 字 + 冒号）、值后 `（最终）` 类后缀，都读得出。边界同样明确：
 *   · **行内提及**（prose 中段的 `` …我将…给出 `readiness: PASS` ``）不构成判定行——它是承诺/历史；
 *   · **表格单元**（`| **readiness: FAIL** |`）不夺权（要行内匹配才读得到，会放历史引用越权）；
 *   · **长前缀历史标题**（`# 复核轮（Round 2，2026-09-27）——**readiness: PASS**`）与**标题散文堆叠 /
 *     标签链**（`## 第二轮 复审 结论 说明 readiness: PASS`）不夺权——装饰前缀有形状上限：短标签至多
 *     1 枚、标题文字至多 1 段（≤9 字 + 空白），散文前缀堆不出来。
 * 放宽的是"读得出"，不是"放得过"：判定值仍只有 PASS/FAIL 两态，取最后一条。
 *
 * 消费方：驾驶舱 `ResearchStatusTab.tsx`、`scripts/smoke/client-load-smoke.mjs` 与
 * `scripts/lib/run-dashboard-core.mjs` 直接调用本函数；node-gate 在独立的纯 .mjs 边界本地镜像
 * 相同规则，由 `tests/node-gate.test.mjs` 覆盖终局 PASS/FAIL、历史行内引用与空模板。
 */

export type Readiness = 'PASS' | 'FAIL'

/** 装饰前缀的**形状上限**：短标签至多 1 枚、标题文字至多 1 段（判定词之前不许堆散文）。 */
const VERDICT_PREFIX_MAX_LABELS = 1
const VERDICT_PREFIX_MAX_HEADING_CHUNKS = 1

/** 剥去行首装饰，返回以 `readiness` 开头的剩余文本；未到判定词返回 null。 */
function stripVerdictDecor(line: string): string | null {
  let s = line
  let labels = 0
  let headingChunks = 0
  let heading = false
  for (let i = 0; i < 12; i++) {
    if (/^readiness\b/i.test(s)) return s
    const before = s
    let m = /^[\s>→⇒]+/.exec(s)
    if (m !== null) s = s.slice(m[0].length)
    m = /^[-*+]\s+/.exec(s)
    if (m !== null) s = s.slice(m[0].length)
    if (/^readiness\b/i.test(s)) return s
    m = /^#{1,6}\s*/.exec(s)
    if (m !== null) { heading = true; s = s.slice(m[0].length) } else {
      m = /^(?:\*\*|__|`{1,2})\s*/.exec(s)
      if (m !== null) { s = s.slice(m[0].length); continue }
    }
    if (/^readiness\b/i.test(s)) return s
    // 短标签：≤10 字 + 冒号（`结论行：` / `⇒ 复核结论：` / `第 2 轮结论**：` 的加粗壳已在上一步剥掉）
    m = /^[^|\n：:]{1,10}[：:]\s*/.exec(s)
    if (m !== null) {
      if (labels >= VERDICT_PREFIX_MAX_LABELS) return null
      labels += 1; s = s.slice(m[0].length); continue
    }
    // 标题文字（仅标题行，且至多一段）：短词 + 空白（`## 终验 readiness:`）
    if (heading) {
      m = /^[^|\n：:]{1,9}\s+/.exec(s)
      if (m !== null) {
        if (headingChunks >= VERDICT_PREFIX_MAX_HEADING_CHUNKS) return null
        headingChunks += 1; s = s.slice(m[0].length); continue
      }
    }
    if (s === before) break
  }
  return /^readiness\b/i.test(s) ? s : null
}

/** 判定行：`readiness` + 冒号 + 可选包裹 + 值（大小写不敏感）。 */
const VERDICT_LINE = /^readiness\s*[:：]\s*(?:\*\*|__|`{1,2})?\s*(PASS|FAIL)\b/i
/** 空模板 `readiness: PASS | FAIL` 是完整占位行（装饰形态同样豁免）；带额外说明的是判定，不是模板。 */
const EMPTY_TEMPLATE = /^readiness\s*[:：]\s*(?:\*\*|__|`{1,2})?\s*PASS\s*\|\s*FAIL[\s`*_]*$/i

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
  for (const [index, line] of lines.entries()) {
    const rest = stripVerdictDecor(line)
    if (rest !== null && !EMPTY_TEMPLATE.test(rest)) {
      const match = VERDICT_LINE.exec(rest)
      const value = match?.[1]
      if (value !== undefined) {
        const round = /第\s*([0-9]+)\s*轮|轮次\s*[:：]?\s*([0-9]+)|\bround\s*([0-9]+)\b/i.exec(line)
        const roundText = round?.[1] ?? round?.[2] ?? round?.[3]
        candidates.push({ value: value.toUpperCase() as Readiness, round: roundText === undefined ? null : Number(roundText), index })
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
