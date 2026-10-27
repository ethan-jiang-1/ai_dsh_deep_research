// useGraphFeed.ts — 「研究图谱」页签的**数据装配**（journal 绑定 / plan.md 与快照读取），
// 从 721 行的页签体里切出（2026-10-28 Phase C）。与 useStatusFeed 同一刀法：页签体只负责
// "画"（节点列表、详情、结构提示），取数与失败降级全在本层。
//
// 失败语义沿用两条既有原则：
//   ① 读不到 ≠ 没有（BUG-045）：journal 绑定失败落 `followError` 并对可恢复错误做有界重试，
//      绝不落回"未绑定"空态；
//   ② 缺文件是合法形态：plan.md 缺席 → `planState='missing'`，旧图快照缺席 → 如实 missing。
import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PlanIndex } from '../../lib/plan-index.ts'
import { planIndex } from '../../lib/plan-index.ts'
import { bindingTrust } from '../../lib/binding-trust.ts'
import { openRun, type RunView } from '../../lib/run-context.ts'
import type { ResearchGraphTabProps } from './types.ts'

/** plan.md 重读间隔（任务靠投影推送；只有文件需要低频重扫）。 */
const PLAN_REFRESH_MS = 5_000

export interface GraphFeed {
  readonly boundSlug: string | null
  readonly plan: PlanIndex | null
  readonly planText: string | null
  readonly planState: 'loading' | 'missing' | 'unbound' | 'ready' | 'truncated'
  readonly planVersion: number | null
  readonly snapshots: readonly number[]
  /** `plan/` 里最高快照号（无快照 = null）；旧图轨与按钮文案都用它。 */
  readonly latestSnapshot: number | null
  readonly graphView: 'current' | 'diff'
  readonly setGraphView: Dispatch<SetStateAction<'current' | 'diff'>>
  readonly snapshotPlan: PlanIndex | null
  readonly snapshotState: 'idle' | 'loading' | 'ready' | 'missing'
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
  const [boundSlug, setBoundSlug] = useState<string | null>(null)
  const viewRef = useRef<RunView | null>(null)
  const [plan, setPlan] = useState<PlanIndex | null>(null)
  const [planText, setPlanText] = useState<string | null>(null)
  const [planState, setPlanState] = useState<'loading' | 'missing' | 'unbound' | 'ready' | 'truncated'>('loading')
  // 版本轨（rerun 版本面）：plan 基址 + `plan/` 快照 + 当前图版本；view 只切只看，不改图。
  const [planVersion, setPlanVersion] = useState<number | null>(null)
  const [snapshots, setSnapshots] = useState<readonly number[]>([])
  const [graphView, setGraphView] = useState<'current' | 'diff'>('current')
  const [snapshotPlan, setSnapshotPlan] = useState<PlanIndex | null>(null)
  const [snapshotState, setSnapshotState] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle')
  const [showSnapshotPlan, setShowSnapshotPlan] = useState(false)
  // 最后成功读取 plan.md 的时刻：把“数据可能过期”显性化（BUG-043 §刷新），不把缺失当状态。
  const [planLoadedAt, setPlanLoadedAt] = useState<number | null>(null)
  // 绑定读取失败的显性态 + 有界重试计数（BUG-045）：瞬时断连曾与"本会话未绑定 run"同形。
  const [followError, setFollowError] = useState<string | null>(null)
  const [followAttempt, setFollowAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let events: unknown[] = []
    let lastSlug: string | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    setBoundSlug(null)
    setFollowError(null)
    void (async () => {
      try {
        for await (const frame of props.follow(leadSessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          const trust = bindingTrust(events)
          const nextSlug = trust.kind === 'bound' ? trust.slug : null
          if (nextSlug !== lastSlug) {
            lastSlug = nextSlug
            if (!stopped) setBoundSlug(nextSlug)
          }
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        const message = String((cause as { message?: unknown })?.message ?? cause)
        console.error('[research-graph] journal follow 失败', message)
        // 瞬时断连（Remote stream WebSocket closed 族）此前静默落成"本会话未绑定 run"——
        // 与真实未绑定不可分辨（BUG-045）。有界重试 3 次（2s 间隔）；仍失败则保留错误态，
        // 由图面如实说"读不到 ≠ 没有 run"。
        if (!stopped) setFollowError(message.slice(0, 160))
        if (followAttempt < 3) {
          retryTimer = setTimeout(() => { if (!stopped) setFollowAttempt((n) => n + 1) }, 2_000)
        }
      }
    })()
    return () => { stopped = true; controller.abort(); if (retryTimer !== undefined) clearTimeout(retryTimer) }
  }, [leadSessionId, followAttempt])

  // plan.md 可选读：缺文件/读失败都降级 missing（不阻塞图；任务真相仍来自投影）。
  // 基址必须带 `drt_<slug>/`（三位置回退）——workspace 根没有 plan.md。
  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let timer: ReturnType<typeof setInterval> | undefined
    setPlan(null)
    setPlanText(null)
    if (boundSlug === null) {
      setPlanLoadedAt(null)
      viewRef.current = null
      setPlanVersion(null)
      setSnapshots([])
      setGraphView('current')
      setSnapshotPlan(null)
      setSnapshotState('idle')
      setShowSnapshotPlan(false)
      setPlanState('unbound')
      return () => { stopped = true; controller.abort() }
    }
    setPlanState('loading')
    const load = async (): Promise<void> => {
      try {
        const opened = await openRun(props.runSource(leadSessionId), `drt_${boundSlug}`, { signal: controller.signal })
        if (stopped) return
        if (!opened.ok) {
          viewRef.current = null
          setPlan(null)
          setPlanText(null)
          setPlanState('missing')
          setPlanLoadedAt(null)
          return
        }
        const view = opened.value
        const read = await view.read('plan.md', { signal: controller.signal })
        if (stopped) return
        if (!read.ok) {
          viewRef.current = view
          setPlan(null)
          setPlanText(null)
          setPlanState('missing')
          setPlanLoadedAt(null)
          return
        }
        viewRef.current = view
        const text = read.value.text
        if (read.value.truncated) {
          setPlan(null)
          setPlanText(text)
          setPlanVersion(null)
          setSnapshots([])
          setPlanState('truncated')
          setPlanLoadedAt(Date.now())
          return
        }
        const parsed = planIndex(text)
        const rawVersion = parsed.version?.replace(/^v/i, '') ?? ''
        setPlan(parsed)
        setPlanText(text)
        setPlanState('ready')
        setPlanLoadedAt(Date.now())
        // 版本号取 plan 解析器（已按“最后一条声明”）的结论，不另写一份正则。
        setPlanVersion(/^\d+$/.test(rawVersion) ? Number(rawVersion) : null)
        const planList = view.names.has('plan')
          ? await view.list('plan', { signal: controller.signal }).catch(() => null)
          : null
        if (stopped) return
        const found = (planList?.ok === true ? planList.value : [])
          .map((entry) => /^v([1-9]\d*)\.md$/.exec(entry.name)?.[1])
          .filter((raw): raw is string => raw !== undefined)
          .map(Number)
          .sort((a, b) => a - b)
        setSnapshots(found)
      } catch (cause) {
        if (stopped) return
        viewRef.current = null
        setPlan(null)
        setPlanText(null)
        setPlanState('missing')
        setPlanLoadedAt(null)
        console.error('[research-graph] plan.md 读取失败', String(cause))
      }
    }
    void load()
    timer = setInterval(() => { void load() }, PLAN_REFRESH_MS)
    return () => { stopped = true; controller.abort(); if (timer !== undefined) clearInterval(timer) }
  }, [leadSessionId, boundSlug, props.runSource])

  // 旧图快照按需读（没有快照就不读；`plan/vN.md` 不在场就如实 missing）。
  const latestSnapshot = snapshots.length > 0 ? (snapshots[snapshots.length - 1] ?? null) : null
  useEffect(() => {
    if (graphView !== 'diff' && !showSnapshotPlan) { setSnapshotState('idle'); return }
    const view = viewRef.current
    if (view === null || latestSnapshot === null) { setSnapshotState('missing'); return }
    let stopped = false
    const controller = new AbortController()
    setSnapshotState('loading')
    setSnapshotPlan(null)
    void (async () => {
      const text = await view.read(`plan/v${String(latestSnapshot)}.md`, { signal: controller.signal })
      if (stopped) return
      if (!text.ok) { setSnapshotState('missing'); return }
      setSnapshotPlan(planIndex(text.value.text))
      setSnapshotState('ready')
    })()
    return () => { stopped = true; controller.abort() }
  }, [graphView, showSnapshotPlan, latestSnapshot, leadSessionId])

  return {
    boundSlug, plan, planText, planState, planVersion, snapshots, latestSnapshot, graphView, setGraphView,
    snapshotPlan, snapshotState, showSnapshotPlan, setShowSnapshotPlan, planLoadedAt, followError,
  }
}
