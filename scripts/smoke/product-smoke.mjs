#!/usr/bin/env node
// product-smoke — L2 产品安装面：真 dsh/pnpm，装配 profile + 铺种子 + 设置 + 幂等/守卫。
//
// 证明：一条 `dsh-deep-research --setup-only` 在干净 home/workspace 得到 web+pack+team
// profile、种子、设置；重复执行幂等；危险目录拒绝；项目模式不碰项目根；.gitignore 不静默改；
// `--check` 只读；包目录零写入。
//
// 前置：repo 的 vendor/dsh 源码与 node_modules（或 PRODUCT_SMOKE_DSH 指向可用 dsh）、pnpm、
// 团队层 registry/缓存。缺前置 exit 2（不是绿）。
//
// 用法：node scripts/smoke/product-smoke.mjs
// 退出码：0 全绿 / 1 产品失败 / 2 未跑（前置缺失/网络）
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { scrubbedEnv } from '../lib/env.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const PACK_PKG = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const LAUNCH = join(PACK, 'scripts', 'launch.mjs')
const TEMP_ROOT = join(ROOT, 'runtime', 'smoke-workspace', `product-smoke-${process.pid}`)

const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      → ${detail}`}`)
  if (!ok) failures.push(name)
}
const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const canonical = (path) => {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

function notRun(reason) {
  console.error(`product-smoke: NOT-RUN — ${reason}`)
  console.error('  前置：repo vendor/dsh + node_modules（或 PRODUCT_SMOKE_DSH）、pnpm、团队层 registry/缓存')
  process.exit(2)
}

function makeSandbox(label) {
  const root = join(TEMP_ROOT, label)
  const home = join(root, 'home')
  const ws = join(root, 'ws')
  const bin = join(root, 'bin')
  for (const dir of [home, ws, bin]) mkdirSync(dir, { recursive: true })
  const provided = process.env.PRODUCT_SMOKE_DSH
  let dsh
  if (typeof provided === 'string' && provided !== '') {
    dsh = resolve(provided)
    if (!existsSync(dsh)) notRun(`PRODUCT_SMOKE_DSH 不存在：${dsh}`)
    writeFileSync(join(bin, 'dsh'), `#!/bin/sh\nexec ${dsh} "$@"\n`)
  } else {
    const binTs = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts')
    const tsx = join(ROOT, 'node_modules', 'tsx', 'dist', 'loader.mjs')
    if (!existsSync(binTs) || !existsSync(tsx)) notRun('vendor/dsh 源码或 tsx 不在位')
    dsh = join(bin, 'dsh')
    writeFileSync(dsh, `#!/bin/sh\nexport TSX_TSCONFIG_PATH=${JSON.stringify(join(ROOT, 'tsconfig.json'))}\nexec ${JSON.stringify(process.execPath)} --import ${JSON.stringify(tsx)} ${JSON.stringify(binTs)} "$@"\n`)
  }
  chmodSync(dsh, 0o755)
  chmodSync(join(bin, 'dsh'), 0o755)
  return {
    root,
    home,
    ws,
    bin,
    dsh,
    env: {
      ...scrubbedEnv(),
      DSH_HOME: home,
      DSH_BIN: dsh,
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      npm_config_cache: join(root, 'npm-cache'),
    },
  }
}

function runLauncher(sandbox, args, { timeout = 300_000 } = {}) {
  return spawnSync(process.execPath, [LAUNCH, ...args], { cwd: sandbox.ws, env: sandbox.env, encoding: 'utf8', timeout })
}

function setup(sandbox, profile, extra = []) {
  return runLauncher(sandbox, ['--workspace', sandbox.ws, '--home', sandbox.home, '--profile', profile, '--setup-only', ...extra])
}

function runDsh(sandbox, args, timeout = 300_000) {
  return spawnSync(sandbox.dsh, args, { cwd: sandbox.ws, env: sandbox.env, encoding: 'utf8', timeout })
}

function profileManifest(sandbox, profile) {
  return readJson(join(sandbox.home, 'profiles', profile, 'package.json'))
}

const networkish = (text) => /EAI_AGAIN|ENOTFOUND|ERR_PNPM|ECONNREFUSED|network|registry|offline/i.test(String(text ?? ''))

try {
  rmSync(TEMP_ROOT, { recursive: true, force: true })
  const sandbox = makeSandbox('main')

  // pack 源零写入基线
  const packFiles = ['cordis.patch.yml', 'workspace/seed.json', 'presets/lead.patch.yml', 'scripts/launch.mjs']
  const packBefore = Object.fromEntries(packFiles.map((rel) => [rel, sha(join(PACK, rel))]))

  const freshCheck = runLauncher(sandbox, ['--workspace', sandbox.ws, '--home', sandbox.home, '--profile', 'product-check', '--check'])
  check('干净 home 的 --check 只读（exit 1 且不建 profile）', freshCheck.status === 1 && !existsSync(join(sandbox.home, 'profiles', 'product-check')), `exit=${freshCheck.status}`)

  const first = setup(sandbox, 'product-smoke')
  if (first.status !== 0) {
    if (networkish(first.stdout + first.stderr)) notRun(`安装前置不可用（网络/registry/pnpm）：${(first.stderr || first.stdout).trim().split('\n').slice(-4).join(' ')}`)
    check('首装 exit 0', false, `exit=${first.status}\n${(first.stderr || first.stdout).trim().split('\n').slice(-16).join('\n')}`)
    throw new Error('first setup failed')
  }
  check('首装 exit 0', true)

  const manifest = profileManifest(sandbox, 'product-smoke')
  const bundles = manifest?.dsh?.profile?.bundles ?? []
  check('profile bundles 顺序 = base → web-app → pack → team',
    JSON.stringify(bundles) === JSON.stringify(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-deep-research-pack', '@deepseek-ai/dsh-experimental-agent-team-profile']),
    JSON.stringify(bundles))
  const installedPack = join(sandbox.home, 'profiles', 'product-smoke', 'node_modules', 'dsh-deep-research-pack', 'package.json')
  check('profile 安装副本版本 = pack 版本', existsSync(installedPack) && readJson(installedPack).version === PACK_PKG.version, `${existsSync(installedPack) ? readJson(installedPack).version : '未安装'} vs ${PACK_PKG.version}`)

  for (const rel of ['AGENTS.md', 'NODES.md', 'question-patterns.md', 'templates/run', '.gitignore', '.dsh-research-seed.json']) {
    check(`工作区种子 ${rel}`, existsSync(join(sandbox.ws, rel)))
  }
  const settingsPath = join(sandbox.home, 'profiles', 'product-smoke', 'deep-research.launcher.json')
  const settings = existsSync(settingsPath) ? readJson(settingsPath) : null
  check('启动器设置在场且 workspace 正确', settings?.schemaVersion === 1 && canonical(settings.workspace) === canonical(sandbox.ws), JSON.stringify(settings))

  const firstManifestHash = sha(join(sandbox.home, 'profiles', 'product-smoke', 'package.json'))
  const firstAgentsHash = sha(join(sandbox.ws, 'AGENTS.md'))
  const second = setup(sandbox, 'product-smoke')
  check('重复 setup exit 0', second.status === 0, second.stderr?.slice(-200) ?? '')
  check('重复 setup 不改 profile manifest', sha(join(sandbox.home, 'profiles', 'product-smoke', 'package.json')) === firstManifestHash)
  check('重复 setup 不改种子 AGENTS.md', sha(join(sandbox.ws, 'AGENTS.md')) === firstAgentsHash)

  const checked = runLauncher(sandbox, ['--workspace', sandbox.ws, '--home', sandbox.home, '--profile', 'product-smoke', '--check'])
  check('--check exit 0', checked.status === 0, (checked.stdout + checked.stderr).slice(-400))

  const bad = runLauncher(sandbox, ['--workspace', sandbox.home, '--home', sandbox.home, '--profile', 'product-smoke', '--setup-only'])
  check('危险目录（DSH_HOME 本身）拒绝', bad.status !== 0 && /工作区|DSH_HOME|HOME/.test(`${bad.stdout}${bad.stderr}`), `${bad.status} ${(bad.stdout + bad.stderr).slice(-200)}`)

  // 项目模式：非空项目 → <project>/research；不碰项目根；.gitignore 不静默改
  const project = join(sandbox.root, 'project')
  mkdirSync(project, { recursive: true })
  writeFileSync(join(project, 'README.md'), '# project\n')
  writeFileSync(join(project, '.gitignore'), 'custom-rule\n')
  const projectRun = runLauncher(sandbox, ['--workspace', project, '--home', sandbox.home, '--profile', 'product-project', '--setup-only'])
  check('项目模式 setup exit 0', projectRun.status === 0, (projectRun.stdout + projectRun.stderr).slice(-300))
  check('项目根未被铺种子（无 AGENTS.md）', !existsSync(join(project, 'AGENTS.md')))
  check('研究子目录已铺种子', existsSync(join(project, 'research', 'AGENTS.md')))
  check('项目 .gitignore 未被静默改', readFileSync(join(project, '.gitignore'), 'utf8') === 'custom-rule\n')
  const append = runLauncher(sandbox, ['--workspace', project, '--home', sandbox.home, '--profile', 'product-project', '--setup-only', '--gitignore-append'])
  check('--gitignore-append exit 0', append.status === 0, (append.stdout + append.stderr).slice(-200))
  check('研究子目录 .gitignore 有托管块', readFileSync(join(project, 'research', '.gitignore'), 'utf8').includes('# deep-research (managed)'))

  // 包源零写入
  for (const rel of packFiles) {
    check(`包源未被写：${rel}`, sha(join(PACK, rel)) === packBefore[rel])
  }

  // 原生 DSH 路径（手册主路径）：web profile + dsh plugin add + 安装副本 scaffold。
  const native = makeSandbox('native')
  const nativeAdd = runDsh(native, ['plugin', '--profile', 'web', 'add', `file:${PACK}`])
  check('原生 dsh plugin add（web profile）exit 0', nativeAdd.status === 0, (nativeAdd.stderr || nativeAdd.stdout).slice(-400))
  const webManifest = existsSync(join(native.home, 'profiles', 'web', 'package.json')) ? readJson(join(native.home, 'profiles', 'web', 'package.json')) : null
  check('原生 web profile bundle 含 pack', (webManifest?.dsh?.profile?.bundles ?? []).includes('dsh-deep-research-pack'), JSON.stringify(webManifest?.dsh?.profile?.bundles ?? []))
  const nativeScaffold = join(native.home, 'profiles', 'web', 'node_modules', '.bin', 'dsh-deep-research-scaffold')
  const nativeSeed = existsSync(nativeScaffold) ? spawnSync(nativeScaffold, ['--install-only', '--workspace', native.ws, '--profile', 'web'], { cwd: native.ws, env: native.env, encoding: 'utf8', timeout: 300_000 }) : null
  check('原生安装副本 scaffold 铺种子', nativeSeed !== null && nativeSeed.status === 0 && existsSync(join(native.ws, 'AGENTS.md')) && existsSync(join(native.ws, 'templates', 'run')), nativeSeed === null ? 'scaffold bin 不在' : (nativeSeed.stderr || nativeSeed.stdout).slice(-400))

  // 半装：dependency 在、bundle 缺 → fail-loud，不假绿
  const halfProfile = 'product-half'
  const half = setup(sandbox, halfProfile)
  if (half.status === 0) {
    const manifestPath = join(sandbox.home, 'profiles', halfProfile, 'package.json')
    const halfManifest = readJson(manifestPath)
    halfManifest.dsh.profile.bundles = halfManifest.dsh.profile.bundles.filter((name) => name !== 'dsh-deep-research-pack')
    writeFileSync(manifestPath, JSON.stringify(halfManifest, null, 2) + '\n')
    const repaired = setup(sandbox, halfProfile)
    check('半装被读回并拒绝/修复（不 exit 0 假绿）', repaired.status !== 0 || (profileManifest(sandbox, halfProfile).dsh.profile.bundles ?? []).includes('dsh-deep-research-pack'), `${repaired.status} ${(repaired.stdout + repaired.stderr).slice(-300)}`)
  } else {
    check('半装前置 profile 可装', false, (half.stdout + half.stderr).slice(-300))
  }

  if (failures.length > 0) {
    console.error(`\nproduct-smoke: RED（${failures.length} 处失败；现场保留 = ${TEMP_ROOT}）`)
    process.exit(1)
  }
  rmSync(TEMP_ROOT, { recursive: true, force: true })
  console.log('\nproduct-smoke: GREEN（装配/种子/设置/幂等/守卫/项目模式/零写入）')
  process.exit(0)
} catch (error) {
  console.error(`product-smoke: RED — ${String(error?.message ?? error)}`)
  console.error(`  现场保留 = ${TEMP_ROOT}`)
  process.exit(1)
}
