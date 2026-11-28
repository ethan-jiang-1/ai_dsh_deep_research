// 方法编辑面板的建会话重试（BUG-418）：失败一次后重试成功必须清掉错误条，且错误详情不带
// `Error: ` 工程前缀。
//
// 负例留证 2026-11-24：BUG-418——ensure 失败置 error 后，effect 重跑成功只 setCoach，
// 不 setError(null)，面板同时显示「就绪」与「暂不可用：Error: …」。
// 红配方：删掉成功分支的 `setError(null)`，或把 errorDetailOf 换回 `String(cause)`。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { MethodCoachPanel } from '../../../../packages/deep-research-pack/src/client/method-library/coach.tsx'

const t = makeTranslator(zh)

const baseProps = (overrides = {}) => ({
  sessionId: 's1',
  draftKey: 'd1',
  visible: true,
  title: '方法编辑',
  startLabel: zh.startInterview,
  readyLabel: zh.interviewReady,
  pendingLabel: zh.startingInterview,
  startedLabel: zh.interviewStarted,
  onStartInterview: async () => ({ ok: true }),
  t,
  ...overrides,
})

const reference = () => ({ ready: Promise.resolve(), release: () => {} })

test('BUG-418 建会话失败后重试成功：错误条清空（不再同时说「就绪」与「暂不可用」）', async () => {
  const rtl = await loadRtl()
  const failing = async () => { throw new Error('建会话失败 A（表单可以继续填，稍后重试）') }
  const { container, rerender } = rtl.render(createElement(MethodCoachPanel, baseProps({ ensure: failing })))
  try {
    await rtl.waitFor(() => {
      if (!(container.textContent ?? '').includes(zh.coachUnavailable.split('{')[0])) throw new Error('wait')
    })
    assert.match(container.textContent ?? '', /暂不可用|不可用/)

    // 重试：新的 ensure 身份触发 effect 重跑，这次成功。
    rerender(createElement(MethodCoachPanel, baseProps({ ensure: async () => ({ id: 'coach-1', reference: reference() }) })))
    await rtl.waitFor(() => {
      if ((container.textContent ?? '').includes(zh.coachUnavailable.split('{')[0])) throw new Error('error still there')
    })
    assert.doesNotMatch(container.textContent ?? '', /暂不可用/, '成功后不得残留旧错误条')
    assert.match(container.textContent ?? '', /摘要会保留当前选择/, '面板保持可用态（建会话成功）')
  } finally {
    rtl.cleanup()
  }
})

test('BUG-418 错误详情不带 `Error: ` 前缀（errorDetailOf 收口）', async () => {
  const rtl = await loadRtl()
  const { container } = rtl.render(createElement(MethodCoachPanel, baseProps({
    ensure: async () => { throw new Error('建会话失败 B') },
  })))
  try {
    await rtl.waitFor(() => {
      if (!(container.textContent ?? '').includes('建会话失败 B')) throw new Error('wait')
    })
    assert.doesNotMatch(container.textContent ?? '', /Error: 建会话失败 B/, '详情不得带工程前缀')
    assert.match(container.textContent ?? '', /建会话失败 B/)
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-28：BUG-480——startInterview 在 { ok: false, uncertain: true } 或 reject 时错误置
// started=true 永久锁死「访谈已开始」按钮，无法重试。
// 红配方：把 setStarted 改回 `result.ok || result.uncertain === true` 或在 catch 里 `setStarted(true)`。
test('BUG-480 startInterview 返回 { ok: false, uncertain: true } 或 reject 时保持未开始态且按钮可重试', async () => {
  const rtl = await loadRtl()
  let attempt = 0
  const { container } = rtl.render(createElement(MethodCoachPanel, baseProps({
    ensure: async () => ({ id: 'coach-retry', reference: reference() }),
    onStartInterview: async () => {
      attempt += 1
      if (attempt === 1) return { ok: false, detail: 'transient timeout', uncertain: true }
      if (attempt === 2) throw new Error('network offline')
      return { ok: true }
    },
  })))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-method-coach-start]') === null) throw new Error('wait btn')
    })
    const startBtn = () => container.querySelector('[data-method-coach-start]')

    rtl.fireEvent.click(startBtn())
    await rtl.waitFor(() => {
      if (!(container.textContent ?? '').includes('transient timeout')) throw new Error('wait err 1')
    })
    assert.equal(startBtn().disabled, false, 'uncertain 失败后按钮不得锁死')
    assert.equal(startBtn().textContent, zh.startInterview, 'uncertain 失败后仍应显示「开始访谈」')
    assert.doesNotMatch(container.textContent ?? '', new RegExp(zh.operationUnknown.slice(0, 8)), '访谈失败不得显示写盘 operationUnknown')

    rtl.fireEvent.click(startBtn())
    await rtl.waitFor(() => {
      if (!(container.textContent ?? '').includes('network offline')) throw new Error('wait err 2')
    })
    assert.equal(startBtn().disabled, false, 'reject 后按钮不得锁死')
    assert.equal(startBtn().textContent, zh.startInterview)
    assert.doesNotMatch(container.textContent ?? '', /Error: network offline/)

    rtl.fireEvent.click(startBtn())
    await rtl.waitFor(() => {
      if (startBtn().textContent !== zh.interviewStarted) throw new Error('wait started')
    })
    assert.equal(startBtn().disabled, true, '仅 result.ok === true 后才置 started')
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-28：BUG-481——MethodCoachPanel 滚底 MutationObserver 仅在挂载时查一次
// [data-conversation-scroll]，Portal 异步传送节点后永不挂载监听、对话流永不自动滚底。
// 红配方：去掉 host 的 MutationObserver 仅保留单次 querySelector。
test('BUG-481 MethodCoachPanel：Portal 异步插入 [data-conversation-scroll] 后自动挂滚底并跟随新内容', async () => {
  const rtl = await loadRtl()
  const { container } = rtl.render(createElement(MethodCoachPanel, baseProps({
    ensure: async () => ({ id: 'coach-scroll', reference: reference() }),
  })))
  try {
    await rtl.waitFor(() => {
      if (container.querySelector('[data-method-coach-start]') === null) throw new Error('wait coach')
    })
    const host = container.querySelector('[data-method-coach-host]')
    assert.ok(host !== null)

    // 模拟 Portal 在组件首帧之后异步传送滚动容器。
    const scrollEl = document.createElement('div')
    scrollEl.setAttribute('data-conversation-scroll', '')
    let currentHeight = 420
    Object.defineProperty(scrollEl, 'scrollHeight', { configurable: true, get: () => currentHeight })
    Object.defineProperty(scrollEl, 'clientHeight', { configurable: true, get: () => 120 })
    scrollEl.scrollTop = 0
    host.appendChild(scrollEl)

    await rtl.waitFor(() => {
      if (scrollEl.scrollTop !== 420) throw new Error(`expected scrollTop=420, got ${scrollEl.scrollTop}`)
    })
    assert.equal(scrollEl.scrollTop, 420, 'Portal 异步插入滚动容器后应立刻滚到底部')

    // 模拟新消息到来：内容变更且 scrollHeight 增长，应继续自动贴底。
    currentHeight = 680
    const msg = document.createElement('p')
    msg.textContent = 'new coach turn'
    scrollEl.appendChild(msg)
    await rtl.waitFor(() => {
      if (scrollEl.scrollTop !== 680) throw new Error(`expected scrollTop=680, got ${scrollEl.scrollTop}`)
    })
    assert.equal(scrollEl.scrollTop, 680, '新消息追加后应自动滚到底部')
  } finally {
    rtl.cleanup()
  }
})
