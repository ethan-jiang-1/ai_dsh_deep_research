// graph-feed-behavior.spec.mjs — useGraphFeed 的 JSDOM/React 行为测试。
//
// 归属：住 client/research-graph/，只直接 import src/client/research-graph/* 与根 locales.ts。
// 覆盖边界：会话切换复位与慢 IO 隔离、5s plan 定时重读、retry() 恢复、follow 断连有界重试
// （<=3 次并保留 followError）、plan/vN.md 快照四态（ready/missing/empty/invalid/unreadable）。
//
// 红证：去掉 follow 有界重试上限或 followError / 去掉 stopped 守卫 → 本文件红。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { useGraphFeed } from '../../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts'
import { toolCall } from '../../../fixtures/events.mjs'
import { createDeferred, flushMicrotasks, loadRtl, makeMaliciousRunSource } from '../../client-dom-helpers.mjs'

const { render, act, cleanup } = await loadRtl()

afterEach(() => {
  cleanup()
})

const VALID_PLAN = [
  'version: v2',
  '| id | parent | lifecycle | kind | question | ownerRole | deps | output |',
  '|---|---|---|---|---|---|---|---|',
  '| W1 | — | active | broad-scan | q | Scout-1 | — | leads |',
].join('\n')

function Harness({ props, leadSessionId, onFeed }) {
  const feed = useGraphFeed(props, leadSessionId)
  onFeed(feed)
  return createElement('div', { 'data-plan-state': feed.planState }, feed.boundSlug ?? 'unbound')
}

test('useGraphFeed：会话切换复位 + 5s 定时重读 + retry() 恢复', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: 1_700_000_000_000 })
  t.after(() => t.mock.timers.reset())

  const slowPlan = createDeferred()
  const run = makeMaliciousRunSource({
    tree: {
      drt_one: { 'plan.md': VALID_PLAN },
      drt_two: { 'plan.md': VALID_PLAN.replace('Scout-1', 'Scout-2') },
    },
    deferredPaths: { 'drt_one/plan.md': slowPlan },
  })

  const follow = (sid, signal) => {
    const slug = sid === 'lead-1' ? 'one' : 'two'
    return {
      async *[Symbol.asyncIterator]() {
        yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: `drt_${slug}/question.md` } })] }
        await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
      },
    }
  }

  let latestFeed
  const props = {
    sessionId: 'lead-1',
    t: (k) => k,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    follow,
    runSource: () => run.source,
    visible: true,
  }

  const view = render(createElement(Harness, { props, leadSessionId: 'lead-1', onFeed: (f) => { latestFeed = f } }))
  await act(async () => { await flushMicrotasks(15) })
  assert.equal(latestFeed.boundSlug, 'one')
  assert.equal(latestFeed.planState, 'loading')

  // 在 drt_one/plan.md 阻塞期间切到 lead-2
  await act(async () => {
    view.rerender(createElement(Harness, { props: { ...props, sessionId: 'lead-2' }, leadSessionId: 'lead-2', onFeed: (f) => { latestFeed = f } }))
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.boundSlug, 'two')
  assert.equal(latestFeed.planState, 'ready')
  assert.equal(latestFeed.plan?.nodes[0]?.ownerRole, 'Scout-2')

  // 放行旧会话 promise：不得把 Scout-1 回写覆盖 lead-2
  await act(async () => {
    slowPlan.resolve()
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.plan?.nodes[0]?.ownerRole, 'Scout-2')

  // 5s 定时器应再次读取 plan.md，并将 truncated 恢复经 retry() 验证
  const callsBeforePoll = run.calls.length
  await act(async () => {
    t.mock.timers.tick(5_000)
    await flushMicrotasks(15)
  })
  assert.ok(run.calls.length > callsBeforePoll, '5s 定时器必须触发 plan.md 重读')

  run.update({ fileFaults: { 'drt_two/plan.md': 'truncated' } })
  await act(async () => {
    latestFeed.retry()
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.planState, 'truncated')

  run.update({ fileFaults: {} })
  await act(async () => {
    latestFeed.retry()
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.planState, 'ready')
})

test('useGraphFeed：follow 失败有界重试（最多 3 次）且保留 followError', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_700_000_000_000 })
  t.after(() => t.mock.timers.reset())

  let followCalls = 0
  const follow = () => ({
    async *[Symbol.asyncIterator]() {
      followCalls += 1
      throw new Error('Remote stream WebSocket closed')
    },
  })

  let latestFeed
  const props = {
    sessionId: 'lead-err',
    t: (k) => k,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    follow,
    runSource: () => makeMaliciousRunSource().source,
    visible: true,
  }
  render(createElement(Harness, { props, leadSessionId: 'lead-err', onFeed: (f) => { latestFeed = f } }))
  await act(async () => { await flushMicrotasks(10) })
  assert.equal(followCalls, 1)
  assert.match(latestFeed.followError ?? '', /WebSocket closed/)

  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      t.mock.timers.tick(2_000)
      await flushMicrotasks(10)
    })
  }
  assert.equal(followCalls, 4, '首轮 1 次 + 最多 3 次 2s 重试 = 4 次，不可无限重试')
  assert.match(latestFeed.followError ?? '', /WebSocket closed/, '重试耗尽后仍须保留 followError')
})

