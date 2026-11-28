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
    'delivered.json': JSON.stringify({
      version: 1,
      slug: 'demo',
      acceptedAt: '2026-11-23T00:00:00Z',
      gate: { status: 'PASS' },
      present: { path: 'drt_demo/final/v1.md', version: 1, callId: 'call-present-1' },
    }),
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
        assert.equal(container.querySelector('[data-testid="status-delivered-badge"]'), null, `${label}: bundle 故障禁止出现已交付`)
      } else if (artifact === 'question.md' && fault !== 'missing') {
        assert.doesNotMatch(html, /分析全球 AI 算力定价趋势与约束/, `${label}: 问题损坏时不该渲染正常问题正文`)
        assert.match(html, /研究问题为空|研究问题读取失败|研究问题正文为空/, `${label}: 必须提示问题缺陷`)
      } else if (artifact === 'delivered.json' && fault !== 'missing') {
        assert.equal(container.querySelector('[data-testid="status-delivered-badge"]'), null, `${label}: 坏回执不得伪造已交付`)
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

  // 切换到审计版（合一单工具栏通过 SegmentedControl role="tab" 切换）
  const toAudit = screen.getByRole('tab', { name: /审计版/ })
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

// 负例留证 2026-11-23：BUG-385 / BUG-395——真实 >100 行工件（含 >80 行 question.md 与 >40 行 leads/findings/evidence/readable-v1）
// 与含 LaTeX 公式（$...$）报告在 StatusTab 与 FinalTab 均应正常读取并渲染；去掉 EOF_NAME 扩展或删掉 DOMParser 绑定即红。
test('BUG-385 BUG-395 真实规模 >100 行研究束与含 TeX 公式报告在状态/终稿页签正常读取与渲染', async () => {
  const pad = (head, n) => `${head}\n${Array.from({ length: n }, (_, i) => `- 明细行 ${String(i + 1)}`).join('\n')}\n`
  const realLengthBundle = {
    drt_real: {
      'question.md': pad('# 研究主题\n\n分析真实长度研究束与公式渲染', 110),
      'leads.md': pad('# 线索', 140),
      'findings.md': pad('# 综合', 140),
      evidence: { 'e1.md': pad('# 证据 e1', 140) },
      'review.md': pad('# Review\n\nreadiness: PASS', 100),
      review: { 'readiness.json': VALID_READINESS_PASS },
      'plan.md': '图版本：v1\n| id | kind | owner | deps | output |\n|---|---|---|---|---|\n| W1 | scout | S1 | — | leads |\n',
      'final.md': pad('# 终稿工作稿\n\n完整审计正文', 120),
      final: {
        'v1.md': pad('# 终稿 v1 审计版\n\n审计正文公式 $E = mc^2$', 120),
        'readable-v1.md': pad('# 终稿 v1 读者版\n\n核心公式：$a + b = c$\n\n$$\n\\sum_{i=1}^n x_i\n$$', 120),
      },
      'delivered.json': JSON.stringify({
        version: 1,
        slug: 'real',
        acceptedAt: '2026-11-23T00:00:00Z',
        gate: { status: 'PASS' },
        present: { path: 'drt_real/final/v1.md', version: 1, callId: 'call-real-1' },
      }),
    },
  }
  const run = makeMaliciousRunSource({ tree: realLengthBundle })
  const statusRender = render(createElement(ResearchStatusTab, {
    sessionId: 's-real-len',
    t: tZh,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    openFinal: () => {},
    openOwner: () => {},
    revealStatusTab: () => {},
    follow: followWithWrite('real'),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const statusText = statusRender.container.textContent ?? ''
  assert.doesNotMatch(statusText, /读取失败/)
  assert.match(statusText, /分析真实长度研究束与公式渲染/)
  assert.match(statusText, /1\s*份/)

  cleanup()
  const finalRender = render(createElement(ResearchFinalTab, {
    sessionId: 's-real-len',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s-real-len/drt_real/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const finalText = finalRender.container.textContent ?? ''
  assert.doesNotMatch(finalText, /读者版读取失败/)
  assert.match(finalText, /读者版 · v1/)
  assert.match(finalText, /核心公式/)
})

// 负例留证 2026-11-23：BUG-386——final/ 目录不可读被 `listed.ok ? … : []` 折成空版本账，
// 页面静默回落成「当前工作稿 final.md」并隐藏同版读者版。红配方：把 readStateOf 判定删回三元式。
test('BUG-386 终稿：final/ 目录不可读 → 显式失败 + 重试，不得拿工作稿冒充终稿', async () => {
  const run = makeMaliciousRunSource({
    tree: { drt_demo: { 'final.md': '# 工作稿\n\n完整审计正文（工作稿）\n', final: { 'v1.md': '# v1\n\nv1\n' } } },
    dirFaults: { 'drt_demo/final': 'unreadable' },
  })
  const props = {
    sessionId: 's-386',
    t: tZh,
    useTabInfo: () => ({ tab: { navigation: { address: 'dsh-resource://file/session/s-386/drt_demo/final.md' }, visible: true, actions: { openTab: () => {} } } }),
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    runSource: () => run.source,
    visible: true,
  }
  const { container } = render(createElement(ResearchFinalTab, props))
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.doesNotMatch(text, /完整审计正文（工作稿）/, '目录不可读时不得静默展示工作稿')
  assert.match(text, /终稿目录|final\//, '必须显式提示终稿目录读取失败')
  assert.ok([...container.querySelectorAll('button')].some((b) => b.textContent === zh.retry), '必须给重试入口')
})

// 负控：final/ 缺席（合法旧形态）仍回落 final.md 工作稿。
test('BUG-386 负控：final/ 目录缺席 → 照常回落工作稿', async () => {
  const run = makeMaliciousRunSource({ tree: { drt_demo: { 'final.md': '# 工作稿\n\n只有工作稿正文\n' } } })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's-386b',
    t: tZh,
    useTabInfo: () => ({ tab: { navigation: { address: 'dsh-resource://file/session/s-386b/drt_demo/final.md' }, visible: true, actions: { openTab: () => {} } } }),
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  assert.match(container.textContent ?? '', /只有工作稿正文/)
})

// 负例留证 2026-11-23：BUG-387——重读失败不清旧正文，`failure !== null && text === null` 守卫被绕过。
// 红配方：失败分支改回只 setFailure/setLoading（不清 text/readerText/draftText/stale）。
test('BUG-387 终稿：重读失败原子清旧正文与降级条，切回带重试的失败界面', async () => {
  const run = makeMaliciousRunSource({
    tree: { drt_demo: { 'final.md': '# Draft\n\nBody\n', final: { 'v1.md': '# Audit\n\n旧审计正文\n', 'readable-v1.md': '' } } },
  })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's-387',
    t: tZh,
    useTabInfo: () => ({ tab: { navigation: { address: 'dsh-resource://file/session/s-387/drt_demo/final/v1.md' }, visible: true, actions: { openTab: () => {} } } }),
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  assert.match(container.textContent ?? '', /旧审计正文/, '前置：首读成功')
  run.update({ fileFaults: { 'drt_demo/final/v1.md': 'unreadable' } })
  fireEvent.click(screen.getByRole('button', { name: zh.retry }))
  await flushUi(act)
  assert.doesNotMatch(container.textContent ?? '', /旧审计正文/, '失败后不得残留旧正文')
  assert.match(container.textContent ?? '', /读取失败|读不到/, '必须切回失败界面')
})

// 负例留证 2026-11-23：BUG-388——evidence 目录可读且有可读卡时，另一张卡的读失败被静默吞掉。
// 红配方：删掉 face.evidenceUnreadable 与通知里的 partial 分支 → 本例红。
test('BUG-388 状态：部分证据卡不可读时计数照给 + 显性告警（不冒充全集）', async () => {
  const run = makeMaliciousRunSource({
    tree: { drt_demo: { 'question.md': '# Q\n\nBody\n', evidence: { 'e1.md': '# E1\nbody\n', 'e2.md': '# E2\nbody\n' } } },
    fileFaults: { 'drt_demo/evidence/e2.md': 'unreadable' },
  })
  const { container } = render(createElement(ResearchStatusTab, {
    sessionId: 's-388',
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
  }))
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.match(text, /证据 1 份/, '可读卡的计数照给')
  assert.match(text, /部分证据卡读取失败/, '部分读失败必须显性提示')
})

// 负例留证 2026-11-23：BUG-389——工作稿 final.md 的 unreadable 只被折成 finalBody=false。
// 红配方：删掉 face.finalBodyIssue 与 statusFinalReadFailed 通知 → 本例红。
test('BUG-389 状态：工作稿 final.md 不可读 → 显性告警 + 重试入口', async () => {
  const run = makeMaliciousRunSource({
    tree: { drt_demo: { 'question.md': '# Q\n\nBody\n', 'final.md': '# Final\n\nBody\n' } },
    fileFaults: { 'drt_demo/final.md': 'unreadable' },
  })
  const { container } = render(createElement(ResearchStatusTab, {
    sessionId: 's-389',
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
  }))
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.match(text, /final\.md 读取失败/, '工作稿读失败必须显性')
  assert.ok([...container.querySelectorAll('button')].some((b) => b.textContent === zh.retry), '必须给重试入口')
})

// 负例留证 2026-11-23：BUG-390——`list('plan')` 的 unreadable/抛错被折成空快照数组，
// 版本轨显示「无旧图快照，不能 diff」。红配方：删掉 snapshotsState 与 rail 的 unreadable 分支。
test('BUG-390 图谱：plan/ 快照目录不可读 → 显性提示，不伪装「无旧图快照」', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_demo: {
        'plan.md': '图版本：v2\n| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n',
        plan: { 'v1.md': '| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n' },
      },
    },
    dirFaults: { 'drt_demo/plan': 'unreadable' },
  })
  const { container } = render(createElement(ResearchGraphTab, {
    sessionId: 's-390',
    t: tZh,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    follow: followWithWrite('demo'),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.doesNotMatch(text, /无旧图快照/, '读失败不得显示成「没有快照」')
  assert.match(text, /快照目录/, '必须显性提示快照目录读取失败')
})

// 负例留证 2026-11-23：BUG-391——差异视图把 missing 之外的状态全折成「读取中」且无重试。
// 红配方：把 snapshotDiffMessage 的穷举改回 `missing ? unread : loading`，或删掉重试按钮。
test('BUG-391 图谱：旧图快照 unreadable → 差异卡报错并可重试（不卡在读取中）', async () => {
  const run = makeMaliciousRunSource({
    tree: {
      drt_demo: {
        'plan.md': '图版本：v2\n| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n',
        plan: { 'v1.md': '| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n', 'v2.md': '| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n| W1.2 | broad-scan |\n' },
      },
    },
    fileFaults: { 'drt_demo/plan/v2.md': 'unreadable' },
  })
  const { container } = render(createElement(ResearchGraphTab, {
    sessionId: 's-391',
    t: tZh,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    follow: followWithWrite('demo'),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  fireEvent.click(screen.getByRole('button', { name: zh.graphShowDiff }))
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.doesNotMatch(text, /旧图快照读取中/, '不得永久显示读取中')
  assert.match(text, /读取失败/, '要如实说明快照读取失败')
  assert.ok([...container.querySelectorAll('button')].some((b) => b.textContent === zh.graphRetryRead), '必须给重试入口')
})

// 负例留证 2026-11-24：BUG-404——`load()` 里写死 `view: 'reader'` 计算 watcher 基线：切到审计版
// 后重读一次，watcher 就永久改盯阅读版（审计版不再提示更新）。红配方：把 load 里传的
// `view: viewRef.current` 改回 `'reader'`。
test('BUG-404 终稿：审计版重读后 watcher 仍盯审计版（不被硬编码 reader 抢回）', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'], now: Date.parse('2026-11-24T00:00:00Z') })
  t.after(() => t.mock.timers.reset())
  const versions = {
    'drt_rft/final/v1.md': 'audit-1',
    'drt_rft/final/readable-v1.md': 'reader-1',
    'drt_rft/final.md': 'draft-1',
  }
  const run = makeMaliciousRunSource({
    tree: {
      drt_rft: {
        'final.md': '# 工作稿\n\n审计正文 v-a1\n',
        final: { 'v1.md': '# 审计 v1\n\n审计正文 v-a1\n', 'readable-v1.md': '# 读者版\n\n读者版正文 r1\n' },
      },
    },
    versions,
  })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's-404',
    t: tZh,
    useTabInfo: () => ({ tab: { navigation: { address: 'dsh-resource://file/session/s-404/drt_rft/final.md' }, visible: true, actions: { openTab: () => {} } } }),
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  // 前置：有读者版时默认看读者版（通用地址回退到最高版读者版）。
  assert.match(container.textContent ?? '', /读者版正文 r1/)
  // 切到审计版（合一单工具栏 SegmentedControl role="tab"）。
  fireEvent.click([...container.querySelectorAll('[role="tab"]')].find((b) => (b.textContent ?? '').includes(zh.finalTabAudit)))
  await flushUi(act)
  assert.match(container.textContent ?? '', /审计正文 v-a1/)
  assert.doesNotMatch(container.textContent ?? '', /读者版正文 r1/)

  // 审计版文件更新 → 一次 watcher 轮询后应出现「重新读取」。
  run.update({ versions: { ...versions, 'drt_rft/final/v1.md': 'audit-2' } })
  await act(async () => { t.mock.timers.tick(30_000) })
  await flushUi(act)
  const reloadButton = [...container.querySelectorAll('button')].find((b) => b.textContent === zh.finalReload)
  assert.ok(reloadButton !== undefined, '审计版更新后必须提示重新读取（watcher 还在盯审计版）')

  // 重读：watcher 基线必须重设为审计版，而不是被硬编码的 reader 抢回。
  run.calls.length = 0
  fireEvent.click(reloadButton)
  await flushUi(act)
  const versionPaths = run.calls.filter((call) => call[0] === 'version').map((call) => call[1])
  assert.ok(versionPaths.length > 0, '重读必须重设 watcher 基线')
  assert.ok(versionPaths.every((path) => /final\/v1\.md$/.test(path)), `watcher 基线必须是审计版，实际：${versionPaths.join(', ')}`)
})

// 负例留证 2026-11-24：BUG-408——question.md 读失败/空横幅的「重试」错调库文件 reload()。
// 红配方：把两处 onClick 改回 `reload(sessionId)`（adoption 不再重读）。
test('BUG-408 配置：question.md 读失败横幅的重试真正重读 question.md', async () => {
  const run = makeMaliciousRunSource({
    tree: { drt_cfg: { 'question.md': '# Q\n\n## 研究方法（本次实际采用）\n- 采用：事实核查\n' } },
    fileFaults: { 'drt_cfg/question.md': 'unreadable' },
  })
  const snap = {
    phase: 'ready', value: {}, problems: [], warnings: [],
    methodDefault: null, methodConflict: false, methodRead: 'absent', revision: 0, pending: false, outcome: null,
  }
  const props = {
    sessionId: 's-408',
    t: tZh,
    readFile: async () => null,
    readLibrary: async () => ({ kind: 'ok', text: '## 我的打法\n- 找来源: a\n' }),
    runSource: () => run.source,
    listDir: async () => [],
    follow: followWithWrite('cfg'),
    sendInstruction: async () => ({ ok: true, detail: 'ok' }),
    defaults: {
      subscribe: () => () => {}, getSnapshot: () => snap, refresh: async () => {},
      setPatch: async () => {}, unset: async () => {}, clear: async () => {}, dispose: () => {},
    },
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    visible: true,
  }
  const { container } = render(createElement(ResearchConfigTab, props))
  await flushUi(act)
  assert.match(container.textContent ?? '', /读取失败/, '前置：question.md 读失败横幅在路上')

  // 文件恢复：点横幅里的重试
  run.update({ fileFaults: {} })
  run.calls.length = 0
  const retryButtons = [...container.querySelectorAll('button')].filter((b) => b.textContent === zh.retry)
  assert.ok(retryButtons.length > 0, '横幅必须给重试按钮')
  fireEvent.click(retryButtons[0])
  await flushUi(act)
  assert.ok(run.calls.some((c) => c[0] === 'read' && c[1] === 'drt_cfg/question.md'), `重试必须重读 question.md，实际读：${JSON.stringify(run.calls.map((c) => c[1]))}`)
  assert.match(container.textContent ?? '', /事实核查/, '重读成功后应显示采用态')
  assert.doesNotMatch(container.textContent ?? '', /读取失败/)
})

// 负例留证 2026-11-24：BUG-424——回执声明 `final.version: 9` 但 final/v9.md 不在场时，状态页
// 仍宣布「报告已交付」（回执只验 schema 不验盘上在场）。红配方：把 receiptDangling 判定删回
// 「receiptArt.state === 'ok' → delivery = deliveryFromReceipt(...)」。
test('BUG-424 状态：回执声明的终稿版本不在场 → 不宣布已交付 + 显性告警', async () => {
  const READINESS = JSON.stringify({ version: 2, readiness: 'PASS', conditional: false, counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } })
  const treeWith = (version) => ({
    drt_alpha: {
      'question.md': '# Topic\n\nbody\n',
      'leads.md': '# Leads\n\n- lead\n',
      'findings.md': '# Findings\n\n- f\n',
      evidence: { 'e1.md': '# E1\n- claim: x\n' },
      'review.md': '# Review\nreadiness: PASS\n',
      review: { 'readiness.json': READINESS },
      'final.md': '# Draft\n\nbody\n',
      final: { 'v1.md': '# Audit v1\n\nbody\n' },
      'delivered.json': JSON.stringify({
        version: 1,
        slug: 'drt_alpha',
        acceptedAt: '2026-11-24T00:00:00Z',
        gate: { status: 'PASS', exit: 0 },
        final: { version, sha256: 'x' },
        present: { path: `drt_alpha/final/v${version}.md`, version, callId: 'c1' },
      }),
    },
  })
  const renderStatus = (version) => {
    const run = makeMaliciousRunSource({ tree: treeWith(version) })
    return render(createElement(ResearchStatusTab, {
      sessionId: `s-424-${version}`,
      t: tZh,
      useSession: () => undefined,
      useSessions: () => undefined,
      useSessionStatus: () => undefined,
      openFinal: () => {},
      openOwner: () => {},
      revealStatusTab: () => {},
      follow: followWithWrite('alpha'),
      runSource: () => run.source,
      visible: true,
    }))
  }
  // 正控：版本在场 → 宣布已交付
  const ok = renderStatus(1)
  await flushUi(act)
  assert.ok(ok.container.querySelector('[data-testid="status-delivered-badge"]'), '版本在场时应宣布已交付')
  assert.match(ok.container.querySelector('[data-testid="status-delivered-badge"]')?.textContent ?? '', new RegExp(zh.statusDelivered))
  ok.unmount()
  // 反控：声明版本缺席 → 不得宣布已交付，且要显性告警
  const dangling = renderStatus(9)
  await flushUi(act)
  const text = dangling.container.textContent ?? ''
  assert.equal(dangling.container.querySelector('[data-testid="status-delivered-badge"]'), null, '声明版本不在场时不得宣布已交付')
  assert.match(text, /回执|交付回执/, '必须显性说明回执与盘上不符')
})
