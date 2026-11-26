// TrackRail.tsx — 「研究状态」页签的流程轨道（②）：◆立项确认 + 主轨 + ◆交付审阅 + 交付，
// 使用 ui-primitives StateDot(appearance="step") 与自适应换行步进轨。
import type { ReactNode } from 'react'
import { StateDot, Tag, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { RunAnchor } from '../../lib/events/hitl-fold.ts'
import type { RunStep } from '../../lib/run/run-fold.ts'
import { countText } from '../../lib/shared/i18n.ts'
import css from './status.module.css'

export function TrackRail(props: {
  readonly anchors: readonly RunAnchor[]
  readonly steps: readonly RunStep[]
  /** `final/` 记录的版本数；null = 尚未读到绑定面（与"无版本"不同形）。 */
  readonly faceVersions: number | null
  readonly hitlPending: boolean
  readonly t: TranslateNS<'deepResearchPack'>
}): ReactNode {
  const { anchors, steps, faceVersions, hitlPending, t } = props
  const hasFace = faceVersions !== null
  const railVisible = hasFace || hitlPending || anchors.some((a) => a.state !== 'upcoming')
  if (!railVisible) return null

  const anchorChip = (a: RunAnchor): ReactNode => {
    const tone = a.state === 'pending' ? 'warning' : a.state === 'passed' ? 'success' : 'neutral'
    return (
      <Tag key={a.key} tone={tone} className={css.stepAnchor}>
        ◆{a.label}{a.state === 'pending' && a.questions > 0 ? countText(t, a.questions, 'questionCountOne', 'questionCountOther') : ''} {a.state === 'pending' ? '⏳' : a.state === 'passed' ? '✓' : '·'}
      </Tag>
    )
  }

  const loopOn = anchors[1] !== undefined && anchors[1].state !== 'upcoming'
  const stepDotState = (s: RunStep): StateDotState => {
    if (s.state === 'unknown') return 'warning'
    if (!hasFace) return 'idle'
    if (s.state === 'current') return 'ongoing'
    if (s.state === 'done') return 'done'
    return 'idle'
  }

  const stepChip = (s: RunStep): ReactNode => {
    const reentry = hasFace && loopOn && s.key === 'evidence'
    const unknown = s.state === 'unknown'
    const stateClass = unknown
      ? css.stepUnknown
      : !hasFace
        ? css.stepNoFace
        : s.state === 'current'
          ? css.stepCurrent
          : s.state === 'done'
            ? css.stepDone
            : css.stepPending
    return (
      <span
        key={s.key}
        data-step-key={s.key}
        data-step-state={s.state}
        data-step-reentry={reentry ? 'true' : 'false'}
        className={`${css.stepPill} ${stateClass}${reentry ? ` ${css.stepReentry}` : ''}`}
      >
        <StateDot appearance="step" state={stepDotState(s)} size={12} />
        <span>{s.label}{unknown ? ' ?' : ''}</span>
      </span>
    )
  }

  const railNodes: { key: string; chip: ReactNode }[] = [
    { key: 'anchor-1', chip: anchorChip(anchors[0] ?? { key: 'anchor-1', label: t('anchorKickoff'), state: 'upcoming', questions: 0 }) },
    ...steps.slice(0, 6).map((s) => ({ key: s.key, chip: stepChip(s) })),
    { key: 'anchor-2', chip: anchorChip(anchors[1] ?? { key: 'anchor-2', label: t('anchorDelivery'), state: 'upcoming', questions: 0 }) },
    ...steps.slice(6).map((s) => ({ key: s.key, chip: stepChip(s) })),
    ...anchors.slice(2).map((a) => ({ key: a.key, chip: anchorChip(a) })),
  ]

  return (
    <div className={css.railSection}>
      <div className={css.railFlex}>
        {railNodes.map((n) => (
          <span key={n.key} className={css.railNode}>{n.chip}</span>
        ))}
      </div>
      {loopOn && (
        <div className={css.rerunLoop}>
          <span className={css.rerunArrow}>▲</span>
          {t('trackRerunLegend', { version: faceVersions !== null && faceVersions >= 2 ? t('trackRerunSuffix', { version: String(faceVersions) }) : '' })}
        </div>
      )}
      {hasFace && <div className={css.trackLegend}>{t('trackLegend')}</div>}
    </div>
  )
}
