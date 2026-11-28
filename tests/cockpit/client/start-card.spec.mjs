// 起步卡的会话级瞬态、失败详情、已绑定工作区瘦身与最近研究续接（BUG-409 / BUG-410 / X5）。
//
// 负例留证 2026-11-24：
//   BUG-409——`choosing` / `chooseError` 不随 `sessionId` 复位：挂起的目录选择器把新会话的按钮
//   永久禁用；旧会话的失败提示在新会话继续显示。
//   BUG-410——非 `Error` 拒绝值走 `(error as Error).message`，详情退化成字面量 `undefined`。
// 红配方：删掉 `[sessionId]` 复位效应与代次守卫；把 `errorDetailOf` 换回 `(error as Error).message`。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../client-dom-helpers.mjs'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { StartCard } from '../../../packages/deep-research-pack/src/client/StartCard.tsx'

const t = makeTranslator(zh)

const propsOf = (overrides = {}) => ({
  sessionId: 's1',
  workspaceTitle: null,
  workspacePath: null,
  listDir: async () => [],
  hasUserMessage: async () => false,
  chooseWorkspace: async () => {},
  t,
  ...overrides,
})

const chooseButton = (container) => container.querySelector('[data-testid=deep-research-choose-workspace]')

test('BUG-409 挂起的目录选择器不跨会话禁用按钮（旧 promise 不得改写新会话状态）', async () => {
  const rtl = await loadRtl()
  const never = new Promise(() => {})
  const { container, rerender } = rtl.render(createElement(StartCard, propsOf({ chooseWorkspace: () => never })))
  try {
    await rtl.waitFor(() => { if (chooseButton(container) === null) throw new Error('wait') })
    rtl.fireEvent.click(chooseButton(container))
    await rtl.act(async () => {})
    assert.equal(chooseButton(container)?.disabled, true, '前置：本会话内选择中应禁用')

    rerender(createElement(StartCard, propsOf({ sessionId: 's2', chooseWorkspace: () => never })))
    await rtl.waitFor(() => { if (chooseButton(container)?.disabled !== false) throw new Error('wait enabled') })
    assert.equal(chooseButton(container)?.disabled, false, '切会话后按钮必须恢复可用')
    assert.doesNotMatch(container.textContent ?? '', /正在打开目录选择器/, '新会话不得显示旧会话的进行态')
  } finally {
    rtl.cleanup()
  }
})

test('BUG-409 旧会话的失败提示不残留到新会话', async () => {
  const rtl = await loadRtl()
  const { container, rerender } = rtl.render(createElement(StartCard, propsOf({
    chooseWorkspace: async () => { throw new Error('user cancelled') },
  })))
  try {
    await rtl.waitFor(() => { if (chooseButton(container) === null) throw new Error('wait') })
    rtl.fireEvent.click(chooseButton(container))
    await rtl.waitFor(() => { if (container.querySelector('[role=alert]') === null) throw new Error('wait alert') })

    rerender(createElement(StartCard, propsOf({ sessionId: 's2', chooseWorkspace: async () => {} })))
    await rtl.waitFor(() => { if (container.querySelector('[role=alert]') !== null) throw new Error('alert leaked') })
    assert.equal(container.querySelector('[role=alert]'), null, '切会话后错误条必须清空')
  } finally {
    rtl.cleanup()
  }
})

test('BUG-410 非 Error 拒绝值：错误详情携带真实原因，不是字面量 undefined', async () => {
  const rtl = await loadRtl()
  for (const rejection of ['EACCES: permission denied', { code: 'EACCES', message: 'permission denied' }, 42]) {
    const { container, unmount } = rtl.render(createElement(StartCard, propsOf({
      chooseWorkspace: () => Promise.reject(rejection),
    })))
    try {
      await rtl.waitFor(() => { if (chooseButton(container) === null) throw new Error('wait') })
      rtl.fireEvent.click(chooseButton(container))
      await rtl.waitFor(() => { if (container.querySelector('[role=alert]') === null) throw new Error('wait alert') })
      const alert = container.querySelector('[role=alert]')?.textContent ?? ''
      assert.doesNotMatch(alert, /undefined/, `拒绝值 ${JSON.stringify(rejection)} 的详情退化成 undefined`)
      assert.match(alert, /失败/)
    } finally {
      unmount()
    }
  }
  rtl.cleanup()
})

