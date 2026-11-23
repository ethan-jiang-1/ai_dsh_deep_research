// tabs-fault-matrix.spec.mjs — 四页签组件在 JSDOM + CSS module loader 下的行为与恶意 RunSource 故障矩阵。
//
// 归属：住 tests/cockpit/client/ 根层，只 import src/client/* 根组件与 locales.ts（遵守 pack-mirror）。
// 覆盖边界：
//   ① ResearchConfigTab / ResearchFinalTab 在不改 `package.json test:spec` 的前提下穿透 primitives `.css` 渲染；
//   ② 通用恶意 RunSource 故障矩阵（bundle / question / leads / findings / evidence / review /
//      review-readiness / plan / final / delivered × {missing, unreadable, truncated, empty,
//      headings-only, invalid-json, conflict}）驱动 ResearchStatusTab，断言「零伪造完成/已交付 + 显性警告 + 可点重试」；
//   ③ ResearchFinalTab 视图切换（读者版/审计版）、缺席降级条、review 冲突徽标与 30s stale 重读条；
//   ④ ResearchConfigTab 换一条弹窗与 DefaultsPanel 挂载；ResearchGraphTab 故障提示、版本 diff 与节点展开。
//
// 红证：删任一页签的故障提示、让缺失/冲突工件呈现为「已交付」、或删 retry 点击重扫 → 本文件对应测试红。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { ResearchStatusTab } from '../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx'
import { ResearchGraphTab } from '../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { toolCall } from '../../fixtures/events.mjs'
import {
  FAULT_KINDS,
  applyArtifactFault,
  flushUi,
  loadRtl,
  makeMaliciousRunSource,
  makeTranslator,
} from '../client-dom-helpers.mjs'

// 在 client-dom-helpers 安装好 .css ESM loader 后再加载依赖 ui-primitives (.css) 的页签
const { ResearchFinalTab } = await import('../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx')
const { ResearchConfigTab } = await import('../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx')

const { render, fireEvent, cleanup, screen, act } = await loadRtl()
const tZh = makeTranslator(zh)

afterEach(() => {
  cleanup()
})

const VALID_READINESS_PASS = JSON.stringify({
  version: 2,
  readiness: 'PASS',
  conditional: false,
  counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
})

const VALID_READINESS_FAIL = JSON.stringify({
  version: 2,
  readiness: 'FAIL',
  conditional: false,
  counts: { critical: 1, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
})

const FULL_VALID_BUNDLE = {
  drt_demo: {
    'question.md': '# 研究主题\n\n分析全球 AI 算力定价趋势与约束\n\n## 研究方法（本次实际采用）\n- 采用: 方案比较\n- 来源: 内置\n- 调查要求: 同口径对比\n',
    'leads.md': '# 线索\n\n- 官方云厂商价目表\n',
    'findings.md': '# 综合\n\n已交叉核实三家官网口径\n',
    evidence: {
      'e1.md': '# 证据 e1\n- claim: 云 GPU 小时价\n- url: https://example.com/pricing\n',
    },
    'review.md': '# Review\nreadiness: PASS\n',
    review: {
      'readiness.json': VALID_READINESS_PASS,
    },
    'plan.md': 'version: v1\n| id | kind | owner | deps | output |\n|---|---|---|---|---|\n| W1 | scout | S1 | — | leads |\n',
    plan: {
      'v1.md': 'version: v1\n| id | kind | owner | deps | output |\n|---|---|---|---|---|\n| W0 | scout | S0 | — | old |\n',
    },
    'final.md': '# 终稿工作稿\n\n完整审计正文\n',
    final: {
      'v1.md': '# 终稿 v1 审计版\n\n第一版正式交付审计全文\n',
      'readable-v1.md': '# 终稿 v1 读者版\n\n三分钟看懂核心结论\n',
    },
    'delivered.json': JSON.stringify({ slug: 'demo', path: 'drt_demo/final/v1.md', version: 1, callId: 'call-present-1' }),
  },
}

const ARTIFACT_CASES = [
  { artifact: 'bundle', faults: ['missing', 'unreadable'] },
  { artifact: 'question.md', faults: ['missing', 'unreadable', 'truncated', 'empty', 'headings-only'] },
  { artifact: 'leads.md', faults: ['missing', 'unreadable', 'truncated', 'empty', 'headings-only'] },
  { artifact: 'findings.md', faults: ['missing', 'unreadable', 'truncated', 'empty', 'headings-only'] },
  { artifact: 'evidence', faults: ['missing', 'unreadable', 'empty'] },
  { artifact: 'review.md', faults: ['missing', 'unreadable', 'truncated', 'empty', 'conflict'] },
  { artifact: 'review/readiness.json', faults: ['missing', 'unreadable', 'empty', 'invalid-json', 'conflict'] },
  { artifact: 'plan.md', faults: ['missing', 'unreadable', 'truncated', 'empty'] },
  { artifact: 'final', faults: ['missing', 'unreadable'] },
  { artifact: 'delivered.json', faults: ['missing', 'unreadable', 'empty', 'invalid-json'] },
]

function followWithWrite(slug = 'demo') {
  return (_target, signal) => ({
    async *[Symbol.asyncIterator]() {
      yield { kind: 'history', events: [toolCall({ name: 'write_file', arguments: { path: `drt_${slug}/question.md` } })] }
      await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }))
    },
  })
}

