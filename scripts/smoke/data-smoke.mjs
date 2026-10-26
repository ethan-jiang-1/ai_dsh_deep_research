#!/usr/bin/env node
// data-smoke.mjs — T5 数据面的可跑切片（keyless，起真 web、无模型调用）。
//
// 证明：
//   ① 安装后 / 启动后包目录文件树 hash 不变（包目录不是数据目录）；
//   ⑤ 假 token 不出现在 stdout/stderr、home 文本文件与凭据文件（secret 不进日志）；
//   ⑥ 卸载后 workspace 用户文件保留、profile 无插件痕迹。
// 不证明（N/A，明确列出，不冒充）：
//   ② 双会话并发隔离 / ③ storage 重启持久 / ④ 模型可见重建——本包无 storage domain、
//      无新 session event、client 只读 workspaceFiles；没有可共享的宿主状态可测。
//
// 用法：node scripts/smoke/data-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过）
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'
import { scrubbedEnv } from '../lib/env.mjs'
import { reclaimPort } from '../lib/port-reclaim.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BIN = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `data-smoke-${process.pid}`)
const HOME = join(TEMP, 'home')
const PROFILE = 'data-smoke'
const WS = join(TEMP, 'ws')
const PORT = '3141'
const FAKE_KEY = 'sk-data-smoke-FAKE-DO-NOT-USE-7f3c9a'
const INSTALLED = join(HOME, 'profiles', PROFILE, 'node_modules', 'dsh-deep-research-pack')
const CREDENTIALS = join(HOME, '.credentials' + '.yaml')

const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const env = () => scrubbedEnv({ DSH_HOME: HOME })
const dsh = (args) => spawnSync(process.execPath, ['--import', 'tsx/esm', BIN, ...args], {
  cwd: ROOT, encoding: 'utf8', env: env(),
})

function treeHash(dir) {
  const rows = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) rows.push(`${relative(dir, full)}\0${sha256(readFileSync(full))}`)
    }
  }
  walk(dir)
  return sha256(rows.join('\n'))
}

function textFiles(dir) {
  const out = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') walk(full)
      } else if (entry.isFile() && statSync(full).size < 2_000_000) {
        try {
          const text = readFileSync(full, 'utf8')
          if (!text.includes('\0')) out.push({ path: full, text })
        } catch {}
      }
    }
  }
  walk(dir)
  return out
}

const findSessionDir = (home, sessionId) => {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return null
  for (const group of readdirSync(root)) {
    const dir = join(root, group, sessionId)
    if (existsSync(dir)) return dir
  }
  return null
}

const waitFor = (child, pattern, timeoutMs) => new Promise((resolveWait) => {
  let output = ''
  const timer = setTimeout(() => { resolveWait({ ok: false, output, why: 'timeout' }) }, timeoutMs)
  const onData = (chunk) => {
    output = (output + String(chunk)).slice(-128_000)
    if (pattern.test(output)) { clearTimeout(timer); resolveWait({ ok: true, output }) }
  }
  child.stdout.on('data', onData); child.stderr.on('data', onData)
  child.once('exit', (code) => { clearTimeout(timer); resolveWait({ ok: false, output, why: `exit ${code}` }) })
})

