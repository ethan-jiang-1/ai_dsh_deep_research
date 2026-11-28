import { useState, type ReactNode } from 'react'
import { Button, IconCloseOutlineRegular, LinkIconMedium, Tag, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { EvidenceMatrix, EvidenceMeta } from '../../lib/run/evidence-matrix.ts'
import { safeExternalUrl } from '../../lib/run/evidence-card.ts'
import { countText } from '../../lib/shared/i18n.ts'
import type { CockpitLocaleKey } from '../locales/zh-cockpit.ts'
import css from './status.module.css'

const BUILTIN_LENS_IDS = new Set([
  'official', 'academic', 'adversarial', 'quant', 'practitioner', 'historical', 'structural', 'regulatory',
])

function lensLabelOf(lens: string, t: TranslateNS<'deepResearchPack'>): string {
  return BUILTIN_LENS_IDS.has(lens) ? t(`lens_${lens}_name` as CockpitLocaleKey) : lens
}

function lensBlindSpotOf(lens: string, t: TranslateNS<'deepResearchPack'>): string {
  if (BUILTIN_LENS_IDS.has(lens)) {
    return t('statusRadarGapTooltip', {
      lens: lensLabelOf(lens, t),
      blindSpots: t(`lens_${lens}_blindSpots` as CockpitLocaleKey),
    })
  }
  return t('statusRadarGapGeneric', { lens })
}

/**
 * 交互式质量雷达：`topics.md × evidence/*.md` 的 Topic × Lens 覆盖矩阵、Quality A–D 与 source_tier 分布。
 * - 点击命中格展开对应证据卡微列表（质量等级 A–D、来源站点图标、标题，点击直开证据卡页签）；
 * - 悬停缺口格（0）经 DSH 原生 Tooltip 说明对应透镜盲区。
 */
export function QualityRadar(props: {
  readonly matrix: EvidenceMatrix
  readonly onRetry: () => void
  readonly onOpenEvidence?: (cardFile: string) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { matrix, onRetry, onOpenEvidence, t } = props
  const [selectedCell, setSelectedCell] = useState<{ readonly topicId: string; readonly lens: string } | null>(null)
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

  const selectedCards: readonly EvidenceMeta[] = selectedCell === null
    ? []
    : (matrix.cellCards?.[selectedCell.topicId]?.[selectedCell.lens] ?? [])
  const selectedTopic = selectedCell === null
    ? null
    : (matrix.topics.find((item) => item.id === selectedCell.topicId) ?? null)

  return (
    <div className={css.radarCard} data-testid="research-quality-radar" data-radar-state={matrix.state}>
      <div className={css.radarHeader}>
        <strong className={css.protocolTitle}>{t('statusRadarTitle')}</strong>
        <Tag tone={matrix.state === 'ok' ? 'neutral' : 'warning'}>
          {countText(t, matrix.uniquePublishers, 'statusRadarPublishersOne', 'statusRadarPublishersOther')}
        </Tag>
        {hasMatrix && onOpenEvidence !== undefined && selectedCell === null && (
          <span className={css.radarClickHint}>{t('statusRadarClickHint')}</span>
        )}
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

      {hasMatrix && (
        <div className={css.matrixWrap}>
          <table className={css.matrixTable} aria-label={t('statusRadarMatrixAria')}>
            <thead>
              <tr>
                <th>{t('statusRadarTopicCol')}</th>
                {matrix.lenses.map((lens) => (
                  <th key={lens} title={lensLabelOf(lens, t)} className={css.matrixLensHead}>
                    {lensLabelOf(lens, t)}
                  </th>
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
                      const isSelected = selectedCell?.topicId === topic.id && selectedCell?.lens === lens
                      if (count > 0) {
                        return (
                          <td
                            key={lens}
                            className={`${css.matrixHit}${isSelected ? ` ${css.matrixCellActive}` : ''}`}
                          >
                            <button
                              type="button"
                              className={css.matrixHitBtn}
                              data-radar-cell={`${topic.id}:${lens}`}
                              aria-pressed={isSelected}
                              title={t('statusRadarCellDrillHint', { topic: topic.id, lens: lensLabelOf(lens, t), count: String(count) })}
                              onClick={() => {
                                setSelectedCell((current) =>
                                  current?.topicId === topic.id && current.lens === lens ? null : { topicId: topic.id, lens },
                                )
                              }}
                            >
                              {String(count)}
                            </button>
                          </td>
                        )
                      }
                      if (required) {
                        return (
                          <td key={lens} className={css.matrixMiss}>
                            <Tooltip label={lensBlindSpotOf(lens, t)} side="top" portal maxWidth={240}>
                              <span
                                className={css.matrixGapTrigger}
                                tabIndex={0}
                                data-radar-gap={`${topic.id}:${lens}`}
                              >
                                0
                              </span>
                            </Tooltip>
                          </td>
                        )
                      }
                      return (
                        <td key={lens} className={css.matrixNa}>·</td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCell !== null && (
        <div className={css.radarDrawer} data-testid="radar-cell-drawer">
          <div className={css.radarDrawerHeader}>
            <span className={css.radarDrawerTitle}>
              {selectedCell.topicId}{selectedTopic !== null && selectedTopic.title !== '' ? ` · ${selectedTopic.title}` : ''} / {lensLabelOf(selectedCell.lens, t)}
            </span>
            <button
              type="button"
              className={css.radarDrawerClose}
              aria-label={t('statusRadarDrawerClose')}
              onClick={() => { setSelectedCell(null) }}
            >
              <IconCloseOutlineRegular size={12} />
            </button>
          </div>
          {selectedCards.length === 0 ? (
            <div className={css.radarDrawerEmpty}>{t('statusRadarCellNoMeta')}</div>
          ) : (
            <div className={css.radarCardList}>
              {selectedCards.map((card) => {
                const url = safeExternalUrl(card.sourceUrl)
                const gradeTone = card.quality === 'A' ? 'success' : card.quality === 'B' ? 'info' : 'outline'
                return (
                  <button
                    key={card.file}
                    type="button"
                    className={css.radarEvidenceItem}
                    data-radar-evidence-file={card.file}
                    disabled={onOpenEvidence === undefined}
                    onClick={() => { onOpenEvidence?.(card.file) }}
                  >
                    <span className={css.radarEvidenceIcon}>
                      <LinkIconMedium kind={url !== null ? 'url' : 'document'} href={url ?? undefined} size={14} />
                    </span>
                    <span className={css.radarEvidenceMain}>
                      <span className={css.radarEvidenceTitle}>{card.title ?? card.file}</span>
                      {card.publisher !== null && (
                        <span className={css.radarEvidenceMeta}>{card.publisher}</span>
                      )}
                    </span>
                    <Tag tone={gradeTone}>{card.quality}</Tag>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