test('X5 已绑定有效工作区时不再渲染冗余大号工作区选择框，且展示 6 张起题灵感卡与最近 Run 续接', async () => {
  const rtl = await loadRtl()
  const inserted = []
  let submitted = 0
  const openedSessions = []
  const openedFinals = []
  const inputActions = {
    captureInsertion: () => ({ start: 0, end: 0, revision: 1 }),
    insertText: (text) => { inserted.push(text); return true },
    setDraft: (text) => { inserted.push(`draft:${text}`) },
    submit: () => { submitted += 1 },
  }
  const sessionsState = {
    ids: ['s1', 's-active', 's-delivered'],
    byId: {
      s1: { id: 's1', cwd: '/tmp/ws1' },
      's-active': {
        id: 's-active',
        cwd: '/tmp/ws1',
        title: 'AI 芯片格局研究',
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'ai-chips', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 200 },
        },
      },
      's-delivered': {
        id: 's-delivered',
        cwd: '/tmp/ws1',
        title: '安理会五常研究',
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'un-sc', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_un-sc/final/readable-v1.md', updatedAt: 150 },
        },
      },
    },
    projectionsBySession: {},
  }
  const { container } = rtl.render(createElement(StartCard, propsOf({
    workspaceTitle: 'WS1',
    workspacePath: '/tmp/ws1',
    inputActions,
    useSessions: (selector) => selector(sessionsState),
    openSession: (sid) => { openedSessions.push(sid) },
    openSessionFinal: (sid, p) => { openedFinals.push([sid, p]) },
  })))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=deep-research-start-template-landscape]') === null) throw new Error('wait template')
    })
    assert.equal(chooseButton(container), null, '已绑定工作区时不应重复显示选择工作区按钮')
    assert.ok(container.querySelector('[data-testid=deep-research-start-template-diligence]'), '应包含尽调灵感卡')
    assert.ok(container.querySelector('[data-testid=deep-research-start-template-timeline]'), '应包含演化灵感卡')

    rtl.fireEvent.click(container.querySelector('[data-testid=deep-research-start-template-landscape]'))
    assert.equal(inserted.length, 1, '点击模板按钮必须写入草稿')
    assert.equal(inserted[0], zh.startTplLandscapePrompt)
    assert.equal(submitted, 0, '点击模板按钮绝不得自动提交')

    // BUG-479：连续点击第二张灵感卡应替换草稿，避免两条完整模板被无分隔拼在一起
    rtl.fireEvent.click(container.querySelector('[data-testid=deep-research-start-template-diligence]'))
    assert.equal(inserted[1], `draft:${zh.startTplDiligencePrompt}`, '连续点击不同起题模板卡应通过 setDraft 替换而非拼接')

    const recent = container.querySelector('[data-testid=deep-research-start-recent]')
    assert.ok(recent, '应渲染最近研究快捷续接条')
    rtl.fireEvent.click(recent.querySelector('[data-recent-slug="ai-chips"]'))
    rtl.fireEvent.click(recent.querySelector('[data-recent-slug="un-sc"]'))
    assert.deepEqual(openedSessions, ['s-active'])
    assert.deepEqual(openedFinals, [['s-delivered', 'drt_un-sc/final/readable-v1.md']])
  } finally {
    rtl.cleanup()
  }
})

test('R4 回访工作区已有 drt_* 且冷启动投影未水合时，StartCard 保持可见并提供工作台档案直达条', async () => {
  const rtl = await loadRtl()
  let hubOpened = 0
  const { container } = rtl.render(createElement(StartCard, propsOf({
    workspaceTitle: 'WS-Return',
    workspacePath: '/tmp/ws-return',
    listDir: async () => [{ name: 'drt_a' }, { name: 'drt_b' }, { name: 'method-library.md' }],
    openHub: () => { hubOpened += 1 },
  })))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=deep-research-start-workspace-runs]') === null) throw new Error('wait workspace runs')
    })
    assert.ok(container.querySelector('[data-testid=deep-research-start-template-landscape]'), '回访工作区空白新会话也应展示意图起题卡')
    const strip = container.querySelector('[data-testid=deep-research-start-workspace-runs]')
    assert.match(strip?.textContent ?? '', /2/)
    rtl.fireEvent.click(strip.querySelector('button'))
    assert.equal(hubOpened, 1)
  } finally {
    rtl.cleanup()
  }
})

