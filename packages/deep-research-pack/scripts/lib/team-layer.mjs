/**
 * team-layer — 确保产品/dev profile 里有与运行中 DSH 版本一致的团队机制层。
 *
 * doctor 需要"团队层是否在场、版本是否匹配"的只读判据；版本派生顺序 =
 * 安装锚 → profile 的 app-boot → PATH 上的 `dsh --version`；范围值不作版本号。
 * 只读：不写 profile、不调用 `dsh plugin`（安装/更新是用户显式动作）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

/** 团队机制层包名（N2 experimental；版本必须匹配运行中的 DSH）。 */
export const TEAM_LAYER = '@deepseek-ai/dsh-experimental-agent-team-profile'

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

/**
 * 从 profile 的 app-boot 读版本（旧布局后备；安装锚优先）。
 * @param {string} profileDir
 * @returns {string | null}
 */
function versionFromProfile(profileDir) {
  if (!existsSync(join(profileDir, 'package.json'))) return null
  try {
    const requireFrom = createRequire(join(profileDir, 'package.json'))
    return readJson(requireFrom.resolve('@deepseek-ai/dsh-app-boot/package.json'))?.version ?? null
  } catch {
    return null
  }
}

/**
 * 派生团队层版本：安装锚 → profile app-boot → PATH dsh。
 * @param {{ profileDir: string, installAnchor?: { version?: string } | null, dshBin?: string, env?: NodeJS.ProcessEnv }} options
 * @returns {{ version: string | null, source: 'anchor' | 'profile' | 'path' | null }}
 */
export function resolveTeamVersion({ profileDir, installAnchor = null, dshBin = 'dsh', env = process.env }) {
  if (typeof installAnchor?.version === 'string' && installAnchor.version !== '') {
    return { version: installAnchor.version, source: 'anchor' }
  }
  const fromProfile = versionFromProfile(profileDir)
  if (fromProfile !== null) return { version: fromProfile, source: 'profile' }
  const run = spawnSync(dshBin, ['--version'], { encoding: 'utf8', env })
  if (run.status === 0) {
    const version = String(run.stdout ?? '').match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/)?.[0] ?? null
    if (version !== null) return { version, source: 'path' }
  }
  return { version: null, source: null }
}

/**
 * 读 profile 里已安装的团队层版本。
 * @param {string} profileDir
 * @returns {string | null}
 */
export function installedTeamVersion(profileDir) {
  return readJson(join(profileDir, 'node_modules', ...TEAM_LAYER.split('/'), 'package.json'))?.version ?? null
}
