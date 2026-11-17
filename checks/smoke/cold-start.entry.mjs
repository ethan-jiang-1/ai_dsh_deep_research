#!/usr/bin/env node
// cold-start.entry.mjs — L2 干净室冷启动（BUG-233 / 234 / 235 的同一矩阵）。
//
// 干净室判据（checks/lib/harness/clean-room.mjs）：
//   home  = 仓外 mkdtemp（不在仓库祖先链上）
//   DSH   = vendor 钉版（`dsh --version ∈ engines.dsh`）；显式 `--global-dsh` 才用 PATH
//   pack  = `_dist` tarball 真实 `plugin add`（不是 run-driver 的源树）
//   解析  = 从 home 起解析，不得落到仓根 node_modules（缺失 peer 不能被仓内依赖补齐）
// 证明什么：用户拿到 tarball + 一个合同内的 DSH，能在干净 home 里装、起 web、换到 token。
// 不证明什么：浏览器面（归 client-load.entry 真浏览器档）、模型行为、团队层/MCP 预置。
//
// 前置：`_dist` 有本版本 tarball（先 node tools/release/export-dist.mjs）；vendor/dsh 在位。
// 用法：node checks/smoke/cold-start.entry.mjs [--global-dsh]
// 退出码：0 GREEN / 1 红 / 2 未跑（前置缺席）
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { authenticate } from '../lib/shared/web-harness.mjs'
import { reclaimPort } from '../lib/harness/port-reclaim.mjs'
import {
  cleanHome, engineIssues, initWebProfile, installTarball, moduleLeakOf, pinnedDshBin, startWeb, stopWeb,
} from '../lib/harness/clean-room.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const PORT = Number(process.env.COLD_START_PORT ?? '3129')
const PROFILE = 'cold-start'
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const tarball = process.env.PACK_TARBALL ?? join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)

const notRun = (reason) => { console.error(`cold-start.entry: NOT-RUN — ${reason}`); process.exit(2) }
const fail = (reason) => { console.error(`cold-start.entry: 红 — ${reason}`); process.exit(1) }

if (!existsSync(tarball)) notRun(`tarball 缺席：${tarball}（先 node tools/release/export-dist.mjs）`)
const globalDsh = process.argv.includes('--global-dsh')
const dsh = process.env.DSH_BIN ?? (globalDsh ? 'dsh' : pinnedDshBin(ROOT))
if (dsh === null) notRun('vendor 钉版 dsh 缺席（vendor/dsh 未初始化）；或用 --global-dsh / DSH_BIN')
const engine = engineIssues(ROOT, dsh, pkg, { cwd: ROOT })
if (engine.length > 0) notRun(engine.join('；'))

const home = cleanHome(ROOT, 'dsh-cold-start')
let web = null
let exitCode = 1
try {
  const init = initWebProfile({ bin: dsh, home, profile: PROFILE, cwd: ROOT })
  if (init.status !== 0) fail(`profile 初始化失败（web 模板）：\n${init.output.split('\n').slice(-12).join('\n')}`)
  const install = installTarball({ bin: dsh, home, profile: PROFILE, tarball, cwd: ROOT })
  if (install.status !== 0) fail(`plugin add 失败：\n${install.output.split('\n').slice(-12).join('\n')}`)
  const installed = join(home, 'profiles', PROFILE, 'node_modules', 'dsh-deep-research-pack')
  if (!existsSync(join(installed, 'presets', 'lead.patch.yml'))) fail(`安装副本缺 presets（${installed}）`)
  const leaks = moduleLeakOf({ home, root: ROOT, names: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'] })
  if (leaks.length > 0) fail(`依赖解析落到仓根 node_modules（不是干净室）：${leaks.join('；')}`)

  // 先收割端口，避免上一轮残留把「起不来」误判成「装坏了」。
  const leftover = await reclaimPort(PORT)
  if (leftover !== null) fail(`端口 ${PORT} 上有残留监听（${leftover}）——先收干净再跑`)
  web = await startWeb({ bin: dsh, home, profile: PROFILE, port: PORT, cwd: ROOT, timeoutMs: 180_000 })
  const url = new URL(web.url)
  const token = url.searchParams.get('token')
  const cookie = await authenticate(url.origin, token)
  const response = await fetch(url.origin, { headers: { cookie }, signal: AbortSignal.timeout(5000) })
  if (!response.ok) fail(`干净室 web 首页 HTTP ${response.status}`)
  console.log(`cold-start.entry: GREEN（仓外 home + 钉版 DSH ${pkg.engines.dsh} + tarball 安装）`)
  console.log(`  URL=${web.url} profile=${PROFILE}`)
  console.log('  边界：浏览器面归 client-load.entry；团队层/MCP 预置不在本 smoke 内')
  exitCode = 0
} catch (error) {
  console.error(`cold-start.entry: 红 — ${String(error?.message ?? error).split('\n').slice(0, 12).join('\n')}`)
  exitCode = 1
} finally {
  await stopWeb(web?.child)
  await reclaimPort(PORT)
  rmSync(home, { recursive: true, force: true })
}
process.exit(exitCode)
