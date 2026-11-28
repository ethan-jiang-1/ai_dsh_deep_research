// research-hub-panel.spec.mjs — ResearchHubPanel / RunsView / LensesView 全局 main 面板回归。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { en, zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../client-dom-helpers.mjs'

const { ResearchHubIcon, ResearchHubPanel } = await import('../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx')

const { render, fireEvent, cleanup, act } = await loadRtl()
const tZh = makeTranslator(zh)
const tEn = makeTranslator(en)

const EMPTY_SESSIONS = (selector) => selector({
  ids: [],
  byId: {},
  phase: 'ready',
  projectionsBySession: {},
})

const ONE_SESSION = (selector) => selector({
  ids: ['s-hub'],
  byId: { 's-hub': { id: 's-hub', displayTitle: 'Main', running: false, retainedBy: { total: 1 }, blank: false, updatedAt: 1 } },
  phase: 'ready',
  projectionsBySession: {},
})

const STUB_METHOD_LIBRARY = {
  readLibrary: async () => ({ kind: 'absent' }),
  ensureCoach: async () => { throw new Error('unused') },
  sendCoach: async () => ({ ok: false }),
  watchCoach: async () => {},
  listDir: async () => [],
  readPreview: async () => ({ kind: 'absent', path: '' }),
}

afterEach(() => {
  cleanup()
})

test('ResearchHubIcon 与 ResearchHubPanel：无会话空态、有会话扫描与打开终稿', async () => {
  const icon = render(createElement(ResearchHubIcon, { size: 16, active: true }))
  assert.ok(icon.container.querySelector('svg'))
  cleanup()

  const emptyRun = makeMaliciousRunSource({ tree: {} })
  const noSessionPanel = render(createElement(ResearchHubPanel, {
    t: tZh,
    useSessions: EMPTY_SESSIONS,
    runSource: () => emptyRun.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    openFinal: () => {},
    backToChat: () => {},
    startResearch: () => {},
  }))
  assert.match(noSessionPanel.container.textContent ?? '', /尚未绑定或打开/)
  cleanup()

  const run = makeMaliciousRunSource({
    tree: {
      drt_hub: {
        'question.md': '# Q\nResearch Hub 集成测试问题\n',
        evidence: { 'e1.md': 'content' },
        'final.md': '# Final\n',
        'delivered.json': '{}',
      },
    },
    dirFaults: { archive: 'unreadable' },
  })
  const openedFinals = []
  let backCount = 0

  const panel = render(createElement(ResearchHubPanel, {
    t: tZh,
    useSessions: ONE_SESSION,
    runSource: () => run.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    openFinal: (sid, path) => { openedFinals.push({ sid, path }) },
    backToChat: () => { backCount += 1 },
    startResearch: () => {},
  }))

  await flushUi(act)
  assert.ok(panel.getByTestId('deep-research-hub'))
  assert.match(panel.container.textContent ?? '', /Research Hub 集成测试问题/)
  assert.match(panel.container.textContent ?? '', /证据 1 份/)
  assert.match(panel.container.textContent ?? '', /archive（simulated list error）/)

  fireEvent.click(panel.getByText(zh.hubOpenArchiveFinal))
  assert.deepEqual(openedFinals, [{ sid: 's-hub', path: 'drt_hub/final.md' }])
  assert.equal(backCount, 1)
})

test('ResearchHubPanel：研究透镜中英文切换、过滤与起草预填', async () => {
  const started = []
  const run = makeMaliciousRunSource({ tree: {} })

  const readySnap = {
    phase: 'ready',
    value: { source: {} },
    problems: [],
    warnings: [],
    methodDefault: null,
    methodConflict: false,
    methodRead: 'absent',
    revision: 0,
    pending: false,
    outcome: null,
  }
  const defaultsStore = {
    subscribe: () => () => {},
    getSnapshot: () => readySnap,
    refresh: async () => {},
    setPatch: async () => {},
    unset: async () => {},
    clear: async () => {},
    dispose: () => {},
  }
  const zhPanel = render(createElement(ResearchHubPanel, {
    t: tZh,
    useSessions: ONE_SESSION,
    runSource: () => run.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    defaultsStore,
    openFinal: () => {},
    backToChat: () => {},
    startResearch: (prompt) => { started.push(prompt ?? '') },
  }))
  await flushUi(act)

  fireEvent.click(zhPanel.getByRole('tab', { name: zh.hubTabLenses }))
  assert.equal(zhPanel.container.querySelectorAll('article').length, 8)
  assert.ok(zhPanel.getByTestId('hub-lenses-defaults'))
  assert.ok(zhPanel.getByTestId('defaults-panel'))
  defaultsStore.dispose()
  fireEvent.change(zhPanel.getByPlaceholderText(zh.hubSearchLenses), { target: { value: '监管' } })
  assert.equal(zhPanel.container.querySelectorAll('article').length, 1)
  fireEvent.click(zhPanel.getByText(zh.hubLensApply))
  assert.equal(started.length, 1)
  assert.match(started[0], /监管与合规/)
  cleanup()

  const enPanel = render(createElement(ResearchHubPanel, {
    t: tEn,
    useSessions: ONE_SESSION,
    runSource: () => run.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    openFinal: () => {},
    backToChat: () => {},
    startResearch: (prompt) => { started.push(prompt ?? '') },
  }))
  await flushUi(act)
  fireEvent.click(enPanel.getByRole('tab', { name: en.hubTabLenses }))
  assert.equal(enPanel.container.querySelectorAll('article').length, 8)
  assert.match(enPanel.container.textContent ?? '', /Adversarial/)
})

