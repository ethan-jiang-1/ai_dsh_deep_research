// final-studio-r2.spec.mjs — R2 学术全屏三栏精读台、Claim 风险过滤与富语义工具卡组件回归。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../client-dom-helpers.mjs'

const { ResearchFinalTab } = await import('../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx')
const { ResearchToolCard } = await import('../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx')

const { render, fireEvent, cleanup, act } = await loadRtl()
const tZh = makeTranslator(zh)

afterEach(() => {
  cleanup()
})

const STUDIO_BUNDLE = {
  drt_studio: {
    'final.md': '# 2026 研究总报告\n\n## 一、核心结论\n关键主张 [来源: evidence/e1.md]。\n\n## 二、风险边界\n存在缺口。\n',
    final: {
      'v1.md': '# 2026 研究总报告\n\n## 一、核心结论\n关键主张 [来源: evidence/e1.md]。\n\n## 二、风险边界\n存在缺口。\n',
      'readable-v1.md': '# 读者版总报告\n\n## 一、执行摘要\n精读结论 [来源: evidence/e1.md]。\n\n## 二、重点风险\n风险项。\n',
    },
    'review.md': '# Review\nreadiness: PASS\n',
    review: {
      'readiness.json': JSON.stringify({
        version: 2, readiness: 'PASS', conditional: false,
        counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
      }),
    },
    'claims.json': JSON.stringify({
      version: 2, finalRef: 1,
      claims: [
        { id: 'C1', text: '已证实的核心指标', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] },
        { id: 'C2', text: '存疑的边际假设', critical: true, topics: ['T2'], evidence: ['evidence/e1.md'], urls: [] },
        { id: 'C3', text: '尚缺复核的次要口径', critical: false, topics: ['T2'], evidence: [], urls: [] },
      ],
    }),
    'verdicts.json': JSON.stringify({
      version: 1, round: 1,
      verdicts: [
        { claim_id: 'C1', verdict: 'supported', quote: '99.9%', reason: '一手验证一致', rechecked_urls: [], source_tier_ok: true },
        { claim_id: 'C2', verdict: 'partial', quote: '口径有偏差', reason: '需补样本', rechecked_urls: [], source_tier_ok: true },
      ],
    }),
    evidence: {
      'e1.md': '---\nsource_url: https://example.org/report\nquality: A\nsource_tier: primary\npublisher: example.org\n---\n# 官方基准报告\n实测可用率达 99.9%。\n',
    },
  },
}

test('ResearchFinalTab：全屏态自动展开三栏精读布局（Sticky TOC + 正文 + 右侧常驻核查/证据对照栏）并支持 Claim 风险筛选', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(STUDIO_BUNDLE) })
  let toggledFullscreen = 0
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's-studio',
    t: tZh,
    toggleFullscreen: () => { toggledFullscreen += 1 },
    useTabInfo: () => ({
      sidebar: { fullscreen: true },
      tab: {
        navigation: { address: 'dsh-resource://file/session/s-studio/drt_studio/final/v1.md' },
        visible: true,
        actions: { openTab: () => {}, openResource: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)

  assert.equal(container.querySelector('[data-final-layout="studio"]') !== null, true, 'fullscreen=true 应进入三栏精读布局')
  assert.ok(container.querySelector('[data-testid="final-toolbar"]') !== null, '应渲染单条合一工具栏')
  assert.ok(container.querySelector('[data-testid="final-studio-toc"]') !== null, '左侧常驻 Sticky TOC 应在场')
  assert.ok(container.querySelector('[data-testid="final-studio-inspector"]') !== null, '右侧常驻对照栏应在场')

  // 全屏右侧默认显示核查清单，支持风险筛选胶囊
  assert.equal(container.querySelectorAll('[data-claim-status]').length, 3, '默认展示全部 3 条主张')
  const riskPill = container.querySelector('[data-testid="claims-filter-risk"] button')
  assert.ok(riskPill !== null, '应存在存疑/未核查筛选胶囊')
  fireEvent.click(riskPill)
  await flushUi(act)
  assert.equal(container.querySelectorAll('[data-claim-status]').length, 2, '风险筛选应仅保留 partial + UNVERIFIED 共 2 条')
  assert.doesNotMatch(container.querySelector('[data-testid="final-claims-audit-view"]')?.textContent ?? '', /已证实的核心指标/)

  const supportedPill = container.querySelector('[data-testid="claims-filter-supported"] button')
  assert.ok(supportedPill !== null)
  fireEvent.click(supportedPill)
  await flushUi(act)
  assert.equal(container.querySelectorAll('[data-claim-status]').length, 1, '已支持筛选应仅保留 supported 1 条')

  // 点击工具栏全屏切换按钮触发注入回调
  const fsBtn = container.querySelector('[data-testid="final-fullscreen-toggle"]')
  assert.ok(fsBtn !== null)
  fireEvent.click(fsBtn)
  assert.equal(toggledFullscreen, 1)
})

test('ResearchToolCard：web_search / spawn_teammate 渲染结构化富语义展开体并支持跳转队员会话', async () => {
  const { container } = render(createElement(ResearchToolCard, {
    toolName: 'web_search',
    sessionId: 's1',
    t: tZh,
    block: {
      kind: 'tool-result',
      isError: false,
      call: { argsRaw: JSON.stringify({ queries: ['DeepSeek Harness'] }) },
      meta: {
        answer: 'Plugin-first harness.',
        sources: [{ url: 'https://deepseek.com/docs', title: 'DeepSeek Docs', snippet: 'Architecture overview' }],
        truncated: false,
      },
    },
  }))
  const rowBtn = container.querySelector('[role="button"], button')
  assert.ok(rowBtn !== null)
  fireEvent.click(rowBtn)
  await flushUi(act)
  assert.ok(container.querySelector('[data-testid="tool-card-web-search"]') !== null, 'web_search 应渲染原生 WebBlock')
  assert.match(container.textContent ?? '', /DeepSeek Docs/)
  assert.equal(container.querySelector('pre'), null, '富语义 web_search 不应退回裸 JSON <pre>')

  cleanup()

  const jumped = []
  const { container: teamContainer } = render(createElement(ResearchToolCard, {
    toolName: 'spawn_teammate',
    sessionId: 'lead-1',
    t: tZh,
    openMember: (leadId, memberId) => { jumped.push([leadId, memberId]) },
    useSessions: (selector) => selector({
      projectionsBySession: {
        'lead-1': {
          values: {
            agentTeam: {
              members: [{ id: 'member-scout-1', name: 'scout-1', role: 'teammate', phase: 'active' }],
            },
          },
        },
      },
    }),
    block: {
      kind: 'tool-result',
      isError: false,
      call: { argsRaw: JSON.stringify({ name: 'scout-1', description: '负责 W1.2 公开财报侦察' }) },
    },
  }))
  const teamBtn = teamContainer.querySelector('[role="button"], button')
  assert.ok(teamBtn !== null)
  fireEvent.click(teamBtn)
  await flushUi(act)
  assert.ok(teamContainer.querySelector('[data-testid="tool-card-delegation"]') !== null)
  assert.match(teamContainer.textContent ?? '', /W1\.2/)
  const jumpBtn = teamContainer.querySelector('[data-testid="tool-card-open-member"]')
  assert.ok(jumpBtn !== null, '队员存在时应显示跳转子会话按钮')
  fireEvent.click(jumpBtn)
  assert.deepEqual(jumped, [['lead-1', 'member-scout-1']])
})
