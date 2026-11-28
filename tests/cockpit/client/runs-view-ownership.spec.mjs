// runs-view-ownership.spec.mjs — ResearchHubPanel 会话归属联动端到端回归：进会话、切所属会话开终稿与孤立归档不串台。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { loadRtl, makeTranslator } from '../client-dom-helpers.mjs'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { ResearchHubPanel } from '../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx'

const t = makeTranslator(zh)

function makeRunSource(tree) {
  const walk = (path) => {
    const parts = path === '.' || path === '' ? [] : path.replace(/^\/+|\/+$/g, '').split('/')
    let node = tree
    for (const part of parts) {
      if (typeof node !== 'object' || node === null || !(part in node)) return undefined
      node = node[part]
    }
    return node
  }
  return {
    root: '/ws/research',
    async list(path) {
      const node = walk(path)
      if (node === undefined || typeof node === 'string') return { ok: false, reason: 'missing' }
      return {
        ok: true,
        value: Object.entries(node).map(([name, val]) => ({ name, type: typeof val === 'string' ? 'file' : 'directory' })),
      }
    },
    async read(path) {
      const node = walk(path)
      if (typeof node !== 'string') return { ok: false, reason: 'missing' }
      return { ok: true, value: { text: node, lines: node.split('\n').length, eof: true } }
    },
    async version() { return { ok: false, reason: 'missing' } },
  }
}

const STUB_METHOD_LIBRARY = {
  readLibrary: async () => ({ kind: 'absent' }),
  ensureCoach: async () => ({ ok: false, reason: 'stub' }),
  sendCoach: async () => ({ ok: false, detail: 'stub' }),
  watchCoach: () => () => {},
  listDir: async () => [],
  readPreview: async () => null,
}

test('ResearchHubPanel：进行中归属 Run 切会话开状态；已交付归属 Run 先切所属会话再开终稿；孤立归档标只读且不伪造会话归属', async () => {
  const rtl = await loadRtl()
  const trace = []
  const sessionsState = {
    ids: ['s-current', 's-active-owner', 's-done-owner'],
    byId: {
      's-current': { id: 's-current', cwd: '/ws/research', updatedAt: 500 },
      's-active-owner': {
        id: 's-active-owner',
        cwd: '/ws/research',
        updatedAt: 400,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'active-topic', phase: 'running', hitlKind: null, deliveredPath: null, updatedAt: 400 },
        },
      },
      's-done-owner': {
        id: 's-done-owner',
        cwd: '/ws/research',
        updatedAt: 300,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'done-topic', phase: 'delivered', hitlKind: null, deliveredPath: 'drt_done-topic/final/readable-v1.md', updatedAt: 300 },
        },
      },
    },
    projectionsBySession: {},
  }
  const source = makeRunSource({
    'drt_active-topic': {
      'question.md': '# Q\n正在推进的课题\n',
    },
    'drt_done-topic': {
      'question.md': '# Q\n已交付的课题\n',
      'delivered.json': JSON.stringify({ version: 1, slug: 'drt_done-topic', acceptedAt: '2026-11-28T00:00:00Z', gate: { status: 'PASS' }, present: { path: 'drt_done-topic/final/readable-v1.md', version: 1 } }),
      final: { 'v1.md': '# V1', 'readable-v1.md': '# R1' },
    },
    archive: {
      'drt_orphan-topic': {
        'question.md': '# Q\n磁盘孤立归档\n',
        final: { 'v1.md': '# Orphan V1' },
      },
    },
  })

  try {
    const { container } = rtl.render(createElement(ResearchHubPanel, {
      t,
      useSessions: (selector) => selector(sessionsState),
      runSource: () => source,
      methodLibrary: STUB_METHOD_LIBRARY,
      openSession: (sid) => { trace.push(['openSession', sid]) },
      openStatus: () => { trace.push(['openStatus']) },
      openFinal: (sid, p) => { trace.push(['openFinal', sid, p]) },
      backToChat: () => { trace.push(['backToChat']) },
      startResearch: () => {},
      readStoredSessionId: () => 's-current',
    }))

    await rtl.waitFor(() => {
      if (container.querySelector('[data-hub-run-slug="active-topic"]') === null) throw new Error('wait runs')
    })

    const activeCard = container.querySelector('[data-hub-run-slug="active-topic"]')
    assert.equal(activeCard?.getAttribute('data-hub-run-ownership'), 'owned')
    rtl.fireEvent.click(activeCard.querySelector('[data-testid="hub-enter-session"]'))
    assert.deepEqual(trace.splice(0), [
      ['openSession', 's-active-owner'],
      ['backToChat'],
      ['openStatus'],
    ])

    const doneCard = container.querySelector('[data-hub-run-slug="done-topic"]')
    assert.equal(doneCard?.getAttribute('data-hub-run-ownership'), 'owned')
    rtl.fireEvent.click(doneCard.querySelector('[data-testid="hub-open-final"]'))
    assert.deepEqual(trace.splice(0), [
      ['openSession', 's-done-owner'],
      ['backToChat'],
      ['openFinal', 's-done-owner', 'drt_done-topic/final/readable-v1.md'],
    ], '打开已交付终稿必须先切换到归属会话 s-done-owner，绝不留在 s-current 串台')

    const orphanCard = container.querySelector('[data-hub-run-slug="orphan-topic"]')
    assert.equal(orphanCard?.getAttribute('data-hub-run-ownership'), 'orphan')
    assert.ok(orphanCard?.querySelector('[data-testid="hub-orphan-badge"]'), '无本地归属会话的磁盘归档必须显性标为只读归档')
    rtl.fireEvent.click(orphanCard.querySelector('[data-testid="hub-open-final"]'))
    assert.deepEqual(trace.splice(0), [
      ['backToChat'],
      ['openFinal', 's-current', 'archive/drt_orphan-topic/final/v1.md'],
    ], '孤立归档不得伪造 openSession 归属')
  } finally {
    rtl.cleanup()
  }
})
