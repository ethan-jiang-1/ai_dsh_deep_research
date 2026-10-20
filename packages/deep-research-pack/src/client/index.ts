/**
 * 浏览器半 = **研究驾驶舱（Research Cockpit）** —— 观察面 client 套件的唯一入口（2026-09-28
 * 定名；当前事实正本 = docs/design/40-research-cockpit.md——定位/构成/通道/纪律/验证/边界；
 * 目录名守 DSH 双半约定 host/client，套件名钉在本头注）。
 *
 * 组成（件名保留，均是驾驶舱里的件）：
 *   - 「研究状态」页签（右栏：步骤条 / 证据计数 / 人性化活动流 / 会话绑定 bundle 面）；
 *   - 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"）；
 *   - 研究语义工具卡（对话流：组队 / 检索）；
 *   - 挂起显性化（pending 迁移 → revealStatusTab → openTab 右栏同步骤展开）。
 * 数据通道 = `remote.session.follow`（WebSocket 流，snapshot 给历史、event 给实时）+
 * `remote.workspaceFiles`（会话工作区 → bundle 文件）。折算谓词住 `src/lib/`（keyless 单测，
 * 与 run-dashboard 投影共用）；数据/展示分层纪律：折算进 lib，组件薄渲染——本文件只做
 * 登记与装配。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// 纯类型导入：remote 命名空间（follow）与右栏页签契约（sidebarRightTabs）的类型增强。
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
// 品牌槽（`sidebar.brand.mark` / `sidebar.brand.name`）声明在 ui-sidebar 的 SlotMap——类型增强导入即登记槽名。
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import {
  RESEARCH_TAB_KEY, RESEARCH_CONFIG_TAB_KEY, RESEARCH_STATUS_TAB_KIND, RESEARCH_CONFIG_TAB_KIND,
  RESEARCH_FINAL_TAB_KEY, RESEARCH_FINAL_KIND, RESEARCH_FINAL_PATTERN, RESEARCH_FINAL_PATTERN_ROOT,
  RESEARCH_PANE_SLOT, RESEARCH_TITLE_SLOT, RESEARCH_TOOLVIEW_SLOT, RESEARCH_TOOL_KEYS,
  RESEARCH_BRAND_MARK_SLOT, RESEARCH_BRAND_NAME_SLOT,
} from './keys.ts'
import { IconGaugeOutlineRegular, IconSettingsOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { ResearchToolCard } from './ResearchToolCard.tsx'
import { ResearchStatusTab, ResearchStatusTitle, type JournalFrame, type FollowTarget } from './ResearchStatusTab.tsx'
import { ResearchConfigTab } from './ResearchConfigTab.tsx'
import { ResearchFinalTab } from './ResearchFinalTab.tsx'
import { OrcaMark, OrcaName } from './BrandMark.tsx'
import { draftInProgress, finalAddressOf, isFinalAddress, latestFinalDelivery, shouldOpenFinal } from '../lib/final-target.ts'

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
    // wire 形状 → 领域形状的折算住这里（纯装配），展示住组件。目标两形态：普通会话 id /
    // subagent 持久父地址（队员会话——纯 id 被 host 守卫拒，见 FollowTarget 注释）。
    const follow = async function* (target: FollowTarget, signal: AbortSignal): AsyncGenerator<JournalFrame> {
      const address = typeof target === 'string' ? { kind: 'session' as const, sessionId: target } : target
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
      kind: RESEARCH_STATUS_TAB_KIND,
      priority: 'extension',
      title: () => '研究状态',
      // guide 胶囊的 glyph（vendor SidebarRightGuideEntry.icon：标题前图标——缺席则画方块
      // 占位符；2026-09-28 用户点名要 icon）：仪表盘 = 状态监测语义，与检索/工具图标不撞
      guide: [{ id: RESEARCH_TAB_KEY, order: 1, title: () => '研究状态', description: () => '研究 run 的步骤、等待与证据状态', icon: IconGaugeOutlineRegular }],
    }), 'deep-research-pack: research-status tab type')

    // 研究通道品牌（用户定调 2026-10-13：虎鲸 Orca）——宿主侧栏 brand.mark / brand.name 两槽的
    // single occupant（fallback 内置鱼形 logo 与本地构建标签被本登记替换；槽契约 =
    // ui-sidebar contract/slots.ts——mark 收 {size}，name 空 owner share）。
    scoped.effect(() => scoped.slots.inject(RESEARCH_BRAND_MARK_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_BRAND_MARK_SLOT, priority: -1 }, OrcaMark),
    ]), 'deep-research-pack: orca brand mark')

    scoped.effect(() => scoped.slots.inject(RESEARCH_BRAND_NAME_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_BRAND_NAME_SLOT, priority: -1 }, OrcaName),
    ]), 'deep-research-pack: orca brand name')

    // 「研究配置」页签（D25 期 1 管理中继面）：显示偏好库投影 + 生成管理指令发 Lead——
    // 面板不直写文件（写路径唯一 = Lead，模型可见、会话日志留痕）。
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_CONFIG_TAB_KEY,
      kind: RESEARCH_CONFIG_TAB_KIND,
      priority: 'extension',
      title: () => '研究配置',
      guide: [{ id: RESEARCH_CONFIG_TAB_KEY, order: 2, title: () => '研究配置', description: () => '内置偏好与我的偏好库——一键把管理指令交给 Lead', icon: IconSettingsOutlineRegular }],
    }), 'deep-research-pack: research-config tab type')

    // 「终稿」页签（issue 2026-10-19-final-tab-in-sidebar）：**接管 `drt_<slug>/final.md` 的文件地址**
    // 而不是新造一个页签种类——交付卡片、结句内联引用、Files 树点到同一份文件，落的都是这一个
    // 页签（同地址幂等）。extension 带压过 vendor 兜底预览（`ui-sidebar-documentpreview` 是
    // fallback 带的 kind `text`）；认领范围由 canOpen 收窄到三个位置（根 / archive / _abandoned），
    // 其余 final.md（drafts、别的项目）一律让给兜底预览。
    // 无 guide 胶囊：常驻胶囊在"还没交付"时是空手承诺；终稿只能被送到（交付自动打开）或从
    // 研究状态⑤的门进来。
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_FINAL_TAB_KEY,
      kind: RESEARCH_FINAL_KIND,
      patterns: [RESEARCH_FINAL_PATTERN, RESEARCH_FINAL_PATTERN_ROOT],
      priority: 'extension',
      canOpen: isFinalAddress,
      title: () => '终稿',
    }), 'deep-research-pack: research-final tab type')

    // 管理指令发送闭包（D25 期 1）：session/prompt——默认 steer（在飞 run 即时消费），
    // 失败降级 queue（空闲会话排程）；两态结果回执给面板，不静默。requestId 铸造 =
    // vendor 同款（session.ts beginSubmission：randomUUID as SessionRequestId）。
    const sendInstruction = async (sessionId: SessionId, text: string): Promise<{ ok: boolean; detail: string }> => {
      const requestId = crypto.randomUUID() as import('@deepseek-ai/dsh-api-remotes/client').SessionRequestId
      const base = { requestId, sessionId, content: [{ type: 'text' as const, text }] }
      try {
        const steer = await scoped.remote.session.prompt({ ...base, mode: 'steer' }, new AbortController().signal)
        if (steer.ok) return { ok: true, detail: '已发送给 Lead' }
        const queued = await scoped.remote.session.prompt({ ...base, mode: 'queue' }, new AbortController().signal)
        return queued.ok ? { ok: true, detail: '已发送给 Lead' } : { ok: false, detail: String(queued.error ?? '未知错误') }
      } catch (cause) {
        return { ok: false, detail: String(cause) }
      }
    }

    // workspaceFiles 闭包（bundle 渐进面数据通道；company cultivation 同款，失败降级 null）
    const listDir = async (sessionId: SessionId, path: string, signal: AbortSignal) => {
      try {
        const result = await scoped.remote.workspaceFiles.list(sessionId, path, signal)
        if (!result.ok) {
          // 诊断面（RFC research-status-ui 的 bundle 渐进面）：把真实失败原因打到 console，
          // 便于 client-load-smoke 抓取——静默吞错会让"数据面不可达"与"目录为空"无法区分。
          // 例外：`workspace-file/not-found` = 目录尚未产出（run 早期证据面还没建、刚 scaffold
          // 的 bundle 只有 question/topics），是**合法空态**而非故障——按空列表降级、不打 error
          // （2026-10-19 0.2.1-rc.2 端到端实测：drt_cn-us-agriculture-gap 无 evidence/ 目录，
          // 页签把正常空态当故障报红）。真故障（权限/通道/其他 code）仍然 fail-loud。
          const code = (result.error as { code?: string } | undefined)?.code
          if (code === 'workspace-file/not-found') return []
          console.error('[research-status] workspaceFiles.list 失败', JSON.stringify({ path, error: result.error }))
          return null
        }
        return result.value.entries as readonly { type: string; name: string }[]
      } catch (cause) {
        console.error('[research-status] workspaceFiles.list 抛错', String(cause))
        return null
      }
    }
    // limit 参数化（BUG-026）：默认 40 行 = bundle 渐进面小读取的历史选择（question.md 首行
    // 等）；「研究配置」页签的库读传大限（多条目库 >40 行，写死会静默截断——vendor 契约
    // limit 上限 = 配置 maxLines，默认 5000）。
    const readFile = async (sessionId: SessionId, path: string, signal: AbortSignal, limit = 40) => {
      try {
        const result = await scoped.remote.workspaceFiles.read(sessionId, path, { limit }, signal)
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

    // 终稿页签的读面（issue 2026-10-19）：分页读（正文按 500 行/页续读，不赌 maxLines 配置）
    // + 版本令牌（文件改写巡检）。读面本身是一张定表——路径由 lib/final-target.finalReadPlan 给。
    const readPage = async (sessionId: SessionId, path: string, signal: AbortSignal, offset: number, limit: number) => {
      try {
        const result = await scoped.remote.workspaceFiles.read(sessionId, path, { offset, limit }, signal)
        if (!result.ok) {
          console.error('[research-final] workspaceFiles.read 失败', JSON.stringify({ path, error: result.error }))
          return null
        }
        const value = result.value as { text?: unknown; lines?: unknown; eof?: unknown }
        if (typeof value.text !== 'string') return null
        return { text: value.text, lines: typeof value.lines === 'number' ? value.lines : 0, eof: value.eof === true }
      } catch (cause) {
        console.error('[research-final] workspaceFiles.read 抛错', String(cause))
        return null
      }
    }
    const statVersion = async (sessionId: SessionId, path: string, signal: AbortSignal) => {
      try {
        const result = await scoped.remote.workspaceFiles.stat(sessionId, path, signal)
        if (!result.ok) return null
        const version = (result.value as { version?: unknown }).version
        return typeof version === 'string' ? version : null
      } catch { return null }
    }
    // 终稿的唯一打开入口：文件地址 → 页签（同地址幂等——交付卡片与自动打开落同一页签）。
    const openFinal = (sessionId: SessionId, path: string) => {
      try { scoped.sidebarRight.openResource(finalAddressOf(sessionId, path)) }
      catch (cause) { console.error('[research-final] openResource 失败', String(cause)) }
    }

    // 挂起显性化入口（RFC right-pane-ux-debt）：pending 迁移时页签体调用——openTab 落定时
    // 右栏同步骤展开（vendor sidebar-right 契约）；页签体在折叠态保持挂载（dock 不卸载）。
    const revealStatusTab = () => { scoped.sidebarRight.openTab(RESEARCH_STATUS_TAB_KIND) }

    scoped.effect(() => scoped.slots.inject(RESEARCH_PANE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow, listDir, readFile, readPage, revealStatusTab, openFinal }) },
        ResearchStatusTab,
      ),
      scoped.slots.register(
        // 「研究配置」注入面 2026-10-18 扩：+ listDir/follow（「本次研究」区要按会话绑定定位
        // bundle 并读 question.md 方法节；回执的「Lead 已回话」信号也走 journal 流）。
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_CONFIG_TAB_KEY, inject: () => ({ readFile, listDir, follow, sendInstruction }) },
        ResearchConfigTab,
      ),
      // 「终稿」页签体：读面 = 分页读 + 审查判定 + 版本目录（三处定表，见 lib/final-target）。
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_FINAL_TAB_KEY, inject: () => ({ readPage, readFile, listDir, statVersion }) },
        ResearchFinalTab,
      ),
    ]), 'deep-research-pack: research-pane tabs')

    // 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"——用户点名的观察需求）：同一 fold 谓词
    //（末位事件 = 未答的 ask_user_question），标题组件自己开一条 follow 流（两条流都吃
    // 同一 WebSocket 数据面，v1 接受；合流进共享 store 是后续优化）。
    // 研究语义工具卡（S2）：spawn_teammate / web_search → 研究语义卡。一键一 inject +
    // priority -1 压过 vendor 通用明细行（rc.2 同键同优先级 throw——company UX 实验实证）。
    // 每个 key 独立 effect 包裹（registrations are effects：dispose 即撤销该卡贡献——
    // 零裸注册，门禁 client-effect-wrap 把守；test-strategy 语料台阶③收口）。
    for (const key of RESEARCH_TOOL_KEYS) {
      scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
        scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key, priority: -1 }, ResearchToolCard)), `deep-research-pack: toolview ${key}`)
    }

    scoped.effect(() => scoped.slots.inject(RESEARCH_TITLE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_TITLE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow, listDir, readFile, revealStatusTab }) },
        ResearchStatusTitle,
      ),
    ]), 'deep-research-pack: research-status live title')

    // ── 交付监听（本卡的"时刻"）：present 指向终稿 → 打开终稿页签 ─────────────────────
    // 规则（issue 2026-10-19 §时机）：
    //   · 只认 **live 帧**——follow 开场快照是回合窗口，拿回放触发 = 每次重载都弹一次；
    //   · 按 callId 去重——同一次交付只开一次，用户关掉后不再弹（ui-plan 同规则）；
    //   · 焦点在可编辑元素时不打断——正在写下一条消息的人，眼前的回合尾卡与⑤的门仍在；
    //   · 只对**在屏会话**动作——切会话弹右栏是既有裁决否决过的打扰
    //     （notes/archived/2026-09-28-right-pane-ux-debt.md §输掉的方案）。
    // 这是本包唯一一处"替用户打开东西"：出现时机就是交付本身，别处不再自动弹面。
    scoped.effect(() => {
      const opened = new Set<string>()
      let followed: SessionId | undefined
      let controller: AbortController | undefined
      // 让路判据 = "焦点里有真草稿"（不是"焦点在输入框"）：会话打开即聚焦 composer，
      // 空输入框不算在写——见 lib/final-target.draftInProgress 的实测来由。
      const focusedInEditor = () => draftInProgress(document.activeElement)
      const stop = () => { controller?.abort(); controller = undefined; followed = undefined }
      const watch = (sessionId: SessionId) => {
        if (followed === sessionId) return
        stop()
        followed = sessionId
        const next = new AbortController()
        controller = next
        void (async () => {
          try {
            for await (const frame of follow(sessionId, next.signal)) {
              if (frame.kind !== 'event') continue
              const delivery = latestFinalDelivery([frame.event])
              if (delivery === null) continue
              if (!shouldOpenFinal(delivery, opened, sessionId, focusedInEditor())) continue
              opened.add(`${sessionId}:${delivery.callId}`)
              openFinal(sessionId, delivery.path)
            }
          } catch (cause) {
            if (!next.signal.aborted) console.error('[research-final] 交付监听流失败', String(cause))
          }
        })()
      }
      const sync = () => {
        const sessionId = scoped.sidebarRight.mounted.getSnapshot()
        if (sessionId === undefined) stop()
        else watch(sessionId)
      }
      const unsubscribe = scoped.sidebarRight.mounted.subscribe(sync)
      sync()
      return () => { unsubscribe(); stop() }
    }, 'deep-research-pack: final delivery watcher')
  })
}
