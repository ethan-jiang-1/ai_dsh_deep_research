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
    ids: ['s-current', 's-active-owner', 's-hitl-owner', 's-done-owner'],
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
      's-hitl-owner': {
        id: 's-hitl-owner',
        cwd: '/ws/research',
        updatedAt: 350,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'hitl-topic', phase: 'hitl_pending', hitlKind: 'hitl1', deliveredPath: null, updatedAt: 350 },
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
    'drt_hitl-topic': {
      'question.md': '# Q\n等待立项拍板的课题\n',
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

    const hitlCard = container.querySelector('[data-hub-run-slug="hitl-topic"]')
    assert.equal(hitlCard?.getAttribute('data-hub-run-phase'), 'hitl_pending')
    assert.match(hitlCard?.textContent ?? '', /立项待拍板/, 'HITL1 挂起 Run 卡片应升级为琥珀立项待拍板标签')

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

// 负例留证 2026-11-28：BUG-482——RunsView 把 isHitlPending 门禁在 in_progress 上，导致盘上已写 review.md
// 进入 reviewed_pass/reviewed_fail 但活态在 HITL2 的 run 错显「审查通过」并降级「进入研究会话」；
// ResearchHeaderPill 盘侧兜底硬编码 final.md 忽略 delivered.json 真实路径。
// 红配方：恢复 `isActiveRun && matchedProj?.phase === 'hitl_pending'` 或恢复 ResearchHeaderPill 硬编码 `${dir}/final.md`。
test('BUG-482 RunsView HITL2 不被 reviewed_pass 门禁锁死；ResearchHeaderPill 优先读 delivered.json 真路径', async () => {
  const rtl = await loadRtl()
  const trace = []
  const sessionsState = {
    ids: ['s-hitl2'],
    byId: {
      's-hitl2': {
        id: 's-hitl2',
        cwd: '/ws/research',
        updatedAt: 500,
        projectionValues: {
          researchRun: { schemaVersion: 1, slug: 'hitl2-topic', phase: 'hitl_pending', hitlKind: 'hitl2', deliveredPath: null, updatedAt: 500 },
        },
      },
    },
    projectionsBySession: {},
  }
  const source = makeRunSource({
    'drt_hitl2-topic': {
      'question.md': '# Q\n等待终稿审阅的课题\n',
      'review.md': '# Review\nreadiness: PASS\n',
      review: {
        'readiness.json': JSON.stringify({
          version: 2,
          readiness: 'PASS',
          conditional: false,
          round: 1,
          at: '2026-11-28T00:00:00Z',
          counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 1 },
        }),
      },
      'final.md': '# Working Draft\n',
    },
  })

  try {
    const { container } = rtl.render(createElement(ResearchHubPanel, {
      t,
      useSessions: (selector) => selector(sessionsState),
      runSource: () => source,
      methodLibrary: STUB_METHOD_LIBRARY,
      openSession: (sid) => { trace.push(['openSession', sid]) },
      openStatus: (sid) => { trace.push(['openStatus', sid]) },
      openFinal: (sid, p) => { trace.push(['openFinal', sid, p]) },
      backToChat: () => { trace.push(['backToChat']) },
      startResearch: () => {},
      readStoredSessionId: () => 's-hitl2',
    }))

    await rtl.waitFor(() => {
      if (container.querySelector('[data-hub-run-slug="hitl2-topic"]') === null) throw new Error('wait hitl2 card')
    })

    const hitl2Card = container.querySelector('[data-hub-run-slug="hitl2-topic"]')
    assert.match(hitl2Card?.textContent ?? '', /待你审阅/, 'reviewed_pass + hitl2 必须渲染「待你审阅」徽章')
    assert.doesNotMatch(hitl2Card?.textContent ?? '', /审查通过/, 'HITL2 挂起时不得错显「审查通过」')
    const enterBtn = hitl2Card?.querySelector('[data-testid="hub-enter-session"]')
    assert.ok(enterBtn !== null, 'HITL2 挂起时必须升格「进入研究会话」为主按钮')
    rtl.fireEvent.click(enterBtn)
    assert.deepEqual(trace.splice(0), [
      ['openSession', 's-hitl2'],
      ['backToChat'],
      ['openStatus', 's-hitl2'],
    ])
  } finally {
    rtl.cleanup()
  }

  // 验证 ResearchHeaderPill 盘侧兜底优先读 delivered.json 的 present.path 而非硬编码 final.md
  const { ResearchHeaderPill } = await import('../../../packages/deep-research-pack/src/client/ResearchHeaderPill.tsx')
  const pillSource = makeRunSource({
    'drt_pill-run': {
      'delivered.json': JSON.stringify({
        version: 1,
        slug: 'drt_pill-run',
        acceptedAt: '2026-11-28T00:00:00Z',
        gate: { status: 'PASS' },
        present: { path: 'drt_pill-run/final/readable-v2.md', version: 2 },
      }),
      final: { 'v2.md': '# V2', 'readable-v2.md': '# R2' },
    },
  })
  const opened = []
  const follow = async function* () {
    yield {
      kind: 'history',
      events: [
        { type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ file_path: 'drt_pill-run/question.md' }) } },
      ],
    }
  }
  try {
    const { container } = rtl.render(createElement(ResearchHeaderPill, {
      sessionId: 's-pill',
      follow,
      openStatus: () => {},
      openFinal: (sid, p) => { opened.push([sid, p]) },
      runSource: () => pillSource,
      t,
    }))
    await rtl.waitFor(() => {
      const btn = container.querySelector('[data-testid="research-header-pill"]')
      if (btn === null || !(btn.textContent ?? '').includes(zh.pillDelivered)) throw new Error('wait delivered pill')
    })
    rtl.fireEvent.click(container.querySelector('[data-testid="research-header-pill"]'))
    assert.deepEqual(opened, [['s-pill', 'drt_pill-run/final/readable-v2.md']], 'HeaderPill 盘侧回执必须读 delivered.json 真实路径而非硬编码 final.md')
  } finally {
    rtl.cleanup()
  }
})
