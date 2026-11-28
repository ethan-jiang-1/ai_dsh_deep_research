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

test('R4 终稿三栏宽表折行规则与窄侧栏工具栏收敛', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const finalCss = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css', import.meta.url)),
    'utf8',
  )
  assert.match(finalCss, /\.studioProse\s+:global\(\.md-table-wide\)\s+table/, '全屏精读台应对 md-table-wide 表格设置自适应折行')
  assert.match(finalCss, /\.splitReviewLabel\s*\{/, '窄侧栏工具栏应通过 splitReviewLabel 响应式收敛防止折行')
})

// 负例留证 2026-11-28：BUG-472——ResearchFinalTab 切换 fullscreen 会卸载旧 bodyRef DOM 并挂新节点，
// 但 CitationHoverLayer 依赖 ref 对象身份不变导致监听留在旧 DOM 失效；窄全屏（<960px）点击引用写进 display:none 栏。
// 红配方：把 containerEl 改回 containerRef 或 studioActive 改回裸 isFullscreen → 本例红。
test('BUG-472 ResearchFinalTab：切换全屏后悬停溯源仍生效，且窄全屏(<960px)点引用走分屏并保留目录开关', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(STUDIO_BUNDLE) })
  const openedResources = []
  const makeProps = (fullscreen) => ({
    sessionId: 's-fs',
    t: tZh,
    toggleFullscreen: () => {},
    useTabInfo: () => ({
      sidebar: { fullscreen },
      tab: {
        navigation: { address: 'dsh-resource://file/session/s-fs/drt_studio/final/v1.md' },
        visible: true,
        actions: {
          openTab: () => {},
          openResource: (addr, opts) => { openedResources.push([addr, opts]) },
        },
      },
    }),
    runSource: () => run.source,
    visible: true,
  })

  const { container, rerender } = render(createElement(ResearchFinalTab, makeProps(false)))
  await flushUi(act)

  // 非全屏 → 切全屏 → 切回非全屏，每次切换后悬停引用均应弹出预览卡
  rerender(createElement(ResearchFinalTab, makeProps(true)))
  await flushUi(act)
  const fsBtn = container.querySelector('button[title*="evidence/e1.md"]')
  assert.ok(fsBtn !== null, '全屏后应渲染行内证据引用按钮')
  fireEvent.pointerOver(fsBtn, { bubbles: true })
  await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
  assert.ok(document.querySelector('[data-testid="citation-hover-card"]') !== null, '切全屏后悬停引用必须仍能弹出预览卡')

  // 切回非全屏后悬停引用仍应正常弹出预览卡（验证旧 studioBody 卸载后重新绑定新 sidebar bodyEl）
  rerender(createElement(ResearchFinalTab, makeProps(false)))
  await flushUi(act)
  assert.equal(document.querySelector('[data-testid="citation-hover-card"]'), null, '容器切换应清理旧悬停卡')
  const backBtn = container.querySelector('button[title*="evidence/e1.md"]')
  assert.ok(backBtn !== null)
  fireEvent.pointerOver(backBtn, { bubbles: true })
  await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
  assert.ok(document.querySelector('[data-testid="citation-hover-card"]') !== null, '退出全屏回右栏后悬停引用必须仍能弹出预览卡')

  // 窄全屏（模拟容器宽 640px）：回退侧栏模式，工具栏显示目录开关，点引用走 openResource 而非写入隐藏对照栏
  rerender(createElement(ResearchFinalTab, makeProps(true)))
  await flushUi(act)
  const rootEl = container.querySelector('[data-final-layout]')
  assert.ok(rootEl !== null)
  Object.defineProperty(rootEl, 'clientWidth', { configurable: true, value: 640 })
  rerender(createElement(ResearchFinalTab, makeProps(true)))
  // 触发一次 window resize 让容器宽同步生效
  fireEvent(window, new Event('resize'))
  await flushUi(act)
  assert.equal(rootEl.getAttribute('data-final-layout'), 'sidebar', '全屏但容器宽 640px(<960px) 应退回 sidebar 布局')
  assert.ok(container.querySelector('[data-testid="final-toc-toggle"]') !== null, '窄全屏必须保留目录开关按钮')
  const narrowCitation = container.querySelector('button[title*="evidence/e1.md"]')
  assert.ok(narrowCitation !== null)
  fireEvent.click(narrowCitation)
  assert.equal(openedResources.length, 1, '窄全屏点击引用必须走 openResource 分屏打开，不得静默写进隐藏栏')
})

