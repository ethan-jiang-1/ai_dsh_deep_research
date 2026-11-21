#!/usr/bin/env node
// One owner for both public launch paths. A crash retains its locks for offline recovery.
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, realpathSync, writeFileSync, writeSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'
import { acquireStartLock } from '../../checks/lib/channel/start-lock.mjs'
import { sandboxAvailability } from '../../checks/lib/shared/sandbox-capability.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const generation = randomUUID()
const env = { ...process.env }
const SANDBOX_AVAILABLE = probeSandbox()
if (SANDBOX_AVAILABLE === false) env.DSH_SANDBOX_UNAVAILABLE = '1'
// 嵌套沙箱探测（BUG-349）：跑在已沙箱化的进程里时，workflow 的 sandbox-exec 二次 apply 会 EPERM。
// 探测结果只进 env/诊断：内容注入据此告诉模型不要承诺脚本层扇出（不改 vendor、不假装已执行）。
function probeSandbox() {
  if (process.platform !== 'darwin') return null
  const result = spawnSync('/usr/bin/sandbox-exec', ['-p', '(version 1)', '/usr/bin/true'], { encoding: 'utf8', timeout: 1000 })
  return sandboxAvailability({ platform: process.platform, status: result.status, errorCode: result.error?.code })
}
const argv = process.argv.slice(2)
const background = argv.includes('--background')
const args = argv.filter(arg => arg !== '--background')
const modes = new Set(['--prepare-profile', '--drift-check', '--drift-only'])
const mode = args[0] ?? 'serve'
const locks = []
let child = null
let closed = null
let logFd = null
let stopping = null
let handedOff = false
let ready = false
let startupTimer = null
let handoffTimer = null
let outputTail = ''
let childClosed = false
let requestedExit = null

function send(type, detail = {}) {
  return new Promise(resolveSend => {
    if (!process.connected || typeof process.send !== 'function') return resolveSend(false)
    try { process.send({ type, generation, ...detail }, error => resolveSend(!error)) }
    catch { resolveSend(false) }
  })
}

function safeDiagnostic(message) {
  const line = `${message}\n`
  // Background stderr is detached; retain supervisor failures in its owned log.
  if (logFd !== null) {
    try { writeSync(logFd, line) } catch { /* Still attempt the foreground diagnostic. */ }
  }
  try { process.stderr.write(line, () => {}) } catch { /* A closed parent pipe cannot block cleanup. */ }
}

function fail(message, exit = 1) {
  const error = new Error(message)
  error.exit = exit
  return error
}

function canonicalDirectory(path) {
  mkdirSync(path, { recursive: true })
  return realpathSync(path)
}

// Group silence: probe existence with kill(-pgid, 0), not `ps`. Under a sandbox `ps` cannot
// read agent children (EPERM), which used to turn a proven-quiet group into "unknown" and retain
// ownership forever (BUG-346). ESRCH = the whole group is gone; EPERM or success = still alive.
function groupQuiet(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true
  try {
    process.kill(-pid, 0)
    return false
  } catch (error) {
    if (error.code === 'ESRCH') return true
    if (error.code === 'EPERM') return false
    return null
  }
}

function signalGroup(signal) {
  if (!Number.isInteger(child?.pid) || child.pid <= 0) return
  try { process.kill(-child.pid, signal) } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

async function waitQuiet(timeoutMs) {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (childClosed && groupQuiet(child.pid) === true) return true
    await delay(30)
  }
  return childClosed && groupQuiet(child.pid) === true
}

