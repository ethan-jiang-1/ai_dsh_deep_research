// useStatusFeed.ts —— 「研究状态」页签的**数据装配**（journal follow / bundle 扫描 / 绑定可信性 /
// 锚点与版本面折算），从 480 行的页签体里切出（2026-10-28 卫生轮 维度2）。
//
// 切这条缝的理由：页签体此前把"取数"与"画"混在一个函数里——改一次扫描节奏要在 480 行里找
// effect，改一次渲染又要越过 200 行 effect。现在本 hook 独占数据面，页签体只读它返回的事实并
// 渲染；折算仍全部住 `纯函数层` 纯函数（本层只做编排与 setState）。
//
// 失败语义不变：读不到一律降级为 null / 空态（fail-soft），控制台留因（console.error），
// 不把"读失败"渲染成"没有数据"——那是各视图自己的措辞责任（BUG-045 的原则）。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deriveAnchors, foldHitlPending, type HitlState } from '../../lib/events/hitl-fold.ts'
import { deriveSteps, latestRunVersion } from '../../lib/run/run-fold.ts'
import { readArtifact, readStateOf, type StatusReads } from '../../lib/run/artifact-read.ts'
import { foldActivityRows, type ActivityRow } from '../../lib/events/activity-fold.ts'
import type { MemberActivitySummary } from '../../lib/events/member-activity.ts'
import { bindingTrust, type BindingTrust } from '../../lib/run/binding-trust.ts'
import { openRun } from '../../lib/run/run-context.ts'
import { streamFailureOf } from '../../lib/events/stream-failure.ts'
import { deliveryFromReceipt, finalVersionOfPath, latestFinalDelivery, latestPresentedFinalVersion } from '../../lib/run/final-target.ts'
import { runHealthOf } from '../../lib/run/health.ts'
import { runVersionFaceOf, type RunVersionFace } from '../../lib/run/run-version.ts'
import { readinessOfSources } from '../../lib/review/review-readiness.ts'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { useMemberActivity } from './useMemberActivity.ts'
import type { ResearchStatusTabProps } from './types.ts'
import type { BundleFace } from './types.ts'

/** 30s 重扫间隔（bundle 文件变化不高频；团队面板同款节奏）。 */
const REFRESH_MS = 30_000

