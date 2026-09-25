/**
 * 浏览器半：右栏「研究状态」页签（观察面，D18 单点例外）。
 * Stage 2（B-min）：journal 流页签——数据通道 = `remote.session.follow`（WebSocket 流，
 * snapshot 给历史、event 给实时；company 同款最小投影）；Stage 3 起接步骤条/活标题/矩阵/
 * review（见 RFC observability-gui 的两段三步）。数据/展示分层纪律：折算进 `src/lib/`
 * 纯函数（keyless 单测），组件薄渲染——本文件只做登记与装配。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// 纯类型导入：remote 命名空间（follow）与右栏页签契约（sidebarRightTabs）的类型增强。
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { RESEARCH_TAB_KEY, RESEARCH_PANE_SLOT, RESEARCH_TITLE_SLOT, RESEARCH_TOOLVIEW_SLOT } from './keys.ts'
import { ResearchToolCard, RESEARCH_TOOL_KEYS } from './ResearchToolCard.tsx'
import { ResearchStatusTab, ResearchStatusTitle, type JournalFrame } from './ResearchStatusTab.tsx'

/** Required services：槽注册表（renderer）+ 右栏页签注册器 + remote 命名空间与 remote.session 子服务（journal 流；0.1.7 实测**两级都要声明**——只声明
 *  父级则取 .session 炸 "without injecting it"，只声明子级则取父属性炸 "without inject"）。 */
export const inject = ['slots', 'sidebarRightTabs', 'remote', 'remote.session']

/**
 * Client plugin body：登记「研究状态」页签（类型 + keyed 槽体共享同一 key——拼错任一处
 * 都不报错、永不渲染，company 坑 1；由 verify 门禁 client-keys 机械对账）。
 * @param ctx - client root context。
 */
export function apply(ctx: ClientContext): void {
  ctx.inject(['slots', 'sidebarRightTabs', 'remote', 'remote.session'], (scoped) => {
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
      guide: [{ id: RESEARCH_TAB_KEY, order: 1, title: () => '研究状态', description: () => '研究 run 的步骤、等待与证据状态' }],
    }), 'deep-research-pack: research-status tab type')

    scoped.effect(() => scoped.slots.inject(RESEARCH_PANE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow }) },
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
        { name: RESEARCH_TITLE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow }) },
        ResearchStatusTitle,
      ),
    ]), 'deep-research-pack: research-status live title')
  })
}
