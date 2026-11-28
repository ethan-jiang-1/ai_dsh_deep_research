// graph-state.ts — 「研究图谱」页签纯状态机（从 useGraphFeed 抽出，不碰 React/IO）。
import type { SetStateAction } from 'react'
import type { PlanIndex } from '../../lib/plan/plan-index.ts'
import { assertNever, type SourceRead } from '../../lib/run/artifact-read.ts'

export type PlanState = 'loading' | 'missing' | 'unbound' | 'ready' | 'truncated' | 'error'
export type SnapshotState = 'idle' | 'loading' | 'ready' | 'empty' | 'invalid' | 'missing' | 'unreadable'

export interface GraphFeedState {
  readonly boundSlug: string | null
  readonly followError: string | null
  readonly followAttempt: number
  readonly plan: PlanIndex | null
  readonly planText: string | null
  readonly planState: PlanState
  readonly retryTick: number
  readonly planVersion: number | null
  readonly snapshots: readonly number[]
  /** `plan/` 快照目录的读取态（BUG-390）：unreadable 不得折成「没有快照」。 */
  readonly snapshotsState: SourceRead
  readonly graphView: 'current' | 'diff'
  readonly snapshotPlan: PlanIndex | null
  readonly snapshotState: SnapshotState
  readonly showSnapshotPlan: boolean
  readonly planLoadedAt: number | null
}

export const INITIAL_GRAPH_FEED_STATE: GraphFeedState = {
  boundSlug: null,
  followError: null,
  followAttempt: 0,
  plan: null,
  planText: null,
  planState: 'loading',
  retryTick: 0,
  planVersion: null,
  snapshots: [],
  snapshotsState: 'absent',
  graphView: 'current',
  snapshotPlan: null,
  snapshotState: 'idle',
  showSnapshotPlan: false,
  planLoadedAt: null,
}

export type GraphFeedAction =
  | { readonly kind: 'reset-session' }
  | { readonly kind: 'follow-start' }
  | { readonly kind: 'bind-slug'; readonly slug: string | null }
  | { readonly kind: 'follow-error'; readonly message: string }
  | { readonly kind: 'follow-retry' }
  | { readonly kind: 'plan-unbound' }
  | { readonly kind: 'plan-loading' }
  | { readonly kind: 'plan-truncated'; readonly loadedAt: number }
  | { readonly kind: 'plan-missing' }
  | { readonly kind: 'plan-error' }
  | {
    readonly kind: 'plan-ready'
    readonly plan: PlanIndex
    readonly planText: string
    readonly planVersion: number | null
    readonly snapshots: readonly number[]
    readonly snapshotsState: SourceRead
    readonly loadedAt: number
  }
  | { readonly kind: 'plan-retry' }
  | { readonly kind: 'set-graph-view'; readonly value: SetStateAction<'current' | 'diff'> }
  | { readonly kind: 'set-show-snapshot'; readonly value: SetStateAction<boolean> }
  | { readonly kind: 'snapshot-idle' }
  | { readonly kind: 'snapshot-missing' }
  | { readonly kind: 'snapshot-loading' }
  | { readonly kind: 'snapshot-failed'; readonly state: 'empty' | 'unreadable' | 'invalid' }
  | { readonly kind: 'snapshot-ready'; readonly plan: PlanIndex }

/** 研究图谱数据面的唯一纯转移函数。 */
export function reduceGraphFeed(state: GraphFeedState, action: GraphFeedAction): GraphFeedState {
  switch (action.kind) {
    case 'reset-session':
      return { ...INITIAL_GRAPH_FEED_STATE }
    case 'follow-start':
      return { ...state, boundSlug: null, followError: null }
    case 'bind-slug':
      return { ...state, boundSlug: action.slug }
    case 'follow-error':
      return { ...state, followError: action.message }
    case 'follow-retry':
      return { ...state, followAttempt: state.followAttempt + 1 }
    case 'plan-unbound':
      return {
        ...state,
        plan: null,
        planText: null,
        planLoadedAt: null,
        planVersion: null,
        snapshots: [],
        snapshotsState: 'absent',
        graphView: 'current',
        snapshotPlan: null,
        snapshotState: 'idle',
        showSnapshotPlan: false,
        planState: 'unbound',
      }
    case 'plan-loading':
      return { ...state, plan: null, planText: null, planState: 'loading' }
    case 'plan-truncated':
      return {
        ...state,
        plan: null,
        planText: null,
        planVersion: null,
        snapshots: [],
        snapshotsState: 'absent',
        graphView: 'current',
        snapshotPlan: null,
        snapshotState: 'idle',
        showSnapshotPlan: false,
        planState: 'truncated',
        planLoadedAt: action.loadedAt,
      }
    case 'plan-missing':
      return {
        ...state,
        plan: null,
        planText: null,
        planVersion: null,
        snapshots: [],
        snapshotsState: 'absent',
        graphView: 'current',
        snapshotPlan: null,
        snapshotState: 'idle',
        showSnapshotPlan: false,
        planState: 'missing',
        planLoadedAt: null,
      }
    case 'plan-error':
      return {
        ...state,
        plan: null,
        planText: null,
        planVersion: null,
        snapshots: [],
        snapshotsState: 'absent',
        graphView: 'current',
        snapshotPlan: null,
        snapshotState: 'idle',
        showSnapshotPlan: false,
        planState: 'error',
        planLoadedAt: null,
      }
    case 'plan-ready': {
      const hasSnapshots = action.snapshots.length > 0
      return {
        ...state,
        plan: action.plan,
        planText: action.planText,
        planVersion: action.planVersion,
        snapshots: action.snapshots,
        snapshotsState: action.snapshotsState,
        ...(hasSnapshots ? {} : { graphView: 'current' as const, showSnapshotPlan: false, snapshotPlan: null, snapshotState: 'idle' as const }),
        planState: 'ready',
        planLoadedAt: action.loadedAt,
      }
    }
    case 'plan-retry':
      return { ...state, retryTick: state.retryTick + 1 }
    case 'set-graph-view':
      return { ...state, graphView: typeof action.value === 'function' ? action.value(state.graphView) : action.value }
    case 'set-show-snapshot':
      return {
        ...state,
        showSnapshotPlan: typeof action.value === 'function' ? action.value(state.showSnapshotPlan) : action.value,
      }
    case 'snapshot-idle':
      return { ...state, snapshotState: 'idle' }
    case 'snapshot-missing':
      return { ...state, snapshotState: 'missing', snapshotPlan: null }
    case 'snapshot-loading':
      return { ...state, snapshotState: 'loading', snapshotPlan: null }
    case 'snapshot-failed':
      return { ...state, snapshotState: action.state, snapshotPlan: null }
    case 'snapshot-ready':
      return { ...state, snapshotState: 'ready', snapshotPlan: action.plan }
    default:
      return assertNever(action)
  }
}
