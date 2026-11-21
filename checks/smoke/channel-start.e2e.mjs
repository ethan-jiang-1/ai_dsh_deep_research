#!/usr/bin/env node
// Real public-entry startup ownership, in an isolated copy of the current source.
// External adapters only: fixture vendor CLI/dashboard/artifact check + lsof/npm/git.
// The wrapper, supervisor, body, driver, lock and drift/cache logic are copied unchanged.
// This proves process ownership/delegation/cleanup, not real DSH, GUI or model quality.
// node checks/smoke/channel-start.e2e.mjs
// node checks/smoke/channel-start.e2e.mjs --mutate=drop-home-lock   # expected exit 1
// node checks/smoke/channel-start.e2e.mjs --mutate=bypass-wrapper   # expected exit 1
// Exit: 0 assertions passed; 1 assertion/cleanup failed; 2 prerequisite unavailable.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { performance } from 'node:perf_hooks'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mutation = process.argv.slice(2).find(arg => arg.startsWith('--mutate='))?.slice(9) ?? null
const allowed = new Set(['drop-home-lock', 'bypass-wrapper'])
const unknown = process.argv.slice(2).filter(arg => !arg.startsWith('--mutate='))
const required = [
  'tools/env.sh', 'tools/channel/boot-run.sh', 'tools/channel/boot-run-body.sh',
  'tools/channel/start-channel.mjs', 'tools/channel/run-driver.mjs',
  'tools/channel/llm-socket-isolation.cjs', 'checks/lib/channel/start-lock.mjs',
  'checks/lib/channel/channel-cache.mjs', 'checks/lib/channel/profile-guard.mjs',
  'checks/lib/channel/run-channel.mjs', 'checks/lib/shared/cli-entry.mjs',
  'checks/lib/shared/web-harness.mjs', 'checks/lib/shared/web-banner.mjs', 'checks/lib/shared/startup-hint.mjs',
]
let archive
const children = new Set()
const instances = []
const outcomes = []
let launchSequence = 0
const report = (name, detail) => { outcomes.push({ name, detail }); console.log(`PASS ${name}: ${detail}`) }
const text = path => { try { return readFileSync(path, 'utf8') } catch { return '' } }
const put = (path, content, executable = false) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, { mode: executable ? 0o755 : 0o644 })
}
function live(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false
  // Existence via kill, not ps: under the agent sandbox ps cannot read child processes (EPERM),
  // which used to make the whole runner NOT-RUN (BUG-346). A zombie still answers kill; every
  // entry we own is awaited to `close`, so reap latency is bounded here.
  try { process.kill(pid, 0); return true } catch (error) {
    if (error.code === 'ESRCH') return false
    if (error.code === 'EPERM') return true
    throw error
  }
}
async function until(label, predicate, timeoutMs = 12_000) {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    const value = predicate()
    if (value) return value
    // Predicate polling, never a delay used as evidence of success.
    await delay(20)
  }
  throw new Error(`deadline waiting for ${label}`)
}
async function port() {
  const socket = createServer()
  await new Promise((yes, no) => {
    socket.once('error', error => { if (['EACCES', 'EPERM'].includes(error.code)) error.prerequisite = true; no(error) })
    socket.listen(0, '127.0.0.1', yes)
  })
  const value = socket.address().port
  await new Promise((yes, no) => socket.close(error => error ? no(error) : yes()))
  return value
}
function launch(command, args, env, cwd = archive) {
  const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
  const outputFile = join(archive, 'process-output', `${++launchSequence}.log`)
  const record = { child, output: '', result: null, outputFile }
  children.add(record)
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', chunk => { record.output += chunk })
  child.stderr.on('data', chunk => { record.output += chunk })
  record.closed = new Promise(resolveClose => {
    child.once('error', error => { record.error = error })
    child.once('close', (code, signal) => {
      record.result = { code, signal }
      put(outputFile, `${JSON.stringify({ command, args, cwd, code, signal })}\n${record.output}`)
      children.delete(record)
      resolveClose(record.result)
    })
  })
  return record
}
async function exited(record, label, timeoutMs = 15_000) {
  await until(`${label} close`, () => record.result !== null, timeoutMs)
  if (record.error) throw record.error
  return record.result.code
}
function owners(instance) {
  return [instance.home, instance.state].map(root => {
    const dir = join(root, 'channel-start.lock')
    if (!existsSync(dir)) return null
    const files = readdirSync(dir).filter(name => /^owner-.*\.json$/.test(name))
    assert.equal(files.length, 1, `exactly one owner at ${dir}`)
    return JSON.parse(readFileSync(join(dir, files[0]), 'utf8'))
  })
}
function assertOwned(instance) {
  const current = owners(instance)
  assert(current.every(Boolean), 'home and state both have owners')
  assert.equal(current[0].pid, current[1].pid, 'one supervisor owns both resources')
  assert(live(current[0].pid), 'owner supervisor is live')
  return current[0].pid
}
async function instance(name, { home, state, ready = true, fail = false } = {}) {
  const area = join(archive, 'cases', name)
  home ??= join(area, 'home')
  state ??= join(area, 'state')
  const workspace = join(area, 'workspace')
  const fixture = join(area, 'fixture')
  for (const dir of [home, state, workspace, fixture]) mkdirSync(dir, { recursive: true })
  const source = join(archive, 'packages/deep-research-pack')
  const profile = join(home, 'profiles/deep-research')
  const mirror = join(profile, 'node_modules/dsh-deep-research-pack')
  for (const rel of ['package.json', 'presets/fixture.patch.yml', 'payload.txt']) {
    put(join(mirror, rel), readFileSync(join(source, rel)))
  }
  put(join(profile, 'package.json'), JSON.stringify({
    dependencies: { 'dsh-deep-research-pack': 'file:fixture', '@deepseek-ai/dsh-experimental-agent-team-profile': '1.0.0' },
    dsh: { profile: { bundles: ['dsh-deep-research-pack', '@deepseek-ai/dsh-experimental-agent-team-profile'] } },
  }))
  put(join(profile, 'cordis.patch.yml'), '[]\n')
  if (ready) put(join(fixture, 'allow-ready'), '')
  const env = { ...process.env }
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('DSH_') || key.startsWith('DEEP_RESEARCH_') || /API_KEY|TOKEN|SECRET|PASSWORD/i.test(key)) delete env[key]
  }
  delete env.NODE_OPTIONS
  Object.assign(env, {
    PATH: `${join(archive, 'bin')}:${process.env.PATH}`,
    DSH_DEV_HOME: home, DSH_RUN_STATE_DIR: state, DSH_RUN_WORKSPACE: workspace,
    DSH_RUN_PORT: String(await port()), DSH_RUN_RUNTIME: 'built', MCP_PLAYWRIGHT: '0',
    CHANNEL_FIXTURE_DIR: fixture, CHANNEL_FIXTURE_REGISTRY: join(archive, 'listeners'),
    CHANNEL_FIXTURE_FAIL: fail ? '1' : '0',
  })
  const value = { name, area, home, state, fixture, env, direct: null, driver: null }
  instances.push(value)
  return value
}
const direct = value => (value.direct = launch('bash', [join(archive, 'tools/channel/boot-run.sh')], value.env, value.cwd ?? archive))
const driver = value => (value.driver = launch(process.execPath, [join(archive, 'tools/channel/run-driver.mjs'), 'up', '--no-probe'], value.env, value.cwd ?? archive))
async function entered(value) {
  await until(`${value.name} fixture vendor entered`, () => existsSync(join(value.fixture, 'entered')))
  return Number(text(join(value.fixture, 'entered')))
}
async function ready(value) {
  await until(`${value.name} current banner`, () => /dsh web: http/.test(text(join(value.state, 'web.log'))))
}
async function release(value, pid, handle = null) {
  if (live(pid)) process.kill(pid, 'SIGTERM')
  await until(`${value.name} child received TERM`, () => existsSync(join(value.fixture, 'terminating')))
  // The child deliberately remains alive until the harness acknowledges TERM.
  // A supervisor releasing before child close is observable here.
  assert(live(Number(text(join(value.fixture, 'entered')))), 'child still live at TERM barrier')
  assertOwned(value)
  put(join(value.fixture, 'allow-stop'), '')
  if (handle) await exited(handle, `${value.name} supervisor`)
  await until(`${value.name} supervisor gone`, () => !live(pid))
  await until(`${value.name} both locks released`, () => owners(value).every(owner => owner === null))
  assert(existsSync(join(value.fixture, 'closed')), 'vendor child exit observed before lock absence')
  assert(!live(Number(text(join(value.fixture, 'entered')))), 'vendor child no longer runs')
  const dashboardPid = Number(text(join(value.fixture, 'dashboard-pid')))
  if (dashboardPid) assert(!live(dashboardPid), 'dashboard child no longer runs')
}

