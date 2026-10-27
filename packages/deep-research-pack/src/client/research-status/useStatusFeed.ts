// useStatusFeed.ts —— 「研究状态」页签的**数据装配**（journal follow / bundle 扫描 / 绑定可信性 /
// 锚点与版本面折算），从 480 行的页签体里切出（2026-10-28 卫生轮 维度2）。
//
// 切这条缝的理由：页签体此前把"取数"与"画"混在一个函数里——改一次扫描节奏要在 480 行里找
// effect，改一次渲染又要越过 200 行 effect。现在本 hook 独占数据面，页签体只读它返回的事实并
// 渲染；折算仍全部住 `src/lib/` 纯函数（本层只做编排与 setState）。
//
// 失败语义不变：读不到一律降级为 null / 空态（fail-soft），控制台留因（console.error），
// 不把"读失败"渲染成"没有数据"——那是各视图自己的措辞责任（BUG-045 的原则）。
import { useEffect, useMemo, useRef, useState } from 'react'
import { deriveAnchors, foldHitlPending, type HitlState } from '../../lib/hitl-fold.ts'
import { deriveSteps, latestRunVersion } from '../../lib/run-fold.ts'
import { foldActivityRows, type ActivityRow } from '../../lib/activity-fold.ts'
import type { MemberActivitySummary } from '../../lib/member-activity.ts'
import { bindingTrust, type BindingTrust } from '../../lib/binding-trust.ts'
import { openRun } from '../../lib/run-context.ts'
import { streamFailureOf } from '../../lib/stream-failure.ts'
import { latestFinalDelivery, latestPresentedFinalVersion } from '../../lib/final-target.ts'
import { runVersionFaceOf, type RunVersionFace } from '../../lib/run-version.ts'
import { terminalReadiness } from '../../lib/review-readiness.ts'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { useMemberActivity } from './useMemberActivity.ts'
import type { ResearchStatusTabProps } from './types.ts'
import type { BundleFace } from './types.ts'

/** 30s 重扫间隔（bundle 文件变化不高频；团队面板同款节奏）。 */
const REFRESH_MS = 30_000

/** 绑定可信性的值键（状态页全值比对重扫用：kind/slug/reason 任一变化都要重扫）。 */
function trustKey(trust: BindingTrust): string {
  if (trust.kind === 'bound') return `bound:${trust.slug}:${trust.boundBy}`
  if (trust.kind === 'suppressed') return `suppressed:${trust.slug}:${trust.reason}`
  return 'unbound'
}

export interface StatusFeed {
  readonly rows: readonly ActivityRow[]
  readonly hitl: HitlState
  readonly journalEvents: readonly unknown[]
  readonly face: BundleFace | null
  readonly unbound: boolean
  readonly trust: BindingTrust
  readonly journalSeen: boolean
  readonly kickoffHold: boolean
  readonly error: string | null
  readonly memberSummaries: Readonly<Record<string, MemberActivitySummary>>
  readonly team: TeamProjection | undefined
  readonly members: TeamProjection['members']
  readonly delivery: ReturnType<typeof latestFinalDelivery>
  readonly streamFailure: ReturnType<typeof streamFailureOf>
  readonly anchors: ReturnType<typeof deriveAnchors>
  readonly versionFace: RunVersionFace | null
}

