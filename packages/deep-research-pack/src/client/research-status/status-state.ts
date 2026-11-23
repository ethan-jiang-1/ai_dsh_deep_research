// status-state.ts — 「研究状态」页签纯状态机与通知列表派生（从 useStatusFeed / ResearchStatusTab 抽出）。
//
// 让状态复位、scan 升降级、trust 防抖比对与警告横幅列表脱离 React Hook / JSX 壳，可无浏览器单测。
import type { SetStateAction } from 'react'
import type { ActivityRow } from '../../lib/events/activity-fold.ts'
import type { HitlState } from '../../lib/events/hitl-fold.ts'
import type { MemberActivitySummary } from '../../lib/events/member-activity.ts'
import type { ReviewVerdict } from '../../lib/review/review-readiness.ts'
import { assertNever, artifactReadIssueOf, type ArtifactState, type StatusReads } from '../../lib/run/artifact-read.ts'
import type { BindingTrust } from '../../lib/run/binding-trust.ts'
import type { deliveryFromReceipt } from '../../lib/run/final-target.ts'
import type { DeepResearchPackLocaleKey } from '../locales.ts'
import type { BundleFace } from './types.ts'

/** 初始/无绑定时的读取态：十个观测工件都还没有读到。 */
export const ABSENT_READS: StatusReads = {
  bundle: 'absent', question: 'absent', review: 'absent', readiness: 'absent', evidence: 'absent', plan: 'absent', leads: 'absent', findings: 'absent', final: 'absent', receipt: 'absent',
}

/** 绑定可信性的值键（状态页全值比对用：kind/slug/reason/boundBy 任一变化都要重扫）。 */
export function trustKey(trust: BindingTrust): string {
  if (trust.kind === 'bound') return `bound:${trust.slug}:${trust.boundBy}`
  if (trust.kind === 'suppressed') return `suppressed:${trust.slug}:${trust.reason}`
  return 'unbound'
}

export interface StatusFeedState {
  readonly rows: readonly ActivityRow[]
  readonly hitl: HitlState
  readonly journalEvents: readonly unknown[]
  readonly face: BundleFace | null
  readonly unbound: boolean
  readonly trust: BindingTrust
  readonly journalSeen: boolean
  readonly receiptDelivery: ReturnType<typeof deliveryFromReceipt> | null
  readonly kickoffHold: boolean
  readonly error: string | null
  readonly reads: StatusReads
  readonly reviewVerdict: ReviewVerdict
  readonly reviewDetail: string | null
  readonly scanSettled: boolean
  readonly memberSummaries: Readonly<Record<string, MemberActivitySummary>>
}

export const INITIAL_STATUS_FEED_STATE: StatusFeedState = {
  rows: [],
  hitl: { pending: false, since: undefined },
  journalEvents: [],
  face: null,
  unbound: false,
  trust: { kind: 'unbound' },
  journalSeen: false,
  receiptDelivery: null,
  kickoffHold: false,
  error: null,
  reads: ABSENT_READS,
  reviewVerdict: 'absent',
  reviewDetail: null,
  scanSettled: false,
  memberSummaries: {},
}

export type StatusFeedAction =
  | { readonly kind: 'reset-session' }
  | {
    readonly kind: 'journal-frame'
    readonly events: readonly unknown[]
    readonly rows: readonly ActivityRow[]
    readonly hitl: HitlState
    readonly trust: BindingTrust
  }
  | { readonly kind: 'journal-error'; readonly message: string }
  | { readonly kind: 'unsettled-trust'; readonly trust: BindingTrust }
  | { readonly kind: 'scan-started' }
  | { readonly kind: 'scan-bundle-failed'; readonly reads: StatusReads }
  | {
    readonly kind: 'scan-succeeded'
    readonly reads: StatusReads
    readonly face: BundleFace
    readonly receiptDelivery: ReturnType<typeof deliveryFromReceipt> | null
    readonly reviewVerdict: ReviewVerdict
    readonly reviewDetail: string | null
  }
  | { readonly kind: 'scan-threw' }
  | { readonly kind: 'retry-requested' }
  | { readonly kind: 'member-summaries'; readonly value: SetStateAction<Readonly<Record<string, MemberActivitySummary>>> }

