// method-library/styles.ts — 「方法库」主 tab 的共享样式常量（视图件与页签体共用）。
//
// 从 MethodLibraryView.tsx 原样搬出（2026-10-28 卫生轮 维度2）：切出 views.tsx 后两份文件都要
// 用同一套按钮/输入框形态，留在视图文件里会让风格件反向依赖页签体。
import type { CSSProperties } from 'react'

export const HEADER_STYLE: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l1)' }
export const MUTED_STYLE: CSSProperties = { fontSize: 11, opacity: 0.62, lineHeight: 1.5 }
export const BUTTON_STYLE: CSSProperties = {
  fontSize: 12, padding: '3px 9px', borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-2)', cursor: 'pointer', color: 'var(--dsw-alias-label-primary)',
}
export const PRIMARY_STYLE: CSSProperties = { ...BUTTON_STYLE, background: 'var(--dsw-alias-brand-primary)', borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-bg-base)' }
export const INPUT_STYLE: CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '5px 7px', borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' }
export const TEXTAREA_STYLE: CSSProperties = { ...INPUT_STYLE, minHeight: 54, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }
export const ROW_STYLE: CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 5,
  border: '1px solid transparent', cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', font: 'inherit',
}

/**
 * 方法库条目行的选中视觉（BUG-047）：底色 tint + 边线 + 左侧 accent bar。
 *
 * 半透明一律走 `color-mix()`：在 `var(--x)` 后直接拼 alpha（如 `0f`）这种写法在计算值阶段整条
 * 失效（浏览器静默丢弃），选区看起来与未选中等同。未选中返回空对象——行背景归
 * `installMethodLibrarySelectionStyles` 的 hover 规则，inline 覆盖会让 hover 失效。
 */
export function libraryRowStyle(selected: boolean): CSSProperties {
  if (!selected) return {}
  const accent = 'var(--dsw-alias-state-business-primary)'
  return {
    background: `color-mix(in srgb, ${accent} 12%, transparent)`,
    borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
    boxShadow: `inset 3px 0 0 ${accent}`,
  }
}
