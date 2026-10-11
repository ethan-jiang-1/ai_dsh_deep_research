/**
 * review-readiness.ts —— review.md **终局** readiness 判定（纯函数，keyless 单测面）。
 *
 * 为什么存在（2026-10-11，③-a 新断言当场抓出）：同一个「终局 readiness」概念在仓里有三版实现
 * 且语义分叉——`scripts/lib/node-gate-core.mjs` 取**首个**含 PASS 的行；`scripts/run-ops/run-dashboard.mjs`
 * 取**末位**匹配；驾驶舱客户端与 `scripts/smoke/client-load-smoke.mjs` 各抄了一版末位匹配。
 * 后果实测：`drt_deepseek-default-upgrade` 已交付、终局 `readiness: PASS`，但 review.md 文末附录
 * 按 critic skill 契约保留了首轮 `readiness: FAIL` 的血统记录 → 未锚行首的末位匹配把它读成终局，
 * 仪表盘/镜像把已交付 run 报成「审查修复中」，而与 UI 渲染对不上。
 *
 * 本模块把**终局**语义收成一处，规则 = 只认**行首判定行**（契约形态 `## readiness: PASS|FAIL`，
 * 兼容 `**readiness: …**`、中文冒号、列表项前缀），取最后一条；正文/附录里的**行内引用**
 * （如「第 1 轮：`readiness: FAIL`」）是历史留痕，不得夺权。空模板 `PASS | FAIL` 两词并存的
 * 行按未判定处理（不猜）。
 *
 * 消费方：驾驶舱 `ResearchStatusTab.tsx`（reviewFail 三态）、`scripts/smoke/client-load-smoke.mjs`
 * （盘侧真值镜像）、`scripts/run-ops/run-dashboard.mjs`（终局口径）。node-gate 的 `readinessOf`
 * 是**另一种**语义（交付门上「是否存在 PASS 判定」），不在本模块的收敛范围内——差异见
 * notes/implemented/2026-10-11-review-readiness-terminal-rule.md。
 */

export type Readiness = 'PASS' | 'FAIL'

/** 行首判定行：可选列表项前缀 + 可选标题井号 + 可选强调符 + `readiness` + 冒号 + 可选强调符 + 值。 */
const VERDICT_LINE = /^\s*(?:[-*+]\s+)?(?:#{1,6}\s*)?\**\s*readiness\s*[:：]\s*\**\s*(PASS|FAIL)\b/i

/**
 * review.md 文本 → 终局 readiness；无判定行或输入缺席/畸形时返回 `null`（不猜、不 throw）。
 *
 * @param reviewText review.md 全文（null/undefined/空白 → null）
 * @returns `'PASS' | 'FAIL' | null`
 */
export function terminalReadiness(reviewText: string | null | undefined): Readiness | null {
  if (typeof reviewText !== 'string' || reviewText.trim() === '') return null
  let last: Readiness | null = null
  for (const line of reviewText.split('\n')) {
    const match = VERDICT_LINE.exec(line)
    if (match === null) continue
    // 空模板 `## readiness: PASS | FAIL` 两词并存——未判定，跳过（不把模板当结论）
    if (/\bPASS\b/i.test(line) && /\bFAIL\b/i.test(line)) continue
    const value = match[1]
    if (value === undefined) continue // noUncheckedIndexedAccess：捕获组缺席即跳过，不 cast 掩盖
    last = value.toUpperCase() as Readiness
  }
  return last
}
