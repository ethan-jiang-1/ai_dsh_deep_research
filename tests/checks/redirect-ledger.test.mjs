// redirect-ledger 契约（2026-11-17 维护层对齐）：账本 append-only 后必须能走链。
// 反证：把 resolveRedirect 换回"只走一跳"→ 链用例红；去掉环检测 → 环用例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_REDIRECT_DEPTH, indexRedirects, resolveRedirect } from '../../checks/lib/repo/redirect-ledger.mjs'

const build = (pairs) => indexRedirects(pairs.map(([from, to]) => ({ from, to }))).map

test('链式解析：旧路径 → 中间态 → 现路径', () => {
  const map = build([['scripts/a.mjs', 'checks/lib/a.mjs'], ['checks/lib/a.mjs', 'checks/lib/analyze/a.mjs']])
  assert.deepEqual(resolveRedirect(map, 'scripts/a.mjs'), { final: 'checks/lib/analyze/a.mjs', depth: 2, cycle: false, tooDeep: false })
  assert.deepEqual(resolveRedirect(map, 'checks/lib/a.mjs'), { final: 'checks/lib/analyze/a.mjs', depth: 1, cycle: false, tooDeep: false })
  assert.deepEqual(resolveRedirect(map, 'unrelated.mjs'), { final: 'unrelated.mjs', depth: 0, cycle: false, tooDeep: false })
})

test('环与自指 fail-loud，不静默选一个终点', () => {
  const cycle = build([['a.mjs', 'b.mjs'], ['b.mjs', 'a.mjs']])
  assert.equal(resolveRedirect(cycle, 'a.mjs').cycle, true)
  const self = build([['a.mjs', 'a.mjs']])
  assert.equal(resolveRedirect(self, 'a.mjs').cycle, true)
})

test('过深（> MAX）标记 tooDeep，不返回半截终点', () => {
  const pairs = []
  for (let i = 0; i < MAX_REDIRECT_DEPTH + 2; i++) pairs.push([`p${i}.mjs`, `p${i + 1}.mjs`])
  const res = resolveRedirect(build(pairs), 'p0.mjs')
  assert.equal(res.tooDeep, true)
})

test('条目形状：缺 from/to 或重复 from 都有问题', () => {
  const { problems } = indexRedirects([{ from: 'a.mjs' }, { from: 'b.mjs', to: 'c.mjs' }, { from: 'b.mjs', to: 'd.mjs' }, null])
  assert.ok(problems.some((p) => p.includes('缺 from/to')))
  assert.ok(problems.some((p) => p.includes('重复 from：b.mjs')))
})
