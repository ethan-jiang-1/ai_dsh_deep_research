// method-library-views.spec.mjs — 方法库展示组件的直测（react-dom/server 静态渲染，keyless）。
//
// 为什么能 keyless：`views.tsx` 只依赖 primitives + 纯折算；静态渲染不需要浏览器/DOM。
// JSX 运行时由 `pnpm test` 的 TSX_TSCONFIG_PATH（pack client tsconfig，jsx=react-jsx）钉住。
// 覆盖边界：文案/字段/按钮接线；交互与状态机归 client-load 真机档。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuiltinView, EditorView, MethodSummaryView, ReadMineView } from '../../../../packages/deep-research-pack/src/client/method-library/views.tsx'
import { SECTION_LABELS } from '../../../../packages/deep-research-pack/src/lib/method-library/library-fold.ts'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { BUILTIN_PREFERENCES } from '../../../../packages/deep-research-pack/src/lib/shared/config-tables.ts'

/** 中文 locale 的 t 桩（组件文案迁到字典后，断言仍按产品中文口径）。 */
const tZh = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

const entry = {
  name: '事实核查', provenance: '我的库', isDefault: false, legacyText: null,
  sections: { source: '官方优先', verify: '两源交叉', report: '六段结论先行', limit: '中文' },
}

test('ReadMineView：条目名/四字段标签与值/操作按钮接线', () => {
  const html = renderToStaticMarkup(createElement(ReadMineView, {
    entry, pendingDelete: null, sending: false,
    t: tZh, onEdit() {}, onPendingDelete() {}, onRemove() {},
  }))
  assert.match(html, /事实核查/)
  assert.match(html, /我的库/)
  for (const { label } of SECTION_LABELS) assert.ok(html.includes(label), `缺字段标签 ${label}`)
  assert.ok(html.includes('官方优先'))
  assert.ok(html.includes(zh.continueInterview), '编辑按钮文案应走 t()')
  assert.ok(html.includes(zh.setDefault))
  assert.ok(html.includes('删除…'), '删除入口文案在场')
})

test('EditorView：编辑态名称只读，改名走新建', () => {
  const html = renderToStaticMarkup(createElement(EditorView, {
    mode: 'edit',
    sending: false,
    t: tZh,
    draft: {
      name: '事实核查',
      currentName: '事实核查',
      provenance: null,
      legacyText: null,
      sections: { source: '官方优先', verify: '两源交叉', report: '六段结论先行', limit: '中文' },
    },
    onNameChange() {},
    onSectionChange() {},
    onSave() {},
    onCancel() {},
  }))
  const nameInput = (html.match(/<input[^>]*>/g) ?? [])[0] ?? ''
  assert.match(nameInput, /\sreadonly(?:="")?/, '编辑态名称 input 必须只读，避免“改名变另存”')
  assert.match(html, /编辑态名称固定/)
})

test('BuiltinView：只读内置条目的名字/摘要/使用按钮（canonical 真值 + 显示投影）', () => {
  // BUG-069 后内置详情按 canonical 名称取显示投影：这里直接用真实内置条目（zh 投影 = canonical）。
  const landscape = BUILTIN_PREFERENCES[1]
  assert.equal(landscape.name, '领域地图')
  const html = renderToStaticMarkup(createElement(BuiltinView, {
    entry: { name: landscape.name, summary: landscape.summary, sections: landscape.sections },
    useLabel: '用于本次研究', t: tZh, onUse() {},
  }))
  assert.ok(html.includes(landscape.name), '内置显示名在场')
  assert.ok(html.includes(landscape.summary), '内置摘要在场')
  assert.ok(html.includes(landscape.sections.source), '内置四字段值在场')
  assert.match(html, /用于本次研究/)
})

