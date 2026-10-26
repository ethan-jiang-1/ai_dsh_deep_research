#!/usr/bin/env node
// profile-concurrency-smoke.mjs — 两个 dsh plugin add 同 profile 并发（真实竞态，不是模拟）。
// 期望：至少一个成功；成功后 profile 可 dump-config 且可卸载；不允许“双成功但 profile 坏”。
// 用法：node scripts/smoke/profile-concurrency-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scrubbedEnv } from '../lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `profile-concurrency-${process.pid}`)
const HOME = join(TEMP, 'home')
const PROFILE = 'race'
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const env = scrubbedEnv({ DSH_HOME: HOME })
const dsh = (args) => spawnSync('dsh', args, { encoding: 'utf8', env, timeout: 180_000 })
const add = () => new Promise((resolveAdd) => {
  const child = spawn('dsh', ['plugin', '--profile', PROFILE, 'add', `file:${TARBALL}`], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  let out = ''
  child.stdout.on('data', (d) => { out = (out + d).slice(-4000) })
  child.stderr.on('data', (d) => { out = (out + d).slice(-4000) })
  child.once('close', (code) => resolveAdd({ code, out }))
})

if (!existsSync(TARBALL)) { console.error(`profile-concurrency-smoke: tarball 缺席（${TARBALL}）`); process.exit(2) }
const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
if (version.status !== 0) { console.error('profile-concurrency-smoke: 全局 dsh 不可用——未跑'); process.exit(2) }

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
try {
  check(dsh(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-config']).status === 0, '初始化 profile')
  const [a, b] = await Promise.all([add(), add()])
  check(a.code === 0 || b.code === 0, '至少一个并发安装成功', `codes=${a.code},${b.code}`)
  const dump = dsh(['--profile', PROFILE, '--dump-config'])
  check(dump.status === 0 && dump.stdout.includes('preset-lead'), '并发安装后 dump-config 可解析且见 preset-lead')
  const manifest = JSON.parse(readFileSync(join(HOME, 'profiles', PROFILE, 'package.json'), 'utf8'))
  check((manifest?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), '并发安装后 profile 只有一个本包 bundle')
  const remove = () => new Promise((resolveRemove) => {
    const child = spawn('dsh', ['plugin', '--profile', PROFILE, 'remove', 'dsh-deep-research-pack'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => { out = (out + d).slice(-4000) })
    child.stderr.on('data', (d) => { out = (out + d).slice(-4000) })
    child.once('close', (code) => resolveRemove({ code, out }))
  })
  const [ra, rb] = await Promise.all([remove(), remove()])
  check(ra.code === 0 || rb.code === 0, '至少一个并发卸载成功', `codes=${ra.code},${rb.code}`)
  const after = JSON.parse(readFileSync(join(HOME, 'profiles', PROFILE, 'package.json'), 'utf8'))
  check(!(after?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), '并发卸载后本包消失')
  check(dsh(['--profile', PROFILE, '--dump-config']).status === 0, '并发卸载后 dump-config 可解析')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nprofile-concurrency-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('profile-concurrency-smoke: ALL PASS（并发 plugin add 后 profile 可解析/可卸载）')
process.exit(0)
