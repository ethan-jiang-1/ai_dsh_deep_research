/**
 * research-shortcuts.ts —— 跨平台研究工作台快捷键注册（`ctx.shortcuts`）。
 *
 * 全部默认键经 DSH `isWebBindingAllowed` 与内置键表防冲突核对：
 * - `deepResearch.status`：`Primary+Shift+U`（打开「研究状态」页签）
 * - `deepResearch.graph`：`Primary+Shift+G`（打开「研究图谱」页签）
 * - `deepResearch.hub`：`Primary+Shift+D`（切换全局「研究工作台」面板）
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ShortcutBinding, ShortcutCommandId, Shortcuts } from '@deepseek-ai/dsh-client-shortcuts/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import {
  RESEARCH_SHORTCUT_GRAPH,
  RESEARCH_SHORTCUT_HUB,
  RESEARCH_SHORTCUT_STATUS,
} from './keys.ts'

export interface ResearchShortcutsDeps {
  readonly t: TranslateNS<'deepResearchPack'>
  readonly openStatus: () => void
  readonly openGraph: () => void
  readonly openHub: () => void
  readonly hasActiveSession: () => boolean
}

function defaultProfiles(code: string): Readonly<Record<string, ShortcutBinding>> {
  const binding: ShortcutBinding = { code, modifiers: ['primary', 'shift'] }
  // 注：DSH 上游 `isWebBindingAllowed` 仅在 web:macos/windows 放行 Primary+Shift+<Key>，
  // `web:linux` 仅白名单 Slash/Comma/Period，故不注册 `web:linux` 以免触发 unsupported-browser。
  return {
    'desktop:macos': binding,
    'desktop:windows': binding,
    'desktop:linux': binding,
    'web:macos': binding,
    'web:windows': binding,
  }
}

/** 惰性注入 `shortcuts` 并以 `scoped.effect` 注册三条无冲突研究快捷键。 */
export function registerResearchShortcuts(ctx: ClientContext, deps: ResearchShortcutsDeps): void {
  const { t, openStatus, openGraph, openHub, hasActiveSession } = deps
  ;(ctx as unknown as {
    inject(names: readonly string[], callback: (scoped: ClientContext & { readonly shortcuts: Shortcuts }) => void): void
  }).inject(['shortcuts'], (scoped) => {
    scoped.effect(() => scoped.shortcuts.register({
      id: RESEARCH_SHORTCUT_STATUS as ShortcutCommandId,
      label: () => t('shortcutOpenStatus'),
      aliases: ['research status', 'deep research status'],
      defaults: defaultProfiles('KeyU'),
      regions: ['page', 'editable'],
      modals: [],
      resolve: () => {
        if (!hasActiveSession()) return { status: 'blocked', reason: t('shortcutNoSession') }
        return { status: 'handled', run: openStatus }
      },
    }), 'deep-research-pack: shortcut open research status')

    scoped.effect(() => scoped.shortcuts.register({
      id: RESEARCH_SHORTCUT_GRAPH as ShortcutCommandId,
      label: () => t('shortcutOpenGraph'),
      aliases: ['research graph', 'dag'],
      defaults: defaultProfiles('KeyG'),
      regions: ['page', 'editable'],
      modals: [],
      resolve: () => {
        if (!hasActiveSession()) return { status: 'blocked', reason: t('shortcutNoSession') }
        return { status: 'handled', run: openGraph }
      },
    }), 'deep-research-pack: shortcut open research graph')

    scoped.effect(() => scoped.shortcuts.register({
      id: RESEARCH_SHORTCUT_HUB as ShortcutCommandId,
      label: () => t('shortcutOpenHub'),
      aliases: ['research hub', 'research workbench'],
      defaults: defaultProfiles('KeyD'),
      regions: ['page', 'editable'],
      modals: [],
      resolve: () => ({ status: 'handled', run: openHub }),
    }), 'deep-research-pack: shortcut open research hub')
  })
}
