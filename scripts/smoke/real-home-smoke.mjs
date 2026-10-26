#!/usr/bin/env node
// real-home-smoke.mjs — 真用户环境的安装验收（keyless；需全局 dsh + _dist tarball）。
//
// 为什么需要：仓库内 home 会被 node_modules 向上解析污染，preflight 曾在真用户 home 上
// 误报 17 个 peer 缺失。本冒烟把 home 放在系统临时目录（仓库外），用全局 dsh 完成
// init → plugin add → scaffold → preflight，并真起 web 检查 boot graph 含本包。
//
// 证明：真实安装形状 + preflight 不再假红 + 页面能拿到本包 client 行。
// 不证明：模型就绪（--install-only）、其他 OS、Desktop。
// 前置缺席（exit 2）：全局 dsh 不可用、_dist tarball 缺席、全局安装里找不到团队层。
//
// 用法：node scripts/smoke/real-home-smoke.mjs
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'
import { reclaimPort } from '../lib/port-reclaim.mjs'
import { inferInstallAnchor } from '../../packages/deep-research-pack/scripts/lib/install-anchor.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
const PORT = 3155
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

const dshVersion = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
if (dshVersion.status !== 0 || dshVersion.error !== undefined) {
  console.error('real-home-smoke: 全局 dsh 不可用——未跑 ≠ 通过')
  process.exit(2)
}
if (!existsSync(TARBALL)) {
  console.error(`real-home-smoke: tarball 缺席（${TARBALL}）——先 node scripts/dist/export-dist.mjs`)
  process.exit(2)
}
let anchor = null
try { anchor = inferInstallAnchor() } catch { anchor = null }
if (anchor === null) {
  console.error('real-home-smoke: 无法从 PATH 的 dsh 解析安装锚——未跑 ≠ 通过')
  process.exit(2)
}
const teamPath = join(dirname(anchor.path), 'node_modules', ...TEAM.split('/'))
if (!existsSync(join(teamPath, 'package.json'))) {
  console.error(`real-home-smoke: 全局安装里找不到团队层（${teamPath}）——先装 ${TEAM}`)
  process.exit(2)
}

