// useStatusFeed.ts —— 「研究状态」页签的**数据装配**（journal follow / bundle 扫描 / 绑定可信性 /
// 锚点与版本面折算），从 480 行的页签体里切出（2026-10-28 卫生轮 维度2）。
//
// 切这条缝的理由：页签体此前把"取数"与"画"混在一个函数里——改一次扫描节奏要在 480 行里找
// effect，改一次渲染又要越过 200 行 effect。现在本 hook 独占数据面，页签体只读它返回的事实并
// 渲染；折算仍全部住 `纯函数层` 纯函数（本层只做编排与 setState）。
//
// 失败语义不变：读不到一律降级为 null / 空态（fail-soft），控制台留因（console.error），
// 不把"读失败"渲染成"没有数据"——那是各视图自己的措辞责任（BUG-045 的原则）。
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type SetStateAction } from 'react'
import { deriveAnchors, foldHitlPending, type HitlState } from '../../lib/events/hitl-fold.ts'
import { deriveSteps, latestRunVersion } from '../../lib/run/run-fold.ts'
import { assertNever, artifactBodyIssueOf, readArtifact, readStateOf, type StatusReads } from '../../lib/run/artifact-read.ts'
import { hasBodyText, isEvidenceCard, isEvidenceCardName, questionBodyLineOf } from '../../lib/run/artifact-content.ts'
import { foldActivityRows, type ActivityRow } from '../../lib/events/activity-fold.ts'
import type { MemberActivitySummary } from '../../lib/events/member-activity.ts'
import { bindingTrust, type BindingTrust } from '../../lib/run/binding-trust.ts'
import { openRun } from '../../lib/run/run-context.ts'
import { streamFailureOf } from '../../lib/events/stream-failure.ts'
import { decodeDeliveredReceipt, deliveryFromReceipt, finalVersionOfPath, latestFinalDelivery, latestPresentedFinalVersion } from '../../lib/run/final-target.ts'
import { runHealthOf } from '../../lib/run/health.ts'
import { runVersionFaceOf, type RunVersionFace } from '../../lib/run/run-version.ts'
import { parseReadinessDeclaration, readinessOfSources, reviewVerdictOf, type ReviewVerdict } from '../../lib/review/review-readiness.ts'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { useMemberActivity } from './useMemberActivity.ts'
import { ABSENT_READS, INITIAL_STATUS_FEED_STATE, reduceStatusFeed } from './status-state.ts'
import type { BundleFace, ResearchStatusTabProps } from './types.ts'