// 负例留证 2026-11-27：BUG-446——Hub RunsView / LensesView 搜索 <Input> 未传 width: 100% 类，
// 停在 DSH Input 固有 ~198px 宽度导致 placeholder 被裁切。
// 红配方：去掉 RunsView/LensesView 的 searchInput 类名 → 本例红。
test('BUG-446 ResearchHubPanel：RunsView 与 LensesView 搜索 Input 必须挂载 searchInput 全宽类', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const cssText = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/research-hub/hub.module.css', import.meta.url)),
    'utf8',
  )
  assert.match(cssText, /\.searchInput\s*\{[^}]*width:\s*100%/, 'hub.module.css 须定义 width: 100% 的 .searchInput')

  const run = makeMaliciousRunSource({ tree: {} })
  const panel = render(createElement(ResearchHubPanel, {
    t: tZh,
    useSessions: ONE_SESSION,
    runSource: () => run.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    openFinal: () => {},
    backToChat: () => {},
    startResearch: () => {},
  }))
  await flushUi(act)
  const runsInputWrap = panel.getByPlaceholderText(zh.hubSearchRuns).parentElement
  assert.ok(runsInputWrap !== null && /\bsearchInput\b/.test(runsInputWrap.className), `RunsView 搜索框缺少 searchInput 类：${runsInputWrap?.className}`)

  fireEvent.click(panel.getByRole('tab', { name: zh.hubTabLenses }))
  const lensesInputWrap = panel.getByPlaceholderText(zh.hubSearchLenses).parentElement
  assert.ok(lensesInputWrap !== null && /\bsearchInput\b/.test(lensesInputWrap.className), `LensesView 搜索框缺少 searchInput 类：${lensesInputWrap?.className}`)
})