const root = mkdtempSync(join(tmpdir(), 'dsh-real-home-'))
const home = join(root, 'dshhome')
const ws = join(root, 'ws')
const profile = join(home, 'profiles', 'research')
const installed = join(profile, 'node_modules', 'dsh-deep-research-pack')
const env = (extra = {}) => scrubbedEnv({ DSH_HOME: home, MCP_PLAYWRIGHT: '0', ...extra })
const dsh = (args, extra = {}) => spawnSync('dsh', args, { encoding: 'utf8', env: env(extra), timeout: 180_000 })
let web = null
const waitForBanner = (child, timeoutMs) => new Promise((resolveWait) => {
  let output = ''
  const timer = setTimeout(() => resolveWait({ ok: false, output, why: 'timeout' }), timeoutMs)
  const onData = (chunk) => {
    output = (output + String(chunk)).slice(-128_000)
    const match = /dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/.exec(output)
    if (match !== null) { clearTimeout(timer); resolveWait({ ok: true, output, url: match[1] }) }
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  child.once('exit', (code) => { clearTimeout(timer); resolveWait({ ok: false, output, why: `exit ${code}` }) })
})

try {
  const init = dsh(['--profile', 'research', '--from-default-profile', 'web', '--dump-config'])
  check(init.status === 0, '真用户 home：初始化 web profile', tail(init))
  const add = dsh(['plugin', '--profile', 'research', 'add', `file:${TARBALL}`])
  check(add.status === 0, '真用户 home：安装 tarball', tail(add))
  const team = dsh(['plugin', '--profile', 'research', 'add', `link:${teamPath}`])
  check(team.status === 0, '真用户 home：安装团队层（本地 link）', tail(team))

  const scaffold = spawnSync(process.execPath, [
    join(installed, 'scripts', 'scaffold.mjs'), '--install-only',
    '--workspace', ws, '--profile', 'research', '--host', profile,
  ], { encoding: 'utf8', env: env(), timeout: 180_000 })
  check(scaffold.status === 0, '真用户 home：scaffold --install-only 绿',
    `${scaffold.status}\n${(scaffold.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | ')}`)
  check(/preflight: 安装验收通过/.test(scaffold.stdout || ''), 'scaffold 收尾 preflight 通过')
  const manifestAfterFirst = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
  check(String(manifestAfterFirst.dependencies?.[TEAM] ?? '').startsWith('link:'),
    'scaffold 不改写已在场的团队层 link 来源', String(manifestAfterFirst.dependencies?.[TEAM]))
  const scaffoldAgain = spawnSync(process.execPath, [
    join(installed, 'scripts', 'scaffold.mjs'), '--install-only',
    '--workspace', ws, '--profile', 'research', '--host', profile,
  ], { encoding: 'utf8', env: env(), timeout: 180_000 })
  const manifestAfterSecond = JSON.parse(readFileSync(join(profile, 'package.json'), 'utf8'))
  check(scaffoldAgain.status === 0 && String(manifestAfterSecond.dependencies?.[TEAM] ?? '') === String(manifestAfterFirst.dependencies?.[TEAM] ?? ''),
    'scaffold 重跑幂等（团队层来源不变）', `${scaffoldAgain.status} ${String(manifestAfterSecond.dependencies?.[TEAM])}`)

  const preflight = spawnSync(process.execPath, [
    join(installed, 'scripts', 'preflight.mjs'), '--install-only',
    '--workspace', ws, '--host', profile,
  ], { encoding: 'utf8', env: env(), timeout: 120_000 })
  check(preflight.status === 0, '真用户 home：preflight 不再假红',
    `${preflight.status}\n${(preflight.stdout || '').split('\n').filter((line) => line.includes('✗')).join(' | ')}`)
  check(!/平台行依赖[\s\S]{0,200}缺/.test(preflight.stdout || ''), '真用户 home：行依赖全部从安装锚解析')

  web = spawn('dsh', ['--profile', 'research', '--', '--port', String(PORT), '--no-open'], {
    env: env(), detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const boot = await waitForBanner(web, 90_000)
  check(boot.ok, '真用户 home：web 启动出横幅', boot.why ?? '')
  if (boot.ok) {
    const token = new URL(boot.url).searchParams.get('token')
    const tokenResponse = await fetch(boot.url, { redirect: 'manual' })
    const cookie = (tokenResponse.headers.getSetCookie?.() ?? []).map((line) => line.split(';')[0]).join('; ')
    const page = await fetch(`http://127.0.0.1:${PORT}/`, { headers: { cookie } })
    const html = await page.text()
    check(page.status === 200, '真用户 home：认证后页面 200', String(page.status))
    check(html.includes('dsh-deep-research-pack'), '真用户 home：boot graph 含本包 client 行')
    check(html.includes('dsh-client-ui-primitives'), '真用户 home：模块表含 primitives（shell 提供）')
    void token
  }
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  if (web !== null) {
    try { process.kill(-web.pid, 'SIGTERM') } catch { try { web.kill('SIGTERM') } catch {} }
    await new Promise((r) => setTimeout(r, 1500))
    try { process.kill(-web.pid, 'SIGKILL') } catch {}
    const leak = await reclaimPort(PORT)
    check(leak === null, '端口释放', leak ?? '')
  }
  if (failures.length === 0) {
    rmSync(root, { recursive: true, force: true })
  } else {
    console.error(`\nreal-home-smoke: 失败现场保留：${root}`)
  }
}

function tail(result) {
  return `${result.status}\n${(result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' | ')}`
}

if (failures.length > 0) {
  console.error(`\nreal-home-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('real-home-smoke: ALL PASS（仓库外 home 的真安装形状 + 页面 boot graph）')
process.exit(0)
