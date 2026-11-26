// FinalFollowupFooter.tsx — 终稿底部的只读续研引导：
// ① 若正文含「下一版优先项」条目，列出每条的一键预填按钮；② 三种改法只读折叠块。
// 严守 D18 只读边界：所有按钮仅调用 inputActions 预填草稿，绝不自动发送。
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { rerunTriageRowsOf } from '../../lib/run/rerun-triage.ts'
import css from '../ResearchFinalTab.module.css'

export function FinalFollowupFooter(props: {
  readonly priorities: readonly string[]
  readonly triageRows: ReturnType<typeof rerunTriageRowsOf>
  readonly canPrefill: boolean
  readonly prefilledCopy: string | null
  readonly onPrefill: (copy: string) => void
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { priorities, triageRows, canPrefill, prefilledCopy, onPrefill, t } = props
  return (
    <>
      {priorities.length > 0 && (
        <section className={css.prioritiesBox} data-testid="final-next-priorities">
          <div className={css.prioritiesTitle}>{t('finalNextPrioritiesTitle')}</div>
          <div className={css.prioritiesList}>
            {priorities.map((item) => {
              const draft = t('finalNextPriorityPrefill', { item })
              return (
                <div key={item} className={css.priorityRow}>
                  <span className={css.priorityItemText}>{item}</span>
                  {canPrefill && (
                    <Button variant="ghost" size="sm" onClick={() => { onPrefill(draft) }}>
                      {prefilledCopy === draft ? t('finalTriagePrefilled') : t('finalTriagePrefill')}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
      <details className={css.triageDetails}>
        <summary className={css.triageSummary}>{t('triageTitle')}</summary>
        <div className={css.triageBody}>
          {triageRows.map((row) => (
            <div key={row.label} className={css.triageRow}>
              <div className={css.triageRowHead}>
                <strong>{row.label}</strong>
                <span>{t('triageConsequenceSuffix', { consequence: row.consequence })}</span>
                {canPrefill && (
                  <Button variant="ghost" size="sm" onClick={() => { onPrefill(row.copy) }}>
                    {prefilledCopy === row.copy ? t('finalTriagePrefilled') : t('finalTriagePrefill')}
                  </Button>
                )}
              </div>
              <div className={css.triageCopy}>{t('triageCopyLine', { copy: row.copy })}</div>
            </div>
          ))}
          <div className={css.triageHint}>{t('triageHint')}</div>
        </div>
      </details>
    </>
  )
}