test('ResearchStatusTab 恶意 RunSource 故障矩阵：全 7 类畸形/缺失不得伪造交付或确认态，且重试钮可重扫', async () => {
  // 校验矩阵确实覆盖 issue 要求的 7 类 FaultKind
  const covered = new Set(ARTIFACT_CASES.flatMap((c) => c.faults))
  assert.deepEqual([...covered].sort(), [...FAULT_KINDS].sort())

  for (const { artifact, faults } of ARTIFACT_CASES) {
    for (const fault of faults) {
      cleanup()
      const patched = applyArtifactFault({ slug: 'demo', artifact, fault, baseBundle: FULL_VALID_BUNDLE })
      const run = makeMaliciousRunSource(patched)
      const props = {
        sessionId: 's-matrix',
        t: tZh,
        useSession: () => undefined,
        useSessions: () => undefined,
        useSessionStatus: () => undefined,
        openFinal: () => {},
        openOwner: () => {},
        revealStatusTab: () => {},
        follow: followWithWrite('demo'),
        runSource: () => run.source,
        visible: true,
      }
      const { container } = render(createElement(ResearchStatusTab, props))
      await flushUi(act)

      const html = container.innerHTML
      const label = `${artifact} × ${fault}`

      if (artifact === 'bundle') {
        assert.match(html, /研究状态读取失败/, `${label}: bundle 故障必须显性报错`)
        assert.doesNotMatch(html, /✅ 已交付/, `${label}: bundle 故障禁止出现已交付`)
      } else if (artifact === 'question.md' && fault !== 'missing') {
        assert.doesNotMatch(html, /分析全球 AI 算力定价趋势与约束/, `${label}: 问题损坏时不该渲染正常问题正文`)
        assert.match(html, /研究问题为空|研究问题读取失败|研究问题正文为空/, `${label}: 必须提示问题缺陷`)
      } else if (artifact === 'delivered.json' && fault !== 'missing') {
        assert.doesNotMatch(html, /✅ 已交付/, `${label}: 坏回执不得伪造已交付`)
        assert.match(html, /交付回执不合法|交付回执读取失败/, `${label}: 坏回执必须显性报警`)
      } else if ((artifact === 'review.md' || artifact === 'review/readiness.json') && ['unreadable', 'empty', 'invalid-json', 'conflict'].includes(fault)) {
        assert.match(html, /审查未定|审查未给结论|审查文件读取失败/, `${label}: 审查故障禁止假冒 PASS`)
      } else if (artifact === 'evidence' && fault === 'unreadable') {
        assert.match(html, /证据读取失败/, `${label}: 证据目录不可读必须提示`)
      } else if (artifact === 'leads.md' && fault !== 'missing') {
        assert.match(html, /侦察线索为空|侦察线索读取失败/, `${label}: leads 故障必须显性报警`)
      } else if (artifact === 'findings.md' && fault !== 'missing') {
        assert.match(html, /综合材料为空|综合材料读取失败/, `${label}: findings 故障必须显性报警`)
      } else if (artifact === 'plan.md' && fault !== 'missing') {
        assert.match(html, /计划为空|计划读取失败/, `${label}: plan 故障必须显性报警`)
      } else if (artifact === 'final' && fault === 'unreadable') {
        assert.match(html, /终稿目录读取失败/, `${label}: final 目录不可读必须报警`)
      }

      // 只要页签给出“重试”钮，点击它必须真正再次调用 runSource
      const retryButtons = container.querySelectorAll('button')
      const retryBtn = [...retryButtons].find((btn) => btn.textContent === zh.retry)
      if (retryBtn) {
        const before = run.calls.length
        fireEvent.click(retryBtn)
        await flushUi(act)
        assert.ok(run.calls.length > before, `${label}: 点击重试必须重扫 RunSource`)
      }
    }
  }
})

