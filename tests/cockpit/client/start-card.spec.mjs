// 起步卡的会话级瞬态与失败详情（BUG-409 / BUG-410）。
//
// 为什么住 client/ 根层：判据对象是 `src/client/StartCard.tsx`（根组件），只有真渲染才看得见
// 按钮 `disabled`、错误条与切会话后的残留。
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
  workspaceTitle: 'WS1',
  workspacePath: '/tmp/ws1',
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
