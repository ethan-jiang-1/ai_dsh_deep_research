#!/usr/bin/env node
// cold-start-smoke.mjs — L2 冷启动证据：独立 DSH_HOME + 独立 profile + 独立端口/状态根，
// 从 pack tarball 安装并起真 web，再用 run-driver 的浏览器面断言收口。
//
// 证明什么：不依赖仓内 runtime/harness-home 的既有 profile/凭据/会话，也不依赖默认
// 3083/research；包在干净 home 里能装、能起、浏览器面 GREEN。
// 不证明什么：不重跑 `pnpm install`/vendor 构建（bootstrap --check 只证前置在位）；
// 离线团队层/MCP 预置不在本 smoke 内（MCP 显式关闭，团队层需 registry 或预置）。
//
// 用法：source dev/env.sh && node scripts/smoke/cold-start-smoke.mjs
// 退出码：0 冷启动 GREEN / 1 红 / 2 未跑（前置缺席）
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reclaimPort } from '../lib/port-reclaim.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = process.env.COLD_START_PORT ?? '3129'
const PROFILE = 'cold-start-smoke'
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `cold-start-smoke-${process.pid}`)
const DEV_HOME = join(TEMP, 'home')
const STATE = join(TEMP, 'state')
const TIMEOUT_MS = 300_000

if (!process.env.DSH_HOME) {
  console.error('cold-start-smoke: 需要 DSH_HOME（先 source dev/env.sh；本 smoke 会把它覆盖为独立 home）')
  process.exit(2)
}
if (!existsSync(join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts'))) {
  console.error('cold-start-smoke: 机制基线源码不在位（vendor/dsh）——未跑 ≠ 通过')
  process.exit(2)
}

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(STATE, { recursive: true })

const env = {
  ...process.env,
  DSH_DEV_HOME: DEV_HOME,
  DSH_RUN_PROFILE: PROFILE,
  DSH_RUN_PORT: PORT,
  DSH_RUN_STATE_DIR: STATE,
  MCP_PLAYWRIGHT: '0',
}

let output = ''
const child = spawn(process.execPath, [join(ROOT, 'dev', 'run-driver.mjs'), 'up', '--bootstrap'], {
  cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', (chunk) => { output = (output + String(chunk)).slice(-64_000) })
child.stderr.on('data', (chunk) => { output = (output + String(chunk)).slice(-64_000) })

const result = await new Promise((resolveResult) => {
  const timer = setTimeout(() => {
    try { child.kill('SIGTERM') } catch {}
    resolveResult({ code: null, signal: 'timeout' })
  }, TIMEOUT_MS)
  child.once('error', (error) => { clearTimeout(timer); resolveResult({ code: null, error }) })
  child.once('close', (code, signal) => { clearTimeout(timer); resolveResult({ code, signal }) })
})

// 收尾：boot-run 是 run-driver 的 detached 子进程，杀进程组 + 按端口收割 + 删临时根。
const pidFile = join(STATE, 'run-driver.pid')
if (existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, 'utf8').trim())
  if (Number.isInteger(pid) && pid > 0) {
    try { process.kill(-pid, 'SIGTERM') } catch {}
  }
}
const leak = await reclaimPort(Number(PORT))
const verdictPath = join(STATE, 'run-driver-verdict.json')
let verdict = null
if (result.code === 0 && existsSync(verdictPath)) {
  try { verdict = JSON.parse(readFileSync(verdictPath, 'utf8')) } catch {}
}
const ok = result.code === 0 && verdict?.level === 'GREEN' && leak === null
if (!ok) {
  // 判红前先把现场搬出临时根再删（旧实现先 rm 再判红：红时盘上零证据，只剩 25 行 stdout 尾巴，
  // agent 无从知道哪条检查红、页面长什么样，只能复跑——而冷启动失败往往不复现）。保留 =
  // state/（run-driver-verdict.json / 截图 / web.log / boot.log）+ 完整输出。
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const keep = join(ROOT, 'runtime', 'smoke-workspace', `cold-start-fail-${stamp}`)
  try {
    mkdirSync(keep, { recursive: true })
    if (existsSync(STATE)) cpSync(STATE, join(keep, 'state'), { recursive: true, force: true })
    writeFileSync(join(keep, 'output.log'), output)
    console.error(`  现场已留：${keep}（state/verdict+截图+web.log；output.log 完整输出）`)
  } catch (error) {
    console.error(`  现场保留失败（继续判红）：${String(error?.message ?? error).slice(0, 200)}`)
  }
  rmSync(TEMP, { recursive: true, force: true })
  console.error('cold-start-smoke: 红')
  console.error(`  exit=${result.code} signal=${result.signal ?? '-'} verdict=${verdict?.level ?? '（无）'} port=${leak ?? '已释放'}`)
  console.error(output.split('\n').slice(-25).join('\n'))
  process.exit(1)
}
rmSync(TEMP, { recursive: true, force: true })
console.log('cold-start-smoke: GREEN（独立 home/profile/port/state；浏览器面可呈交）')
console.log(`  URL=${verdict.url} port=${PORT} profile=${PROFILE}`)
console.log('  边界：MCP 关闭；团队层来自 registry 或缓存；node_modules/vendor 构建由 bootstrap --check 证明在位')
process.exit(0)
