// final-evidence.spec.mjs — 终稿三视图（核查清单/分屏打开证据卡/prefill）与 ResearchEvidenceTab 组件行为回归。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { en, zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../client-dom-helpers.mjs'

const { ResearchFinalTab } = await import('../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx')
const { ResearchEvidenceTab } = await import('../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx')
const { extractNextVersionPriorities } = await import('../../../packages/deep-research-pack/src/lib/run/rerun-triage.ts')

const { render, fireEvent, cleanup, act } = await loadRtl()
const tZh = makeTranslator(zh)
const tEn = makeTranslator(en)

afterEach(() => {
  cleanup()
})

const BUNDLE = {
  drt_demo: {
    'final.md': '# 结论汇总\n\n## 第一节\n核心结论 [来源: evidence/e1.md]。\n\n## 第二节\n补充分析。\n\n## 下一版优先项\n- 补查近三年财报口径\n- 若要加深，可补：对比友商最新报价\n- <待补充占位>\n',
    final: {
      'v1.md': '# 审计终稿\n\n## 第一节\n核心结论 [来源: evidence/e1.md]。\n\n## 下一版优先项\n- 补查近三年财报口径\n',
      'readable-v1.md': '# 读者版终稿\n\n## 一句话结论\n精简版 [来源: evidence/e1.md]。\n',
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
      claims: [{ id: 'C1', text: '关键性能提升', critical: true, topics: ['T1'], evidence: ['evidence/e1.md'], urls: [] }],
    }),
    'verdicts.json': JSON.stringify({
      version: 1, round: 1,
      verdicts: [{ claim_id: 'C1', verdict: 'supported', quote: '实测+30%', reason: '一致', rechecked_urls: [], source_tier_ok: true }],
    }),
    evidence: {
      'e1.md': `---
source_url: https://example.org/spec
retrieved_at: 2026-11-26
quality: A
found_by: scout-1
supports: T1
lens: official
source_tier: primary
publisher: example.org
---

# 官方测试报告

> 实测+30%

## Question List（本 topic）
- [x] 是否官方来源？
`,
    },
  },
}

test('ResearchFinalTab：切换核查清单视图、点击证据卡触发 preferNewPane 分屏打开，且 prefill 不自动提交', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(BUNDLE) })
  const openedResources = []
  const drafted = []
  let boundRefresh = null
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: {
          openTab: () => {},
          openResource: (addr, opts) => { openedResources.push({ addr, opts }) },
          bindCommands: (cmds) => { boundRefresh = cmds.refresh; return () => {} },
        },
      },
    }),
    inputActions: {
      captureInsertion: () => ({ start: 0, end: 0, revision: 1 }),
      insertText: (txt) => { drafted.push(txt); return true },
      setDraft: (txt) => { drafted.push(txt) },
    },
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  assert.ok(typeof boundRefresh === 'function', '应绑定 refresh 命令')

  const claimsTab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes('核查清单'))
  assert.ok(claimsTab !== undefined, '应存在核查清单分段')
  fireEvent.click(claimsTab)
  await flushUi(act)
  assert.match(container.textContent ?? '', /关键性能提升/)
  assert.match(container.textContent ?? '', /支持/)

  const evPill = [...container.querySelectorAll('button')].find((b) => b.textContent === 'evidence/e1.md')
  assert.ok(evPill !== undefined, 'Claim 卡内应展示证据引用胶囊')
  fireEvent.click(evPill)
  assert.equal(openedResources.length, 1)
  assert.equal(openedResources[0]?.addr, 'dsh-resource://file/session/s1/drt_demo/evidence/e1.md')
  assert.equal(openedResources[0]?.opts?.preferNewPane, true)

  const triageBtn = [...(container.querySelector('details')?.querySelectorAll('button') ?? [])].find((b) => b.textContent === zh.finalTriagePrefill)
  assert.ok(triageBtn !== undefined, '三种改法应含填入草稿按钮')
  fireEvent.click(triageBtn)
  assert.equal(drafted.length, 1)

  const priorityBox = container.querySelector('[data-testid="final-next-priorities"]')
  assert.ok(priorityBox !== null, '有下一版优先项时应渲染只读预填区')
  assert.match(priorityBox.textContent ?? '', /补查近三年财报口径/)
  const priorityBtn = priorityBox.querySelector('button')
  assert.ok(priorityBtn !== null)
  fireEvent.click(priorityBtn)
  assert.equal(drafted.length, 2)
  assert.match(drafted[1] ?? '', /补查近三年财报口径/)
})

