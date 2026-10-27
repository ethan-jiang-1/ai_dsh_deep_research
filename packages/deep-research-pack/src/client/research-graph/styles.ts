// research-graph/styles.ts — 图谱页签与节点卡共用的样式常量。
//
// 从 ResearchGraphTab.tsx 搬出（2026-10-28 Phase C）：卡片（NodeCard）与页签体都要用同一套
// 卡片/次要文字/按钮形态；留在页签体里会让卡片反向依赖父组件。
import type { CSSProperties } from 'react'

export const MUTED_STYLE: CSSProperties = { fontSize: 11, opacity: 0.62, lineHeight: 1.5 }
export const BUTTON_STYLE: CSSProperties = {
  fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid #00000026',
  background: '#00000008', cursor: 'pointer', color: 'inherit',
}
export const CARD_STYLE: CSSProperties = {
  border: '1px solid #00000014', borderRadius: 6, padding: '6px 8px', marginBottom: 6, background: '#00000005',
}

export const BANNER_STYLE: CSSProperties = {
  marginBottom: 8, padding: '6px 10px', borderRadius: 6,
  background: '#f59e0b12', border: '1px solid #f59e0b38',
}
