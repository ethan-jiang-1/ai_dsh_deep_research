/**
 * settings — 产品启动器的 profile-local 设置（上次工作区）。
 *
 * 位置固定在 `$DSH_HOME/profiles/<profile>/deep-research.launcher.json`：profile 是产品
 * 自己的运行环境，设置随 profile 删除；不写 profile patch、不声明 storage domain、不含秘密。
 * 读失败/损坏/未知 schema 一律当作"没有设置"（重新询问），不阻断启动；写失败 fail-loud。
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, isAbsolute, resolve } from 'node:path'
import { validateProfileName } from '../deploy-args.mjs'

/** 当前设置 schema。 */
export const SETTINGS_SCHEMA_VERSION = 1

/**
 * profile 目录。
 * @param {string} home
 * @param {string} profile
 * @returns {string}
 */
export function profileDirFor(home, profile) {
  if (!validateProfileName(profile)) throw new Error(`profile 名不合法：${JSON.stringify(profile)}`)
  return join(home, 'profiles', profile)
}

/**
 * 设置文件路径。
 * @param {{ home: string, profile: string }} options
 * @returns {string}
 */
export function settingsFileFor({ home, profile }) {
  return join(profileDirFor(home, profile), 'deep-research.launcher.json')
}

const inside = (root, target) => {
  const rel = relative(resolve(root), resolve(target))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * 读设置；任何不可用状态都返回 null（调用方回退到询问）。
 * @param {{ home: string, profile: string }} options
 * @returns {{ settings: { schemaVersion: number, workspace: string, profile: string, updatedAt: string } | null, path: string, error: string | null }}
 */
export function readLauncherSettings({ home, profile }) {
  const path = settingsFileFor({ home, profile })
  if (!existsSync(path)) return { settings: null, path, error: null }
  try {
    if (lstatSync(path).isSymbolicLink()) return { settings: null, path, error: '设置文件是 symlink，忽略' }
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    if (raw === null || typeof raw !== 'object') return { settings: null, path, error: '设置不是对象' }
    if (raw.schemaVersion !== SETTINGS_SCHEMA_VERSION) return { settings: null, path, error: `未知 schemaVersion=${String(raw.schemaVersion)}` }
    if (typeof raw.workspace !== 'string' || raw.workspace === '') return { settings: null, path, error: 'workspace 缺失' }
    return {
      settings: {
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        workspace: resolve(raw.workspace),
        profile: typeof raw.profile === 'string' ? raw.profile : profile,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
      },
      path,
      error: null,
    }
  } catch (error) {
    return { settings: null, path, error: `读设置失败：${String(error?.message ?? error).slice(0, 160)}` }
  }
}

/**
 * 原子写设置（同目录 temp + rename）；不跟随 symlink 目标。
 * @param {{ home: string, profile: string }} options
 * @param {{ workspace: string }} settings
 * @returns {{ ok: boolean, path: string, error: string | null }}
 */
export function writeLauncherSettings({ home, profile }, settings) {
  const path = settingsFileFor({ home, profile })
  const dir = dirname(path)
  try {
    const profileDir = profileDirFor(home, profile)
    if (!inside(profileDir, dir)) throw new Error('设置目录越出 profile')
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('设置文件是 symlink，拒绝写穿')
    mkdirSync(dir, { recursive: true })
    const payload = {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      workspace: resolve(settings.workspace),
      profile,
      updatedAt: new Date().toISOString(),
    }
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`
    writeFileSync(tmp, `${JSON.stringify(payload, undefined, 2)}\n`, { mode: 0o600 })
    renameSync(tmp, path)
    return { ok: true, path, error: null }
  } catch (error) {
    return { ok: false, path, error: String(error?.message ?? error).slice(0, 200) }
  }
}

/**
 * 显式删除设置（只用于测试/维护；产品不自动删）。
 * @param {{ home: string, profile: string }} options
 */
export function removeLauncherSettings({ home, profile }) {
  const path = settingsFileFor({ home, profile })
  try {
    if (existsSync(path)) unlinkSync(path)
  } catch {
    // 删除失败不阻断调用方；测试自行断言。
  }
}