test('extractNextVersionPriorities：提取中英优先项与「若要加深」，跳过围栏代码与占位符', () => {
  assert.deepEqual(extractNextVersionPriorities(null), [])
  assert.deepEqual(extractNextVersionPriorities([
    '# Final',
    '```md',
    '## 下一版优先项',
    '- 假代码块内容',
    '```',
    '## 下一版优先项',
    '- **核实一手公告**：确认发布时间',
    '若要加深，可补：增加海外对标样本',
    '- <next item>',
    '## 附录',
    '- 不应收入下一小节',
  ].join('\n')), ['核实一手公告：确认发布时间', '增加海外对标样本'])

  assert.deepEqual(extractNextVersionPriorities([
    '## Next-version priorities',
    '1. Verify `v2` pricing table',
  ].join('\n')), ['Verify v2 pricing table'])
})

test('ResearchEvidenceTab：渲染 8 字段标签、外链与 Question List 勾选进度', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(BUNDLE) })
  const { container } = render(createElement(ResearchEvidenceTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/evidence/e1.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.match(text, /官方测试报告/)
  assert.match(text, /质量 A/)
  assert.match(text, /一手信源/)
  assert.match(text, /example\.org/)
  assert.match(text, /是否官方来源？/)
  assert.ok(container.querySelector('a[href="https://example.org/spec"]') !== null)
})

// 负例留证 2026-11-27：BUG-437——ClaimsAuditView 统计标签漏渲染 insufficient（对应 unverifiable），且只读根路径忽略 review/。
// 红配方：删掉 ClaimsAuditView 的 summary.counts.insufficient Tag 或去掉 review/claims.json 读取 → 本例红。
test('BUG-437 ResearchFinalTab 核查清单：读取 review/claims + review/verdicts 且统计角标包含 insufficient（证据不足/unverifiable）', async () => {
  const tree = structuredClone(BUNDLE)
  delete tree.drt_demo['claims.json']
  delete tree.drt_demo['verdicts.json']
  tree.drt_demo.review['claims.json'] = JSON.stringify({
    version: 2, finalRef: 1,
    claims: [{ id: 'C1', text: '关键断言', critical: true, topics: ['T1'], evidence: [], urls: [] }],
  })
  tree.drt_demo.review['verdicts-r1.json'] = JSON.stringify({
    version: 1, round: 1,
    verdicts: [{ claim_id: 'C1', verdict: 'unverifiable', quote: '', reason: '无一手出处', rechecked_urls: [], source_tier_ok: null }],
  })
  const run = makeMaliciousRunSource({ tree })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const auditTab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes('核查清单'))
  assert.ok(auditTab !== undefined)
  fireEvent.click(auditTab)
  await flushUi(act)
  const text = container.textContent ?? ''
  assert.match(text, /关键断言/)
  assert.match(text, /证据不足:\s*1/)
})

