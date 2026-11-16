// web-harness.mjs — DSH web 冒烟族共用的**启停与通道**单一正本（keyless；子进程 + fetch）。
//
// 为什么存在（2026-10-16 结构收敛 round3 §B）：`web_fetch` 之外，冒烟族里"起真 web → 等启动横幅
// 拿 token → token 换 cookie → 打 `client-request` RPC"这段在 7 个站点里近重复（约 500 行），
// 而它恰恰集中在真模型档脚本里——口径一漂，红的解释就各说各话。本件收**唯一正本**。
//
// ⚠ **参数保形**是硬约束：各站点的差异一律参数化，不合并、不取中间值。留在站点侧的（不许进本件）：
//   · **端口**：各站点自持（`port-exclusive` 门禁；本件不给缺省端口）；
//   · **超时与截断**：boot 超时、横幅失败时输出的尾部字符数、RPC 的 AbortSignal 预算；
//   · **失败收割**：preset.e2e 失败时组杀 + 回收端口、snapshot-replay 自持 cleanup 与
//     "释放到静默"等待——本件只负责"横幅失败即 reject"，收割语义留调用方（各站点判据的载重墙）；
//   · **boot 环境**：`withModelKey` / `scrubbedEnv` 由调用方构造后传入（凭据卫生的 owner 是站点）。
//
// 消费方：checks/smoke/preset.e2e.mjs（首批）；client-load.entry / snapshot-replay.entry 随后
// 逐站点迁移（每站点独立 diff，单站点红只回滚该站点）。

import { spawn } from 'node:child_process'
import { waitForWebBanner } from './web-banner.mjs'

export function bootWeb({ bin, cwd, profile, patchPath = null, port, env, timeoutMs, tailChars, extraArgs = [], detached = true }) {
  if (typeof port !== 'number' || !Number.isInteger(port)) throw new TypeError('bootWeb: port 必填且为整数（端口 owner = 调用站点）')
  const argv = ['--import', 'tsx/esm', bin, '--profile', profile]
  if (patchPath !== null) argv.push('--patch', patchPath)
  argv.push('--', '--port', String(port), '--no-open', ...extraArgs)
  // detached 由调用方给（默认组长）：web 会再派生子进程（真正的服务进程），SIGTERM 直杀只达直接
  // 子进程、孙进程成孤儿占住端口——组长模式让调用方能整组收割（process.kill(-pid)）；**没有这一
  // 需求的站点必须显式 false**（保形：改了进程组就改了 Ctrl-C 与孤儿回收的行为）。
  const child = spawn(process.execPath, argv, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], detached })
  return waitForWebBanner(child, { port, profile, timeoutMs, tailChars }).then(({ token, output }) => ({ child, token, output }))
}

/**
 * token → cookie（`redirect: 'manual'` 抓 Set-Cookie；多个 cookie 拼成一条 header）。
 * 各站点原签名不一（`(port, token)` / `(base, token)`）——统一为 `(base, token)` 的等价改写。
 */
export async function authenticate(base, token) {
  const response = await fetch(`${base}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没有拿到 cookie')
  return cookies.map((c) => c.split(';')[0]).join('; ')
}

/**
 * 造 `client-request` RPC 调用器。各站点差异全部参数化（**原值**）：
 *   · `prefix`：rpcId 前缀（`smoke-` / `cls-` / `snap-` …）；
 *   · `timeoutMs`：给了才挂 `AbortSignal.timeout`（原仅 preset.e2e 有）；
 *   · `errorOf(endpoint, body)`：失败信息拼法（各站点文案与截断长度不同——逐字保形）。
 */
export function makeRpc({ prefix, timeoutMs = null, errorOf }) {
  if (typeof errorOf !== 'function') throw new TypeError('makeRpc: errorOf 必填（失败文案 owner = 调用站点）')
  let seq = 0
  return async (base, cookie, endpoint, args) => {
    const init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `${prefix}${++seq}`, method: endpoint, payload: { args } }),
    }
    if (timeoutMs !== null) init.signal = AbortSignal.timeout(timeoutMs)
    const response = await fetch(`${base}/api/${endpoint}`, init)
    const body = await response.json()
    if (body?.result?.ok !== true) throw new Error(errorOf(endpoint, body))
    return body.result.value
  }
}
