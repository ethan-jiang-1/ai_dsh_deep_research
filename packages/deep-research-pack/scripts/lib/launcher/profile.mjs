/**
 * profile — 产品 profile 的装配与读回（D38）。
 *
 * 唯一受支持的装配路径：`dsh --profile <p> --from-default-profile web`（仅首次）→
 * `dsh plugin --profile <p> add file:<pack>` → `dsh plugin ... add <team-layer>`。
 * 不手写 profile 目录；不重置已有 profile；不触碰用户 patch。
 *
 * 读回四层状态：包版本、bundle list、安装副本、团队层版本；半装/失败 fail-loud。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, isAbsolute, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { ensureTeamLayer, installedTeamVersion, resolveTeamVersion, TEAM_LAYER } from '../team-layer.mjs'
import { inferInstallAnchor } from '../install-anchor.mjs'
import { satisfiesVersion } from '../version-range.mjs'
import { validateProfileName } from '../deploy-args.mjs'

/** 产品 bundle 名（package name）。 */
export const PACK_NAME = 'dsh-deep-research-pack'

/** Web 模板的必需 bundle。 */
export const WEB_APP_BUNDLE = '@deepseek-ai/dsh-web-app'

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

const inside = (root, target) => {
  const rel = relative(resolve(root), resolve(target))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * profile 目录。
 * @param {string} home
 * @param {string} profile
 * @returns {string}
 */
export function profileDirectory(home, profile) {
  if (!validateProfileName(profile)) throw new Error(`profile 名不合法：${JSON.stringify(profile)}`)
  return join(home, 'profiles', profile)
}

/**
 * 读 profile manifest。
 * @param {string} profileDir
 * @returns {object | null}
 */
export function readProfileManifest(profileDir) {
  return readJson(join(profileDir, 'package.json'))
}

/**
 * bundle list。
 * @param {object | null} manifest
 * @returns {string[]}
 */
export function profileBundles(manifest) {
  const bundles = manifest?.dsh?.profile?.bundles
  return Array.isArray(bundles) ? bundles.filter((value) => typeof value === 'string') : []
}

/**
 * 安装副本版本。
 * @param {string} profileDir
 * @returns {string | null}
 */
export function installedPackVersion(profileDir) {
  return readJson(join(profileDir, 'node_modules', PACK_NAME, 'package.json'))?.version ?? null
}

const tail = (text, lines = 6) => String(text ?? '').trim().split('\n').slice(-lines).join('\n')

/**
 * 跑 dsh 子命令；返回 status/stdout/stderr。
 * @param {string} dshBin
 * @param {string[]} args
 * @param {{ env: NodeJS.ProcessEnv, cwd: string }} options
 * @returns {{ ok: boolean, status: number | null, stdout: string, stderr: string, error: NodeJS.ErrnoException | null }}
 */
export function runDsh(dshBin, args, { env, cwd }) {
  const run = spawnSync(dshBin, args, { encoding: 'utf8', env, cwd })
  return {
    ok: run.status === 0 && run.error === undefined,
    status: run.status ?? null,
    stdout: String(run.stdout ?? ''),
    stderr: String(run.stderr ?? ''),
    error: run.error ?? null,
  }
}

/**
 * pnpm 是否可用（`dsh plugin` 的安装前置）。
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean}
 */
export function hasPnpm(env = process.env) {
  const run = spawnSync('pnpm', ['--version'], { encoding: 'utf8', env })
  return run.status === 0
}

/**
 * 读运行中的 DSH 版本（安装锚优先，其次 PATH dsh）。
 * @param {{ dshBin: string, env: NodeJS.ProcessEnv, installAnchor?: { version?: string } | null }} options
 * @returns {{ version: string | null, source: 'anchor' | 'path' | null }}
 */
export function runningDshVersion({ dshBin, env, installAnchor = null }) {
  if (typeof installAnchor?.version === 'string' && installAnchor.version !== '') {
    return { version: installAnchor.version, source: 'anchor' }
  }
  const run = runDsh(dshBin, ['--version'], { env, cwd: process.cwd() })
  if (!run.ok) return { version: null, source: null }
  const version = run.stdout.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null
  return { version, source: version === null ? null : 'path' }
}

/**
 * 检查 pack 的 engines.dsh 与运行版本；未知版本不硬拦（返回 warning）。
 * @param {{ packVersion: string, enginesDsh: string | undefined, dshVersion: string | null }} options
 * @returns {{ ok: boolean, warning: string | null, error: string | null }}
 */
export function checkEngines({ packVersion, enginesDsh, dshVersion }) {
  if (typeof enginesDsh !== 'string' || enginesDsh.trim() === '') return { ok: true, warning: null, error: null }
  if (dshVersion === null) {
    return { ok: true, warning: `无法确认运行中的 DSH 版本（pack ${packVersion}；engines.dsh=${enginesDsh}）`, error: null }
  }
  if (satisfiesVersion(dshVersion, enginesDsh)) return { ok: true, warning: null, error: null }
  return {
    ok: false,
    warning: null,
    error: `DSH ${dshVersion} 不满足 pack ${packVersion} 的 engines.dsh=${enginesDsh}；先升级/切换 DSH，或换匹配的 pack 版本`,
  }
}

/**
 * 装配/读回产品 profile。
 * @param {{
 *   home: string,
 *   profile: string,
 *   packDir: string,
 *   packVersion: string,
 *   enginesDsh?: string,
 *   dshBin?: string,
 *   env?: NodeJS.ProcessEnv,
 *   cwd?: string,
 *   checkOnly?: boolean,
 *   refreshTeam?: boolean,
 *   installAnchor?: { version?: string } | null,
 *   log?: (message: string) => void,
 * }} options
 * @returns {{
 *   ok: boolean,
 *   status: 'ready' | 'would-install' | 'profile-missing' | 'not-web' | 'pack-half' | 'team-issue' | 'engines' | 'no-dsh' | 'no-pnpm' | 'failed',
 *   profileDir: string,
 *   bundles: string[],
 *   packVersion: string | null,
 *   teamVersion: string | null,
 *   detail: string,
 *   warnings: string[],
 * }}
 */
export function ensureProfile({
  home,
  profile,
  packDir,
  packVersion,
  enginesDsh,
  dshBin = 'dsh',
  env = process.env,
  cwd = process.cwd(),
  checkOnly = false,
  refreshTeam = false,
  installAnchor = null,
  log = () => {},
}) {
  const warnings = []
  const profileDir = profileDirectory(home, profile)
  const result = (status, detail, extra = {}) => ({
    ok: status === 'ready' || status === 'would-install',
    status,
    profileDir,
    bundles: [],
    packVersion: null,
    teamVersion: null,
    detail,
    warnings,
    ...extra,
  })

  const anchor = installAnchor ?? (() => {
    try {
      return inferInstallAnchor({ env })
    } catch {
      return null
    }
  })()
  const dshVersion = runningDshVersion({ dshBin, env, installAnchor: anchor }).version
  const engines = checkEngines({ packVersion, enginesDsh, dshVersion })
  if (engines.warning !== null) warnings.push(engines.warning)
  if (!engines.ok) return result('engines', engines.error)

  let manifest = readProfileManifest(profileDir)
  if (manifest === null) {
    if (checkOnly) return result('profile-missing', `profile 不存在：${profileDir}（去掉 --check 首次装配）`)
    log(`装配 profile「${profile}」（web 模板）…`)
    const created = runDsh(dshBin, ['--profile', profile, '--from-default-profile', 'web', '--dump-config'], { env, cwd })
    if (!created.ok) {
      const reason = created.error?.code === 'ENOENT' ? 'dsh CLI 不在 PATH' : tail(created.stderr || created.stdout)
      return result('no-dsh', `dsh 装配 profile 失败：${reason || `exit ${created.status}`}`)
    }
    manifest = readProfileManifest(profileDir)
    if (manifest === null) return result('failed', `profile 装配后仍无 package.json：${profileDir}`)
  }

  let bundles = profileBundles(manifest)
  if (!bundles.includes(WEB_APP_BUNDLE)) {
    return result('not-web', `profile「${profile}」不是 Web-backed（bundles 缺 ${WEB_APP_BUNDLE}）；换 --profile 或删除该 profile 后重试`)
  }

  const packInProfile = inside(join(profileDir, 'node_modules'), packDir)
  let installedVersion = installedPackVersion(profileDir)
  const packReady = bundles.includes(PACK_NAME) && installedVersion === packVersion
  if (!packReady) {
    if (checkOnly) return result('would-install', `profile 需要安装/更新 ${PACK_NAME}@${packVersion}（当前 ${installedVersion ?? '未安装'}）`, { bundles, packVersion: installedVersion })
    if (!hasPnpm(env)) return result('no-pnpm', 'pnpm 不在 PATH——`dsh plugin add` 需要 pnpm；先安装 pnpm')
    log(`安装 ${PACK_NAME}@${packVersion} 到 profile「${profile}」…`)
    const added = runDsh(dshBin, ['plugin', '--profile', profile, 'add', `file:${packDir}`], { env, cwd })
    if (!added.ok) {
      const reason = added.error?.code === 'ENOENT' ? 'dsh CLI 不在 PATH' : tail(added.stderr || added.stdout)
      return result('failed', `安装 pack 失败：${reason || `exit ${added.status}`}`)
    }
    manifest = readProfileManifest(profileDir)
    bundles = profileBundles(manifest)
    installedVersion = installedPackVersion(profileDir)
    if (!bundles.includes(PACK_NAME) || installedVersion !== packVersion) {
      return result('pack-half', `pack 半装：bundle=${bundles.includes(PACK_NAME)}，安装副本=${installedVersion ?? '未安装'}；先 dsh plugin --profile ${profile} remove ${PACK_NAME} 再重试`)
    }
    if (packInProfile) warnings.push('pack 从 profile 安装副本运行；不会自我重装')
  }

  const teamInstalled = installedTeamVersion(profileDir)
  const teamWanted = resolveTeamVersion({ profileDir, installAnchor: anchor, dshBin, env }).version
  if (checkOnly) {
    if (teamInstalled === null) return result('would-install', `团队层未安装（期望 ${teamWanted ?? '未知'}）`, { bundles, packVersion: installedVersion, teamVersion: teamInstalled })
    if (teamWanted !== null && teamInstalled !== teamWanted) {
      return result('team-issue', `团队层版本 ${teamInstalled} ≠ 运行版本 ${teamWanted}；加 --refresh-team 更新`, { bundles, packVersion: installedVersion, teamVersion: teamInstalled })
    }
  } else {
    const team = ensureTeamLayer({
      profile,
      profileDir,
      installAnchor: anchor,
      dshBin,
      env,
      refresh: refreshTeam,
      note: (ok, _label, detail) => (ok ? log(detail) : warnings.push(detail)),
    })
    if (!team.ok) return result('team-issue', team.detail, { bundles, packVersion: installedVersion, teamVersion: teamInstalled })
  }

  const finalManifest = readProfileManifest(profileDir) ?? manifest
  return {
    ok: true,
    status: 'ready',
    profileDir,
    bundles: profileBundles(finalManifest),
    packVersion: installedPackVersion(profileDir),
    teamVersion: installedTeamVersion(profileDir),
    detail: `profile「${profile}」就绪`,
    warnings,
  }
}

/**
 * 从 pack 的 package.json 读版本/engines。
 * @param {string} packDir
 * @returns {{ version: string, enginesDsh: string | undefined }}
 */
export function packManifest(packDir) {
  const manifest = readJson(join(packDir, 'package.json'))
  if (manifest === null) throw new Error(`pack manifest 不可读：${join(packDir, 'package.json')}`)
  return { version: String(manifest.version ?? ''), enginesDsh: manifest.engines?.dsh }
}

/** 供测试/诊断：profile 内 pack 安装路径。 */
export const packInstallPath = (profileDir) => join(profileDir, 'node_modules', PACK_NAME)
