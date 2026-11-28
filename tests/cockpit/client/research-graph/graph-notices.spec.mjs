// graph-notices.spec.mjs — 研究图谱坏表提示的 keyless 静态渲染（react-dom/server）。
//
// 归属：本 spec 只依赖 src/client/research-graph/GraphNotices，住同名 sub（pack-mirror）。
// 覆盖边界：中英诊断文案与英文零 CJK；hook 文件轮询/浏览器装配归 client-load 真机档。
// 反证：删 planIssueTableInvalid 文案或把 t 绕过 → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GraphNotices } from '../../../../packages/deep-research-pack/src/client/research-graph/GraphNotices.tsx'
import { NodeCard } from '../../../../packages/deep-research-pack/src/client/research-graph/NodeCard.tsx'
import { en, zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { loadRtl } from '../../client-dom-helpers.mjs'

const interpolate = (table) => (key, params = {}) => String(table[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))
const tZh = interpolate(zh)
const tEn = interpolate(en)

test('坏表诊断：中英静态渲染且英文零 CJK', () => {
  const props = (t) => ({
    planIssues: [{ kind: 'table-invalid', nodeId: '*', message: t('planIssueTableInvalid', { detail: 'row-arity@3' }) }],
    attention: [],
    onFocusTask: () => {},
    t,
  })
  const zhHtml = renderToStaticMarkup(createElement(GraphNotices, props(tZh)))
  assert.match(zhHtml, /节点表无法解析/)
  assert.match(zhHtml, /row-arity@3/)
  const enHtml = renderToStaticMarkup(createElement(GraphNotices, props(tEn)))
  assert.match(enHtml, /Node table cannot be decoded/)
  assert.doesNotMatch(enHtml, /[\u4e00-\u9fa5]/)
})

test('R4 NodeCard 展开态渲染「插入 @ 引用」按钮并触发回调（不自动提交）', async () => {
  const rtl = await loadRtl()
  const inserted = []
  try {
    const { container } = rtl.render(createElement(NodeCard, {
      node: {
        id: 'W2.1',
        label: 'deep-dive',
        subject: '深挖 Host 投影',
        ownerName: 'analyst-1',
        status: 'unplanned',
        blockedBy: ['W1.1'],
        state: { text: 'plan-only', icon: '○', color: 'var(--dsw-alias-label-secondary)' },
      },
      expanded: true,
      onToggle: () => {},
      copied: false,
      onCopy: () => {},
      inserted: false,
      onInsertRef: () => { inserted.push('@drt_demo/W2.1 ') },
      children: [],
      childStateOf: () => ({ text: 'plan-only', icon: '○', color: 'var(--dsw-alias-label-secondary)' }),
      leadSessionId: 'lead-1',
      useSessions: (selector) => selector({ byId: {}, projectionsBySession: {} }),
      useSessionStatus: (selector) => selector(new Map()),
      boundSlug: 'demo',
      t: tZh,
    }))
    const insertBtn = container.querySelector('[data-testid="graph-insert-ref"]')
    assert.ok(insertBtn !== null, '展开的图谱节点卡应渲染「插入 @ 引用」按钮')
    rtl.fireEvent.click(insertBtn)
    assert.deepEqual(inserted, ['@drt_demo/W2.1 '])
  } finally {
    rtl.cleanup()
  }
})
