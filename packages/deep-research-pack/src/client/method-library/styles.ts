// method-library/styles.ts — 「方法库」主 tab 的共享样式常量（视图件与页签体共用）。
//
// 从 MethodLibraryView.tsx 原样搬出（2026-10-28 卫生轮 维度2）：切出 views.tsx 后两份文件都要
// 用同一套按钮/输入框形态，留在视图文件里会让风格件反向依赖页签体。
import type { CSSProperties } from 'react'

export const HEADER_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid #00000012' }
export const MUTED_STYLE: CSSProperties = { fontSize: 11, opacity: 0.62, lineHeight: 1.5 }
export const BUTTON_STYLE: CSSProperties = {
  fontSize: 12, padding: '3px 9px', borderRadius: 4, border: '1px solid #00000026',
  background: '#00000008', cursor: 'pointer', color: 'inherit',
}
export const PRIMARY_STYLE: CSSProperties = { ...BUTTON_STYLE, background: '#2563eb', borderColor: '#2563eb', color: '#fff' }
export const INPUT_STYLE: CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '5px 7px', borderRadius: 4, border: '1px solid #00000024', background: 'transparent', color: 'inherit' }
export const TEXTAREA_STYLE: CSSProperties = { ...INPUT_STYLE, minHeight: 54, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }
export const ROW_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 5,
  border: '1px solid transparent', background: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit',
}