test('同会话启动对话后（sessionId 不变）：StartCard 随 DSH session/conversation 态同步收起', async () => {
  const rtl = await loadRtl()
  let hasUserCalls = 0
  const blankSession = {
    sessionId: 's-live',
    blank: true,
    promptAttempted: false,
    running: false,
    awaitingFirstTurn: false,
    pendingSubmissions: [],
    openState: 'open',
    subagent: null,
  }
  const makeConversationHook = (active) => (selector) => selector({
    activeTargets: active ? new Set(['chat']) : new Set(),
  })
  const { container, rerender } = rtl.render(createElement(StartCard, propsOf({
    sessionId: 's-live',
    workspacePath: '/tmp/ws1',
    session: blankSession,
    useConversation: makeConversationHook(false),
    hasUserMessage: async () => { hasUserCalls += 1; return false },
  })))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=deep-research-start]') === null) throw new Error('wait visible')
    })
    assert.equal(hasUserCalls, 1)

    // 1. 用户在当前空白会话发送首条消息：promptAttempted 同步翻 true，sessionId 保持 s-live
    rerender(createElement(StartCard, propsOf({
      sessionId: 's-live',
      workspacePath: '/tmp/ws1',
      session: { ...blankSession, promptAttempted: true, pendingSubmissions: [{ requestId: 'r1' }] },
      useConversation: makeConversationHook(false),
      hasUserMessage: async () => false,
    })))
    assert.equal(container.querySelector('[data-testid=deep-research-start]') === null, true, '首条发送后 StartCard 必须同步消失')

    // 2. Agent 运行中且会话非空白、已有对话目标
    rerender(createElement(StartCard, propsOf({
      sessionId: 's-live',
      workspacePath: '/tmp/ws1',
      session: { ...blankSession, blank: false, promptAttempted: true, running: true },
      useConversation: makeConversationHook(true),
      hasUserMessage: async () => false,
    })))
    assert.equal(container.querySelector('[data-testid=deep-research-start]') === null, true, '运行中对话不得残留 StartCard')
  } finally {
    rtl.cleanup()
  }
})

test('切到非空白会话或子会话时：即使 hasUserMessage 挂起/异常也不得闪现 StartCard', async () => {
  const rtl = await loadRtl()
  const never = new Promise(() => {})
  const blankSession = {
    sessionId: 's-blank',
    blank: true,
    promptAttempted: false,
    running: false,
    awaitingFirstTurn: false,
    pendingSubmissions: [],
    openState: 'open',
    subagent: null,
  }
  const { container, rerender } = rtl.render(createElement(StartCard, propsOf({
    sessionId: 's-blank',
    workspacePath: '/tmp/ws1',
    session: blankSession,
  })))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-testid=deep-research-start]') === null) throw new Error('wait blank')
    })

    // 切到仍在 loading 的非空白会话，且 hasUserMessage 永不结算 → 不得残留上一会话的 StartCard
    rerender(createElement(StartCard, propsOf({
      sessionId: 's-active',
      workspacePath: '/tmp/ws1',
      session: { ...blankSession, sessionId: 's-active', blank: false, openState: 'loading' },
      hasUserMessage: () => never,
      listDir: () => Promise.reject(new Error('network down')),
    })))
    assert.equal(container.querySelector('[data-testid=deep-research-start]') === null, true, '切到非空白会话不得残留上一会话 StartCard')

    // 切到 subagent 子会话 → 永远不显示 StartCard
    rerender(createElement(StartCard, propsOf({
      sessionId: 's-sub',
      workspacePath: '/tmp/ws1',
      session: { ...blankSession, sessionId: 's-sub', subagent: { address: { kind: 'subagent' } } },
      hasUserMessage: async () => false,
    })))
    await rtl.act(async () => {})
    assert.equal(container.querySelector('[data-testid=deep-research-start]') === null, true, '子会话不得显示 StartCard')
  } finally {
    rtl.cleanup()
  }
})
