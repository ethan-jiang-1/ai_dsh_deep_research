/**
 * 「研究状态」页签体（Stage 1：静态占位——构建链验通的最小渲染面）。
 * Stage 2 起接 journal 流（remote.session.follow），Stage 3 接步骤条/活标题/矩阵/review；
 * 组件保持薄渲染：折算一律住 `src/lib/` 纯函数（keyless 单测吃它们）。
 *
 * 类型形态：keyed 槽的 SlotComponent 期望 `(props) => ReactNode`——无注入面时 props
 * 收窄为 never，零参函数可赋给它（ComponentType 会带上 ComponentClass 分支、不匹配）。
 */
import type { ReactNode } from 'react'

/** Stage 1 的注入面为空（无数据通道）；Stage 2 起由槽描述符注入 follow/journal。 */
export function ResearchStatusTab(): ReactNode {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600 }}>研究状态</div>
      <div style={{ opacity: 0.7, marginTop: 4 }}>观察面建设中（Stage 1：构建链验通占位）</div>
    </div>
  )
}
