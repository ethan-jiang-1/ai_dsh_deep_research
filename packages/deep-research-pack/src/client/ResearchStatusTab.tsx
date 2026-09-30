/**
 * 「研究状态」页签体（UI 优先版：把界面弄对——RFC research-status-ui）。
 *
 * 自上而下六区（一眼回答"研究到哪了、谁在干什么、等没等我、我在哪出手"）：
 *   ① HITL 挂起横幅（点名锚点 + 参与指引——hitl-fold.deriveAnchors）；
 *   ② 流程轨道 = ◆立项确认 + 七步 + ◆交付审阅（锚点段从 journal 折算、步骤段从 bundle 文件
 *      在场性折算——两段数据源分开，HITL1 等待时 bundle 未建而锚点仍在场）；
 *   ③ 研究问题行（question.md 首行，剥 markdown 强调符）；
 *   ④ 团队动态 = 人性化活动流（activity-fold：🔍/👥/💬/📦，噪音过滤——**原始事件类型名不出正文**）；
 *   ⑤ 证据概览 + 交付状态（evidence/ 计数 + final 在场 → ✅ 已交付 + rerun 三分静线）；
 *   ⑥ 决策诚实线（停靠点已过 → 指路 question.md §Decisions——谁答的不复制进 UI，家在文件）。
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
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { deriveAnchors, foldHitlPending, type HitlState, type RunAnchor } from '../lib/hitl-fold.ts'
import { deriveSteps, type RunStep } from '../lib/run-fold.ts'
import { foldActivityRows, type ActivityRow } from '../lib/activity-fold.ts'
import { sessionBindingOf, type SessionBinding } from '../lib/bundle-bind.ts'

/** journal 帧的最小投影（wire 形状 → 领域形状）。 */
export type JournalFrame =
  | { readonly kind: 'history'; readonly events: readonly unknown[] }
  | { readonly kind: 'event'; readonly event: unknown }

/** 页签体注入面：journal 流 + 文件读取闭包（绑定 remote.workspaceFiles）+ 挂起显性化入口。 */
export interface ResearchStatusTabInjected {
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncGenerator<JournalFrame>
  /** 列工作区目录；不可达 → null。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  /** 读工作区文本文件（首窗）；不可达 → null。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
  /** 挂起显性化：pending 迁移时由页签体调用（openTab——右栏同步骤展开）。 */
  readonly revealStatusTab: () => void
}

/** 槽标准 props + 注入面。 */
export type ResearchStatusTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchStatusTabInjected

