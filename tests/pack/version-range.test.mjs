// version-range 子集回归 — pack engines.dsh 的宽范围判定；反证：把 < / ^ / || 分支写反 → 红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { satisfiesVersion } from '../../packages/deep-research-pack/scripts/lib/version-range.mjs'

const RANGE = '>=0.2.1-rc.2 <0.3.0'

test('范围：0.2.x 的已测/未来补丁与 rc 放行，0.3.0 与更低版本拒绝', () => {
  for (const v of ['0.2.1-rc.2', '0.2.1-rc.3', '0.2.1', '0.2.2', '0.2.99']) {
    assert.equal(satisfiesVersion(v, RANGE), true, `${v} 应放行`)
  }
  for (const v of ['0.2.0-rc.2', '0.2.1-rc.1', '0.3.0', '1.0.0']) {
    assert.equal(satisfiesVersion(v, RANGE), false, `${v} 应拒绝`)
  }
})

test('exact / caret / || / 非法范围', () => {
  assert.equal(satisfiesVersion('0.2.1-rc.2', '0.2.1-rc.2'), true)
  assert.equal(satisfiesVersion('0.2.1-rc.3', '0.2.1-rc.2'), false)
  assert.equal(satisfiesVersion('0.2.1-rc.3', '^0.2.1-rc.2'), true)
  assert.equal(satisfiesVersion('0.3.0-rc.1', '^0.2.1-rc.2'), false)
  assert.equal(satisfiesVersion('0.2.0-rc.2', '0.2.1-rc.2 || >=0.2.1-rc.3 <0.3.0'), false)
  assert.equal(satisfiesVersion('0.2.1-rc.3', '0.2.1-rc.2 || >=0.2.1-rc.3 <0.3.0'), true)
  assert.equal(satisfiesVersion('0.2.1-rc.2', 'not-a-range'), false)
  assert.equal(satisfiesVersion('not-a-version', RANGE), false)
})
