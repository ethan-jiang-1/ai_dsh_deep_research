/**
 * install-anchor — 找到“实际运行的 DSH 安装”的 package.json，作为 peer/版本解析锚。
 *
 * 为什么需要：DSH 运行时先按安装本体的依赖图解析插件行，再回退到 profile；profile 的
 * `pnpm-workspace.yaml` 是 `autoInstallPeers: false`，peer 本来就不在 profile 里。preflight
 * 从 profile 建 `createRequire` 会在真实 home 上误报 17 个 peer 缺失；在开发仓里又会向上
 * 走进仓库 `node_modules`，把测试假绿。唯一正确锚 = 运行中的 `@deepseek-ai/dsh` 安装清单。
 *
 * 解析顺序：显式 `--install-anchor` → `$DSH_INSTALL_ANCHOR` → PATH 上的 `dsh` 可执行文件。
 * 解析不到时返回 null（调用方标“未验证”，不硬红），不猜目录。
 *
 * 只读盘，不执行子进程；tests/pack/install-anchor.test.mjs 直接断言。
 */
import { accessSync, constants as fsConstants, existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { delimiter, dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { resolvePathInput } from './dsh-home.mjs'

/** 安装清单的 package name（源码 CLI 与 npm 全局安装一致）。 */
export const DSH_APP_PACKAGE = '@deepseek-ai/dsh'

/**
 * 读一个 package.json；缺失/坏 JSON 返回 null。
 * @param {string} path
 * @returns {object | null}
 */
function readManifest(path) {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'))
    return typeof value === 'object' && value !== null ? value : null
  } catch {
    return null
  }
}

/** 是否 DSH 应用安装清单（不是任一 @deepseek-ai/dsh-* 插件）。 */
function isDshAppManifest(manifest) {
  return manifest !== null && manifest.name === DSH_APP_PACKAGE && typeof manifest.version === 'string'
}

/**
 * 沿可执行文件的真实路径向上找 `@deepseek-ai/dsh` 安装清单。
 * @param {string} executablePath - `dsh` 可执行文件、bin 入口或符号链接。
 * @returns {string | null} 绝对 package.json 路径。
 */
export function findAnchorFromExecutable(executablePath) {
  let current
  try {
    current = dirname(realpathSync(executablePath))
  } catch {
    return null
  }
  while (true) {
    const manifestPath = join(current, 'package.json')
    if (isDshAppManifest(readManifest(manifestPath))) return manifestPath
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/**
 * 按 PATH 顺序找 `dsh` 可执行文件（不执行它）。
 * @param {{ pathEnv?: string, platform?: NodeJS.Platform }} [options]
 * @returns {string | null} 绝对路径。
 */
export function findDshExecutable({ pathEnv = process.env.PATH ?? '', platform = process.platform } = {}) {
  if (typeof pathEnv !== 'string' || pathEnv === '') return null
  const separator = platform === 'win32' ? ';' : delimiter
  const names = platform === 'win32' ? ['dsh.cmd', 'dsh.exe', 'dsh'] : ['dsh']
  for (const entry of pathEnv.split(separator)) {
    const dir = entry === '' ? process.cwd() : entry
    for (const name of names) {
      const candidate = join(dir, name)
      try {
        if (!statSync(candidate).isFile()) continue
        if (platform !== 'win32') accessSync(candidate, fsConstants.X_OK)
        return resolve(candidate)
      } catch {
        // 不存在 / 不可执行：继续找。
      }
    }
  }
  return null
}

/**
 * 规范化显式锚：目录补 package.json；文件可为任意 package.json。
 * @param {string} value - 用户输入（支持 `~`）。
 * @param {string} [home]
 * @returns {{ path: string, manifest: object, version: string, source: 'explicit' | 'env' }}
 * @throws {Error} 缺文件、坏清单或不是 DSH 安装清单。
 */
function explicitAnchor(value, source, home = homedir()) {
  const raw = resolvePathInput(value, home)
  const path = existsSync(raw) && statSync(raw).isDirectory() ? join(raw, 'package.json') : raw
  if (!existsSync(path)) {
    throw new Error(`install anchor 不存在：${path}（需要 @deepseek-ai/dsh 安装目录或其 package.json）`)
  }
  const manifest = readManifest(path)
  if (!isDshAppManifest(manifest)) {
    throw new Error(`install anchor 不是 @deepseek-ai/dsh 安装清单：${path}`)
  }
  return { path, manifest, version: manifest.version, source }
}

/**
 * 解析安装锚。显式/环境变量不合法时 fail-loud；PATH 推断不到时返回 null。
 * @param {{ explicit?: string | null, env?: Record<string, string | undefined>, pathEnv?: string, home?: string }} [options]
 * @returns {{ path: string, manifest: object, version: string, source: 'explicit' | 'env' | 'path' } | null}
 */
export function inferInstallAnchor({ explicit = null, env = process.env, pathEnv, home = homedir() } = {}) {
  if (explicit !== null && explicit !== undefined && explicit !== '') {
    return explicitAnchor(explicit, 'explicit', home)
  }
  const fromEnv = env?.DSH_INSTALL_ANCHOR
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return explicitAnchor(fromEnv, 'env', home)
  }
  const executable = findDshExecutable({ pathEnv: pathEnv ?? env?.PATH ?? '', platform: process.platform })
  if (executable === null) return null
  const path = findAnchorFromExecutable(executable)
  if (path === null) return null
  const manifest = readManifest(path)
  return isDshAppManifest(manifest) ? { path, manifest, version: manifest.version, source: 'path' } : null
}

/**
 * 读锚的版本；坏清单返回 null。
 * @param {string} path - 安装清单 package.json。
 * @returns {string | null}
 */
export function readAnchorVersion(path) {
  const manifest = readManifest(path)
  return isDshAppManifest(manifest) ? manifest.version : null
}

/**
 * 从安装锚解析一组包名（DSH 的安装范围解析，不是 profile 向上走）。
 * @param {string} anchorPath - 安装清单 package.json。
 * @param {readonly string[]} names - 要解析的包名。
 * @returns {{ resolved: string[], missing: string[] }}
 */
export function resolveRowPeers(anchorPath, names) {
  let requireFrom
  try {
    requireFrom = createRequire(anchorPath)
  } catch {
    return { resolved: [], missing: [...names] }
  }
  const resolved = []
  const missing = []
  for (const name of [...new Set(names)]) {
    let ok = false
    for (const specifier of [name, `${name}/package.json`]) {
      try {
        requireFrom.resolve(specifier)
        ok = true
        break
      } catch {
        // 换下一个 specifier。
      }
    }
    if (ok) resolved.push(name)
    else missing.push(name)
  }
  return { resolved, missing }
}