/** bundle 渐进面模型（问题行 + 步骤 + 证据 + 交付）。 */
interface BundleFace {
  readonly questionLine: string | null
  /** question.md 在场（锚点 passed 态的文件事实——与 questionLine 区分：首行可能缺席）。 */
  readonly hasQuestion: boolean
  readonly steps: readonly RunStep[]
  readonly evidenceCount: number
  readonly delivered: boolean
  /** final/ 版本记账数（v*.md）——≥2 即发生过证据扩张 rerun。 */
  readonly versions: number
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
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(String(cause))
      }
    })()
    return () => { controller.abort() }
  }, [props.sessionId])

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
        // 位置=状态：根（在飞）优先，archive/（已交付）次之——会话绑定的 run 两个位置都认；
        // slug 不含 drt_ 前缀（bundle-bind 谓词剥掉），目录名带前缀——拼回。
        for (const base of [`drt_${boundSlug}`, `archive/drt_${boundSlug}`]) {
          const files = await props.listDir(sessionId, base, new AbortController().signal)
          if (files === null || stopped || files.length === 0) continue
          const names = new Set(files.map((f) => f.name))
          const evidenceDir = await props.listDir(sessionId, `${base}/evidence`, new AbortController().signal)
          if (stopped) return
          const evidenceCount = evidenceDir?.filter((e) => e.type === 'file' && e.name.endsWith('.md')).length ?? 0
          // final/ 版本记账（D17：证据扩张 rerun 落 v2.md+）——回路表达的数据源
          const finalDir = names.has('final') ? await props.listDir(sessionId, `${base}/final`, new AbortController().signal) : null
          if (stopped) return
          const versions = finalDir?.filter((e) => e.type === 'file' && /^v\d+\.md$/.test(e.name)).length ?? 0
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
  const anchors = useMemo(
    () => deriveAnchors(journalEvents, face !== null ? { question: face.hasQuestion, delivered: face.delivered } : undefined),
    [journalEvents, face],
  )

  // 流程轨道件（锚点入轨，RFC cockpit-flow-face）：锚点段从 journal+文件折算（挂起期也在场），
  // 步骤段从文件在场性折算——face 缺席时以占位态渲染（不冒充进度）。
  const railVisible = face !== null || hitl.pending || anchors.some((a) => a.state !== 'upcoming')
  const passedCount = anchors.filter((a) => a.state === 'passed').length
  const pendingAnchor = anchors.find((a) => a.state === 'pending')
  const steps = face !== null ? face.steps : deriveSteps({ question: false, team: false, leads: false, evidence: 0, findings: false, review: false, final: false })
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
    <div style={{ padding: 12 }}>
      {/* ① HITL 挂起横幅（最醒目位置；点名锚点 + 参与指引——"怎么参与"在需要那一刻说清） */}
      {hitl.pending && (
        <div style={{ fontWeight: 700, padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#f59e0b33', border: '1px solid #f59e0b66' }}>
          ⏳ 等你拍板——{pendingAnchor?.label ?? '决定'}{pendingAnchor !== undefined && pendingAnchor.questions > 0 ? `（${pendingAnchor.questions} 问）` : ''}：在会话里的问题卡上点选项即可（推荐项已置首）
        </div>
      )}
      {/* ② 流程轨道：◆立项确认 + 主轨 + ◆交付审阅 + 交付；↻ 回边 = 拍板的分支后果画进流程 */}
      {railVisible && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${railNodes.length}, auto)`, alignItems: 'start', marginBottom: 8, fontSize: 12 }}>
          {railNodes.map((n, i) => (
            <div key={n.key} style={{ gridRow: 1, gridColumn: i + 1 }}>{n.chip}</div>
          ))}
          {loopVisible && (
            <div style={{ gridRow: 2, gridColumn: `${EV_COL} / ${A2_COL + 1}`, position: 'relative', margin: '4px 6px 0', border: '1px dashed #c08a2e', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '2px 6px 3px', color: '#b45309', textAlign: 'center', whiteSpace: 'nowrap' }}>
              <span style={{ position: 'absolute', top: -9, left: 3, fontSize: 10, color: '#b45309' }}>▲</span>
              ↻ 补研究（final/ 下一版）· 修订表述原位改{face !== null && face.versions >= 2 ? ` · 已落 v${face.versions}` : ''}
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
      {/* ⑤ 证据概览 + 交付状态 + 版本（final/ 记账 ≥v2 = 发生过证据扩张 rerun） */}
      {face !== null && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
          <span>证据 {face.evidenceCount} 份</span>
          {face.delivered && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ 已交付</span>}
          {face.versions >= 2 && <span style={{ fontWeight: 600 }}>v{face.versions}</span>}
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
          🌱 这场研究还没开始——立项对齐中，读到的是上一场 run 的上下文；落笔开跑后这里显示本场状态。
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
    </div>
  )
}

/** 活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"）——共享 journal 流折算。 */
export function ResearchStatusTitle(props: PropsRuntime<'sidebar.right.pane.tab.title'> & ResearchStatusTabInjected): ReactNode {
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
      } catch { /* 活标题 fail-soft */ }
    })()
    return () => { controller.abort() }
  }, [sessionId])
  return hitl.pending ? '研究状态 · ⏳ 等你拍板' : '研究状态'
}
