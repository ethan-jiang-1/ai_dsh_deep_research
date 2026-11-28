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

// 负例留证 2026-11-28：BUG-480——未点「开始访谈」前修改表单，900ms 防抖静默发送 sendCoach；
// 写盘期间也未阻断 manualEditPrompt；启动访谈返回 uncertain 时错误把 operationUnknown 写进顶部回执。
// 红配方：去掉 manualEditPrompt 副作用里的 interviewStarted/sending 门禁或恢复 startInterview 写 operationUnknown。
test('BUG-480 未启动访谈手改表单 >1000ms 零 sendCoach；访谈 uncertain 失败不写 operationUnknown 且可重试；保存期间不发 manualEditPrompt', async () => {
  const sent = []
  let interviewAttempt = 0
  let holdSave = null
  const { container, fireEvent, cleanup, act, waitFor, t } = await mountView({
    readLibrary: async () => ({ kind: 'ok', text: LIBRARY, path: 'method-library.md' }),
    ensureCoach: async () => ({ id: 'coach-480', reference: { ready: Promise.resolve(), release: () => {} } }),
    watchCoach: async (_id, signal, _onEvent, onReady) => {
      onReady()
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    sendCoach: async (_id, text) => {
      sent.push(text)
      if (text.includes('method_library_upsert')) {
        return await new Promise((resolve) => { holdSave = resolve })
      }
      interviewAttempt += 1
      if (interviewAttempt === 1) return { ok: false, detail: 'blip', uncertain: true }
      return { ok: true }
    },
  })
  try {
    await waitFor(() => { if (!container.textContent?.includes('Alpha')) throw new Error('wait') })
    fireEvent.click(container.querySelector('[data-method-new]'))
    await waitFor(() => { if (buttonWithText(container, t('startFromScratch')) === undefined) throw new Error('wait source') })
    fireEvent.click(buttonWithText(container, t('startFromScratch')))
    await waitFor(() => { if (container.querySelector('[data-method-coach-start]') === null) throw new Error('wait coach') })

    // 未点开始访谈，切到检查表单并编辑名称与四字段，等待 1050ms：sendCoach 必须 0 次！
    fireEvent.click(buttonWithText(container, t('formCheck')))
    await waitFor(() => { if (container.querySelector('[data-field="name"] input') === null) throw new Error('wait form') })
    fireEvent.change(container.querySelector('[data-field="name"] input'), { target: { value: 'Beta' } })
    for (const key of ['source', 'verify', 'report', 'limit']) {
      fireEvent.change(container.querySelector(`[data-field="${key}"] textarea`), { target: { value: `val-${key}` } })
    }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1050)) })
    assert.equal(sent.length, 0, `未启动访谈时修改表单不得静默发送 sendCoach（实发 ${sent.length} 次）`)

    // 切回访谈点开始访谈：第 1 次 uncertain 失败，不得写 operationUnknown 且按钮可重试；第 2 次成功。
    fireEvent.click(buttonWithText(container, t('interview')))
    const startBtn = () => container.querySelector('[data-method-coach-start]')
    fireEvent.click(startBtn())
    await waitFor(() => { if (!container.textContent?.includes('blip')) throw new Error('wait blip') })
    assert.equal(startBtn().disabled, false, '访谈启动 uncertain 失败后按钮必须保持可重试')
    assert.doesNotMatch(container.textContent ?? '', new RegExp(t('operationUnknown').slice(0, 8)), '不得展示写盘 operationUnknown')

    fireEvent.click(startBtn())
    await waitFor(() => { if (startBtn().textContent !== t('interviewStarted')) throw new Error('wait started') })
    const sentAfterStart = sent.length

    // 访谈开始后改表单，在 900ms 内立刻点保存：保存中不得夹带 manualEditPrompt！
    fireEvent.click(buttonWithText(container, t('formCheck')))
    await waitFor(() => { if (container.querySelector('[data-field="source"] textarea') === null) throw new Error('wait form2') })
    fireEvent.change(container.querySelector('[data-field="source"] textarea'), { target: { value: 'updated-source' } })
    fireEvent.click(buttonWithText(container, t('save')))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1050)) })
    const extraSent = sent.slice(sentAfterStart)
    const spuriousManual = extraSent.filter((msg) => !msg.includes('method_library_upsert'))
    assert.deepEqual(spuriousManual, [], '写盘期间不得发送 manualEditPrompt')
    holdSave?.({ ok: false, detail: 'cleanup' })
  } finally {
    cleanup()
  }
})

