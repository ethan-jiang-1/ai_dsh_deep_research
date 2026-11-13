// 负例留证 2026-11-12：BUG-066——修复前 banner 超时只报「等待启动横幅超时」，不识别 incompatible。
// 还原法 = startupFailureHint 恒返回空串。
// startup-hint — boot 失败归因（BUG-066）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startupFailureHint } from '../../scripts/lib/startup-hint.mjs'

test('BUG-066：插件不兼容文本 → 指出 profile 未随 pin 重钉', () => {
  const output = 'plugin version @x@0.2.1-rc.2 is incompatible with dsh 0.2.1-rc.5\nExact-version exemption: not active.'
  const hint = startupFailureHint(output, 'research')
  assert.match(hint, /profile research 未随 pin 重钉/)
  assert.match(hint, /重建该 profile/)
  assert.match(hint, /证据：/)
})

test('BUG-066：无该形态（普通超时/无输出）→ 不伪造归因', () => {
  assert.equal(startupFailureHint('waiting…', 'research'), '')
  assert.equal(startupFailureHint('', 'research'), '')
})
