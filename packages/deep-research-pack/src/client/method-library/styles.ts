// method-library/styles.ts — 方法库行选中动态样式（其余静态样式已迁入 library.module.css）。
import type { CSSProperties } from 'react'

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
