// 慢资产成本预算（W3-7 后成本治理）——ratchet，只降不升：
//   CI 入口 ≤ 9、CI `slow` ≤ 3、全部 `slow` ≤ 15（2026-11-13 实测 9/3/15）。
// 新增 CI 入口必须先有替代/退役；新增 slow 资产必须先退役一个，或按 D54 改预算并同 diff 说明。
// 这不是运行时间门禁（时间随机器漂移），是资产数量的硬上限，防「再加一个 E2E 就好了」。
// 反证：往 registry 加一个 ci/slow 假条目 → 红；删除 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { smokeFiles, smokeSurfaceIssues } from '../../scripts/lib/smoke-assets.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'scripts', 'smoke')
const registry = JSON.parse(readFileSync(join(SMOKE, 'registry.json'), 'utf8'))
const entries = Object.entries(registry)
const ci = entries.filter(([, e]) => e.tier === 'ci')
const ciSlow = ci.filter(([, e]) => e.cost === 'slow')
const slow = entries.filter(([, e]) => e.cost === 'slow')

const CAP = { ci: 9, ciSlow: 3, slow: 15 }

test('慢资产预算 ratchet：CI 入口 / CI slow / 全部 slow 不超上限', () => {
  const issues = smokeSurfaceIssues(SMOKE)
  assert.deepEqual(issues, [], `scripts/smoke 只许顶层普通文件：${issues.join('；')}`)
  const onDisk = smokeFiles(SMOKE)
  for (const file of Object.keys(registry)) assert.ok(onDisk.includes(file), `${file} 在 registry，但盘上不是顶层 smoke 文件`)
  assert.ok(ci.length <= CAP.ci, `CI 入口 ${ci.length} > ${CAP.ci}——新增 CI 资产先退役/合并一个，或按 D54 改预算`)
  assert.ok(ciSlow.length <= CAP.ciSlow, `CI slow ${ciSlow.length} > ${CAP.ciSlow}——先降一个慢资产，或按 D54 改预算`)
  assert.ok(slow.length <= CAP.slow, `全部 slow ${slow.length} > ${CAP.slow}——先退役/合并一个慢资产，或按 D54 改预算`)
})

test('每个 slow 资产仍有 sunset（预算不是唯一出口；退役条件必须在场）', () => {
  for (const [file, entry] of slow) {
    assert.ok(typeof entry.sunset === 'string' && entry.sunset.trim().length >= 10, `${file}: slow 资产缺 sunset`)
  }
})
