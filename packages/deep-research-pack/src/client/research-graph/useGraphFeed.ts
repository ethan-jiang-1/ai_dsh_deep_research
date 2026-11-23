// useGraphFeed.ts — 「研究图谱」页签的**数据装配**（journal 绑定 / plan.md 与快照读取），
// 从 721 行的页签体里切出（2026-10-28 Phase C）。与 useStatusFeed 同一刀法：页签体只负责
// "画"（节点列表、详情、结构提示），取数与失败降级全在本层。
//
// 失败语义沿用两条既有原则：
//   ① 读不到 ≠ 没有（BUG-045）：journal 绑定失败落 `followError` 并对可恢复错误做有界重试，
//      绝不落回"未绑定"空态；
//   ② 缺文件是合法形态：plan.md 缺席 → `planState='missing'`，旧图快照缺席 → 如实 missing。
import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PlanIndex } from '../../lib/plan/plan-index.ts'
import { planIndex } from '../../lib/plan/plan-index.ts'
import { bindingTrust } from '../../lib/run/binding-trust.ts'
import { openRun, type RunView } from '../../lib/run/run-context.ts'
import { readArtifact, readStateOf, type SourceRead } from '../../lib/run/artifact-read.ts'
import { INITIAL_GRAPH_FEED_STATE, reduceGraphFeed, type PlanState, type SnapshotState } from './graph-state.ts'
import type { ResearchGraphTabProps } from './types.ts'

/** `plan/` 目录列举的最小三态（读失败不得冒充缺席）。 */
type PlanListing = { readonly ok: true; readonly value: readonly { readonly type: string; readonly name: string }[] } | { readonly ok: false; readonly reason: 'missing' | 'unreadable' } | null

/** plan.md 重读间隔（任务靠投影推送；只有文件需要低频重扫）。 */
const PLAN_REFRESH_MS = 5_000

export interface GraphFeed {
  readonly boundSlug: string | null
  readonly plan: PlanIndex | null
  readonly planText: string | null
  readonly planState: PlanState
  readonly retry: () => void
  readonly planVersion: number | null
  readonly snapshots: readonly number[]
  readonly snapshotsState: SourceRead
  /** `plan/` 里最高快照号（无快照 = null）；旧图轨与按钮文案都用它。 */
  readonly latestSnapshot: number | null
  readonly graphView: 'current' | 'diff'
  readonly setGraphView: Dispatch<SetStateAction<'current' | 'diff'>>
  readonly snapshotPlan: PlanIndex | null
  readonly snapshotState: SnapshotState
  readonly showSnapshotPlan: boolean
  readonly setShowSnapshotPlan: Dispatch<SetStateAction<boolean>>
  readonly planLoadedAt: number | null
  readonly followError: string | null
}

/**
 * @param props 页签 props（runSource / follow 注入面）。
 * @param leadSessionId teammate 时读 Lead 的会话（与页签体的团队投影同源）。
 */
