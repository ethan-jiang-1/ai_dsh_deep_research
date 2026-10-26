#!/usr/bin/env node
// user-env-smoke.mjs — 用户已有 DSH 环境：别的 bundle + 用户 overlay + session/凭据/workspace。
// 只证安装/卸载不改写用户数据与别的 bundle，不证 DSH 运行时行为（release/cold 负责）。
// 用法：node scripts/smoke/user-env-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'
import { scrubbedEnv } from '../lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const TARBALL = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `user-env-${process.pid}`)
const HOME = join(TEMP, 'home')
const PROFILE = 'user-env'
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const dsh = (args) => spawnSync('dsh', args, { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }), timeout: 180_000 })
const profileDir = join(HOME, 'profiles', PROFILE)
const manifest = () => JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
const hash = (p) => sha256(readFileSync(p, 'utf8'))

if (!existsSync(TARBALL)) { console.error(`user-env-smoke: tarball 缺席（${TARBALL}）`); process.exit(2) }
const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
if (version.status !== 0) { console.error('user-env-smoke: 全局 dsh 不可用——未跑'); process.exit(2) }

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
try {
  check(dsh(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-config']).status === 0, '初始化用户 profile')

  // 另一个本地 inert bundle：覆盖 base 的 preset 默认值，用来观察共存/卸载是否误伤
  const other = join(TEMP, 'other-bundle')
  mkdirSync(other, { recursive: true })
  writeFileSync(join(other, 'package.json'), `${JSON.stringify({
    name: 'fixture-other-bundle', version: '0.0.1', type: 'module',
    dsh: { bundle: { patch: ['./cordis.patch.yml'] } },
    files: ['cordis.patch.yml'],
  }, null, 2)}\n`)
  writeFileSync(join(other, 'cordis.patch.yml'), '- id: agent-preset-registry\n  config:\n    default: standard\n')
  check(dsh(['plugin', '--profile', PROFILE, 'add', `file:${other}`]).status === 0, '安装别的 bundle')

  const overlay = join(profileDir, 'cordis.patch.yml')
  const overlayText = '- id: agent-preset-registry\n  config:\n    default: standard\n'
  writeFileSync(overlay, overlayText)
  const ws = join(TEMP, 'ws')
  mkdirSync(join(ws, 'drt_keep'), { recursive: true })
  writeFileSync(join(ws, 'AGENTS.md'), '# user workspace\n')
  writeFileSync(join(ws, 'method-library.md'), '# user library\n')
  writeFileSync(join(ws, 'drt_keep', 'keep.md'), '# keep\n')
  const session = join(HOME, 'sessions', '--user--', 'session-keep', 'session.v4.jsonl')
  mkdirSync(dirname(session), { recursive: true })
  writeFileSync(session, '{"type":"session/header","cwd":"/tmp/user"}\n')
  const creds = join(HOME, '.credentials' + '.yaml')
  writeFileSync(creds, 'DEEPSEEK_API_KEY: fake-not-used\n')
  const before = { overlay: hash(overlay), session: hash(session), creds: hash(creds), ws: hash(join(ws, 'AGENTS.md')) }

  check(dsh(['plugin', '--profile', PROFILE, 'add', `file:${TARBALL}`]).status === 0, '安装 pack 到已有环境')
  check((manifest()?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack')
    && (manifest()?.dsh?.profile?.bundles ?? []).includes('fixture-other-bundle'), '两个 bundle 都在 profile')
  check(hash(overlay) === before.overlay, '安装不改写用户 overlay')
  check(hash(session) === before.session, '安装不改写 session 日志')
  check(hash(creds) === before.creds, '安装不改写 credentials')
  check(hash(join(ws, 'AGENTS.md')) === before.ws, '安装不改写 workspace')
  const dump = dsh(['--profile', PROFILE, '--dump-config'])
  check(dump.status === 0 && /default:\s*standard/.test(dump.stdout), '用户 overlay 在 dump-config 生效')

  check(dsh(['plugin', '--profile', PROFILE, 'remove', 'dsh-deep-research-pack']).status === 0, '卸载 pack')
  check((manifest()?.dsh?.profile?.bundles ?? []).includes('fixture-other-bundle'), '卸载后别的 bundle 仍在')
  check(!(manifest()?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), '卸载后本包 bundle 消失')
  check(hash(overlay) === before.overlay && hash(session) === before.session && hash(creds) === before.creds && hash(join(ws, 'AGENTS.md')) === before.ws,
    '卸载不改写 overlay/session/credentials/workspace')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nuser-env-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('user-env-smoke: ALL PASS（已有 bundle + overlay + session/凭据/workspace 共存）')
process.exit(0)
