// 方法库写队列的「失败出口必须解锁」回归（BUG-397 / BUG-401）。
//
// 为什么住 client/：两条缺陷都在 `MethodLibraryView`（组件）与 `useOperationQueue`（hook）的
// 收尾出口上——只有真渲染才能看见按钮 `disabled` 与回执，不变量是「任何失败出口都不得把
// `sending` 留在 true」。
//
// 负例留证 2026-11-23：
//   BUG-397——排队恢复后预检早退（读库 error / 同名重复 / 未确认覆盖 / expected null / hash 抛错 /
//   sessionId 缺失）与 `sendCoach` 抛错，都只写回执不重置 `sending` → 页面全按钮永久禁用。
//   BUG-401——`watchCoach` 在 onReady 前 reject 时没清排队 ref/timeout 与 `sending` → 同一锁死，
//   且 30s 后队列超时把明确错误覆写成「方法编辑不可用」。
// 红配方：删掉 `failOperation`（改回逐个 `setReceipt` 后 return），或删掉 watchCoach `.catch` 里的
// `clearQueuedOperation()`/`setSending(false)` → 下面两个用例必红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator, flushUi } from '../../client-dom-helpers.mjs'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { MethodLibraryView } from '../../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx'

const LIBRARY = '## Alpha（2026-11-23，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'

/** 渲染一个只有 Alpha 一条方法的库，并返回 testing-library 句柄与容器。 */
async function mountView({ readLibrary, watchCoach, sendCoach, ensureCoach }) {
  const rtl = await loadRtl()
  const t = makeTranslator(zh)
  const utils = rtl.render(createElement(MethodLibraryView, {
    sessionId: 's1',
    t,
    readLibrary,
    readPreview: async () => ({ kind: 'absent' }),
    listDir: async () => [],
    ensureCoach,
    watchCoach,
    sendCoach,
  }))
  return { ...rtl, ...utils, t }
}

const buttonWithText = (container, text) => [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === text)

test('BUG-397 排队恢复后预检失败：回执如实，按钮立即解锁（不锁死 sending）', async () => {
  let resolveCoach
  let reads = 0
  const { container, fireEvent, cleanup, act, waitFor, t } = await mountView({
    readLibrary: async () => (++reads === 1
      ? { kind: 'ok', text: LIBRARY, path: 'method-library.md' }
      : { kind: 'error', detail: 'read fail', path: 'method-library.md' }),
    ensureCoach: async () => new Promise((resolve) => {
      resolveCoach = () => resolve({ id: 'coach-1', reference: { ready: Promise.resolve(), release: () => {} } })
    }),
    watchCoach: async (_id, signal, _onEvent, onReady) => {
      onReady()
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendCoach: async () => ({ ok: true }),
  })
  try {
    await waitFor(() => { if (!container.textContent?.includes('Alpha')) throw new Error('wait') })
    fireEvent.click([...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Alpha')))
    await waitFor(() => { if (buttonWithText(container, t('setDefault')) === undefined) throw new Error('wait btn') })
    fireEvent.click(buttonWithText(container, t('setDefault')))
    await flushUi(act)
    await act(async () => { resolveCoach(); await new Promise((resolve) => setTimeout(resolve, 80)) })
    const receipt = container.querySelector('[role=status]')?.textContent ?? ''
    assert.match(receipt, /完整加载方法库/, '预检失败要如实回执')
    assert.equal(container.querySelector('[data-method-new]')?.disabled, false, '预检失败后新建按钮必须恢复可用')
  } finally {
    cleanup()
  }
})

test('BUG-397 sendCoach 抛错：立即恢复可用 + 失败回执（无 unhandledRejection）', async () => {
  const unhandled = []
  const onUnhandled = (reason) => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  const { container, fireEvent, cleanup, act, waitFor, t } = await mountView({
    readLibrary: async () => ({ kind: 'ok', text: LIBRARY, path: 'method-library.md' }),
    ensureCoach: async () => ({ id: 'coach-2', reference: { ready: Promise.resolve(), release: () => {} } }),
    watchCoach: async (_id, signal, _onEvent, onReady) => {
      onReady()
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendCoach: async () => { throw new Error('transport boom') },
  })
  try {
    await waitFor(() => { if (!container.textContent?.includes('Alpha')) throw new Error('wait') })
    fireEvent.click([...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Alpha')))
    await waitFor(() => { if (buttonWithText(container, t('setDefault')) === undefined) throw new Error('wait btn') })
    await act(async () => {
      fireEvent.click(buttonWithText(container, t('setDefault')))
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    assert.equal(container.querySelector('[data-method-new]')?.disabled, false, 'sendCoach 抛错后必须解锁')
    assert.match(container.querySelector('[role=status]')?.textContent ?? '', /transport boom/)
    assert.deepEqual(unhandled, [], 'sendCoach 抛错不得变成未处理拒绝')
  } finally {
    process.off('unhandledRejection', onUnhandled)
    cleanup()
  }
})

test('BUG-401 watchCoach 先 reject：清排队超时与 sending，30s 后不得覆写成「不可用」', async () => {
  const { container, fireEvent, cleanup, act, waitFor, t } = await mountView({
    readLibrary: async () => ({ kind: 'ok', text: LIBRARY, path: 'method-library.md' }),
    ensureCoach: async () => ({ id: 'coach-err', reference: { ready: Promise.resolve(), release: () => {} } }),
    watchCoach: async () => { throw new Error('ws follow failed') },
    sendCoach: async () => ({ ok: true }),
  })
  try {
    await waitFor(() => { if (!container.textContent?.includes('Alpha')) throw new Error('wait') })
    fireEvent.click([...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Alpha')))
    await waitFor(() => { if (buttonWithText(container, t('setDefault')) === undefined) throw new Error('wait btn') })
    await act(async () => {
      fireEvent.click(buttonWithText(container, t('setDefault')))
      await new Promise((resolve) => setTimeout(resolve, 80))
    })
    const receipt = container.querySelector('[role=status]')?.textContent ?? ''
    assert.match(receipt, /ws follow failed/, '建连失败要如实回执')
    assert.doesNotMatch(receipt, /方法编辑不可用/, '不得被队列超时覆写成不可用')
    assert.equal(container.querySelector('[data-method-new]')?.disabled, false, '建连失败后必须解锁')
  } finally {
    cleanup()
  }
})
