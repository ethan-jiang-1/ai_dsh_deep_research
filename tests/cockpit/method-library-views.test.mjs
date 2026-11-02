// method-library-views.test.mjs — 方法库展示组件的直测（react-dom/server 静态渲染，keyless）。
//
// 为什么能 keyless：`views.tsx` 只依赖 primitives + 纯折算；静态渲染不需要浏览器/DOM。
// JSX 运行时由 `pnpm test` 的 TSX_TSCONFIG_PATH（pack client tsconfig，jsx=react-jsx）钉住。
// 覆盖边界：文案/字段/按钮接线；交互与状态机归 client-load 真机档。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuiltinView, ReadMineView } from '../../packages/deep-research-pack/src/client/method-library/views.tsx'
import { SECTION_LABELS } from '../../packages/deep-research-pack/src/lib/library-fold.ts'

const entry = {
  name: '事实核查', provenance: '我的库', isDefault: false, legacyText: null,
  sections: { source: '官方优先', verify: '两源交叉', report: '六段结论先行', limit: '中文' },
}

test('ReadMineView：条目名/四字段标签与值/操作按钮接线', () => {
  const html = renderToStaticMarkup(createElement(ReadMineView, {
    entry, pendingDelete: null, sending: false,
    t: (key) => key, onEdit() {}, onPendingDelete() {}, onRemove() {},
  }))
  assert.match(html, /事实核查/)
  assert.match(html, /我的库/)
  for (const { label } of SECTION_LABELS) assert.ok(html.includes(label), `缺字段标签 ${label}`)
  assert.ok(html.includes('官方优先'))
  assert.ok(html.includes('continueInterview'), '编辑按钮文案应走 t()')
  assert.ok(html.includes('setDefault'))
  assert.ok(html.includes('删除…'))
})

test('BuiltinView：只读内置条目的名字/摘要/使用按钮', () => {
  const html = renderToStaticMarkup(createElement(BuiltinView, {
    entry: { name: '领域地图', summary: '把谁在做什么铺开', sections: entry.sections },
    useLabel: '用于本次研究', onUse() {},
  }))
  assert.match(html, /领域地图/)
  assert.match(html, /把谁在做什么铺开/)
  assert.match(html, /用于本次研究/)
})
