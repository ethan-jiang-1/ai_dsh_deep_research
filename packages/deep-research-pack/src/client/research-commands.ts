/**
 * research-commands.ts —— Composer 原生 `/` 研究指令流（`ctx.commandUi`）。
 *
 * - `decorate('research-defaults')`：将 Host `/research-defaults` 的空调用升级为分组交互选择弹窗；
 * - `register('lens')`：8 条内置研究透镜模糊速选，选中后在 token 消费完毕时追加结构化草稿；
 * - `register('method')`：工作区方法库 + 内置打法模糊速选，选中后追加方法采用指令草稿；
 * - `register('hub')`：一键打开全局「研究工作台」。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IConversation } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CommandUiContract, SelectOption } from '@deepseek-ai/dsh-client-ui-commands/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import {
  IconBrowseOutlineRegular,
  IconInspectOutlineRegular,
  IconSkillOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { BUILTIN_PREFERENCES } from '../lib/shared/config-tables.ts'
import { BUILT_IN_LENSES } from '../lib/workspace/runs-catalog.ts'
import {
  buildLensDraftInstruction,
  buildMethodDraftInstruction,
  defaultsCommandLineForOption,
} from '../lib/events/research-references.ts'
import type { DefaultsStore } from './defaults/store.ts'
import type { HubTab } from './ResearchHubPanel.tsx'
import type { CockpitLocaleKey } from './locales/zh-cockpit.ts'
import {
  RESEARCH_CMD_DEFAULTS,
  RESEARCH_CMD_HUB,
  RESEARCH_CMD_LENS,
  RESEARCH_CMD_METHOD,
} from './keys.ts'

export interface ResearchCommandsDeps {
  readonly t: TranslateNS<'deepResearchPack'>
  readonly defaultsStore: DefaultsStore
  readonly readLibrary: (sessionId: SessionId, signal: AbortSignal) => Promise<{
    readonly state: string
    readonly entries?: readonly { readonly name: string; readonly summary?: string }[]
  }>
  readonly executeDefaultsCommand: (sessionId: SessionId, line: string) => Promise<{ readonly ok: boolean; readonly error?: string }>
  readonly openHubTab: (tab: HubTab) => void
}

function appendDraftAfterTokenConsume(ctx: ClientContext, sessionId: SessionId, prompt: string): void {
  setTimeout(() => {
    const sessions = ctx.get('sessions') as ISessions | undefined
    const conversation = ctx.get('conversation') as IConversation | undefined
    const binding = sessions?.binding(sessionId)
    if (binding === undefined || conversation === undefined) return
    try {
      conversation.input.requestDraftInitialization(binding, { prompt, whenDraftExists: 'append' })
    } catch {
      /* @silent-catch: composer session may have closed before deferred draft append */
    }
  }, 0)
}

function buildDefaultsOptions(
  t: TranslateNS<'deepResearchPack'>,
  current: { readonly effort?: string; readonly output?: { readonly shape?: string }; readonly source?: { readonly authority?: string } } | null,
): readonly SelectOption[] {
  const depthGroup = { name: 'depth', label: t('defaultsDepth') }
  const outputGroup = { name: 'output', label: t('defaultsOutput') }
  const sourceGroup = { name: 'source', label: t('defaultsAuthority') }
  const resetGroup = { name: 'reset', label: t('cmdDefaultsGroupReset') }
  const curEffort = current?.effort ?? null
  const curShape = current?.output?.shape ?? null
  const curAuth = current?.source?.authority ?? null
  return [
    { id: 'depth:quick', label: t('defaultsDepthQuick'), detail: 'effort: quick', group: depthGroup, active: curEffort === 'quick' },
    { id: 'depth:standard', label: t('defaultsDepthStandard'), detail: 'effort: standard', group: depthGroup, active: curEffort === 'standard' },
    { id: 'depth:deep', label: t('defaultsDepthDeep'), detail: 'effort: deep', group: depthGroup, active: curEffort === 'deep' },
    { id: 'depth:auto', label: t('defaultsDepthAuto'), detail: 'unset effort', group: depthGroup, active: curEffort === null },
    { id: 'output:full_report', label: t('defaultsShapeFullReport'), detail: 'full_report', group: outputGroup, active: curShape === 'full_report' },
    { id: 'output:one_page_memo', label: t('defaultsShapeOnePageMemo'), detail: 'one_page_memo', group: outputGroup, active: curShape === 'one_page_memo' },
    { id: 'output:comparison_table', label: t('defaultsShapeComparisonTable'), detail: 'comparison_table', group: outputGroup, active: curShape === 'comparison_table' },
    { id: 'output:landscape_map', label: t('defaultsShapeLandscapeMap'), detail: 'landscape_map', group: outputGroup, active: curShape === 'landscape_map' },
    { id: 'output:timeline', label: t('defaultsShapeTimeline'), detail: 'timeline', group: outputGroup, active: curShape === 'timeline' },
    { id: 'output:quick_answer', label: t('defaultsShapeQuickAnswer'), detail: 'quick_answer', group: outputGroup, active: curShape === 'quick_answer' },
    { id: 'output:auto', label: t('defaultsShapeAuto'), detail: 'unset output', group: outputGroup, active: curShape === null },
    { id: 'source:primary', label: t('defaultsAuthorityPrimary'), detail: 'primary', group: sourceGroup, active: curAuth === 'primary' },
    { id: 'source:secondary', label: t('defaultsAuthoritySecondary'), detail: 'secondary', group: sourceGroup, active: curAuth === 'secondary' },
    { id: 'source:any', label: t('defaultsAuthorityAny'), detail: 'any', group: sourceGroup, active: curAuth === 'any' },
    { id: 'reset:clear', label: t('defaultsClear'), detail: t('cmdDefaultsClearDetail'), group: resetGroup },
  ]
}