function fixtureRoot() {
  const parent = join(ROOT, 'runtime/smoke-workspace')
  mkdirSync(parent, { recursive: true })
  archive = mkdtempSync(join(parent, 'channel-start-e2e-'))
  for (const rel of required) {
    mkdirSync(dirname(join(archive, rel)), { recursive: true })
    copyFileSync(join(ROOT, rel), join(archive, rel))
  }
  mkdirSync(join(archive, 'listeners'))
  put(join(archive, 'package.json'), '{"type":"module"}\n')
  put(join(archive, 'node_modules/tsx/package.json'), '{"name":"tsx","type":"module","exports":{"./esm":"./esm.mjs"}}\n')
  put(join(archive, 'node_modules/tsx/esm.mjs'), '// Dashboard adapter is plain JS; no TypeScript transform needed.\n')
  put(join(archive, 'checks/lib/harness/vendor-artifacts.mjs'), 'console.log("boot 前自检绿：fixture external vendor artifacts")\n')
  const pack = join(archive, 'packages/deep-research-pack')
  put(join(pack, 'package.json'), '{"name":"dsh-deep-research-pack","version":"1.0.0"}\n')
  put(join(pack, 'presets/fixture.patch.yml'), '[]\n')
  put(join(pack, 'payload.txt'), 'independent fixture payload\n')
  put(join(archive, 'bin/git'), '#!/bin/sh\n# env.sh hook configuration must not touch the real checkout.\nexit 0\n', true)
  put(join(archive, 'bin/npm'), `#!/bin/sh\nprintf '%s\\n' '[{"files":[{"path":"package.json"},{"path":"presets/fixture.patch.yml"},{"path":"payload.txt"}]}]'\n`, true)
  put(join(archive, 'bin/lsof'), `#!${process.execPath}
import * as fs from 'node:fs';
import * as path from 'node:path';
const arg = process.argv.find(value => value.startsWith('-iTCP:'));
const file = path.join(process.env.CHANNEL_FIXTURE_REGISTRY, (arg || '').slice(6) + '.json');
try { const value = JSON.parse(fs.readFileSync(file)); process.kill(value.pid, 0); console.log(value.pid); } catch { process.exitCode = 1; }
`, true)
  put(join(archive, 'probes/analyze/run-dashboard.mjs'), `import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
writeFileSync(join(process.env.CHANNEL_FIXTURE_DIR, 'dashboard-pid'), String(process.pid));
if (process.env.CHANNEL_FIXTURE_BODY_EARLY_EXIT === '1') {
  // Dashboard stdout/stderr are the real body's supervisor pipes, unlike the
  // vendor's nested tee pipeline. Retaining these delays ChildProcess close.
  const holder = spawn(process.execPath, [fileURLToPath(new URL('../../vendor/dsh/apps/cli/lib/pipe-holder.js', import.meta.url))], {
    env: process.env, stdio: ['ignore', 'inherit', 'inherit'], detached: false,
  });
  holder.once('error', error => { console.error(error); process.exit(31); });
}
const keep = setInterval(() => {}, 1000);
process.on('SIGTERM', () => { clearInterval(keep); process.exit(0); });
`)
  put(join(archive, 'vendor/dsh/apps/cli/lib/pipe-holder.js'), `import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.env.CHANNEL_FIXTURE_DIR;
// Inherit the real body's process group and its supervisor stdout/stderr pipes.
// TERM is deliberately ignored after recording it: only group KILL can finish.
process.on('SIGTERM', () => { writeFileSync(join(dir, 'descendant-term'), String(process.pid)); });
writeFileSync(join(dir, 'descendant-pid'), String(process.pid));
setInterval(() => {}, 1000);
`)
  put(join(archive, 'vendor/dsh/apps/cli/lib/bin.js'), `import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
if (process.argv.includes('--version')) { console.log('1.0.0'); process.exit(0); }
const dir = process.env.CHANNEL_FIXTURE_DIR;
const port = process.env.DSH_RUN_PORT;
const registry = join(process.env.CHANNEL_FIXTURE_REGISTRY, port + '.json');
writeFileSync(join(dir, 'entered'), String(process.pid));
writeFileSync(join(dir, 'vendor-cwd'), process.cwd());
writeFileSync(join(dir, 'body-pid'), String(process.ppid));
let serving = false, stopping = false;
const tick = setInterval(() => {
  if (process.env.CHANNEL_FIXTURE_BODY_EARLY_EXIT === '1' && existsSync(join(dir, 'allow-body-exit')) && existsSync(join(dir, 'descendant-pid'))) {
    // External executable fails its calling body after a pipe-holding descendant
    // has definitely started. No production owner/body implementation is changed.
    process.kill(process.ppid, 'SIGKILL');
    process.exit(29);
  }
  if (stopping) {
    if (existsSync(join(dir, 'allow-stop'))) process.exit(0);
  } else if (!serving && existsSync(join(dir, 'allow-ready'))) {
    if (process.env.CHANNEL_FIXTURE_FAIL === '1') process.exit(23);
    serving = true;
    writeFileSync(registry, JSON.stringify({ pid: process.pid }));
    console.log('dsh web: http://127.0.0.1:' + port + '/?token=fixture-' + process.pid);
  }
}, 15);
process.on('SIGTERM', () => { stopping = true; writeFileSync(join(dir, 'terminating'), String(process.pid)); });
process.on('exit', () => {
  clearInterval(tick);
  try { unlinkSync(registry); } catch {}
  writeFileSync(join(dir, 'closed'), String(process.pid));
});
`)
  put(join(archive, 'fixtures/handoff-term-hook.mjs'), `import { ChildProcess } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const isDriver = process.argv[1]?.endsWith('/tools/channel/run-driver.mjs');
if (isDriver) {
  const original = ChildProcess.prototype.emit;
  let held = false;
  ChildProcess.prototype.emit = function (event, ...args) {
    const message = args[0];
    if (event !== 'message' || message?.type !== 'handed-off' || held) return Reflect.apply(original, this, [event, ...args]);
    held = true;
    const dir = process.env.CHANNEL_FIXTURE_DIR;
    const receiver = this;
    writeFileSync(join(dir, 'handoff-ack-held.json'), JSON.stringify({ driver: process.pid, supervisor: receiver.pid, generation: message.generation }));
    // The real supervisor has set handedOff and sent its ACK. Hold only the ACK
    // delivery to the real driver listener; no production function is replaced.
    process.kill(process.pid, 'SIGTERM');
    void (async () => {
      while (!existsSync(join(dir, 'deliver-handoff-ack'))) await delay(10);
      Reflect.apply(original, receiver, [event, ...args]);
    })();
    return true;
  };
}
`)
  put(join(archive, 'fixture-manifest.json'), JSON.stringify({
    mutation, copiedOwners: required, externalAdapters: ['vendor CLI', 'vendor artifact check', 'dashboard', 'lsof', 'git', 'npm', 'tsx bootstrap'],
    schedulingSeam: 'NODE_OPTIONS fixture import holds delivery of the real handed-off IPC message, sends driver SIGTERM, and releases ACK at an explicit file barrier; no copied production source or function is replaced.',
    limits: 'No real DSH/GUI/model or external network; actual body/profile comparison and owner processes are exercised.',
  }, null, 2) + '\n')
}

