// local-date.mjs — 人读日期行的本地口径 helper（BUG-017 正修）。
// 纪律同源 = 研究手册「日期最小契约：先跑 bash date」：人读日期 = 系统本地日
// （toLocaleDateString 的 'sv' locale 给 YYYY-MM-DD 零填充形态），不是 UTC ISO slice——
// 两者在本地 00:00–08:00 窗口差一天（mcp-hosts 归档实证：HITL2 代答行日期早于 HITL1
// 定稿，§Decisions append-only 次序破坏）。
// 边界：机器比较用的时间戳一概保持 UTC ISO（toISOString），不走本 helper。
// 消费方 = dev/hitl-answer.mjs（provenance 日期）+ scripts/dist/export-dist.mjs（打包日期）。
//
// `timeZone` 是**测试注入位**，不是产品开关：缺省 = 宿主本地日（产品语义）；传入 IANA 时区时
// 按该时区取日——让 BUG-017 的判别断言与 CI/宿主时区无关（2026-11-03 卫生审计：旧断言包在
// `if (utc !== local)` 里，UTC 机器上永不进入，守卫失效）。
export function localDateStr(at = new Date(), timeZone = undefined) {
  return timeZone === undefined ? at.toLocaleDateString('sv') : at.toLocaleDateString('sv', { timeZone });
}