// 负例留证 2026-11-28：BUG-473——inspectInStudio 慢请求 A 晚于快请求 B 返回时覆盖 B 的内容；
// 且全屏态 prefillDraft 不退出全屏、切文档不重置 prefilledCopy（BUG-479）。
// 红配方：去掉 inspectTokenRef 校验或去掉 prefillDraft 全屏退出 → 本例红。
test('BUG-473 / BUG-479 ResearchFinalTab：证据对照慢返回不覆盖快返回，全屏预填退出全屏并防重复拼接', async () => {
  let resolveA
  const slowA = new Promise((r) => { resolveA = r })
  const baseRun = makeMaliciousRunSource({
    tree: {
      drt_race: {
        'final.md': '# 总报告\n\n## 一、主体\n引用 [来源: evidence/a.md] 与 [来源: evidence/b.md]。\n\n## 若要加深\n- 补查样本一\n',
        final: { 'v1.md': '# 总报告\n\n## 一、主体\n引用 [来源: evidence/a.md] 与 [来源: evidence/b.md]。\n\n## 若要加深\n- 补查样本一\n' },
        evidence: {
          'a.md': '---\nquality: C\n---\n# 慢证据 A\nA 内容。\n',
          'b.md': '---\nquality: A\n---\n# 快证据 B\nB 内容。\n',
        },
      },
    },
  })
  const racingSource = {
    ...baseRun.source,
    read: async (path, opts) => {
      if (path.endsWith('evidence/a.md')) {
        await slowA
      }
      return baseRun.source.read(path, opts)
    },
  }
  let toggledFs = 0
  const drafted = []
  const inputActions = {
    captureInsertion: () => ({ start: 0, end: 0, revision: 1 }),
    insertText: (txt) => { drafted.push(`ins:${txt}`); return true },
    setDraft: (txt) => { drafted.push(`set:${txt}`) },
  }
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's-race',
    t: tZh,
    toggleFullscreen: () => { toggledFs += 1 },
    inputActions,
    useTabInfo: () => ({
      sidebar: { fullscreen: true },
      tab: {
        navigation: { address: 'dsh-resource://file/session/s-race/drt_race/final/v1.md' },
        visible: true,
        actions: { openTab: () => {}, openResource: () => {} },
      },
    }),
    runSource: () => racingSource,
    visible: true,
  }))
  await flushUi(act)

  // 先点慢证据 A，再立刻点快证据 B
  const btnA = container.querySelector('button[title*="evidence/a.md"]')
  const btnB = container.querySelector('button[title*="evidence/b.md"]')
  assert.ok(btnA !== null && btnB !== null)
  fireEvent.click(btnA)
  fireEvent.click(btnB)
  await flushUi(act)
  assert.match(container.querySelector('[data-testid="final-studio-inspector"]')?.textContent ?? '', /快证据 B/)

  // 此时慢证据 A 才 resolve，绝不得覆盖当前对照栏的快证据 B
  resolveA()
  await flushUi(act)
  const inspectorText = container.querySelector('[data-testid="final-studio-inspector"]')?.textContent ?? ''
  assert.match(inspectorText, /快证据 B/, '慢请求 A 晚到绝不得覆盖快请求 B 的证据正文')
  assert.doesNotMatch(inspectorText, /慢证据 A/)

  // 全屏态点击「填入草稿」必须退出全屏；再次点击应 setDraft 替换而非拼接
  const prefillBtn = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(zh.finalTriagePrefill))
  assert.ok(prefillBtn !== undefined, '应渲染填入草稿按钮')
  fireEvent.click(prefillBtn)
  assert.equal(toggledFs, 1, '全屏态预填草稿必须调用 toggleFullscreen 退出全屏')
  assert.equal(drafted.length, 1)
  fireEvent.click(prefillBtn)
  assert.equal(drafted[1]?.startsWith('set:'), true, '重复点击预填应使用 setDraft 替换而非再次拼接')
})

