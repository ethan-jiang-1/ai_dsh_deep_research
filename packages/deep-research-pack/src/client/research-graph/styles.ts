// research-graph/styles.ts — 图谱提示带（GraphNotices）的样式常量（其余静态样式已迁入 graph.module.css）。
import type { CSSProperties } from 'react'

export const MUTED_STYLE: CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.5 }

export const ATTENTION_ROW_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
  padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 12, lineHeight: 1.5,
}