// 负例留证 2026-11-28：BUG-481——取消读取已完成研究时 abortRunRead 清空 ref 导致永远卡死 loading；
// 新建方法时 useLibraryData 立刻把 selectedName 抢回 entries[0].name。
// 红配方：把 onCancelRunRead 改回 abortRunRead，或去掉 useLibraryData 的 preserveEmptySelection。
test('BUG-481 取消读取研究列表/预览立刻退出 loading；新建方法时左侧列表不抢选旧条目', async () => {
  let listCalls = 0
  let resolveRunList = null
  const rtl = await loadRtl()
  const tZh = makeTranslator(zh)
  const utils = rtl.render(createElement(MethodLibraryView, {
    sessionId: 's-481',
    t: tZh,
    readLibrary: async () => ({ kind: 'ok', text: LIBRARY, path: 'method-library.md' }),
    readPreview: async () => ({ kind: 'absent' }),
    listDir: async (_sid, path, signal) => {
      listCalls += 1
      if (listCalls <= 2) {
        return await new Promise((resolve) => {
          signal.addEventListener('abort', () => resolve([]), { once: true })
          resolveRunList = resolve
        })
      }
      if (listCalls <= 4) {
        return path === '.' ? [{ type: 'directory', name: 'drt_demo' }] : []
      }
      return await new Promise((resolve) => {
        signal.addEventListener('abort', () => resolve([]), { once: true })
      })
    },
    ensureCoach: async () => ({ id: 'coach-481b', reference: { ready: Promise.resolve(), release: () => {} } }),
    watchCoach: async () => {},
    sendCoach: async () => ({ ok: true }),
  }))
  try {
    await rtl.waitFor(() => {
      if (utils.container.querySelector('[data-method-library-row][aria-current="true"]') === null) throw new Error('wait init')
    })

    // 点新建：左侧不得抢选 Alpha！
    rtl.fireEvent.click(utils.container.querySelector('[data-method-new]'))
    await flushUi(rtl.act)
    assert.equal(utils.container.querySelector('[data-method-library-row][aria-current="true"]') === null, true, '新建方法时左侧列表不得抢选第一条已有方法')

    // 读取已完成研究并点击取消 -> 必须立刻进入 cancelled 且按钮重新可用
    const loadRunsBtn = () => utils.container.querySelector('[data-method-source-load-runs]')
    rtl.fireEvent.click(loadRunsBtn())
    await rtl.waitFor(() => { if (!loadRunsBtn().disabled) throw new Error('wait loading') })
    const runCancelBtn = [...utils.container.querySelectorAll('button')].find((b) => b.textContent === tZh('cancel') && b.getAttribute('data-method-source-cancel') === null)
    assert.ok(runCancelBtn !== undefined, 'loading 态应有取消按钮')
    rtl.fireEvent.click(runCancelBtn)
    await flushUi(rtl.act)
    assert.equal(loadRunsBtn().disabled, false, '取消读取研究列表后按钮必须立刻恢复可用')
    assert.match(utils.container.textContent ?? '', new RegExp(tZh('sourceCancelled').slice(0, 6)), '取消后应显示已取消提示')

    // 再次读取列表成功，点选 drt_demo 进入预览加载，点预览取消 -> 必须立刻退出 selectedRunLoading
    rtl.fireEvent.click(loadRunsBtn())
    await rtl.waitFor(() => { if (utils.container.querySelector('[data-method-source-run]') === null) throw new Error('wait run item') })
    rtl.fireEvent.click(utils.container.querySelector('[data-method-source-run]'))
    await rtl.waitFor(() => {
      if (!(utils.container.querySelector('[data-method-source-preview]:last-of-type')?.textContent ?? '').includes(tZh('sourceLoading'))) {
        const previews = [...utils.container.querySelectorAll('[data-method-source-preview]')]
        if (!previews.some((p) => (p.textContent ?? '').includes(tZh('sourceLoading')))) throw new Error('wait preview loading')
      }
    })
    const previewCancelBtn = [...utils.container.querySelectorAll('[data-method-source-preview] button')].find((b) => b.textContent === tZh('cancel'))
    assert.ok(previewCancelBtn !== undefined, '预览读取中应有取消按钮')
    rtl.fireEvent.click(previewCancelBtn)
    await flushUi(rtl.act)
    const previews = [...utils.container.querySelectorAll('[data-method-source-preview]')]
    assert.equal(previews.some((p) => (p.textContent ?? '').includes(tZh('sourceLoading'))), false, '取消预览读取后不得卡死在读取中')
    resolveRunList?.([])
  } finally {
    rtl.cleanup()
  }
})

