// web-harness.mjs — DSH web 冒烟族共用的**启停与通道**单一正本（keyless；子进程 + fetch）。
//
// 为什么存在（2026-10-16 结构收敛 round3 §B）：`web_fetch` 之外，冒烟族里"起真 web → 等启动横幅
// 拿 token → token 换 cookie → 打 `client-request` RPC"这段在 7 个站点里近重复（约 500 行），
// 而它恰恰集中在真模型档脚本里——口径一漂，红的解释就各说各话。本件收**唯一正本**。
//
// ⚠ **参数保形**是硬约束：各站点的差异一律参数化，不合并、不取中间值。留在站点侧的（不许进本件）：
//   · **端口**：各站点自持（`port-exclusive` 门禁；本件不给缺省端口）；
//   · **超时与截断**：boot 超时、横幅失败时输出的尾部字符数、RPC 的 AbortSignal 预算；
//   · **失败收割**：preset-smoke 失败时组杀 + 回收端口、snapshot-replay 自持 cleanup 与
//     "释放到静默"等待——本件只负责"横幅失败即 reject"，收割语义留调用方（各站点判据的载重墙）；
//   · **boot 环境**：`withModelKey` / `scrubbedEnv` 由调用方构造后传入（凭据卫生的 owner 是站点）。
//
// 消费方：scripts/smoke/preset-smoke.mjs（首批）；client-load-smoke / snapshot-replay-smoke 随后
// 逐站点迁移（每站点独立 diff，单站点红只回滚该站点）。

import { spawn } from 'node:child_process'

/** 启动横幅里的 token URL——各站点同一形态（boot 输出一行 `http://127.0.0.1:<port>/?token=…`）。 */
const bannerRe = (port) => new RegExp(`http://127\\.0\\.0\\.1:${port}/\\?token=(\\S+)`)

/**
 * 起真 web 并等启动横幅。
 *
 * @param {object} o
 * @param {string} o.bin        CLI 入口（`vendor/dsh/apps/cli/src/bin.ts`）
 * @param {string} o.cwd        boot 的 cwd（源码域 = 本仓根 / vendor 根）
 * @param {string} o.profile    `--profile <name>`
 * @param {string|null} o.patchPath  `--patch <path>`（null = 不加）
 * @param {number} o.port       **必填**（端口 owner = 各站点；本件不设缺省）
 * @param {object} o.env        子进程环境（调用方构造：withModelKey / scrubbedEnv）
 * @param {number} o.timeoutMs  等横幅超时
 * @param {number} o.tailChars  失败信息里附的输出尾部字符数（各站点原值）
 * @param {string[]} [o.extraArgs]  `--` 之后的额外参数（各站点自持）
 * @returns {Promise<{child: import('node:child_process').ChildProcess, token: string}>}
 *          横幅失败 → reject（收割留调用方；见文件头注）。
 */
export function bootWeb({ bin, cwd, profile, patchPath = null, port, env, timeoutMs, tailChars, extraArgs = [] }) {
  if (typeof port !== 'number' || !Number.isInteger(port)) throw new TypeError('bootWeb: port 必填且为整数（端口 owner = 调用站点）')
  const argv = ['--import', 'tsx/esm', bin, '--profile', profile]
  if (patchPath !== null) argv.push('--patch', patchPath)
  argv.push('--', '--port', String(port), '--no-open', ...extraArgs)
  // detached = 组长（2026-09-26 实测）：web 会再派生子进程（真正的服务进程），SIGTERM 直杀只达直接
  // 子进程、孙进程成孤儿占住端口——组长模式让调用方能整组收割（process.kill(-pid)）。
  const child = spawn(process.execPath, argv, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
  let output = ''
  const banner = new Promise((resolve, reject) => {
    const onData = (chunk) => {
      output += String(chunk)
      const m = bannerRe(port).exec(output)
      if (m !== null) resolve({ token: m[1] })
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => reject(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-tailChars)}`)))
    setTimeout(() => reject(new Error(`等待启动横幅超时\n${output.slice(-tailChars)}`)), timeoutMs)
  })
  return banner.then(({ token }) => ({ child, token, output: () => output }))
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
 *   · `timeoutMs`：给了才挂 `AbortSignal.timeout`（原仅 preset-smoke 有）；
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
