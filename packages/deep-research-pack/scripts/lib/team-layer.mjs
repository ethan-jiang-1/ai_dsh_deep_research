/**
 * team-layer — 确保产品/dev profile 里有与运行中 DSH 版本一致的团队机制层。
 *
 * 为什么单独成件：scaffold 与产品 launcher 都要"团队层必须在场且版本匹配"，但两者对
 * "已存在但版本不符"的处置不同——scaffold 默认不改用户 pin（显式 --refresh-team 才动），
 * launcher 用同一语义，避免静默替换用户的 N2 依赖。版本派生顺序与 scaffold 一致：
 * 安装锚 → profile 的 app-boot → PATH 上的 `dsh --version`；范围值不作版本号。
 *
 * 只做进程编排，不写 profile 文件；`dsh plugin` 是唯一写入路径。
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

/**
 * 确保团队层在场。
 * @param {{
 *   profile: string,
 *   profileDir: string,
 *   installAnchor?: { version?: string } | null,
 *   dshBin?: string,
 *   env?: NodeJS.ProcessEnv,
 *   dryRun?: boolean,
 *   refresh?: boolean,
 *   note?: (ok: boolean, label: string, detail: string) => void,
 * }} options
 * @returns {{ ok: boolean, status: 'present' | 'installed' | 'mismatch' | 'no-version' | 'no-dsh' | 'dry-run' | 'failed', version: string | null, spec: string, detail: string }}
 */
export function ensureTeamLayer({
  profile,
  profileDir,
  installAnchor = null,
  dshBin = 'dsh',
  env = process.env,
  dryRun = false,
  refresh = false,
  note = () => {},
}) {
  const label = `团队层 profile「${profile}」`
  const { version } = resolveTeamVersion({ profileDir, installAnchor, dshBin, env })
  if (version === null) {
    const detail = '无法派生团队层版本——安装锚、profile app-boot、PATH dsh 都不可用（团队层是 N2 experimental；先确认 dsh 在 PATH 或给 --install-anchor）'
    note(false, label, detail)
    return { ok: false, status: 'no-version', version: null, spec: TEAM_LAYER, detail }
  }
  const spec = `${TEAM_LAYER}@${version}`
  const installed = installedTeamVersion(profileDir)
  if (installed === version && !refresh) {
    const detail = `已在场：${spec}（不改写依赖来源；需要刷新用 --refresh-team）`
    note(true, label, detail)
    return { ok: true, status: 'present', version, spec, detail }
  }
  if (installed !== null && !refresh) {
    const detail = `已在场但版本是 ${installed}，运行版本期望 ${version}；确认后加 --refresh-team 更新（默认不改用户 pin；N2 experimental 随 DSH 版本走）`
    note(false, label, detail)
    return { ok: false, status: 'mismatch', version, spec, detail }
  }
  const probe = spawnSync(dshBin, ['--version'], { encoding: 'utf8', env })
  if (probe.status !== 0) {
    const detail = 'dsh CLI 不可用——装 DSH 后重跑，或手工在 profile 的 dsh.profile.bundles 加该层'
    note(false, label, detail)
    return { ok: false, status: 'no-dsh', version, spec, detail }
  }
  if (dryRun) {
    const detail = `[dry-run] 将执行：dsh plugin --profile ${profile} add ${spec}`
    note(true, label, detail)
    return { ok: true, status: 'dry-run', version, spec, detail }
  }
  const run = spawnSync(dshBin, ['plugin', '--profile', profile, 'add', spec], { encoding: 'utf8', env })
  const ok = run.status === 0
  const reason = run.error?.code === 'ENOENT'
    ? 'dsh CLI 不在 PATH'
    : String(run.stderr ?? run.stdout ?? '').trim().split('\n').slice(-2).join(' ')
  const detail = ok ? `已确保 ${spec} 在场` : `失败：${reason || '未知错误'}（可先跑 dsh-deep-research-scaffold --refresh-team）`
  note(ok, label, detail)
  return { ok, status: ok ? 'installed' : 'failed', version, spec, detail }
}