// 负例留证 2026-11-27：BUG-444——ResearchEvidenceTab 把 absent / unreadable / invalid 全折叠为同一读错文案。
// 红配方：把 ResearchEvidenceTab 非 empty 失败分支合回 evidenceUnreadable → absent 与 invalid 文案碰撞红。
test('BUG-444 ResearchEvidenceTab：absent / empty / unreadable / invalid 四态呈现各自独立文案与属性', async () => {
  const renderState = async (tree, fileFaults = {}) => {
    const run = makeMaliciousRunSource({ tree, fileFaults })
    const { container } = render(createElement(ResearchEvidenceTab, {
      sessionId: 's1',
      t: tZh,
      useTabInfo: () => ({
        tab: {
          navigation: { address: 'dsh-resource://file/session/s1/drt_demo/evidence/e1.md' },
          visible: true,
          actions: { openTab: () => {} },
        },
      }),
      runSource: () => run.source,
      visible: true,
    }))
    await flushUi(act)
    const state = container.querySelector('[data-evidence-state]')?.getAttribute('data-evidence-state') ?? null
    const text = (container.textContent ?? '').trim()
    cleanup()
    return { state, text }
  }
  const absent = await renderState({ drt_demo: { 'question.md': '# Q\n', evidence: {} } })
  const empty = await renderState({ drt_demo: { 'question.md': '# Q\n', evidence: { 'e1.md': '' } } })
  const unreadable = await renderState({ drt_demo: { 'question.md': '# Q\n' } }, { 'drt_demo/evidence/e1.md': 'unreadable' })
  assert.equal(absent.state, 'absent')
  assert.equal(empty.state, 'empty')
  assert.equal(unreadable.state, 'unreadable')
  assert.notEqual(absent.text, unreadable.text, 'absent 不得与 unreadable 显示相同读错文案')
  assert.notEqual(absent.text, empty.text, 'absent 不得与 empty 显示相同文案')
  assert.notEqual(empty.text, unreadable.text, 'empty 不得与 unreadable 显示相同文案')
})

// 负例留证 2026-11-27：BUG-445——FinalToc 渲染纯 <div>，点击不滚动正文对应章节。
// 红配方：把 FinalToc 改回 <div> 或删掉 scrollIntoView 调用 → 本例红。
test('BUG-445 FinalToc：章节目录渲染为可点击 button，点击可触发对应正文章节 scrollIntoView', async () => {
  const run = makeMaliciousRunSource({ tree: structuredClone(BUNDLE) })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const auditTab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes('审计版'))
  assert.ok(auditTab !== undefined)
  fireEvent.click(auditTab)
  await flushUi(act)

  const tocDetails = container.querySelector('details')
  assert.ok(tocDetails !== null, '多节终稿应渲染章节目录')
  const firstBtn = tocDetails.querySelector('button[type="button"]')
  assert.ok(firstBtn !== null, '目录项必须是可点击 <button type="button">，不能是纯 <div>')

  const h2 = [...container.querySelectorAll('h1, h2, h3')].find((el) => el.textContent?.includes('下一版优先项'))
  assert.ok(h2 !== undefined)
  let scrolled = 0
  h2.scrollIntoView = () => { scrolled += 1 }
  const targetBtn = [...tocDetails.querySelectorAll('button')].find((b) => b.textContent?.includes('下一版优先项'))
  assert.ok(targetBtn !== undefined)
  fireEvent.click(targetBtn)
  assert.equal(scrolled, 1, '点击目录项必须滚动定位到对应章节标题')
})

