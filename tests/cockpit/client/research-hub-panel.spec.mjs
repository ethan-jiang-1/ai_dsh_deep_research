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
  readLibrary: async () => ({ status: 'absent', path: 'method-library.md' }),
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

  fireEvent.click(panel.getByText(zh.hubOpenFinal))
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
