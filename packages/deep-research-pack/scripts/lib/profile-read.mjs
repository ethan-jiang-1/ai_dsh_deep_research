/**
 * profile-read — 产品 profile 的纯读回/判据（无子进程、无写盘），供 doctor 与 keyless 回归使用。
 *
 * 只读：profile manifest / bundle roster / 安装副本版本 / pack engines；不安装、不改 profile。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { satisfiesVersion } from './version-range.mjs'

/** profile 名 = `dsh --profile` 接受的稳定名；校验避免路径注入。 */
export function validateProfileName(name) {
  return typeof name === 'string' && /^[a-z0-9][a-z0-9._-]*$/i.test(name)
}

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
 * 读 profile manifest；缺失/坏 JSON 返回 null。
 * @param {string} profileDir
 * @returns {object | null}
 */
export function readProfileManifest(profileDir) {
  return readJson(join(profileDir, 'package.json'))
}

/**
 * bundle list（只保留字符串项）。
 * @param {object | null} manifest
 * @returns {string[]}
 */
export function profileBundles(manifest) {
  const bundles = manifest?.dsh?.profile?.bundles
  return Array.isArray(bundles) ? bundles.filter((value) => typeof value === 'string') : []
}

/**
 * 安装副本里的 pack 版本。
 * @param {string} profileDir
 * @returns {string | null}
 */
export function installedPackVersion(profileDir) {
  return readJson(join(profileDir, 'node_modules', PACK_NAME, 'package.json'))?.version ?? null
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

/** 诊断：profile 内 pack 安装路径。 */
export const packInstallPath = (profileDir) => join(profileDir, 'node_modules', PACK_NAME)

/** 诊断：profile 内 pack 安装清单是否存在。 */
export const hasPackInstall = (profileDir) => existsSync(join(packInstallPath(profileDir), 'package.json'))
