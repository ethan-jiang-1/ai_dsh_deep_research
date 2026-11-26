import type { ReactNode } from 'react'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { EvidenceMatrix } from '../../lib/run/evidence-matrix.ts'
import { countText } from '../../lib/shared/i18n.ts'
import css from './status.module.css'

/**
 * 质量雷达：`topics.md × evidence/*.md` 的 Topic × Lens 覆盖矩阵、Quality A–D 与 source_tier 分布条。
 * 保持只读且显性报告 unreadable/invalid 卡片缺口。
 */
export function QualityRadar(props: {
  readonly matrix: EvidenceMatrix
  readonly onRetry: () => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { matrix, onRetry, t } = props
  if (matrix.state === 'absent') return null
  const tiers = [
    { key: 'primary' as const, label: 'P', count: matrix.byTier.primary },
    { key: 'secondary' as const, label: 'S', count: matrix.byTier.secondary },
    { key: 'tertiary' as const, label: 'T', count: matrix.byTier.tertiary },
    { key: 'weak' as const, label: 'W', count: matrix.byTier.weak },
  ].filter((item) => item.count > 0)
  const qualities = (['A', 'B', 'C', 'D'] as const)
    .map((grade) => ({ grade, count: matrix.byQuality[grade] }))
    .filter((item) => item.count > 0)
  const hasMatrix = matrix.topics.length > 0 && matrix.lenses.length > 0
  if (
    matrix.state === 'ok'
    && !hasMatrix
    && tiers.length === 0
    && qualities.length === 0
    && matrix.uniquePublishers === 0
    && matrix.unreadableCards === 0
    && matrix.invalidCards === 0
  ) {
    return null
  }

  return (
    <div className={css.radarCard} data-testid="research-quality-radar" data-radar-state={matrix.state}>
      <div className={css.radarHeader}>
        <strong className={css.protocolTitle}>{t('statusRadarTitle')}</strong>
        <Tag tone={matrix.state === 'ok' ? 'neutral' : 'warning'}>
          {countText(t, matrix.uniquePublishers, 'statusRadarPublishersOne', 'statusRadarPublishersOther')}
        </Tag>
        {(matrix.state === 'partial' || matrix.state === 'unreadable') && (
          <Button variant="ghost" size="sm" onClick={onRetry}>{t('retry')}</Button>
        )}
      </div>

      {(matrix.unreadableCards > 0 || matrix.invalidCards > 0) && (
        <div className={css.warnText}>
          {t('statusRadarGap', {
            unreadable: String(matrix.unreadableCards),
            invalid: String(matrix.invalidCards),
          })}
        </div>
      )}

      {(tiers.length > 0 || qualities.length > 0) && (
        <div className={css.radarTags}>
          {qualities.map((q) => (
            <Tag key={q.grade} tone={q.grade === 'A' ? 'success' : q.grade === 'B' ? 'info' : 'outline'}>
              {q.grade}: {String(q.count)}
            </Tag>
          ))}
          {tiers.map((tier) => (
            <Tag key={tier.key} tone="outline">{tier.label}: {String(tier.count)}</Tag>
          ))}
        </div>
      )}

      {matrix.topics.length > 0 && matrix.lenses.length > 0 && (
        <div className={css.matrixWrap}>
          <table className={css.matrixTable} aria-label={t('statusRadarMatrixAria')}>
            <thead>
              <tr>
                <th>{t('statusRadarTopicCol')}</th>
                {matrix.lenses.map((lens) => (
                  <th key={lens}>{lens}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.topics.map((topic) => {
                const row = matrix.cells[topic.id] ?? {}
                return (
                  <tr key={topic.id}>
                    <td title={topic.title}>{topic.id}</td>
                    {matrix.lenses.map((lens) => {
                      const required = topic.lenses.includes(lens)
                      const count = row[lens] ?? 0
                      return (
                        <td
                          key={lens}
                          className={count > 0 ? css.matrixHit : required ? css.matrixMiss : css.matrixNa}
                        >
                          {count > 0 ? String(count) : required ? '0' : '·'}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
