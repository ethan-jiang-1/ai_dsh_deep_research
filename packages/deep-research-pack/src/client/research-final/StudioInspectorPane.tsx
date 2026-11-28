/**
 * StudioInspectorPane.tsx —— 全屏三栏精读台右侧常驻对照栏（证据卡速览 / Critic 核查清单）。
 */
import type { ReactNode } from 'react'
import { Button, LinkIconMedium, SegmentedControl, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClaimsAuditSummary } from '../../lib/run/claims-verdicts.ts'
import type { EvidencePreviewEntry } from '../../lib/run/evidence-preview.ts'
import type { CockpitLocaleKey } from '../locales/zh-cockpit.ts'
import { ClaimsAuditView } from './ClaimsAuditView.tsx'
import css from '../ResearchFinalTab.module.css'

export type StudioInspectorTab = 'claims' | 'evidence'

export interface StudioInspectorPaneProps {
  readonly mode: StudioInspectorTab
  readonly onChangeMode: (next: StudioInspectorTab) => void
  readonly claimsSummary: ClaimsAuditSummary | null
  readonly inspectedRelPath: string | null
  readonly inspectedEntry: EvidencePreviewEntry | null
  readonly onInspectEvidence: (relPath: string) => void
  readonly onOpenEvidenceSplit: (relPath: string) => void
  readonly onRetryEvidence: () => void
  readonly onRetryClaims: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}

export function StudioInspectorPane(props: StudioInspectorPaneProps): ReactNode {
  const {
    mode, onChangeMode, claimsSummary, inspectedRelPath, inspectedEntry,
    onInspectEvidence, onOpenEvidenceSplit, onRetryEvidence, onRetryClaims, t,
  } = props
  return (
    <aside className={css.studioInspector} data-testid="final-studio-inspector" aria-label={t('finalStudioInspectorTitle')}>
      <div className={css.studioInspectorHeader}>
        <SegmentedControl<StudioInspectorTab>
          id="research-final-studio-inspector"
          label={t('finalStudioInspectorTitle')}
          value={mode}
          options={[
            { value: 'claims', label: t('finalTabClaims', { count: String(claimsSummary?.counts.total ?? 0) }) },
            { value: 'evidence', label: t('finalStudioEvidenceTab') },
          ]}
          onChange={onChangeMode}
        />
      </div>
      <div className={css.studioInspectorBody}>
        {mode === 'claims' ? (
          <ClaimsAuditView
            summary={claimsSummary}
            onOpenEvidence={(rel) => {
              onInspectEvidence(rel)
              onChangeMode('evidence')
            }}
            onRetry={onRetryClaims}
            t={t}
          />
        ) : inspectedRelPath === null || inspectedEntry === null ? (
          <div className={css.studioEmpty}>{t('finalStudioEvidenceHint')}</div>
        ) : inspectedEntry.state === 'loading' ? (
          <div className={css.studioEmpty}>{t('evidenceLoading')}</div>
        ) : inspectedEntry.state !== 'ok' ? (
          <div className={css.hoverCardError}>
            <span>
              {t(inspectedEntry.state === 'absent'
                ? 'evidenceAbsent'
                : inspectedEntry.state === 'empty'
                  ? 'evidenceEmpty'
                  : inspectedEntry.state === 'invalid'
                    ? 'evidenceInvalid'
                    : 'evidenceUnreadable')}
            </span>
            <Button variant="outline" size="sm" onClick={onRetryEvidence}>{t('retry')}</Button>
          </div>
        ) : (
          <div className={css.studioEvidenceCard} data-testid="final-studio-evidence-card">
            <div className={css.hoverCardTitleRow}>
              <LinkIconMedium
                kind={inspectedEntry.summary.sourceUrl !== null ? 'url' : 'document'}
                {...(inspectedEntry.summary.sourceUrl !== null ? { href: inspectedEntry.summary.sourceUrl } : {})}
                size={15}
              />
              <strong className={css.hoverCardTitle}>{inspectedEntry.summary.title}</strong>
            </div>
            <div className={css.hoverCardBadges}>
              {inspectedEntry.summary.quality !== null && (
                <Tag tone={inspectedEntry.summary.quality === 'A' ? 'success' : inspectedEntry.summary.quality === 'B' ? 'info' : 'outline'}>
                  {t('evidenceQualityBadge', { grade: inspectedEntry.summary.quality })}
                </Tag>
              )}
              {inspectedEntry.summary.sourceTier !== null && (
                <Tag tone="outline">{t(`evidenceTier_${inspectedEntry.summary.sourceTier}` as CockpitLocaleKey)}</Tag>
              )}
              {inspectedEntry.summary.publisher !== null && (
                <Tag tone="quiet">{inspectedEntry.summary.publisher}</Tag>
              )}
            </div>
            <div className={css.studioEvidencePath}>{inspectedRelPath}</div>
            {inspectedEntry.summary.excerptLines.length > 0 && (
              <div className={css.hoverCardExcerpt}>
                {inspectedEntry.summary.excerptLines.map((line, idx) => (
                  <p key={idx} className={css.hoverCardExcerptLine}>{line}</p>
                ))}
              </div>
            )}
            <div className={css.hoverCardActions}>
              <Button variant="outline" size="sm" onClick={() => onOpenEvidenceSplit(inspectedRelPath)}>
                {t('finalCitationOpenSplit')}
              </Button>
              {inspectedEntry.summary.sourceUrl !== null && (
                <a
                  href={inspectedEntry.summary.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css.hoverCardExternalLink}
                >
                  {t('finalCitationOpenSource')}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
