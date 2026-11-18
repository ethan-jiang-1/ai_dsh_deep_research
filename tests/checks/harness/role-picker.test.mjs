// role-picker.test.mjs — 角色选择器判据（BUG-292 / 295）。
//
// 负例留证 2026-11-18：BUG-292 / BUG-295——缺 Method Editor / 四角色不连续 / 少于四个 → 红；合法序列 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rolePickerIssues } from '../../../checks/lib/harness/role-picker.mjs'

test('角色选择器：四研究角色连续 + Method Editor（BUG-292 / BUG-295）', () => {
  const ok = ['Deep Research Lead', 'Deep Research Scout', 'Deep Research Analyst', 'Deep Research Critic', 'Method Editor']
  assert.deepEqual(rolePickerIssues(ok), [])
  assert.ok(rolePickerIssues(ok.slice(0, 4)).some((i) => i.includes('Method Editor')))
  assert.ok(rolePickerIssues(['Deep Research Lead', 'Other', 'Deep Research Scout', 'Deep Research Analyst', 'Deep Research Critic', 'Method Editor']).some((i) => i.includes('不连续')))
  assert.deepEqual(rolePickerIssues([]), ['角色选择器点开后零 preset'])
})