/** 初始/无绑定时的读取态：六个事实都还没有读到。 */
const ABSENT_READS: StatusReads = {
  bundle: 'absent', question: 'absent', review: 'absent', readiness: 'absent', evidence: 'absent', receipt: 'absent',
}

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
  /** 六个显示事实的读取态（bundle/question/review/readiness/evidence/receipt）。 */
  readonly reads: StatusReads
  /** 审查终局判定（pass/fail/unconfirmed/absent）；unconfirmed 不得给 ✓（BUG-363/366）。 */
  readonly reviewVerdict: 'pass' | 'fail' | 'unconfirmed' | 'absent'
  /** 首次扫描是否已落定；未落定不把「还没读到」显示成「读取失败」。 */
  readonly scanSettled: boolean
  /** 重扫一次（失败横幅的「重试」）。 */
  readonly retry: () => void
  readonly memberSummaries: Readonly<Record<string, MemberActivitySummary>>
  readonly team: TeamProjection | undefined
  readonly members: TeamProjection['members']
  readonly delivery: ReturnType<typeof latestFinalDelivery>
  readonly streamFailure: ReturnType<typeof streamFailureOf>
  readonly anchors: ReturnType<typeof deriveAnchors>
  readonly health: ReturnType<typeof runHealthOf> | null
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
  // 交付回执兜底（D51）：会话窗口可能不含旧的 present 事件；回执是持久事实。
  const [receiptDelivery, setReceiptDelivery] = useState<ReturnType<typeof deliveryFromReceipt> | null>(null)
  // 时间推进面（BUG-351）：静默阈值必须能在观察期间跨过，不能把 now 冻在 memo 里。
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [kickoffHold, setKickoffHold] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reads, setReads] = useState<StatusReads>(ABSENT_READS)
  const [reviewVerdict, setReviewVerdict] = useState<'pass' | 'fail' | 'unconfirmed' | 'absent'>('absent')
  const [scanSettled, setScanSettled] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const retry = useCallback(() => { setScanSettled(false); setRetryNonce((n) => n + 1) }, [])
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
    setJournalEvents([])
    setRows([])
    setJournalSeen(false)
    setHitl({ pending: false, since: undefined })
    setError(null)
    // policy state 也必须复位：旧 trust 会驱动新 session 的 bundle 扫描（BUG-117）。
    setTrust({ kind: 'unbound' })
    setFace(null)
    setUnbound(false)
    setKickoffHold(false)
    setReads(ABSENT_READS)
    setReviewVerdict('absent')
    setScanSettled(false)
    setMemberSummaries({})
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setJournalEvents(events)
          setJournalSeen(true)
          setRows(foldActivityRows(events, props.t))
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
  }, [props.sessionId, props.t])

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
    t: props.t,
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
      setReceiptDelivery(null)
      setReads(ABSENT_READS)
      setScanSettled(false)
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
        if (!opened.ok) {
          setFace(null)
          setReceiptDelivery(null)
          setReads({ ...ABSENT_READS, bundle: readStateOf(opened) })
          setReviewVerdict('absent')
          setScanSettled(true)
          return
        }
        const view = opened.value
        const names = view.names
        const evidenceDir = names.has('evidence') ? await view.list('evidence', { signal }) : null
        if (stopped) return
        const evidenceState = readStateOf(evidenceDir)
        const evidenceCount = evidenceState === 'ok' && evidenceDir !== null && evidenceDir.ok
          ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md')).length
          : 0
        const finalDir = names.has('final') ? await view.list('final', { signal }) : null
        if (stopped) return
        const finalFileNames = finalDir !== null && finalDir.ok
          ? finalDir.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
          : []
        // 回执（持久事实）：统一工件读取；只有 ok 才尝试 deliveryFromReceipt（invalid/empty/unreadable
        // 不冒充缺席，P3 再出「回执读取失败/不合法」提示）。
        const receiptArt = await readArtifact(view, 'delivered.json', { signal })
        if (stopped) return
        setReceiptDelivery(receiptArt.state === 'ok' ? deliveryFromReceipt(receiptArt.json, boundSlug) : null)
        const versions = latestRunVersion(finalFileNames)
        // 版本面事实：plan 头/重写记录 + plan/ 快照清单（rerun 版本轨的数据源，折算住 run-version）。
        const planArt = await readArtifact(view, 'plan.md', { signal })
        if (stopped) return
        const planText = planArt.state === 'ok' ? planArt.text : null
        const planDir = names.has('plan') ? await view.list('plan', { signal }) : null
        if (stopped) return
        const planSnapshotNames = planDir !== null && planDir.ok
          ? planDir.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
          : []
        // review 终局 readiness（业务摘要审查态的数据源）：判定规则收在 pack lib
        // `review-readiness.terminalReadiness`——只认**行首**判定行、取最后一条。run-context
        // 的 review 策略是读到 eof：终局判定在文末，固定行窗会读到中段旧 FAIL（BUG-036 同族）。
        const reviewArt = await readArtifact(view, 'review.md', { signal })
        if (stopped) return
        const reviewText = reviewArt.state === 'ok' ? reviewArt.text : null
        // 终局 readiness 与门禁同源（D51）：声明件优先，散文只做副本；无 review/ 的旧场回退散文。
        const readinessArt = await readArtifact(view, 'review/readiness.json', { signal })
        if (stopped) return
        const declarationText = readinessArt.state === 'ok' ? readinessArt.text : null
        const reading = readinessOfSources({ reviewText, declarationText, hasReviewDir: names.has('review') })
        // 结论未定：空/读失败的 review 或 readiness 声明；或 readiness 的 missing/invalid/mismatch/ambiguous。
        // 不把非 declaration/prose 的 source 折成 null 后让步骤条按 read ok 给 ✓（BUG-363/366）。
        const reviewVerdict: 'pass' | 'fail' | 'unconfirmed' | 'absent' =
          reviewArt.state === 'empty' || reviewArt.state === 'unreadable'
            ? 'unconfirmed'
            : readinessArt.state === 'empty' || readinessArt.state === 'unreadable' || readinessArt.state === 'invalid'
              ? 'unconfirmed'
              : reading.source === 'absent'
                ? 'absent'
                : (reading.source === 'declaration' || reading.source === 'prose') && typeof reading.pass === 'boolean'
                  ? (reading.pass ? 'pass' : 'fail')
                  : 'unconfirmed'
        const reviewFail = reviewVerdict === 'fail' ? true : reviewVerdict === 'pass' ? false : null
        setReviewVerdict(reviewVerdict)
        const questionArt = await readArtifact(view, 'question.md', { signal })
        if (stopped) return
        const questionText = questionArt.state === 'ok' ? questionArt.text : null
        setReads({
          bundle: 'ok',
          question: questionArt.state,
          review: reviewArt.state,
          readiness: readinessArt.state,
          evidence: evidenceState,
          receipt: receiptArt.state,
        })
        setScanSettled(true)
        // G3（RFC cockpit-flow-face）：剥 markdown 强调符再截断——`**` 与反引号是源文件
        // 标记不是内容；截断补省略号，不在字中间装作完整句。
        const raw = questionText?.split('\n').find((l) => l.trim() !== '' && !l.startsWith('#')) ?? null
        const flat = raw !== null ? raw.replace(/\*\*/g, '').replace(/`/g, '').trim() : null
        const firstLine = flat === null || flat === '' ? null : flat.length > 72 ? `${flat.slice(0, 72)}…` : flat
        setFace({
          questionLine: firstLine,
          hasQuestion: questionArt.state === 'ok',
          steps: deriveSteps({
            question: questionArt.state === 'ok',
            team: questionArt.state === 'ok',
            leads: view.hasFile('leads.md'),
            evidence: evidenceCount,
            findings: view.hasFile('findings.md'),
            review: reviewVerdict !== 'unconfirmed',
            final: view.hasFile('final.md'),
            unknown: [
              ...(questionArt.state === 'empty' || questionArt.state === 'unreadable' ? ['question'] : []),
              ...(evidenceState === 'unreadable' ? ['evidence'] : []),
              ...(reviewVerdict === 'unconfirmed' ? ['review'] : []),
            ],
          }, props.t),
          evidenceCount,
          delivered: view.hasFile('final.md'),
          versions,
          reviewFail,
          planText,
          planSnapshotNames,
          questionText,
          finalFileNames,
          hasFinal: view.hasFile('final.md'),
        })
      } catch (cause) {
        console.error('[research-status] scan 异常', String(cause))
        if (stopped) return
        setFace(null)
        setReceiptDelivery(null)
        setReads({ ...ABSENT_READS, bundle: 'unreadable' })
        setReviewVerdict('absent')
        setScanSettled(true)
      }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, REFRESH_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [props.sessionId, trust, journalSeen, props.runSource, props.t, retryNonce])

  // 锚点 = 混合折算（尾窗约束的实测产物，RFC cockpit-flow-face）：passed 态由文件事实承载
  // （question.md/final.md 在场），pending 态由 journal 尾窗承载——face 缺席时退化为纯尾窗判定。
  // 交付事实（issue 2026-10-19）：`present` 声明 = 交付的机械判据（node-gate 门②）；`final.md`
  // 在场只说明"有终稿可审"（综合步就落盘），两者不可互相顶替——⑤ 的措辞与门都由此分流。
  const cwd = props.sessionId === undefined ? undefined : props.runSource(props.sessionId).root
  const delivery = useMemo(() => latestFinalDelivery(journalEvents, cwd) ?? receiptDelivery, [journalEvents, cwd, receiptDelivery])

  // 流畸形死亡（BUG-023 修复①）：journal 尾窗折算，与 HITL 挂起互斥显示（挂起时主横幅让位）。
  const streamFailure = useMemo(() => streamFailureOf(journalEvents), [journalEvents])
  // 停摆判据（BUG-348）：派生自事件流，不写文件；与 watch-run 同一 fold。
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  const health = useMemo(() => (journalEvents.length === 0 ? null : runHealthOf(journalEvents, { now: nowTick })), [journalEvents, nowTick])
  const anchors = useMemo(
    () => deriveAnchors(journalEvents, face !== null ? { question: face.hasQuestion, delivered: delivery !== null } : undefined, props.t),
    [journalEvents, face, props.t],
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
        deliveredVersion: latestPresentedFinalVersion(journalEvents, cwd) ?? finalVersionOfPath(delivery?.path),
        hitlPending: hitl2Pending,
        draftPresent: face.hasFinal,
      }, props.t),
    [face, delivery, hitl2Pending, journalEvents, props.t, cwd],
  )

  return {
    rows, hitl, journalEvents, face, unbound, trust, journalSeen, kickoffHold, error, reads, reviewVerdict, scanSettled, retry,
    memberSummaries, team, members, delivery, streamFailure, anchors, health, versionFace,
  }
}
