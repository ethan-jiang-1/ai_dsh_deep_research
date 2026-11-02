// session-follow.ts — journal follow 的装配层（wire 帧 → 观察面领域帧）。
//
// 从 client/index.ts 拆出（2026-11-03 审计 P4：apply 612 行 → 目标 ≤250）。纯装配、
// 无 DOM/React；`remote` 以结构类型注入，测试用假 remote 直接驱动。
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { FollowTarget, JournalFrame } from './research-status/types.ts'
import { methodLibraryCoachEventOf, type MethodLibraryCoachEvent } from '../lib/method-library-events.ts'

/** 一条 follow 流（组件注入面 + 内部消费共用同一形状）。 */
export type Follow = (target: FollowTarget, signal: AbortSignal) => AsyncGenerator<JournalFrame>

/** `remote.session.follow` 的最小结构面（vendor wire 帧）。 */
export interface FollowRemoteLike {
  readonly session: {
    follow(input: { readonly address: unknown }, signal: AbortSignal): AsyncIterable<{
      readonly type: string
      readonly records?: readonly { readonly event: unknown }[]
      readonly event?: unknown
    }>
  }
}

/** 建 follow：snapshot → history、event → event；其余帧类型忽略（vendor 未来帧不炸）。 */
export function createFollow(remote: FollowRemoteLike): Follow {
  return async function* follow(target, signal) {
    const address = typeof target === 'string' ? { kind: 'session' as const, sessionId: target } : target
    for await (const frame of remote.session.follow({ address }, signal)) {
      if (frame.type === 'snapshot') {
        yield { kind: 'history', events: (frame.records ?? []).map((record) => record.event) }
      } else if (frame.type === 'event') {
        yield { kind: 'event', event: frame.event }
      }
    }
  }
}

/**
 * 首屏起步卡的一次性探测：follow 的首帧 snapshot 里有没有用户消息；拿到就 abort，
 * 不订阅后续事件。失败按"没有消息"处理（卡片仍显示，不红错）。
 */
export async function hasUserMessage(follow: Follow, sessionId: SessionId): Promise<boolean> {
  const controller = new AbortController()
  try {
    for await (const frame of follow(sessionId, controller.signal)) {
      if (frame.kind === 'history') return frame.events.some((event) => (event as { type?: string } | null)?.type === 'user/message')
      return false
    }
  } catch {
    return false
  } finally {
    controller.abort()
  }
  return false
}

/**
 * 方法编辑会话的事件流：首帧 history 视为 ready（会话可访谈），后续 event 解码成 coach 事件。
 * 解码不到的事件忽略（live event 是追加流，形态归 lib/method-library-events.ts）。
 */
export async function watchCoach(
  follow: Follow,
  sessionId: SessionId,
  signal: AbortSignal,
  onEvent: (event: MethodLibraryCoachEvent) => void,
  onReady: () => void,
): Promise<void> {
  let ready = false
  for await (const frame of follow(sessionId, signal)) {
    if (frame.kind === 'history') {
      if (!ready) {
        ready = true
        onReady()
      }
      continue
    }
    const event = methodLibraryCoachEventOf(frame.event)
    if (event !== null) onEvent(event)
  }
}
