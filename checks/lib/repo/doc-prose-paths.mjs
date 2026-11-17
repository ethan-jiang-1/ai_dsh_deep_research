// doc-prose-paths.mjs — 散文路径枚举的薄壳（枚举正本 = doc-surface.mjs）。
//
// 为什么留这层：BUG-204 的判据与测试钉在这条 API 上（`prosePathTokens`），而「哪些形态算散文、
// 怎么剥反引号/围栏」的规则已经收口到 `scanDocument`。这里只做形态过滤 + 形状映射——
// 不要再在本文件里加提取正则（那会让「形态」重新变成两份事实，正是 BUG-211 的根因）。
// 保留而非删除的显式决定：已归档 BUG-204 的 guard-ledger 条目指向本模块的直测；
// 删模块要连带改一张已结卡片的守卫落点，收益（少一个 5 行薄壳）不抵台账改写风险。
import { scanDocument } from './doc-surface.mjs'

/** 返回 [{ line: 1-based, path }]：散文与表格单元里带扩展名的仓内路径。 */
export function prosePathTokens(text) {
  return scanDocument(text)
    .filter((token) => token.kind === 'path' && (token.form === 'prose' || token.form === 'table'))
    .map((token) => ({ line: token.line, path: token.path }))
}
