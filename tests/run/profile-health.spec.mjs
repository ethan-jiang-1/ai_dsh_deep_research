// 负例留证 2026-11-12：BUG-066——修复前 profile 版本面无人校验，banner 超时归因成主机慢。
// 还原法 = profileLayerIssues 跳过版本比较。
// profile-health — dev profile 版本面预检（BUG-066）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { profileLayerIssues } from '../../scripts/lib/profile-health.mjs'

const LAYER = '@deepseek-ai/dsh-experimental-agent-team-profile'

function homeWith(dep) {
  const dir = mkdtempSync(join(tmpdir(), 'profile-health-'))
  const profile = join(dir, 'profiles', 'deep-research')
  mkdirSync(profile, { recursive: true })
  writeFileSync(join(profile, 'package.json'), JSON.stringify({ dependencies: dep === undefined ? {} : { [LAYER]: dep } }))
  return { dir, profile }
}

test('BUG-066：版本一致 → 无问题；缺席/落后 → 给重建指令', () => {
  const ok = homeWith('0.2.1-rc.5')
  try { assert.deepEqual(profileLayerIssues({ profileDir: ok.profile, runtimeVersion: '0.2.1-rc.5' }), []) } finally { rmSync(ok.dir, { recursive: true, force: true }) }

  const stale = homeWith('0.2.1-rc.2')
  try {
    const issues = profileLayerIssues({ profileDir: stale.profile, runtimeVersion: '0.2.1-rc.5' })
    assert.equal(issues.length, 1)
    assert.match(issues[0], /未随 pin 重钉/)
    assert.match(issues[0], /dev\/boot-run\.sh/)
  } finally { rmSync(stale.dir, { recursive: true, force: true }) }

  const missing = join(tmpdir(), 'profile-health-missing-xyz')
  assert.match(profileLayerIssues({ profileDir: missing, runtimeVersion: '0.2.1-rc.5' })[0], /profile 不在场/)
})

test('BUG-066：读不到 runtime 版本 → 拒绝猜（fail-loud）', () => {
  const item = homeWith('0.2.1-rc.5')
  try { assert.match(profileLayerIssues({ profileDir: item.profile, runtimeVersion: '' })[0], /拒绝用猜的版本门/) } finally { rmSync(item.dir, { recursive: true, force: true }) }
})


// 负例留证 2026-11-12：BUG-070——修复前 research 档失配也提示「跑 dev/boot-run.sh」，而
// boot-run 只维护 deep-research；该指令对 research 是死路。还原法 = 忽略 profileName 参数。
test('BUG-070 research 档失配：提示已弃用并指向 deep-research，不冒充 boot-run 能修', () => {
  const item = homeWith('0.2.1-rc.2')
  try {
    const issues = profileLayerIssues({ profileDir: item.profile, runtimeVersion: '0.2.1-rc.5', profileName: 'research' })
    assert.equal(issues.length, 1)
    assert.match(issues[0], /research 档已弃用/)
    assert.match(issues[0], /deep-research/)
    assert.doesNotMatch(issues[0], /先跑 dev\/boot-run\.sh 重建/, '不得给死路指令')
  } finally { rmSync(item.dir, { recursive: true, force: true }) }
})
