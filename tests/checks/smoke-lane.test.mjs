// smoke 车道选择契约（W0-10）——`test:e2e`/`test:entry` 只跑 registry 里对应 lane 的条目：
//   support 永不进车道；默认只跑 tier: ci；--all 才带 dev-only；未知 lane = 明确报错。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectSmokeLane } from '../../scripts/lib/smoke-lane.mjs'

const registry = {
  'a.e2e.mjs': { lane: 'e2e', tier: 'ci' },
  'b.e2e.mjs': { lane: 'e2e', tier: 'dev-only' },
  'c.entry.mjs': { lane: 'entry', tier: 'ci' },
  'd.support.mjs': { lane: 'support', tier: 'dev-only' },
}

test('smoke lane：按 lane 选、默认 ci、--all 带 dev-only、support 不进车道', () => {
  assert.deepEqual(selectSmokeLane(registry, { lane: 'e2e' }).map((e) => e.file), ['scripts/smoke/a.e2e.mjs'])
  assert.deepEqual(selectSmokeLane(registry, { lane: 'e2e', includeDevOnly: true }).map((e) => e.file), ['scripts/smoke/a.e2e.mjs', 'scripts/smoke/b.e2e.mjs'])
  assert.deepEqual(selectSmokeLane(registry, { lane: 'entry' }).map((e) => e.file), ['scripts/smoke/c.entry.mjs'])
  assert.deepEqual(selectSmokeLane(registry, { lane: 'entry', includeDevOnly: true }).map((e) => e.file), ['scripts/smoke/c.entry.mjs'])
})

test('smoke lane：未知 lane / 空集合明确报错，不静默跑空', () => {
  assert.throws(() => selectSmokeLane(registry, { lane: 'support' }), /未知 smoke 车道/)
  assert.deepEqual(selectSmokeLane(registry, { lane: 'entry', includeDevOnly: false }), selectSmokeLane(registry, { lane: 'entry' }))
})
