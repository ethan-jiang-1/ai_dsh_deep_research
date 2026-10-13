/**
 * 研究通道品牌（虎鲸 Orca）——注册进宿主 `sidebar.brand.mark` / `sidebar.brand.name` 两槽
 * （kind: single / scope: root；fallback = FishLogo 与本地构建标签）。用户定调 2026-10-13：
 * 本通道品牌面 = 虎鲸（声呐"以耳成像" + 群体协作狩猎——"广听广察、群队协作"与研究通道的
 * 语义同构）。形状纪律：纯 currentColor 剪影（随主题自动明暗），24px 下仍可辨
 * （背鳍/身/尾叶/胸鳍四块）。
 */
import type { ReactNode } from 'react'

/** 虎鲸标的几何（viewBox 24；供 size 缩放；面朝右）。 */
export function OrcaMark({ size = 24 }: { readonly size?: number }): ReactNode {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {/* 背鳍：虎鲸的招牌——高耸而略后弯 */}
      <path d="M15.2 10.4 C14.3 7.4 13.6 4.6 12.2 2.4 C11.9 5.4 10.9 8.4 9.6 11.0 Z" />
      {/* 身：钝头流线体 */}
      <ellipse cx="12.6" cy="14.2" rx="9.2" ry="4.4" />
      {/* 尾叶：分叉新月（侧视双叶） */}
      <path d="M4.8 13.9 L0.8 10.0 C2.5 11.6 3.5 12.8 3.6 14.0 C3.5 15.2 2.5 16.4 0.9 18.0 Z" />
      {/* 胸鳍：后掠小桨 */}
      <path d="M10.8 18.2 C11.3 20.2 12.7 21.6 14.8 22.1 C13.0 20.8 12.2 19.6 12.0 18.0 Z" />
    </svg>
  )
}

/** 品牌名（替换 fallback 的本地构建标签；owner share 为空——内容与宽度自持）。 */
export function OrcaName(): ReactNode {
  return <>Orca</>
}
