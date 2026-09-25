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
 * 数据面：journal 事件 = remote.session.follow；bundle = remote.workspaceFiles
 * （list 研究工作区根 → 最新 drt_* → 文件在场性/read question.md 首行）——company
 * cultivation 页签同款闭包模式（失败降级 null，面板如实显示）。
 * 分层纪律：折算全住 src/lib 纯函数（keyless 单测）；组件薄渲染。
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldHitlPending, type HitlState } from '../lib/hitl-fold.ts'
import { deriveSteps, type RunStep } from '../lib/run-fold.ts'
import { foldActivityRows, type ActivityRow } from '../lib/activity-fold.ts'

/** journal 帧的最小投影（wire 形状 → 领域形状）。 */
export type JournalFrame =
  | { readonly kind: 'history'; readonly events: readonly unknown[] }
  | { readonly kind: 'event'; readonly event: unknown }

/** 页签体注入面：journal 流 + 文件读取闭包（绑定 remote.workspaceFiles）。 */
export interface ResearchStatusTabInjected {
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncGenerator<JournalFrame>
  /** 列工作区目录；不可达 → null。 */
  readonly listDir: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<readonly { type: string; name: string }[] | null>
  /** 读工作区文本文件（首窗）；不可达 → null。 */
  readonly readFile: (sessionId: SessionId, path: string, signal: AbortSignal) => Promise<string | null>
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
 * @param props - 槽 props + 注入面。
 * @returns 研究状态面板。
 */
export function ResearchStatusTab(props: ResearchStatusTabProps): ReactNode {
  const [rows, setRows] = useState<readonly ActivityRow[]>([])
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const [face, setFace] = useState<BundleFace | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ① journal 流 → 活动行 + HITL 谓词
  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined) return
    const controller = new AbortController()
    void (async () => {
      try {
        let events: unknown[] = []
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setRows(foldActivityRows(events))
          setHitl(foldHitlPending(events))
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(String(cause))
      }
    })()
    return () => { controller.abort() }
  }, [props.sessionId])

  // ② bundle 渐进面（问题行/步骤/证据/交付——定时重扫）
  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined) return
    let stopped = false
    const scan = async () => {
      try {
        // 研究工作区根 → 最新 drt_* 目录
        const root = await props.listDir(sessionId, '', new AbortController().signal)
        if (root === null || stopped) return
        const bundles = root.filter((e) => e.type === 'directory' && e.name.startsWith('drt_')).map((e) => e.name)
        if (bundles.length === 0) { setFace(null); return }
        // v1：取字典序最新的 bundle（多 bundle 场景的定向发现留后续）
        const bundle = bundles.sort().at(-1)
        if (bundle === undefined || stopped) return
        const files = await props.listDir(sessionId, bundle, new AbortController().signal)
        if (files === null || stopped) return
        const names = new Set(files.map((f) => f.name))
        const evidenceDir = await props.listDir(sessionId, `${bundle}/evidence`, new AbortController().signal)
        if (stopped) return
        const evidenceCount = evidenceDir?.filter((e) => e.type === 'file' && e.name.endsWith('.md')).length ?? 0
        const questionText = names.has('question.md') ? await props.readFile(sessionId, `${bundle}/question.md`, new AbortController().signal) : null
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
      } catch { /* 数据面不可达 → 渐进面留空（活动流仍工作） */ }
    }
    void scan()
    const timer = setInterval(() => { void scan() }, REFRESH_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [props.sessionId])

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
