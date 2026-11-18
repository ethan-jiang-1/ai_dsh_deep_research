// profile-guard.test.mjs — 非默认 profile 守卫的纯判据（BUG-237）。
//
// 负例留证 2026-11-17：BUG-237——把默认 profile 名改掉（deep-research 用例红）或让非默认返回 null
// （拒绝用例红）；还原 → 绿。真入口红证 = `DSH_RUN_PROFILE=research node tools/channel/run-driver.mjs up` exit 2。
// 负例留证 2026-11-18：BUG-242 / BUG-243——把决策改回只看 DEFAULT_PROFILE（--profile 用例红）、
// 删 boot-run 守卫（契约用例红）；真入口红证 = `up --profile research` 旧路径 exit 1、boot-run 直起 exit 1。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bootRunGuardProblems, DEFAULT_PROFILE, profileGuardDecision, staleProfileMessage,
} from '../../../checks/lib/channel/profile-guard.mjs'

test('非默认 profile fail-loud，默认 profile 放行（BUG-237）', () => {
  assert.equal(DEFAULT_PROFILE, 'deep-research')
  assert.equal(staleProfileMessage('deep-research'), null)
  const message = staleProfileMessage('research')
  assert.match(message, /不是默认 deep-research/)
  assert.match(message, /跳过镜像漂移检测/)
  assert.match(message, /--allow-stale-profile/)
  assert.match(staleProfileMessage('wave-pilot'), /wave-pilot/)
})

test('守卫决策看实际 profile：--profile/非默认都拒，显式放行才过（BUG-242）', () => {
  assert.equal(profileGuardDecision({ profile: 'deep-research' }), null)
  assert.match(profileGuardDecision({ profile: 'research' }), /不是默认 deep-research/)
  assert.equal(profileGuardDecision({ profile: 'research', allowStale: true }), null, '显式 --allow-stale-profile 放行')
})

test('boot-run 直起守卫契约在场（BUG-243 静态面；真红证 = DSH_RUN_PROFILE=research 直起 exit 2）', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
  const text = readFileSync(join(root, 'tools', 'channel', 'boot-run.sh'), 'utf8')
  assert.deepEqual(bootRunGuardProblems(text), [])
  assert.ok(bootRunGuardProblems('PROFILE=x').length >= 2, '缺守卫的脚本必须被判红')
})