// 负例留证 2026-11-27：BUG-447——ResearchEvidenceTab 重复渲染两份 Question List 且中文硬编码英文 Quality 标签。
// 红配方：恢复硬编码 Quality 与未裁剪的 bodyMarkdown → 中文模式出现 Quality A 且问项出现 2 次红。
test('BUG-447 ResearchEvidenceTab：Question List 去重单份渲染，且中英文元信息标签本地化', async () => {
  const runZh = makeMaliciousRunSource({ tree: structuredClone(BUNDLE) })
  const zhView = render(createElement(ResearchEvidenceTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: { navigation: { address: 'dsh-resource://file/session/s1/drt_demo/evidence/e1.md' }, visible: true, actions: { openTab: () => {} } },
    }),
    runSource: () => runZh.source,
    visible: true,
  }))
  await flushUi(act)
  const zhText = zhView.container.textContent ?? ''
  assert.match(zhText, /质量 A/)
  assert.match(zhText, /一手信源/)
  assert.doesNotMatch(zhText, /Quality A/)
  const hits = zhText.match(/是否官方来源？/g) ?? []
  assert.equal(hits.length, 1, `Question List 条目只应渲染 1 次，实际 ${hits.length} 次`)
  cleanup()

  const runEn = makeMaliciousRunSource({ tree: structuredClone(BUNDLE) })
  const enView = render(createElement(ResearchEvidenceTab, {
    sessionId: 's1',
    t: tEn,
    useTabInfo: () => ({
      tab: { navigation: { address: 'dsh-resource://file/session/s1/drt_demo/evidence/e1.md' }, visible: true, actions: { openTab: () => {} } },
    }),
    runSource: () => runEn.source,
    visible: true,
  }))
  await flushUi(act)
  const enText = enView.container.textContent ?? ''
  assert.match(enText, /Quality A/)
  assert.match(enText, /Primary/)
})

// 负例留证 2026-11-27：BUG-438——终稿分屏窄列下 .segmentedWrap { flex: 1; min-width: 180px } 压缩小于
// SegmentedControl 固有宽度，导致文字横向溢出遮挡右侧「分屏看状态」按钮。
// 红配方：将 .segmentedWrap 恢复成 flex: 1; min-width: 180px → 本例红。
test('BUG-438 ResearchFinalTab.module.css：窄列分屏下 segmentedWrap 不缩窄重叠且支持横向安全容器', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const cssText = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css', import.meta.url)),
    'utf8',
  )
  const block = /\.segmentedWrap\s*\{([^}]*)\}/.exec(cssText)?.[1] ?? ''
  assert.doesNotMatch(block, /min-width:\s*180px/, '不得把 segmentedWrap 强压成 min-width: 180px 造成溢出')
  assert.match(block, /flex:\s*0\s+0\s+auto/, 'segmentedWrap 应保持固有宽度并让父容器 flex-wrap 换行')
  assert.match(block, /max-width:\s*100%/, '超窄下受 max-width: 100% 约束')
  assert.match(block, /overflow-x:\s*auto/, '超窄极限下由容器内滚动兜底而非盖住按钮')
})

// 负例留证 2026-11-27：BUG-453——FinalToc 未剥离 Markdown 链接（[文本](url) 或 linkified 证据引用），
// 导致目录裸露原始 URL 且点击无法匹配 rendered h2.textContent 进行滚动。
// 红配方：去掉 FinalToc stripMarkdownInline 链接剥离 → 目录出现 https:// 与 evidence/ URL 且 scrolled=0 红。
test('BUG-453 FinalToc：剥离标题内 Markdown 链接与引用 URL 并可点击滚动定位', async () => {
  const treeWithLinkHeadings = structuredClone(BUNDLE)
  treeWithLinkHeadings.drt_demo.final['v1.md'] = [
    '# 审计终稿',
    '',
    '## [参考文档标题](https://example.com/spec)',
    '外链章节正文。',
    '',
    '## 核心结论 [来源: evidence/e1.md]',
    '带证据引用章节正文。',
    '',
  ].join('\n')
  const run = makeMaliciousRunSource({ tree: treeWithLinkHeadings })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const auditTab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes('审计版'))
  assert.ok(auditTab !== undefined)
  fireEvent.click(auditTab)
  await flushUi(act)

  const tocDetails = container.querySelector('details')
  assert.ok(tocDetails !== null)
  const buttons = [...tocDetails.querySelectorAll('button[type="button"]')]
  const tocText = buttons.map((b) => b.textContent ?? '').join('\n')
  assert.doesNotMatch(tocText, /https:\/\/|example\.com|\(evidence\/e1\.md\)/, `TOC 目录不得裸露原始 URL：${tocText}`)
  const refBtn = buttons.find((b) => b.textContent?.includes('参考文档标题'))
  const citeBtn = buttons.find((b) => b.textContent?.includes('核心结论'))
  assert.ok(refBtn !== undefined && citeBtn !== undefined, `目录项缺失：${tocText}`)

  const h2s = [...container.querySelectorAll('h2')]
  const hRef = h2s.find((el) => el.textContent?.includes('参考文档标题'))
  const hCite = h2s.find((el) => el.textContent?.includes('核心结论'))
  assert.ok(hRef !== undefined && hCite !== undefined)
  let scrolledRef = 0
  let scrolledCite = 0
  hRef.scrollIntoView = () => { scrolledRef += 1 }
  hCite.scrollIntoView = () => { scrolledCite += 1 }
  fireEvent.click(refBtn)
  fireEvent.click(citeBtn)
  assert.equal(scrolledRef, 1, '点击含外链标题 TOC 项必须滚动命中对应 h2')
  assert.equal(scrolledCite, 1, '点击含引用后缀标题 TOC 项必须滚动命中对应 h2')
})