// 负例留证 2026-11-28：BUG-482——MethodLibraryView 用 window.matchMedia 视口宽切窄屏（忽略左栏占位）
// 且 ColumnHandle 最大宽未钳制到容器宽 38%；ResearchEvidenceTab.module.css 缺 minmax(0,1fr) 与 md-table-wide 规则。
// 红配方：把 useContainerWidth 改回 matchMedia 或恢复 ColumnHandle max=420。
test('BUG-482 MethodLibraryView 按容器宽(<640px)切单列并钳制 ColumnHandle 至 38%；ResearchEvidenceTab CSS 含防爆宽规则', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const evCss = readFileSync(
    fileURLToPath(new URL('../../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.module.css', import.meta.url)),
    'utf8',
  )
  assert.match(evCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)/, 'ResearchEvidenceTab .body 须设 minmax(0, 1fr)')
  assert.match(evCss, /overflow-x:\s*hidden/, 'ResearchEvidenceTab .body 须设 overflow-x: hidden')
  assert.match(evCss, /overflow-wrap:\s*anywhere/, 'ResearchEvidenceTab .body 须设 overflow-wrap: anywhere')
  assert.match(evCss, /md-table-wide/, 'ResearchEvidenceTab 须配置 .md-table-wide 自适应规则')

  const origRO = globalThis.ResizeObserver
  const callbacks = []
  globalThis.ResizeObserver = class {
    constructor(cb) { callbacks.push(cb) }
    observe() {}
    disconnect() {}
  }
  const rtl = await loadRtl()
  try {
    const utils = rtl.render(createElement(MethodLibraryView, {
      sessionId: 's-482',
      t: makeTranslator(zh),
      readLibrary: async () => ({ kind: 'ok', text: LIBRARY, path: 'method-library.md' }),
      readPreview: async () => ({ kind: 'absent' }),
      listDir: async () => [],
      ensureCoach: async () => ({ id: 'coach-482', reference: { ready: Promise.resolve(), release: () => {} } }),
      watchCoach: async () => {},
      sendCoach: async () => ({ ok: true }),
    }))
    await flushUi(rtl.act)

    assert.ok(callbacks.length > 0, 'MethodLibraryView 必须通过 ResizeObserver 追踪自身容器宽度')
    await rtl.act(async () => {
      for (const cb of callbacks) cb([{ contentRect: { width: 520 } }])
    })
    assert.ok(utils.container.querySelector('[data-method-library-toggle]') !== null, '容器宽 520px(<640px) 必须切窄屏单列并显示切换钮')
    assert.equal(utils.container.querySelector('[role="separator"]') === null, true, '窄屏单列不渲染列分隔条')

    await rtl.act(async () => {
      for (const cb of callbacks) cb([{ contentRect: { width: 700 } }])
    })
    assert.equal(utils.container.querySelector('[data-method-library-toggle]') === null, true, '容器宽 700px(>=640px) 恢复双列')
    const sep = utils.container.querySelector('[role="separator"]')
    assert.ok(sep !== null)
    assert.equal(sep.getAttribute('aria-valuemax'), String(Math.floor(700 * 0.38)), 'ColumnHandle 最大宽必须钳制在容器宽 38%')
  } finally {
    rtl.cleanup()
    globalThis.ResizeObserver = origRO
  }
})
