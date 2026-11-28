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
import { ResearchConfigTab } from '../../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx'
import { useConfigFeed } from '../../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts'
import { toolCall } from '../../../fixtures/events.mjs'
import { createDeferred, flushMicrotasks, flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../../client-dom-helpers.mjs'

const { render, act, cleanup, fireEvent } = await loadRtl()
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

// 负例留证 2026-11-28：BUG-476——ResearchConfigTab 静默吞 libraryRead=unreadable、sending 期间未禁用
// 换一条菜单、sessionId=undefined 仍渲染 picker、页签 refresh 只调 reload 不刷 defaults/adoption、
// use-now 完成后不重读 question.md，且 useConfigFeed 异步读缺 try/catch。
test('BUG-476 ResearchConfigTab：libraryRead=unreadable 显性告警与重试；sending 禁用 picker；无 sessionId 隐藏 picker', async () => {
  let readCalls = 0
  let libState = 'unreadable'
  const sendDeferred = createDeferred()
  const baseProps = {
    sessionId: 's1',
    t: tZh,
    readFile: async () => null,
    readLibrary: async () => {
      readCalls += 1
      return libState === 'unreadable'
        ? { kind: 'unreadable', detail: 'EACCES' }
        : { kind: 'ok', text: LIB_ENTRY_A }
    },
    runSource: () => makeMaliciousRunSource().source,
    listDir: async () => [],
    follow: async function* (_target, signal) {
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendInstruction: async () => {
      await sendDeferred.promise
      return { ok: true, detail: 'sent' }
    },
    defaults: makeDummyDefaults(),
  }

  const view = render(createElement(ResearchConfigTab, baseProps))
  await flushUi(act)

  assert.ok(view.container.textContent?.includes(tZh('configLibraryUnreadable')), 'libraryRead=unreadable 必须显性展示 configLibraryUnreadable 告警')
  const warnEl = view.container.querySelector('[data-testid="config-library-unreadable"]')
  assert.ok(warnEl, '应存在 config-library-unreadable 告警块')
  const retryBtn = warnEl.querySelector('button')
  assert.ok(retryBtn, 'libraryRead=unreadable 告警必须附带重试按钮')

  // 点击重试恢复可读
  libState = 'ok'
  const readsBeforeRetry = readCalls
  await act(async () => {
    fireEvent.click(retryBtn)
    await flushMicrotasks(15)
  })
  assert.ok(readCalls > readsBeforeRetry, '点击重试必须重读方法库')
  assert.equal(view.container.querySelector('[data-testid="config-library-unreadable"]'), null, '恢复 ok 后告警消失')

  // sending 期间禁用 methodPicker 触发按钮
  const pickerBtn = [...view.container.querySelectorAll('button')].find((b) => b.textContent?.includes(tZh('pickMethodForLead')))
  assert.ok(pickerBtn, 'no-run 态应渲染 methodPicker 触发按钮')
  assert.equal(pickerBtn.disabled, false)
  fireEvent.click(pickerBtn)
  const item = document.querySelector('[role="menuitem"]')
  assert.ok(item, '点击 picker 应打开菜单项')
  await act(async () => {
    fireEvent.click(item)
    await flushMicrotasks(5)
  })
  assert.equal(pickerBtn.disabled, true, 'sending=true 期间必须禁用 methodPicker 按钮')
  sendDeferred.resolve()
  await act(async () => { await flushMicrotasks(10) })

  // sessionId=undefined 不渲染无响应的 methodPicker
  view.rerender(createElement(ResearchConfigTab, { ...baseProps, sessionId: undefined }))
  await flushUi(act)
  const pickerWhenNoSession = [...view.container.querySelectorAll('button')].find(
    (b) => b.textContent?.includes(tZh('pickMethodForLead')) || b.textContent?.includes(tZh('switchMethod')),
  )
  assert.equal(pickerWhenNoSession, undefined, 'sessionId=undefined 不得渲染 methodPicker')
})

test('BUG-476 ResearchConfigTab：页签 refresh 同步刷新 library、defaults 与 adoption', async () => {
  let libReads = 0
  let defaultsRefreshes = 0
  const run = makeMaliciousRunSource({
    tree: {
      drt_r: {
        'question.md': '# Q\n\n## 研究方法（本次实际采用）\n- 采用: 事实核查\n',
      },
    },
  })
  let boundCommands = null
  const defaults = {
    ...makeDummyDefaults(),
    refresh: async () => { defaultsRefreshes += 1 },
  }
  const props = {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        actions: {
          bindCommands: (cmds) => {
            boundCommands = cmds
            return () => {}
          },
        },
      },
    }),
    readFile: async () => null,
    readLibrary: async () => {
      libReads += 1
      return { kind: 'ok', text: LIB_ENTRY_A }
    },
    runSource: () => run.source,
    listDir: async () => [],
    follow: async function* (_target, signal) {
      yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: 'drt_r/question.md' } })] }
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    defaults,
  }

  render(createElement(ResearchConfigTab, props))
  await flushUi(act)
  assert.ok(boundCommands && typeof boundCommands.refresh === 'function')

  const libBefore = libReads
  const defBefore = defaultsRefreshes
  const qReadsBefore = run.calls.filter((c) => c[0] === 'read' && c[1] === 'drt_r/question.md').length

  await act(async () => {
    boundCommands.refresh()
    await flushMicrotasks(20)
  })
  await flushUi(act)

  assert.ok(libReads > libBefore, 'refresh 必须刷新方法库 reload')
  assert.ok(defaultsRefreshes > defBefore, 'refresh 必须刷新 defaults.refresh')
  const qReadsAfter = run.calls.filter((c) => c[0] === 'read' && c[1] === 'drt_r/question.md').length
  assert.ok(qReadsAfter > qReadsBefore, 'refresh 必须触发 retryAdoption 重读 question.md')
})