/** 状态流状态机的唯一纯转移函数：切会话、流事件、绑定与扫描降级都在此显性收口。 */
export function reduceStatusFeed(state: StatusFeedState, action: StatusFeedAction): StatusFeedState {
  switch (action.kind) {
    case 'reset-session':
      return INITIAL_STATUS_FEED_STATE
    case 'journal-frame':
      return {
        ...state,
        journalEvents: action.events,
        journalSeen: true,
        rows: action.rows,
        hitl: action.hitl,
        trust: trustKey(action.trust) === trustKey(state.trust) ? state.trust : action.trust,
      }
    case 'journal-error':
      return { ...state, error: action.message }
    case 'unsettled-trust':
      return {
        ...state,
        face: null,
        receiptDelivery: null,
        reads: ABSENT_READS,
        scanSettled: false,
        unbound: action.trust.kind === 'unbound' && state.journalSeen,
        kickoffHold: action.trust.kind === 'suppressed' && action.trust.reason === 'kickoff',
      }
    case 'scan-started':
      return { ...state, unbound: false, kickoffHold: false }
    case 'scan-bundle-failed':
      return {
        ...state,
        face: null,
        receiptDelivery: null,
        reads: action.reads,
        reviewVerdict: 'absent',
        reviewDetail: null,
        scanSettled: true,
      }
    case 'scan-succeeded':
      return {
        ...state,
        face: action.face,
        receiptDelivery: action.receiptDelivery,
        reads: action.reads,
        reviewVerdict: action.reviewVerdict,
        reviewDetail: action.reviewDetail,
        scanSettled: true,
      }
    case 'scan-threw':
      return {
        ...state,
        face: null,
        receiptDelivery: null,
        reads: { ...ABSENT_READS, bundle: 'unreadable' },
        reviewVerdict: 'absent',
        reviewDetail: null,
        scanSettled: true,
      }
    case 'retry-requested':
      return { ...state, scanSettled: false }
    case 'member-summaries':
      return {
        ...state,
        memberSummaries: typeof action.value === 'function' ? action.value(state.memberSummaries) : action.value,
      }
    default:
      return assertNever(action)
  }
}

export interface StatusNotice {
  readonly id: 'question' | 'leads' | 'findings' | 'evidence' | 'review' | 'plan' | 'final'
  readonly key: DeepResearchPackLocaleKey
}

export function receiptIssueKeyOf(receipt: ArtifactState): DeepResearchPackLocaleKey | null {
  if (receipt === 'unreadable' || receipt === 'empty') return 'statusReceiptReadFailed'
  if (receipt === 'invalid') return 'statusReceiptInvalid'
  return null
}

export function planIssueKeyOf(plan: ArtifactState): DeepResearchPackLocaleKey | null {
  const issue = artifactReadIssueOf(plan)
  if (issue === 'unreadable') return 'statusPlanReadFailed'
  if (issue === 'empty') return 'statusPlanEmpty'
  return null
}

/** 数据驱动的业务摘要警告列表：取代组件内 7 段重复的 JSX 判空与按钮模板。 */
export function collectStatusNotices(input: {
  readonly face: BundleFace | null
  readonly reads: StatusReads
  readonly reviewVerdict: ReviewVerdict
}): readonly StatusNotice[] {
  const { face, reads, reviewVerdict } = input
  const questionKey: DeepResearchPackLocaleKey | null = face?.questionIssue === 'body-empty'
    ? 'statusQuestionBodyEmpty'
    : reads.question === 'unreadable'
      ? 'statusQuestionReadFailed'
      : reads.question === 'empty' ? 'statusQuestionEmpty' : null
  const leadsKey: DeepResearchPackLocaleKey | null = face?.leadsIssue === 'unreadable'
    ? 'statusLeadsReadFailed'
    : face?.leadsIssue !== null && face?.leadsIssue !== undefined ? 'statusLeadsEmpty' : null
  const findingsKey: DeepResearchPackLocaleKey | null = face?.findingsIssue === 'unreadable'
    ? 'statusFindingsReadFailed'
    : face?.findingsIssue !== null && face?.findingsIssue !== undefined ? 'statusFindingsEmpty' : null
  const evidenceKey: DeepResearchPackLocaleKey | null = reads.evidence === 'unreadable' || face?.evidenceIssue === 'unreadable'
    ? 'statusEvidenceReadFailed'
    : face?.evidenceIssue === 'failed-only'
      ? 'statusEvidenceFailedOnly'
      : face?.evidenceIssue === 'empty' ? 'statusEvidenceEmpty' : null
  const reviewKey: DeepResearchPackLocaleKey | null = reviewVerdict === 'conflict'
    ? 'statusReviewConflict'
    : reads.review === 'unreadable'
      ? 'statusReviewReadFailed'
      : reads.review === 'empty'
        ? 'statusReviewEmpty'
        : reviewVerdict === 'unconfirmed' ? 'statusReviewUnconfirmed' : null
  const planKey = planIssueKeyOf(reads.plan)
  const finalKey: DeepResearchPackLocaleKey | null = reads.final === 'unreadable' ? 'statusFinalDirReadFailed' : null

  const candidates: readonly (StatusNotice | null)[] = [
    questionKey !== null ? { id: 'question', key: questionKey } : null,
    leadsKey !== null ? { id: 'leads', key: leadsKey } : null,
    findingsKey !== null ? { id: 'findings', key: findingsKey } : null,
    evidenceKey !== null ? { id: 'evidence', key: evidenceKey } : null,
    reviewKey !== null ? { id: 'review', key: reviewKey } : null,
    planKey !== null ? { id: 'plan', key: planKey } : null,
    finalKey !== null ? { id: 'final', key: finalKey } : null,
  ]
  return candidates.filter((notice): notice is StatusNotice => notice !== null)
}
