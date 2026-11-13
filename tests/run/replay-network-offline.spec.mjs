// 负例留证 2026-11-12：BUG-064——无离线闸时 A 层停在 tool/call；还原法 = 关闭 offline preload。
// replay-network-offline — 回放 A 层离线闸的纯判据（BUG-064）。
// 反证：把 isLoopback 改成就地 false/true，下面的 loopback/外部形态对账即红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isLoopback } from '../../scripts/lib/replay-network-offline-policy.cjs'

test('BUG-064 离线闸：loopback 放行、外部主机判失败', () => {
  for (const host of ['127.0.0.1', 'localhost', '::1', '0.0.0.0', '127.0.0.53', 'app.localhost', '', undefined]) {
    assert.equal(isLoopback(host), true, `${String(host)} 是 loopback`)
  }
  for (const host of ['example.com', 'api.deepseek.com', '8.8.8.8', '192.168.1.10', 'github.com']) {
    assert.equal(isLoopback(host), false, `${host} 必须被离线闸拦下`)
  }
})


// 负例留证 2026-11-12：BUG-067——修复前 install() 只补 lookup/connect，resolve4 实测绕过。
// 还原法 = 删 RESOLVE_NAMES 循环。运行时实测（本文件外的一次性探针）：
// fetch 外网 ERR / resolve4 ERR ENOTFOUND / lookup ERR ENOTFOUND；本机连接未被闸门拦。
test('BUG-067 离线闸源码覆盖 dns.resolve* / promises / Resolver.prototype', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const source = readFileSync(join(root, 'scripts', 'lib', 'replay-network-offline.cjs'), 'utf8')
  for (const name of ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveMx', 'resolveSrv', 'resolveTxt']) {
    assert.ok(source.includes(`'${name}'`), `RESOLVE_NAMES 缺 ${name}`)
  }
  assert.ok(source.includes('dns.promises?.[name]'), 'promises 面必须覆盖')
  assert.ok(source.includes('dns.Resolver?.prototype?.[name]'), 'Resolver.prototype 面必须覆盖')
  assert.match(source, /只覆盖 \*\*dsh 主进程内\*\*的网络调用/, '子进程边界必须写进头注')
})
