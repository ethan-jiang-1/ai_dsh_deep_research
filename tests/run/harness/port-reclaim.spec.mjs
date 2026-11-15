// port-reclaim 身份判定：只收割本仓 DSH web（BUG-104 / BUG-113）。
// 负例留证 2026-11-12：BUG-104 / BUG-113——修复前对任意 listener 或按仓库路径子串放行，会误杀仓内无关进程；
// 还原法 = isOwnListener 恒 true 或退回路径子串匹配 → 下方仓内无关 tail/server 例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isOwnListener } from '../../../scripts/lib/harness/port-reclaim-policy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('BUG-104 / BUG-113 只认本仓 DSH web 命令行；仓内无关 listener 不杀', () => {
  const vendorBin = join(ROOT, 'vendor/dsh/apps/cli/src/bin.ts')
  assert.ok(existsSync(vendorBin), 'vendor CLI 入口存在，防命令行锚点漂移')
  const harnessSrc = readFileSync(join(ROOT, 'scripts/lib/shared/web-harness.mjs'), 'utf8')
  assert.ok(harnessSrc.includes("'--import', 'tsx/esm', bin, '--profile'"), 'web-harness 启动 argv 形状仍在位')
  assert.equal(isOwnListener(`node --import tsx/esm ${vendorBin} --profile deep-research -- --port 3103 --no-open`), true)
  assert.equal(isOwnListener('node /Users/me/ai_dsh_deep_research/packages/deep-research-pack/lib/client.js'), false)
  assert.equal(isOwnListener('python3 -m http.server 3103'), false)
  assert.equal(isOwnListener('tail -f /Users/me/ai_dsh_deep_research/runtime/x.log'), false)
  assert.equal(isOwnListener('node /Users/me/ai_dsh_deep_research/scripts/my-server.mjs'), false)
  assert.equal(isOwnListener('dsh --profile deep-research web'), true)
  assert.equal(isOwnListener('node unrelated-service.js'), false)
  assert.equal(isOwnListener(''), false)
})
