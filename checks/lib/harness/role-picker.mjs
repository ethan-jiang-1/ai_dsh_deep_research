// role-picker.mjs — 角色选择器的纯判据（BUG-292 / 295；keyless，供 client-load 与测试共用）。
//
// 选择器读到的 preset 名必须包含四个研究角色连续相邻 + Method Editor（D37）。逐角色驾驶舱渲染
// 归 snapshot C（场景级，见 snapshots/README），不在本判据重复。

export const RESEARCH_PREFIX = 'Deep Research'
export const METHOD_EDITOR = 'Method Editor'

/** @returns {string[]} 问题列表（空 = 绿）。 */
export function rolePickerIssues(names) {
  if (!Array.isArray(names) || names.length === 0) return ['角色选择器点开后零 preset']
  const idx = names.map((name, i) => (name.startsWith(RESEARCH_PREFIX) ? i : -1)).filter((i) => i >= 0)
  const research = idx.length
  const contiguous = research === 4 && idx.every((v, k) => k === 0 || v === idx[k - 1] + 1)
  const issues = []
  if (research !== 4) issues.push(`研究角色 ${research} 个（应为 4）`)
  if (!contiguous) issues.push('四个研究角色不连续相邻')
  if (!names.includes(METHOD_EDITOR)) issues.push('缺 Method Editor（D37）')
  return issues
}
