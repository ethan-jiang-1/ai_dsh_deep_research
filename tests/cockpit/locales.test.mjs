import { methodNameIssue } from '../../packages/deep-research-pack/src/lib/library-fold.ts'
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
import { BuiltinView, EditorView, LibraryRow, ReadMineView, SourceSelectionView } from '../../packages/deep-research-pack/src/client/method-library/views.tsx'
import { builtinLibraryEntry } from '../../packages/deep-research-pack/src/client/method-library/model.ts'
import { BUILTIN_PREFERENCES } from '../../packages/deep-research-pack/src/lib/config-tables.ts'
import { OrcaName } from '../../packages/deep-research-pack/src/client/BrandMark.tsx'
import { ResearchStatusTab } from '../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx'
import { ResearchGraphTab } from '../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx'

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

// 负例留证 2026-11-12：BUG-069——此前本文件的 BuiltinView 只用合成英文 entry，真实
// BUILTIN_PREFERENCES（中文 canonical）从未被渲染，所以「en 界面内置内容整片中文」一直绿。
// 红配方：把 views.tsx 的 BuiltinView/SourceSelectionView 退回直接渲染 entry.name/sections →
// 下面的真实数据渲染断言红；把 SourceSelectionView 的内置候选项退回 entry.name → 同红。
test('BUG-069 英文 locale 下：真实 BUILTIN_PREFERENCES 渲染 BuiltinView / SourceSelectionView 零 CJK', () => {
  const renders = {}
  for (const entry of BUILTIN_PREFERENCES) {
    renders[`BuiltinView:${entry.name}`] = renderToStaticMarkup(createElement(BuiltinView, {
      entry: builtinLibraryEntry(entry, tEn('builtinReadOnly')), onUse() {}, t: tEn,
    }))
  }
  const builtinChoices = BUILTIN_PREFERENCES.map((entry) => builtinLibraryEntry(entry, tEn('builtinReadOnly')))
  renders.SourceSelectionView = renderToStaticMarkup(createElement(SourceSelectionView, {
    builtinChoices,
    runNames: [],
    runState: 'idle',
    selectedRunLoading: false,
    onCancelRunRead() {},
    selectedBuiltin: builtinChoices[4],
    selectedRun: null,
    onSelectBuiltin() {},
    onSelectRun() {},
    onLoadRuns() {},
    onStartBlank() {},
    onStartBuiltin() {},
    onStartRun() {},
    onCancel() {},
    t: tEn,
  }))
  for (const [name, html] of Object.entries(renders)) {
    const hit = html.match(new RegExp(CJK.source + '[^<]*'))
    assert.equal(hit, null, `${name} 在英文 locale 下仍渲染中文：${hit?.[0] ?? ''}`)
  }
  assert.ok(renders[`BuiltinView:${BUILTIN_PREFERENCES[4].name}`].includes('Timeline &amp; signals'), '真实内置条目应渲染英文显示名')
})

test('英文 locale 下：研究状态 / 研究图谱空态不渲染任何中文（数据面折层同守）', () => {
  // 两页签的空态壳会走 brief-fold / run-fold / state-note 的折层文案——它们不是组件字面量，
  // 漏传 `t` 时只会在真实界面里露出中文。静态渲染是最便宜的端到端守卫（渲染面 = 组件树）。
  const props = {
    sessionId: 'session-test',
    t: tEn,
    useSession: () => undefined,
    useSessions: () => undefined,
    useSessionStatus: () => undefined,
    openFinal: () => {},
    openOwner: () => {},
    follow: async function* () {},
    readFile: async () => null,
    listDir: async () => [],
    runSource: () => ({}),
    send: async () => {},
    visible: true,
  }
  const renders = {
    ResearchStatusTab: renderToStaticMarkup(createElement(ResearchStatusTab, props)),
    ResearchGraphTab: renderToStaticMarkup(createElement(ResearchGraphTab, props)),
  }
  for (const [name, html] of Object.entries(renders)) {
    const hit = html.match(new RegExp(CJK.source + '[^<]*'))
    assert.equal(hit, null, `${name} 在英文 locale 下仍渲染中文：${hit?.[0] ?? ''}`)
  }
})


// 负例留证 2026-11-12：BUG-068——修复前 OrcaName 硬编码 `Orca`，品牌槽也未声明 locale。
// 还原法 = 组件退回 <>Orca</>、槽注册去掉 locale。
test('BUG-068 品牌名随 locale：zh=Orca 深度搜索 / en=Orca Deep Research', () => {
  const tZh = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))
  const stripTags = (html) => html.replace(/<[^>]*>/g, '')
  const zhBrand = renderToStaticMarkup(createElement(OrcaName, { t: tZh }))
  const enBrand = renderToStaticMarkup(createElement(OrcaName, { t: tEn }))
  assert.equal(stripTags(zhBrand), 'Orca 深度搜索')
  assert.equal(stripTags(enBrand), 'Orca Deep Research')
  // 侧栏品牌槽 24px 定高：长名必须单行（折行会被裁）——BUG-069 的现场回归。
  for (const html of [zhBrand, enBrand]) assert.match(html, /white-space:nowrap/, '品牌名必须单行渲染')
  assert.equal(zh.brandName, 'Orca 深度搜索')
  assert.equal(en.brandName, 'Orca Deep Research')
  assert.ok(zh.startTitle.startsWith('Orca 深度搜索 · '), '首屏标题前缀用同一品牌名')
  assert.ok(en.startTitle.startsWith('Orca Deep Research · '), '英文首屏标题前缀用同一品牌名')
})


// 负例留证 2026-11-13：BUG-115——zh namePlaceholder 示例本身被名称校验拒绝。
test('BUG-115 zh 名称占位符示例必须能通过方法名校验', () => {
  const example = String(zh.namePlaceholder).replace(/^例如：/, '').trim()
  assert.equal(methodNameIssue(example), null, example)
})
