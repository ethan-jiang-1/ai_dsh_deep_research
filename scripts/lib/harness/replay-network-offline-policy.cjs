// replay-network-offline-policy.cjs — 回放离线闸的纯判据（无 node:net/dns 依赖，测试可直引）。
'use strict'

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '0.0.0.0', '[::1]'])

/** loopback / 本机地址 → true；外部主机名/IP → false。空值按 localhost（net 缺省）。 */
function isLoopback(host) {
  if (typeof host !== 'string' || host === '') return true
  const value = host.trim().toLowerCase()
  if (LOOPBACK.has(value)) return true
  return value.startsWith('127.') || value.endsWith('.localhost')
}

/** 只有 dsh 主进程才安装离线闸：boot 子进程（pnpm/MCP/浏览器）继承 NODE_OPTIONS，不得被拦。 */
function isDshMain(argv = process.argv) {
  return argv.some((arg) => /apps[\\/]cli[\\/](?:src[\\/]bin\.ts|lib[\\/]bin\.js)$/.test(arg))
}

module.exports = { isLoopback, isDshMain }
