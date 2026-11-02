#!/usr/bin/env node
/**
 * dsh-deep-research-doctor — 只读诊断（D40）。
 *
 * 检查：pack engines / custom profile roster / 安装副本版本 / 团队层 / 设置文件与工作区 /
 * 模型凭据。**不安装、不启动、不写 profile、不写设置**；修复动作只打印建议。
 *
 * 退出码：0 = 无硬失败（可有 warning）；1 = 硬失败；2 = 用法/前置缺失。
 *
 * 用法：
 *   dsh-deep-research-doctor [--profile <name>] [--home <dir>] [--workspace <dir>] [--install-only]
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDshHome, resolvePathInput } from './lib/dsh-home.mjs'
import { inferInstallAnchor } from './lib/install-anchor.mjs'
import { credentialStatus } from './lib/credentials-status.mjs'
import {
  PACK_NAME, WEB_APP_BUNDLE, checkEngines, installedPackVersion, packManifest,
  profileBundles, profileDirectory, readProfileManifest,
} from './lib/profile-read.mjs'
import { installedTeamVersion, TEAM_LAYER } from './lib/team-layer.mjs'

const PACK = resolve(fileURLToPath(new URL('..', import.meta.url)))
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))
const argv = process.argv.slice(2)
const installOnly = argv.includes('--install-only')

const argValue = (name) => {
  const index = argv.indexOf(`--${name}`)
  if (index === -1) return null
  const value = argv[index + 1]
  if (value === undefined || value === '' || value.startsWith('-')) {
    console.error(`doctor: --${name} 需要一个值`)
    process.exit(2)
  }
  return value
}
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('用法：dsh-deep-research-doctor [--profile <name>] [--home <dir>] [--workspace <dir>] [--install-only]')
  process.exit(0)
}

const failures = []
const warnings = []
const record = (ok, label, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === '' ? '' : ` — ${detail}`}`)
  if (!ok) failures.push(label)
}
const warn = (label, detail) => {
  console.log(`warn ${label}${detail === '' ? '' : ` — ${detail}`}`)
  warnings.push(label)
}

const home = resolvePathInput(argValue('home') ?? resolveDshHome(process.env))
const profile = argValue('profile') ?? 'deep-research'
const profileDir = profileDirectory(home, profile)
const workspaceArg = argValue('workspace')

// 1) pack manifest + engines
const pack = packManifest(PACK)
record(pack.version === String(pkg.version), 'pack 版本', `${pack.version}`)
let anchor = null
try {
  anchor = inferInstallAnchor({ explicit: argValue('install-anchor'), env: process.env })
} catch (error) {
  warn('安装锚', `${error instanceof Error ? error.message : String(error)}`)
}
if (anchor === null) warn('安装锚', '找不到运行中的 DSH；版本门未验证（用 --install-anchor 指定）')
else {
  const engines = checkEngines({ packVersion: pack.version, enginesDsh: pack.enginesDsh, dshVersion: anchor.version })
  record(engines.ok, 'engines.dsh', engines.error ?? `DSH ${anchor.version} 满足 ${pack.enginesDsh}`)
}

// 2) profile roster
const manifest = existsSync(join(profileDir, 'package.json')) ? readProfileManifest(profileDir) : null
if (manifest === null) {
  record(false, 'custom profile', `${profileDir} 不存在——先 \`dsh --profile ${profile} --from-default-profile web --dump-default-config\``)
} else {
  const bundles = profileBundles(manifest)
  record(bundles.includes('@deepseek-ai/dsh-base'), 'profile base bundle', bundles.join(', '))
  record(bundles.includes(WEB_APP_BUNDLE), 'profile web-app bundle', WEB_APP_BUNDLE)
  record(bundles.includes(PACK_NAME), 'profile 含本包', `${PACK_NAME}；装法 = dsh plugin --profile ${profile} add ${PACK_NAME}@${pack.version}`)
  record(bundles.includes(TEAM_LAYER), 'profile 含团队层', TEAM_LAYER)
  const installed = installedPackVersion(profileDir)
  record(installed === pack.version, '安装副本版本', `${installed ?? '未安装'}（pack ${pack.version}）`)
  const team = installedTeamVersion(profileDir)
  if (team === null) warn('团队层版本', '未安装；README §部署 的 dsh plugin 命令会补')
  else if (anchor !== null && team !== anchor.version) warn('团队层版本', `${team} ≠ DSH ${anchor.version}`)
  else record(true, '团队层版本', `${team}`)
}

// 3) deep-research 设置文件与工作区（只读）
let settingsWorkspace = null
const settingsPath = join(home, 'deep-research', 'settings.json')
if (existsSync(settingsPath)) {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, 'utf8'))
    if (parsed?.schemaVersion !== 2) warn('deep-research 设置文件', `${settingsPath} schemaVersion=${String(parsed?.schemaVersion)}（期望 2）`)
    else if (typeof parsed.workspace === 'string') settingsWorkspace = parsed.workspace
    else warn('deep-research 设置文件', 'schema 2 但没有 workspace——首屏 onboarding 会询问')
  } catch (error) {
    warn('deep-research 设置文件', `${settingsPath} 不可读/坏 JSON：${error instanceof Error ? error.message : String(error)}`)
  }
}
const workspace = workspaceArg ?? process.env.DEEP_RESEARCH_WORKSPACE ?? settingsWorkspace
if (workspace === null || workspace === undefined || workspace === '') {
  warn('工作区', '未设置（首屏 onboarding 会询问；脚本/CI 用 DEEP_RESEARCH_WORKSPACE）')
} else {
  const path = resolve(resolvePathInput(workspace, homedir()))
  if (!existsSync(path)) warn('工作区', `${path} 不存在`)
  else record(true, '工作区', path)
}

// 4) 凭据（安装验收可跳过）
if (!installOnly) {
  const credentials = credentialStatus({ dshHome: home, workspace: workspace ?? null })
  if (credentials.ok) record(true, '模型凭据', `${credentials.source}：${credentials.detail}`)
  else warn('模型凭据', credentials.detail)
} else {
  console.log('ok   模型凭据 — --install-only 跳过')
}

console.log(`\ndoctor: ${failures.length === 0 ? '通过' : `${failures.length} 项失败`}${warnings.length === 0 ? '' : `，${warnings.length} 项警告`}`)
process.exit(failures.length === 0 ? 0 : 1)
