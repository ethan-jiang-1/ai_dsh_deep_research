// doc-counts.test.mjs — count-free 名词闭集的正/负样本（BUG-214 类级）。
//
// 负例留证 2026-11-17：BUG-214——把 `案例` 从 COUNT_NOUNS 删掉 → 本文件「案例/注入案例」用例红；
// 还原 → 绿。门禁侧红证 = gates.e2e `count-free-case-noun`（注入「N 个注入案例」到 live 文档）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { COUNT_NOUNS, countFraudTokens } from '../../../checks/lib/repo/doc-counts.mjs'

const matches = (text) => countFraudTokens(text).map((token) => token.match)

test('名词闭集：资产计数名词在场且长词优先（案例/注入案例）', () => {
  assert.ok(COUNT_NOUNS.includes('案例'), '案例是增长最快的资产计数，不得缺席')
  assert.ok(COUNT_NOUNS.includes('注入案例'), '长名词先于短名词')
  assert.ok(COUNT_NOUNS.length >= 5, '防空语料：词表过短 = 判据面被收窄')
})

test('硬计数被判出：数字 +（可选量词）+ 名词', () => {
  assert.deepEqual(matches(`现共 ${142} 个注入案例`), [`${142} 个注入案例`])
  assert.deepEqual(matches(`共 ${3} 案例`), [`${3} 案例`])
  assert.deepEqual(matches(`${47} 道门禁`), [`${47} 道门禁`])
  assert.deepEqual(matches(`${1366} tests`), [`${1366} tests`])
  assert.deepEqual(matches(`${220} 断言`), [`${220} 断言`])
  assert.deepEqual(matches(`${12} 条源面`), [`${12} 条源面`])
  assert.deepEqual(matches(`门禁 ${12} 个，案例 ${3} 条`), [], '名词在前不是本判据的形态（误伤控制）')
})

test('不收的形态：中文数字、无数字、词内数字（防空转与误伤）', () => {
  assert.deepEqual(matches('十二件门禁'), [], '中文数字不检（已知边界，语义面归 docs-consistency）')
  assert.deepEqual(matches('本仓注入案例表'), [], '无数字不是硬计数')
  assert.deepEqual(matches('abc12案例'), [], '词内数字不算（前面是字母）')
})