/** 30s 重扫间隔（bundle 文件变化不高频；团队面板同款节奏）。 */
const REFRESH_MS = 30_000

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
  readonly reviewVerdict: ReviewVerdict
  /** 审查判据的细节（冲突/缺失原因）；只供视图文案，不参与分支。 */
  readonly reviewDetail: string | null
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
  const { sessionId, follow, runSource, revealStatusTab, t, useSessions } = props
  const [state, dispatch] = useReducer(reduceStatusFeed, INITIAL_STATUS_FEED_STATE)
  const {
    rows, hitl, journalEvents, face, unbound, trust, journalSeen, receiptDelivery,
    kickoffHold, error, reads, reviewVerdict, reviewDetail, scanSettled, memberSummaries,
  } = state
  // 时间推进面（BUG-351）：静默阈值必须能在观察期间跨过，不能把 now 冻在 memo 里。
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [retryNonce, setRetryNonce] = useState(0)
  const retry = useCallback(() => {
    dispatch({ kind: 'retry-requested' })
    setRetryNonce((n) => n + 1)
  }, [])
  const setMemberSummaries = useCallback((value: SetStateAction<Readonly<Record<string, MemberActivitySummary>>>) => {
    dispatch({ kind: 'member-summaries', value })
  }, [])
  const prevPending = useRef(false)
  // 观察连续性（UX 清扫 F1，2026-09-30）：vendor 在切换会话时收起右栏——观察面板每次
  // 切换丢失。旧会话正被观察（绑定/挂起）时，切换后重开状态页签（revealStatusTab）。
  const prevSidRef = useRef<string | undefined>(undefined)
  const wasObservingRef = useRef(false)
  // ⑦ 队员 roster（agentTeam 投影——**按当前 sessionId 显式取**；队员会话 id 的唯一发现源，
  //    通道探明材料实证：spawn_teammate 返回不带 id）。2026-10-21 复跑实红：`useProjection`
  //    在切到没有 agentTeam 的会话时会保留上一条投影（活动流已切、队员区仍是别家的 roster）；
  //    改用 `useSessions` 按 sessionId 取，缺席即 undefined，不冒充。
  const team: TeamProjection | undefined = useSessions((sessionsState) => sessionId === undefined
    ? undefined
    : sessionsState.projectionsBySession[sessionId]?.values.agentTeam)
  const members = team?.members.filter((m) => m.role === 'teammate') ?? []
  const memberIds = members.map((m) => m.id).sort().join(',')

  // ① journal 流 → 活动行 + HITL 谓词 + 会话绑定输入
  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    prevPending.current = false
    // 切换会话同步复位 journal 与 policy state（BUG-087/117）：旧 trust 会驱动新 session 的 bundle 扫描。
    dispatch({ kind: 'reset-session' })
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          const next = foldHitlPending(events)
          // 挂起信号显性化（RFC right-pane-ux-debt）：false→true 迁移时打开本页签——
          // openTab 落定时右栏同步骤展开；页签体折叠态保持挂载，观察者常在。
          if (next.pending && !prevPending.current) revealStatusTab()
          prevPending.current = next.pending
          const nextTrust = bindingTrust(events)
          dispatch({
            kind: 'journal-frame',
            events,
            rows: foldActivityRows(events, t),
            hitl: next,
            trust: nextTrust,
          })
          // 观察连续性的采样点：旧会话的末态（绑定/抑制）在切换那一刻经此 ref 供切换效应读。
          wasObservingRef.current = nextTrust.kind !== 'unbound' || prevPending.current
        }
      } catch (cause) {
        if (!controller.signal.aborted) dispatch({ kind: 'journal-error', message: String(cause) })
      }
    })()
    return () => { controller.abort() }
  }, [sessionId, follow, revealStatusTab, t])

  // 切换会话时重开状态页签（F1）：仅在"上一个会话正被观察"时触发；初始挂载与
  // 未观察会话之间的切换不动作（不覆盖用户刻意收起的常态——只在观察被切断时续上）。
  useEffect(() => {
    const prev = prevSidRef.current
    if (prev !== undefined && prev !== sessionId && wasObservingRef.current) {
      revealStatusTab()
    }
    prevSidRef.current = sessionId
  }, [sessionId, revealStatusTab])

  // ⑦ 队员动作流（member-activity-stream）：roster 变化即重开多路 follow。
  useMemberActivity({
    memberIds,
    sessionId,
    follow,
    t,
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
    if (sessionId === undefined || trust.kind !== 'bound') {
      dispatch({ kind: 'unsettled-trust', trust })
      return
    }
    dispatch({ kind: 'scan-started' })
    const boundSlug = trust.slug
    let stopped = false
    let scanController: AbortController | null = null
    const scan = async (): Promise<void> => {
      try {
        scanController?.abort()
        const currentController = new AbortController()
        scanController = currentController
        const { signal } = currentController
        const opened = await openRun(runSource(sessionId), `drt_${boundSlug}`, { signal })
        if (stopped) return
        if (!opened.ok) {
          dispatch({ kind: 'scan-bundle-failed', reads: { ...ABSENT_READS, bundle: readStateOf(opened) } })
          return
        }
        const view = opened.value
        const names = view.names
        const evidenceDir = names.has('evidence') ? await view.list('evidence', { signal }) : null
        if (stopped) return
        const evidenceState = readStateOf(evidenceDir)
        const evidenceEntries = evidenceState === 'ok' && evidenceDir !== null && evidenceDir.ok
          ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
          : []
        const evidenceFailedLog = evidenceEntries.some((entry) => entry.name === '_failed.md')
        let evidenceCount = 0
        let evidenceEmptyCount = 0
        let evidenceUnreadableCount = 0
        for (const entry of evidenceEntries.filter((item) => isEvidenceCardName(item.name))) {
          const card = await readArtifact(view, `evidence/${entry.name}`, { signal })
          if (stopped) return
          if (card.state === 'ok' && card.text !== null && isEvidenceCard(card.text)) evidenceCount += 1
          else if (card.state === 'unreadable' || card.state === 'invalid') evidenceUnreadableCount += 1
          else evidenceEmptyCount += 1
        }
        const finalDir = names.has('final') ? await view.list('final', { signal }) : null
        if (stopped) return
        const finalState = readStateOf(finalDir)
        const finalFileNames = finalDir !== null && finalDir.ok
          ? finalDir.value.filter((entry) => entry.type === 'file').map((entry) => entry.name)
          : []
        const leadsArt = await readArtifact(view, 'leads.md', { signal })
        if (stopped) return
        const findingsArt = await readArtifact(view, 'findings.md', { signal })
        if (stopped) return
        // 回执（持久事实）：统一工件读取 + 边界解码器；只有 ok 才尝试 deliveryFromReceipt（invalid/empty/unreadable
        // 不冒充缺席，出「回执读取失败/不合法」提示）。
        const receiptArt = await readArtifact(view, 'delivered.json', { signal, decoder: decodeDeliveredReceipt })
        if (stopped) return
        const nextReceiptDelivery = receiptArt.state === 'ok' ? deliveryFromReceipt(receiptArt.value, boundSlug) : null
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
        // 终局 readiness 与门禁同源（D51）：声明件优先（边界 Decoder 验证 schema + 重复键），散文只做副本。
        const readinessArt = await readArtifact(view, 'review/readiness.json', { signal, decoder: (_raw, rawText) => parseReadinessDeclaration(rawText) })
        if (stopped) return
        const declarationText = readinessArt.state === 'ok' ? readinessArt.text : null
        const reading = readinessOfSources({ reviewText, declarationText, hasReviewDir: names.has('review') })
        // 结论未定：空/读失败的 review 或 readiness 声明；或 readiness 的 missing/invalid/mismatch/ambiguous。
        // 不把非 declaration/prose 的 source 折成 null 后让步骤条按 read ok 给 ✓（BUG-363/366）。
        const nextReviewVerdict = reviewVerdictOf(reading, { review: reviewArt.state, readiness: readinessArt.state })
        const reviewFail = (() => {
          switch (nextReviewVerdict) {
            case 'fail': return true
            case 'pass': return false
            case 'conflict':
            case 'unconfirmed':
            case 'absent':
              return null
            default:
              return assertNever(nextReviewVerdict)
          }
        })()
        const questionArt = await readArtifact(view, 'question.md', { signal })
        if (stopped) return
        const questionText = questionArt.state === 'ok' ? questionArt.text : null
        const questionBody = questionBodyLineOf(questionText)
        const raw = questionBody
        const flat = raw
        const firstLine = flat === null || flat === '' ? null : flat.length > 72 ? `${flat.slice(0, 72)}…` : flat
        const questionIssue = artifactBodyIssueOf(questionArt.state, questionBody !== null)
        const leadsBody = leadsArt.state === 'ok' && hasBodyText(leadsArt.text)
        const findingsBody = findingsArt.state === 'ok' && hasBodyText(findingsArt.text)
        const finalArt = await readArtifact(view, 'final.md', { signal })
        if (stopped) return
        const finalBody = finalArt.state === 'ok' && hasBodyText(finalArt.text)
        const leadsIssue = artifactBodyIssueOf(leadsArt.state, leadsBody)
        const findingsIssue = artifactBodyIssueOf(findingsArt.state, findingsBody)
        const evidenceIssue = evidenceState === 'unreadable'
          ? 'unreadable'
          : evidenceCount === 0 && (evidenceEntries.length > 0 || evidenceFailedLog)
            ? (evidenceUnreadableCount > 0 ? 'unreadable' : evidenceFailedLog && evidenceEmptyCount === 0 ? 'failed-only' : 'empty')
            : null
        dispatch({
          kind: 'scan-succeeded',
          receiptDelivery: nextReceiptDelivery,
          reviewVerdict: nextReviewVerdict,
          reviewDetail: reading.detail ?? null,
          reads: {
            bundle: 'ok',
            question: questionArt.state,
            review: reviewArt.state,
            readiness: readinessArt.state,
            evidence: evidenceState,
            plan: planArt.state,
            leads: leadsArt.state,
            findings: findingsArt.state,
            final: finalState,
            receipt: receiptArt.state,
          },
          // G3（RFC cockpit-flow-face）：剥 markdown 强调符再截断——`**` 与反引号是源文件
          // 标记不是内容；截断补省略号，不在字中间装作完整句。
          face: {
            questionLine: firstLine,
            questionIssue,
            hasQuestion: questionArt.state === 'ok' && questionBody !== null,
            leadsIssue,
            findingsIssue,
            evidenceIssue,
            // 部分卡读失败不得因为「至少有一张可读」被吞掉（BUG-388）：计数照给可读卡，另记缺口数。
            evidenceUnreadable: evidenceUnreadableCount,
            finalBodyIssue: artifactBodyIssueOf(finalArt.state, finalBody),
            steps: deriveSteps({
              question: questionIssue !== null ? 'unknown' : (questionArt.state === 'ok' && questionBody !== null ? 'present' : 'absent'),
              team: questionArt.state === 'ok' && questionBody !== null ? 'present' : 'absent',
              leads: leadsIssue !== null ? 'unknown' : (leadsBody ? 'present' : 'absent'),
              evidence: evidenceIssue !== null ? 'unknown' : evidenceCount,
              findings: findingsIssue !== null ? 'unknown' : (findingsBody ? 'present' : 'absent'),
              review: nextReviewVerdict === 'unconfirmed' || nextReviewVerdict === 'conflict'
                ? 'unknown'
                : (nextReviewVerdict === 'pass' || nextReviewVerdict === 'fail' ? 'present' : 'absent'),
              final: finalBody ? 'present' : 'absent',
            }, t),
            evidenceCount,
            delivered: finalBody,
            versions,
            reviewFail,
            planText,
            planSnapshotNames,
            questionText,
            finalFileNames,
            hasFinal: finalBody,
          },
        })
      } catch (cause) {
        console.error('[research-status] scan 异常', String(cause))
        if (stopped) return
        dispatch({ kind: 'scan-threw' })
      }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, REFRESH_MS)
    return () => { stopped = true; clearInterval(timer); scanController?.abort() }
  }, [sessionId, trust, journalSeen, runSource, t, retryNonce])

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
    () => deriveAnchors(journalEvents, face !== null ? { question: face.hasQuestion, delivered: delivery !== null } : undefined, t),
    [journalEvents, face, delivery, t],
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
    rows, hitl, journalEvents, face, unbound, trust, journalSeen, kickoffHold, error, reads, reviewVerdict, reviewDetail, scanSettled, retry,
    memberSummaries, team, members, delivery, streamFailure, anchors, health, versionFace,
  }
}
