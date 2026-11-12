// client-load-select.mjs — client-load 绑定会话的纯选择器（keyless 直测）。
//
// 意图对象 = **lead 根会话**的真实 run 渐进面；method-editor/method-coach 等非研究根即使写过
// drt_ 文件也不能当 run 会话（BUG-142：富 coach 会话被选中 → 状态页按 lead 事实判定假红）。
export const selectBoundSession = (candidates, titleCounts, richFloor = 60) => {
  const leads = candidates.filter((candidate) => candidate.agentPreset === 'lead')
  const rich = leads.filter((candidate) => candidate.eventCount >= richFloor)
  const pool = rich.length > 0 ? rich : leads
  if (pool.length === 0) return null
  const unique = pool.filter((candidate) => titleCounts.get(candidate.title) === 1)
  return unique.length > 0 ? unique[0] : pool[0]
}
