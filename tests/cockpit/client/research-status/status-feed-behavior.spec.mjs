// status-feed-behavior.spec.mjs — useStatusFeed 与 useMemberActivity 的 JSDOM/React 行为测试。
//
// 归属：住 client/research-status/，只直接 import src/client/research-status/* 与根 locales.ts。
// 覆盖边界：会话切换异步竞态隔离、30s 轮询与停摆计时推进、retry() 恢复、HITL false→true 单次
// revealStatusTab 触发，以及 teammate subagent 地址格式与卸载 abort 清理。
//
// 红证：去掉 useStatusFeed 会话复位（BUG-117）/ stopped 守卫 / setInterval(30_000) /
// follow subagent 父地址 → 本文件对应测试当场红。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { useStatusFeed } from '../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'
import { useMemberActivity } from '../../../../packages/deep-research-pack/src/client/research-status/useMemberActivity.ts'
import { toolCall } from '../../../fixtures/events.mjs'
import { createDeferred, flushMicrotasks, flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../../client-dom-helpers.mjs'

const { render, act, cleanup } = await loadRtl()
const tZh = makeTranslator(zh)

afterEach(() => {
  cleanup()
})

function makeStreamController() {
  const streams = new Map()
  return {
    get calls() {
      return [...streams.keys()]
    },
    emitHistory(key, events) {
      streams.get(key)?.onFrame({ kind: 'history', events })
    },
    fail(key, err) {
      streams.get(key)?.onError(err)
    },
    follow(target, signal) {
      const key = typeof target === 'string' ? target : `${target.kind}:${target.parentSessionId}:${target.childSessionId}:${target.mode}`
      const queue = []
      let waiting = null
      let error = null
      const entry = {
        target,
        signal,
        onFrame(frame) {
          if (waiting) {
            const w = waiting
            waiting = null
            w.resolve({ value: frame, done: false })
          } else {
            queue.push(frame)
          }
        },
        onError(err) {
          error = err
          if (waiting) {
            const w = waiting
            waiting = null
            w.reject(err)
          }
        },
      }
      streams.set(key, entry)
      return {
        [Symbol.asyncIterator]() {
          return {
            async next() {
              if (error) throw error
              if (queue.length > 0) return { value: queue.shift(), done: false }
              if (signal.aborted) return { value: undefined, done: true }
              return await new Promise((resolve, reject) => {
                waiting = { resolve, reject }
                signal.addEventListener('abort', () => {
                  if (waiting) {
                    waiting = null
                    resolve({ value: undefined, done: true })
                  }
                }, { once: true })
              })
            },
          }
        },
      }
    },
    recordOf(key) {
      return streams.get(key)
    },
  }
}

function Harness({ props, onFeed }) {
  const feed = useStatusFeed(props)
  onFeed(feed)
  return createElement('div', { 'data-settled': String(feed.scanSettled) }, feed.face?.questionLine ?? 'none')
}

function makeBaseProps(overrides = {}) {
  return {
    sessionId: 's1',
    t: tZh,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    openFinal: () => {},
    openOwner: () => {},
    revealStatusTab: () => {},
    follow: makeStreamController().follow,
    runSource: () => makeMaliciousRunSource().source,
    visible: true,
    ...overrides,
  }
}

test('useStatusFeed：会话切换竞态（s1 慢 IO 晚于 s2 落地，绝不串染 s2）', async () => {
  const ctrl = makeStreamController()
  const slowList = createDeferred()
  const s1Source = makeMaliciousRunSource({
    tree: {
      drt_alpha: { 'question.md': '# Alpha 问题\n\n详细正文内容\n' },
    },
    deferredPaths: { drt_alpha: slowList },
  })
  const s2Source = makeMaliciousRunSource({
    tree: {
      drt_beta: { 'question.md': '# Beta 问题\n\n来自会话二的真实问题\n' },
    },
  })

  let latestFeed
  const props = makeBaseProps({
    sessionId: 's1',
    follow: (target, signal) => ctrl.follow(target, signal),
    runSource: (sid) => (sid === 's1' ? s1Source.source : s2Source.source),
  })

  const view = render(createElement(Harness, { props, onFeed: (f) => { latestFeed = f } }))
  await act(async () => {
    ctrl.emitHistory('s1', [toolCall({ name: 'write_file', arguments: { path: 'drt_alpha/question.md' } })])
    await flushMicrotasks()
  })

  // 在 s1 仍在等待 drt_alpha list 期间切换到 s2
  await act(async () => {
    view.rerender(createElement(Harness, { props: { ...props, sessionId: 's2' }, onFeed: (f) => { latestFeed = f } }))
    await flushMicrotasks()
  })

  assert.equal(latestFeed.trust.kind, 'unbound')
  assert.equal(latestFeed.face, null)

  await act(async () => {
    ctrl.emitHistory('s2', [toolCall({ name: 'write_file', arguments: { path: 'drt_beta/question.md' } })])
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.trust.slug, 'beta')
  assert.equal(latestFeed.face?.questionLine, '来自会话二的真实问题')

  // 现在才放行 s1 的陈旧慢读；s2 状态不得被 Alpha 覆盖
  await act(async () => {
    slowList.resolve()
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.trust.slug, 'beta')
  assert.equal(latestFeed.face?.questionLine, '来自会话二的真实问题')
})

test('useStatusFeed：30s 定时器重扫与停摆阈值推进 + retry() 从 unreadable 恢复', async (t) => {
  const startMs = 1_700_000_000_000
  t.mock.timers.enable({ apis: ['setInterval', 'Date'], now: startMs })
  t.after(() => t.mock.timers.reset())

  const ctrl = makeStreamController()
  const run = makeMaliciousRunSource({
    tree: { drt_run1: { 'question.md': '# 研究\n\n有效研究正文\n' } },
    dirFaults: { drt_run1: 'unreadable' },
  })

  let latestFeed
  const props = makeBaseProps({
    sessionId: 's1',
    follow: (target, signal) => ctrl.follow(target, signal),
    runSource: () => run.source,
  })
  render(createElement(Harness, { props, onFeed: (f) => { latestFeed = f } }))

  await act(async () => {
    ctrl.emitHistory('s1', [
      toolCall({ name: 'write_file', time: startMs - 29 * 60_000 - 40_000, arguments: { path: 'drt_run1/question.md' } }),
      { type: 'turn/end', time: startMs - 29 * 60_000 - 30_000, data: { error: 'boom' } },
    ])
    await flushMicrotasks(15)
  })

  assert.equal(latestFeed.scanSettled, true)
  assert.equal(latestFeed.reads.bundle, 'unreadable')
  assert.equal(latestFeed.health?.stalled, false)

  // 修复故障并推进 30s：定时器既触发重扫（bundle ok），也推进 nowTick 使静默跨过 30min
  run.update({ dirFaults: {} })
  const callsBeforeTick = run.calls.length
  await act(async () => {
    t.mock.timers.tick(30_000)
    await flushMicrotasks(20)
  })
  assert.ok(run.calls.length > callsBeforeTick, '30s 定时器必须触发重扫')
  assert.equal(latestFeed.reads.bundle, 'ok')
  assert.equal(latestFeed.health?.stalled, true)

  // 若再度变坏后再修好，调用 retry() 立即重扫恢复
  run.update({ dirFaults: { drt_run1: 'unreadable' } })
  await act(async () => {
    latestFeed.retry()
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.reads.bundle, 'unreadable')

  run.update({ dirFaults: {} })
  await act(async () => {
    latestFeed.retry()
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.reads.bundle, 'ok')
})

test('useStatusFeed：HITL false→true 单次触发 revealStatusTab；已 pending 不重复拉起', async () => {
  const ctrl = makeStreamController()
  let revealCount = 0
  const props = makeBaseProps({
    sessionId: 's1',
    follow: (target, signal) => ctrl.follow(target, signal),
    revealStatusTab: () => { revealCount += 1 },
  })
  render(createElement(Harness, { props, onFeed: () => {} }))

  await act(async () => {
    ctrl.emitHistory('s1', [toolCall({ name: 'ask_user_question', callId: 'c1', arguments: { questions: [] } })])
    await flushMicrotasks()
  })
  assert.equal(revealCount, 1)

  // 后续同在 pending 态的新事件不得反复抢焦点调用 revealStatusTab
  await act(async () => {
    ctrl.recordOf('s1').onFrame({ kind: 'event', event: { type: 'assistant/thinking', data: {} } })
    await flushMicrotasks()
  })
  assert.equal(revealCount, 1)
})

test('useMemberActivity：teammate follow 必须携带持久 subagent 父地址并在卸载 abort', async () => {
  const ctrl = makeStreamController()
  let latestSummaries = {}
  function MemberHarness({ memberIds, sessionId }) {
    useMemberActivity({
      memberIds,
      sessionId,
      follow: (target, signal) => ctrl.follow(target, signal),
      t: tZh,
      setMemberSummaries: (next) => { latestSummaries = next },
    })
    return createElement('div')
  }

  const view = render(createElement(MemberHarness, { memberIds: 'm1,m2', sessionId: 'lead-1' }))
  await flushUi(act)

  const m1Key = 'subagent:lead-1:m1:unknown'
  const m2Key = 'subagent:lead-1:m2:unknown'
  assert.ok(ctrl.recordOf(m1Key), '必须使用 subagent 父地址 follow 队员 m1')
  assert.ok(ctrl.recordOf(m2Key), '必须使用 subagent 父地址 follow 队员 m2')
  assert.equal(ctrl.recordOf(m1Key).signal.aborted, false)

  await act(async () => {
    ctrl.emitHistory(m1Key, [toolCall({ name: 'web_search', callId: 'ws-1', arguments: { queries: ['test query'] } })])
    await flushMicrotasks(15)
  })
  await flushUi(act)
  assert.equal(latestSummaries.m1?.searchCount, 1)

  view.unmount()
  assert.equal(ctrl.recordOf(m1Key).signal.aborted, true, '卸载后必须 abort 旧队员流')
  assert.equal(ctrl.recordOf(m2Key).signal.aborted, true, '卸载后必须 abort 旧队员流')
})
