/**
 * 「研究状态」页签体（Stage 2 / B-min：journal 流真渲染）。
 * 数据通道 = 注入的 `follow`（绑定 `remote.session.follow`）；组件薄渲染：只做流消费与
 * 行摘要展示，不解释 wire 细节（折算深化归 Stage 3 的 `src/lib/` 纯函数）。
 * Stage 3 起接步骤条/活标题（HITL 挂起时"研究状态 · ⏳ 等你拍板"）/矩阵/review。
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** journal 帧的最小投影（wire 形状 → 领域形状；Stage 3 深化时移入 src/lib 并配 keyless 单测）。 */
export type JournalFrame =
  | { readonly kind: 'history'; readonly events: readonly unknown[] }
  | { readonly kind: 'event'; readonly event: unknown }

/** 页签体注入面：journal 流（绑定 remote.session.follow）。 */
export interface ResearchStatusTabInjected {
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncGenerator<JournalFrame>
}

/** 槽标准 props + 注入面。 */
export type ResearchStatusTabProps = PropsRuntime<'sidebar.right.pane.tab'> & ResearchStatusTabInjected

/** 尾部保留的行数（薄渲染：一屏能扫完即可）。 */
const MAX_LINES = 30

/** 一行 journal 事件的摘要（只取类型字段，不解释 wire 细节）。 */
function eventLine(event: unknown): string {
  if (typeof event === 'object' && event !== null && 'type' in event) {
    return String((event as { type?: unknown }).type ?? 'event')
  }
  return 'event'
}

/**
 * 「研究状态」页签体（B-min：journal 流）。
 * @param props - 槽 props（sessionId 等）+ follow 注入面。
 * @returns journal 流面板。
 */
export function ResearchStatusTab(props: ResearchStatusTabProps): ReactNode {
  const [count, setCount] = useState<number | null>(null)
  const [lines, setLines] = useState<readonly string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = props.sessionId
    if (sessionId === undefined) return
    const controller = new AbortController()
    void (async () => {
      try {
        for await (const frame of props.follow(sessionId, controller.signal)) {
          if (frame.kind === 'history') {
            const events = [...frame.events]
            setCount(events.length)
            setLines(events.slice(-MAX_LINES).map(eventLine))
          } else {
            setCount((current) => (current ?? 0) + 1)
            setLines((current) => [...current, eventLine(frame.event)].slice(-MAX_LINES))
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(String(cause))
      }
    })()
    return () => { controller.abort() }
  }, [props.sessionId])

  return (
    <div style={{ padding: 12 }}>
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
