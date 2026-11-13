// defaults-ui.spec.mjs — 项目默认按钮/面板的静态渲染（keyless；组件行为之外的最便宜截面）。
//
// 保障面（issue A8）：按钮四态文案、面板标题/方法行/深度/输出/读者/来源/清除/自动说明；
// 交互写盘由 client-load.entry 真浏览器覆盖，本文件只钉渲染与字典 key。
// 反证：把按钮 auto 分支改回「设置」、或删掉面板的「自动 = 字段省略」说明 → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DefaultsButton } from '../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx'
import { DefaultsPanel } from '../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx'
import { emptyDefaults, parseDefaults } from '../../packages/deep-research-pack/src/lib/research-defaults.ts'
import { zh } from '../../packages/deep-research-pack/src/client/locales/zh.ts'

const t = (key, params = {}) => String(zh[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

const snapshot = (overrides = {}) => ({
  phase: 'ready',
  value: emptyDefaults(),
  problems: [],
  warnings: [],
  methodDefault: null,
  methodConflict: false,
  methodRead: 'absent',
  revision: 0,
  pending: false,
  outcome: null,
  ...overrides,
})

const storeOf = (value) => ({
  subscribe: () => () => {},
  getSnapshot: () => value,
  refresh: async () => {},
  setPatch: async () => {},
  unset: async () => {},
  clear: async () => {},
  dispose: () => {},
})

const button = (value) => renderToStaticMarkup(createElement(DefaultsButton, {
  sessionId: 's1', store: storeOf(value), openConfig: () => {}, t,
}))

test('按钮四态：自动 / 方法 X / 已设 N 项 / 需检查', () => {
  assert.match(button(snapshot()), /研究默认：自动/)
  assert.match(button(snapshot({ methodDefault: '格局调研' })), /研究默认：方法 格局调研/)
  const parsed = parseDefaults(JSON.stringify({ schema: 1, effort: 'deep', output: { shape: 'full_report' } }))
  assert.match(button(snapshot({ value: parsed.value, revision: 1 })), /研究默认：已设 2 项/)
  const invalid = snapshot({ problems: [{ field: 'effort', code: 'invalid', detail: 'bad' }] })
  assert.match(button(invalid), /研究默认：需检查/)
})

test('面板渲染：自动态、方法/深度/输出/读者/来源/清除/自动说明都在', () => {
  const html = renderToStaticMarkup(createElement(DefaultsPanel, {
    sessionId: 's1', store: storeOf(snapshot()), t,
  }))
  for (const marker of ['项目默认', '方法', '自动（按题型推荐）', 'defaults-depth', 'defaults-output-shape', 'defaults-audience', 'defaults-source-official', 'defaults-authority', 'defaults-recency', '清除本项目默认', '自动 = 字段省略']) {
    assert.ok(html.includes(marker), `面板缺 ${marker}`)
  }
  assert.match(html, /由 Lead 按题型判断/)
})

test('面板渲染：显式值进入控件（depth/shape/audience/families）', () => {
  const parsed = parseDefaults(JSON.stringify({
    schema: 1, revision: 2, effort: 'deep',
    output: { shape: 'full_report', audience: '决策层' },
    source: { families: ['official'], authority: 'primary', recency: '12m' },
  }))
  const html = renderToStaticMarkup(createElement(DefaultsPanel, {
    sessionId: 's1', store: storeOf(snapshot({ value: parsed.value, revision: 2 })), t,
  }))
  assert.match(html, /value="deep"/)
  assert.match(html, /value="full_report"/)
  assert.match(html, /value="决策层"/)
  assert.match(html, /aria-pressed="true"[^>]*>官方|官方/)
  assert.match(html, /v2/)
})
