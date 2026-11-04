#!/usr/bin/env node
// doctor-smoke — 只读 doctor 的 keyless 判据（D40）：真入口、假 anchor/profile/home。
//
// 证：齐全绿 / 缺 pack 红 / engines 不匹配红 / 坏设置 warn 不红 / 不写 profile。
// 前置：无（Node 标准库）；不联网、不起 dsh。
// 用法：node scripts/smoke/doctor-smoke.mjs
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { scrubbedEnv } from '../lib/env.mjs'
import { presetRoles } from '../lib/roles.mjs'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DOCTOR = join(PACK, 'scripts', 'doctor.mjs')
const TEMP = join(ROOT, 'runtime', 'smoke-workspace', `doctor-smoke-${process.pid}`)
const ANCHOR_VERSION = '0.2.1-rc.2'
const TEAM = '@deepseek-ai/dsh-experimental-agent-team-profile'

const failures = []
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : `\n      → ${detail}`}`)
  if (!ok) failures.push(name)
}
const packVersion = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).version

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
  writeFileSync(join(installed, 'cordis.patch.yml'), '')
  mkdirSync(join(installed, 'presets'), { recursive: true })
  for (const role of presetRoles(ROOT)) {
    writeFileSync(join(installed, 'presets', `${role}.patch.yml`), '')
  }
  mkdirSync(join(installed, 'lib'), { recursive: true })
  for (const file of ['client.js', 'index.js', 'startup.js', 'content.js', 'fetch-fallback.js', 'method-library-tool.js']) {
    writeFileSync(join(installed, 'lib', file), '')
  }
  mkdirSync(join(installed, 'content'), { recursive: true })
  writeFileSync(join(installed, 'content', 'manual.md'), '')
  mkdirSync(join(installed, 'locale'), { recursive: true })
  writeFileSync(join(installed, 'locale', 'en.json'), '{}')
  writeFileSync(join(installed, 'locale', 'zh.json'), '{}')
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

function runDoctor({ home, anchor, ws, extra = [] }) {
  return spawnSync(process.execPath, [DOCTOR, '--profile', 'deep-research', '--home', home,
    '--install-anchor', join(anchor, 'package.json'), '--workspace', ws, '--install-only', ...extra],
  { encoding: 'utf8', env: scrubbedEnv({ DSH_HOME: home, DEEP_RESEARCH_WORKSPACE: '' }) })
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

  writeFileSync(join(box.home, 'deep-research', 'settings.json'), '{not json')
  const corrupt = runDoctor(box)
  check('坏设置：warn 不红', corrupt.status === 0 && /deep-research 设置文件/.test(corrupt.stdout), `${corrupt.status}\n${corrupt.stdout}`)
  check('doctor 不写 profile', readFileSync(join(box.profile, 'package.json'), 'utf8').includes('dsh-deep-research-pack'))
} finally {
  rmSync(TEMP, { recursive: true, force: true })
}

console.log(`\ndoctor-smoke: ${failures.length === 0 ? 'ALL PASS' : `${failures.length} FAIL`}`)
process.exit(failures.length === 0 ? 0 : 1)
