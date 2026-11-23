// config-feed-behavior.spec.mjs — useConfigFeed 的 JSDOM/React 异步行为测试（补强静态源码测试）。
//
// 归属：住 client/research-config/，只直接 import src/client/research-config/* 与根 locales.ts。
// 覆盖边界：readLibrary 跨会话慢竞态（BUG-086）真异步拦截、send() 后 assistant repliedMarker
// 过滤与有界对账轮询 landed、follow 流中断 fail-soft，以及 question.md 采用度读取五态。
//
// 红证：去掉 reload 的 epoch/session 守卫、或把 repliedMarker 设为 0 → 本文件对应测试红。
// 负例留证 2026-11-23：BUG-086——把 useConfigFeed reload 回写条件改为只看 seq（去掉 epoch.current === sid），
// 慢 s1 readLibrary 晚于 s2 落地后把 s2 entries 覆写成 ["打法A"] → 下方 test 当场红；还原 → 绿。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { useConfigFeed } from '../../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts'
import { toolCall } from '../../../fixtures/events.mjs'
import { createDeferred, flushMicrotasks, flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../../client-dom-helpers.mjs'

const { render, act, cleanup } = await loadRtl()
const tZh = makeTranslator(zh)

afterEach(() => {
  cleanup()
})

const LIB_ENTRY_A = '## 打法A\n### 找来源\n- a\n### 怎么核实\n- b\n### 报告怎么写\n- c\n### 不承诺\n- d\n'
const LIB_ENTRY_B = '## 打法B\n### 找来源\n- x\n### 怎么核实\n- y\n### 报告怎么写\n- z\n### 不承诺\n- w\n'

function makeDummyDefaults() {
  const snap = {
    phase: 'ready',
    value: {},
    problems: [],
    warnings: [],
    methodDefault: null,
    methodConflict: false,
    methodRead: 'absent',
    revision: 0,
    pending: false,
    outcome: null,
  }
  return {
    subscribe: () => () => {},
    getSnapshot: () => snap,
    refresh: async () => {},
    setPatch: async () => {},
    unset: async () => {},
    clear: async () => {},
    dispose: () => {},
  }
}

function Harness({ props, onFeed }) {
  const feed = useConfigFeed(props)
  onFeed(feed)
  return createElement('div', { 'data-lib-read': feed.libraryRead }, feed.entries?.map((e) => e.name).join(',') ?? '')
}

test('useConfigFeed：跨会话慢 readLibrary 竞态与 signal.aborted（真行为证明 BUG-086）', async () => {
  const slowS1 = createDeferred()
  const signals = {}
  const readLibrary = async (sid, _path, signal) => {
    signals[sid] = signal
    if (sid === 's1') {
      await slowS1.promise
      return { kind: 'ok', text: LIB_ENTRY_A }
    }
    return { kind: 'ok', text: LIB_ENTRY_B }
  }

  let latestFeed
  const baseProps = {
    sessionId: 's1',
    t: tZh,
    readFile: async () => null,
    readLibrary,
    runSource: () => makeMaliciousRunSource().source,
    listDir: async () => [],
    follow: async function* (_target, signal) {
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendInstruction: async () => ({ ok: true, detail: 'sent' }),
    defaults: makeDummyDefaults(),
  }

  const view = render(createElement(Harness, { props: baseProps, onFeed: (f) => { latestFeed = f } }))
  await act(async () => { await flushMicrotasks() })
  assert.equal(signals.s1.aborted, false)

  // s1 readLibrary 悬而未决时切到 s2
  await act(async () => {
    view.rerender(createElement(Harness, { props: { ...baseProps, sessionId: 's2' }, onFeed: (f) => { latestFeed = f } }))
    await flushMicrotasks(15)
  })

  assert.equal(signals.s1.aborted, true, '切会话必须 abort s1 的 readLibrary')
  assert.equal(latestFeed.libraryRead, 'ok')
  assert.deepEqual(latestFeed.entries?.map((e) => e.name), ['打法B'])

  // 放行旧 s1 promise：epoch 守卫必须拒绝对 s2 的回写
  await act(async () => {
    slowS1.resolve()
    await flushMicrotasks(15)
  })
  assert.deepEqual(latestFeed.entries?.map((e) => e.name), ['打法B'])
})

test('useConfigFeed：send() 回执只认发送后回话 + 落盘对账 landed 停止轮询', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_700_000_000_000 })
  t.after(() => t.mock.timers.reset())

  let libText = LIB_ENTRY_A
  let readCount = 0
  let emitLiveEvent
  const baseProps = {
    sessionId: 's1',
    t: tZh,
    readFile: async () => null,
    readLibrary: async () => {
      readCount += 1
      return { kind: 'ok', text: libText }
    },
    runSource: () => makeMaliciousRunSource().source,
    listDir: async () => [],
    follow: (_sid, signal) => ({
      async *[Symbol.asyncIterator]() {
        // 发送前的旧 assistant 消息（不得冒充“已回话”）
        yield { kind: 'history', events: [{ type: 'message/assistant', data: { text: '历史回复' } }] }
        await new Promise((resolve) => {
          emitLiveEvent = (ev) => resolve({ value: { kind: 'event', event: ev }, done: false })
          signal.addEventListener('abort', () => resolve(null), { once: true })
        }).then((next) => next)
      },
    }),
    sendInstruction: async () => ({ ok: true, detail: 'queued' }),
    defaults: makeDummyDefaults(),
  }

  let latestFeed
  render(createElement(Harness, { props: baseProps, onFeed: (f) => { latestFeed = f } }))
  await act(async () => {
    t.mock.timers.tick(0)
    await flushMicrotasks(15)
  })

  let onOkCalled = false
  let sendPromise
  await act(async () => {
    sendPromise = latestFeed.send('新增 打法B', { target: '打法B', expectsChange: true }, () => { onOkCalled = true })
    await flushMicrotasks(10)
    t.mock.timers.tick(0)
    await flushMicrotasks(10)
  })

  assert.equal(onOkCalled, true)
  // 旧历史里的 assistant 消息不得触发已回话状态
  assert.equal(latestFeed.receipt?.state, 'sent')

  // 首轮 3s 仍未落盘
  const readsAtSend = readCount
  await act(async () => {
    t.mock.timers.tick(3_000)
    await flushMicrotasks(10)
  })
  assert.ok(readCount > readsAtSend)
  assert.equal(latestFeed.receipt?.state, 'sent')

  // 第二轮 3s 前，模拟库写入 打法B
  libText = `${LIB_ENTRY_A}\n${LIB_ENTRY_B}`
  await act(async () => {
    t.mock.timers.tick(3_000)
    await flushMicrotasks(15)
  })
  assert.equal(latestFeed.receipt?.state, 'landed')
  await sendPromise
})

