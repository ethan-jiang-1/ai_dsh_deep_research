// clean-room-policy.test.mjs — 干净室三判据的纯函数矩阵（BUG-233 / 234 / 235）。
//
// 边界：安装矩阵本身（mkdtemp/plugin add/起 web）要子进程，归 smoke；本文件钉「仓外 home /
// 版本在合同内 / 解析不落仓根」三条纯判据，让 push 车道也能看见策略回归。
// 负例留证 2026-11-17：BUG-233 / BUG-234 / BUG-235——把 home 放回仓内（isOutsideRepo 用例红）、
// 把 dsh 换成 0.3.0（版本用例红）、把解析结果指到仓内（泄漏用例红）；还原 → 绿。
// 负例留证 2026-11-18：BUG-240 / BUG-241——把 moduleLeakOf 的解析基改回 home 根（profile 用例红）、
// 把探测集换回 3 个硬编码名（新增 peer 用例红）；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  dshVersionOfOutput, engineVersionIssues, isOutsideRepo, moduleLeakOf, peerNamesOf, repoLeaksOf,
} from '../../../checks/lib/harness/clean-room-policy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('干净室纯判据：仓外 home / 版本合同 / 解析祖先（BUG-233 / BUG-234 / BUG-235）', () => {
  assert.equal(isOutsideRepo('/repo', '/tmp/dsh-home'), true)
  assert.equal(isOutsideRepo('/repo', '/repo/runtime/harness-home'), false)
  assert.equal(isOutsideRepo('/repo', '/repo'), false)
  assert.equal(isOutsideRepo('/repo', '/repo/../tmp/x'), true)
})

test('dsh --version 解析：多行取最后 semver，缺失返回 null（BUG-235）', () => {
  assert.equal(dshVersionOfOutput('0.2.1-rc.5'), '0.2.1-rc.5')
  assert.equal(dshVersionOfOutput('warning\n0.2.1-rc.5\n'), '0.2.1-rc.5')
  assert.equal(dshVersionOfOutput('no version here'), null)
})

test('版本合同：∈ engines.dsh 绿；合同外/缺合同/缺版本都红（BUG-235）', () => {
  assert.deepEqual(engineVersionIssues('0.2.1-rc.5', '>=0.2.1-rc.2 <=0.2.1-rc.5'), [])
  assert.ok(engineVersionIssues('0.3.0', '>=0.2.1-rc.2 <=0.2.1-rc.5').some((p) => p.includes('∉ engines.dsh')))
  assert.ok(engineVersionIssues('0.2.1-rc.5', '').some((p) => p.includes('engines.dsh 缺席')))
  assert.ok(engineVersionIssues(null, '>=0.2.1-rc.2 <=0.2.1-rc.5').some((p) => p.includes('不可用')))
})

test('解析祖先：落仓根 = 泄漏；仓外/未解析 = 干净（BUG-233）', () => {
  assert.deepEqual(repoLeaksOf('/repo', ['/repo/node_modules/react/index.js']), ['/repo/node_modules/react/index.js'])
  assert.deepEqual(repoLeaksOf('/repo', ['/tmp/home/node_modules/react/index.js']), [])
  assert.deepEqual(repoLeaksOf('/repo', []), [])
})

test('解析基 = profile/installed：profile 内仓内 symlink 必红，home 根泄漏不被误判（BUG-240）', () => {
  const root = ROOT
  const home = mkdtempSync(join(tmpdir(), 'cr-home-'))
  try {
    const profile = 'p'
    const profileDir = join(home, 'profiles', profile)
    mkdirSync(join(profileDir, 'node_modules'), { recursive: true })
    // profile 内的仓内 symlink：旧实现从 home 根解析看不到它（子目录），新实现必须命中。
    symlinkSync(join(root, 'node_modules', 'react'), join(profileDir, 'node_modules', 'react'))
    assert.equal(moduleLeakOf({ home, profile, root, names: ['react'] }).length, 1,
      'profile 内的仓内 symlink 必须被报出（解析基 = home/profiles/<profile>）')
    // profile 不存在 = 未装完，红
    assert.ok(moduleLeakOf({ home, profile: 'missing', root, names: ['react'] })[0].includes('profile 目录不存在'))
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('探测集从 peerDependencies 全量派生：新增 peer 自动进入判据（BUG-241）', () => {
  const pkg = { peerDependencies: { '@deepseek-ai/dsh-client-ui-session': '1', react: '^18.2.0' } }
  assert.deepEqual(peerNamesOf(pkg), ['@deepseek-ai/dsh-client-ui-session', 'react'])
  assert.deepEqual(peerNamesOf({}), [])
  // 旧硬编码名单（react/react-dom/@deepseek-ai/dsh-client-ui-primitives）不覆盖新增 peer：
  // 用同一 profile symlink 演示「抽样名单会漏」——全量名单才命中。
  const root = ROOT
  const home = mkdtempSync(join(tmpdir(), 'cr-peers-'))
  try {
    const profileDir = join(home, 'profiles', 'p', 'node_modules', '@deepseek-ai')
    mkdirSync(profileDir, { recursive: true })
    // 目标用仓内真实存在的包：泄漏判据是路径，不是包的真实身份。
    symlinkSync(join(root, 'node_modules', 'react'), join(profileDir, 'dsh-client-ui-session'))
    assert.deepEqual(moduleLeakOf({ home, profile: 'p', root, names: ['react', 'react-dom'] }), [],
      '抽样名单漏掉新增 peer（旧实现的空转形态）')
    assert.equal(moduleLeakOf({ home, profile: 'p', root, names: peerNamesOf(pkg) }).length, 1,
      '全量 peer 名单必须命中 profile 里的仓内 symlink')
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