async function scenarios() {
  const first = await instance('direct-first', { ready: false })
  const owner = direct(first)
  await entered(first)
  await until('body tee has opened its current log', () => existsSync(join(first.state, 'web.log')))
  const ownerPid = assertOwned(first)
  assert.equal(ownerPid, owner.child.pid, 'foreground wrapper execs the supervisor')
  const sentinel = `keep-existing-logs-${randomUUID()}\n`
  put(join(first.state, 'web.log'), sentinel)
  put(join(first.state, 'run-driver-boot.log'), sentinel)
  const contender = driver(first)
  assert.equal(await exited(contender, 'driver busy contender'), 2, contender.output)
  assert.match(contender.output, /持锁|ownership|busy|残留/i, 'busy is ownership refusal, not arbitrary failure')
  assert.equal(text(join(first.state, 'web.log')), sentinel, 'busy driver cannot truncate web.log')
  assert.equal(text(join(first.state, 'run-driver-boot.log')), sentinel, 'busy driver cannot truncate boot log')
  assert.equal(assertOwned(first), ownerPid, 'busy attempt leaves owner intact')
  report('direct → driver', 'real public driver rejects before readiness and preserves both logs')
  put(join(first.fixture, 'allow-ready'), '')
  await ready(first)
  const drift = launch('bash', [join(archive, 'tools/channel/boot-run.sh'), '--drift-only'], first.env)
  assert.equal(await exited(drift, 'drift-only'), 0, drift.output)
  assert.equal(assertOwned(first), ownerPid, 'drift-only leaves active ownership intact')
  const reuse = driver(first)
  assert.equal(await exited(reuse, 'driver reuse'), 2, reuse.output)
  assert.match(reuse.output, /复用/)
  assert.match(reuse.output, /--no-probe/)
  assert.equal(assertOwned(first), ownerPid, 'reuse does not acquire or replace ownership')
  report('drift / reuse', 'real drift-only succeeds under active owner; driver reuses without GUI')
  await release(first, ownerPid, owner)
  report('foreground TERM', 'both locks remain until vendor child close; supervisor and dashboard exit')

  // ps unreadable: the group-silence probe must not depend on ps (BUG-346). A failing ps on PATH
  // used to turn a proven-quiet group into "unknown" and retain both locks after a normal TERM.
  const noPs = await instance('ps-unreadable')
  const fakeBin = join(noPs.area, 'fakebin')
  mkdirSync(fakeBin, { recursive: true })
  put(join(fakeBin, 'ps'), '#!/usr/bin/env bash\necho "ps: Operation not permitted" >&2\nexit 1\n', true)
  noPs.env.PATH = `${fakeBin}:${noPs.env.PATH}`
  const noPsHandle = direct(noPs)
  await ready(noPs)
  const noPsPid = assertOwned(noPs)
  await release(noPs, noPsPid, noPsHandle)
  report('ps unreadable', 'normal TERM proves quiet via kill(-pgid,0); both locks released without ps')

  const second = await instance('driver-first')
  const driverOwner = driver(second)
  assert.equal(await exited(driverOwner, 'driver handoff'), 2, driverOwner.output)
  assert.match(driverOwner.output, /横幅已出/)
  assert.match(driverOwner.output, /--no-probe/)
  const detachedPid = assertOwned(second)
  assert.equal(Number(text(join(second.state, 'run-driver.pid'))), detachedPid, 'handed-off supervisor PID matches ownership')
  const beforeWeb = text(join(second.state, 'web.log'))
  const beforeBoot = text(join(second.state, 'run-driver-boot.log'))
  if (mutation === 'bypass-wrapper') {
    // Reach the real ownership rejection assertion: bypass the owner in the copied
    // public wrapper, retaining the real body and its ordinary port check.
    put(join(archive, 'tools/channel/boot-run.sh'), '#!/usr/bin/env bash\nSCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\nsource "$SCRIPT_DIR/../env.sh"\nsource "$SCRIPT_DIR/boot-run-body.sh"\nrunBootBody "$@"\n')
  }
  const directContender = direct(second)
  assert.equal(await exited(directContender, 'foreground busy contender'), 2, `ownership must reject before the body/port check: ${directContender.output}`)
  assert.match(directContender.output, /持锁|ownership|busy|残留/i)
  assert.equal(text(join(second.state, 'web.log')), beforeWeb)
  assert.equal(text(join(second.state, 'run-driver-boot.log')), beforeBoot)
  assert.equal(assertOwned(second), detachedPid, 'service keeps ownership after driver exits')
  report('driver → direct', 'private READY/handoff completes and service ownership survives driver exit')

  const sameHome = await instance('same-home-other-state', { home: second.home })
  // A rejected candidate must finish without executing the vendor. If a mutated
  // owner admits it, the failing external vendor gives a bounded exit 23, making
  // the same public-entry assertion fail instead of hanging on a live service.
  sameHome.env.CHANNEL_FIXTURE_FAIL = '1'
  if (mutation === 'drop-home-lock') {
    const file = join(archive, 'tools/channel/start-channel.mjs')
    const source = readFileSync(file, 'utf8')
    const target = "join(home, 'channel-start.lock'), "
    assert(source.includes(target), 'drop-home-lock mutation target exists')
    put(file, source.replace(target, ''))
  }
  const homeContender = direct(sameHome)
  assert.equal(await exited(homeContender, 'same home contender'), 2, `shared home must be rejected before vendor execution: ${homeContender.output}`)
  assert.match(homeContender.output, /持锁|ownership|busy|残留/i)
  assert(!existsSync(join(sameHome.fixture, 'entered')), 'same home is rejected before vendor execution')
  assert(!existsSync(join(sameHome.state, 'channel-start.lock')), 'partial acquisition is rolled back')
  report('shared home', 'different state roots cannot bypass canonical home ownership')

  const independent = await instance('independent-home-state')
  const independentOwner = direct(independent)
  await entered(independent)
  await ready(independent)
  const independentPid = assertOwned(independent)
  assert.notEqual(independentPid, detachedPid)
  assert.equal(assertOwned(second), detachedPid)
  report('independent resources', 'different homes and state roots run concurrently')
  await release(independent, independentPid, independentOwner)
  await release(second, detachedPid)
  assert.match(text(join(second.state, 'run-driver-boot.log')), /start-channel: cancelled by SIGTERM/, 'detached supervisor cancellation diagnostic is retained in its owned boot log')
  report('background shutdown diagnostic', 'normal handed-off service TERM records supervisor reason in its boot log')

  const failed = await instance('vendor-failure', { fail: true })
  const failOwner = direct(failed)
  assert.notEqual(await exited(failOwner, 'failed startup'), 0)
  assert(existsSync(join(failed.fixture, 'closed')), 'failure child close observed')
  assert(owners(failed).every(value => value === null), 'failed startup releases both locks')
  report('startup failure', 'real body vendor exit propagates and both resources release after child close')

  const cancel = await instance('driver-cancel', { ready: false })
  const pendingDriver = driver(cancel)
  await entered(cancel)
  const cancelOwnerPid = assertOwned(cancel)
  pendingDriver.child.kill('SIGTERM')
  await until('driver cancellation reaches child', () => existsSync(join(cancel.fixture, 'terminating')))
  assert.equal(assertOwned(cancel), cancelOwnerPid, 'driver cancellation waits for child close')
  put(join(cancel.fixture, 'allow-stop'), '')
  assert.equal(await exited(pendingDriver, 'cancelled driver'), 143, pendingDriver.output)
  await until('cancelled supervisor exit', () => !live(cancelOwnerPid))
  assert(owners(cancel).every(value => value === null), 'cancellation releases both locks')
  assert(existsSync(join(cancel.fixture, 'closed')))
  report('driver TERM cancellation', 'generation-bound cancellation waits for child close and releases ownership')

  const early = await instance('body-exit-held-pipe', { ready: false })
  early.env.CHANNEL_FIXTURE_BODY_EARLY_EXIT = '1'
  const earlyOwner = direct(early)
  await entered(early)
  await until('pipe-holding descendant started', () => existsSync(join(early.fixture, 'descendant-pid')))
  const earlyOwnerPid = assertOwned(early)
  const bodyPid = Number(text(join(early.fixture, 'body-pid')))
  const holderPid = Number(text(join(early.fixture, 'descendant-pid')))
  assert(live(bodyPid) && live(holderPid), 'body and inherited-pipe descendant are live before failure')
  // Group membership is proven by behavior below (holder survives body exit, ignores TERM, then
  // dies on the group KILL). pgid equality cannot be read under a ps-less sandbox; the group
  // existence probe is enough here.
  let groupAlive = true
  try { process.kill(-bodyPid, 0) } catch { groupAlive = false }
  assert(groupAlive, 'detached body process group exists (pgid = body pid)')
  put(join(early.fixture, 'allow-body-exit'), '')
  await until('body exit is observed while descendant retains pipe', () => !live(bodyPid) && existsSync(join(early.fixture, 'descendant-term')))
  assert(live(holderPid), 'descendant ignores TERM and still holds inherited stdout/stderr after body exit')
  assert.equal(earlyOwner.result, null, 'supervisor has not closed while descendant retains its pipe')
  assert.equal(assertOwned(early), earlyOwnerPid, 'both ownership locks remain while descendant is live')
  const earlyExit = await exited(earlyOwner, 'body-exit supervisor cleanup', 12_000)
  assert.notEqual(earlyExit, 0, 'body exit without readiness must fail')
  assert.match(earlyOwner.output, /body exited/, 'body exit, rather than startup deadline, initiates cleanup')
  assert(!live(holderPid), 'TERM-resistant descendant is killed before supervisor close')
  assert(!live(bodyPid) && !live(earlyOwnerPid), 'body and supervisor have exited')
  assert(owners(early).every(value => value === null), 'both locks release only after inherited pipes close')
  const earlyDashboardPid = Number(text(join(early.fixture, 'dashboard-pid')))
  if (earlyDashboardPid) assert(!live(earlyDashboardPid), 'body group cleanup also terminates dashboard')
  report('body exit / inherited pipe', 'real body exits before close; group TERM then KILL stops pipe holder before releasing both locks')

  const relative = await instance('relative-caller-paths', { ready: false })
  relative.cwd = relative.area
  relative.env.DSH_DEV_HOME = './home'
  relative.env.DSH_RUN_WORKSPACE = './workspace'
  const relativeDriver = driver(relative)
  const relativeVendorPid = await entered(relative)
  const relativeOwnerPid = assertOwned(relative)
  assert.equal(Number(text(join(relative.state, 'run-driver.pid'))), relativeOwnerPid, 'relative caller driver uses expected absolute home')
  assert.equal(text(join(relative.fixture, 'vendor-cwd')), join(relative.area, 'workspace'), 'real body starts external vendor in caller-relative workspace')
  const relativeContender = direct(relative)
  assert.equal(await exited(relativeContender, 'relative direct contender'), 2, relativeContender.output)
  assert.match(relativeContender.output, /持锁|ownership|busy|残留/i)
  assert.equal(assertOwned(relative), relativeOwnerPid, 'both public entries resolve relative home to the same resource')
  relativeDriver.child.kill('SIGTERM')
  await until('relative driver cancel reaches vendor', () => existsSync(join(relative.fixture, 'terminating')))
  assert.equal(assertOwned(relative), relativeOwnerPid)
  put(join(relative.fixture, 'allow-stop'), '')
  assert.equal(await exited(relativeDriver, 'relative driver cleanup'), 143, relativeDriver.output)
  await until('relative supervisor gone', () => !live(relativeOwnerPid))
  assert(owners(relative).every(value => value === null))
  assert(!live(relativeVendorPid))
  report('caller-relative paths', 'driver and foreground entry use the same caller-relative home; real body uses caller-relative workspace')

  const raced = await instance('handoff-term-race')
  const hook = join(archive, 'fixtures/handoff-term-hook.mjs')
  raced.env.NODE_OPTIONS = `--import ${JSON.stringify(hook)}`
  const racedDriver = driver(raced)
  await entered(raced)
  await until('real handoff ACK is held in driver event queue', () => existsSync(join(raced.fixture, 'handoff-ack-held.json')))
  const held = JSON.parse(text(join(raced.fixture, 'handoff-ack-held.json')))
  const racedOwnerPid = assertOwned(raced)
  assert.equal(held.driver, racedDriver.child.pid)
  assert.equal(held.supervisor, racedOwnerPid, 'held ACK came from the real owner supervisor')
  assert.equal(typeof held.generation, 'string')
  await until('TERM after supervisor handoff reaches vendor', () => existsSync(join(raced.fixture, 'terminating')))
  assert.equal(racedDriver.result, null, 'driver must await supervisor cleanup after signal')
  assert.equal(assertOwned(raced), racedOwnerPid, 'handoff race retains locks while vendor is still live')
  assert(live(Number(text(join(raced.fixture, 'entered')))))
  put(join(raced.fixture, 'deliver-handoff-ack'), '')
  put(join(raced.fixture, 'allow-stop'), '')
  assert.equal(await exited(racedDriver, 'handoff cancellation driver'), 143, racedDriver.output)
  await until('handoff cancellation supervisor gone', () => !live(racedOwnerPid))
  assert(owners(raced).every(value => value === null), 'handoff race releases both locks after child close')
  assert(existsSync(join(raced.fixture, 'closed')))
  assert(!live(Number(text(join(raced.fixture, 'entered')))))
  const racedDashboardPid = Number(text(join(raced.fixture, 'dashboard-pid')))
  if (racedDashboardPid) assert(!live(racedDashboardPid))
  assert.match(text(join(raced.state, 'run-driver-boot.log')), /start-channel: cancelled by SIGTERM/)
  report('handoff ACK / driver TERM', 'real supervisor has handed off; held ACK permits TERM-before-driver-delivery and cleanup completes with driver exit 143')
}

