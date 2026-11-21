// sandbox-capability.spec.mjs — 嵌套沙箱判据（BUG-349）。反证：把 status!==0 判成 true →
// 「沙箱探测失败」例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sandboxAvailability } from '../../../checks/lib/shared/sandbox-capability.mjs'

test('darwin：探测成功 = 可用；EPERM/非零 = 不可用；非 darwin = 未知', () => {
  assert.equal(sandboxAvailability({ platform: 'darwin', status: 0 }), true)
  assert.equal(sandboxAvailability({ platform: 'darwin', status: 71 }), false)
  assert.equal(sandboxAvailability({ platform: 'darwin', status: null, errorCode: 'EPERM' }), false)
  assert.equal(sandboxAvailability({ platform: 'linux', status: 0 }), null)
})
