/**
 * review-readiness.ts —— review.md **终局** readiness 判定（纯函数，keyless 单测面）。
 *
 * 为什么存在（2026-10-11，③-a 新断言当场抓出）：终局 readiness 的读法曾在 node-gate、run-dashboard、
 * 客户端和浏览器冒烟间分叉。`drt_deepseek-default-upgrade` 已交付且终局 `readiness: PASS`，但
 * review.md 文末附录按 critic skill 契约保留了首轮 `readiness: FAIL` 血统记录；未锚行首的末位匹配把
 * 历史 FAIL 读成终局，仪表盘/镜像遂报「审查修复中」。node-gate 现遵循同一终局行规则，在纯 .mjs
 * 判据核内本地镜像（不导入 pack TS）；该测试边界见 `tests/node-gate.test.mjs`。
 *
 * 本模块把**终局**语义收成一处，规则 = 只认**行首判定行**（契约形态 `## readiness: PASS|FAIL`，
 * 兼容 `**readiness: …**`、中文冒号、列表项前缀），取最后一条；正文/附录里的**行内引用**
 * （如「第 1 轮：`readiness: FAIL`」）是历史留痕，不得夺权。空模板 `PASS | FAIL` 两词并存的
 * 行按未判定处理（不猜）。
 *
 * 消费方：驾驶舱 `ResearchStatusTab.tsx`、`scripts/smoke/client-load-smoke.mjs` 与
 * `scripts/lib/run-dashboard-core.mjs` 直接调用本函数；node-gate 在独立的纯 .mjs 边界本地镜像
 * 相同规则，由 `tests/node-gate.test.mjs` 覆盖终局 PASS/FAIL、历史行内引用与空模板。
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
    // 空模板 `## readiness: PASS | FAIL` 是完整占位行；带额外说明的是判定，不是模板。
    if (/^\s*(?:[-*+]\s+)?(?:#{1,6}\s*)?\**\s*readiness\s*[:：]\s*\**\s*PASS\s*\|\s*FAIL\**\s*$/i.test(line)) continue
    const value = match[1]
    if (value === undefined) continue // noUncheckedIndexedAccess：捕获组缺席即跳过，不 cast 掩盖
    last = value.toUpperCase() as Readiness
  }
  return last
}
