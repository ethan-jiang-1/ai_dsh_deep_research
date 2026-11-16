// 负例留证 2026-11-12：BUG-064——无离线闸时 A 层停在 tool/call；还原法 = 关闭 offline preload。
// replay-network-offline — 回放 A 层离线闸的纯判据（BUG-064）。
// 反证：把 isLoopback 改成就地 false/true，下面的 loopback/外部形态对账即红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { isDshMain, isLoopback } from '../../../scripts/lib/harness/replay-network-offline-policy.cjs'

test('BUG-064 离线闸：loopback 放行、外部主机判失败', () => {
  for (const host of ['127.0.0.1', 'localhost', '::1', '0.0.0.0', '127.0.0.53', 'app.localhost', '', undefined]) {
    assert.equal(isLoopback(host), true, `${String(host)} 是 loopback`)
  }
  for (const host of ['example.com', 'api.deepseek.com', '8.8.8.8', '192.168.1.10', 'github.com']) {
    assert.equal(isLoopback(host), false, `${host} 必须被离线闸拦下`)
  }
})


// 负例留证 2026-11-16：BUG-199 / BUG-206——旧判据只读源码子串、不执行 install()，promises
// Resolver 整族绕过仍绿。还原法 = 删 install() 里的 dns.promises.Resolver.prototype patch；
// 下方行为用例会点名 ENOTFOUND 缺失。互补态 = 非武装（env 缺 / argv 不命中）。
// 负例留证 2026-11-12：BUG-067——修复前 install() 只补 lookup/connect，resolve4 实测绕过。
// 现在的覆盖由 vm 行为用例承担：假 dns/net + 假 argv 命中 dsh 主进程，真正执行 install()。
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SOURCE = readFileSync(join(ROOT, 'scripts', 'lib', 'harness', 'replay-network-offline.cjs'), 'utf8')
const RESOLVE_NAMES = ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'resolveCaa']

/** 假 DNS/net：记录真实分支调用次数，并提供与 Node 同形的 callback / promises / Resolver 面。 */
function fakeModules() {
  const calls = { lookup: 0, promiseLookup: 0, connect: 0 }
  const dns = {
    lookup(hostname, options, callback) {
      calls.lookup += 1
      const cb = typeof options === 'function' ? options : callback
      cb(null, { address: '127.0.0.1', family: 4 })
    },
    promises: {
      async lookup() { calls.promiseLookup += 1; return { address: '127.0.0.1', family: 4 } },
    },
    Resolver: class Resolver {
      resolve4(hostname, callback) { calls.resolver4 = (calls.resolver4 ?? 0) + 1; callback(null, ['127.0.0.1']) }
    },
  }
  for (const name of RESOLVE_NAMES) {
    dns[name] = function fakeResolve(hostname, ...rest) {
      calls[name] = (calls[name] ?? 0) + 1
      const cb = rest.at(-1)
      if (typeof cb === 'function') cb(null, ['1.2.3.4'])
    }
    dns.promises[name] = async function fakePromiseResolve() {
      calls[`promises_${name}`] = (calls[`promises_${name}`] ?? 0) + 1
      return ['1.2.3.4']
    }
  }
  dns.promises.Resolver = class PromiseResolver {
    async resolve4() { calls.promiseResolver4 = (calls.promiseResolver4 ?? 0) + 1; return ['1.2.3.4'] }
  }
  const net = {
    Socket: class Socket {
      connect(...args) { calls.connect += 1; const cb = args.at(-1); if (typeof cb === 'function') cb(); return this }
      destroy(error) { calls.destroyed = error; return this }
    },
  }
  return { dns, net, calls }
}

function loadGate({ armed = true, argv = ['node', '/repo/apps/cli/lib/bin.js'] } = {}) {
  const { dns, net, calls } = fakeModules()
  const context = {
    process: { env: armed ? { REPLAY_NETWORK_OFFLINE: '1' } : {}, argv, nextTick: (fn) => fn() },
    module: { exports: {} },
    exports: {},
    require: (name) => {
      if (name === 'node:dns') return dns
      if (name === 'node:net') return net
      if (name === './replay-network-offline-policy.cjs') {
        return { isLoopback, isDshMain: (candidate = argv) => isDshMain(candidate) }
      }
      throw new Error(`unexpected require ${name}`)
    },
  }
  context.globalThis = context
  vm.runInNewContext(SOURCE, context, { filename: 'replay-network-offline.cjs' })
  return { context, dns, calls }
}

const callbackErrorOf = (call) => new Promise((resolve) => call((error) => resolve(error)))

test('离线闸武装态：lookup / promises resolve / callback Resolver / promises Resolver 四形态均 ENOTFOUND（BUG-199 / BUG-206）', async () => {
  const { dns } = loadGate()
  const lookupError = await callbackErrorOf((cb) => dns.lookup('example.com', cb))
  assert.equal(lookupError?.code, 'ENOTFOUND', 'dns.lookup 必须被拦')
  await assert.rejects(() => dns.promises.resolve4('example.com'), (error) => error.code === 'ENOTFOUND', 'dns.promises.resolve4 必须被拦')
  const resolverError = await callbackErrorOf((cb) => new dns.Resolver().resolve4('example.com', cb))
  assert.equal(resolverError?.code, 'ENOTFOUND', 'callback Resolver.resolve4 必须被拦')
  await assert.rejects(() => new dns.promises.Resolver().resolve4('example.com'), (error) => error.code === 'ENOTFOUND', 'promises Resolver.resolve4 必须被拦')
})

test('离线闸负控：loopback 放行、非武装态不安装（BUG-199 / BUG-206）', async () => {
  const { dns, calls } = loadGate()
  let lookupOk = false
  dns.lookup('localhost', (error) => { lookupOk = error === null })
  assert.equal(lookupOk, true, 'loopback lookup 放行')
  assert.deepEqual(await dns.promises.resolve4('localhost'), ['1.2.3.4'], 'loopback promises resolve 放行')
  let resolverOk = false
  new dns.Resolver().resolve4('127.0.0.1', (error) => { resolverOk = error === null })
  assert.equal(resolverOk, true, 'loopback callback Resolver 放行')
  assert.deepEqual(await new dns.promises.Resolver().resolve4('localhost'), ['1.2.3.4'], 'loopback promises Resolver 放行')

  const unarmed = loadGate({ armed: false })
  assert.deepEqual(await unarmed.dns.promises.resolve4('example.com'), ['1.2.3.4'], '非武装态 promises resolve 不装')
  assert.deepEqual(await new unarmed.dns.promises.Resolver().resolve4('example.com'), ['1.2.3.4'], '非武装态 promises Resolver 不装')
  const wrongArgv = loadGate({ argv: ['node', '/repo/apps/other/bin.js'] })
  assert.deepEqual(await wrongArgv.dns.promises.resolve4('example.com'), ['1.2.3.4'], 'argv 不命中 dsh 主进程时不装')
  assert.ok(calls.lookup + calls.promiseLookup >= 1, '假模块真实分支被驱动（防空转）')
})
