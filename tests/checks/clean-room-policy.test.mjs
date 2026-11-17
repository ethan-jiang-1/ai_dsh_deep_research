// clean-room-policy.test.mjs — 干净室三判据的纯函数矩阵（BUG-233 / 234 / 235）。
//
// 边界：安装矩阵本身（mkdtemp/plugin add/起 web）要子进程，归 smoke；本文件钉「仓外 home /
// 版本在合同内 / 解析不落仓根」三条纯判据，让 push 车道也能看见策略回归。
// 负例留证 2026-11-17：BUG-233 / BUG-234 / BUG-235——把 home 放回仓内（isOutsideRepo 用例红）、
// 把 dsh 换成 0.3.0（版本用例红）、把解析结果指到仓内（泄漏用例红）；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dshVersionOfOutput, engineVersionIssues, isOutsideRepo, repoLeaksOf } from '../../checks/lib/harness/clean-room-policy.mjs'

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
