import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, IconSearchOutlineRegular, Input, Pill, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import {
  filterRunsCatalog,
  preferredFinalPathOf,
  type RunCatalogEntry,
  type RunCatalogResult,
  type RunLocation,
} from '../../lib/workspace/runs-catalog.ts'
import css from './hub.module.css'

type LocationFilter = 'all' | RunLocation

export interface RunsViewProps extends PropsLocale<'deepResearchPack'> {
  readonly hasSession: boolean
  readonly loading: boolean
  readonly result: RunCatalogResult
  readonly onRefresh: () => void
  readonly onOpenFinal: (finalPath: string) => void
  readonly onStartResearch: () => void
}

function statusLabelOf(status: RunCatalogEntry['status'], t: PropsLocale<'deepResearchPack'>['t']): string {
  switch (status) {
    case 'delivered': return t('hubStatusDelivered')
    case 'reviewed_pass': return t('hubStatusPass')
    case 'reviewed_fail': return t('hubStatusFail')
    case 'reviewed_conflict': return t('hubStatusConflict')
    case 'archived': return t('hubStatusArchived')
    case 'abandoned': return t('hubStatusAbandoned')
    case 'unreadable': return t('hubStatusUnreadable')
    case 'in_progress': return t('hubStatusActive')
  }
}

function statusToneOf(status: RunCatalogEntry['status']): 'success' | 'danger' | 'warning' | 'neutral' {
  switch (status) {
    case 'delivered':
    case 'reviewed_pass':
      return 'success'
    case 'reviewed_fail':
    case 'unreadable':
      return 'danger'
    case 'reviewed_conflict':
      return 'warning'
    case 'archived':
    case 'abandoned':
    case 'in_progress':
      return 'neutral'
  }
}

/** 工作区 `drt_*` 研究档案列表视图（三位置聚合：当前 / archive / _abandoned）。 */
export function RunsView({
  hasSession,
  loading,
  result,
  onRefresh,
  onOpenFinal,
  onStartResearch,
  t,
}: RunsViewProps): ReactNode {
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('all')
  const [copyFeedback, setCopyFeedback] = useState<{ readonly path: string; readonly state: 'copied' | 'failed' } | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
  }, [])

  if (!hasSession) {
    return (
      <div className={css.emptyState}>
        <div>{t('hubNoSession')}</div>
        <Button variant="primary" size="sm" onClick={onStartResearch}>{t('hubNewResearch')}</Button>
      </div>
    )
  }

  const visible = filterRunsCatalog(result.runs, query, locationFilter)

  const setTimedFeedback = (path: string, state: 'copied' | 'failed') => {
    if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current)
    setCopyFeedback({ path, state })
    copyTimerRef.current = setTimeout(() => {
      setCopyFeedback((current) => (current?.path === path && current.state === state ? null : current))
      copyTimerRef.current = null
    }, 2000)
  }

  const copyPath = (rootPath: string) => {
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
    if (clipboard === undefined || typeof clipboard.writeText !== 'function') {
      setTimedFeedback(rootPath, 'failed')
      return
    }
    void clipboard.writeText(rootPath).then(
      () => { setTimedFeedback(rootPath, 'copied') },
      () => { setTimedFeedback(rootPath, 'failed') },
    )
  }

  const filterOptions: readonly { readonly id: LocationFilter; readonly label: string }[] = [
    { id: 'all', label: t('hubFilterAll') },
    { id: 'active', label: t('hubFilterActive') },
    { id: 'archive', label: t('hubFilterArchive') },
    { id: 'abandoned', label: t('hubFilterAbandoned') },
  ]

  return (
    <div>
      <div className={css.toolbar}>
        <div className={css.searchWrap}>
          <Input
            className={css.searchInput ?? ''}
            icon={<IconSearchOutlineRegular size={14} />}
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder={t('hubSearchRuns')}
            aria-label={t('hubSearchRuns')}
          />
        </div>
        <div className={css.filterRow}>
          {filterOptions.map((opt) => (
            <Pill
              key={opt.id}
              active={locationFilter === opt.id}
              onClick={() => { setLocationFilter(opt.id) }}
            >
              {opt.label}
            </Pill>
          ))}
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {t('hubRefresh')}
          </Button>
        </div>
      </div>

      {result.dirErrors.map((err) => (
        <div key={`${err.location}:${err.path}`} className={css.errorBox}>
          {t('hubDirError', { path: err.path, error: err.error })}
        </div>
      ))}

      {loading && result.runs.length === 0 && (
        <div className={css.emptyState}>{t('hubRunsLoading')}</div>
      )}

      {!loading && visible.length === 0 && (
        <div className={css.emptyState}>{t('hubRunsEmpty')}</div>
      )}

      {visible.length > 0 && (
        <div className={css.grid}>
          {visible.map((run) => {
            const finalPath = preferredFinalPathOf(run)
            const copyState = copyFeedback?.path === run.rootPath ? copyFeedback.state : 'idle'
            return (
              <article key={run.rootPath} className={css.card}>
                <div className={css.cardTop}>
                  <div className={css.cardTitle}>{run.title}</div>
                  <Tag tone={statusToneOf(run.status)}>{statusLabelOf(run.status, t)}</Tag>
                </div>
                <div className={css.cardPath}>{run.rootPath}</div>
                <div className={css.badgeRow}>
                  <Tag tone={run.evidenceCount === null ? 'danger' : 'neutral'}>
                    {run.evidenceCount === null
                      ? t('hubEvidenceUnknown')
                      : t('hubEvidenceBadge', { count: String(run.evidenceCount) })}
                  </Tag>
                  {run.latestReaderVersion !== null && (
                    <Tag tone="success">{t('hubReaderBadge', { version: String(run.latestReaderVersion) })}</Tag>
                  )}
                  {run.latestFinalVersion !== null && (
                    <Tag tone="neutral">{t('hubVersionBadge', { version: String(run.latestFinalVersion) })}</Tag>
                  )}
                </div>
                {run.error !== undefined && (
                  <div className={css.errorBox}>{run.error}</div>
                )}
                <div className={css.cardFooter}>
                  {finalPath !== null && (
                    <Button variant="primary" size="sm" onClick={() => { onOpenFinal(finalPath) }}>
                      {t('hubOpenFinal')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    data-copy-state={copyState}
                    onClick={() => { copyPath(run.rootPath) }}
                  >
                    {copyState === 'copied' ? t('hubCopied') : copyState === 'failed' ? t('hubCopyFailed') : t('hubCopyPath')}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