if (!existsSync(BIN)) { console.error('data-smoke: vendor/dsh 源码不在位——未跑 ≠ 通过'); process.exit(2) }
if (!existsSync(TARBALL)) { console.error(`data-smoke: tarball 缺席（${TARBALL}）——先 node scripts/dist/export-dist.mjs`); process.exit(2) }

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
let child = null
try {
  check(dsh(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-config']).status === 0, '干净 profile 初始化')
  check(dsh(['plugin', '--profile', PROFILE, 'add', `file:${TARBALL}`]).status === 0, '安装 pack tarball')
  const scaffold = spawnSync(process.execPath, [
    join(INSTALLED, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', WS,
    '--profile', PROFILE, '--host', join(HOME, 'profiles', PROFILE),
  ], { encoding: 'utf8', env: env() })
  check(scaffold.status === 0 && existsSync(join(WS, 'AGENTS.md')), 'scaffold 铺工作区种子', (scaffold.stderr || '').slice(-300))

  // 用户数据标记：卸载后必须保留。
  writeFileSync(join(WS, 'AGENTS.md'), '# data-smoke user marker\n')
  writeFileSync(join(WS, 'method-library.md'), '# data-smoke user library\n')
  const before = treeHash(INSTALLED)

  child = spawn(process.execPath, ['--import', 'tsx/esm', BIN, '--profile', PROFILE, '--', '--port', PORT, '--no-open'], {
    cwd: ROOT,
    env: scrubbedEnv({ DSH_HOME: HOME, DEEPSEEK_API_KEY: FAKE_KEY, MCP_PLAYWRIGHT: '0' }),
    detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const boot = await waitFor(child, /dsh web: http:\/\/127\.0\.0\.1:\d+/, 90_000)
  check(boot.ok, 'web 启动出横幅', boot.why ?? '')
  const token = /token=([^&\s]+)/.exec(boot.output)?.[1] ?? null
  let sessionDir = null
  if (token !== null) {
    const kick = spawnSync(process.execPath, [join(ROOT, 'dev', 'run-kickoff.mjs'), '--port', PORT, '--token', token], {
      cwd: ROOT, encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME, DSH_RUN_WORKSPACE: WS }), timeout: 120_000,
    })
    const sessionId = (kick.stdout ?? '').trim().split('\n').filter(Boolean).at(-1) ?? ''
    check(kick.status === 0 && sessionId.length > 0, '建真实会话（卸载前）', (kick.stderr || '').slice(-300))
    for (let i = 0; i < 20 && sessionDir === null; i++) {
      sessionDir = findSessionDir(HOME, sessionId)
      if (sessionDir === null) await new Promise((r) => setTimeout(r, 250))
    }
    check(sessionDir !== null, '会话日志落在 home', sessionId)
  } else {
    check(false, '从启动横幅取 token')
  }
  try { process.kill(-child.pid, 'SIGTERM') } catch { try { child.kill('SIGTERM') } catch {} }
  const leak = await reclaimPort(Number(PORT))
  check(leak === null, '端口释放', leak ?? '')
  const after = treeHash(INSTALLED)
  check(before === after, '包目录启动前后零写入（文件树 hash 相同）', `${before.slice(0, 8)} → ${after.slice(0, 8)}`)

  const leaks = [...textFiles(HOME), ...textFiles(TEMP)].filter(({ text }) => text.includes(FAKE_KEY))
  check(leaks.length === 0, '假 token 不在 stdout/stderr/home 文本/凭据文件', leaks.map((l) => l.path).slice(0, 3).join('、'))
  check(!existsSync(CREDENTIALS) || !readFileSync(CREDENTIALS, 'utf8').includes(FAKE_KEY),
    '凭据文件不含假 token')

  check(dsh(['plugin', '--profile', PROFILE, 'remove', 'dsh-deep-research-pack']).status === 0, '卸载 pack')
  const profileManifest = JSON.parse(readFileSync(join(HOME, 'profiles', PROFILE, 'package.json'), 'utf8'))
  check(!existsSync(INSTALLED) && !(profileManifest?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'),
    '卸载后安装副本与 bundles 无插件痕迹')
  check(readFileSync(join(WS, 'AGENTS.md'), 'utf8') === '# data-smoke user marker\n'
    && readFileSync(join(WS, 'method-library.md'), 'utf8') === '# data-smoke user library\n',
    '卸载后 workspace 用户文件保留')
  check(sessionDir !== null && existsSync(sessionDir), '卸载后 session 日志保留')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  if (child !== null) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  rmSync(TEMP, { recursive: true, force: true })
}

console.log('\nN/A（无宿主状态可测，显式列出）：双会话隔离 / storage 重启持久 / 模型可见重建——本包无 storage domain、无新 session event、client 只读 workspaceFiles。')
if (failures.length > 0) {
  console.error(`\ndata-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('data-smoke: ALL PASS（T5 的包目录零写入 / secret / 卸载保留切片）')
process.exit(0)
