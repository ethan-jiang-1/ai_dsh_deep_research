/**
 * session-stream-store.ts —— 按 `sessionId` 引用计数复用单条 `remote.session.follow` 流。
 *
 * 让 `ResearchStatusTab`、`ResearchStatusTitle`、`ResearchHeaderPill` 等同一会话的多个观察面
 * 共享一条 WebSocket journal 流，避免打开一次会话起多条重复订阅。
 * 边界：subagent 子会话目标原样透传，不做持久化缓存；全员退订或 `dispose()` 时立刻 abort 上游。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { Follow } from './session-follow.ts'
import type { FollowTarget, JournalFrame } from './research-status/types.ts'

interface SubscriberQueue {
  readonly signal: AbortSignal
  readonly queue: JournalFrame[]
  waiting: ((result: IteratorResult<JournalFrame>) => void) | null
  rejectWaiting: ((error: unknown) => void) | null
  closed: boolean
  error: unknown
}

interface SharedStream {
  readonly controller: AbortController
  readonly subscribers: Set<SubscriberQueue>
  hasHistory: boolean
  events: unknown[]
  ended: boolean
  error: unknown
}

export interface SessionStreamStore {
  readonly follow: Follow
  readonly activeCount: () => number
  readonly dispose: () => void
}

function pushFrame(sub: SubscriberQueue, frame: JournalFrame): void {
  if (sub.closed) return
  if (sub.waiting !== null) {
    const resolve = sub.waiting
    sub.waiting = null
    sub.rejectWaiting = null
    resolve({ value: frame, done: false })
  } else {
    sub.queue.push(frame)
  }
}

function failSub(sub: SubscriberQueue, error: unknown): void {
  if (sub.closed) return
  sub.error = error
  if (sub.rejectWaiting !== null) {
    const reject = sub.rejectWaiting
    sub.waiting = null
    sub.rejectWaiting = null
    reject(error)
  }
}

function finishSub(sub: SubscriberQueue): void {
  if (sub.closed) return
  sub.closed = true
  if (sub.waiting !== null) {
    const resolve = sub.waiting
    sub.waiting = null
    sub.rejectWaiting = null
    resolve({ value: undefined, done: true })
  }
}

/**
 * 创建按 `sessionId` 合流的 `SessionStreamStore`。
 */
export function createSessionStreamStore(rawFollow: Follow): SessionStreamStore {
  const streams = new Map<SessionId, SharedStream>()
  let disposed = false

  const startUpstream = (sessionId: SessionId, entry: SharedStream): void => {
    void (async () => {
      try {
        for await (const frame of rawFollow(sessionId, entry.controller.signal)) {
          if (entry.controller.signal.aborted || disposed) break
          if (frame.kind === 'history') {
            entry.hasHistory = true
            entry.events = [...frame.events]
          } else {
            entry.events.push(frame.event)
          }
          for (const sub of [...entry.subscribers]) {
            pushFrame(sub, frame)
          }
        }
        entry.ended = true
        for (const sub of [...entry.subscribers]) finishSub(sub)
      } catch (cause) {
        if (!entry.controller.signal.aborted) {
          entry.error = cause
          for (const sub of [...entry.subscribers]) failSub(sub, cause)
        }
      } finally {
        if (streams.get(sessionId) === entry) streams.delete(sessionId)
      }
    })()
  }

  const follow: Follow = (target: FollowTarget, signal: AbortSignal) => {
    if (typeof target !== 'string') {
      return rawFollow(target, signal)
    }
    const sessionId = target
    return {
      [Symbol.asyncIterator]() {
        let entry = streams.get(sessionId)
        if (entry === undefined) {
          entry = {
            controller: new AbortController(),
            subscribers: new Set(),
            hasHistory: false,
            events: [],
            ended: false,
            error: null,
          }
          streams.set(sessionId, entry)
          startUpstream(sessionId, entry)
        }
        const activeEntry = entry
        const sub: SubscriberQueue = {
          signal,
          queue: [],
          waiting: null,
          rejectWaiting: null,
          closed: signal.aborted || disposed,
          error: null,
        }
        activeEntry.subscribers.add(sub)
        if (activeEntry.hasHistory && !sub.closed) {
          sub.queue.push({ kind: 'history', events: [...activeEntry.events] })
        }
        const cleanup = (): void => {
          sub.closed = true
          activeEntry.subscribers.delete(sub)
          if (activeEntry.subscribers.size === 0) {
            activeEntry.controller.abort()
            if (streams.get(sessionId) === activeEntry) streams.delete(sessionId)
          }
          if (sub.waiting !== null) {
            const resolve = sub.waiting
            sub.waiting = null
            sub.rejectWaiting = null
            resolve({ value: undefined, done: true })
          }
        }
        signal.addEventListener('abort', cleanup, { once: true })

        return {
          async next(): Promise<IteratorResult<JournalFrame>> {
            if (sub.error !== null) throw sub.error
            if (sub.queue.length > 0) return { value: sub.queue.shift() as JournalFrame, done: false }
            if (sub.closed || signal.aborted || disposed || activeEntry.ended) {
              cleanup()
              return { value: undefined, done: true }
            }
            if (activeEntry.error !== null) throw activeEntry.error
            return await new Promise<IteratorResult<JournalFrame>>((resolve, reject) => {
              sub.waiting = resolve
              sub.rejectWaiting = reject
            })
          },
          async return(): Promise<IteratorResult<JournalFrame>> {
            cleanup()
            return { value: undefined, done: true }
          },
          async throw(err: unknown): Promise<IteratorResult<JournalFrame>> {
            cleanup()
            throw err
          },
        }
      },
      [Symbol.asyncDispose]: async () => {},
    } as unknown as AsyncGenerator<JournalFrame>
  }

  return {
    follow,
    activeCount: () => streams.size,
    dispose: () => {
      disposed = true
      for (const entry of streams.values()) {
        entry.controller.abort()
        for (const sub of [...entry.subscribers]) finishSub(sub)
      }
      streams.clear()
    },
  }
}
