#!/usr/bin/env node
// profile-matrix-smoke.mjs — 分发/安装矩阵（keyless，不调模型）：
// 多 profile 并存、损坏 tarball 拒绝、卸载/重装后 workspace 数据保留。
// 只证 profile 级安装形状与数据边界；不证 DSH 运行时行为（release-smoke/cold-start 负责）。
// 用法：node scripts/smoke/profile-matrix-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `profile-matrix-${process.pid}`)
const HOME = join(TEMP, 'home')
const WS = join(TEMP, 'ws')
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const dsh = (args) => spawnSync('dsh', args, { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }), timeout: 180_000 })
const profile = (name) => join(HOME, 'profiles', name)
const installed = (name) => join(profile(name), 'node_modules', 'dsh-deep-research-pack')
const manifest = (name) => JSON.parse(readFileSync(join(profile(name), 'package.json'), 'utf8'))

if (!existsSync(TARBALL)) { console.error(`profile-matrix-smoke: tarball 缺席（${TARBALL}）`); process.exit(2) }
const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
if (version.status !== 0) { console.error('profile-matrix-smoke: 全局 dsh 不可用——未跑'); process.exit(2) }

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
try {
  for (const name of ['matrix-a', 'matrix-b']) {
    check(dsh(['--profile', name, '--from-default-profile', 'web', '--dump-config']).status === 0, `${name} 初始化`)
    check(dsh(['plugin', '--profile', name, 'add', `file:${TARBALL}`]).status === 0, `${name} 安装`)
    check(dsh(['--profile', name, '--dump-config']).stdout.includes('preset-lead'), `${name} dump-config 见 preset-lead`)
  }
  check(dsh(['plugin', '--profile', 'matrix-a', 'remove', 'dsh-deep-research-pack']).status === 0, 'matrix-a 卸载')
  check(!(manifest('matrix-a')?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), 'matrix-a 卸载后无本包')
  check((manifest('matrix-b')?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack')
    && existsSync(installed('matrix-b')), 'matrix-b 不受 matrix-a 卸载影响')

  // 损坏 tarball：在第三个干净 profile 上安装，pnpm 必须失败且不出现半装本包
  check(dsh(['--profile', 'matrix-c', '--from-default-profile', 'web', '--dump-config']).status === 0, 'matrix-c 初始化')
  const corrupt = join(TEMP, 'corrupt.tgz')
  copyFileSync(TARBALL, corrupt)
  truncateSync(corrupt, 1024)
  const corruptAdd = dsh(['plugin', '--profile', 'matrix-c', 'add', `file:${corrupt}`])
  check(corruptAdd.status !== 0, '损坏 tarball 安装失败', (corruptAdd.stderr || '').slice(-300))
  check(!(manifest('matrix-c')?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), '损坏安装不留下本包 bundle')

  // 卸载/重装：workspace 用户数据保留，种子状态仍 current
  check(dsh(['plugin', '--profile', 'matrix-a', 'add', `file:${TARBALL}`]).status === 0, 'matrix-a 重装')
  const scaffold = join(installed('matrix-a'), 'scripts', 'scaffold.mjs')
  check(spawnSync(process.execPath, [scaffold, '--seed-only', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) }).status === 0, 'matrix-a 铺工作区')
  writeFileSync(join(WS, 'method-library.md'), '# keep across uninstall\n')
  check(dsh(['plugin', '--profile', 'matrix-a', 'remove', 'dsh-deep-research-pack']).status === 0, 'matrix-a 再卸载')
  check(readFileSync(join(WS, 'method-library.md'), 'utf8') === '# keep across uninstall\n', '卸载后 workspace 用户文件保留')
  check(dsh(['plugin', '--profile', 'matrix-a', 'add', `file:${TARBALL}`]).status === 0, 'matrix-a 再次重装')
  const reScaffold = join(installed('matrix-a'), 'scripts', 'scaffold.mjs')
  const reCheck = spawnSync(process.execPath, [reScaffold, '--check', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) })
  check(reCheck.status === 0, '重装后 workspace 种子仍 current', reCheck.stdout.split('\n').slice(-2).join(' | '))
  check(readFileSync(join(WS, 'method-library.md'), 'utf8') === '# keep across uninstall\n', '重装后方法库保留')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nprofile-matrix-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('profile-matrix-smoke: ALL PASS（多 profile / 损坏包 / 卸载重装数据保留）')
process.exit(0)
