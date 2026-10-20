// useMemberActivity.ts — 订阅队员 journal 流并折算每人动态摘要的 React hook（client 半）。
// 被谁消费：src/client/ResearchStatusTab.tsx（队员活动区数据源；折算口径住 lib/member-activity.ts）。
// 怎么不改坏：cleanup 顺序（先 alive=false 再 abort）与 history→event 语义是流式合同，
// 改动须对照 2026-10-11 首验的三条队员流实测记录（纯 id follow 被 host 守卫拒的形态）。
import { useEffect } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { foldMemberActivity, type MemberActivitySummary } from '../../lib/member-activity.ts'
import type { FollowTarget, JournalFrame } from './types.ts'

interface UseMemberActivityOptions {
  /** Sorted, comma-joined teammate ids; roster order changes alone do not reopen streams. */
  readonly memberIds: string
  readonly sessionId: SessionId | undefined
  readonly follow: (target: FollowTarget, signal: AbortSignal) => AsyncGenerator<JournalFrame>
  /** Caller-owned state setter keeps the parent's state slot in its original hook position. */
  readonly setMemberSummaries: (summaries: Readonly<Record<string, MemberActivitySummary>>) => void
}

/**
 * 订阅队员 journal 流并折算每人的动态摘要。
 *
 * member-activity-stream：roster 变化即重开多路 follow（每队员一条，与 lead 流同一 WebSocket
 * 数据面——通道探明：gateway 无流数上限）；AbortController 统一回收。首帧 snapshot 为全量
 * 历史（量级 ≈ lead 同阶）——行截尾部、计数全量，折算住 lib。history 替换本队员事件序列，
 * event 只追加；cleanup 先禁止旧流写状态再 abort。 */
export function useMemberActivity({ memberIds, sessionId, follow, setMemberSummaries }: UseMemberActivityOptions): void {
  useEffect(() => {
    if (memberIds === '' || sessionId === undefined) { setMemberSummaries({}); return }
    const controller = new AbortController()
    const state: Record<string, MemberActivitySummary> = {}
    let alive = true
    const ids = memberIds.split(',') as SessionId[]
    void Promise.all(ids.map(async (id) => {
      try {
        let events: unknown[] = []
        // 队员 = subagent 会话：follow 必须走持久父地址（parent = 本 lead 会话；mode unknown
        // 不断言队员形态）——纯 id 形态被 host 守卫拒（2026-10-11 首验实测）。
        for await (const frame of follow(
          { kind: 'subagent', parentSessionId: sessionId, childSessionId: id, mode: 'unknown' },
          controller.signal,
        )) {
          if (frame.kind === 'history') events = [...frame.events]
          else events = [...events, frame.event]
          if (!alive) return
          state[id] = foldMemberActivity(events)
          setMemberSummaries({ ...state })
        }
      } catch (cause) {
        if (!controller.signal.aborted) console.error('[research-status] 队员流失败', id, String(cause))
      }
    }))
    return () => { alive = false; controller.abort() }
  }, [memberIds, sessionId])

}
