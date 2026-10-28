#!/usr/bin/env node
// workspace-isolation-smoke.mjs — B4 双实例隔离证据（keyless，真 web，不调用模型）。
//
// 证明什么：两套完全独立的 DSH_DEV_HOME/profile/port/state/workspace 各自起通道、各自建会话；
// 会话日志的 cwd 绑定自己的 workspace，home 的 sessions 互不出现对方 session，workspace 的
// 用户 marker 互不可见。证明的是“接线与绑定”，不是“模型/工具被诱导后不能读别的路径”。
//
// 不证明什么：不跑模型、不证明沙箱内任意路径读取；L4 行为面另测。
// 用法：source dev/env.sh && node scripts/smoke/workspace-isolation-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过）
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'
import { reclaimPort } from '../lib/port-reclaim.mjs'
import { readSessionText, resolveSessionLog } from '../lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `workspace-isolation-${process.pid}`)
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}

if (!process.env.DSH_HOME) { console.error('workspace-isolation-smoke: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2) }
if (!existsSync(join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts'))) { console.error('workspace-isolation-smoke: vendor/dsh 不在位——未跑 ≠ 通过'); process.exit(2) }

const instance = (id, port) => ({
  id, port,
  home: join(TEMP, `home-${id}`),
  state: join(TEMP, `state-${id}`),
  ws: join(TEMP, `ws-${id}`),
  profile: `isolation-${id}`,
})

function findSessionDir(home, sessionId) {
  const root = join(home, 'sessions')
  if (!existsSync(root)) return null
  for (const group of readdirSync(root)) {
    const dir = join(root, group, sessionId)
    if (existsSync(dir)) return dir
  }
  return null
}

async function stop(inst) {
  const pidPath = join(inst.state, 'run-driver.pid')
  if (existsSync(pidPath)) {
    const pid = Number(readFileSync(pidPath, 'utf8').trim())
    if (Number.isInteger(pid) && pid > 0) { try { process.kill(-pid, 'SIGTERM') } catch {} }
  }
  return reclaimPort(inst.port)
}

const envFor = (inst) => scrubbedEnv({
  DSH_DEV_HOME: inst.home,
  DSH_RUN_PROFILE: inst.profile,
  DSH_RUN_PORT: String(inst.port),
  DSH_RUN_STATE_DIR: inst.state,
  DSH_RUN_WORKSPACE: inst.ws,
  MCP_PLAYWRIGHT: '0',
})

rmSync(TEMP, { recursive: true, force: true })
const started = []
try {
  for (const inst of [instance('a', 3151), instance('b', 3152)]) {
    mkdirSync(inst.home, { recursive: true })
    mkdirSync(inst.state, { recursive: true })
    mkdirSync(inst.ws, { recursive: true })
    writeFileSync(join(inst.ws, `only-${inst.id}.txt`), `workspace-${inst.id}\n`)

    const driver = spawnSync(process.execPath, [join(ROOT, 'dev', 'run-driver.mjs'), 'up', '--bootstrap'], {
      cwd: ROOT, encoding: 'utf8', env: envFor(inst), timeout: 300_000,
    })
    const verdictPath = join(inst.state, 'run-driver-verdict.json')
    let verdict = null
    try { verdict = JSON.parse(readFileSync(verdictPath, 'utf8')) } catch {}
    check(driver.status === 0 && verdict?.level === 'GREEN', `${inst.id} 独立通道 GREEN`, (driver.stderr || driver.stdout || '').slice(-400))
    if (driver.status !== 0 || verdict?.level !== 'GREEN') continue
    started.push(inst)

    let token = null
    try { token = new URL(verdict.url).searchParams.get('token') } catch {}
    check(typeof token === 'string' && token.length > 0, `${inst.id} 从 verdict 取 token`)
    const kick = spawnSync(process.execPath, [join(ROOT, 'dev', 'run-kickoff.mjs'), '--port', String(inst.port), '--token', token], {
      cwd: ROOT, encoding: 'utf8', env: { ...envFor(inst), DSH_HOME: inst.home }, timeout: 120_000,
    })
    const sessionId = (kick.stdout ?? '').trim().split('\n').filter(Boolean).at(-1) ?? ''
    check(kick.status === 0 && /^[0-9A-Za-z_-]{8,}$/.test(sessionId), `${inst.id} 建会话`, (kick.stderr || '').slice(-400))
    inst.sessionId = sessionId
    let dir = null
    for (let i = 0; i < 20 && dir === null; i++) {
      dir = findSessionDir(inst.home, sessionId)
      if (dir === null) await new Promise((r) => setTimeout(r, 250))
    }
    check(dir !== null, `${inst.id} 会话日志落在自己的 home`, sessionId)
    if (dir !== null) {
      const group = relative(join(inst.home, 'sessions'), dirname(dir))
      const log = resolveSessionLog(dir)
      const text = log === null ? null : readSessionText(log)
      check(group.includes(`ws-${inst.id}`), `${inst.id} 会话目录组绑定自己的 workspace`, group)
      inst.group = group
      inst.logText = text
    }
    check((await stop(inst)) === null, `${inst.id} 端口释放`)
  }

  const a = started.find((i) => i.id === 'a')
  const b = started.find((i) => i.id === 'b')
  if (a !== undefined && b !== undefined && a.sessionId && b.sessionId) {
    check(findSessionDir(a.home, b.sessionId) === null, 'A home 不出现 B session')
    check(findSessionDir(b.home, a.sessionId) === null, 'B home 不出现 A session')
    check(a.logText?.includes(b.ws) !== true && b.logText?.includes(a.ws) !== true, '会话日志不引用对方 workspace')
    check(!existsSync(join(a.ws, 'only-b.txt')) && !existsSync(join(b.ws, 'only-a.txt')), 'workspace marker 互不可见')
  }
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  for (const inst of started) await stop(inst)
  rmSync(TEMP, { recursive: true, force: true })
}

console.log('\n边界：证明接线/绑定（独立 home/profile/port/state/workspace + 会话 cwd）；不证明模型/工具在沙箱内不能读别的路径，后者由 L4/沙箱面另测。')
if (failures.length > 0) {
  console.error(`\nworkspace-isolation-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('workspace-isolation-smoke: ALL PASS（两套 W/H 的会话绑定与互斥）')
process.exit(0)
