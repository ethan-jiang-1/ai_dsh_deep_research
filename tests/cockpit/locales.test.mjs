// locales.test.mjs — 插件 UI 的中英文对账（BUG-055 的机械守卫）。
//
// 为什么存在：2026-11-11 用户报障 = 方法库面板 tab 名是英文、按钮/空态却是中文（半套 i18n）。
// 字典与 `t()` 先在位并不意味着覆盖：任何组件都能绕过字典写死中文。本文件钉三件：
//   ① zh / en 键集一致、值非空、占位符集合逐个键一致（漏译 = 红）；
//   ② en 值里不出现 CJK（"英文字典里混中文" = 红）；
//   ③ 关键视图在英文 locale 下渲染出的 HTML 不含 CJK（组件绕过字典 = 红）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { en, zh } from '../../packages/deep-research-pack/src/client/locales.ts'
import { BuiltinView, EditorView, LibraryRow, ReadMineView } from '../../packages/deep-research-pack/src/client/method-library/views.tsx'

const CJK = /[\u4e00-\u9fa5]/
const placeholders = (text) => [...String(text).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort()

/** 与 DSH translate 同形的占位符插值；缺参原样留 `{k}`（对账更容易看出漏参）。 */
const tEn = (key, params = {}) => String(en[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

test('zh / en 键集一致、值非空、占位符集合逐键一致', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort(), '英文/中文字典键集必须一致（漏译 = 半套 i18n）')
  for (const key of Object.keys(zh)) {
    assert.ok(String(zh[key]).trim() !== '', `zh.${key} 为空`)
    assert.ok(String(en[key]).trim() !== '', `en.${key} 为空`)
    assert.deepEqual(placeholders(en[key]), placeholders(zh[key]), `${key} 的占位符集合中英不一致`)
  }
})

test('英文值里不出现 CJK', () => {
  const bad = Object.entries(en).filter(([, value]) => CJK.test(String(value))).map(([key]) => key)
  assert.deepEqual(bad, [], `这些英文翻译仍是中文：${bad.join(', ')}`)
})

test('英文 locale 下：方法库关键视图不渲染任何中文', () => {
  const sections = { source: 'Official first', verify: 'Cross-check two sources', report: 'Conclusions first', limit: 'No coverage claims' }
  const renders = {
    LibraryRow: renderToStaticMarkup(createElement(LibraryRow, { name: 'Fact check', summary: 'Verify a claim', isDefault: true, selected: true, t: tEn, onSelect() {} })),
    ReadMineView: renderToStaticMarkup(createElement(ReadMineView, {
      entry: { name: 'Fact check', provenance: 'My library', isDefault: false, legacyText: null, sections },
      pendingDelete: 'Fact check', sending: false, t: tEn,
      onEdit() {}, onPendingDelete() {}, onRemove() {}, onSetDefault() {}, onClearDefault() {},
    })),
    EditorView: renderToStaticMarkup(createElement(EditorView, {
      mode: 'new', sending: false, t: tEn,
      draft: { name: 'Fact check', currentName: undefined, provenance: null, legacyText: null, sections },
      onNameChange() {}, onSectionChange() {}, onSave() {}, onCancel() {},
    })),
    BuiltinView: renderToStaticMarkup(createElement(BuiltinView, {
      entry: { name: 'Landscape', summary: 'Map who is doing what', sections }, onUse() {}, t: tEn,
    })),
  }
  for (const [name, html] of Object.entries(renders)) {
    const hit = html.match(new RegExp(CJK.source + '[^<]*'))
    assert.equal(hit, null, `${name} 在英文 locale 下仍渲染中文：${hit?.[0] ?? ''}`)
  }
})