test('useConfigFeed：follow 失败 fail-soft 且 question.md 采用度如实分级', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_c: {
        'question.md': '# Question\n\n## 研究方法（本次实际采用）\n- 采用: 方案比较（源自 内置）\n- 来源: 内置方法\n- 调查要求: 同口径对比\n',
      },
    },
  })
  let latestFeed
  const baseProps = {
    sessionId: 's1',
    t: tZh,
    readFile: async () => null,
    readLibrary: async () => ({ kind: 'absent' }),
    runSource: () => run.source,
    listDir: async () => [],
    follow: async function* () {
      yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: 'drt_c/question.md' } })] }
      throw new Error('follow crashed')
    },
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    defaults: makeDummyDefaults(),
  }

  render(createElement(Harness, { props: baseProps, onFeed: (f) => { latestFeed = f } }))
  await flushUi(act)

  assert.equal(latestFeed.libraryRead, 'absent', 'follow 异常不得破坏库读态')
  assert.equal(latestFeed.adoption.kind, 'recorded')
  assert.equal(latestFeed.adoption.adopted, '方案比较')
  assert.equal(latestFeed.adoption.origin, '内置方法')

  // question.md 被删 → unreadable-or-missing adoption 分支
  run.update({ fileFaults: { 'drt_c/question.md': 'missing' } })
  const view2 = render(createElement(Harness, { props: { ...baseProps, sessionId: 's2' }, onFeed: (f) => { latestFeed = f } }))
  await flushUi(act)
  assert.equal(latestFeed.adoption.kind, 'missing')
  view2.unmount()
})
