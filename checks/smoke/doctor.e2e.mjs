#!/usr/bin/env node
// doctor.e2e — 只读 doctor 的 keyless 判据（D40）：真入口、假 anchor/profile/home。
//
// 证：齐全绿 / 缺 pack 红 / engines 不匹配红 / 坏设置 warn 不红 / 不写 profile。
// 前置：无（Node 标准库）；不联网、不起 dsh。
// 用法：node checks/smoke/doctor.e2e.mjs
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { scrubbedEnv } from '../lib/shared/env.mjs'
import { displayMetaTargetsOf, packSpecifiersOf, runtimeJsPathsOf } from '../lib/repo/shipped-surface.mjs'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DOCTOR = join(PACK, 'scripts', 'doctor.mjs')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `doctor.e2e-${process.pid}`)
const ANCHOR_VERSION = '0.2.1-rc.2'
const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'

const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      → ${detail}`}`)
  if (!ok) failures.push(name)
}
const packPkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const packVersion = packPkg.version
const packPatchYamls = (packPkg.dsh?.bundle?.patch ?? []).map((rel) => readFileSync(join(PACK, rel), 'utf8'))
const packMetaTargets = displayMetaTargetsOf(packSpecifiersOf(packPatchYamls), packPkg)

function sandbox() {
  rmSync(TEMP, { recursive: true, force: true })
  const home = join(TEMP, 'home')
  const anchor = join(TEMP, 'anchor')
  const ws = join(TEMP, 'ws')
  const profile = join(home, 'profiles', 'deep-research')
  for (const dir of [home, anchor, ws, profile, join(profile, 'node_modules', 'dsh-deep-research-pack'),
    join(profile, 'node_modules', ...TEAM.split('/')), join(home, 'deep-research')]) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(join(anchor, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: ANCHOR_VERSION, type: 'module' }))
  const installed = join(profile, 'node_modules', 'dsh-deep-research-pack')
  writeFileSync(join(installed, 'package.json'), JSON.stringify({ name: 'dsh-deep-research-pack', version: packVersion }))
  writeFileSync(join(installed, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  for (const rel of (packPkg.dsh?.bundle?.patch ?? []).map((p) => p.replace(/^\.\//, ''))) {
    const abs = join(installed, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, '')
  }
  mkdirSync(join(installed, 'lib'), { recursive: true })
  for (const rel of runtimeJsPathsOf(packPkg)) {
    writeFileSync(join(installed, rel), '')
  }
  mkdirSync(join(installed, 'content'), { recursive: true })
  writeFileSync(join(installed, 'content', 'manual.md'), '')
  for (const { localeDir } of packMetaTargets) {
    mkdirSync(join(installed, localeDir), { recursive: true })
    writeFileSync(join(installed, localeDir, 'en.json'), '{}')
    writeFileSync(join(installed, localeDir, 'zh.json'), '{}')
  }
  writeFileSync(join(profile, 'node_modules', ...TEAM.split('/'), 'package.json'), JSON.stringify({ name: TEAM, version: ANCHOR_VERSION }))
  writeFileSync(join(home, 'deep-research', 'settings.json'), JSON.stringify({ schemaVersion: 2, workspace: ws, updatedAt: new Date().toISOString() }))
  return { home, anchor, ws, profile }
}

function writeProfile(profile, { withPack = true } = {}) {
  const bundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', TEAM]
  if (withPack) bundles.push('dsh-deep-research-pack')
  writeFileSync(join(profile, 'package.json'), JSON.stringify({
    name: 'deep-research',
    dependencies: { 'dsh-deep-research-pack': packVersion, [TEAM]: ANCHOR_VERSION },
    dsh: { profile: { bundles } },
  }))
}

function runDoctor({ home, anchor, ws, extra = [], path = null }) {
  return spawnSync(process.execPath, [DOCTOR, '--profile', 'deep-research', '--home', home,
    '--install-anchor', join(anchor, 'package.json'), '--workspace', ws, '--install-only', ...extra],
  { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: home, DEEP_RESEARCH_WORKSPACE: '', ...(path === null ? {} : { PATH: path }) }) })
}

/** 假 dsh：只回 `--dump-config` 的行名（不起服务、不联网），用于挂载行探针的正/负判据。 */
function installFakeDsh(binDir, names) {
  mkdirSync(binDir, { recursive: true })
  const script = join(binDir, 'dump.mjs')
  writeFileSync(script, `const names = ${JSON.stringify(names)}\nfor (const name of names) console.log('  name: ' + name)\n`)
  const bin = join(binDir, 'dsh')
  writeFileSync(bin, `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`)
  chmodSync(bin, 0o755)
}

const box = sandbox()
try {
  writeProfile(box.profile)
  const ok = runDoctor(box)
  check('齐全：doctor 通过', ok.status === 0 && ok.stdout.includes('doctor: 通过'), `${ok.status}\n${ok.stdout}\n${ok.stderr}`)
  check('齐全：输出 profile/工作区/团队层', /profile 含本包/.test(ok.stdout) && /工作区/.test(ok.stdout) && /团队层版本/.test(ok.stdout), ok.stdout)

  writeProfile(box.profile, { withPack: false })
  const missing = runDoctor(box)
  check('缺 pack：exit 1 且点名', missing.status === 1 && /profile 含本包/.test(missing.stdout), `${missing.status}\n${missing.stdout}`)

  writeProfile(box.profile)
  writeFileSync(join(box.anchor, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '9.9.9', type: 'module' }))
  const engines = runDoctor(box)
  check('engines 不匹配：exit 1 且点名', engines.status === 1 && /engines\.dsh/.test(engines.stdout), `${engines.status}\n${engines.stdout}`)

  writeFileSync(join(box.anchor, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: ANCHOR_VERSION, type: 'module' }))
  rmSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'lib', 'client.js'))
  const half = runDoctor(box)
  check('半装：缺安装副本 client 产物 → exit 1 且点名', half.status === 1 && /安装副本完整性/.test(half.stdout), `${half.status}\n${half.stdout}`)
  writeFileSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'lib', 'client.js'), '')
  rmSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'lib', 'startup.js'))
  const halfStartup = runDoctor(box)
  check('半装：缺 startup 行产物 → exit 1 且点名', halfStartup.status === 1 && /安装副本完整性/.test(halfStartup.stdout), `${halfStartup.status}\n${halfStartup.stdout}`)
  writeFileSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'lib', 'startup.js'), '')

  rmSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'lib', 'defaults.js'))
  const halfDefaults = runDoctor(box)
  check('半装：缺 defaults 行产物 → exit 1 且点名 lib/defaults.js', halfDefaults.status === 1 && /lib\/defaults\.js/.test(halfDefaults.stdout), `${halfDefaults.status}\n${halfDefaults.stdout}`)
  writeFileSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'lib', 'defaults.js'), '')

  rmSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'workers', 'research-wave.patch.yml'))
  const halfWorker = runDoctor(box)
  check('半装：缺 worker patch → exit 1 且点名 workers/research-wave.patch.yml', halfWorker.status === 1 && /workers\/research-wave\.patch\.yml/.test(halfWorker.stdout), `${halfWorker.status}\n${halfWorker.stdout}`)
  writeFileSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'workers', 'research-wave.patch.yml'), '')

  rmSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'locale-defaults', 'zh.json'))
  const halfLocale = runDoctor(box)
  check('半装：缺子路径 locale → exit 1 且点名 locale-defaults/zh.json', halfLocale.status === 1 && /locale-defaults\/zh\.json/.test(halfLocale.stdout), `${halfLocale.status}\n${halfLocale.stdout}`)
  writeFileSync(join(box.profile, 'node_modules', 'dsh-deep-research-pack', 'locale-defaults', 'zh.json'), '{}')

  writeFileSync(join(box.home, 'deep-research', 'settings.json'), '{not json')
  const corrupt = runDoctor(box)
  check('坏设置：warn 不红', corrupt.status === 0 && /deep-research 设置文件/.test(corrupt.stdout), `${corrupt.status}\n${corrupt.stdout}`)
  check('doctor 不写 profile', readFileSync(join(box.profile, 'package.json'), 'utf8').includes('dsh-deep-research-pack'))

  // 挂载行探针（2026-11-25 接手诊断 D10）：真 profile 形态（含 cordis.yml）+ 假 dsh 回 dump。
  // 正判据 = 行全在 → 通过；负判据 = 少一行 → exit 1 且点名该行。
  const packNames = [...readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8')
    .matchAll(/name:\s*'?(dsh-deep-research-pack[^'\s]*)'?/g)].map((match) => match[1])
  writeFileSync(join(box.profile, 'cordis.yml'), '# doctor.e2e probe\n')
  const mountedBin = join(TEMP, 'bin-mounted')
  installFakeDsh(mountedBin, packNames)
  const mounted = runDoctor({ ...box, path: `${mountedBin}:${process.env.PATH ?? ''}` })
  check('挂载行：本包行全在 effective config → 通过',
    mounted.status === 0 && new RegExp(`挂载行 — ${packNames.length} 个本包行`).test(mounted.stdout), `${mounted.status}\n${mounted.stdout}`)
  const missingBin = join(TEMP, 'bin-missing')
  installFakeDsh(missingBin, packNames.filter((name) => name !== 'dsh-deep-research-pack/startup'))
  const missingRow = runDoctor({ ...box, path: `${missingBin}:${process.env.PATH ?? ''}` })
  check('挂载行：缺 startup 行 → exit 1 且点名',
    missingRow.status === 1 && /effective config 缺 .*startup/.test(missingRow.stdout), `${missingRow.status}\n${missingRow.stdout}`)
  rmSync(join(box.profile, 'cordis.yml'))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

console.log(`\ndoctor.e2e: ${failures.length === 0 ? 'ALL PASS' : `${failures.length} FAIL`}`)
process.exit(failures.length === 0 ? 0 : 1)