test('useGraphFeed：plan/vN.md 快照五态（ready / missing / empty / invalid / unreadable）', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_snap: {
        'plan.md': VALID_PLAN,
        plan: { 'v1.md': VALID_PLAN },
      },
    },
  })
  const follow = (_sid, signal) => ({
    async *[Symbol.asyncIterator]() {
      yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: 'drt_snap/plan.md' } })] }
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
  })

  let latestFeed
  const props = {
    sessionId: 'lead-s',
    t: (k) => k,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    follow,
    runSource: () => run.source,
    visible: true,
  }
  render(createElement(Harness, { props, leadSessionId: 'lead-s', onFeed: (f) => { latestFeed = f } }))
  await act(async () => { await flushMicrotasks(15) })
  assert.equal(latestFeed.latestSnapshot, 1)
  assert.equal(latestFeed.snapshotState, 'idle')

  // 切 diff → ready
  await act(async () => {
    latestFeed.setGraphView('diff')
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.snapshotState, 'ready')

  // 注入 empty → close diff 再重开触发按需读
  run.update({ fileFaults: { 'drt_snap/plan/v1.md': 'empty' } })
  await act(async () => { latestFeed.setGraphView('current'); await flushMicrotasks() })
  await act(async () => { latestFeed.setGraphView('diff'); await flushMicrotasks(15) })
  assert.equal(latestFeed.snapshotState, 'empty')

  // unreadable
  run.update({ fileFaults: { 'drt_snap/plan/v1.md': 'unreadable' } })
  await act(async () => { latestFeed.setGraphView('current'); await flushMicrotasks() })
  await act(async () => { latestFeed.setGraphView('diff'); await flushMicrotasks(15) })
  assert.equal(latestFeed.snapshotState, 'unreadable')

  // invalid（有正文但无节点表）
  run.update({
    fileFaults: {},
    tree: { drt_snap: { 'plan.md': VALID_PLAN, plan: { 'v1.md': '# Not a plan table\njust prose\n' } } },
  })
  await act(async () => { latestFeed.setGraphView('current'); await flushMicrotasks() })
  await act(async () => { latestFeed.setGraphView('diff'); await flushMicrotasks(15) })
  assert.equal(latestFeed.snapshotState, 'invalid')

  // missing
  run.update({ fileFaults: { 'drt_snap/plan/v1.md': 'missing' } })
  await act(async () => { latestFeed.setGraphView('current'); await flushMicrotasks() })
  await act(async () => { latestFeed.setGraphView('diff'); await flushMicrotasks(15) })
  assert.equal(latestFeed.snapshotState, 'missing')
})
