// 慢资产成本预算（W3-7 后成本治理）——ratchet，只降不升；2026-11-17 按 D54 拆频率两档：
//   required（tier: ci）= push 面 ≤ 3、required slow ≤ 3；nightly（tier: nightly）≤ 12；全部 slow ≤ 15。
//   拆分理由：CI 分层后 push 门只跑 keyless（0 条 smoke），旧「CI 入口 ≤ 11」实际约束的是夜间资产，
//   required 与 nightly 共用一词 = 预算单位失真（BUG-215）。夜间档不消耗 required cap。
// 新增 required 入口必须先有替代/退役；新增 slow 资产必须先退役一个，或按 D54 改预算并同 diff 说明。
// 这不是运行时间门禁（时间随机器漂移），是资产数量的硬上限，防「再加一个 E2E 就好了」。
// 反证：往 registry 加一个 required/slow 假条目 → 红；删除 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { smokeFiles, smokeSurfaceIssues } from '../../checks/lib/test-infra/smoke-assets.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'checks', 'smoke')
const registry = JSON.parse(readFileSync(join(SMOKE, 'registry.json'), 'utf8'))
const entries = Object.entries(registry)
const required = entries.filter(([, e]) => e.tier === 'ci')
const requiredSlow = required.filter(([, e]) => e.cost === 'slow')
const nightly = entries.filter(([, e]) => e.tier === 'nightly')
const slow = entries.filter(([, e]) => e.cost === 'slow')

const CAP = { required: 3, requiredSlow: 3, nightly: 12, slow: 15 }

test('慢资产预算 ratchet：required / nightly / slow 分档不超上限', () => {
  const issues = smokeSurfaceIssues(SMOKE)
  assert.deepEqual(issues, [], `checks/smoke 只许顶层普通文件：${issues.join('；')}`)
  const onDisk = smokeFiles(SMOKE)
  for (const file of Object.keys(registry)) assert.ok(onDisk.includes(file), `${file} 在 registry，但盘上不是顶层 smoke 文件`)
  assert.ok(required.length <= CAP.required, `required（tier: ci）${required.length} > ${CAP.required}——push 面只留最小集，新增先退役/合并或按 D54 改预算`)
  assert.ok(requiredSlow.length <= CAP.requiredSlow, `required slow ${requiredSlow.length} > ${CAP.requiredSlow}——先降一个慢资产，或按 D54 改预算`)
  assert.ok(nightly.length <= CAP.nightly, `nightly ${nightly.length} > ${CAP.nightly}——夜间承重先退役/合并一个，或按 D54 改预算（夜间档不消耗 required cap）`)
  assert.ok(slow.length <= CAP.slow, `全部 slow ${slow.length} > ${CAP.slow}——先退役/合并一个慢资产，或按 D54 改预算`)
})

test('每个 slow 资产仍有 sunset（预算不是唯一出口；退役条件必须在场）', () => {
  for (const [file, entry] of slow) {
    assert.ok(typeof entry.sunset === 'string' && entry.sunset.trim().length >= 10, `${file}: slow 资产缺 sunset`)
  }
})