test('BUG-476 useConfigFeed：use-now 完成后重读 adoption，且异步读 reject 显性降级不抛未捕获异常', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_700_000_000_000 })
  t.after(() => t.mock.timers.reset())

  const run = makeMaliciousRunSource({
    tree: {
      drt_u: {
        'question.md': '# Q\n\n## 研究方法（本次实际采用）\n- 采用: 事实核查\n',
      },
    },
  })
  let latestFeed
  const baseProps = {
    sessionId: 's1',
    t: tZh,
    readFile: async () => null,
    readLibrary: async () => ({ kind: 'ok', text: LIB_ENTRY_A }),
    runSource: () => run.source,
    listDir: async () => [],
    follow: async function* (_target, signal) {
      yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: 'drt_u/question.md' } })] }
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    defaults: makeDummyDefaults(),
  }

  const view = render(createElement(Harness, { props: baseProps, onFeed: (f) => { latestFeed = f } }))
  await act(async () => {
    t.mock.timers.tick(0)
    await flushMicrotasks(20)
  })
  assert.equal(latestFeed.adoption.adopted, '事实核查')

  // 模拟 Lead 落盘更新了 question.md，发送 use-now 后等待 2500ms 必须重读 adoption
  run.update({
    tree: {
      drt_u: {
        'question.md': '# Q\n\n## 研究方法（本次实际采用）\n- 采用: 方案比较\n',
      },
    },
  })
  let sendPromise
  await act(async () => {
    sendPromise = latestFeed.send('使用 方案比较', { target: '方案比较', expectsChange: false })
    await flushMicrotasks(10)
    t.mock.timers.tick(2500)
    await flushMicrotasks(20)
  })
  await sendPromise
  await act(async () => { await flushMicrotasks(20) })
  assert.equal(latestFeed.adoption.adopted, '方案比较', 'use-now 完成后必须触发 retryAdoption 重读 question.md')
  view.unmount()

  // 异步读 reject：不得产生 unhandledRejection，且显性落为 unreadable
  const unhandled = []
  const onUnhandled = (reason) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  try {
    let errFeed
    const throwingSource = {
      root: '/tmp/bad',
      list: async () => { throw new Error('disk boom') },
      read: async () => { throw new Error('disk boom') },
    }
    const errView = render(createElement(Harness, {
      props: {
        ...baseProps,
        sessionId: 's-err',
        readLibrary: async () => { throw new Error('library boom') },
        runSource: () => throwingSource,
      },
      onFeed: (f) => { errFeed = f },
    }))
    await act(async () => { await flushMicrotasks(25) })
    assert.equal(unhandled.length, 0, `异步读 reject 不得产生 unhandledRejection：${String(unhandled[0])}`)
    assert.equal(errFeed.libraryRead, 'unreadable', 'readLibrary reject 必须显性收口为 unreadable')
    assert.equal(errFeed.adoption.kind, 'question-unreadable', 'openRun/readArtifact reject 必须显性收口为 question-unreadable')
    errView.unmount()
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})