export function useStatusFeed(props: ResearchStatusTabProps): StatusFeed {
  const [rows, setRows] = useState<readonly ActivityRow[]>([])
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const [journalEvents, setJournalEvents] = useState<readonly unknown[]>([])
  const [face, setFace] = useState<BundleFace | null>(null)
  const [unbound, setUnbound] = useState(false)
  const [trust, setTrust] = useState<BindingTrust>({ kind: 'unbound' })
  const [journalSeen, setJournalSeen] = useState(false)
  const [kickoffHold, setKickoffHold] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trustRef = useRef<BindingTrust>({ kind: 'unbound' })
  const prevPending = useRef(false)
  // 观察连续性（UX 清扫 F1，2026-09-30）：vendor 在切换会话时收起右栏——观察面板每次
  // 切换丢失。旧会话正被观察（绑定/挂起）时，切换后重开状态页签（revealStatusTab）。
  const prevSidRef = useRef<string | undefined>(undefined)
  const wasObservingRef = useRef(false)
  const [memberSummaries, setMemberSummaries] = useState<Readonly<Record<string, MemberActivitySummary>>>({})
  // ⑦ 队员 roster（agentTeam 投影——**按当前 sessionId 显式取**；队员会话 id 的唯一发现源，
  //    通道探明材料实证：spawn_teammate 返回不带 id）。2026-10-21 复跑实红：`useProjection`
  //    在切到没有 agentTeam 的会话时会保留上一条投影（活动流已切、队员区仍是别家的 roster）；
  //    改用 `useSessions` 按 sessionId 取，缺席即 undefined，不冒充。
  const useSessions = props.useSessions
  const team: TeamProjection | undefined = useSessions !== undefined
    ? useSessions((state) => props.sessionId === undefined
      ? undefined
      : state.projectionsBySession[props.sessionId]?.values.agentTeam)
    : undefined
  const members = team?.members.filter((m) => m.role === 'teammate') ?? []
  const memberIds = members.map((m) => m.id).sort().join(',')

  // ① journal 流 → 活动行 + HITL 谓词 + 会话绑定输入
  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined) return
    const controller = new AbortController()
    trustRef.current = { kind: 'unbound' }
    prevPending.current = false
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setJournalEvents(events)
          setJournalSeen(true)
          setRows(foldActivityRows(events))
          const next = foldHitlPending(events)
          setHitl(next)
          // 挂起信号显性化（RFC right-pane-ux-debt）：false→true 迁移时打开本页签——
          // openTab 落定时右栏同步骤展开；页签体折叠态保持挂载，观察者常在。
          if (next.pending && !prevPending.current) props.revealStatusTab()
          prevPending.current = next.pending
          const nextTrust = bindingTrust(events)
          // 全值比对（BUG-001 附带修复）：只比 slug 会漏 boundBy 翻转（同 slug 的 read→write，
          // rerun 场景）与抑制原因翻转（pending ↔ kickoff）——两者都改变渐进面判定。
          if (trustKey(nextTrust) !== trustKey(trustRef.current)) {
            trustRef.current = nextTrust
            setTrust(nextTrust)
          }
          // 观察连续性的采样点：旧会话的末态（绑定/抑制）在切换那一刻经此 ref 供切换效应读。
          wasObservingRef.current = nextTrust.kind !== 'unbound' || prevPending.current
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(String(cause))
      }
    })()
    return () => { controller.abort() }
  }, [props.sessionId])

  // 切换会话时重开状态页签（F1）：仅在"上一个会话正被观察"时触发；初始挂载与
  // 未观察会话之间的切换不动作（不覆盖用户刻意收起的常态——只在观察被切断时续上）。
  useEffect(() => {
    const prev = prevSidRef.current
    if (prev !== undefined && prev !== props.sessionId && wasObservingRef.current) {
      props.revealStatusTab()
    }
    prevSidRef.current = props.sessionId
  }, [props.sessionId])

  // ⑦ 队员动作流（member-activity-stream）：roster 变化即重开多路 follow。
  useMemberActivity({
    memberIds,
    sessionId: props.sessionId,
    follow: props.follow,
    setMemberSummaries,
  })

  // ② bundle 渐进面（绑定本会话的 run；slug 变化即扫 + 30s 定时——文件在场性不高频）
  // G4（RFC cockpit-flow-face）：read 弱绑定在挂起期不作渐进面依据——立项预检读取旧 bundle
  // 会错绑（2026-09-28 首跑实证）；挂起 + 仅读绑定 → 抑制面（此刻本 run 的 bundle 多半未
  // 实例化），写命中后 boundBy 变 write 自然恢复。恢复会话只读查询（无挂起）不受影响。
  // BUG-001（2026-09-30 用户报告）补第二窗口：非挂起期的立项轨道（预检读取 → ask 发出前、
  // ask 拍板后 → 落笔前）同样错呈旧 run——kickoffSeen（ask_user_question 调用或
  // research-brief skill 加载 = 本会话在开新 run）把整个立项轨道的仅读绑定都抑制。
  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined || trust.kind !== 'bound') {
      setFace(null)
      setUnbound(trust.kind === 'unbound' && journalSeen)
      setKickoffHold(trust.kind === 'suppressed' && trust.reason === 'kickoff')
      return
    }
    setUnbound(false)
    setKickoffHold(false)
    const boundSlug = trust.slug
    let stopped = false
    const scan = async (): Promise<void> => {
      try {
        const signal = new AbortController().signal
        const opened = await openRun(props.runSource(sessionId), `drt_${boundSlug}`, { signal })
        if (stopped) return
        if (!opened.ok) { setFace(null); return }
        const view = opened.value
        const names = view.names
        const evidenceDir = names.has('evidence') ? await view.list('evidence', { signal }) : null
        if (stopped) return
        const evidenceCount = evidenceDir !== null && evidenceDir.ok
          ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md')).length
          : 0
        const finalDir = names.has('final') ? await view.list('final', { signal }) : null
        if (stopped) return
        const finalFileNames = finalDir !== null && finalDir.ok
          ? finalDir.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
          : []
        const versions = latestRunVersion(finalFileNames)
        // 版本面事实：plan 头/重写记录 + plan/ 快照清单（rerun 版本轨的数据源，折算住 run-version）。
        const planRead = names.has('plan.md') ? await view.read('plan.md', { signal }) : null
        if (stopped) return
        const planText = planRead !== null && planRead.ok && !planRead.value.truncated ? planRead.value.text : null
        const planDir = names.has('plan') ? await view.list('plan', { signal }) : null
        if (stopped) return
        const planSnapshotNames = planDir !== null && planDir.ok
          ? planDir.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
          : []
        // review 终局 readiness（业务摘要审查态的数据源）：判定规则收在 pack lib
        // `review-readiness.terminalReadiness`——只认**行首**判定行、取最后一条。run-context
        // 的 review 策略是读到 eof：终局判定在文末，固定行窗会读到中段旧 FAIL（BUG-036 同族）。
        const reviewRead = names.has('review.md') ? await view.read('review.md', { signal }) : null
        if (stopped) return
        const reviewText = reviewRead !== null && reviewRead.ok && !reviewRead.value.truncated ? reviewRead.value.text : null
        const readiness = terminalReadiness(reviewText)
        const reviewFail = readiness === 'FAIL' ? true : readiness === 'PASS' ? false : null
        const questionRead = names.has('question.md') ? await view.read('question.md', { signal }) : null
        if (stopped) return
        const questionText = questionRead !== null && questionRead.ok ? questionRead.value.text : null
        // G3（RFC cockpit-flow-face）：剥 markdown 强调符再截断——`**` 与反引号是源文件
        // 标记不是内容；截断补省略号，不在字中间装作完整句。
        const raw = questionText?.split('\n').find((l) => l.trim() !== '' && !l.startsWith('#')) ?? null
        const flat = raw !== null ? raw.replace(/\*\*/g, '').replace(/`/g, '').trim() : null
        const firstLine = flat === null || flat === '' ? null : flat.length > 72 ? `${flat.slice(0, 72)}…` : flat
        setFace({
          questionLine: firstLine,
          hasQuestion: names.has('question.md'),
          steps: deriveSteps({
            question: names.has('question.md'),
            team: names.has('question.md'),
            leads: names.has('leads.md'),
            evidence: evidenceCount,
            findings: names.has('findings.md'),
            review: names.has('review.md'),
            final: names.has('final.md'),
          }),
          evidenceCount,
          delivered: names.has('final.md'),
          versions,
          reviewFail,
          planText,
          planSnapshotNames,
          questionText,
          finalFileNames,
          hasFinal: names.has('final.md'),
        })
      } catch (cause) { console.error('[research-status] scan 异常', String(cause)) }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, REFRESH_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [props.sessionId, trust, journalSeen, props.runSource])

  // 锚点 = 混合折算（尾窗约束的实测产物，RFC cockpit-flow-face）：passed 态由文件事实承载
  // （question.md/final.md 在场），pending 态由 journal 尾窗承载——face 缺席时退化为纯尾窗判定。
  // 交付事实（issue 2026-10-19）：`present` 声明 = 交付的机械判据（node-gate 门②）；`final.md`
  // 在场只说明"有终稿可审"（综合步就落盘），两者不可互相顶替——⑤ 的措辞与门都由此分流。
  const delivery = useMemo(() => latestFinalDelivery(journalEvents), [journalEvents])

  // 流畸形死亡（BUG-023 修复①）：journal 尾窗折算，与 HITL 挂起互斥显示（挂起时主横幅让位）。
  const streamFailure = useMemo(() => streamFailureOf(journalEvents), [journalEvents])
  const anchors = useMemo(
    () => deriveAnchors(journalEvents, face !== null ? { question: face.hasQuestion, delivered: face.delivered } : undefined),
    [journalEvents, face],
  )

  // rerun 版本面（只读投影）：交付版本由 present 见证 + `final/vN` 版本账推定；
  // `final.md` 是工作稿，不冒充已交付；交付由 `deliverables/presented` + final/vN 见证（D28）。
  const hitl2Pending = anchors.find((a) => a.key === 'anchor-2')?.state === 'pending'
  const versionFace: RunVersionFace | null = useMemo(
    () => face === null
      ? null
      : runVersionFaceOf({
        planText: face.planText,
        planSnapshotNames: face.planSnapshotNames,
        finalFileNames: face.finalFileNames,
        questionText: face.questionText,
        delivered: delivery !== null,
        deliveredVersion: latestPresentedFinalVersion(journalEvents),
        hitlPending: hitl2Pending,
        draftPresent: face.hasFinal,
      }),
    [face, delivery, hitl2Pending, journalEvents],
  )

  return {
    rows, hitl, journalEvents, face, unbound, trust, journalSeen, kickoffHold, error,
    memberSummaries, team, members, delivery, streamFailure, anchors, versionFace,
  }
}
