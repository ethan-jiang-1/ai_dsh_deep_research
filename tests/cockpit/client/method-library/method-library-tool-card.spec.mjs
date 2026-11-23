// 方法库写库工具卡的标题取值回归（BUG-400）。
//
// 病症：`method_library_remove` 的入参是 `{ name }`（没有 entry 正文），旧卡片只从
// `args.entry` 里正则取标题 → 名称恒为空 → 回执退化成字面量「方法条目」。
//
// 负例留证 2026-11-23：BUG-400——把卡片对 remove 的名称来源改回 `args.entry` → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MethodLibraryToolCard } from '../../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx'
import { zh } from '../../../../packages/deep-research-pack/src/client/locales.ts'
import { makeTranslator } from '../../client-dom-helpers.mjs'

const t = makeTranslator(zh)
const render = (toolName, argsRaw, settled) => renderToStaticMarkup(createElement(MethodLibraryToolCard, {
  toolName,
  t,
  block: settled ? { kind: 'ok', call: { argsRaw } } : { argsRaw },
}))

test('BUG-400 删除卡：名称取自 args.name（不依赖 entry 正文）', () => {
  const markup = render('method_library_remove', JSON.stringify({ name: '方案比较' }), true)
  assert.match(markup, /已删除库：方案比较/)
  assert.doesNotMatch(markup, /方法条目/)
})

test('BUG-400 删除卡：运行态也带名称；缺 name 时才回退占位（负控）', () => {
  assert.match(render('method_library_remove', JSON.stringify({ name: '事实核查' }), false), /正在删除方法…/)
  assert.match(render('method_library_remove', '{}', true), /已删除库：方法条目/)
})

test('BUG-400 保存卡：名称仍取自 entry 标题（负控：不得改成读 args.name）', () => {
  const entry = '## 领域地图（2026-11-23，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
  assert.match(render('method_library_upsert', JSON.stringify({ entry }), true), /已写入库：领域地图/)
})
