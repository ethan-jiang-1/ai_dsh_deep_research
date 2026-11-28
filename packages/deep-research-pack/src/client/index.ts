/**
 * 浏览器半 = **研究驾驶舱（Research Cockpit）** —— 观察面 client 套件的唯一装配入口。
 *
 * 数据通道 = `remote.session.follow` + `remote.workspaceFiles` + Host `researchRun` / `agentTeam` 投影。
 * 分层纪律：纯折算住纯函数层；组件薄渲染；本文件只做 `scoped.effect` 登记与装配。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { DraftInitializationOptions } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { en, zh, type DeepResearchPackLocaleKey } from './locales.ts'
import {
  RESEARCH_TAB_KEY, RESEARCH_CONFIG_TAB_KEY, RESEARCH_STATUS_TAB_KIND, RESEARCH_CONFIG_TAB_KIND,
  RESEARCH_GRAPH_TAB_KEY, RESEARCH_GRAPH_TAB_KIND,
  RESEARCH_FINAL_TAB_KEY, RESEARCH_FINAL_KIND, RESEARCH_FINAL_PATTERN,
  RESEARCH_FINAL_PATTERN_LEDGER, RESEARCH_FINAL_PATTERN_READER,
  RESEARCH_EVIDENCE_TAB_KEY, RESEARCH_EVIDENCE_KIND, RESEARCH_EVIDENCE_PATTERN,
  RESEARCH_PANE_SLOT, RESEARCH_TITLE_SLOT, RESEARCH_TOOLVIEW_SLOT, RESEARCH_TOOL_KEYS, METHOD_LIBRARY_TOOL, METHOD_LIBRARY_REMOVE, METHOD_LIBRARY_DEFAULT,
  RESEARCH_BRAND_MARK_SLOT, RESEARCH_BRAND_NAME_SLOT, RESEARCH_HERO_BRAND_MARK_SLOT, RESEARCH_START_DOCK_SLOT,
  METHOD_COACH_PORTAL, METHOD_COACH_PORTAL_ID, METHOD_COACH_CHAT,
  RESEARCH_DEFAULTS_SLOT, RESEARCH_DEFAULTS_BUTTON_ID,
  RESEARCH_HEADER_PILL_SLOT, RESEARCH_HEADER_PILL_ID,
  RESEARCH_TURN_TAIL_SLOT, RESEARCH_TURN_TAIL_ID,
  RESEARCH_HUB_MAIN_SLOT, RESEARCH_HUB_PANEL_SLOT, RESEARCH_HUB_PANEL_ID,
  RESEARCH_TAB_MENU_ITEM_SLOT, RESEARCH_TAB_MENU_HUB_ID,
  RESEARCH_SESSION_ROW_LEADING_SLOT, RESEARCH_SESSION_ROW_LEADING_ID,
  RESEARCH_SESSION_ROW_HOVER_SLOT, RESEARCH_SESSION_ROW_HOVER_ID,
  RESEARCH_SESSION_MENU_ITEM_SLOT, RESEARCH_SESSION_MENU_OPEN_FINAL_ID,
  RESEARCH_HERO_OPTIONS_SLOT, RESEARCH_HERO_OPTIONS_ID,
  RESEARCH_USER_TEXT_NODE_SLOT, RESEARCH_USER_TEXT_NODE_KEY,
} from './keys.ts'
import { IconBranchOutlineRegular, IconGaugeOutlineRegular, IconSettingsOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { ResearchToolCard } from './ResearchToolCard.tsx'
import { MethodLibraryToolCard } from './MethodLibraryToolCard.tsx'
import { ResearchStatusTab, ResearchStatusTitle } from './ResearchStatusTab.tsx'
import { ResearchConfigTab } from './ResearchConfigTab.tsx'
import { MethodCoachPortal, CoachChat } from './method-library/coach.tsx'
import { ResearchGraphTab } from './ResearchGraphTab.tsx'
import { ResearchFinalTab } from './ResearchFinalTab.tsx'
import { ResearchEvidenceTab } from './ResearchEvidenceTab.tsx'
import { ResearchTabMenuItem } from './ResearchTabMenuItem.tsx'
import {
  ResearchSessionHover,
  ResearchSessionLeading,
  ResearchSessionOpenFinalMenuItem,
} from './ResearchSessionRow.tsx'
import { HeroResearchOptions } from './HeroResearchOptions.tsx'
import { registerResearchCommands } from './research-commands.ts'
import { ResearchRefChip, registerResearchTriggers, researchReferenceRule } from './research-triggers.tsx'
import { registerResearchShortcuts } from './research-shortcuts.ts'
import { browserRunSource } from './run-source-browser.ts'
import { OrcaMark, OrcaName } from './BrandMark.tsx'
import { createFollow, hasUserMessage, watchCoach } from './session-follow.ts'
import { createSessionStreamStore } from './session-stream-store.ts'
import { ResearchHeaderPill } from './ResearchHeaderPill.tsx'
import { researchTurnDefinition } from './research-turn.ts'
import { ResearchMilestoneCard } from './ResearchMilestoneCard.tsx'
import { createWorkspaceBoot, type SessionsLike, type UiWorkspaceLike, type WorkspacesLike } from './workspace-boot.ts'
import { installMethodCoachPortalStyles, installMethodLibrarySelectionStyles, installQuestionCardNarrowFix } from './styles.ts'
import { createWorkspaceFiles } from './workspace-files.ts'
import { createCoachSessions } from './coach-sessions.ts'
import { watchDelivery } from './delivery-watch.ts'
import { createLeadPrompt } from './lead-prompt.ts'
import { StartCard, type StartCardInjected } from './StartCard.tsx'
import { DefaultsButton, type DefaultsButtonInjected } from './defaults/DefaultsButton.tsx'
import { createDefaultsStore } from './defaults/store.ts'
import { ResearchHubIcon, ResearchHubPanel, type HubTab } from './ResearchHubPanel.tsx'
import {
  CURRENT_SESSION_KEY, PRODUCT_WORKSPACE_KEY,
  buildStartResearchOptions, pickStartWorkspaceId, readCurrentSessionId,
} from './startup.ts'
import { createRightbarNav, type WorkspaceNavLike } from './rightbar-nav.ts'
import { isFinalAddress } from '../lib/run/final-target.ts'
import { interpretDefaultsCommandResult } from '../lib/events/research-references.ts'
import { isEvidenceAddress } from '../lib/run/evidence-card.ts'
import { foldLibrary } from '../lib/method-library/library-fold.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    deepResearchPack: DeepResearchPackLocaleKey
  }
}

export const inject = ['slots', 'layout', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.session', 'remote.workspaceFiles', 'remote.commands', 'sessions', 'workspaces', 'uiWorkspace', 'uiConversation', 'locale']

/** Client plugin body：全量以 `scoped.effect` 注册驾驶舱页签、槽位、工具卡与监听器。 */
export function apply(ctx: ClientContext): void {
  ctx.inject(['slots', 'layout', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.session', 'remote.workspaceFiles', 'remote.commands', 'sessions', 'workspaces', 'uiWorkspace', 'uiConversation', 'locale'], (scoped) => {
    const disposeDictionaries = scoped.locale.register('deepResearchPack', { zh, en })
    scoped.effect(() => disposeDictionaries, 'deep-research-pack: dictionaries')
    const t = scoped.locale.bind('deepResearchPack')

    const layout = scoped.layout
    const remoteSession = scoped.remote.session
    const rawFollow = createFollow({ session: { follow: (input, signal) => remoteSession.follow({ address: input.address as never }, signal) } })
    const streamStore = createSessionStreamStore(rawFollow)
    const follow = streamStore.follow
    scoped.effect(() => () => streamStore.dispose(), 'deep-research-pack: session stream store')

    const boot = createWorkspaceBoot({
      workspaces: scoped.workspaces as unknown as WorkspacesLike,
      sessions: scoped.sessions as unknown as SessionsLike,
      uiWorkspace: (scoped as unknown as { uiWorkspace: UiWorkspaceLike }).uiWorkspace,
      storage: localStorage,
    })
    const { chooseWorkspace, ensureProductWorkspace, workspaceOf } = boot
    const workspaceFiles = scoped.remote.workspaceFiles
    const { listDir, readLibrary, readPreview, readText: readFile } = createWorkspaceFiles(workspaceFiles as never)

    const defaultsStore = createDefaultsStore({
      readText: readFile,
      listDir,
      readLibrary,
      execute: async (sessionId, line) => {
        const result = await scoped.remote.commands.execute(sessionId, line, [])
        if (!result.ok) return result
        if (result.value === undefined) return { ok: false, error: 'command returned no execution' }
        return { ok: true, value: result.value }
      },
    })
    scoped.effect(() => () => defaultsStore.dispose(), 'deep-research-pack: project defaults store')

    const { sendInstruction } = createLeadPrompt({ prompt: (input, signal) => remoteSession.prompt(input as never, signal) }, t)
    const { ensureCoachSession, sendCoach, migrateKnownCoachTitles } = createCoachSessions(
      scoped as unknown as { get(name: string): unknown },
      {
        rename: (input) => remoteSession.rename(input),
        prompt: (input, signal) => remoteSession.prompt(input as never, signal),
      },
      t,
    )
    scoped.effect(() => scoped.locale.subscribe(() => { void migrateKnownCoachTitles() }), 'deep-research-pack: method-editor title locale sync')

    // ── 右栏页签类型注册 ──
    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_TAB_KEY,
      kind: RESEARCH_STATUS_TAB_KIND,
      priority: 'extension',
      title: () => t('tabStatus'),
      guide: [{ id: RESEARCH_TAB_KEY, order: 1, title: () => t('tabStatus'), description: () => t('tabStatusGuide'), icon: IconGaugeOutlineRegular }],
    }), 'deep-research-pack: research-status tab type')

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_CONFIG_TAB_KEY,
      kind: RESEARCH_CONFIG_TAB_KIND,
      priority: 'extension',
      title: () => t('tabConfig'),
      guide: [{ id: RESEARCH_CONFIG_TAB_KEY, order: 2, title: () => t('tabConfig'), description: () => t('tabConfigGuide'), icon: IconSettingsOutlineRegular }],
    }), 'deep-research-pack: research-config tab type')

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_GRAPH_TAB_KEY,
      kind: RESEARCH_GRAPH_TAB_KIND,
      priority: 'extension',
      title: () => t('tabGraph'),
      guide: [{ id: RESEARCH_GRAPH_TAB_KEY, order: 3, title: () => t('tabGraph'), description: () => t('tabGraphGuide'), icon: IconBranchOutlineRegular }],
    }), 'deep-research-pack: research-graph tab type')

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_FINAL_TAB_KEY,
      kind: RESEARCH_FINAL_KIND,
      patterns: [RESEARCH_FINAL_PATTERN, RESEARCH_FINAL_PATTERN_LEDGER, RESEARCH_FINAL_PATTERN_READER],
      priority: 'extension',
      canOpen: isFinalAddress,
      title: () => t('tabFinal'),
    }), 'deep-research-pack: research-final tab type')

    scoped.effect(() => scoped.sidebarRightTabs.register({
      id: RESEARCH_EVIDENCE_TAB_KEY,
      kind: RESEARCH_EVIDENCE_KIND,
      patterns: [RESEARCH_EVIDENCE_PATTERN],
      priority: 'extension',
      canOpen: isEvidenceAddress,
      title: () => t('tabEvidence'),
    }), 'deep-research-pack: research-evidence tab type')

    // ── 样式补丁（严格有界、零主输入框隐藏 hack） ──
    scoped.effect(() => installQuestionCardNarrowFix(), 'deep-research-pack: question card narrow-column fix')
    scoped.effect(() => installMethodCoachPortalStyles(), 'deep-research-pack: method-coach portal focus styles')
    scoped.effect(() => installMethodLibrarySelectionStyles(), 'deep-research-pack: method-library row states')

    // ── 品牌槽（Orca） ──
    scoped.effect(() => scoped.slots.inject(RESEARCH_BRAND_MARK_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_BRAND_MARK_SLOT, priority: -1 }, OrcaMark),
    ]), 'deep-research-pack: orca brand mark')
    scoped.effect(() => scoped.slots.inject(RESEARCH_BRAND_NAME_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_BRAND_NAME_SLOT, priority: -1, locale: 'deepResearchPack' }, OrcaName),
    ]), 'deep-research-pack: orca brand name')
    scoped.effect(() => scoped.slots.inject(RESEARCH_HERO_BRAND_MARK_SLOT, () => [
      scoped.slots.register({ name: RESEARCH_HERO_BRAND_MARK_SLOT, priority: -1 }, OrcaMark),
    ]), 'deep-research-pack: orca hero brand mark')

    // ── 导航与资源打开闭包 ──
    const runSource = (sessionId: SessionId) => browserRunSource(workspaceFiles, sessionId, workspaceOf(sessionId)?.path)
    const backToChat = () => { layout.selectPanel(null) }
    const uiWorkspaceNav = (scoped as unknown as { uiWorkspace: WorkspaceNavLike }).uiWorkspace
    const {
      openFinal, openEvidence, openSession, openMember,
      revealStatusTab, revealGraphTab, openSessionFinal, toggleRightFullscreen, dispose: disposeRightbarNav,
    } = createRightbarNav(scoped.sidebarRight, uiWorkspaceNav, backToChat)
    scoped.effect(() => disposeRightbarNav, 'deep-research-pack: pending rightbar navigation cleanup')

    let pendingHubTab: HubTab | null = null
    const hubTabListeners = new Set<() => void>()
    const requestedHubTab = {
      get: (): HubTab | null => pendingHubTab,
      clear: (): void => { pendingHubTab = null },
      subscribe: (listener: () => void): (() => void) => {
        hubTabListeners.add(listener)
        return () => { hubTabListeners.delete(listener) }
      },
    }
    const HUB_PANEL_ID = RESEARCH_HUB_PANEL_ID as MainPanelId
    const openHubTab = (tab: HubTab) => {
      pendingHubTab = tab
      for (const listener of hubTabListeners) listener()
      layout.selectPanel(HUB_PANEL_ID)
    }
    const openMethodLibrary = () => { openHubTab('methods') }

    const startResearch = (prompt?: string) => {
      const uiWs = (scoped as unknown as {
        uiWorkspace: UiWorkspaceLike & {
          startSession(workspaceId?: string, options?: DraftInitializationOptions & { readonly agentPreset?: string }): void
        }
      }).uiWorkspace
      const snap = (scoped.workspaces as unknown as WorkspacesLike).list.getSnapshot()
      const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem(PRODUCT_WORKSPACE_KEY) : null
      const activeSid = scoped.sidebarRight.mounted.getSnapshot()
        ?? (readCurrentSessionId(typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_SESSION_KEY) : null) as SessionId | null)
      const activePath = activeSid ? workspaceOf(activeSid)?.path : undefined
      const currentWsId = activePath !== undefined
        ? snap.items.find((item) => item.path === activePath)?.workspaceId
        : undefined
      backToChat()
      uiWs.startSession(pickStartWorkspaceId(snap.items, currentWsId, savedId), buildStartResearchOptions(prompt))
    }

    // ── Composer / 首屏 / 左栏会话行槽位 ──
    scoped.effect(() => scoped.slots.inject(RESEARCH_DEFAULTS_SLOT, () => scoped.slots.register({
      name: RESEARCH_DEFAULTS_SLOT,
      id: RESEARCH_DEFAULTS_BUTTON_ID,
      order: 20,
      locale: 'deepResearchPack',
      inject: (sessionId: SessionId): DefaultsButtonInjected => ({
        sessionId,
        store: defaultsStore,
        openConfig: () => scoped.sidebarRight.openTab(RESEARCH_CONFIG_TAB_KIND),
      }),
    }, DefaultsButton)), 'deep-research-pack: project defaults button')

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
          listDir: async (targetSessionId, path, signal) => (await listDir(targetSessionId, path, signal)) ?? [],
          hasUserMessage: (targetSessionId: SessionId) => hasUserMessage(follow, targetSessionId),
          chooseWorkspace,
          openSession,
          openSessionFinal,
          openHub: () => { openHubTab('runs') },
        }
      },
    }, StartCard)), 'deep-research-pack: start card')

    scoped.effect(() => scoped.slots.inject(RESEARCH_HERO_OPTIONS_SLOT, () => scoped.slots.register({
      name: RESEARCH_HERO_OPTIONS_SLOT,
      id: RESEARCH_HERO_OPTIONS_ID,
      order: 10,
      locale: 'deepResearchPack',
      inject: () => ({ openHubTab }),
    }, HeroResearchOptions)), 'deep-research-pack: hero quick options')

    scoped.effect(() => scoped.slots.inject(RESEARCH_SESSION_ROW_LEADING_SLOT, () => scoped.slots.register({
      name: RESEARCH_SESSION_ROW_LEADING_SLOT,
      id: RESEARCH_SESSION_ROW_LEADING_ID,
      order: 10,
      locale: 'deepResearchPack',
    }, ResearchSessionLeading)), 'deep-research-pack: session row leading status')

    scoped.effect(() => scoped.slots.inject(RESEARCH_SESSION_ROW_HOVER_SLOT, () => scoped.slots.register({
      name: RESEARCH_SESSION_ROW_HOVER_SLOT,
      id: RESEARCH_SESSION_ROW_HOVER_ID,
      order: 10,
      locale: 'deepResearchPack',
    }, ResearchSessionHover)), 'deep-research-pack: session row hover summary')

    scoped.effect(() => scoped.slots.inject(RESEARCH_SESSION_MENU_ITEM_SLOT, () => scoped.slots.register({
      name: RESEARCH_SESSION_MENU_ITEM_SLOT,
      id: RESEARCH_SESSION_MENU_OPEN_FINAL_ID,
      order: 150,
      locale: 'deepResearchPack',
      inject: () => ({ openSessionFinal }),
    }, ResearchSessionOpenFinalMenuItem)), 'deep-research-pack: session menu open final')

    // ── 右栏页签体与活标题 ──
    scoped.effect(() => scoped.slots.inject(RESEARCH_PANE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ follow, runSource, revealStatusTab, openFinal, openEvidence, openMember }) },
        ResearchStatusTab,
      ),
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_CONFIG_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ readFile, readLibrary, listDir, follow, runSource, sendInstruction, defaults: defaultsStore, openMethodLibrary }) },
        ResearchConfigTab,
      ),
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_GRAPH_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ runSource, follow, openOwner: openMember, toggleFullscreen: toggleRightFullscreen }) },
        ResearchGraphTab,
      ),
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_FINAL_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ runSource, toggleFullscreen: toggleRightFullscreen }) },
        ResearchFinalTab,
      ),
      scoped.slots.register(
        { name: RESEARCH_PANE_SLOT, key: RESEARCH_EVIDENCE_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ runSource }) },
        ResearchEvidenceTab,
      ),
    ]), 'deep-research-pack: research-pane tabs')

    scoped.effect(() => scoped.slots.inject(RESEARCH_TITLE_SLOT, () => [
      scoped.slots.register(
        { name: RESEARCH_TITLE_SLOT, key: RESEARCH_TAB_KEY, locale: 'deepResearchPack', inject: () => ({ follow }) },
        ResearchStatusTitle,
      ),
    ]), 'deep-research-pack: research-status live title')

    // ── 全局「研究工作台（Research Hub）」与 Method Editor Portal ──
    const methodLibrary = {
      readLibrary,
      ensureCoach: ensureCoachSession,
      sendCoach,
      watchCoach: (sessionId: SessionId, signal: AbortSignal, onEvent: Parameters<typeof watchCoach>[3], onReady: () => void) =>
        watchCoach(follow, sessionId, signal, onEvent, onReady),
      listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => listDir(sessionId, path, signal),
      readPreview: (sessionId: SessionId, path: string, signal: AbortSignal) => readPreview(sessionId, path, signal),
    }

    scoped.effect(() => scoped.slots.inject(RESEARCH_HUB_PANEL_SLOT, () => scoped.slots.register({
      name: RESEARCH_HUB_PANEL_SLOT,
      id: RESEARCH_HUB_PANEL_ID,
      order: 15,
      locale: 'deepResearchPack',
      label: () => t('hubPanelLabel'),
    }, ResearchHubIcon)), 'deep-research-pack: research hub sidebar entry')

    scoped.effect(() => scoped.slots.inject(RESEARCH_HUB_MAIN_SLOT, () => scoped.slots.register({
      name: RESEARCH_HUB_MAIN_SLOT,
      key: RESEARCH_HUB_PANEL_ID,
      locale: 'deepResearchPack',
      inject: () => ({
        runSource,
        methodLibrary,
        defaultsStore,
        requestedTab: requestedHubTab,
        openSession,
        openStatus: revealStatusTab,
        openFinal,
        backToChat,
        startResearch,
        readStoredSessionId: () => readCurrentSessionId(localStorage.getItem(CURRENT_SESSION_KEY)),
      }),
    }, ResearchHubPanel)), 'deep-research-pack: research hub main panel')

    scoped.effect(() => scoped.slots.inject(RESEARCH_TAB_MENU_ITEM_SLOT, () => scoped.slots.register({
      name: RESEARCH_TAB_MENU_ITEM_SLOT,
      id: RESEARCH_TAB_MENU_HUB_ID,
      order: 20,
      locale: 'deepResearchPack',
      inject: () => ({ openHub: () => { layout.selectPanel(HUB_PANEL_ID) } }),
    }, ResearchTabMenuItem)), 'deep-research-pack: right-tab menu open-hub item')

    scoped.effect(() => scoped.slots.inject(METHOD_COACH_PORTAL, () => scoped.slots.register({
      name: METHOD_COACH_PORTAL,
      id: METHOD_COACH_PORTAL_ID,
      order: 100,
      children: { [METHOD_COACH_CHAT]: { kind: 'single', scope: 'session' } },
    }, MethodCoachPortal)), 'deep-research-pack: method-coach portal')
    scoped.effect(() => scoped.slots.inject(METHOD_COACH_CHAT, () => scoped.slots.register({
      name: METHOD_COACH_CHAT,
    }, CoachChat)), 'deep-research-pack: method-coach chat slot')

    // ── 工具卡、顶栏胶囊、回合里程碑与交付监听 ──
    for (const key of [METHOD_LIBRARY_TOOL, METHOD_LIBRARY_REMOVE, METHOD_LIBRARY_DEFAULT]) {
      scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
        scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key, priority: -1, locale: 'deepResearchPack' }, MethodLibraryToolCard)), `deep-research-pack: toolview ${key}`)
    }
    for (const key of RESEARCH_TOOL_KEYS) {
      scoped.effect(() => scoped.slots.inject(RESEARCH_TOOLVIEW_SLOT, () =>
        scoped.slots.register({ name: RESEARCH_TOOLVIEW_SLOT, key, priority: -1, locale: 'deepResearchPack', inject: () => ({ openMember }) }, ResearchToolCard)), `deep-research-pack: toolview ${key}`)
    }

    scoped.effect(() => scoped.uiConversation.userText.register(researchReferenceRule), 'deep-research-pack: user-text research ref rule')
    scoped.effect(() => scoped.slots.inject(RESEARCH_USER_TEXT_NODE_SLOT, () => scoped.slots.register({
      name: RESEARCH_USER_TEXT_NODE_SLOT,
      key: RESEARCH_USER_TEXT_NODE_KEY,
      priority: 90,
      locale: 'deepResearchPack',
      inject: () => ({ openEvidence, openGraph: revealGraphTab }),
    }, ResearchRefChip)), 'deep-research-pack: user-text research ref chip')

    registerResearchCommands(ctx, {
      t, defaultsStore, openHubTab,
      readLibrary: async (sessionId, signal) => {
        const res = await readLibrary(sessionId, 'method-library.md', signal)
        if (res.kind !== 'ok') return { state: res.kind }
        return {
          state: 'ok',
          entries: foldLibrary(res.text).map((entry) => ({
            name: entry.name,
            summary: (entry.sections.source ?? entry.sections.report ?? entry.legacyText ?? '').slice(0, 80),
          })),
        }
      },
      executeDefaultsCommand: async (sessionId, line) => interpretDefaultsCommandResult(
        await scoped.remote.commands.execute(sessionId, line, []),
      ),
    })
    registerResearchTriggers(ctx, { t, runSource, openEvidence, openGraph: revealGraphTab })
    registerResearchShortcuts(ctx, {
      t, openStatus: () => { revealStatusTab() }, openGraph: () => { revealGraphTab() }, openHub: () => { openHubTab('runs') },
      hasActiveSession: () => scoped.sidebarRight.mounted.getSnapshot() !== undefined,
    })

    scoped.effect(() => scoped.slots.inject(RESEARCH_HEADER_PILL_SLOT, () => scoped.slots.register({
      name: RESEARCH_HEADER_PILL_SLOT,
      id: RESEARCH_HEADER_PILL_ID,
      order: 15,
      locale: 'deepResearchPack',
      inject: () => ({ follow, openStatus: revealStatusTab, openFinal, runSource }),
    }, ResearchHeaderPill)), 'deep-research-pack: research header pill')

    scoped.effect(() => scoped.uiConversation.events.register(researchTurnDefinition), 'deep-research-pack: milestone turn definition')

    scoped.effect(() => scoped.slots.inject(RESEARCH_TURN_TAIL_SLOT, () => scoped.slots.register({
      name: RESEARCH_TURN_TAIL_SLOT,
      id: RESEARCH_TURN_TAIL_ID,
      order: 20,
      locale: 'deepResearchPack',
      inject: () => ({ openStatus: revealStatusTab, openFinal }),
    }, ResearchMilestoneCard)), 'deep-research-pack: turn tail milestone card')

    scoped.effect(() => watchDelivery({
      follow,
      openFinal,
      mounted: scoped.sidebarRight.mounted,
      cwdOf: (sessionId) => workspaceOf(sessionId)?.path,
    }), 'deep-research-pack: final delivery watcher')

    scoped.effect(() => {
      const controller = new AbortController()
      void ensureProductWorkspace(controller.signal)
      return () => controller.abort()
    }, 'deep-research-pack: product workspace boot')
  })
}
