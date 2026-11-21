// port-reclaim 身份判定：只收割本仓 DSH web（BUG-104 / BUG-113）。
// 负例留证 2026-11-12：BUG-104 / BUG-113——修复前对任意 listener 或按仓库路径子串放行，会误杀仓内无关进程；
// 还原法 = isOwnListener 恒 true 或退回路径子串匹配 → 下方仓内无关 tail/server 例红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isOwnListener } from '../../../checks/lib/harness/port-reclaim-policy.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('BUG-104 / BUG-113 只认本仓 DSH web 命令行；仓内无关 listener 不杀', () => {
  const vendorBin = join(ROOT, 'vendor/dsh/apps/cli/src/bin.ts')
  assert.ok(existsSync(vendorBin), 'vendor CLI 入口存在，防命令行锚点漂移')
  const harnessSrc = readFileSync(join(ROOT, 'checks/lib/shared/web-harness.mjs'), 'utf8')
  assert.ok(harnessSrc.includes("'--import', 'tsx/esm', bin, '--profile'"), 'web-harness 启动 argv 形状仍在位')
  assert.equal(isOwnListener(`node --import tsx/esm ${vendorBin} --profile deep-research -- --port 3103 --no-open`), true)
  assert.equal(isOwnListener('node /Users/me/ai_dsh_deep_research/packages/deep-research-pack/lib/client.js'), false)
  assert.equal(isOwnListener('python3 -m http.server 3103'), false)
  assert.equal(isOwnListener('tail -f /Users/me/ai_dsh_deep_research/runtime/x.log'), false)
  assert.equal(isOwnListener('node /Users/me/ai_dsh_deep_research/checks/my-server.mjs'), false)
  assert.equal(isOwnListener('dsh --profile deep-research web'), true)
  assert.equal(isOwnListener('node unrelated-service.js'), false)
  assert.equal(isOwnListener(''), false)
})

// 负例留证 2026-11-19：BUG-315 / BUG-316 / BUG-317——三个入口缺省必须取空闲端口（静态契约）。
test('入口端口缺省 = pickFreePort，不再有 3129/3103/3109 固定缺省（BUG-315 / BUG-316 / BUG-317）', () => {
  const files = ['checks/smoke/cold-start.entry.mjs', 'checks/smoke/snapshot-replay.entry.mjs', 'checks/smoke/client-load.entry.mjs']
  for (const rel of files) {
    const text = readFileSync(join(ROOT, rel), 'utf8')
    assert.match(text, /pickFreePort/, `${rel} 必须用 pickFreePort`)
    assert.doesNotMatch(text, /'31(?:29|03|09)'/, `${rel} 不得再有固定端口缺省`)
  }
})

// 负例留证 2026-11-21：BUG-338——自动端口被抢占后必须有界重选；显式端口只试一次。
test('BUG-338：bootOnFreePort 有界重选；显式端口不重试；非占用错误立即抛', async () => {
  const { bootOnFreePort } = await import('../../../checks/lib/shared/boot-port.mjs')
  const ports = [4101, 4102, 4103]
  const pick = async () => ports.shift() ?? null
  const retries = []
  const result = await bootOnFreePort({
    pick,
    attempts: 3,
    boot: async (port) => { if (port === 4101) throw new Error('listen EADDRINUSE: address already in use'); return `ok:${port}` },
    onRetry: (info) => retries.push(info),
  })
  assert.deepEqual(result, { port: 4102, value: 'ok:4102' })
  assert.equal(retries.length, 1)
  // 显式端口：不调用 pick，也不重试
  let picks = 0
  const explicit = await bootOnFreePort({ explicitPort: 4200, pick: async () => { picks += 1; return 1 }, boot: async (port) => `ok:${port}` })
  assert.deepEqual(explicit, { port: 4200, value: 'ok:4200' })
  assert.equal(picks, 0)
  // 非占用错误立即抛
  await assert.rejects(bootOnFreePort({ explicitPort: null, pick: async () => 4300, boot: async () => { throw new Error('boom') } }), /boom/)
  // 耗尽：抛最后一次
  await assert.rejects(bootOnFreePort({
    pick: (() => { const p = [4400, 4401]; return async () => p.shift() ?? null })(),
    attempts: 2,
    boot: async () => { throw new Error('listen EADDRINUSE') },
  }), /EADDRINUSE/)
})

// 静态契约：三个自动端口入口都必须经 bootOnFreePort（显式端口传 EXPLICIT_PORT，不重选）。
test('BUG-338：自动端口入口接线（client-load / snapshot-replay / cold-start）', () => {
  for (const rel of ['checks/smoke/client-load.entry.mjs', 'checks/smoke/snapshot-replay.entry.mjs', 'checks/smoke/cold-start.entry.mjs']) {
    const source = readFileSync(join(ROOT, rel), 'utf8')
    assert.match(source, /bootOnFreePort\(/, `${rel} 未接 bootOnFreePort`)
    assert.match(source, /explicitPort:\s*EXPLICIT_PORT/, `${rel} 未区分显式端口`)
  }
})