// 负例留证 2026-11-27：BUG-456——MethodSummaryView 禁用保存时渲染空后缀「还需补齐：」，
// EditorView 未校验 methodNameIssue 放行前导 #，且缺少新建重名警告。
test('BUG-456 MethodSummaryView / EditorView：命名错误显示具体原因（不留空还需补齐：），并支持新建重名提示', () => {
  const baseSections = { source: '官方优先', verify: '两源交叉', report: '六段结论先行', limit: '中文' }
  const summaryHtml = renderToStaticMarkup(createElement(MethodSummaryView, {
    draft: { name: '测试 (v1)', currentName: null, provenance: null, legacyText: null, sections: baseSections },
    mode: 'new',
    existingNames: ['事实核查'],
    stage: 'form-check',
    manualFields: new Set(),
    coachFields: new Set(),
    sourceFields: new Set(),
    onStageChange() {},
    onFocusField() {},
    onRestartSource() {},
    canSave: false,
    sending: false,
    onSave() {},
    t: tZh,
  }))
  assert.doesNotMatch(summaryHtml, /还需补齐：<\/div>/, '名称错误且四项已填时不得渲染空后缀 还需补齐：')
  assert.match(summaryHtml, /括号|（）|\(\)/, '摘要条必须提示名称含括号的原因')

  const dupHtml = renderToStaticMarkup(createElement(MethodSummaryView, {
    draft: { name: '事实核查', currentName: null, provenance: null, legacyText: null, sections: baseSections },
    mode: 'new',
    existingNames: ['事实核查'],
    stage: 'form-check',
    manualFields: new Set(),
    coachFields: new Set(),
    sourceFields: new Set(),
    onStageChange() {},
    onFocusField() {},
    onRestartSource() {},
    canSave: true,
    sending: false,
    onSave() {},
    t: tZh,
  }))
  assert.match(dupHtml, /已存在同名方法|覆盖/, '新建模式下输入已存在方法名应提示覆盖风险')

  const editorHtml = renderToStaticMarkup(createElement(EditorView, {
    mode: 'new',
    existingNames: ['事实核查'],
    sending: false,
    t: tZh,
    draft: { name: '# 非法标题', currentName: null, provenance: null, legacyText: null, sections: baseSections },
    onNameChange() {},
    onSectionChange() {},
    onSave() {},
    onCancel() {},
  }))
  assert.match(editorHtml, /<button[^>]*disabled[^>]*>保存/, '名称含前导 # 时保存按钮必须禁用')
  assert.match(editorHtml, /#/, 'EditorView 必须显示前导 # 命名错误说明')
})

// 负例留证 2026-11-28：BUG-481——MethodSummaryView 缺少取消按钮与 Escape 监听，且 edit 态仍渲染「重新选择来源」。
// 红配方：去掉 MethodSummaryView 的 onCancel 按钮/Escape 监听或恢复 edit 态渲染 restartSource。
test('BUG-481 MethodSummaryView：访谈态提供取消按钮与 Escape 退出（输入焦点忽略），edit 态隐藏重新选择来源', async () => {
  const baseSections = { source: '官方优先', verify: '两源交叉', report: '六段结论先行', limit: '中文' }
  const editHtml = renderToStaticMarkup(createElement(MethodSummaryView, {
    draft: { name: '事实核查', currentName: '事实核查', provenance: null, legacyText: null, sections: baseSections },
    mode: 'edit',
    stage: 'interview',
    manualFields: new Set(),
    coachFields: new Set(),
    sourceFields: new Set(),
    onStageChange() {},
    onFocusField() {},
    onRestartSource() {},
    onCancel() {},
    canSave: true,
    sending: false,
    onSave() {},
    t: tZh,
  }))
  assert.ok(editHtml.includes(zh.cancel), 'MethodSummaryView 必须提供取消按钮')
  assert.ok(!editHtml.includes(zh.restartSource), 'edit 态下不得显示「重新选择来源」')

  const newHtml = renderToStaticMarkup(createElement(MethodSummaryView, {
    draft: { name: '新方法', provenance: null, legacyText: null, sections: baseSections },
    mode: 'new',
    stage: 'interview',
    manualFields: new Set(),
    coachFields: new Set(),
    sourceFields: new Set(),
    onStageChange() {},
    onFocusField() {},
    onRestartSource() {},
    onCancel() {},
    canSave: true,
    sending: false,
    onSave() {},
    t: tZh,
  }))
  assert.ok(newHtml.includes(zh.restartSource), 'new 态保留「重新选择来源」')
  assert.ok(newHtml.includes(zh.cancel), 'new 态同样提供取消按钮')

  const { loadRtl } = await import('../../client-dom-helpers.mjs')
  const rtl = await loadRtl()
  let cancels = 0
  const { container } = rtl.render(createElement('div', null,
    createElement('input', { 'data-testid': 'other-input' }),
    createElement(MethodSummaryView, {
      draft: { name: '事实核查', currentName: '事实核查', provenance: null, legacyText: null, sections: baseSections },
      mode: 'edit',
      stage: 'interview',
      manualFields: new Set(),
      coachFields: new Set(),
      sourceFields: new Set(),
      onStageChange() {},
      onFocusField() {},
      onRestartSource() {},
      onCancel: () => { cancels += 1 },
      canSave: true,
      sending: false,
      onSave() {},
      t: tZh,
    }),
  ))
  try {
    const input = container.querySelector('input')
    rtl.fireEvent.keyDown(input, { key: 'Escape' })
    assert.equal(cancels, 0, '焦点在 input 内时 Escape 不得误触发取消')
    rtl.fireEvent.keyDown(window, { key: 'Escape' })
    assert.equal(cancels, 1, '非输入焦点下按 Escape 应触发 onCancel')
  } finally {
    rtl.cleanup()
  }
})