/** 惰性注入 `commandUi` 并以 `scoped.effect` 注册全部 `/` 研究指令（无 `commandUi` 的环境静默跳过）。 */
export function registerResearchCommands(ctx: ClientContext, deps: ResearchCommandsDeps): void {
  const { t, defaultsStore, readLibrary, executeDefaultsCommand, openHubTab } = deps
  ;(ctx as unknown as {
    inject(names: readonly string[], callback: (scoped: ClientContext & { readonly commandUi: CommandUiContract }) => void): void
  }).inject(['commandUi'], (scoped) => {
    scoped.effect(() => scoped.commandUi.decorate({
      name: RESEARCH_CMD_DEFAULTS,
      available: () => true,
      ui: {
        kind: 'popupSelect',
        searchMode: 'substring',
        searchLabels: () => ({
          placeholder: t('cmdDefaultsSearchPlaceholder'),
          empty: t('cmdDefaultsEmpty'),
          noResults: t('cmdNoResults'),
        }),
        options: async (session) => {
          let snap = defaultsStore.getSnapshot(session.sessionId)
          if (snap.phase === 'loading') {
            await defaultsStore.refresh(session.sessionId)
            snap = defaultsStore.getSnapshot(session.sessionId)
          }
          return buildDefaultsOptions(t, snap.phase === 'ready' ? snap.value : null)
        },
        onSelect: async (option, session) => {
          let snap = defaultsStore.getSnapshot(session.sessionId)
          if (snap.phase === 'loading') {
            await defaultsStore.refresh(session.sessionId)
            snap = defaultsStore.getSnapshot(session.sessionId)
          }
          const revision = snap.phase === 'ready' ? snap.revision : null
          const line = defaultsCommandLineForOption(option.id, revision)
          if (line === null) return
          const res = await executeDefaultsCommand(session.sessionId, line)
          if (!res.ok) throw new Error(res.error ?? 'research-defaults failed')
          void defaultsStore.refresh(session.sessionId)
        },
      },
    }), 'deep-research-pack: /research-defaults popup decoration')

    scoped.effect(() => scoped.commandUi.register({
      name: RESEARCH_CMD_LENS,
      label: () => t('cmdLensLabel'),
      description: () => t('cmdLensDesc'),
      icon: IconInspectOutlineRegular,
      available: () => true,
      ui: {
        kind: 'popupSelect',
        searchMode: 'fuzzy-label',
        searchLabels: () => ({
          placeholder: t('cmdLensSearchPlaceholder'),
          empty: t('hubLensesEmpty'),
          noResults: t('cmdNoResults'),
        }),
        options: async () => BUILT_IN_LENSES.map((lens) => {
          const name = t(`lens_${lens.id}_name` as CockpitLocaleKey)
          const when = t(`lens_${lens.id}_when` as CockpitLocaleKey)
          const bias = t(`lens_${lens.id}_bias` as CockpitLocaleKey)
          return {
            id: lens.id,
            label: name,
            badge: lens.id,
            detail: `${when} · ${t('hubLensBias')}: ${bias}`,
          }
        }),
        onSelect: (option, session) => {
          const prompt = buildLensDraftInstruction(option.id, option.label, t)
          appendDraftAfterTokenConsume(ctx, session.sessionId, prompt)
        },
      },
    }), 'deep-research-pack: /lens command')

    scoped.effect(() => scoped.commandUi.register({
      name: RESEARCH_CMD_METHOD,
      label: () => t('cmdMethodLabel'),
      description: () => t('cmdMethodDesc'),
      icon: IconSkillOutlineRegular,
      available: () => true,
      ui: {
        kind: 'popupSelect',
        searchMode: 'fuzzy-label',
        searchLabels: () => ({
          placeholder: t('cmdMethodSearchPlaceholder'),
          empty: t('noMatchingMethods'),
          noResults: t('cmdNoResults'),
        }),
        options: async (session, signal) => {
          const customGroup = { name: 'custom', label: t('cmdMethodGroupWorkspace') }
          const builtinGroup = { name: 'builtin', label: t('cmdMethodGroupBuiltin') }
          const rows: SelectOption[] = []
          try {
            const lib = await readLibrary(session.sessionId, signal)
            if (lib.state === 'ok' && Array.isArray(lib.entries)) {
              for (const entry of lib.entries) {
                rows.push({
                  id: `custom:${entry.name}`,
                  label: entry.name,
                  ...(entry.summary !== undefined && entry.summary !== '' ? { detail: entry.summary } : {}),
                  group: customGroup,
                })
              }
            }
          } catch {
            /* @silent-catch: workspace method library lookup falls back to built-in catalog */
          }
          for (const pref of BUILTIN_PREFERENCES) {
            rows.push({
              id: `builtin:${pref.name}`,
              label: pref.name,
              detail: pref.summary,
              group: builtinGroup,
            })
          }
          return rows
        },
        onSelect: (option, session) => {
          const prompt = buildMethodDraftInstruction(option.label, t)
          appendDraftAfterTokenConsume(ctx, session.sessionId, prompt)
        },
      },
    }), 'deep-research-pack: /method command')

    scoped.effect(() => scoped.commandUi.register({
      name: RESEARCH_CMD_HUB,
      label: () => t('cmdHubLabel'),
      description: () => t('cmdHubDesc'),
      icon: IconBrowseOutlineRegular,
      available: () => true,
      ui: {
        kind: 'action',
        run: () => { openHubTab('runs') },
      },
    }), 'deep-research-pack: /hub command')
  })
}
