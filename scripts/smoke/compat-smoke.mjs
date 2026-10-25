#!/usr/bin/env node
// compat-smoke.mjs — T6 兼容面：用**已安装的 rc.3 全局 dsh**跑一次真实安装形状。
//
// 证明什么：包在 rc.3 宿主上 install → dump-config → scaffold/preflight → remove 全链可解释。
// 不证明什么：不启动 web（启动由 cold-start-smoke / 手工 rc.3 boot 证明）；不覆盖 rc.4/0.2.2；
// 本机没有 rc.3 全局 dsh 时 exit 2（未跑 ≠ 通过），不拿 rc.2 结果冒充 rc.3。
//
// 用法：node scripts/smoke/compat-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过）
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { satisfiesVersion } from '../../packages/deep-research-pack/scripts/lib/version-range.mjs'
import { scrubbedEnv } from '../lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `compat-rc3-${process.pid}`)
const HOME = join(TEMP, 'home')
const PROFILE = 'compat-rc3'
const WS = join(TEMP, 'ws')

const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const dsh = (args, env = {}) => spawnSync('dsh', args, { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME, ...env }) })
const installed = join(HOME, 'profiles', PROFILE, 'node_modules', 'dsh-deep-research-pack')

const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
const found = version.status === 0 ? (String(version.stdout).match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null) : null
if (found === null) {
  console.error('compat-smoke: 需要全局 dsh（本机不可用）——未跑 ≠ 通过')
  process.exit(2)
}
if (!satisfiesVersion(found, '>=0.2.1-rc.3 <0.3.0')) {
  console.error(`compat-smoke: 全局 dsh ${found} 不在 rc.3+ 范围——未跑（本 smoke 只证 rc.3 安装面）`)
  process.exit(2)
}
if (!existsSync(TARBALL)) {
  console.error(`compat-smoke: tarball 缺席（${TARBALL}）——先 node scripts/dist/export-dist.mjs`)
  process.exit(2)
}

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
try {
  const init = dsh(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-config'])
  check(init.status === 0, 'rc.3 初始化干净 profile', (init.stderr || '').slice(-300))

  const add = dsh(['plugin', '--profile', PROFILE, 'add', `file:${TARBALL}`])
  check(add.status === 0, 'rc.3 plugin add tarball', (add.stderr || add.stdout || '').slice(-400))

  const dump = dsh(['--profile', PROFILE, '--dump-config'])
  check(dump.status === 0 && dump.stdout.includes('dsh-deep-research-pack') && dump.stdout.includes('preset-lead'),
    'rc.3 dump-config 见本包行与 lead preset', (dump.stderr || '').slice(-300))

  const scaffold = spawnSync(process.execPath, [
    join(installed, 'scripts', 'scaffold.mjs'), '--install-only', '--workspace', WS,
    '--profile', PROFILE, '--host', join(HOME, 'profiles', PROFILE),
  ], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) })
  check(scaffold.status === 0 && scaffold.stdout.includes('安装验收通过'),
    'rc.3 scaffold + preflight 安装验收', (scaffold.stderr || '').slice(-400))

  const remove = dsh(['plugin', '--profile', PROFILE, 'remove', 'dsh-deep-research-pack'])
  const profileManifest = JSON.parse(readFileSync(join(HOME, 'profiles', PROFILE, 'package.json'), 'utf8'))
  check(remove.status === 0
    && !(profileManifest?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack')
    && profileManifest?.dependencies?.['dsh-deep-research-pack'] === undefined,
    'rc.3 remove 后 profile 无插件痕迹', (remove.stderr || '').slice(-300))
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\ncompat-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log(`\ncompat-smoke: ALL PASS（宿主 ${found}：install / dump / scaffold / remove）`)
process.exit(0)