// 负例留证 2026-11-27：BUG-451——index.ts 的 startResearch 若继续向 startSession 传 initialPrompt，透镜提示词会被静默丢弃。
test('BUG-451 index.ts startResearch：通过 buildStartResearchOptions 传递 prompt，禁止影子 initialPrompt', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const src = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/index.ts', import.meta.url)),
    'utf8',
  )
  assert.doesNotMatch(src, /\binitialPrompt\b/, '不得使用不存在于 vendor StartSessionOptions 的 initialPrompt 字段')
  assert.match(src, /buildStartResearchOptions\(/, 'startResearch 应复用 buildStartResearchOptions 构造 StartSessionOptions')
  assert.doesNotMatch(src, /\.get\(\s*['"]layout['"]\s*\)/, 'layout 服务必须走显式 Cordis inject，禁止无类型 .get("layout") 静默降级')
  assert.match(src, /export const inject = \[[^\]]*'layout'/, 'export const inject 必须声明 layout 服务依赖')
})

// 负例留证 2026-11-27：BUG-452——ResearchHubPanel Lenses 页内点击 DefaultsPanel 的「方法库 ›」必须切到 methods 页签。
test('BUG-452 ResearchHubPanel：Lenses 内点击「方法库 ›」按钮切换到方法库页签，且支持 requestedTab 初始化', async () => {
  const run = makeMaliciousRunSource({ tree: {} })
  const readySnap = {
    phase: 'ready',
    value: { source: {} },
    problems: [],
    warnings: [],
    methodDefault: null,
    methodConflict: false,
    methodRead: 'absent',
    revision: 0,
    pending: false,
    outcome: null,
  }
  const defaultsStore = {
    subscribe: () => () => {},
    getSnapshot: () => readySnap,
    refresh: async () => {},
    setPatch: async () => {},
    unset: async () => {},
    clear: async () => {},
    dispose: () => {},
  }
  const panel = render(createElement(ResearchHubPanel, {
    t: tZh,
    useSessions: ONE_SESSION,
    runSource: () => run.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    defaultsStore,
    openFinal: () => {},
    backToChat: () => {},
    startResearch: () => {},
  }))
  await flushUi(act)

  fireEvent.click(panel.getByRole('tab', { name: zh.hubTabLenses }))
  const linkBtn = panel.container.querySelector('[data-testid="defaults-method-library-link"]')
  assert.ok(linkBtn !== null && linkBtn.tagName === 'BUTTON', 'DefaultsPanel 必须渲染可点击 <button data-testid="defaults-method-library-link">')
  fireEvent.click(linkBtn)
  await flushUi(act)
  assert.ok(panel.container.querySelector('#hub-panel-methods') !== null, '点击方法库按钮后 Hub 必须切到 methods 页签')
})

// 负例留证 2026-11-27：BUG-459——ResearchHub 点击归档 run「打开终稿」时曾先调 openFinal（此时 Hub 未关闭、
// 会话面未挂载，必抛 no session surface is mounted）且硬编码 `${rootPath}/final.md` 漏掉仅有 final/readable-vN.md 的归档。
// 红配方：把 onOpenFinal 改回先调 openFinal(`${rootPath}/final.md`) 再 backToChat → 本例红。
test('BUG-459 ResearchHubPanel：点击归档「打开终稿」先回对话再开真实终稿路径，且 index.ts 走 openResourceWhenMounted', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const indexSrc = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/index.ts', import.meta.url)),
    'utf8',
  )
  const navSrc = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/rightbar-nav.ts', import.meta.url)),
    'utf8',
  )
  assert.match(indexSrc, /createRightbarNav\(/, 'index.ts 必须通过 createRightbarNav 装配右栏导航闭包')
  assert.match(navSrc, /openResourceWhenMounted\(/, 'rightbar-nav.ts openFinal 必须通过 openResourceWhenMounted 等待挂载并展开右栏')
  assert.match(navSrc, /expectedSessionId/, 'rightbar-nav.ts 跨会话打开必须校验 expectedSessionId 防止串台')

  const run = makeMaliciousRunSource({
    tree: {
      archive: {
        drt_arch: {
          'question.md': '# Q\n归档无根 final.md 测试\n',
          final: {
            'v1.md': '# V1\n',
            'readable-v2.md': '# Readable V2\n',
          },
        },
      },
    },
  })
  const trace = []
  const panel = render(createElement(ResearchHubPanel, {
    t: tZh,
    useSessions: ONE_SESSION,
    runSource: () => run.source,
    methodLibrary: STUB_METHOD_LIBRARY,
    openFinal: (sid, path) => { trace.push({ event: 'openFinal', sid, path }) },
    backToChat: () => { trace.push({ event: 'backToChat' }) },
    startResearch: () => {},
  }))
  await flushUi(act)

  fireEvent.click(panel.getByText(zh.hubOpenArchiveFinal))
  assert.deepEqual(trace, [
    { event: 'backToChat' },
    { event: 'openFinal', sid: 's-hub', path: 'archive/drt_arch/final/readable-v2.md' },
  ], '必须先 backToChat 重挂会话面，再打开 archive/drt_arch/final/readable-v2.md')
})

// 负例留证 2026-11-27：BUG-461——RunsView copyPath 把 setCopiedPath 同步写在 clipboard.writeText().catch() 之外，
// 导致无剪贴板权限或 navigator.clipboard 缺失时仍假绿显示「已复制」。
// 红配方：在 RunsView.tsx 恢复无条件同步 setCopiedPath → 本例红。
test('BUG-461 RunsView：剪贴板被拒或缺失时不得假绿显示「已复制」，须诚实反馈失败状态', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_clip: { 'question.md': '# Q\n剪贴板失败态测试\n' },
    },
  })
  const origClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  try {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('NotAllowedError') } },
    })
    const panel = render(createElement(ResearchHubPanel, {
      t: tZh,
      useSessions: ONE_SESSION,
      runSource: () => run.source,
      methodLibrary: STUB_METHOD_LIBRARY,
      openFinal: () => {},
      backToChat: () => {},
      startResearch: () => {},
    }))
    await flushUi(act)

    const copyBtn = panel.getByText(zh.hubCopyPath)
    fireEvent.click(copyBtn)
    await flushUi(act)
    assert.equal(copyBtn.textContent, '复制失败', 'clipboard reject 时应诚实显示「复制失败」而非「已复制」')
    assert.equal(copyBtn.getAttribute('data-copy-state'), 'failed')

    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    fireEvent.click(copyBtn)
    await flushUi(act)
    assert.equal(copyBtn.textContent, '复制失败', '缺少 navigator.clipboard 时应显示「复制失败」')

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    })
    fireEvent.click(copyBtn)
    await flushUi(act)
    assert.equal(copyBtn.textContent, zh.hubCopied, 'clipboard resolve 后才显示「已复制」')
    assert.equal(copyBtn.getAttribute('data-copy-state'), 'copied')
  } finally {
    if (origClipboard !== undefined) Object.defineProperty(navigator, 'clipboard', origClipboard)
    else delete navigator.clipboard
  }
})

