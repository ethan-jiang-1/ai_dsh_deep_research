// builtin-display.test.mjs — 内置打法内容显示投影的覆盖/零 CJK/zh 对钉/回退（BUG-069）。
//
// 为什么存在：canonical 内容（lib/config-tables.ts）同时是库/指令/skill 表的键，不能翻译；
// 英文界面此前直接渲染 canonical → 半屏中文。本文件钉显示投影层四件事：
//   ① 5 个 canonical 内置名全有映射（名称/摘要/四字段/推荐规则）且 zh 逐字 = canonical；
//   ② en 投影零 CJK（名称/摘要/四字段/推荐规则/领域示范）；
//   ③ 未知名 fail-soft（名称原样、sections null、调用方回退 canonical）；
//   ④ 领域示范（DEMO_ENTRY）同规则：zh 逐字、en 零 CJK。
// 负例留证 2026-11-12：BUG-069——删掉 BUILTIN_DISPLAY_KEYS 任一条目 → 本文件红（覆盖/unknown
// fallback）；把 en 值改回中文 → 「en 投影零 CJK」红；改 zh 显示值一字 → 「zh 逐字等于 canonical」红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BUILTIN_PREFERENCES, DEMO_ENTRY, PATTERN_METHOD_RULES } from '../../packages/deep-research-pack/src/lib/config-tables.ts'
import {
  displayBuiltinOf, displayDemoOf, displayNameOf, displayPatternsOf, displaySectionsOf, displaySummaryOf,
} from '../../packages/deep-research-pack/src/client/builtin-display.ts'
import { en, zh } from '../../packages/deep-research-pack/src/client/locales.ts'
import { interpolate } from '../../packages/deep-research-pack/src/lib/i18n.ts'

const CJK = /[\u4e00-\u9fa5]/
const tZh = (key, params = {}) => interpolate(String(zh[key]), params)
const tEn = (key, params = {}) => interpolate(String(en[key]), params)
const SECTION_KEYS = ['source', 'verify', 'report', 'limit']

function assertNoCjk(label, values) {
  const bad = values.filter((value) => value !== null && value !== undefined && CJK.test(String(value)))
  assert.deepEqual(bad, [], `${label} 的英文显示投影仍含中文：${bad.map(String).join(' | ')}`)
}

test('BUG-069 显示投影：5 个内置打法全有映射，zh 名称/摘要/四字段逐字 = canonical', () => {
  assert.equal(BUILTIN_PREFERENCES.length, 5, '内置打法数量变化时须同步审视显示投影（当前产品合同 = 5 条）')
  for (const canonical of BUILTIN_PREFERENCES) {
    assert.equal(displayNameOf(canonical.name, tZh), canonical.name, `${canonical.name}: zh 显示名必须逐字等于 canonical`)
    assert.equal(displaySummaryOf(canonical.name, tZh), canonical.summary, `${canonical.name}: zh 摘要必须逐字等于 canonical`)
    assert.deepEqual(displaySectionsOf(canonical.name, tZh), canonical.sections, `${canonical.name}: zh 四字段必须逐字等于 canonical`)
    assert.deepEqual(displayBuiltinOf(canonical, tZh), canonical, `${canonical.name}: zh 整条投影 = canonical`)
  }
})

test('BUG-069 显示投影：en 名称/摘要/四字段零 CJK（且名称确实换成了英文）', () => {
  for (const canonical of BUILTIN_PREFERENCES) {
    const display = displayBuiltinOf(canonical, tEn)
    assertNoCjk(`displayBuiltinOf(${canonical.name})`, [display.name, display.summary, ...SECTION_KEYS.map((key) => display.sections[key])])
    assert.notEqual(display.name, canonical.name, `${canonical.name}: 英文显示名不应等于 canonical 中文名`)
    for (const key of SECTION_KEYS) {
      assert.ok(display.sections[key] !== null && display.sections[key].trim() !== '', `${canonical.name}.${key}: en 投影不得为空`)
      assert.notEqual(display.sections[key], canonical.sections[key], `${canonical.name}.${key}: en 投影应是英文副本，不是 canonical 原值`)
    }
  }
})

test('BUG-069 显示投影：推荐规则 zh 逐字 = canonical 映射，en 零 CJK', () => {
  for (const rule of new Set(PATTERN_METHOD_RULES.map((item) => item.method))) {
    const canonicalPatterns = PATTERN_METHOD_RULES.filter((item) => item.method === rule).map((item) => item.patterns).join(' · ')
    assert.equal(displayPatternsOf(rule, tZh), canonicalPatterns, `${rule}: zh 推荐规则必须逐字等于 canonical 映射`)
    assertNoCjk(`displayPatternsOf(${rule})`, [displayPatternsOf(rule, tEn)])
    assert.notEqual(displayPatternsOf(rule, tEn), canonicalPatterns, `${rule}: en 推荐规则不应等于 canonical 中文规则`)
  }
})

test('BUG-069 显示投影：领域示范 zh 逐字 = DEMO_ENTRY，en 零 CJK', () => {
  const demoZh = displayDemoOf(tZh)
  assert.equal(demoZh.name, DEMO_ENTRY.name, 'zh 领域示范名必须逐字等于 canonical')
  assert.deepEqual(demoZh.sections, DEMO_ENTRY.sections, 'zh 领域示范四字段必须逐字等于 canonical')
  const demoEn = displayDemoOf(tEn)
  assertNoCjk('displayDemoOf(en)', [demoEn.name, ...SECTION_KEYS.map((key) => demoEn.sections[key])])
  assert.notEqual(demoEn.name, DEMO_ENTRY.name, 'en 领域示范名不应等于 canonical 中文名')
})

test('BUG-069 显示投影：未登记名称 fail-soft 回退 canonical / 调用方兜底', () => {
  const unknownName = '我的自定义打法'
  assert.equal(displayNameOf(unknownName, tEn), unknownName, '未知名必须原样返回（不吞掉用户内容）')
  assert.equal(displaySummaryOf(unknownName, tEn), '', '完全未知名且无兜底 → 空摘要')
  assert.equal(displaySummaryOf(unknownName, tEn, 'fallback summary'), 'fallback summary', '未知名摘要可用兜底值')
  assert.equal(displaySectionsOf(unknownName, tEn), null, '未知名 sections 返回 null，让调用方回退自身的 canonical sections')
  assert.equal(displayPatternsOf(unknownName, tEn), '', '无推荐规则的未知名 → 空串')
  const unknownEntry = { name: unknownName, summary: '用户摘要', sections: { source: '用户来源', verify: null, report: null, limit: null } }
  assert.deepEqual(displayBuiltinOf(unknownEntry, tEn), unknownEntry, '未登记条目整条投影必须回退自身 canonical 值，不丢内容')
})
