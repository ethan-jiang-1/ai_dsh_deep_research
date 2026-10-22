/**
 * 「研究状态」页签体（UI 优先版：把界面弄对——RFC research-status-ui）。
 *
 * 自上而下七区（一眼回答"研究到哪了、谁在干什么、等没等我、我在哪出手"）：
 *   ① HITL 挂起横幅（点名锚点 + 参与指引——hitl-fold.deriveAnchors）；
 *   ② 流程轨道 = ◆立项确认 + 七步 + ◆交付审阅（锚点段从 journal 折算、步骤段从 bundle 文件
 *      在场性折算——两段数据源分开，HITL1 等待时 bundle 未建而锚点仍在场）；
 *   ③ 研究问题行（question.md 首行，剥 markdown 强调符）；
 *   ④ 团队动态 = 人性化活动流（activity-fold：🔍/👥/💬/📦，噪音过滤——**原始事件类型名不出正文**）；
 *   ⑤ 证据概览 + 交付状态（evidence/ 计数 + final 在场 → ✅ 已交付 + rerun 三分图例）；
 *   ⑥ 决策诚实线（停靠点已过 → 指路 question.md §Decisions——谁答的不复制进 UI，家在文件）；
 *   ⑦ 队员动态折叠区（member-activity-stream，2026-10-10 定夺：agentTeam 投影取 roster（队员
 *      会话 id 的唯一发现源——spawn 返回不带 id，通道探明实证）→ 多路 follow 队员会话 →
 *      member-activity 折算检索/抓取/出错行，每人一节默认折叠；任务粒度归 ui-agent-team 任务板）。
 *
 * 会话绑定（RFC right-pane-ux-debt，2026-09-28）：渐进面只显示**本会话自己的** run bundle
 * （bundle-bind：journal 工具调用路径识别 `drt_<slug>/`），位置=状态两个位置都认——根（在飞）
 * 与 archive/（已交付）；未绑定（journal 已到但无 bundle 动作）时如实显示提示行，不显示别家数据。
 *
 * 挂起信号显性化（同 RFC）：pending 迁移（false→true）时调用注入的 `revealStatusTab`（=
 * `sidebarRight.openTab('research-status')`——vendor 契约：落定时右栏同步骤展开）；页签体
 * 在右栏折叠时**保持挂载**（dock 不卸载），观察者因此常在——"轮到你"不再依赖用户先知道
 * 要展开右栏。用户仍可随时关页签/收右栏（可加可关）。
 *
 * 数据面：journal 事件 = remote.session.follow；bundle = remote.workspaceFiles
 * （list 本会话绑定的 bundle → 文件在场性/read question.md 首行）——company
 * cultivation 页签同款闭包模式（失败降级 null，面板如实显示）。
 * 分层纪律：折算全住 src/lib 纯函数（keyless 单测）；组件薄渲染。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { deriveAnchors, foldHitlPending, type HitlState, type RunAnchor } from '../lib/hitl-fold.ts'
import { deriveSteps, latestRunVersion, type RunStep } from '../lib/run-fold.ts'
import { deriveBusinessBrief, type BusinessBrief } from '../lib/brief-fold.ts'
import { terminalReadiness } from '../lib/review-readiness.ts'
import { foldActivityRows, type ActivityRow } from '../lib/activity-fold.ts'
import { useMemberActivity } from './research-status/useMemberActivity.ts'
import type { MemberActivitySummary } from '../lib/member-activity.ts'
import type { ResearchStatusTabProps, ResearchStatusTitleInjected } from './research-status/types.ts'
import { sessionBindingOf, type SessionBinding } from '../lib/bundle-bind.ts'
import { streamFailureOf } from '../lib/stream-failure.ts'
import { latestFinalDelivery } from '../lib/final-target.ts'
import { runVersionFaceOf, type RunVersionFace } from '../lib/run-version.ts'
import type { TeamProjection } from '@deepseek-ai/dsh-experimental-agent-team/client'
export type { FollowTarget, JournalFrame, ResearchStatusTabInjected, ResearchStatusTabProps, ResearchStatusTitleInjected } from './research-status/types.ts'

/** bundle 渐进面模型（问题行 + 步骤 + 证据 + 交付）。 */
interface BundleFace {
  readonly questionLine: string | null
  /** question.md 在场（锚点 passed 态的文件事实——与 questionLine 区分：首行可能缺席）。 */
  readonly hasQuestion: boolean
  readonly steps: readonly RunStep[]
  readonly evidenceCount: number
  readonly delivered: boolean
  /** final/ 中最高 vN.md 编号——≥2 即有证据扩张 rerun 记账。 */
  readonly versions: number
  /** review.md 终局 readiness（多轮取末位：true=FAIL / false=PASS / null=未观测）。 */
  readonly reviewFail: boolean | null
  /** 版本面事实（rerun 版本轨的输入；交付见证由 journal 单独折）。 */
  readonly planText: string | null
  readonly planSnapshotNames: readonly string[]
  readonly questionText: string | null
  readonly finalFileNames: readonly string[]
  readonly hasFinal: boolean
}

