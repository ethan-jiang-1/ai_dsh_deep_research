import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, IconSearchOutlineRegular, SegmentedTabs } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { scanRunsCatalog, type RunCatalogResult } from '../lib/workspace/runs-catalog.ts'
import type { RunSource } from '../lib/run/run-context.ts'
import { MethodLibraryView, type MethodLibraryInjected, type MethodLibraryViewProps } from './MethodLibraryView.tsx'
import { DefaultsPanel } from './defaults/DefaultsPanel.tsx'
import type { DefaultsStore } from './defaults/store.ts'
import { OrcaMark } from './BrandMark.tsx'
import { RESEARCH_TOOL_KEYS } from './keys.ts'
import { RunsView } from './research-hub/RunsView.tsx'
import { LensesView } from './research-hub/LensesView.tsx'
import css from './research-hub/hub.module.css'

type HubTab = 'runs' | 'methods' | 'lenses'

export interface ResearchHubInjected {
  readonly runSource: (sessionId: SessionId) => RunSource
  readonly methodLibrary: MethodLibraryInjected
  readonly defaultsStore?: DefaultsStore
  readonly openFinal: (sessionId: SessionId, path: string) => void
  readonly backToChat: () => void
  readonly startResearch: (prompt?: string) => void
  readonly readStoredSessionId?: () => string | null
}

export type ResearchHubPanelProps = PropsRuntime<'main'> & PropsLocale<'deepResearchPack'> & ResearchHubInjected

/** 左侧栏全局入口图标（`sidebar.panellist`）。 */
export function ResearchHubIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <IconSearchOutlineRegular size={size} />
}

/**
 * 全局「研究工作台（Research Hub）」main keyed 面板：
 * 聚合当前工作区 `drt_*` 研究档案、方法库（摆脱空白会话限制）与 8 条研究透镜。
 */
export function ResearchHubPanel(props: ResearchHubPanelProps): ReactNode {
  const { t, useSessions, runSource, methodLibrary, defaultsStore, openFinal, backToChat, startResearch, readStoredSessionId } = props
  const sessions = useSessions((state) => state)
  const storedId = readStoredSessionId?.() ?? null
  const activeSessionId: SessionId | null = (() => {
    const subagentKind = RESEARCH_TOOL_KEYS[3]
    if (storedId !== null) {
      const row = sessions.byId[storedId as SessionId]
      if (row !== undefined && row.origin !== subagentKind) return row.id
    }
    for (const id of sessions.ids) {
      const row = sessions.byId[id]
      if (row !== undefined && row.origin !== subagentKind) return row.id
    }
    return null
  })()

  const [tab, setTab] = useState<HubTab>('runs')
  const [loading, setLoading] = useState(false)
  const [catalog, setCatalog] = useState<RunCatalogResult>({ runs: [], dirErrors: [] })
  const [refreshTick, setRefreshTick] = useState(0)

  const reloadRuns = useCallback(() => {
    setRefreshTick((tick) => tick + 1)
  }, [])

  useEffect(() => {
    if (activeSessionId === null) {
      setCatalog({ runs: [], dirErrors: [] })
      setLoading(false)
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    void scanRunsCatalog(runSource(activeSessionId), controller.signal).then(
      (res) => {
        if (!controller.signal.aborted) {
          setCatalog(res)
          setLoading(false)
        }
      },
      (err) => {
        if (!controller.signal.aborted) {
          setCatalog({
            runs: [],
            dirErrors: [{ location: 'active', path: '.', error: err instanceof Error ? err.message : String(err) }],
          })
          setLoading(false)
        }
      },
    )
    return () => { controller.abort() }
  }, [activeSessionId, runSource, refreshTick])

  const tabItems: [
    { value: HubTab; label: string; id: string; panelId: string },
    ...{ value: HubTab; label: string; id: string; panelId: string }[],
  ] = [
    { value: 'runs', label: t('hubTabRuns'), id: 'hub-tab-runs', panelId: 'hub-panel-runs' },
    { value: 'methods', label: t('hubTabMethods'), id: 'hub-tab-methods', panelId: 'hub-panel-methods' },
    { value: 'lenses', label: t('hubTabLenses'), id: 'hub-tab-lenses', panelId: 'hub-panel-lenses' },
  ]

  return (
    <section className={css.root} data-testid="deep-research-hub" data-research-face="hub">
      <header className={css.header}>
        <div className={css.brandGroup}>
          <OrcaMark size={24} />
          <div className={css.titleBlock}>
            <h1 className={css.title}>{t('hubTitle')}</h1>
            <p className={css.subtitle}>{t('hubSubtitle')}</p>
          </div>
        </div>
        <div className={css.actions}>
          <Button variant="outline" size="sm" onClick={backToChat}>{t('hubBackToChat')}</Button>
          <Button variant="primary" size="sm" onClick={() => { startResearch() }}>{t('hubNewResearch')}</Button>
        </div>
      </header>

      <div className={css.tabsBar}>
        <SegmentedTabs
          items={tabItems}
          value={tab}
          onChange={setTab}
          label={t('hubTitle')}
          className={css.tabsControl}
        />
      </div>

      {tab === 'methods' ? (
        <div id="hub-panel-methods" role="tabpanel" aria-labelledby="hub-tab-methods" className={css.methodsBody}>
          {activeSessionId !== null ? (
            <MethodLibraryView
              {...({ ...props, sessionId: activeSessionId, ...methodLibrary } as unknown as MethodLibraryViewProps)}
            />
          ) : (
            <div className={css.panelBody}>
              <div className={css.emptyState}>
                <div>{t('hubMethodsNeedSession')}</div>
                <Button variant="primary" size="sm" onClick={() => { startResearch() }}>{t('hubNewResearch')}</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          id={tab === 'runs' ? 'hub-panel-runs' : 'hub-panel-lenses'}
          role="tabpanel"
          aria-labelledby={tab === 'runs' ? 'hub-tab-runs' : 'hub-tab-lenses'}
          className={css.panelBody}
        >
          {tab === 'runs' && (
            <RunsView
              hasSession={activeSessionId !== null}
              loading={loading}
              result={catalog}
              onRefresh={reloadRuns}
              onOpenFinal={(rootPath) => {
                if (activeSessionId === null) return
                openFinal(activeSessionId, `${rootPath}/final.md`)
                backToChat()
              }}
              onStartResearch={() => { startResearch() }}
              t={t}
            />
          )}
          {tab === 'lenses' && (
            <>
              <LensesView
                onDraftWithLens={(prompt) => { startResearch(prompt) }}
                t={t}
              />
              {activeSessionId !== null && defaultsStore !== undefined && (
                <section className={css.defaultsSection} data-testid="hub-lenses-defaults">
                  <h2 className={css.defaultsTitle}>{t('hubDefaultsSectionTitle')}</h2>
                  <DefaultsPanel sessionId={activeSessionId} store={defaultsStore} t={t} />
                </section>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
