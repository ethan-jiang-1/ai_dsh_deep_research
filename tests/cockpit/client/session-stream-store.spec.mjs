// session-stream-store.spec.mjs — 按 sessionId 共享 follow 流的引用计数合流回归。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSessionStreamStore } from '../../../packages/deep-research-pack/src/client/session-stream-store.ts'

test('session-stream-store：同 sessionId 双订阅只开 1 条上游流，后加入者即时回放快照，全退订才 abort', async () => {
  let opens = 0
  let aborts = 0
  let pushEvent = null

  const rawFollow = (target, signal) => {
    opens += 1
    signal.addEventListener('abort', () => { aborts += 1 }, { once: true })
    return {
      async *[Symbol.asyncIterator]() {
        yield { kind: 'history', events: [{ type: 'turn/start', seq: 1 }] }
        while (!signal.aborted) {
          const ev = await new Promise((resolve) => {
            pushEvent = resolve
            signal.addEventListener('abort', () => resolve(null), { once: true })
          })
          if (ev === null) break
          yield ev
        }
      },
    }
  }

  const store = createSessionStreamStore(rawFollow)
  const c1 = new AbortController()
  const c2 = new AbortController()
  const it1 = store.follow('s1', c1.signal)[Symbol.asyncIterator]()
  const first = await it1.next()
  assert.equal(first.done, false)
  assert.equal(first.value.kind, 'history')
  assert.equal(opens, 1, '首次订阅开启 1 条上游流')

  const it2 = store.follow('s1', c2.signal)[Symbol.asyncIterator]()
  const replay = await it2.next()
  assert.equal(replay.value.kind, 'history')
  assert.equal(opens, 1, '同 sessionId 第二订阅不新开上游流')
  assert.equal(store.activeCount(), 1)

  const livePromise = Promise.all([it1.next(), it2.next()])
  pushEvent({ kind: 'event', event: { type: 'user/message', seq: 2 } })
  const [r1, r2] = await livePromise
  assert.equal(r1.value.kind, 'event')
  assert.equal(r2.value.kind, 'event')

  c1.abort()
  await Promise.resolve()
  assert.equal(aborts, 0, '还有 1 个订阅者在听，不能 abort 上游流')

  c2.abort()
  await Promise.resolve()
  assert.equal(aborts, 1, '最后一个订阅者退订后立刻 abort 上游流')
  assert.equal(store.activeCount(), 0)
  store.dispose()
})