/** 30s 重扫间隔（bundle 文件变化不高频；团队面板同款节奏）。 */
const REFRESH_MS = 30_000

/**
 * 「研究状态」页签体。
 * @param props 槽 props + 注入面。
 * @returns 研究状态面板。
 */
export function ResearchStatusTab(props: ResearchStatusTabProps): ReactNode {
  const [rows, setRows] = useState<readonly ActivityRow[]>([])
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const [journalEvents, setJournalEvents] = useState<readonly unknown[]>([])
  const [face, setFace] = useState<BundleFace | null>(null)
  const [unbound, setUnbound] = useState(false)
  const [binding, setBinding] = useState<SessionBinding>({ slug: undefined, boundBy: undefined, kickoffSeen: false })
  const [journalSeen, setJournalSeen] = useState(false)
  const [kickoffHold, setKickoffHold] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boundRef = useRef<SessionBinding>({ slug: undefined, boundBy: undefined, kickoffSeen: false })
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
    boundRef.current = { slug: undefined, boundBy: undefined, kickoffSeen: false }
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
          const bound = sessionBindingOf(events)
          // 全值比对（BUG-001 附带修复）：只比 slug 会漏 boundBy 翻转（同 slug 的 read→write，
          // rerun 场景）与 kickoffSeen 翻转（立项动作出现）——两者都改变渐进面判定。
          if (bound.slug !== boundRef.current.slug || bound.boundBy !== boundRef.current.boundBy
            || bound.kickoffSeen !== boundRef.current.kickoffSeen) {
            boundRef.current = bound
            setBinding(bound)
          }
          // 观察连续性的采样点：旧会话的末态（绑定/挂起）在切换那一刻经此 ref 供切换效应读。
          wasObservingRef.current = boundRef.current.slug !== undefined || prevPending.current
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
    const kickoff = binding.boundBy === 'read' && binding.kickoffSeen
    const suppressed = binding.boundBy === 'read' && (hitl.pending || binding.kickoffSeen)
    if (sessionId === undefined || binding.slug === undefined || suppressed) {
      setFace(null)
      setUnbound(journalSeen && binding.slug === undefined)
      setKickoffHold(kickoff && !hitl.pending)
      return
    }
    setUnbound(false)
    setKickoffHold(false)
    const boundSlug = binding.slug
    let stopped = false
    const scan = async () => {
      try {
        // 位置=状态**三位置**：根（在飞）优先，archive/（已交付）次之，_abandoned/（未交付停放，
        // 2026-10-16 立）末之——会话绑定的 run 三处都认：停放的 bundle 照样是这场会话的工作产物，
        // 显示其渐进面比显示"缺"更如实（不认第三处 = 移出活动区的 run 在驾驶舱里凭空消失）。
        // slug 不含 drt_ 前缀（bundle-bind 谓词剥掉），目录名带前缀——拼回。
        for (const base of [`drt_${boundSlug}`, `archive/drt_${boundSlug}`, `_abandoned/drt_${boundSlug}`]) {
          const files = await props.listDir(sessionId, base, new AbortController().signal)
          if (files === null || stopped || files.length === 0) continue
          const names = new Set(files.map((f) => f.name))
          const evidenceDir = await props.listDir(sessionId, `${base}/evidence`, new AbortController().signal)
          if (stopped) return
          const evidenceCount = evidenceDir?.filter((e) => e.type === 'file' && e.name.endsWith('.md')).length ?? 0
          // final/ 版本记账（D17：证据扩张 rerun 落 v2.md+）——读目录内最高真实版本号作为回路表达的数据源
          const finalDir = names.has('final') ? await props.listDir(sessionId, `${base}/final`, new AbortController().signal) : null
          if (stopped) return
          const finalFileNames = (finalDir ?? []).filter((e) => e.type === 'file').map((e) => e.name)
          const versions = latestRunVersion(finalFileNames)
          // 版本面事实：plan 头/重写记录 + plan/ 快照清单（rerun 版本轨的数据源，折算住 run-version）。
          const planText = names.has('plan.md')
            ? await props.readFile(sessionId, `${base}/plan.md`, new AbortController().signal, 800)
            : null
          if (stopped) return
          const planDir = names.has('plan') ? await props.listDir(sessionId, `${base}/plan`, new AbortController().signal) : null
          if (stopped) return
          const planSnapshotNames = (planDir ?? []).filter((e) => e.type === 'file').map((e) => e.name)
          // review 终局 readiness（业务摘要审查态的数据源）：判定规则收在 pack lib
          // `review-readiness.terminalReadiness`——只认**行首**判定行、取最后一条。2026-10-11
          // 实测：旧的未锚行首末位匹配会把文末附录里保留的首轮 `readiness: FAIL`（血统记录）
          // 读成终局，把已交付 run 报成「审查修复中」。
          // review.md 读上限显式给足（BUG-036：默认 40 行会把终局判定行截在窗口外，UI 与盘侧期望对不上）
          // review.md 翻页读到 eof：终局判定在文末，固定行窗会读到中间轮次的旧 FAIL
          //（2026-10-20 实测：1448 行文件、判据行在 1442，600 行窗读到 571 行的 FAIL）。
          const readAllPages = async (path: string): Promise<string | null> => {
            const signal = new AbortController().signal
            const chunks: string[] = []
            let offset = 1
            for (let page = 0; page < 40; page += 1) {
              const result = await props.readPage(sessionId, path, signal, offset, 500)
              if (result === null) return page === 0 ? null : chunks.join('\n')
              chunks.push(result.text)
              offset += Math.max(result.lines, 1)
              if (result.eof || result.lines === 0) break
            }
            return chunks.join('\n')
          }
          const reviewText = names.has('review.md') ? await readAllPages(`${base}/review.md`) : null
          if (stopped) return
          const readiness = terminalReadiness(reviewText)
          const reviewFail = readiness === 'FAIL' ? true : readiness === 'PASS' ? false : null
          const questionText = names.has('question.md') ? await props.readFile(sessionId, `${base}/question.md`, new AbortController().signal) : null
          if (stopped) return
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
          return
        }
        if (!stopped) setFace(null) // 绑定的 slug 在两个位置都没有文件（已删/未建）——如实无面
      } catch (cause) { console.error('[research-status] scan 异常', String(cause)) }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, REFRESH_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [props.sessionId, binding, hitl.pending, journalSeen])

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
  // `final.md` 是工作稿，不再冒充已交付（D17 同 bundle rerun 的表达缺口）。
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
        hitlPending: hitl2Pending,
        draftPresent: face.hasFinal,
      }),
    [face, delivery, hitl2Pending],
  )

  // 流程轨道件（锚点入轨，RFC cockpit-flow-face）：锚点段从 journal+文件折算（挂起期也在场），
  // 步骤段从文件在场性折算——face 缺席时以占位态渲染（不冒充进度）。
  const railVisible = face !== null || hitl.pending || anchors.some((a) => a.state !== 'upcoming')
  const passedCount = anchors.filter((a) => a.state === 'passed').length
  const pendingAnchor = anchors.find((a) => a.state === 'pending')
  const steps = face !== null ? face.steps : deriveSteps({ question: false, team: false, leads: false, evidence: 0, findings: false, review: false, final: false })
  // 业务摘要（issue 2026-10-11-executive-research-ux-delivery）：既有事实源 → 五问折算。
  // 计数进不了本层（brief-fold 输入面无计数——类型级禁词，keyless 单测钉）；挂起种类由
  // 锚点 key 折算（anchor-1=hitl1 / anchor-2=hitl2 / 其余=契约外 unknown），不引 hitl-fold
  // 内部函数；§Decisions 末位拍板当前数据面未读——lastDecisionKind 如实 null。
  const brief: BusinessBrief = useMemo(
    () => deriveBusinessBrief({
      bundleBound: !unbound && binding.slug !== undefined,
      kickoffHold,
      hitlPending: hitl.pending,
      pendingKind: pendingAnchor !== undefined ? (pendingAnchor.key === 'anchor-1' ? 'hitl1' : pendingAnchor.key === 'anchor-2' ? 'hitl2' : 'unknown') : null,
      pendingQuestions: pendingAnchor?.questions ?? 0,
      hasQuestion: face?.hasQuestion ?? false,
      questionLine: face?.questionLine ?? null,
      currentStage: face !== null ? steps.find((s) => s.state === 'current')?.label ?? null : null,
      findingsPresent: (face?.steps.find((s) => s.key === 'findings')?.state === 'done'),
      reviewFail: face?.reviewFail ?? null,
      delivered: delivery !== null,
      versions: face?.versions ?? 0,
      lastDecisionKind: null,
      openItems: [],
    }),
    [unbound, binding.slug, kickoffHold, hitl.pending, pendingAnchor, face, steps, delivery],
  )
  const anchorChip = (a: RunAnchor) => (
    <span key={a.key} style={{ padding: '2px 8px', borderRadius: 4, fontWeight: a.state === 'pending' ? 700 : 400, background: a.state === 'pending' ? '#f59e0b33' : a.state === 'passed' ? '#22c55e22' : '#0000000d', color: a.state === 'pending' ? '#b45309' : a.state === 'passed' ? '#16a34a' : '#888' }}>
      ◆{a.label}{a.state === 'pending' && a.questions > 0 ? `（${a.questions} 问）` : ''} {a.state === 'pending' ? '⏳' : a.state === 'passed' ? '✓' : '·'}
    </span>
  )
  // 步态符号语法 = 仪表盘同款（✓ 已过 / ● 进行中 / ○ 未到）：done 绿字（与锚点 passed 同
  // 色相）、current 琥珀唯一——2026-09-28 trial 实测反馈：done 与 pending 都读成"没走过"，
  // 轨道丢掉 v1 已走完的历史；回边 ▲ 紧贴芯片左下角还造成"挖掘被点亮"的误读。
  // 重入点描边（虚线琥珀）= 回边落点显性化，与 current 实底可分——rerun 期间 current 按设计
  // 钉在交付，重入点在挖掘，两颗"亮"芯片语义不同，视觉必须可分。
  const loopOn = anchors[1] !== undefined && anchors[1].state !== 'upcoming'
  const stepChip = (s: RunStep) => {
    const reentry = face !== null && loopOn && s.key === 'evidence'
    return (
      <span key={s.key} style={{ padding: '2px 8px', borderRadius: 4, opacity: face === null ? 0.35 : s.state === 'pending' ? 0.4 : 1, fontWeight: face !== null && s.state === 'current' ? 700 : 400, background: face !== null && s.state === 'current' ? '#f59e0b33' : face !== null && s.state === 'done' ? '#22c55e22' : '#0000000d', color: face !== null && s.state === 'done' ? '#16a34a' : undefined, outline: reentry ? '1.5px dashed #c08a2e' : undefined, outlineOffset: reentry ? 1 : undefined }}>{s.state === 'done' ? '✓ ' : s.state === 'current' ? '● ' : '○ '}{s.label}</span>
    )
  }

  // 流程轨道 = grid 两行：第一行主轨 chips，第二行 ↻ 回路边（HITL2 到达后出现）——
  // 回路从 ◆交付审阅 下探、横行、上翘回【挖掘】（U 形连线跨列绘制，箭头指重入点）。
  // 列位（1 起）：a1=1，steps[0..5]=2..7，a2=8，final=9；回边跨"挖掘列 → a2 列"。
  const railNodes: { key: string; chip: ReactNode }[] = [
    { key: 'anchor-1', chip: anchorChip(anchors[0] ?? { key: 'anchor-1', label: '立项确认', state: 'upcoming', questions: 0 }) },
    ...steps.slice(0, 6).map((s) => ({ key: s.key, chip: stepChip(s) })),
    { key: 'anchor-2', chip: anchorChip(anchors[1] ?? { key: 'anchor-2', label: '交付审阅', state: 'upcoming', questions: 0 }) },
    ...steps.slice(6).map((s) => ({ key: s.key, chip: stepChip(s) })),
    ...anchors.slice(2).map((a) => ({ key: a.key, chip: anchorChip(a) })),
  ]
  const loopVisible = loopOn
  const EV_COL = 5
  const A2_COL = 8

  return (
    // 滚动义务在页签体自己（vendor .tabBody = overflow:hidden 的定高 flex 列——BUG 2026-10-12
    // 用户报告：活动流超长即被裁且不可滚）：根容器 flex:1 + minHeight:0 吃满宿主高，
    // 双轴 auto 自滚。
    <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
      {/* ① HITL 挂起横幅（最醒目位置；点名锚点 + 参与指引——"怎么参与"在需要那一刻说清） */}
      {hitl.pending && (
        <div style={{ fontWeight: 700, padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#f59e0b33', border: '1px solid #f59e0b66' }}>
          ⏳ 等你拍板——{pendingAnchor?.label ?? '决定'}{pendingAnchor !== undefined && pendingAnchor.questions > 0 ? `（${pendingAnchor.questions} 问）` : ''}：在会话里的问题卡上点选项即可（推荐项已置首）
        </div>
      )}
      {/* 流畸形死亡恢复指引（BUG-023 修复①）：末位回合死于上游流失败且无新回合接手时，
          给人话恢复路径——不虚构"研究失败"，档案都在 bundle。折算 = stream-failure.ts。 */}
      {streamFailure.dead && !hitl.pending && (
        <div style={{ fontWeight: 600, padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#ef444418', border: '1px solid #ef444440' }}>
          ⚠️ 上游模型流连续异常，刚才那回合没跑成——研究档案都在。等一两分钟，在对话里发「继续」即可接着跑。
        </div>
      )}
      {/* ⓪ 业务摘要层（issue 2026-10-11-executive-research-ux-delivery）：五问业务语言——
          研究什么 / 已确认什么 / 未知什么 / 我是否要操作；折算住 brief-fold（计数不进本层），
          组件薄渲染。 */}
      <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, background: '#22c55e14', border: '1px solid #22c55e33', fontSize: 13, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700 }}>🎯 {brief.goal}</div>
        <div>{brief.stageLine}</div>
        <div style={{ opacity: 0.85 }}>{brief.knownLine}</div>
        {brief.unknownLine !== null && <div style={{ color: '#b45309' }}>⚠ {brief.unknownLine}</div>}
        <div style={{ fontWeight: brief.userActionNeeded ? 700 : 400, color: brief.userActionNeeded ? '#b45309' : undefined }}>{brief.actionLine}</div>
      </div>
      {/* ② 流程轨道：◆立项确认 + 主轨 + ◆交付审阅 + 交付；↻ 回边 = 拍板的分支后果画进流程 */}
      {railVisible && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${railNodes.length}, auto)`, alignItems: 'start', marginBottom: 8, fontSize: 12 }}>
          {railNodes.map((n, i) => (
            <div key={n.key} style={{ gridRow: 1, gridColumn: i + 1 }}>{n.chip}</div>
          ))}
          {loopVisible && (
            <div style={{ gridRow: 2, gridColumn: `${EV_COL} / ${A2_COL + 1}`, position: 'relative', margin: '4px 6px 0', border: '1px dashed #c08a2e', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '2px 6px 3px', color: '#b45309', textAlign: 'center', minWidth: 0, lineHeight: 1.4, whiteSpace: 'normal' }}>
              <span style={{ position: 'absolute', top: -9, left: 3, fontSize: 10, color: '#b45309' }}>▲</span>
              ↻ rerun 图例（非执行记录）：补研究 = 同 bundle 回挖掘、final/ vN+1；表述修订 = 原位改、版本不变；结构性重构 = 另起新 bundle{face !== null && face.versions >= 2 ? ` · 本 bundle 已有 v${face.versions}（证据扩张）` : ''}
            </div>
          )}
        </div>
        {face !== null && (
          <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 8 }}>✓ 已过 · ● 进行中 · ○ 未到 · 虚线描边 = ↻ 回边落点（重入点）</div>
        )}
        </>
      )}
      {/* ⑥ 决策诚实线（指路不复制——谁答的家在 question.md §Decisions） */}
      {passedCount > 0 && (
        <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.55 }}>
          停靠点已过 {passedCount} 个 · 每次拍板的记录见 question.md §Decisions
        </div>
      )}
      {/* ③ 研究问题行 */}
      {face?.questionLine !== null && face?.questionLine !== undefined && (
        <div style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{face.questionLine}</div>
      )}
      {/* ⑤ 证据概览 + 交付状态 + 版本（final/ 记账 ≥v2 = 发生过证据扩张 rerun）
         交付态 = `present` 见证（门②），不是 `final.md` 在场——后者在综合步就有，是"可审"不是"已交"。
          已交付 → 门（读终稿）；未交付 → 承诺（终稿将在交付后自动出现在右栏，许在用户已经在看的地方）。 */}
      {face !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
          <span>证据 {face.evidenceCount} 份</span>
          {delivery !== null && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ 已交付</span>}
          {delivery !== null && props.sessionId !== undefined && (
            <button
              type="button"
              onClick={() => { props.openFinal(props.sessionId as NonNullable<typeof props.sessionId>, delivery.path) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#2563eb', fontSize: 13, textDecoration: 'underline' }}
            >读终稿 →</button>
          )}
          {delivery === null && <span style={{ opacity: 0.6 }}>终稿将在交付后自动出现在右栏</span>}
          {versionFace !== null && (face.hasFinal || versionFace.ledgerFinalVersion >= 1) && (
            <span style={{ fontSize: 12, opacity: 0.8 }} title="版本面只读投影：final/vN 是版本账，final.md 是工作稿">
              {versionFace.label}
            </span>
          )}
        </div>
      )}
      {/* 未绑定 / 绑定待确认提示（RFC right-pane-ux-debt + cockpit-flow-face G4） */}
      {unbound && (
        <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.55 }}>
          （本会话未绑定 run bundle——研究状态只跟本会话自己的 run）
        </div>
      )}
      {kickoffHold && (
        <div style={{ marginBottom: 10, fontSize: 12, padding: '6px 10px', borderRadius: 6, background: '#0000000d' }}>
          🌱 这场研究还没开始——立项对齐中，读到的是上一场 run（drt_{binding.slug}）的上下文；落笔开跑后这里显示本场状态。
        </div>
      )}
      {!unbound && !kickoffHold && face === null && binding.boundBy === 'read' && hitl.pending && (
        <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.55 }}>
          （挂起期间不显示 bundle 渐进面——当前绑定仅由读取推断，落笔后确认）
        </div>
      )}
      {error !== null && <div style={{ color: '#b00', marginBottom: 6, fontSize: 12 }}>{error}</div>}
      {/* ④ 团队动态（人性化活动行——原始事件类型名不出正文） */}
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>
        {rows.length === 0 && props.sessionId !== undefined && <span style={{ opacity: 0.5 }}>（研究中，暂无可见动作）</span>}
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <span>{r.icon}</span>
            <span style={{ flex: 1 }}>{r.text}</span>
          </div>
        ))}
      </div>
      {/* ⑦ 队员动态折叠区（每人一节，默认折叠；动作粒度 = 检索/抓取/出错——任务粒度归 ui-agent-team 任务板，不双 home） */}
      {members.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <div style={{ opacity: 0.55, marginBottom: 4 }}>队员动态（检索 / 抓取 / 出错）</div>
          {members.map((m) => {
            const summary = memberSummaries[m.id]
            return (
              <details key={m.id} style={{ marginBottom: 4 }}>
                <summary style={{ cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600 }}>{m.phase === 'active' ? '● ' : m.phase === 'failed' ? '✕ ' : '○ '}{m.name}</span>
                  <span style={{ opacity: 0.6 }}>　🔍{summary?.searchCount ?? 0} · 🌐{summary?.fetchCount ?? 0}{(summary?.errorCount ?? 0) > 0 ? ` · ⚠️${summary?.errorCount}` : ''}</span>
                </summary>
                <div style={{ paddingLeft: 14, lineHeight: 1.7 }}>
                  {(summary?.rows ?? []).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <span>{r.icon}</span>
                      <span style={{ flex: 1 }}>{r.text}</span>
                    </div>
                  ))}
                  {(summary?.rows ?? []).length === 0 && <span style={{ opacity: 0.5 }}>（暂无可见动作）</span>}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"）——共享 journal 流折算。 */
export function ResearchStatusTitle(props: PropsRuntime<'sidebar.right.pane.tab.title'> & ResearchStatusTitleInjected): ReactNode {
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const sessionId = props.sessionId
  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setHitl(foldHitlPending(events))
        }
      } catch (err) { /* 活标题 fail-soft；卸载 abort 不算失败 */ if (!controller.signal.aborted) console.error('[ResearchStatusTab] 活标题流失败', err) }
    })()
    return () => { controller.abort() }
  }, [sessionId])
  return hitl.pending ? '研究状态 · ⏳ 等你拍板' : '研究状态'
}
