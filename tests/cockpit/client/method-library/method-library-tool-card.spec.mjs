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
  assert.match(markup, /已从库删除：方案比较/)
  assert.doesNotMatch(markup, /方法条目/)
})

test('BUG-400 删除卡：运行态也带名称；缺 name 时才回退占位（负控）', () => {
  assert.match(render('method_library_remove', JSON.stringify({ name: '事实核查' }), false), /正在删除方法…/)
  assert.match(render('method_library_remove', '{}', true), /已从库删除：方法条目/)
})

test('BUG-400 保存卡：名称仍取自 entry 标题（负控：不得改成读 args.name）', () => {
  const entry = '## 领域地图（2026-11-23，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
  assert.match(render('method_library_upsert', JSON.stringify({ entry }), true), /已写入库：领域地图/)
})

// 负例留证 2026-11-24：BUG-411——运行态（block 无 kind）时入参是**流式截断前缀**，
// parseArgsObject 按设计返回 null，旧兜底 `action === 'set' ? 'set' : 'clear'` 把未知当 clear，
// 于是「设为默认」在运行窗口显示成「正在清除默认偏好…」。
// 红配方：把三态判定改回二元兜底（或删掉容错字段读取）。
test('BUG-411 运行态截断前缀：按可提取的 action 显示正确动词（不把 set 说成 clear）', () => {
  const setRunning = render('method_library_set_default', '{"action":"set","name":"名称B"', false)
  assert.match(setRunning, /正在设定默认偏好/)
  assert.doesNotMatch(setRunning, /清除/)

  const clearRunning = render('method_library_set_default', '{"action":"clear"', false)
  assert.match(clearRunning, /正在清除默认偏好/)

  // 参数还没到（连 action 都读不到）→ 中性文案，不冒充任何方向。
  const unknown = render('method_library_set_default', '{"operationId":"op', false)
  assert.doesNotMatch(unknown, /清除/)
  assert.doesNotMatch(unknown, /设定/)
  assert.match(unknown, /默认偏好/)
})

// 负控：完整入参（运行态已知 action）与结算态都不受容错读取影响。
test('BUG-411 负控：完整入参运行态 / 结算态文案不变', () => {
  assert.match(render('method_library_set_default', JSON.stringify({ action: 'set', name: '名称B' }), false), /正在设定默认偏好/)
  assert.match(render('method_library_set_default', JSON.stringify({ action: 'clear' }), false), /正在清除默认偏好/)
  assert.match(render('method_library_set_default', JSON.stringify({ action: 'set', name: '名称B' }), true), /已设默认：名称B/)
})

// 负例留证 2026-11-24：BUG-431——`stopped`（vendor 崩溃恢复码）在卡片上被渲染成「失败」；
// 它表达的是「结果未知」，动作可能已生效——必须给中性文案，不能写成失败。
// 红配方：把 stopped 分支删回 failure 文案（toolSaveFailed 等）。
test('BUG-431 工具卡：stopped 显示「结果未知」而不是失败', () => {
  const stoppedBlock = { kind: 'tool-result', isError: true, error: { code: 'TOOL_OUTCOME_UNKNOWN' }, call: { argsRaw: JSON.stringify({ name: '方案比较' }) } }
  const markup = renderToStaticMarkup(createElement(MethodLibraryToolCard, {
    toolName: 'method_library_remove',
    t,
    block: stoppedBlock,
  }))
  assert.match(markup, /结果未知/, 'stopped 必须是中性「结果未知」')
  assert.doesNotMatch(markup, /失败/, '不得把「未知」写成「失败」')
})

// 负例留证 2026-11-28：BUG-481——结算态 defaultAction === null 时二元三目落入 toolDefaultClearDone，
// 伪报「已清除默认偏好」；且 set 缺 name 时输出残缺冒号「已设默认：」。
// 红配方：把 ok 分支改回 `defaultAction === 'set' ? 'toolDefaultSetDone' : 'toolDefaultClearDone'`。
test('BUG-481 默认偏好工具卡结算态三态：未知 action 渲染中性完成文案，空 name 回退占位符', () => {
  const unknownDone = render('method_library_set_default', '{}', true)
  assert.match(unknownDone, /已更新默认偏好/, '未知 action 结算态应渲染中性文案 toolDefaultDone')
  assert.doesNotMatch(unknownDone, /清除/, '未知 action 结算态不得伪报已清除默认偏好')

  const setNoName = render('method_library_set_default', JSON.stringify({ action: 'set' }), true)
  assert.match(setNoName, /已设默认：方法条目/, 'set 缺 name 时应回退 methodEntries 占位符')

  const clearDone = render('method_library_set_default', JSON.stringify({ action: 'clear' }), true)
  assert.match(clearDone, /已清除默认偏好/)
})
