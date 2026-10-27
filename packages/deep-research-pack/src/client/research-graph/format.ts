// research-graph/format.ts — 「研究图谱」的纯格式化件（无 DOM、无投影）。
//
// 为什么单列：DAG 小图（DagMap.tsx）与节点列表（ResearchGraphTab.tsx）都要短标签——
// 放任一组件里都会让另一个反向依赖组件。2026-10-27 卫生轮切分时从页签体拆出。
/** 短标签（SVG 内不换行，避免撑爆侧栏）。 */
export function shortLabel(text: string, max = 15): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}