async function cleanup() {
  const errors = []
  for (const value of instances) {
    put(join(value.fixture, 'allow-stop'), '')
    put(join(value.fixture, 'deliver-handoff-ack'), '')
  }
  const ownersToStop = new Set()
  const fixturePids = new Set()
  const bodyGroups = new Set()
  for (const value of instances) {
    for (const base of [value.home, value.state]) {
      const dir = join(base, 'channel-start.lock')
      if (!existsSync(dir)) continue
      for (const name of readdirSync(dir)) {
        try { ownersToStop.add(JSON.parse(readFileSync(join(dir, name), 'utf8')).pid) } catch {}
      }
    }
    const detached = Number(text(join(value.state, 'run-driver.pid')))
    if (detached) ownersToStop.add(detached)
    for (const name of ['entered', 'dashboard-pid', 'descendant-pid', 'body-pid']) {
      const pid = Number(text(join(value.fixture, name)))
      if (Number.isInteger(pid) && pid > 0) fixturePids.add(pid)
      if (name === 'body-pid' && Number.isInteger(pid) && pid > 0) bodyGroups.add(pid)
    }
  }
  for (const record of children) if (record.child.pid) ownersToStop.add(record.child.pid)
  function signal(pid, name, group = false) {
    if (!Number.isInteger(pid) || pid <= 0) return
    try { process.kill(group ? -pid : pid, name) } catch (error) { if (error.code !== 'ESRCH') errors.push(error.message) }
  }
  for (const pid of ownersToStop) signal(pid, 'SIGTERM')
  try {
    await until('normal supervisor cleanup', () => [...ownersToStop].every(pid => !live(pid)) && [...fixturePids].every(pid => !live(pid)) && children.size === 0, 10_000)
  } catch (error) {
    // A failing owner must not leave the smoke hanging on inherited pipes. Rescue
    // cleanup remains a test failure; force-kill is never used to make it pass.
    errors.push(error.message)
    for (const group of bodyGroups) signal(group, 'SIGKILL', true)
    for (const pid of fixturePids) signal(pid, 'SIGKILL')
    for (const pid of ownersToStop) signal(pid, 'SIGKILL')
    try { await until('forced cleanup closes public pipes', () => children.size === 0, 5000) } catch (closeError) { errors.push(closeError.message) }
  }
  // ChildProcess close, not only PID disappearance, is required for entries we own.
  for (const record of [...children]) {
    try { await exited(record, 'cleanup public entry', 5000) } catch (error) { errors.push(error.message) }
  }
  for (const pid of new Set([...ownersToStop, ...fixturePids])) {
    try { await until(`cleanup PID ${pid}`, () => !live(pid), 5000) } catch (error) { errors.push(error.message) }
  }
  if (errors.length) throw new Error(`cleanup did not reach quiescence without rescue: ${errors.join('; ')}`)
}