async function stop(exit, reason) {
  if (stopping !== null) return stopping
  requestedExit = exit
  stopping = (async () => {
    clearTimeout(startupTimer)
    clearTimeout(handoffTimer)
    const notify = reason ? send('failed', { exit, reason }).catch(() => false) : Promise.resolve(false)
    if (reason) safeDiagnostic(`start-channel: ${reason}`)
    let quiet = child === null || !Number.isInteger(child.pid)
    if (!quiet) {
      try {
        signalGroup('SIGTERM')
        quiet = await waitQuiet(3000)
        if (!quiet) {
          signalGroup('SIGKILL')
          quiet = await waitQuiet(3000)
        }
      } catch (error) {
        safeDiagnostic(`start-channel: cleanup failed: ${error.message}`)
      }
    }
    if (quiet) {
      for (const lock of [...locks].reverse()) {
        if (!lock.release()) {
          safeDiagnostic(`start-channel: ownership release failed (${lock.path}); recover offline`)
          exit = 1
        }
      }
    } else {
      const held = locks.map(lock => lock.path).join(', ')
      safeDiagnostic(`start-channel: process group is not proven quiet; ownership retained (${held}); stop related processes, verify none remain, then remove the lock directories and recover offline`)
      exit = 1
    }
    if (logFd !== null) { closeSync(logFd); logFd = null }
    if (process.connected) process.disconnect()
    await Promise.race([notify, delay(100)])
    process.exitCode = exit
    return exit
  })()
  return stopping
}

async function publishReady(url) {
  if (ready || stopping !== null) return
  ready = true
  clearTimeout(startupTimer)
  if (background) {
    handoffTimer = setTimeout(() => { void stop(1, 'driver did not hand off the ready channel') }, 15_000)
    if (!await send('ready', { url, pid: process.pid })) await stop(1, 'driver disconnected before handoff')
  }
}

function consumeOutput(chunk, target, { detectBanner = false } = {}) {
  if (logFd !== null) writeSync(logFd, chunk)
  else if (target?.writable) {
    try { target.write(chunk) } catch (error) {
      if (stopping === null) void stop(1, `parent output closed: ${error.message}`)
    }
  }
  if (!detectBanner || mode !== 'serve' || ready) return
  outputTail = (outputTail + chunk.toString('utf8')).slice(-16_384)
  const lines = outputTail.split('\n')
  outputTail = lines.pop() ?? ''
  for (const line of lines) {
    const match = /dsh web: (https?:\/\/\S+)/.exec(line)
    if (!match) continue
    try {
      const url = new URL(match[1])
      if (Number(url.port) !== Number(env.DSH_RUN_PORT) || !url.searchParams.has('token')) continue
      void publishReady(url.href)
    } catch { /* A malformed banner never establishes readiness. */ }
  }
}

