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
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { en, zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { ResearchStatusTab, ResearchStatusTitle } from '../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx'
import { useStatusFeed } from '../../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts'
import { useMemberActivity } from '../../../../packages/deep-research-pack/src/client/research-status/useMemberActivity.ts'
import { toolCall } from '../../../fixtures/events.mjs'
import { createDeferred, flushMicrotasks, flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../../client-dom-helpers.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const { render, act, cleanup, fireEvent } = await loadRtl()
const tZh = makeTranslator(zh)
const tEn = makeTranslator(en)

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

// 负例留证 2026-11-28：BUG-475——① memberJumpBtn 塞进 DisclosureRow.collapsedContent 导致 running 态双 DOM
// 且键盘 Enter/Space 触发折叠而非跳转；② ResearchStatusTitle 未在切会话时复位 hitl 且 index.ts 静态求值 labels
// 导致切语言冻结；③ useStatusFeed/useMemberActivity 把 t 放进 IO effect 依赖致切语重连流、重扫盘并劫持右栏；
// ④ Focus Hero 在 v2 HITL2 被旧 v1 delivery 挡住 statusReviewFinal，且 final/ 目录不可读误报 danglingReceipt。
test('BUG-475 ResearchStatusTab：running 队员仅渲染 1 枚跳转钮且置于 headerAccessory，键盘 Enter/Space 不折叠行', async () => {
  const ctrl = makeStreamController()
  const openedMembers = []
  const team = {
    members: [
      { id: 'lead-1', name: 'Lead', role: 'lead', phase: 'active' },
      { id: 'm1', name: 'Scout-1', role: 'teammate', phase: 'active' },
    ],
  }
  const props = makeBaseProps({
    sessionId: 'lead-1',
    follow: (target, signal) => ctrl.follow(target, signal),
    useSessions: (selector) => selector({
      projectionsBySession: { 'lead-1': { values: { agentTeam: team } } },
    }),
    openMember: (leadId, memberId) => { openedMembers.push([leadId, memberId]) },
  })

  const { container } = render(createElement(ResearchStatusTab, props))
  await flushUi(act)

  const jumpBtns = container.querySelectorAll('[data-testid="status-open-member"]')
  assert.equal(jumpBtns.length, 1, 'running 队员行不得因 TextShimmer 复制出 2 枚 status-open-member 按钮')
  const jumpBtn = jumpBtns[0]
  assert.equal(jumpBtn.closest('[data-disclosure-row]'), null, 'status-open-member 必须位于 headerAccessory（在 data-disclosure-row 之外）')

  // 键盘 Enter/Space 在按钮上触发时不得冒泡折叠/展开 disclosure row
  const disclosureRow = jumpBtn.closest('[data-disclosure-header]')?.querySelector('[data-disclosure-row]')
  assert.ok(disclosureRow, '应存在对应的 disclosure row')
  assert.equal(disclosureRow.getAttribute('aria-expanded'), 'false')
  fireEvent.keyDown(jumpBtn, { key: 'Enter' })
  fireEvent.keyDown(jumpBtn, { key: ' ' })
  assert.equal(disclosureRow.getAttribute('aria-expanded'), 'false', '在跳转按钮上按 Enter/Space 不得切换 disclosure 展开态')

  fireEvent.click(jumpBtn)
  assert.deepEqual(openedMembers, [['lead-1', 'm1']])
})

test('BUG-475 ResearchStatusTitle：切会话立即复位 hitl、切 zh↔en 标题实时刷新且 index.ts 声明 locale', async () => {
  const indexSource = readFileSync(join(ROOT, 'packages/deep-research-pack/src/client/index.ts'), 'utf8')
  const titleRegIdx = indexSource.indexOf('RESEARCH_TITLE_SLOT, () => [')
  assert.ok(titleRegIdx >= 0, '找不到 RESEARCH_TITLE_SLOT 注册块')
  const titleRegSlice = indexSource.slice(titleRegIdx, titleRegIdx + 360)
  assert.match(titleRegSlice, /locale:\s*'deepResearchPack'/, 'ResearchStatusTitle 注册必须声明 locale: deepResearchPack')
  assert.doesNotMatch(titleRegSlice, /labels:\s*\{/, 'ResearchStatusTitle 注册不得在 inject 中静态求值 labels')

  const ctrl = makeStreamController()
  const follow = (target, signal) => ctrl.follow(target, signal)
  const view = render(createElement(ResearchStatusTitle, { sessionId: 's1', follow, t: tZh }))
  await act(async () => {
    ctrl.emitHistory('s1', [toolCall({ name: 'ask_user_question', callId: 'c1', arguments: { questions: [] } })])
    await flushMicrotasks(10)
  })
  assert.equal(view.container.textContent, tZh('tabStatusPending'))

  // 切英文 locale：不重连流，文案立即切为英文 pending
  const callsBeforeLocale = ctrl.calls.length
  view.rerender(createElement(ResearchStatusTitle, { sessionId: 's1', follow, t: tEn }))
  assert.equal(view.container.textContent, tEn('tabStatusPending'))
  assert.equal(ctrl.calls.length, callsBeforeLocale, '切换 t 不得重连活标题 follow 流')

  // 切到空会话 / 新会话：立即复位为 idle（不残留上一会话的 pending）
  view.rerender(createElement(ResearchStatusTitle, { sessionId: undefined, follow, t: tEn }))
  assert.equal(view.container.textContent, tEn('tabStatus'))

  view.rerender(createElement(ResearchStatusTitle, { sessionId: 's2', follow, t: tZh }))
  assert.equal(view.container.textContent, tZh('tabStatus'))
})

test('BUG-475 useStatusFeed / useMemberActivity：切换 t 不重连 follow、不重扫目录、不劫持右栏，文案实时切换', async () => {
  const ctrl = makeStreamController()
  let followCalls = 0
  let revealCount = 0
  const run = makeMaliciousRunSource({
    tree: {
      drt_alpha: { 'question.md': '# 主题\n\n真实研究问题\n' },
    },
  })
  const team = {
    members: [
      { id: 'm1', name: 'Scout-1', role: 'teammate', phase: 'active' },
    ],
  }
  const follow = (target, signal) => {
    followCalls += 1
    return ctrl.follow(target, signal)
  }
  const revealStatusTab = () => { revealCount += 1 }
  const runSource = () => run.source
  const useSessions = (selector) => selector({
    projectionsBySession: { s1: { values: { agentTeam: team } } },
  })

  let latestFeed
  const baseProps = makeBaseProps({
    sessionId: 's1',
    t: tZh,
    follow,
    runSource,
    revealStatusTab,
    useSessions,
  })
  const view = render(createElement(Harness, { props: baseProps, onFeed: (f) => { latestFeed = f } }))

  await act(async () => {
    ctrl.emitHistory('s1', [
      toolCall({ name: 'write', arguments: { path: 'drt_alpha/question.md' } }),
      toolCall({ name: 'web_search', callId: 'ws-lead', arguments: { queries: ['alpha'] } }),
      toolCall({ name: 'ask_user_question', callId: 'q1', arguments: { questions: [] } }),
    ])
    ctrl.emitHistory('subagent:s1:m1:unknown', [
      toolCall({ name: 'web_search', callId: 'ws-m1', arguments: { queries: ['beta'] } }),
    ])
    await flushMicrotasks(20)
  })
  await act(async () => {
    await flushMicrotasks(25)
  })

  assert.equal(revealCount, 1)
  assert.equal(latestFeed.rows[0]?.text, tZh('activitySearch', { queries: 'alpha' }))
  assert.equal(latestFeed.memberSummaries.m1?.rows[0]?.text, tZh('activitySearch', { queries: 'beta' }))
  assert.equal(latestFeed.face?.steps[0]?.label, tZh('stepQuestion'))

  const followCallsBefore = followCalls
  const ioCallsBefore = run.calls.length
  const leadSignal = ctrl.recordOf('s1').signal
  const memberSignal = ctrl.recordOf('subagent:s1:m1:unknown').signal

  // 切换 locale t（zh → en）
  await act(async () => {
    view.rerender(createElement(Harness, { props: { ...baseProps, t: tEn }, onFeed: (f) => { latestFeed = f } }))
    await flushMicrotasks(15)
  })

  assert.equal(followCalls, followCallsBefore, '切换 t 绝不得重连主/队员 follow 流')
  assert.equal(leadSignal.aborted, false, '切换 t 绝不得 abort 主流')
  assert.equal(memberSignal.aborted, false, '切换 t 绝不得 abort 队员流')
  assert.equal(run.calls.length, ioCallsBefore, '切换 t 绝不得重扫 bundle 磁盘')
  assert.equal(revealCount, 1, '切换 t 绝不得再次调用 revealStatusTab 劫持右栏')
  assert.equal(latestFeed.rows[0]?.text, tEn('activitySearch', { queries: 'alpha' }), '活动行应随新 t 投影')
  assert.equal(latestFeed.memberSummaries.m1?.rows[0]?.text, tEn('activitySearch', { queries: 'beta' }), '队员动态行应随新 t 投影')
  assert.equal(latestFeed.face?.steps[0]?.label, tEn('stepQuestion'), '步骤条文案应随新 t 投影')
})

test('BUG-475 Focus Hero 与 danglingReceipt：v2 HITL2 优先展示审阅终稿按钮；final/ 读失败不误报 danglingReceipt', async () => {
  const ctrl = makeStreamController()
  const openedPaths = []
  const run = makeMaliciousRunSource({
    tree: {
      drt_v2: {
        'question.md': '# Question\n\nReal body\n',
        'final.md': '# Draft v2\n\nUpdated body for HITL2\n',
        final: { 'v1.md': '# Delivered v1\n\nOld v1\n' },
        'delivered.json': JSON.stringify({
          version: 1,
          slug: 'drt_v2',
          acceptedAt: '2026-11-28T00:00:00Z',
          gate: { status: 'PASS', exit: 0 },
          final: { version: 1, sha256: 'abc' },
          present: { path: 'drt_v2/final/v1.md', version: 1, callId: 'c-v1' },
        }),
      },
    },
  })
  const view = render(createElement(ResearchStatusTab, makeBaseProps({
    sessionId: 's-v2',
    follow: (target, signal) => ctrl.follow(target, signal),
    runSource: () => run.source,
    openFinal: (_sid, path) => { openedPaths.push(path) },
  })))

  await act(async () => {
    ctrl.emitHistory('s-v2', [
      toolCall({ name: 'write', arguments: { path: 'drt_v2/question.md' } }),
      toolCall({ name: 'present', callId: 'c-v1', arguments: { files: [{ path: 'drt_v2/final/v1.md' }] } }),
      toolCall({ name: 'ask_user_question', callId: 'c-hitl2', arguments: { questions: [{ id: 'hitl2_delivery', header: '交付审阅' }] } }),
    ])
    await flushMicrotasks(20)
  })
  await flushUi(act)

  const reviewBtn = view.container.querySelector('[data-testid="status-hero-review-final"]')
  assert.ok(reviewBtn, 'v2 HITL2 已有旧 v1 delivery 时，Focus Hero 必须优先展示 status-hero-review-final')
  assert.equal(view.container.querySelector('[data-testid="status-hero-open-final"]'), null, 'v2 HITL2 不得把主按钮指回旧 v1 delivery')
  fireEvent.click(reviewBtn)
  assert.deepEqual(openedPaths, ['drt_v2/final.md'])

  // final/ 目录临时不可读：danglingReceipt 必须为 false（不得同时报目录不可读与悬空回执）
  const ctrl2 = makeStreamController()
  const badFinalRun = makeMaliciousRunSource({
    tree: {
      drt_err: {
        'question.md': '# Q\n\nBody\n',
        final: { 'v1.md': '# v1\n\nBody\n' },
        'delivered.json': JSON.stringify({
          version: 1,
          slug: 'drt_err',
          acceptedAt: '2026-11-28T00:00:00Z',
          gate: { status: 'PASS', exit: 0 },
          final: { version: 1, sha256: 'abc' },
          present: { path: 'drt_err/final/v1.md', version: 1, callId: 'c-v1' },
        }),
      },
    },
    dirFaults: { 'drt_err/final': 'unreadable' },
  })
  let feed2
  render(createElement(Harness, {
    props: makeBaseProps({
      sessionId: 's-err',
      follow: (target, signal) => ctrl2.follow(target, signal),
      runSource: () => badFinalRun.source,
    }),
    onFeed: (f) => { feed2 = f },
  }))
  await act(async () => {
    ctrl2.emitHistory('s-err', [toolCall({ name: 'write', arguments: { path: 'drt_err/question.md' } })])
    await flushMicrotasks(20)
  })
  assert.equal(feed2.reads.final, 'unreadable')
  assert.equal(feed2.receiptDangling, false, 'final/ 读取失败时不得将空列表折成 danglingReceipt')
})