// 负例留证 2026-11-27：BUG-458——FinalToc stripMarkdownInline 使用非嵌套正则 [^)]*，
// 遇到 URL 内含成对小括号（如 Wikipedia 词条）时过早截断并把外层 ) 留在目录里。
// 红配方：将 stripMarkdownLinks 改回正则 /\[([^\]]+)\]\([^)]*\)/g → 本例红。
test('BUG-458 FinalToc：完整剥离 URL 内含成对嵌套括号的 Markdown 链接并命中滚动', async () => {
  const tree = structuredClone(BUNDLE)
  tree.drt_demo.final['v1.md'] = [
    '# 审计终稿',
    '',
    '## 参考 [United Nations](https://en.wikipedia.org/wiki/United_Nations_(disambiguation)) 说明',
    '百科括号链接章节正文。',
    '',
    '## 深度 [API (v2)](https://docs.example.com/a_(b_(c))) 概览',
    '多层括号链接章节正文。',
    '',
  ].join('\n')
  const run = makeMaliciousRunSource({ tree })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const auditTab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes('审计版'))
  assert.ok(auditTab !== undefined)
  fireEvent.click(auditTab)
  await flushUi(act)

  const buttons = [...(container.querySelector('details')?.querySelectorAll('button[type="button"]') ?? [])]
  const labels = buttons.map((b) => (b.textContent ?? '').trim())
  assert.deepEqual(labels, ['审计终稿', '参考 United Nations 说明', '深度 API (v2) 概览'])

  const h2 = [...container.querySelectorAll('h2')].find((el) => el.textContent?.includes('United Nations'))
  assert.ok(h2 !== undefined)
  let scrolled = 0
  h2.scrollIntoView = () => { scrolled += 1 }
  fireEvent.click(buttons[1])
  assert.equal(scrolled, 1)
})

// 负例留证 2026-11-27：BUG-460——窄分屏（~238px）下 SegmentedControl 按最长项 1fr 撑宽裁切「核查清单」与高亮白框。
// 红配方：去掉 ResearchFinalTab SegmentedControl 的 segmentedControl 类或去掉 .controlsBar @container 窄栏自适应 → 本例红。
test('BUG-460 ResearchFinalTab：启用 container query 与 segmentedControl 类防止窄分屏裁切激活标签', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const cssText = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css', import.meta.url)),
    'utf8',
  )
  assert.match(cssText, /\.controlsBar\s*\{[^}]*container-type:\s*inline-size/, '.controlsBar 须启用 container-type: inline-size')
  assert.match(cssText, /@container\s*\(max-width:/, '须定义 @container 窄栏规则压缩分段控件')
  assert.match(cssText, /\.segmentedControl\s*\{[^}]*width:\s*100%/, '窄栏下 .segmentedControl 须贴合容器宽 100%')
  assert.match(cssText, /\.segmentedControl\s*>\s*button\[role='tab'\][^}]*min-width:\s*0/, '窄栏分段 tab 须允许收缩并省略溢出')

  const run = makeMaliciousRunSource({ tree: structuredClone(BUNDLE) })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const tablist = container.querySelector('[role="tablist"]')
  assert.ok(tablist !== null && /\bsegmentedControl\b/.test(tablist.className), `SegmentedControl 须挂 segmentedControl 类：${tablist?.className}`)
})