// 负例留证 2026-11-28：BUG-473——手动 reload 报告 A 在切去报告 B 后晚到 resolve 覆盖报告 B；
// useEvidencePreview 切换 sessionId 后旧会话在途请求写入新会话缓存；FinalToc 滚到底部末节不高亮。
// 红配方：去掉 [load] cleanup 的 manualControllerRef.abort/loadEpochRef、去掉 sessionEpochRef 或去掉 atBottom 判据 → 本例红。
test('BUG-473 ResearchFinalTab / useEvidencePreview / FinalToc：手动重试跨报告不覆盖、跨会话不污染缓存、滚到底部高亮末节', async () => {
  // Part 1: 手动 reload 报告 A 晚于报告 B 返回，不得覆盖报告 B 正文
  let releaseReloadA
  let notifyEnteredReloadA
  const enteredReloadA = new Promise((r) => { notifyEnteredReloadA = r })
  let readACount = 0
  const tree = {
    drt_a: {
      'final.md': '# 报告 A\n\n## 一、旧结论\n报告 A 正文。\n',
      final: { 'v1.md': '# 报告 A\n\n## 一、旧结论\n报告 A 正文。\n' },
    },
    drt_b: {
      'final.md': '# 报告 B\n\n## 一、新结论\n报告 B 正文。\n',
      final: { 'v1.md': '# 报告 B\n\n## 一、新结论\n报告 B 正文。\n' },
    },
  }
  const baseRun = makeMaliciousRunSource({ tree })
  const slowSource = {
    ...baseRun.source,
    read: async (path, opts) => {
      if (path.includes('drt_a/final/v1.md')) {
        readACount += 1
        if (readACount >= 2) {
          // 刻意忽略 AbortSignal，验证 loadEpochRef 也能兜底阻断旧请求落盘
          const pending = new Promise((r) => { releaseReloadA = r })
          notifyEnteredReloadA()
          await pending
        }
      }
      return baseRun.source.read(path, opts)
    },
  }
  let boundRefresh = null
  const makeProps = (slug) => ({
    sessionId: 's-reload',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: `dsh-resource://file/session/s-reload/${slug}/final/v1.md` },
        visible: true,
        actions: {
          openTab: () => {},
          openResource: () => {},
          bindCommands: (cmds) => { boundRefresh = cmds.refresh; return () => {} },
        },
      },
    }),
    runSource: () => slowSource,
    visible: true,
  })

  const { container, rerender } = render(createElement(ResearchFinalTab, makeProps('drt_a')))
  await flushUi(act)
  assert.match(container.textContent ?? '', /报告 A 正文/)
  assert.equal(typeof boundRefresh, 'function')

  // 触发手动刷新报告 A 并等待其进入读盘挂起态，随后立即切换到报告 B
  act(() => { boundRefresh() })
  await act(async () => { await enteredReloadA })
  rerender(createElement(ResearchFinalTab, makeProps('drt_b')))
  await flushUi(act)
  assert.match(container.textContent ?? '', /报告 B 正文/)

  // 放行报告 A 的滞后手动刷新，绝不得覆盖报告 B
  assert.equal(typeof releaseReloadA, 'function', '手动刷新报告 A 应曾进入挂起态')
  releaseReloadA()
  await flushUi(act)
  assert.match(container.textContent ?? '', /报告 B 正文/, '滞后手动刷新 A 不得覆盖当前报告 B')
  assert.doesNotMatch(container.textContent ?? '', /报告 A 正文/)
  cleanup()
})
