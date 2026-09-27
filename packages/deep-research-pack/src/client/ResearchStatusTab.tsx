/**
 * 「研究状态」页签体（UI 优先版：把界面弄对——RFC research-status-ui）。
 *
 * 自上而下五区（一眼回答"研究到哪了、谁在干什么、等没等我"）：
 *   ① 研究问题行（question.md 首行）；
 *   ② 步骤条（七步真数据——bundle 文件在场性喂 run-fold.deriveSteps）；
 *   ③ HITL 挂起横幅（hitl-fold 谓词）；
 *   ④ 团队动态 = 人性化活动流（activity-fold：🔍/👥/💬/📦，噪音过滤——**原始事件类型名不出正文**）；
 *   ⑤ 证据概览 + 交付状态（evidence/ 计数 + final 在场 → ✅ 已交付）。
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
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldHitlPending, type HitlState } from '../lib/hitl-fold.ts'
import { deriveSteps, type RunStep } from '../lib/run-fold.ts'
import { foldActivityRows, type ActivityRow } from '../lib/activity-fold.ts'
import { sessionBundleOf } from '../lib/bundle-bind.ts'

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
  readonly steps: readonly RunStep[]
  readonly evidenceCount: number
  readonly delivered: boolean
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
  const [face, setFace] = useState<BundleFace | null>(null)
  const [unbound, setUnbound] = useState(false)
  const [boundSlug, setBoundSlug] = useState<string | undefined>(undefined)
  const [journalSeen, setJournalSeen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventsRef = useRef<readonly unknown[]>([])
  const slugRef = useRef<string | undefined>(undefined)
  const prevPending = useRef(false)

  // ① journal 流 → 活动行 + HITL 谓词 + 会话绑定输入
  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined) return
    const controller = new AbortController()
    eventsRef.current = []
    slugRef.current = undefined
    prevPending.current = false
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          eventsRef.current = events
          setJournalSeen(true)
          setRows(foldActivityRows(events))
          const next = foldHitlPending(events)
          setHitl(next)
          // 挂起信号显性化（RFC right-pane-ux-debt）：false→true 迁移时打开本页签——
          // openTab 落定时右栏同步骤展开；页签体折叠态保持挂载，观察者常在。
          if (next.pending && !prevPending.current) props.revealStatusTab()
          prevPending.current = next.pending
          const slug = sessionBundleOf(events)
          if (slug !== slugRef.current) {
            slugRef.current = slug
            setBoundSlug(slug)
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(String(cause))
      }
    })()
    return () => { controller.abort() }
  }, [props.sessionId])

  // ② bundle 渐进面（绑定本会话的 run；slug 变化即扫 + 30s 定时——文件在场性不高频）
  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined || boundSlug === undefined) {
      setFace(null)
      setUnbound(journalSeen)
      return
    }
    setUnbound(false)
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
          const questionText = names.has('question.md') ? await props.readFile(sessionId, `${base}/question.md`, new AbortController().signal) : null
          if (stopped) return
          const firstLine = questionText?.split('\n').find((l) => l.trim() !== '' && !l.startsWith('#'))?.slice(0, 60) ?? null
          setFace({
            questionLine: firstLine,
            steps: deriveSteps({
              question: names.has('question.md'),
              topics: names.has('topics.md'),
              leads: names.has('leads.md'),
              evidence: evidenceCount,
              findings: names.has('findings.md'),
              review: names.has('review.md'),
              final: names.has('final.md'),
            }),
            evidenceCount,
            delivered: names.has('final.md'),
          })
          return
        }
        if (!stopped) setFace(null) // 绑定的 slug 在两个位置都没有文件（已删/未建）——如实无面
      } catch (cause) { console.error('[research-status] scan 异常', String(cause)) }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, REFRESH_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [props.sessionId, boundSlug, journalSeen])

  return (
    <div style={{ padding: 12 }}>
      {/* ③ HITL 挂起横幅（最醒目位置） */}
      {hitl.pending && (
        <div style={{ fontWeight: 700, padding: '8px 12px', marginBottom: 10, borderRadius: 6, background: '#f59e0b33', border: '1px solid #f59e0b66' }}>
          ⏳ 等你拍板——现在轮到你
        </div>
      )}
      {/* ① 研究问题行 */}
      {face?.questionLine !== null && face?.questionLine !== undefined && (
        <div style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{face.questionLine}</div>
      )}
      {/* ② 步骤条（真数据） */}
      {face !== null && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, fontSize: 12, flexWrap: 'wrap' }}>
          {face.steps.map((s) => (
            <span key={s.key} style={{ padding: '2px 8px', borderRadius: 4, opacity: s.state === 'pending' ? 0.4 : 1, fontWeight: s.state === 'current' ? 700 : 400, background: s.state === 'current' ? '#f59e0b33' : s.state === 'done' ? '#22c55e22' : '#0000000d' }}>{s.label}</span>
          ))}
        </div>
      )}
      {/* ⑤ 证据概览 + 交付状态 */}
      {face !== null && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
          <span>证据 {face.evidenceCount} 份</span>
          {face.delivered && <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ 已交付</span>}
        </div>
      )}
      {/* 未绑定提示（RFC right-pane-ux-debt：只跟本会话的 run——journal 已到但无 bundle 动作） */}
      {unbound && (
        <div style={{ marginBottom: 10, fontSize: 12, opacity: 0.55 }}>
          （本会话未绑定 run bundle——研究状态只跟本会话自己的 run）
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
