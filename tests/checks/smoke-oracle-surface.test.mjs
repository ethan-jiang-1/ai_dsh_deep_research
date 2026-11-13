// smoke 资产账契约（W0-3 / S2）——每条 smoke 必须回答四个问题：
//   ① cost：fast / medium / slow / manual；
//   ② uniqueClaim：只有它能证的那一句话；
//   ③ oracle：判据核的直测路径，或 `none: <理由>`（为什么没有可直测的核）；
//   ④ sunset：什么条件下退役/合并。
//
// 为什么需要：`smoke-registry` 只对账「盘上每个 smoke 有 CI/dev-only 归属」；202s 的
// `gates.e2e` 与 1s 的 `handoff.e2e` 在表里同权，没人能回答「它唯一证明什么、判据核在
// 哪、什么时候该退役」。本契约把 test-asset-fence 的「成本/唯一证明面/判据核/退役条件」
// 变成可对账字段；`none` 必须写理由，不许留空。
//
// 反证：删掉 `run-accept.e2e.mjs` 的 `oracle` → 红；把 oracle 改成不存在的路径 → 红；
// `none` 改成空串 → 红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SMOKE = join(ROOT, 'scripts', 'smoke')
const registry = JSON.parse(readFileSync(join(SMOKE, 'registry.json'), 'utf8'))
const files = readdirSync(SMOKE).filter((f) => f.endsWith('.mjs')).sort()
const COSTS = new Set(['fast', 'medium', 'slow', 'manual'])

test('smoke 资产账：每条 smoke 有 cost/uniqueClaim/oracle/sunset，oracle 可直测或有 none 理由', () => {
  assert.deepEqual(Object.keys(registry).sort(), files, 'registry 与 scripts/smoke/*.mjs 集合必须相等')
  assert.ok(files.length >= 20, `防空语料：smoke 过少（${files.length}）`)
  let realOracles = 0
  for (const [file, entry] of Object.entries(registry)) {
    assert.ok(COSTS.has(entry.cost), `${file} 的 cost 非法：${String(entry.cost)}`)
    assert.ok(['e2e', 'entry', 'support'].includes(entry.lane), `${file} 的 lane 非法：${String(entry.lane)}`)
    assert.equal(typeof entry.uniqueClaim, 'string', `${file} 缺 uniqueClaim`)
    assert.ok(entry.uniqueClaim.trim().length >= 10, `${file} 的 uniqueClaim 太短（要写「只有它能证什么」）`)
    assert.equal(typeof entry.sunset, 'string', `${file} 缺 sunset`)
    assert.ok(entry.sunset.trim().length >= 10, `${file} 的 sunset 太短（要写退役/合并条件）`)
    assert.ok(Array.isArray(entry.oracle) && entry.oracle.length > 0, `${file} 的 oracle 必须是非空数组（没有核就写 none: 理由）`)
    for (const item of entry.oracle) {
      assert.equal(typeof item, 'string', `${file} 的 oracle 项不是字符串`)
      if (item.startsWith('none:')) {
        assert.ok(item.slice(5).trim().length >= 10, `${file} 的 none 理由太短：${item}`)
        continue
      }
      assert.ok(item.startsWith('tests/') && (item.endsWith('.spec.mjs') || item.endsWith('.test.mjs') || item.endsWith('.vendor.spec.mjs')),
        `${file} 的 oracle 必须是 tests/ 下的测试路径或 none:：${item}`)
      assert.ok(existsSync(join(ROOT, item)), `${file} 的 oracle 不存在：${item}`)
      realOracles += 1
    }
  }
  assert.ok(realOracles >= 10, `防空语料：真实 oracle 过少（${realOracles}）——不要把所有条目都写成 none`)
})