export function useGraphFeed(props: ResearchGraphTabProps, leadSessionId: SessionId): GraphFeed {
  const { follow, runSource } = props
  const [state, dispatch] = useReducer(reduceGraphFeed, INITIAL_GRAPH_FEED_STATE)
  const {
    boundSlug, followError, followAttempt, plan, planText, planState, retryTick,
    planVersion, snapshots, graphView, snapshotPlan, snapshotState, showSnapshotPlan, planLoadedAt,
    snapshotsState,
  } = state
  const viewRef = useRef<RunView | null>(null)
  const setGraphView = useCallback<Dispatch<SetStateAction<'current' | 'diff'>>>((value) => {
    dispatch({ kind: 'set-graph-view', value })
  }, [])
  const setShowSnapshotPlan = useCallback<Dispatch<SetStateAction<boolean>>>((value) => {
    dispatch({ kind: 'set-show-snapshot', value })
  }, [])
  const retry = useCallback(() => { dispatch({ kind: 'plan-retry' }) }, [])

  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let events: unknown[] = []
    let lastSlug: string | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    dispatch({ kind: 'follow-start' })
    void (async () => {
      try {
        for await (const frame of follow(leadSessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          const trust = bindingTrust(events)
          const nextSlug = trust.kind === 'bound' ? trust.slug : null
          if (nextSlug !== lastSlug) {
            lastSlug = nextSlug
            if (!stopped) dispatch({ kind: 'bind-slug', slug: nextSlug })
          }
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        const message = String((cause as { message?: unknown })?.message ?? cause)
        console.error('[research-graph] journal follow 失败', message)
        // 瞬时断连（Remote stream WebSocket closed 族）此前静默落成"本会话未绑定 run"——
        // 与真实未绑定不可分辨（BUG-045）。有界重试 3 次（2s 间隔）；仍失败则保留错误态，
        // 由图面如实说"读不到 ≠ 没有 run"。
        if (!stopped) dispatch({ kind: 'follow-error', message: message.slice(0, 160) })
        if (followAttempt < 3) {
          retryTimer = setTimeout(() => { if (!stopped) dispatch({ kind: 'follow-retry' }) }, 2_000)
        }
      }
    })()
    return () => { stopped = true; controller.abort(); if (retryTimer !== undefined) clearTimeout(retryTimer) }
  }, [leadSessionId, follow, followAttempt])

  // plan.md 可选读：缺文件/读失败都降级 missing（不阻塞图；任务真相仍来自投影）。
  // 基址必须带 `drt_<slug>/`（三位置回退）——workspace 根没有 plan.md。
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let timer: ReturnType<typeof setInterval> | undefined
    if (boundSlug === null) {
      viewRef.current = null
      dispatch({ kind: 'plan-unbound' })
      return () => { stopped = true; controller.abort() }
    }
    dispatch({ kind: 'plan-loading' })
    const load = async (): Promise<void> => {
      try {
        const opened = await openRun(runSource(leadSessionId), `drt_${boundSlug}`, { signal: controller.signal })
        if (stopped) return
        if (!opened.ok) {
          viewRef.current = null
          dispatch({ kind: 'plan-error' })
          return
        }
        const view = opened.value
        const planArt = await readArtifact(view, 'plan.md', { signal: controller.signal })
        if (stopped) return
        viewRef.current = view
        if (planArt.truncated) {
          dispatch({ kind: 'plan-truncated', loadedAt: Date.now() })
          return
        }
        if (planArt.state === 'absent') {
          dispatch({ kind: 'plan-missing' })
          return
        }
        if (planArt.state !== 'ok' || planArt.text === null) {
          dispatch({ kind: 'plan-error' })
          return
        }
        const text = planArt.text
        const parsed = planIndex(text)
        const rawVersion = parsed.version?.replace(/^v/i, '') ?? ''
        // 快照目录读取态（BUG-390）：list 抛错 ≠ 目录不存在。抛错记 unreadable，
        // 目录不在场才是 absent——两者都不能折成「没有快照」。
        let planList: PlanListing = null
        if (view.names.has('plan')) {
          try {
            planList = await view.list('plan', { signal: controller.signal })
          } catch {
            planList = { ok: false, reason: 'unreadable' }
          }
        }
        if (stopped) return
        const listedState = readStateOf(planList)
        const found = (planList?.ok === true ? planList.value : [])
          .map((entry) => /^v([1-9]\d*)\.md$/.exec(entry.name)?.[1])
          .filter((raw): raw is string => raw !== undefined)
          .map(Number)
          .sort((a, b) => a - b)
        dispatch({
          kind: 'plan-ready',
          plan: parsed,
          planText: text,
          loadedAt: Date.now(),
          // 版本号取 plan 解析器（已按“最后一条声明”）的结论，不另写一份正则。
          planVersion: /^\d+$/.test(rawVersion) ? Number(rawVersion) : null,
          snapshots: found,
          snapshotsState: listedState,
        })
      } catch (cause) {
        if (stopped) return
        viewRef.current = null
        dispatch({ kind: 'plan-error' })
        console.error('[research-graph] plan.md 读取失败', String(cause))
      }
    }
    void load()
    timer = setInterval(() => { void load() }, PLAN_REFRESH_MS)
    return () => { stopped = true; controller.abort(); if (timer !== undefined) clearInterval(timer) }
  }, [leadSessionId, boundSlug, runSource, retryTick])

  // 旧图快照按需读（没有快照就不读；`plan/vN.md` 不在场就如实 missing）。
  const latestSnapshot = snapshots.length > 0 ? (snapshots[snapshots.length - 1] ?? null) : null
  useEffect(() => {
    if (graphView !== 'diff' && !showSnapshotPlan) { dispatch({ kind: 'snapshot-idle' }); return }
    const view = viewRef.current
    if (view === null || latestSnapshot === null) { dispatch({ kind: 'snapshot-missing' }); return }
    let stopped = false
    const controller = new AbortController()
    dispatch({ kind: 'snapshot-loading' })
    void (async () => {
      const art = await readArtifact(view, `plan/v${String(latestSnapshot)}.md`, { signal: controller.signal })
      if (stopped) return
      if (art.state === 'absent') { dispatch({ kind: 'snapshot-missing' }); return }
      if (art.state === 'empty') { dispatch({ kind: 'snapshot-failed', state: 'empty' }); return }
      if (art.state === 'unreadable') { dispatch({ kind: 'snapshot-failed', state: 'unreadable' }); return }
      if (art.state !== 'ok' || art.text === null) { dispatch({ kind: 'snapshot-failed', state: 'invalid' }); return }
      const parsed = planIndex(art.text)
      if (parsed.topLevel.length === 0) { dispatch({ kind: 'snapshot-failed', state: 'invalid' }); return }
      dispatch({ kind: 'snapshot-ready', plan: parsed })
    })()
    return () => { stopped = true; controller.abort() }
  }, [graphView, showSnapshotPlan, latestSnapshot, leadSessionId, retryTick])

  return {
    boundSlug, plan, planText, planState, planVersion, snapshots, latestSnapshot, graphView, setGraphView,
    snapshotPlan, snapshotState, showSnapshotPlan, setShowSnapshotPlan, planLoadedAt, followError, retry,
    snapshotsState,
  }
}
