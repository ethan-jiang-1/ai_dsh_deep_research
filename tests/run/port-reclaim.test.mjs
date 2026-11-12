// port-reclaim 身份判定：只收割本仓 DSH web（BUG-104）。
// 负例留证 2026-11-12：BUG-104——修复前对端口任意 listener 直接 SIGKILL。
// 还原法 = isOwnListener 恒 true / 不读 ps command。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isOwnListener } from '../../scripts/lib/port-reclaim-policy.mjs'

test('BUG-104 只认本仓 DSH web 命令行；无关 listener 不杀', () => {
  assert.equal(isOwnListener('node --import tsx/esm /repo/vendor/dsh/apps/cli/src/bin.ts --profile web'), true)
  assert.equal(isOwnListener('node /Users/me/ai_dsh_deep_research/packages/deep-research-pack/lib/client.js'), true)
  assert.equal(isOwnListener('python3 -m http.server 3103'), false)
  assert.equal(isOwnListener('node unrelated-service.js'), false)
  assert.equal(isOwnListener(''), false)
})
