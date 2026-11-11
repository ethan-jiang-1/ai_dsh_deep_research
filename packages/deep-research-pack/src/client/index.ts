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
// `conversation.view`（Chat/Trajectory 同排的主界面 tab）声明在 ui-conversation。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, zh, type DeepResearchPackLocaleKey } from './locales.ts'
// 品牌槽（`sidebar.brand.mark` / `sidebar.brand.name`）声明在 ui-sidebar 的 SlotMap——类型增强导入即登记槽名。
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import {
  RESEARCH_TAB_KEY, RESEARCH_CONFIG_TAB_KEY, RESEARCH_STATUS_TAB_KIND, RESEARCH_CONFIG_TAB_KIND,
  RESEARCH_GRAPH_TAB_KEY, RESEARCH_GRAPH_TAB_KIND,
  RESEARCH_FINAL_TAB_KEY, RESEARCH_FINAL_KIND, RESEARCH_FINAL_PATTERN,
  RESEARCH_FINAL_PATTERN_LEDGER, RESEARCH_FINAL_PATTERN_READER,
  RESEARCH_PANE_SLOT, RESEARCH_TITLE_SLOT, RESEARCH_TOOLVIEW_SLOT, RESEARCH_TOOL_KEYS, METHOD_LIBRARY_TOOL, METHOD_LIBRARY_REMOVE, METHOD_LIBRARY_DEFAULT,
  RESEARCH_BRAND_MARK_SLOT, RESEARCH_BRAND_NAME_SLOT, RESEARCH_START_DOCK_SLOT, METHOD_LIBRARY_VIEW,
  METHOD_COACH_PORTAL, METHOD_COACH_PORTAL_ID, METHOD_COACH_CHAT,
} from './keys.ts'
import { IconBranchOutlineRegular, IconGaugeOutlineRegular, IconSettingsOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { ResearchToolCard } from './ResearchToolCard.tsx'
import { MethodLibraryToolCard } from './MethodLibraryToolCard.tsx'
import { ResearchStatusTab, ResearchStatusTitle } from './ResearchStatusTab.tsx'
import { ResearchConfigTab } from './ResearchConfigTab.tsx'
import { MethodLibraryView } from './MethodLibraryView.tsx'
import { MethodCoachPortal, CoachChat } from './method-library/coach.tsx'
import { ResearchGraphTab } from './ResearchGraphTab.tsx'
import { ResearchFinalTab } from './ResearchFinalTab.tsx'
import { browserRunSource } from './run-source-browser.ts'
import { OrcaMark, OrcaName } from './BrandMark.tsx'
import { createFollow, hasUserMessage, watchCoach } from './session-follow.ts'
import { createWorkspaceBoot, type SessionsLike, type UiWorkspaceLike, type WorkspacesLike } from './workspace-boot.ts'
import { installCoachComposerStyles, installMethodLibrarySelectionStyles, installQuestionCardNarrowFix } from './styles.ts'
import { createWorkspaceFiles } from './workspace-files.ts'
import { createCoachSessions } from './coach-sessions.ts'
import { watchDelivery } from './delivery-watch.ts'
import { createLeadPrompt } from './lead-prompt.ts'
import { StartCard, type StartCardInjected } from './StartCard.tsx'
import { finalAddressOf, isFinalAddress } from '../lib/final-target.ts'

/** Required services：槽注册表（renderer）+ 右栏页签注册器 + 右栏导航面（openTab——挂起显性化）+ remote 命名空间与 remote.session 子服务（journal 流；0.1.7 实测**两级都要声明**——只声明
 *  父级则取 .session 炸 "without injecting it"，只声明子级则取父属性炸 "without inject"）。 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    deepResearchPack: DeepResearchPackLocaleKey
  }
}

export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.session', 'remote.workspaceFiles', 'sessions', 'workspaces', 'uiWorkspace', 'locale']

/**
 * Client plugin body：登记「研究状态」页签（类型 + keyed 槽体共享同一 key——拼错任一处
 * 都不报错、永不渲染，company 坑 1；由 verify 门禁 client-keys 机械对账）。
 * @param ctx - client root context。
 */
export function apply(ctx: ClientContext): void {
  ctx.inject(['slots', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.session', 'remote.workspaceFiles', 'sessions', 'workspaces', 'uiWorkspace', 'locale'], (scoped) => {
    // 字典必须**同步**注册后再 bind：effect 回调可能延迟到 inject 回调返回后才跑，
    // 而页签/guide 的 title 在注册期就会被求值（2026-11-03 实测：包成 effect 后标题取不到值）。
    // 注册是 effect 语义 —— 同步取得 disposer，再交给 scoped.effect 管回收。
    const disposeDictionaries = scoped.locale.register('deepResearchPack', { zh, en })
    scoped.effect(() => disposeDictionaries, 'deep-research-pack: dictionaries')
    const t = scoped.locale.bind('deepResearchPack')
    // 服务句柄在**注入回调内**取好再闭包：Cordis 在属性访问时校验当前 fiber 的 inject；
    // follow 会在页签渲染 fiber 里被调用，届时再取 `remote.session` 会 `without inject`（实测）。
    const remoteSession = scoped.remote.session
    const follow = createFollow({ session: { follow: (input, signal) => remoteSession.follow({ address: input.address as never }, signal) } })
    // 首屏起步卡探测 / 方法编辑会话流：纯装配住 session-follow.ts（2026-11-03 P4 拆分）。
    const boot = createWorkspaceBoot({
      workspaces: scoped.workspaces as unknown as WorkspacesLike,
      sessions: scoped.sessions as unknown as SessionsLike,
      uiWorkspace: (scoped as unknown as { uiWorkspace: UiWorkspaceLike }).uiWorkspace,
      storage: localStorage,
    })
    const { chooseWorkspace, ensureProductWorkspace, workspaceOf } = boot
    const workspaceFiles = scoped.remote.workspaceFiles
    const { listDir, readLibrary, readPreview, readText: readFile } = createWorkspaceFiles(workspaceFiles as never)
    const { sendInstruction } = createLeadPrompt({ prompt: (input, signal) => remoteSession.prompt(input as never, signal) }, t)
    const { ensureCoachSession, sendCoach, migrateKnownCoachTitles } = createCoachSessions(
      scoped as unknown as { get(name: string): unknown },
      {
        rename: (input) => remoteSession.rename(input),
        prompt: (input, signal) => remoteSession.prompt(input as never, signal),
      },
      t,
    )

    // 方法编辑自动标题随 locale（BUG-069）：locale 快照变化时重扫本包会话，把已知默认标题
    // 迁到当前 locale（会话开着切界面也生效）；自定义标题与其它会话不动。
    scoped.effect(() => scoped.locale.subscribe(() => { void migrateKnownCoachTitles() }), 'deep-research-pack: method-editor title locale sync')

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_TAB_KEY,
      kind: RESEARCH_STATUS_TAB_KIND,
      priority: 'extension',
      title: () => t('tabStatus'),
      // guide 胶囊的 glyph（vendor SidebarRightGuideEntry.icon：标题前图标——缺席则画方块
      // 占位符；2026-09-28 用户点名要 icon）：仪表盘 = 状态监测语义，与检索/工具图标不撞
      guide: [{ id: RESEARCH_TAB_KEY, order: 1, title: () => t('tabStatus'), description: () => t('tabStatusGuide'), icon: IconGaugeOutlineRegular }],
    }), 'deep-research-pack: research-status tab type')

    // ── 问卡窄列修复（2026-10-21 实测）──
    // 右栏展开后聊天列变窄（1280 视口：右栏 576 → 卡片 353），vendor ui-user-questions 的卡头是
    // `justify-content: space-between` + 右侧动作区 nowrap/不收缩 + 左侧 headingBlock `min-width: 0`,
    // 于是标题塌到 min-content（实测宽 24px、高 946px = 一字一行）。稳定钩子 = 组件根的
    // `data-question-key`（不是哈希类名）。规则只在窄列生效：卡头允许换行 + 标题给 14em 弹性基准，
    // 宽列仍是一行。**fail-soft**：vendor 若删该钩子，规则只是不再命中，不会影响其它组件。
    // 移除条件：vendor 卡头自带换行/最小宽后删除本 effect（登记在 design/40 §已知限制与延后工作）。
    scoped.effect(() => installQuestionCardNarrowFix(), 'deep-research-pack: question card narrow-column fix')

    // 研究通道品牌（用户定调 2026-10-13：虎鲸 Orca）——宿主侧栏 brand.mark / brand.name 两槽的
    // single occupant（fallback 内置鱼形 logo 与本地构建标签被本登记替换；槽契约 =
    // ui-sidebar contract/slots.ts——mark 收 {size}，name 空 owner share）。
    scoped.effect(() => scoped.slots.inject(RESEARCH_BRAND_MARK_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_BRAND_MARK_SLOT, priority: -1 }, OrcaMark),
    ]), 'deep-research-pack: orca brand mark')

    scoped.effect(() => scoped.slots.inject(RESEARCH_BRAND_NAME_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_BRAND_NAME_SLOT, priority: -1, locale: 'deepResearchPack' }, OrcaName),
    ]), 'deep-research-pack: orca brand name')

    // 「研究配置」页签（D25 期 1 管理中继面）：显示偏好库投影 + 生成管理指令发 Lead——
    // 面板不直写文件（写路径唯一 = Lead，模型可见、会话日志留痕）。
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_CONFIG_TAB_KEY,
      kind: RESEARCH_CONFIG_TAB_KIND,
      priority: 'extension',
      title: () => t('tabConfig'),
      guide: [{ id: RESEARCH_CONFIG_TAB_KEY, order: 2, title: () => t('tabConfig'), description: () => t('tabConfigGuide'), icon: IconSettingsOutlineRegular }],
    }), 'deep-research-pack: research-config tab type')

    // 「研究图谱」页签（2026-10-21 A0）：依赖形状 + worker 层 + 异常注意力；只读 + 让 Lead 调整。
    // 不是第二个任务板——任务 CRUD 仍归 ui-agent-team（design/40 §6 边界）。
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_GRAPH_TAB_KEY,
      kind: RESEARCH_GRAPH_TAB_KIND,
      priority: 'extension',
      title: () => t('tabGraph'),
      guide: [{ id: RESEARCH_GRAPH_TAB_KEY, order: 3, title: () => t('tabGraph'), description: () => t('tabGraphGuide'), icon: IconBranchOutlineRegular }],
    }), 'deep-research-pack: research-graph tab type')

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
      patterns: [RESEARCH_FINAL_PATTERN, RESEARCH_FINAL_PATTERN_LEDGER, RESEARCH_FINAL_PATTERN_READER],
      priority: 'extension',
      canOpen: isFinalAddress,
      title: () => t('tabFinal'),
    }), 'deep-research-pack: research-final tab type')

    // 管理指令发送闭包（D25 期 1）：session/prompt——默认 steer（在飞 run 即时消费），
    // 失败降级 queue（空闲会话排程）；两态结果回执给面板，不静默。requestId 铸造 =
    // vendor 同款（session.ts beginSubmission：randomUUID as SessionRequestId）。
    // 终稿页签的读面：run-context 的浏览器适配器（三位置/读策略/翻页归 lib；页签只拿 view）。
    const runSource = (sessionId: SessionId) => browserRunSource(workspaceFiles, sessionId)

    const openFinal = (sessionId: SessionId, path: string) => {
      try { scoped.sidebarRight.openResource(finalAddressOf(sessionId, path)) }
      catch (cause) { console.error('[research-final] openResource 失败', String(cause)) }
    }

    // 挂起显性化入口（RFC right-pane-ux-debt）：pending 迁移时页签体调用——openTab 落定时
    // 右栏同步骤展开（vendor sidebar-right 契约）；页签体在折叠态保持挂载（dock 不卸载）。
    const revealStatusTab = () => { scoped.sidebarRight.openTab(RESEARCH_STATUS_TAB_KIND) }

    // 产品首屏起步卡（D38 / S2）：blank Session + 工作区无 drt_* + 无用户消息时显示。
    // 用现有 dock slot，不新增模型可见文本；工作区读失败仍显示，不阻塞 composer。
    scoped.effect(() => scoped.slots.inject(RESEARCH_START_DOCK_SLOT, () => scoped.slots.register({
      name: RESEARCH_START_DOCK_SLOT,
      id: 'deep-research-start',
      order: 5,
      locale: 'deepResearchPack',
      inject: (sessionId: SessionId): StartCardInjected => {
        const workspace = workspaceOf(sessionId)
        return {
          sessionId,
          workspaceTitle: workspace?.title ?? null,
          workspacePath: workspace?.path ?? null,
          listDir: async (sessionId, path, signal) => (await listDir(sessionId, path, signal)) ?? [],
          hasUserMessage: (sessionId: SessionId) => hasUserMessage(follow, sessionId),
          chooseWorkspace,
        }
      },
    }, StartCard)), 'deep-research-pack: start card')

    scoped.effect(() => scoped.slots.inject(RESEARCH_PANE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ follow, runSource, revealStatusTab, openFinal }) },
        ResearchStatusTab,
      ),
      scoped.slots.register(
        // 「研究配置」注入面 2026-10-18 扩：+ listDir/follow（「本次研究」区要按会话绑定定位
        // bundle 并读 question.md 方法节；回执的「Lead 已回话」信号也走 journal 流）。
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_CONFIG_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ readFile, listDir, follow, runSource, sendInstruction }) },
        ResearchConfigTab,
      ),
      // 「研究图谱」页签体：只读观察（DAG 图 + plan 原文 + 映射），不提供调整动作；
      // plan.md 缺文件合法（readFile missingOk=true 不打 console.error）；follow 只用于
      // sessionBindingOf 定位 `drt_<slug>/`，不对图折活动流。
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_GRAPH_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ runSource, follow }) },
        ResearchGraphTab,
      ),
      // 「终稿」页签体：读面 = run-context（三位置/readPolicy/翻页），审查判定与版本目录在此之上。
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_FINAL_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ runSource }) },
        ResearchFinalTab,
      ),
    ]), 'deep-research-pack: research-pane tabs')

    // 主界面「方法库」tab（2026-10-21 管理迁移）：Chat/Trajectory 同排，workspace 级库管理。
    // 只读 workspaceFiles + W1 session/prompt（Lead 写文件）；不新增写权限、不直改 Team/文件。
    scoped.effect(() => scoped.slots.inject(METHOD_LIBRARY_VIEW, () => scoped.slots.register({
      name: METHOD_LIBRARY_VIEW,
      id: 'method-library',
      order: 20,
      label: () => t('methodLibrary'),
      locale: 'deepResearchPack',
      inject: () => ({
        readLibrary,
        ensureCoach: ensureCoachSession,
        sendCoach,
        watchCoach: (sessionId: SessionId, signal: AbortSignal, onEvent, onReady) => watchCoach(follow, sessionId, signal, onEvent, onReady),
        listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => listDir(sessionId, path, signal),
        readPreview: (sessionId: SessionId, path: string, signal: AbortSignal) => readPreview(sessionId, path, signal),
      }),
    }, MethodLibraryView)), 'deep-research-pack: method-library conversation view')

    // 方法库写库工具卡：对话流里只显示「已写入库：name」，不暴露工具参数。
    scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
      scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key: METHOD_LIBRARY_TOOL, priority: -1, locale: 'deepResearchPack' }, MethodLibraryToolCard)),
    'deep-research-pack: method-library toolview')
    scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
      scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key: METHOD_LIBRARY_REMOVE, priority: -1, locale: 'deepResearchPack' }, MethodLibraryToolCard)),
    'deep-research-pack: method-library remove toolview')
    scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
      scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key: METHOD_LIBRARY_DEFAULT, priority: -1, locale: 'deepResearchPack' }, MethodLibraryToolCard)),
    'deep-research-pack: method-library default toolview')

    // 方法编辑：根级 portal（shell.overlay）+ 私有 session 子槽；会话树在 main 之外，DOM 进页面右栏。
    scoped.effect(() => scoped.slots.inject(METHOD_COACH_PORTAL, () => scoped.slots.register({
      name: METHOD_COACH_PORTAL,
      id: METHOD_COACH_PORTAL_ID,
      order: 100,
      children: { [METHOD_COACH_CHAT]: { kind: 'single', scope: 'session' } },
    }, MethodCoachPortal)), 'deep-research-pack: method-coach portal')
    scoped.effect(() => scoped.slots.inject(METHOD_COACH_CHAT, () => scoped.slots.register({
      name: METHOD_COACH_CHAT,
    }, CoachChat)), 'deep-research-pack: method-coach chat slot')

    // 方法库新建/编辑态：隐藏外层主 composer，避免两个输入框；只对外层 seat 自己的问卡让位
    // （coach 的问卡在页面里，不能误触发外层 composer）。
    scoped.effect(() => installCoachComposerStyles(), 'deep-research-pack: method-library coach composer suppression')

    // 方法库条目行状态（hover / 焦点环 / 过渡）：选中视觉走 inline libraryRowStyle（BUG-047）。
    scoped.effect(() => installMethodLibrarySelectionStyles(), 'deep-research-pack: method-library row states')

    // 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"——用户点名的观察需求）：同一 fold 谓词
    //（末位事件 = 未答的 ask_user_question），标题组件自己开一条 follow 流（两条流都吃
    // 同一 WebSocket 数据面，v1 接受；合流进共享 store 是后续优化）。
    // 研究语义工具卡（S2）：spawn_teammate / web_search → 研究语义卡。一键一 inject +
    // priority -1 压过 vendor 通用明细行（rc.2 同键同优先级 throw——company UX 实验实证）。
    // 每个 key 独立 effect 包裹（registrations are effects：dispose 即撤销该卡贡献——
    // 零裸注册，门禁 client-effect-wrap 把守；test-strategy 语料台阶③收口）。
    for (const key of RESEARCH_TOOL_KEYS) {
      scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
        scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key, priority: -1, locale: 'deepResearchPack' }, ResearchToolCard)), `deep-research-pack: toolview ${key}`)
    }

    scoped.effect(() => scoped.slots.inject(RESEARCH_TITLE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_TITLE_SLOT, key: RESEARCH_TAB_KEY, inject: () => ({ follow, listDir, readFile, revealStatusTab, labels: { idle: t('tabStatus'), pending: t('tabStatusPending') } }) },
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
    scoped.effect(() => watchDelivery({ follow, openFinal, mounted: scoped.sidebarRight.mounted }), 'deep-research-pack: final delivery watcher')

    // 启动恢复挂进 effect 生命周期：dispose/HMR 时取消在途动作（signal），
    // 避免重复 apply 在会话列表就绪前多开一条 Lead 会话（2026-11-03 ⑧ 收口）。
    scoped.effect(() => {
      const controller = new AbortController()
      void ensureProductWorkspace(controller.signal)
      return () => controller.abort()
    }, 'deep-research-pack: product workspace boot')
  })
}
