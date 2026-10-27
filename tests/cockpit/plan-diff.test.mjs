// tests/cockpit/plan-diff.test.mjs —— 图谱版本轨的结构 diff 契约。
// 家 = packages/deep-research-pack/src/lib/plan-diff.ts；夹具 = tests/fixtures/run-rerun/（plan 快照 vs 当前）。
// 钉住：只认 id/lifecycle/deps 三件；重编号靠 `superseded_by:`（结构化），不解析重写记录散文；
// alias 目标不算新增；空/缺席 fail-soft。

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planIndex } from '../../packages/deep-research-pack/src/lib/plan-index.ts'
import { planDiffOf } from '../../packages/deep-research-pack/src/lib/plan-diff.ts'

const fixture = (name) => readFileSync(new URL(`../fixtures/run-rerun/${name}`, import.meta.url), 'utf8')
const planOf = (rows) => planIndex([
  '| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows,
].join('\n'))

test('rerun 夹具：v1 快照 → 当前 v2，新增 W2.1、W1.1 保留', () => {
  const diff = planDiffOf(planIndex(fixture('plan/v1.md')), planIndex(fixture('plan.md')))
  assert.deepEqual(diff.added, ['W2.1'])
  assert.deepEqual(diff.kept, ['W1.1'])
  assert.deepEqual(diff.removed, [])
  assert.deepEqual(diff.aliases, [])
  assert.equal(diff.summary, '+1 新增 / 1 保留')
});

test('重编号：旧号墓碑 superseded_by 指向新号 → 一条 alias，目标不算新增', () => {
  const before = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
    '| W2.1 | — | active | deep-dive | 深挖 | analyst | W1.1 | evidence/a.md | 齐 | 1 | L1 | task-2 |',
  ])
  const after = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
    '| W2.1 | — | superseded_by:W3.2 | deep-dive | 深挖 | analyst | W1.1 | evidence/a.md | 齐 | 1 | L1 | task-2 |',
    '| W3.2 | — | active | deep-dive | 深挖（重编号） | analyst | W1.1 | evidence/a.md | 齐 | 1 | L1 | task-2 |',
  ])
  const diff = planDiffOf(before, after)
  assert.deepEqual(diff.aliases, [{ from: 'W2.1', to: 'W3.2' }])
  assert.deepEqual(diff.kept, ['W1.1'])
  assert.deepEqual(diff.added, [], 'alias 目标不能同时报新增')
  assert.equal(diff.summary, '1 保留 / 1 重编号')
});

test('退役：旧节点在新图里消失且没有后继 → removed', () => {
  const before = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
    '| W2.1 | — | active | deep-dive | 深挖 | analyst | W1.1 | evidence/a.md | 齐 | 1 | L1 | task-2 |',
  ])
  const after = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
  ])
  const diff = planDiffOf(before, after)
  assert.deepEqual(diff.removed, ['W2.1'])
  assert.equal(diff.summary, '1 保留 / 1 退役')
});

test('依赖变化：保留节点 deps 集合变化（顺序不算）', () => {
  const before = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
    '| W1.2 | — | active | broad-scan | 补充扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-3 |',
    '| W2.1 | — | active | deep-dive | 深挖 | analyst | W1.1 | evidence/a.md | 齐 | 1 | L1 | task-2 |',
  ])
  const after = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
    '| W1.2 | — | active | broad-scan | 补充扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-3 |',
    '| W2.1 | — | active | deep-dive | 深挖 | analyst | W1.2,W1.1 | evidence/a.md | 齐 | 1 | L1 | task-2 |',
  ])
  const diff = planDiffOf(before, after)
  assert.deepEqual(diff.dependencyChanges, [{ id: 'W2.1', from: ['W1.1'], to: ['W1.2', 'W1.1'] }])
  assert.match(diff.summary, /1 依赖变化/)
});

test('墓碑不进 diff 的 active 集合（旧图里的 retired 行不算“被退役”）', () => {
  const before = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
    '| W2.3 | — | retired | deep-dive | 早退役 | analyst | W1.1 | evidence/c.md | — | 1 | L1 | |',
  ])
  const after = planOf([
    '| W1.1 | — | active | broad-scan | 扫源 | scout | — | leads.md | 齐 | 1 | L1 | task-1 |',
  ])
  const diff = planDiffOf(before, after)
  assert.deepEqual(diff.removed, [])
  assert.deepEqual(diff.kept, ['W1.1'])
});

test('fail-soft：两侧缺失都不 throw', () => {
  const empty = planDiffOf(null, null)
  assert.deepEqual(empty.added, [])
  assert.equal(empty.summary, '两侧都没有节点')
  assert.equal(planDiffOf(null, planIndex(fixture('plan.md'))).added.length, 2)
});