// 负例留证 2026-11-28：BUG-480——在方法库有未保存草稿或正在保存时，点击 Hub 其他页签或「返回对话」直接卸载
// MethodLibraryView，完全绕过 confirmDiscard 与 pendingOperationRef。
// 红配方：去掉 ResearchHubPanel 的 registerLeaveGuard 检查与拦截。
test('BUG-480 ResearchHubPanel：方法库有未保存草稿时切页签/返回对话须经确认，保存中时拦截并提示 hubMethodSavingBlocked', async () => {
  const LIB = '## Alpha（2026-11-28，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
  let holdSave = null
  let backCount = 0
  const run = makeMaliciousRunSource({ tree: {} })
  const methodLibrary = {
    readLibrary: async () => ({ kind: 'ok', text: LIB, path: 'method-library.md' }),
    ensureCoach: async () => ({ id: 'coach-hub-480', reference: { ready: Promise.resolve(), release: () => {} } }),
    sendCoach: async () => await new Promise((resolve) => { holdSave = resolve }),
    watchCoach: async (_id, signal, _onEvent, onReady) => {
      onReady()
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
    listDir: async () => [],
    readPreview: async () => ({ kind: 'absent', path: '' }),
  }
  const origConfirm = window.confirm
  const confirmCalls = []
  let confirmAnswer = false
  window.confirm = (msg) => { confirmCalls.push(msg); return confirmAnswer }
  try {
    const panel = render(createElement(ResearchHubPanel, {
      t: tZh,
      useSessions: ONE_SESSION,
      runSource: () => run.source,
      methodLibrary,
      openFinal: () => {},
      backToChat: () => { backCount += 1 },
      startResearch: () => {},
    }))
    await flushUi(act)

    // 切到方法库 -> 新建 -> 从零开始 -> 检查表单 -> 填名称产生未保存草稿
    fireEvent.click(panel.getByRole('tab', { name: zh.hubTabMethods }))
    await flushUi(act)
    fireEvent.click(panel.container.querySelector('[data-method-new]'))
    await flushUi(act)
    fireEvent.click(panel.getByRole('button', { name: zh.startFromScratch }))
    await flushUi(act)
    fireEvent.click(panel.getByRole('tab', { name: zh.formCheck }))
    await flushUi(act)
    fireEvent.change(panel.container.querySelector('[data-field="name"] input'), { target: { value: 'UnsavedDraft' } })
    await flushUi(act)

    // 用户取消确认 -> 留在本页签，不触发 backToChat
    confirmAnswer = false
    fireEvent.click(panel.getByRole('tab', { name: zh.hubTabRuns }))
    assert.equal(confirmCalls.length, 1, '脏草稿切页签必须触发 window.confirm')
    assert.equal(confirmCalls[0], zh.discardUnsaved)
    assert.ok(panel.container.querySelector('#hub-panel-methods') !== null, '拒绝放弃草稿时必须留在方法库页签')

    fireEvent.click(panel.getByText(zh.hubBackToChat))
    assert.equal(confirmCalls.length, 2, '脏草稿点击返回对话必须触发 window.confirm')
    assert.equal(backCount, 0, '拒绝放弃草稿时不得调用 backToChat')

    // 用户确认放弃 -> 成功切走
    confirmAnswer = true
    fireEvent.click(panel.getByRole('tab', { name: zh.hubTabRuns }))
    assert.ok(panel.container.querySelector('#hub-panel-runs') !== null, '确认放弃后应切换到 Run 档案')

    // 回到方法库，触发一个在途写盘（setDefault），期间切页签与返回对话均被硬拦截并提示 hubMethodSavingBlocked
    fireEvent.click(panel.getByRole('tab', { name: zh.hubTabMethods }))
    await flushUi(act)
    const setDefaultBtn = [...panel.container.querySelectorAll('button')].find((b) => b.textContent === zh.setDefault)
    assert.ok(setDefaultBtn !== undefined)
    fireEvent.click(setDefaultBtn)
    await flushUi(act)

    fireEvent.click(panel.getByRole('tab', { name: zh.hubTabLenses }))
    assert.ok(panel.container.querySelector('#hub-panel-methods') !== null, '写盘进行中切页签必须被阻断')
    assert.match(panel.container.textContent ?? '', new RegExp(zh.hubMethodSavingBlocked), '必须展示保存中禁止切换提示')

    fireEvent.click(panel.getByText(zh.hubBackToChat))
    assert.equal(backCount, 0, '写盘进行中点击返回对话必须被阻断')
    holdSave?.({ ok: false, detail: 'cleanup' })
  } finally {
    window.confirm = origConfirm
  }
})
