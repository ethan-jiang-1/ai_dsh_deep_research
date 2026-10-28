#!/usr/bin/env node
// upgrade-smoke.mjs — 分发/升级面：当前版 → 模拟下一版 → 回滚当前版（keyless，不调模型）。
//
// 证明什么：profile 安装/覆盖安装/卸载、dump-config 行仍在、工作区种子升级保留用户文件、
// 旧版回滚不降级覆盖新种子。next pack 由当前 pack 复制并 bump version/seed 生成，不是 npm 发布物。
//
// 前置：全局 dsh（版本满足 pack engines）、_dist 当前 tarball、npm 可用。
// 用法：node scripts/smoke/upgrade-smoke.mjs
// 退出码：0 全绿 / 断言红 / 2 前置缺席（未跑 ≠ 通过）
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../../packages/deep-research-pack/scripts/lib/seed-core.mjs'
import { satisfiesVersion } from '../../packages/deep-research-pack/scripts/lib/version-range.mjs'
import { scrubbedEnv } from '../lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
// 下一版 = 当前版本 patch +1（写死版本号会在发版后与 pkg.version 撞车：0.1.3 时代
// 写死 0.1.3 使“回滚”实际没降级，两例回滚断言静默失效——2026-10-28 自审实红）。
const NEXT_VERSION = (() => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version)
  if (m === null) throw new Error(`upgrade-smoke: 无法从 ${pkg.version} 推导下一版`)
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`
})()
const CURRENT = join(ROOT, '_dist', `dsh-deep-research-pack-${pkg.version}.tgz`)
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `upgrade-smoke-${process.pid}`)
const HOME = join(TEMP, 'home')
const PROFILE = 'upgrade-smoke'
const WS = join(TEMP, 'ws')
const NEXT_PACK = join(TEMP, `pack-${NEXT_VERSION}`)
const failures = []
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const dsh = (args) => spawnSync('dsh', args, { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }), timeout: 180_000 })
const installed = join(HOME, 'profiles', PROFILE, 'node_modules', 'dsh-deep-research-pack')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

if (!existsSync(CURRENT)) { console.error(`upgrade-smoke: tarball 缺席（${CURRENT}）——先 export-dist`); process.exit(2) }
const version = spawnSync('dsh', ['--version'], { encoding: 'utf8' })
const found = version.status === 0 ? (String(version.stdout).match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null) : null
if (found === null || !satisfiesVersion(found, pkg.engines.dsh)) { console.error(`upgrade-smoke: 全局 dsh ${found ?? '不可用'} 不满足 ${pkg.engines.dsh}——未跑`); process.exit(2) }

rmSync(TEMP, { recursive: true, force: true })
mkdirSync(HOME, { recursive: true })
try {
  check(dsh(['--profile', PROFILE, '--from-default-profile', 'web', '--dump-config']).status === 0, '初始化 profile')
  check(dsh(['plugin', '--profile', PROFILE, 'add', `file:${CURRENT}`]).status === 0, '安装当前版本')
  check(dsh(['--profile', PROFILE, '--dump-config']).stdout.includes('preset-lead'), '当前版本 dump-config 见 preset-lead')
  const P = join(installed, 'scripts', 'scaffold.mjs')
  check(spawnSync(process.execPath, [P, '--seed-only', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) }).status === 0, '当前版本铺工作区')
  writeFileSync(join(WS, 'AGENTS.md'), '# user AGENTS upgrade\n')
  writeFileSync(join(WS, 'method-library.md'), '# user library upgrade\n')
  mkdirSync(join(WS, 'drt_keep'), { recursive: true })
  writeFileSync(join(WS, 'drt_keep', 'keep.md'), '# run bundle keep\n')
  const keepSession = join(HOME, 'sessions', '--user--', 'session-keep', 'session.v4.jsonl')
  mkdirSync(join(HOME, 'sessions', '--user--', 'session-keep'), { recursive: true })
  writeFileSync(keepSession, '{"type":"session/header","cwd":"/tmp/user"}\n')

  // 生成模拟下一版：复制 pack → bump version → 改 NODES → 更新 seed
  // 从**安装副本**复制下一版，验证 tarball 形状而不是源码工作树
  cpSync(installed, NEXT_PACK, { recursive: true })
  const nextPkgPath = join(NEXT_PACK, 'package.json')
  const nextPkg = readJson(nextPkgPath)
  nextPkg.version = NEXT_VERSION
  writeFileSync(nextPkgPath, `${JSON.stringify(nextPkg, null, 2)}\n`)
  const nodes = join(NEXT_PACK, 'workspace', 'NODES.md')
  writeFileSync(nodes, `${readFileSync(nodes, 'utf8')}\n<!-- upgrade-smoke ${NEXT_VERSION} -->\n`)
  const seedPath = join(NEXT_PACK, 'workspace', 'seed.json')
  const seed = readJson(seedPath)
  seed.version = NEXT_VERSION
  seed.files['NODES.md'] = sha256(readFileSync(nodes, 'utf8'))
  writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`)
  const packed = spawnSync('npm', ['pack', '--ignore-scripts', '--json'], {
    cwd: NEXT_PACK, encoding: 'utf8', env: scrubbedEnv({ npm_config_cache: join(TEMP, 'npm-cache') }),
  })
  const nextTarballName = (() => { try { return JSON.parse(packed.stdout)[0].filename } catch { return null } })()
  const nextTarball = nextTarballName === null ? null : join(NEXT_PACK, nextTarballName)
  check(packed.status === 0 && nextTarball !== null && existsSync(nextTarball), '生成模拟下一版 tarball', (packed.stderr || '').slice(-300))

  check(dsh(['plugin', '--profile', PROFILE, 'add', `file:${nextTarball}`]).status === 0, '覆盖安装下一版')
  check(readJson(join(installed, 'package.json')).version === NEXT_VERSION, '安装副本版本 = 下一版')
  check(dsh(['--profile', PROFILE, '--dump-config']).stdout.includes('preset-lead'), '下一版 dump-config 仍见 preset-lead')
  const nextScaffold = join(installed, 'scripts', 'scaffold.mjs')
  const checkUp = spawnSync(process.execPath, [nextScaffold, '--check', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) })
  check(checkUp.status === 1 && /stale|missing|版本落后/.test(checkUp.stdout), '下一版 --check 报需要升级')
  const upgrade = spawnSync(process.execPath, [nextScaffold, '--upgrade', '--seed-only', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) })
  check(upgrade.status === 0, '下一版 --upgrade 成功')
  check(readFileSync(join(WS, 'NODES.md'), 'utf8').includes(`upgrade-smoke ${NEXT_VERSION}`), '新种子 NODES 已升级')
  check(readFileSync(join(WS, 'AGENTS.md'), 'utf8') === '# user AGENTS upgrade\n' && existsSync(join(WS, 'AGENTS.md.seed-new')), '用户 AGENTS 保留 + sidecar')
  check(readFileSync(join(WS, 'method-library.md'), 'utf8') === '# user library upgrade\n', '方法库保留')
  check(readFileSync(join(WS, 'drt_keep', 'keep.md'), 'utf8') === '# run bundle keep\n', '升级不触碰已有 run bundle')
  check(readFileSync(keepSession, 'utf8').includes('session/header'), '升级不触碰 home session')
  check(readJson(join(WS, '.dsh-research-seed.json')).version === NEXT_VERSION, '种子状态升到下一版')

  check(dsh(['plugin', '--profile', PROFILE, 'add', `file:${CURRENT}`]).status === 0, '回滚安装当前版本')
  const backScaffold = join(installed, 'scripts', 'scaffold.mjs')
  const backCheck = spawnSync(process.execPath, [backScaffold, '--check', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) })
  check(backCheck.status === 1 && /拒绝自动降级|记录比 pack 新/.test(backCheck.stdout), '回滚 --check 拒绝自动降级')
  const backUp = spawnSync(process.execPath, [backScaffold, '--upgrade', '--seed-only', '--workspace', WS], { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: HOME }) })
  check(backUp.status === 1 && readFileSync(join(WS, 'NODES.md'), 'utf8').includes(`upgrade-smoke ${NEXT_VERSION}`), '回滚 --upgrade 拒绝且保留新种子')

  check(dsh(['plugin', '--profile', PROFILE, 'remove', 'dsh-deep-research-pack']).status === 0, '卸载')
  const manifest = readJson(join(HOME, 'profiles', PROFILE, 'package.json'))
  check(!(manifest?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack') && manifest?.dependencies?.['dsh-deep-research-pack'] === undefined, '卸载后 profile 无插件痕迹')
} catch (error) {
  check(false, 'smoke 未抛异常', String(error))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

if (failures.length > 0) {
  console.error(`\nupgrade-smoke: ${failures.length} 项失败`)
  process.exit(1)
}
console.log('upgrade-smoke: ALL PASS（安装 → 下一版 → 回滚；profile + 种子）')
process.exit(0)