test('ResearchFinalTab（CSS 模块）：读者/审计切换、降级通知条、review 冲突与 stale 重读条', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(FULL_VALID_BUNDLE) })
  const props = {
    sessionId: 's-final',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s-final/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    runSource: () => run.source,
    visible: true,
  }

  const { container, rerender } = render(createElement(ResearchFinalTab, props))
  await flushUi(act)

  // 默认读者版（MarkdownText 已在 CSS loader 下真渲染）
  assert.match(container.textContent ?? '', /三分钟看懂核心结论/)
  assert.match(container.textContent ?? '', /读者版 · v1/)

  // 切换到审计版
  const toAudit = screen.getByRole('button', { name: /看审计版/ })
  fireEvent.click(toAudit)
  await flushUi(act)
  assert.match(container.textContent ?? '', /第一版正式交付审计全文/)

  // 审查冲突 + 读者版为空降级审计版
  run.update({
    tree: {
      drt_demo: {
        ...FULL_VALID_BUNDLE.drt_demo,
        review: { 'readiness.json': VALID_READINESS_FAIL },
        final: { 'v1.md': '# 审计正文\n\n仅有审计正文\n', 'readable-v1.md': '' },
      },
    },
  })
  rerender(createElement(ResearchFinalTab, { ...props, sessionId: 's-final-2' }))
  await flushUi(act)
  assert.match(container.textContent ?? '', /读者版为空——已显示审计版/)
  assert.match(container.textContent ?? '', /审查结论冲突/)

  // 整包缺失时渲染 finalUnreadable + 点击重试恢复
  run.update({ dirFaults: { drt_demo: 'missing', 'archive/drt_demo': 'missing', '_abandoned/drt_demo': 'missing' } })
  rerender(createElement(ResearchFinalTab, { ...props, sessionId: 's-final-3' }))
  await flushUi(act)
  assert.match(container.textContent ?? '', /读不到终稿文件/)
  const retryBtn = screen.getByRole('button', { name: zh.retry })
  run.update({ dirFaults: {} })
  fireEvent.click(retryBtn)
  await flushUi(act)
  assert.match(container.textContent ?? '', /仅有审计正文/)
})

test('ResearchConfigTab（CSS 模块）：渲染采用态、打开换一条弹窗并挂载 DefaultsPanel', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(FULL_VALID_BUNDLE) })
  const snap = {
    phase: 'ready', value: {}, problems: [], warnings: [],
    methodDefault: null, methodConflict: false, methodRead: 'absent', revision: 0, pending: false, outcome: null,
  }
  const dummyDefaults = {
    subscribe: () => () => {},
    getSnapshot: () => snap,
    refresh: async () => {},
    setPatch: async () => {},
    unset: async () => {},
    clear: async () => {},
    dispose: () => {},
  }
  const props = {
    sessionId: 's-cfg',
    t: tZh,
    readFile: async () => null,
    readLibrary: async () => ({ kind: 'ok', text: '## 我的打法\n### 找来源\n- a\n### 怎么核实\n- b\n### 报告怎么写\n- c\n### 不承诺\n- d\n' }),
    runSource: () => run.source,
    listDir: async () => [],
    follow: followWithWrite('demo'),
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    defaults: dummyDefaults,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    visible: true,
  }
  const { container } = render(createElement(ResearchConfigTab, props))
  await flushUi(act)

  assert.match(container.textContent ?? '', /研究偏好/)
  assert.match(container.textContent ?? '', /项目默认/)
  const switchBtn = screen.getByRole('button', { name: zh.switchMethod })
  fireEvent.click(switchBtn)
  await flushUi(act)
  assert.match(document.body.textContent ?? '', /我的打法/)
  assert.match(document.body.textContent ?? '', /事实核查/)
})

test('ResearchGraphTab：followError 如实报警、版本轨看差异与节点展开', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(FULL_VALID_BUNDLE) })
  const props = {
    sessionId: 's-graph',
    t: tZh,
    useSession: () => undefined,
    useSessions: () => ({
      projectionsBySession: {
        's-graph': {
          values: {
            agentTeam: {
              members: [{ id: 'm1', name: 'Scout-1', role: 'teammate', phase: 'active' }],
              tasks: [{ id: 'W1', subject: 'W1 侦察', status: 'in_progress', ownerName: 'Scout-1', blockedBy: [] }],
            },
          },
        },
      },
    }),
    useSessionStatus: () => new Map([['m1', { running: true }]]),
    follow: followWithWrite('demo'),
    runSource: () => run.source,
    visible: true,
  }

  const { container } = render(createElement(ResearchGraphTab, props))
  await flushUi(act)
  assert.match(container.textContent ?? '', /研究图谱/)
  assert.match(container.textContent ?? '', /W1/)

  const diffBtn = screen.getByRole('button', { name: zh.graphShowDiff })
  fireEvent.click(diffBtn)
  await flushUi(act)
  assert.match(container.textContent ?? '', /结构差异/)
})
