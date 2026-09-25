/**
 * 「研究状态」页签体 + 活标题（Stage 3 / B-full：journal 流 + HITL 挂起显形）。
 * 数据通道 = 注入的 `follow`（绑定 `remote.session.follow`）；组件薄渲染：流消费与
 * fold 调用，不解释 wire 细节（折算住 `src/lib/hitl-fold.ts`，keyless 单测吃它）。
 * 矩阵/步骤条/review 渐进 = 后续（见 RFC 时间盒；本文件只接 journal 面 + 活标题）。
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldHitlPending, type HitlState } from '../lib/hitl-fold.ts'

/** journal 帧的最小投影（wire 形状 → 领域形状）。 */
export type JournalFrame =
  | { readonly kind: 'history'; readonly events: readonly unknown[] }
  | { readonly kind: 'event'; readonly event: unknown }

/** 页签体/标题共用的注入面：journal 流（绑定 remote.session.follow）。 */
export interface ResearchStatusInjected {
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncGenerator<JournalFrame>
}

/** 槽标准 props + 注入面（pane 与 title 两个槽共用形状）。 */
export type ResearchStatusTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchStatusInjected
export type ResearchStatusTitleProps = PropsRuntime<'sidebar.right.pane.tab.title'> & ResearchStatusInjected

/** 尾部保留的行数（薄渲染：一屏能扫完即可）。 */
const MAX_LINES = 30

/** 一行 journal 事件的摘要（只取类型字段，不解释 wire 细节）。 */
function eventLine(event: unknown): string {
  if (typeof event === 'object' && event !== null && 'type' in event) {
    return String((event as { type?: unknown }).type ?? 'event')
  }
  return 'event'
}

/** 订阅 follow 流的共享 hook：返回事件计数、尾部行摘要与 HITL 挂起态。 */
function useJournalStream(props: ResearchStatusTabProps | ResearchStatusTitleProps) {
  const [count, setCount] = useState<number | null>(null)
  const [lines, setLines] = useState<readonly string[]>([])
  const [hitl, setHitl] = useState<HitlState>({ pending: false, since: undefined })
  const [error, setError] = useState<string | null>(null)
  const sessionId = props.sessionId
  useEffect(() => {
    if (sessionId === undefined) return
    const controller = new AbortController()
    let events: unknown[] = []
    void (async () => {
      try {
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          setCount(events.length)
          setLines(events.slice(-MAX_LINES).map(eventLine))
          setHitl(foldHitlPending(events))
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(String(cause))
      }
    })()
    return () => { controller.abort() }
  }, [sessionId])
  return { count, lines, hitl, error }
}

/**
 * 「研究状态」页签体（journal 流 + HITL 挂起横幅行）。
 * @param props - 槽 props + follow 注入面。
 * @returns journal 流面板。
 */
export function ResearchStatusTab(props: ResearchStatusTabProps): ReactNode {
  const { count, lines, hitl, error } = useJournalStream(props)
  return (
    <div style={{ padding: 12 }}>
      {hitl.pending && (
        <div style={{ fontWeight: 700, padding: '6px 10px', marginBottom: 8, borderRadius: 6, background: '#f59e0b22' }}>
          ⏳ 等你拍板——现在轮到你（ask_user_question 未答）
        </div>
      )}
      <div style={{ fontWeight: 600 }}>研究状态</div>
      <div style={{ opacity: 0.7, marginTop: 4 }}>
        journal 流（{props.sessionId === undefined ? '等待会话' : `${count ?? '…'} 事件` }）
      </div>
      {error !== null && <div style={{ color: '#b00', marginTop: 4 }}>{error}</div>}
      <div style={{ marginTop: 8, fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.6 }}>
        {lines.map((line, index) => <div key={index}>{line}</div>)}
      </div>
    </div>
  )
}

/**
 * 「研究状态」活标题（HITL 挂起时\"研究状态 · ⏳ 等你拍板\"）。
 * @param props - 标题槽 props + follow 注入面。
 * @returns 页签 chip 文本。
 */
export function ResearchStatusTitle(props: ResearchStatusTitleProps): ReactNode {
  const { hitl } = useJournalStream(props)
  return hitl.pending ? '研究状态 · ⏳ 等你拍板' : '研究状态'
}
