/**
 * 浏览器半：右栏「研究状态」页签（观察面，D18 单点例外）。
 * Stage 1 = 构建链验通的最小 client：页签注册 + 静态占位体；Stage 2 起接数据通道
 * （remote.session.follow 的 journal 流；再往后步骤条/活标题/矩阵/review——见 RFC
 * observability-gui 的两段三步）。数据/展示分层纪律：折算进 `src/lib/` 纯函数
 * （keyless 单测），组件薄渲染——本文件只做登记与装配。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// 纯类型导入：右栏页签契约（sidebarRightTabs 服务）的类型增强；不做值导入。
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { RESEARCH_TAB_KEY, RESEARCH_PANE_SLOT } from './keys.ts'
import { ResearchStatusTab } from './ResearchStatusTab.tsx'

/** Required services：右栏页签注册器 + 槽注册表（slots 由 renderer 提供，见 dsh.client.inject）。 */
export const inject = ['slots', 'sidebarRightTabs']

/**
 * Client plugin body：登记「研究状态」页签（类型 + keyed 槽体共享同一 key——拼错任一处
 * 都不报错、永不渲染，company 坑 1；由 verify 门禁 client-keys 机械对账）。
 * @param ctx - client root context。
 */
export function apply(ctx: ClientContext): void {
  ctx.inject(['slots', 'sidebarRightTabs'], (scoped) => {
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_TAB_KEY,
      kind: 'research-status',
      priority: 'extension',
      title: () => '研究状态',
      guide: [{ id: RESEARCH_TAB_KEY, order: 1, title: () => '研究状态', description: () => '研究 run 的步骤、等待与证据状态' }],
    }), 'deep-research-pack: research-status tab type')

    scoped.effect(() => scoped.slots.inject(RESEARCH_PANE_SLOT, () => [
      scoped.slots.register(
        // 无注入面（Stage 1 占位）→ 描述符省略 inject；Stage 2 接数据通道时在此给 follow/journal。
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_TAB_KEY },
        ResearchStatusTab,
      ),
    ]), 'deep-research-pack: research-status pane')
  })
}