let exit = 0
try {
  if (unknown.length || (mutation !== null && !allowed.has(mutation))) throw new Error('usage: channel-start.e2e.mjs [--mutate=drop-home-lock|bypass-wrapper]')
  if (process.platform === 'win32') { const error = new Error('requires POSIX bash/process groups/ps'); error.prerequisite = true; throw error }
  const preflight = spawnSync('bash', ['-c', 'for name in tee diff sed grep head tr cat dirname; do command -v "$name" >/dev/null || exit 2; done'], { encoding: 'utf8', timeout: 3000 })
  if (preflight.error || preflight.status !== 0) { const error = new Error(`unavailable shell prerequisite: ${preflight.error?.message ?? preflight.stderr ?? `exit ${preflight.status}`}`); error.prerequisite = true; throw error }
  // No process-group observation prerequisite: existence is probed with kill (BUG-346), so a
  // sandbox that denies ps must not turn this runner into NOT-RUN.
  for (const rel of required) if (!existsSync(join(ROOT, rel))) { const error = new Error(`missing prerequisite ${rel}`); error.prerequisite = true; throw error }
  fixtureRoot()
  console.log(`channel-start fixture: ${archive}${mutation ? ` (mutation=${mutation})` : ''}`)
  await scenarios()
} catch (error) {
  exit = error.prerequisite ? 2 : 1
  console.error(`${exit === 2 ? 'NOT-RUN' : 'FAIL'} channel-start: ${error.stack ?? error}`)
} finally {
  try { await cleanup() } catch (error) { exit = 1; console.error(`FAIL ${error.message}`) }
  if (archive) put(join(archive, 'result.json'), JSON.stringify({ exit, mutation, outcomes, proof: 'real process ownership with external fixture adapters; no DSH/GUI/model proof' }, null, 2) + '\n')
}
console.log(`channel-start: exit=${exit}; ${outcomes.length} checks; external DSH/GUI/model not run`)
process.exitCode = exit
