#!/usr/bin/env node
// install-shape.entry — L2：原样执行手册的 CLI 装包分支（§四-B；D40），证 DSH 原生安装形状。
//
// 默认首装 = CLI 建 profile（§三）+ 应用内 Plugins 页装包（§四-A）；本 smoke 验同一机制的 CLI 分支：
//   ① dsh --profile deep-research --from-default-profile web
//   ② dsh plugin --profile deep-research add <tarball> <team>
//   ③ dsh --profile deep-research（真启动，无 `did not activate`）
//
// 前置：DSH 在 PATH（或 DSH_BIN）、pnpm、团队层 registry/缓存、_dist tarball（或 PACK_TARBALL）。
// 缺任一 = exit 2（未跑 ≠ 通过）；断言失败 = exit 1。
// 用法：node scripts/smoke/install-shape.entry.mjs
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { scrubbedEnv } from '../lib/env.mjs'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const PROFILE = 'deep-research'
const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const dsh = process.env.DSH_BIN ?? 'dsh'
const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      → ${detail}`}`)
  if (!ok) failures.push(name)
}
const notRun = (reason) => { console.error(`install-shape.entry: NOT-RUN — ${reason}`); process.exit(2) }
const tail = (r) => `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-8).join('\n')

const version = spawnSync(dsh, ['--version'], { encoding: 'utf8' })
if (version.status !== 0) notRun(`找不到 dsh（${dsh}）；用 DSH_BIN 指定`)
if (process.env.PNPM_MISSING === '1') notRun('pnpm 缺失')
const dshVersion = String(version.stdout ?? '').match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null
if (dshVersion === null) notRun('dsh --version 读不出三段版本')
const tarball = process.env.PACK_TARBALL ?? join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
if (!existsSync(tarball)) notRun(`tarball 缺席：${tarball}（先 node scripts/dist/export-dist.mjs）`)
const teamSpec = process.env.TEAM_LAYER_SPEC ?? `${TEAM}@${dshVersion}`

const home = mkdtempSync(join(tmpdir(), 'dsh-install-shape-'))
const env = scrubbedEnv({ DSH_HOME: home })
const run = (args, timeout = 180_000) => spawnSync(dsh, args, { encoding: 'utf8', env, cwd: ROOT, timeout })

try {
  const init = run(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-default-config'])
  check('① profile 初始化（web 模板）', init.status === 0, tail(init))

  const add = run(['plugin', '--profile', PROFILE, 'add', `file:${tarball}`])
  check('② dsh plugin add pack', add.status === 0, tail(add))

  const team = run(['plugin', '--profile', PROFILE, 'add', teamSpec])
  if (team.status !== 0 && /EAI_AGAIN|ENOTFOUND|ERR_PNPM|ECONNREFUSED|registry|offline|404/i.test(tail(team))) {
    notRun(`团队层不可解析（${teamSpec}）：先预装/缓存团队层，或设 TEAM_LAYER_SPEC`)
  }
  check('② dsh plugin add 团队层', team.status === 0, tail(team))

  const dump = run(['--profile', PROFILE, '--dump-config'])
  const dumpText = `${dump.stdout ?? ''}`
  check('dump 有本包行', ['preset-lead', 'research-client', 'research-content', 'research-startup', 'tool-present', 'ui-agent-team']
    .every((row) => dumpText.includes(row)), dumpText.slice(-1200))
  check('dump 无旧 workspace-boot 行', !dumpText.includes('research-workspace-boot'))

  const profileManifest = JSON.parse(readFileSync(join(home, 'profiles', PROFILE, 'package.json'), 'utf8'))
  const bundles = profileManifest?.dsh?.profile?.bundles ?? []
  check('roster 三个状态：pack 在 bundles', bundles.includes('dsh-deep-research-pack'), JSON.stringify(bundles))
  check('roster 含团队层', bundles.includes(TEAM), JSON.stringify(bundles))

  // ③ 真启动：等 token URL，扫 import 失败，然后收进程。
  const child = spawn(dsh, ['--profile', PROFILE, '--no-open', '--port', '0'], { env, cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', (c) => { output = (output + String(c)).slice(-128_000) })
  child.stderr.on('data', (c) => { output = (output + String(c)).slice(-128_000) })
  const started = await new Promise((resolveStarted) => {
    const timer = setTimeout(() => resolveStarted(false), 120_000)
    const tick = setInterval(() => {
      if (/dsh web: http:\/\/127\.0\.0\.1:\d+\/\?token=/.test(output)) { clearInterval(tick); clearTimeout(timer); resolveStarted(true) }
    }, 200)
    child.once('exit', () => { clearInterval(tick); clearTimeout(timer); resolveStarted(false) })
  })
  check('③ 真启动出 token URL', started, output.slice(-2000))
  check('真启动无 did not activate / skipping bundle', !/did not activate|skipping profile bundle/.test(output), output.slice(-2000))
  try { child.kill('SIGTERM') } catch {}
  await new Promise((r) => { child.once('exit', r); setTimeout(r, 5000) })
} finally {
  rmSync(home, { recursive: true, force: true })
}

console.log(`\ninstall-shape.entry: ${failures.length === 0 ? 'ALL PASS' : `${failures.length} FAIL`}`)
process.exit(failures.length === 0 ? 0 : 1)
