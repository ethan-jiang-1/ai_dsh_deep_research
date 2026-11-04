// runtime-clean-core 回归：白名单/保留期/安全边界。
//
// 为什么有它：运行区清理的最大风险不是“没删”，是“删错”（活跃 dev home、run bundle、
// symlink 指向的仓外文件）。本测试把“哪些路径永不候选”和“整棵子树都过保留期才删”钉成
// 可失败事实；CLI 壳只做 I/O 与显式 --yes。
//
// 反证：把 classifyRuntimePath 的 standalone 正则放宽到任意顶层名 → “未知顶层目录”用例红；
// 把 cutoff 比较改成 <= → “恰在 cutoff 当天”用例红；还原后绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyRuntimePath, planRuntimeCleanup } from '../../scripts/lib/runtime-clean-core.mjs'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 4, 0, 0, 0)
const old = (days = 30) => NOW - days * DAY
const fresh = (days = 1) => NOW - days * DAY

test('classifyRuntimePath：只认白名单容器/实验根，永不认 harness-home / 未知 / 穿越', () => {
  assert.equal(classifyRuntimePath('field-sim'), 'standalone')
  assert.equal(classifyRuntimePath('field-sim2'), 'standalone')
  assert.equal(classifyRuntimePath('probe-sessions-2026-10-18'), 'standalone')
  assert.equal(classifyRuntimePath('explore-20261026'), 'standalone')
  assert.equal(classifyRuntimePath('research-tmp'), 'standalone')
  assert.equal(classifyRuntimePath('smoke-workspace/old-run'), 'container-child')
  assert.equal(classifyRuntimePath('scenes/case-a'), 'container-child')
  assert.equal(classifyRuntimePath('smoke-workspace'), null, '容器根本身不是候选')
  assert.equal(classifyRuntimePath('harness-home'), null)
  assert.equal(classifyRuntimePath('harness-home/sessions'), null)
  assert.equal(classifyRuntimePath('unknown-dir'), null)
  assert.equal(classifyRuntimePath('smoke-workspace/a/b'), null, '只清直接子项，不递归猜')
  assert.equal(classifyRuntimePath('smoke-workspace/.gitkeep'), null, '点文件（目录占位）不是清理目标')
  assert.equal(classifyRuntimePath('../escape'), null)
  assert.equal(classifyRuntimePath('/tmp/escape'), null)
});

test('planRuntimeCleanup：整棵子树过期才删；新子树、symlink、未知根保留', () => {
  const entries = [
    { relPath: 'field-sim', sizeBytes: 39 * 1024 * 1024, newestMtimeMs: old(30) },
    { relPath: 'probe-save', sizeBytes: 36 * 1024 * 1024, newestMtimeMs: old(20) },
    { relPath: 'smoke-workspace/old-run', sizeBytes: 10 * 1024 * 1024, newestMtimeMs: old(40) },
    { relPath: 'smoke-workspace/fresh-run', sizeBytes: 20 * 1024 * 1024, newestMtimeMs: fresh(1) },
    { relPath: 'scenes/case-a', sizeBytes: 2 * 1024 * 1024, newestMtimeMs: old(15) },
    { relPath: 'harness-home', sizeBytes: 386 * 1024 * 1024, newestMtimeMs: old(90) },
    { relPath: 'unknown-dir', sizeBytes: 1, newestMtimeMs: old(90) },
    { relPath: 'smoke-workspace/linked', sizeBytes: 1, newestMtimeMs: old(90), symlink: true },
    { relPath: 'probe-odd', sizeBytes: 1, newestMtimeMs: Number.NaN },
  ]
  const plan = planRuntimeCleanup(entries, { now: NOW, olderThanDays: 14 })
  assert.deepEqual(plan.remove.map((entry) => entry.relPath), ['field-sim', 'probe-save', 'scenes/case-a', 'smoke-workspace/old-run'])
  assert.equal(plan.removeBytes, (39 + 36 + 2 + 10) * 1024 * 1024)
  const kept = new Map(plan.keep.map((entry) => [entry.relPath, entry.reason]))
  assert.equal(kept.get('smoke-workspace/fresh-run'), 'newer-than-cutoff')
  assert.equal(kept.get('harness-home'), 'not-allowlisted')
  assert.equal(kept.get('unknown-dir'), 'not-allowlisted')
  assert.equal(kept.get('smoke-workspace/linked'), 'symlink')
  assert.equal(kept.get('probe-odd'), 'unknown-mtime')
});

test('planRuntimeCleanup：恰在 cutoff 当天保留（只有严格早于才删）', () => {
  const cutoff = NOW - 14 * DAY
  const plan = planRuntimeCleanup([
    { relPath: 'field-sim', sizeBytes: 1, newestMtimeMs: cutoff },
    { relPath: 'field-sim2', sizeBytes: 1, newestMtimeMs: cutoff - 1 },
  ], { now: NOW, olderThanDays: 14 })
  assert.deepEqual(plan.remove.map((entry) => entry.relPath), ['field-sim2'])
});

test('planRuntimeCleanup：空输入合法；非法参数 fail-loud', () => {
  assert.deepEqual(planRuntimeCleanup([], { now: NOW }).remove, [])
  assert.throws(() => planRuntimeCleanup(null), /entries 必须是数组/)
  assert.throws(() => planRuntimeCleanup([], { now: Number.NaN }), /now 必须是有限数/)
  assert.throws(() => planRuntimeCleanup([], { olderThanDays: -1 }), /olderThanDays/)
});