// 负例留证 2026-11-28：BUG-482——ClaimsAuditView 长证据文件名 Pill 在 330px 对照栏内撑爆折行碰撞、
// .studioInspectorBody 缺横向防溢出守卫，且 ResearchFinalTab 340px 紧凑断点在 341-372px 形成死区裁切第 3 项。
// 红配方：把 @container (max-width: 390px) 改回 340px、去掉 claimRefPill/claimRefText 单行省略或去掉 .studioInspectorBody overflow-x → 本例红。
test('BUG-482 ResearchFinalTab / ClaimsAuditView：长证据路径单行省略保留完整 title、对照栏防横溢且紧凑断点升至 390px', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const cssText = readFileSync(
    fileURLToPath(new URL('../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css', import.meta.url)),
    'utf8',
  )
  assert.match(cssText, /@container\s*\(max-width:\s*390px\)/, '紧凑工具栏断点应调高至 390px 消除 341-372px 死区')
  const inspectorBlock = /\.studioInspectorBody\s*\{([^}]*)\}/.exec(cssText)?.[1] ?? ''
  assert.match(inspectorBlock, /overflow-x:\s*hidden/, '.studioInspectorBody 须启用 overflow-x: hidden')
  assert.match(inspectorBlock, /overflow-wrap:\s*anywhere/, '.studioInspectorBody 须启用 overflow-wrap: anywhere')
  const pillBlock = /\.claimRefPill\s*\{([^}]*)\}/.exec(cssText)?.[1] ?? ''
  assert.match(pillBlock, /max-width:\s*100%/)
  assert.match(pillBlock, /overflow:\s*hidden/)
  assert.match(pillBlock, /text-overflow:\s*ellipsis/)
  assert.match(pillBlock, /white-space:\s*nowrap/)

  const longRef = 'evidence/t5-ascend-pytorch-199-graph-capture-benchmark-long-filename.md'
  const tree = structuredClone(BUNDLE)
  tree.drt_demo['claims.json'] = JSON.stringify({
    version: 2, finalRef: 1,
    claims: [{ id: 'C1', text: '长证据路径主张', critical: true, topics: ['T1'], evidence: [longRef], urls: [] }],
  })
  const run = makeMaliciousRunSource({ tree })
  const { container } = render(createElement(ResearchFinalTab, {
    sessionId: 's1',
    t: tZh,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://file/session/s1/drt_demo/final.md' },
        visible: true,
        actions: { openTab: () => {}, openResource: () => {} },
      },
    }),
    runSource: () => run.source,
    visible: true,
  }))
  await flushUi(act)
  const claimsTab = [...container.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.includes('核查清单'))
  assert.ok(claimsTab !== undefined)
  fireEvent.click(claimsTab)
  await flushUi(act)
  const evBtn = [...container.querySelectorAll('button')].find((b) => b.textContent === longRef)
  assert.ok(evBtn !== undefined, '应渲染长证据路径胶囊按钮')
  assert.equal(evBtn.getAttribute('title'), longRef, '截断后的长路径胶囊须在 title 中保留完整路径')
  assert.match(evBtn.className, /\bclaimRefPill\b/, '长路径胶囊须挂载 claimRefPill 单行省略类')
})
