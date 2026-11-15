// replay-network-offline.cjs — 回放 A 层的离线网络闸（test-support preload，BUG-064）。
//
// 为什么存在：`@deepseek-ai/dsh-llm-replay` 只回放 LLM 流，工具仍**照真执行**；`web_search` /
// `web_fetch` 一旦网络挂住，回放回合就停在 `tool/call` 上，240s 后才报「canned 回放未走通」，
// 归因指向模型回放而实际卡在工具。回放只需要工具**返回一个结果**让流继续，不需要真实内容。
//
// 本 preload 在 dsh 子进程里把非 loopback 的出站连接与 DNS 立即判失败（ECONNREFUSED /
// ENOTFOUND），工具于是快速返回错误结果，A 层不再依赖外网、也不再有「永不返回」窗口。
// 边界：只覆盖 **dsh 主进程内**的网络调用（`isDshMain`）。工具 spawn 的子进程（如 bash 里跑
// curl）继承 NODE_OPTIONS 但 argv 不命中，故不受控——这是刻意的：boot 期的 pnpm/registry 安装
// 子进程必须放行；若未来 fixture 用子进程工具，另立 `REPLAY_NETWORK_OFFLINE_CHILDREN=1` 的
// 更严模式并给安装子进程豁免。DNS 面覆盖 lookup + resolve* + Resolver.prototype.*（含 promises）。
'use strict'

const net = require('node:net')
const dns = require('node:dns')
const { isDshMain, isLoopback } = require('./replay-network-offline-policy.cjs')

function offlineError(what, host) {
  const error = new Error(`replay-network-offline: ${what} ${host} blocked (A layer is keyless/offline)`)
  error.code = what === 'dns' ? 'ENOTFOUND' : 'ECONNREFUSED'
  return error
}

function install() {
  if (globalThis.__replayNetworkOfflineInstalled === true) return
  globalThis.__replayNetworkOfflineInstalled = true

  // DNS：外部主机名立即 ENOTFOUND（避免 lookup 自身挂住）。
  const realLookup = dns.lookup
  dns.lookup = function offlineLookup(hostname, options, callback) {
    if (isLoopback(hostname)) return realLookup.apply(dns, arguments)
    const cb = typeof options === 'function' ? options : callback
    process.nextTick(() => cb(offlineError('dns', hostname)))
  }
  if (dns.promises !== undefined) {
    const realPromiseLookup = dns.promises.lookup
    dns.promises.lookup = async function offlinePromiseLookup(hostname, options) {
      if (isLoopback(hostname)) return realPromiseLookup.call(dns.promises, hostname, options)
      throw offlineError('dns', hostname)
    }
  }

  // DNS 的 resolve* 一族（lookup 之外）：非 loopback 一律 ENOTFOUND，覆盖回调/promises/Resolver。
  const RESOLVE_NAMES = ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'resolveCaa']
  const rejectResolve = (name) => function offlineResolve(hostname, ...rest) {
    if (isLoopback(hostname)) return name.apply(this, [hostname, ...rest])
    const cb = rest[rest.length - 1]
    if (typeof cb === 'function') {
      process.nextTick(() => cb(offlineError('dns', hostname)))
      return
    }
    throw offlineError('dns', hostname)
  }
  for (const name of RESOLVE_NAMES) {
    const real = dns[name]
    if (typeof real === 'function') dns[name] = rejectResolve(real)
    const promiseFn = dns.promises?.[name]
    if (typeof promiseFn === 'function') {
      dns.promises[name] = async function offlinePromiseResolve(hostname, ...rest) {
        if (isLoopback(hostname)) return promiseFn.call(dns.promises, hostname, ...rest)
        throw offlineError('dns', hostname)
      }
    }
    const resolver = dns.Resolver?.prototype?.[name]
    if (typeof resolver === 'function') dns.Resolver.prototype[name] = rejectResolve(resolver)
  }

  // TCP/TLS：connect(options) 与 connect(port, host, cb) 两种形态；loopback / unix socket 放行。
  const realConnect = net.Socket.prototype.connect
  net.Socket.prototype.connect = function offlineConnect(...args) {
    const first = args[0]
    let host = 'localhost'
    if (typeof first === 'object' && first !== null) {
      if (first.path !== undefined) return realConnect.apply(this, args)
      host = typeof first.host === 'string' ? first.host : 'localhost'
    } else if (typeof first === 'number' && typeof args[1] === 'string') {
      host = args[1]
    }
    if (!isLoopback(host)) {
      process.nextTick(() => this.destroy(offlineError('connect', host)))
      return this
    }
    return realConnect.apply(this, args)
  }
}

// 只由显式环境变量开启，且只作用于 dsh 主进程：boot 会派生子进程（pnpm 安装、MCP、浏览器），
// 它们同样继承 NODE_OPTIONS；把离线闸套到安装子进程会挡住 registry，boot 直接超时。
if (process.env.REPLAY_NETWORK_OFFLINE === '1' && isDshMain()) install()

module.exports = { install }
