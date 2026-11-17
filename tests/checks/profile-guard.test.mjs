// profile-guard.test.mjs — 非默认 profile 守卫的纯判据（BUG-237）。
//
// 负例留证 2026-11-17：BUG-237——把默认 profile 名改掉（deep-research 用例红）或让非默认返回 null
// （拒绝用例红）；还原 → 绿。真入口红证 = `DSH_RUN_PROFILE=research node tools/channel/run-driver.mjs up` exit 2。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_PROFILE, staleProfileMessage } from '../../checks/lib/channel/profile-guard.mjs'

test('非默认 profile fail-loud，默认 profile 放行（BUG-237）', () => {
  assert.equal(DEFAULT_PROFILE, 'deep-research')
  assert.equal(staleProfileMessage('deep-research'), null)
  const message = staleProfileMessage('research')
  assert.match(message, /不是默认 deep-research/)
  assert.match(message, /跳过镜像漂移检测/)
  assert.match(message, /--allow-stale-profile/)
  assert.match(staleProfileMessage('wave-pilot'), /wave-pilot/)
})
