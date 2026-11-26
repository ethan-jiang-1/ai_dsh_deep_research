// final-evidence.spec.mjs — 终稿三视图（核查清单/分屏打开证据卡/prefill）与 ResearchEvidenceTab 组件行为回归。
import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { zh } from '../../../packages/deep-research-pack/src/client/locales.ts'
import { flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from '../client-dom-helpers.mjs'

const { ResearchFinalTab } = await import('../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx')
const { ResearchEvidenceTab } = await import('../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx')
const { extractNextVersionPriorities } = await import('../../../packages/deep-research-pack/src/lib/run/rerun-triage.ts')

const { render, fireEvent, cleanup, act } = await loadRtl()
const tZh = makeTranslator(zh)

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
  assert.match(text, /Quality A/)
  assert.match(text, /primary/)
  assert.match(text, /example\.org/)
  assert.match(text, /是否官方来源？/)
  assert.ok(container.querySelector('a[href="https://example.org/spec"]') !== null)
})
