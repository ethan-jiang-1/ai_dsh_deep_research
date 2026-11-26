import { useState, type ReactNode } from 'react'
import { Button, DisclosureRow, IconSearchOutlineRegular, Input, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { BUILT_IN_LENSES, filterLenses, type LensSpec } from '../../lib/workspace/runs-catalog.ts'
import type { CockpitLocaleKey } from '../locales/zh-cockpit.ts'
import css from './hub.module.css'

export interface LensesViewProps extends PropsLocale<'deepResearchPack'> {
  readonly onDraftWithLens: (prompt: string) => void
}

function lensField(t: PropsLocale<'deepResearchPack'>['t'], id: string, field: string): string {
  return t(`lens_${id}_${field}` as CockpitLocaleKey)
}

/** 8 条内置研究透镜目录视图（按 locale 切换中英文，支持一键填入研究草稿）。 */
export function LensesView({ onDraftWithLens, t }: LensesViewProps): ReactNode {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Readonly<Record<string, boolean>>>({})
  const textOf = (lens: LensSpec): string => [
    lensField(t, lens.id, 'name'),
    lensField(t, lens.id, 'when'),
    lensField(t, lens.id, 'seek'),
  ].join(' ')
  const lenses = filterLenses(BUILT_IN_LENSES, query, textOf)

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      <div className={css.toolbar}>
        <div className={css.searchWrap}>
          <Input
            icon={<IconSearchOutlineRegular size={14} />}
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            placeholder={t('hubSearchLenses')}
            aria-label={t('hubSearchLenses')}
          />
        </div>
      </div>

      {lenses.length === 0 ? (
        <div className={css.emptyState}>{t('hubLensesEmpty')}</div>
      ) : (
        <div className={css.grid}>
          {lenses.map((lens) => {
            const name = lensField(t, lens.id, 'name')
            const when = lensField(t, lens.id, 'when')
            const seek = lensField(t, lens.id, 'seek')
            const verify = lensField(t, lens.id, 'verify')
            const frame = lensField(t, lens.id, 'frame')
            const refuse = lensField(t, lens.id, 'refuse')
            const bias = lensField(t, lens.id, 'bias')
            const blindSpots = lensField(t, lens.id, 'blindSpots')
            const isOpen = expanded[lens.id] === true
            return (
              <article key={lens.id} className={css.card}>
                <div className={css.cardTop}>
                  <div className={css.cardTitle}>{name}</div>
                  <Tag tone="neutral">{lens.id}</Tag>
                </div>
                <div className={css.lensDesc}>
                  <strong>{t('hubLensWhen')}: </strong>{when}
                </div>
                <div className={css.lensPairs}>
                  {t('hubLensPairs')}: {lens.pairsWith.join(' / ')}
                </div>
                <DisclosureRow
                  icon={<span aria-hidden="true">◎</span>}
                  title={t('hubLensDetailToggle')}
                  open={isOpen}
                  expandable
                  expandOnRowClick
                  onToggle={() => { toggle(lens.id) }}
                >
                  <div className={css.lensDetails}>
                    <div className={css.lensDetailRow}><strong>{t('hubLensSeek')}: </strong>{seek}</div>
                    <div className={css.lensDetailRow}><strong>{t('hubLensVerify')}: </strong>{verify}</div>
                    <div className={css.lensDetailRow}><strong>{t('hubLensFrame')}: </strong>{frame}</div>
                    <div className={css.lensDetailRow}><strong>{t('hubLensRefuse')}: </strong>{refuse}</div>
                    <div className={css.lensDetailRow}><strong>{t('hubLensBias')}: </strong>{bias}</div>
                    <div className={css.lensDetailRow}><strong>{t('hubLensBlindSpots')}: </strong>{blindSpots}</div>
                  </div>
                </DisclosureRow>
                <div className={css.cardFooter}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { onDraftWithLens(t('hubLensPrompt', { name, id: lens.id })) }}
                  >
                    {t('hubLensApply')}
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
