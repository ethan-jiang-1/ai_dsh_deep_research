/**
 * ResearchMilestoneCard — 对话流回合尾研究里程碑卡（conversation.chat.turnTail）。
 */
import type { ReactNode } from 'react'
import { Button, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { selectResearchMilestones, type ResearchMilestoneKind } from './research-turn.ts'
import css from './ResearchMilestoneCard.module.css'

export interface ResearchMilestoneCardInjected {
  readonly openStatus: () => void
  readonly openFinal: (sessionId: SessionId, path: string) => void
}

export type ResearchMilestoneCardProps = PropsRuntime<'conversation.chat.turnTail'>
  & PropsLocale<'deepResearchPack'>
  & ResearchMilestoneCardInjected

function milestoneTitleKey(kind: ResearchMilestoneKind): 'milestoneProtocolTitle' | 'milestoneReviewTitle' | 'milestoneDeliveredTitle' {
  switch (kind) {
    case 'protocol': return 'milestoneProtocolTitle'
    case 'review': return 'milestoneReviewTitle'
    case 'delivered': return 'milestoneDeliveredTitle'
  }
}

export function ResearchMilestoneCard(props: ResearchMilestoneCardProps): ReactNode {
  const milestones = selectResearchMilestones(props)
  if (milestones.length === 0) return null
  return (
    <div className={css.card} data-testid="research-milestone-card">
      {milestones.map((m) => (
        <div key={`${m.kind}:${m.path}`} className={css.row}>
          <div className={css.left}>
            <StateDot state="done" size={10} />
            <span>{props.t(milestoneTitleKey(m.kind))}</span>
            <Tag tone="outline">{m.kind}</Tag>
          </div>
          <div className={css.actions}>
            {m.kind === 'delivered' && props.sessionId !== undefined ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => props.openFinal(props.sessionId as SessionId, m.path)}
              >
                {props.t('milestoneOpenFinal')}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={props.openStatus}>
                {props.t('milestoneOpenStatus')}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
