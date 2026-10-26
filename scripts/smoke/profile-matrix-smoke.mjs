#!/usr/bin/env node
// profile-matrix-smoke.mjs — 分发/安装矩阵（keyless，不调模型）：
// 多 profile 并存、损坏 tarball 拒绝、卸载/重装后 workspace 数据保留。
// 只证 profile 级安装形状与数据边界；不证 DSH 运行时行为（release-smoke/cold-start 负责）。
// 用法：node scripts/smoke/profile-matrix-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席
import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, truncateSync, writeFileSync } from 'node:fs'
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
  const wsB = join(TEMP, 'ws-b')
  const scaffoldB = join(installed('matrix-b'), 'scripts', 'scaffold.mjs')
  check(spawnSync(process.execPath, [scaffoldB, '--seed-only', '--workspace', wsB], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) }).status === 0, 'matrix-b 独立工作区铺种')
  writeFileSync(join(wsB, 'method-library.md'), '# B library\n')
  check(readFileSync(join(wsB, 'method-library.md'), 'utf8') === '# B library\n', '同 home 两 profile 的 workspace 数据互不影响')

  // 损坏 tarball：在第三个干净 profile 上安装，pnpm 必须失败且不出现半装本包
  check(dsh(['--profile', 'matrix-c', '--from-default-profile', 'web', '--dump-config']).status === 0, 'matrix-c 初始化')
  const corrupt = join(TEMP, 'corrupt.tgz')
  copyFileSync(TARBALL, corrupt)
  truncateSync(corrupt, 1024)
  const corruptAdd = dsh(['plugin', '--profile', 'matrix-c', 'add', `file:${corrupt}`])
  check(corruptAdd.status !== 0, '损坏 tarball 安装失败', (corruptAdd.stderr || '').slice(-300))
  const cManifest = manifest('matrix-c')
  const cLock = existsSync(join(profile('matrix-c'), 'pnpm-lock.yaml')) ? readFileSync(join(profile('matrix-c'), 'pnpm-lock.yaml'), 'utf8') : ''
  check(!(cManifest?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack')
    && cManifest?.dependencies?.['dsh-deep-research-pack'] === undefined
    && !existsSync(installed('matrix-c'))
    && !cLock.includes('dsh-deep-research-pack'), '损坏安装无 dependencies/bundles/node_modules 半装')
  check(dsh(['plugin', '--profile', 'matrix-c', 'add', `file:${TARBALL}`]).status === 0, '损坏失败后有效 tarball 可恢复安装')
  check((manifest('matrix-c')?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), '恢复安装后 bundle 在场')

  // 目录安装：file: 是安装时复制，移动源目录不立即断链；但重装/升级仍需要原路径
  const linkPack = join(TEMP, 'link-pack')
  const linkMoved = join(TEMP, 'link-moved')
  cpSync(PACK, linkPack, { recursive: true })
  check(dsh(['--profile', 'matrix-link', '--from-default-profile', 'web', '--dump-config']).status === 0, 'matrix-link 初始化')
  check(dsh(['plugin', '--profile', 'matrix-link', 'add', `file:${linkPack}`]).status === 0, '目录 file: 安装')
  check(dsh(['--profile', 'matrix-link', '--dump-config']).status === 0, '目录安装后 dump-config')
  renameSync(linkPack, linkMoved)
  check(dsh(['--profile', 'matrix-link', '--dump-config']).status === 0, '移动目录后已装副本仍可 dump-config')
  check(String(manifest('matrix-link')?.dependencies?.['dsh-deep-research-pack'] ?? '').endsWith('link-pack'), 'profile 仍记录旧绝对路径')
  check(dsh(['plugin', '--profile', 'matrix-link', 'add', `file:${linkPack}`]).status !== 0, '旧路径重装失败（断链）')
  check(dsh(['plugin', '--profile', 'matrix-link', 'remove', 'dsh-deep-research-pack']).status === 0, '移动后先移除旧路径依赖')
  const relink = dsh(['plugin', '--profile', 'matrix-link', 'add', `file:${linkMoved}`])
  check(relink.status === 0, '移除后新路径可重装', (relink.stderr || relink.stdout || '').slice(-400))
  check((manifest('matrix-link')?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), '新路径重装后 bundle 在场')

  // 用户 overlay：安装/卸载不得改写 profile 的 cordis.patch.yml
  check(dsh(['--profile', 'matrix-overlay', '--from-default-profile', 'web', '--dump-config']).status === 0, 'matrix-overlay 初始化')
  const overlay = join(profile('matrix-overlay'), 'cordis.patch.yml')
  const overlayText = '- id: agent-preset-registry\n  config:\n    default: standard\n'
  writeFileSync(overlay, overlayText)
  check(dsh(['plugin', '--profile', 'matrix-overlay', 'add', `file:${TARBALL}`]).status === 0, 'matrix-overlay 安装')
  check(readFileSync(overlay, 'utf8') === overlayText, '安装不改写用户 cordis.patch.yml')
  const overlayDump = dsh(['--profile', 'matrix-overlay', '--dump-config'])
  check(overlayDump.status === 0 && /default:\s*standard/.test(overlayDump.stdout), '用户 overlay 仍在 dump-config 生效')
  check(dsh(['plugin', '--profile', 'matrix-overlay', 'remove', 'dsh-deep-research-pack']).status === 0, 'matrix-overlay 卸载')
  check(readFileSync(overlay, 'utf8') === overlayText, '卸载不改写用户 cordis.patch.yml')

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
