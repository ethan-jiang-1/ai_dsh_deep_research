import { useMemo, useState, type ReactNode } from 'react'
import { Button, HoverCardGroup, Pill, Tag, type TagTone } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClaimVerdictStatus, ClaimsAuditSummary } from '../../lib/run/claims-verdicts.ts'
import { countRiskClaims, filterClaimRows, type ClaimRiskFilter } from '../../lib/run/evidence-preview.ts'
import css from '../ResearchFinalTab.module.css'

const STATUS_TONE: Record<ClaimVerdictStatus, TagTone> = {
  supported: 'success',
  partial: 'warning',
  unsupported: 'danger',
  insufficient: 'warning',
  UNVERIFIED: 'outline',
}

function statusLabelOf(status: ClaimVerdictStatus, t: TranslateNS<'deepResearchPack'>): string {
  switch (status) {
    case 'supported': return t('finalClaimSupported')
    case 'partial': return t('finalClaimPartial')
    case 'unsupported': return t('finalClaimUnsupported')
    case 'insufficient': return t('finalClaimInsufficient')
    case 'UNVERIFIED': return t('finalClaimUnverified')
  }
}

/**
 * 终稿「核查清单」视图：逐条展示 `claims.json × verdicts.json` 状态、风险筛选胶囊、反证摘录与证据卡分屏入口。
 */
export function ClaimsAuditView(props: {
  readonly summary: ClaimsAuditSummary | null
  readonly onOpenEvidence: (relPath: string) => void
  readonly onRetry: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { summary, onOpenEvidence, onRetry, t } = props
  const [filter, setFilter] = useState<ClaimRiskFilter>('all')

  const riskCount = summary === null ? 0 : countRiskClaims(summary.counts)
  const visibleRows = useMemo(
    () => (summary === null ? [] : filterClaimRows(summary.rows, filter)),
    [summary, filter],
  )

  if (summary === null || summary.claimsState !== 'ok') {
    return (
      <div className={css.claimsMessage}>
        <div>{t('finalClaimsUnavailable')}</div>
        <div><Button variant="outline" size="sm" onClick={onRetry}>{t('retry')}</Button></div>
      </div>
    )
  }

  return (
    <HoverCardGroup {...(css.claimsList !== undefined ? { className: css.claimsList } : {})}>
      <div data-testid="final-claims-audit-view" className={css.claimsList}>
        {summary.verdictsState !== 'ok' && (
          <div className={css.claimsWarn}>{t('finalVerdictsMissing')}</div>
        )}
        <div className={css.claimsFilterBar} role="group" aria-label={t('finalClaimsFilterAria')} data-testid="claims-filter-bar">
          <span className={filter === 'all' ? css.filterActiveWrap : undefined} data-testid="claims-filter-all">
            <Pill onClick={() => { setFilter('all') }}>
              {t('finalClaimsFilterAll', { count: String(summary.counts.total) })}
            </Pill>
          </span>
          <span className={filter === 'risk' ? css.filterActiveWrap : undefined} data-testid="claims-filter-risk">
            <Pill onClick={() => { setFilter('risk') }}>
              {t('finalClaimsFilterRisk', { count: String(riskCount) })}
            </Pill>
          </span>
          <span className={filter === 'supported' ? css.filterActiveWrap : undefined} data-testid="claims-filter-supported">
            <Pill onClick={() => { setFilter('supported') }}>
              {t('finalClaimsFilterSupported', { count: String(summary.counts.supported) })}
            </Pill>
          </span>
        </div>
        <div className={css.claimsStats}>
          <Tag tone="success">{t('finalClaimSupported')}: {String(summary.counts.supported)}</Tag>
          {summary.counts.partial > 0 && <Tag tone="warning">{t('finalClaimPartial')}: {String(summary.counts.partial)}</Tag>}
          {summary.counts.unsupported > 0 && <Tag tone="danger">{t('finalClaimUnsupported')}: {String(summary.counts.unsupported)}</Tag>}
          {summary.counts.insufficient > 0 && <Tag tone="warning">{t('finalClaimInsufficient')}: {String(summary.counts.insufficient)}</Tag>}
          {summary.counts.unverified > 0 && <Tag tone="outline">{t('finalClaimUnverified')}: {String(summary.counts.unverified)}</Tag>}
        </div>
        {visibleRows.length === 0 ? (
          <div className={css.claimsMessage} data-testid="claims-filter-empty">{t('finalClaimsFilterEmpty')}</div>
        ) : visibleRows.map((row) => (
          <article key={row.claimId} className={css.claimCard} data-claim-status={row.status}>
            <div className={css.claimHeader}>
              <strong>{row.claimId}</strong>
              <Tag tone={STATUS_TONE[row.status]}>{statusLabelOf(row.status, t)}</Tag>
              {row.critical && <Tag tone="info">{t('finalClaimCritical')}</Tag>}
            </div>
            <div className={css.claimText}>{row.text}</div>
            {row.reason !== null && <div className={css.claimReason}>{row.reason}</div>}
            {row.quote !== null && <blockquote className={css.claimQuote}>{row.quote}</blockquote>}
            {row.evidence.length > 0 && (
              <div className={css.claimRefs}>
                {row.evidence.map((ref) => (
                  <Pill key={ref} title={ref} className={css.claimRefPill} onClick={() => onOpenEvidence(ref)}>
                    <span className={css.claimRefText}>{ref}</span>
                  </Pill>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </HoverCardGroup>
  )
}