async function main() {
  if (args.length > 1 || (args.length === 1 && !modes.has(mode))) throw fail('unknown mode; use --prepare-profile, --drift-check or --drift-only', 2)
  if (argv.filter(arg => arg === '--background').length > 1) throw fail('duplicate --background', 2)
  if (background && (!process.connected || mode !== 'serve')) throw fail('--background requires a fork IPC channel and serve mode', 2)
  const profile = env.DSH_RUN_PROFILE || 'deep-research'
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(profile) || profile === '.' || profile === '..') throw fail('invalid DSH_RUN_PROFILE', 2)
  const port = env.DSH_RUN_PORT || '3083'
  if (!/^[0-9]+$/.test(port) || !Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535) throw fail('DSH_RUN_PORT must be an integer from 1 to 65535', 2)
  // Match tools/env.sh: inherited platform DSH_HOME is not the dev home selector.
  const home = canonicalDirectory(resolve(env.DSH_DEV_HOME || join(ROOT, 'runtime/harness-home')))
  const state = canonicalDirectory(resolve(env.DSH_RUN_STATE_DIR || join(ROOT, 'runtime/smoke-workspace')))
  const workspace = resolve(env.DSH_RUN_WORKSPACE || env.DEEP_RESEARCH_WORKSPACE || join(ROOT, 'research-workspace'))
  Object.assign(env, { DSH_HOME: home, DSH_DEV_HOME: home, DSH_RUN_STATE_DIR: state,
    DSH_RUN_PROFILE: profile, DSH_RUN_PORT: String(Number(port)), DSH_RUN_WORKSPACE: workspace,
    DEEP_RESEARCH_WORKSPACE: workspace })

  process.on('SIGINT', () => { void stop(130, 'cancelled by SIGINT') })
  process.on('SIGTERM', () => { void stop(143, 'cancelled by SIGTERM') })
  process.on('disconnect', () => {
    if (background && !handedOff) void stop(1, 'driver disconnected before handoff')
  })
  process.on('message', message => {
    if (message === null || typeof message !== 'object' || message.generation !== generation) return
    if (message.type === 'cancel' && !handedOff) { void stop(1, 'driver cancelled startup'); return }
    if (message.type !== 'handoff' || !ready || handedOff || stopping !== null) return
    handedOff = true
    clearTimeout(handoffTimer)
    void send('handed-off', { pid: process.pid }).then(sent => {
      if (!sent) { handedOff = false; void stop(1, 'handoff acknowledgement failed'); return }
      if (process.connected) process.disconnect()
    })
  })

  if (mode !== '--drift-only') {
    // Legacy locks cannot be safely interpreted or reclaimed by the new protocol.
    for (const name of ['boot-run.lock', 'run-driver-up.lock']) {
      if (existsSync(join(state, name))) throw fail(`legacy ownership exists (${join(state, name)}); stop related processes and recover offline`, 2)
    }
    if (SANDBOX_AVAILABLE === false) safeDiagnostic('start-channel: nested sandbox detected (sandbox-exec EPERM); script-layer fan-out will be declared unavailable')
    // Home-level writes occur during preparation; keeping this lock for the service
    // also prohibits rebuilding a loaded profile. Independent homes can run in parallel.
    const paths = [...new Set([join(home, 'channel-start.lock'), join(state, 'channel-start.lock')])].sort()
    for (const path of paths) {
      const lock = acquireStartLock(path)
      if (!lock.ok) throw fail(lock.reason, 2)
      locks.push({ ...lock, path })
    }
  }
  if (background && !await send('acquired', { pid: process.pid, stateDir: state })) throw fail('driver disconnected before startup')
  if (stopping !== null) return
  if (background) {
    logFd = openSync(join(state, 'run-driver-boot.log'), 'w')
    writeFileSync(join(state, 'run-driver.pid'), String(process.pid))
  }
  // There is no executable body entry or environment flag that bypasses ownership.
  child = spawn('bash', ['-s', '--', join(ROOT, 'tools/channel/boot-run-body.sh'), ...args], {
    cwd: ROOT, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'],
  })
  closed = new Promise(resolveClose => {
    child.once('error', error => { void stop(1, `body spawn failed: ${error.message}`); resolveClose({ code: 1, error }) })
    child.once('exit', (code, signal) => {
      // Exit is earlier than close: descendants may still hold inherited pipes.
      let exit = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1)
      if (mode === 'serve' && !ready && exit === 0) exit = 1
      void stop(exit, `body exited (${code ?? signal}); current-generation ready=${ready}`)
    })
    child.once('close', (code, signal) => { childClosed = true; resolveClose({ code, signal }) })
  })
  child.stdin.on('error', error => { if (stopping === null) void stop(1, `body input failed: ${error.message}`) })
  child.stdout.on('data', chunk => {
    try { consumeOutput(chunk, process.stdout, { detectBanner: true }) } catch (error) { void stop(1, `output failed: ${error.message}`) }
  })
  child.stderr.on('data', chunk => {
    try { consumeOutput(chunk, process.stderr) } catch (error) { void stop(1, `output failed: ${error.message}`) }
  })
  if (!background) {
    for (const stream of [process.stdout, process.stderr]) {
      stream.on('error', error => { if (stopping === null) void stop(1, `parent output closed: ${error.message}`) })
      stream.on('close', () => { if (stopping === null) void stop(1, 'parent output closed') })
    }
  }
  child.stdin.end('source "$1"\nshift\nrunBootBody "$@"\n')
  if (mode === 'serve') startupTimer = setTimeout(() => { void stop(1, 'no current-generation banner before startup deadline') }, 120_000)
  const result = await closed
  if (stopping !== null) return stopping
  if (result.error) return stop(1, `body spawn failed: ${result.error.message}`)
  let exit = result.code ?? (result.signal === 'SIGINT' ? 130 : result.signal === 'SIGTERM' ? 143 : 1)
  if (mode === 'serve' && !ready && exit === 0) exit = 1
  return stop(exit, exit !== 0 ? `body exited (${result.code ?? result.signal}); current-generation ready=${ready}` : null)
}

main().catch(error => stop(error.exit ?? 1, error.message)).catch(error => {
  // An unexpected cleanup error must not trigger a second release attempt.
  safeDiagnostic(`start-channel: cleanup could not finish: ${error.message}`)
  process.exitCode = requestedExit || 1
})
