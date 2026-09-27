/**
 * 浏览器半：右栏「研究状态」页签（观察面，D18 单点例外）。
 * 数据通道 = `remote.session.follow`（WebSocket 流，snapshot 给历史、event 给实时）+
 * `remote.workspaceFiles`（会话工作区根 → run bundle 文件）。注册三件：页签体（步骤条 /
 * 问题行 / 证据概览 / 交付状态 / 团队动态）、活标题（HITL 挂起时改标题）、研究语义工具卡。
 * 数据/展示分层纪律：折算进 `src/lib/` 纯函数（keyless 单测），组件薄渲染——本文件只做
 * 登记与装配。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// 纯类型导入：remote 命名空间（follow）与右栏页签契约（sidebarRightTabs）的类型增强。
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { RESEARCH_TAB_KEY, RESEARCH_PANE_SLOT, RESEARCH_TITLE_SLOT, RESEARCH_TOOLVIEW_SLOT } from './keys.ts'
import { IconGaugeOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { ResearchToolCard, RESEARCH_TOOL_KEYS } from './ResearchToolCard.tsx'
import { ResearchStatusTab, ResearchStatusTitle, type JournalFrame } from './ResearchStatusTab.tsx'

/** Required services：槽注册表（renderer）+ 右栏页签注册器 + 右栏导航面（openTab——挂起显性化）+ remote 命名空间与 remote.session 子服务（journal 流；0.1.7 实测**两级都要声明**——只声明
 *  父级则取 .session 炸 "without injecting it"，只声明子级则取父属性炸 "without inject"）。 */
export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.session', 'remote.workspaceFiles']

/**
 * Client plugin body：登记「研究状态」页签（类型 + keyed 槽体共享同一 key——拼错任一处
 * 都不报错、永不渲染，company 坑 1；由 verify 门禁 client-keys 机械对账）。
 * @param ctx - client root context。
 */
export function apply(ctx: ClientContext): void {
  ctx.inject(['slots', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.session', 'remote.workspaceFiles'], (scoped) => {
    // journal 流式源（company 同款最小投影）：snapshot 给历史、event 给实时；
    // wire 形状 → 领域形状的折算住这里（纯装配），展示住组件。
    const follow = async function* (sessionId: SessionId, signal: AbortSignal): AsyncGenerator<JournalFrame> {
      const address = { kind: 'session' as const, sessionId }
      for await (const frame of scoped.remote.session.follow({ address }, signal)) {
        if (frame.type === 'snapshot') {
          yield { kind: 'history', events: frame.records.map((record) => record.event) }
        } else if (frame.type === 'event') {
          yield { kind: 'event', event: frame.event }
        }
      }
    }

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_TAB_KEY,
      kind: 'research-status',
      priority: 'extension',
      title: () => '研究状态',
      // guide 胶囊的 glyph（vendor SidebarRightGuideEntry.icon：标题前图标——缺席则画方块
      // 占位符；2026-09-28 用户点名要 icon）：仪表盘 = 状态监测语义，与检索/工具图标不撞
      guide: [{ id: RESEARCH_TAB_KEY, order: 1, title: () => '研究状态', description: () => '研究 run 的步骤、等待与证据状态', icon: IconGaugeOutlineRegular }],
    }), 'deep-research-pack: research-status tab type')

    // workspaceFiles 闭包（bundle 渐进面数据通道；company cultivation 同款，失败降级 null）
    const listDir = async (sessionId: SessionId, path: string, signal: AbortSignal) => {
      try {
        const result = await scoped.remote.workspaceFiles.list(sessionId, path, signal)
        if (!result.ok) {
          // 诊断面（RFC research-status-ui 的 bundle 渐进面）：把真实失败原因打到 console，
          // 便于 client-load-smoke 抓取——静默吞错会让"数据面不可达"与"目录为空"无法区分。
          console.error('[research-status] workspaceFiles.list 失败', JSON.stringify({ path, error: result.error }))
          return null
        }
        return result.value.entries as readonly { type: string; name: string }[]
      } catch (cause) {
        console.error('[research-status] workspaceFiles.list 抛错', String(cause))
        return null
      }
    }
    const readFile = async (sessionId: SessionId, path: string, signal: AbortSignal) => {
      try {
        const result = await scoped.remote.workspaceFiles.read(sessionId, path, { limit: 40 }, signal)
        if (!result.ok) {
          console.error('[research-status] workspaceFiles.read 失败', JSON.stringify({ path, error: result.error }))
          return null
        }
        const text = (result.value as { text?: unknown }).text
        return typeof text === 'string' ? text : null
      } catch (cause) {
        console.error('[research-status] workspaceFiles.read 抛错', String(cause))
        return null
      }
    }

    // 挂起显性化入口（RFC right-pane-ux-debt）：pending 迁移时页签体调用——openTab 落定时
    // 右栏同步骤展开（vendor sidebar-right 契约）；页签体在折叠态保持挂载（dock 不卸载）。
    const revealStatusTab = () => { scoped.sidebarRight.openTab('research-status') }

    scoped.effect(() => scoped.slots.inject(RESEARCH_PANE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow, listDir, readFile, revealStatusTab }) },
        ResearchStatusTab,
      ),
    ]), 'deep-research-pack: research-status pane')

    // 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"——用户点名的观察需求）：同一 fold 谓词
    //（末位事件 = 未答的 ask_user_question），标题组件自己开一条 follow 流（两条流都吃
    // 同一 WebSocket 数据面，v1 接受；合流进共享 store 是后续优化）。
    // 研究语义工具卡（S2）：spawn_teammate / web_search → 研究语义卡。一键一 inject +
    // priority -1 压过 vendor 通用明细行（rc.2 同键同优先级 throw——company UX 实验实证）。
    for (const key of RESEARCH_TOOL_KEYS) {
      scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
        scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key, priority: -1 }, ResearchToolCard))
    }

    scoped.effect(() => scoped.slots.inject(RESEARCH_TITLE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_TITLE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow, listDir, readFile, revealStatusTab }) },
        ResearchStatusTitle,
      ),
    ]), 'deep-research-pack: research-status live title')
  })
}
