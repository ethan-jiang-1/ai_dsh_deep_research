/**
 * workspace — 产品启动器的工作区解析、模式判定与安全边界。
 *
 * 规则（D38）：
 *   1. 显式 --workspace → DEEP_RESEARCH_WORKSPACE → profile 设置 → TTY 询问；非 TTY 无值 fail-loud。
 *   2. 已有研究契约 / 空目录 → 直接用；非空项目默认 <project>/research；--in-place 才用项目根。
 *   3. HOME/DSH_HOME/pack/profile 本身、祖先或内部一律拒绝（复用 workspace-guard 的 realpath 判据）。
 *   4. 已有 .gitignore 不静默改；--gitignore-append 才追加带标记块。
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { homedir } from 'node:os'
import { assertSafeWorkspace } from '../workspace-guard.mjs'

/** 产品工作区环境变量。 */
export const WORKSPACE_ENV = 'DEEP_RESEARCH_WORKSPACE'

/** 研究子目录名（项目模式）。 */
export const PROJECT_RESEARCH_DIR = 'research'

/** .gitignore 托管块标记。 */
export const GITIGNORE_MARKER = '# deep-research (managed)'

/** 研究数据拒绝规则（与种子 .gitignore.example 的语义一致）。 */
export const GITIGNORE_RULES = ['drt_*/', 'archive/', '_abandoned/', 'method-library.md', '.dsh-research-*']

const canonical = (path) => {
  const abs = resolve(path)
  if (existsSync(abs)) {
    try {
      return realpathSync(abs)
    } catch {
      return abs
    }
  }
  // 不存在：解析最深已存在祖先的 realpath 再拼回后缀（macOS /var → /private/var 等）。
  const suffix = []
  let current = abs
  while (!existsSync(current)) {
    const parent = dirname(current)
    if (parent === current) break
    suffix.unshift(basename(current))
    current = parent
  }
  try {
    return join(realpathSync(current), ...suffix)
  } catch {
    return abs
  }
}

export const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * 是否已有研究工作区契约。注意：任意 AGENTS.md 不算——用户项目自己的 AGENTS.md 很常见。
 * @param {string} dir
 * @returns {boolean}
 */
export function hasResearchContract(dir) {
  try {
    if (existsSync(join(dir, '.dsh-research-seed.json'))) return true
    return existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'NODES.md'))
  } catch {
    return false
  }
}

/**
 * 目录是否为空/不存在（隐藏文件也算非空，保守）。
 * @param {string} dir
 * @returns {boolean}
 */
export function isEmptyDir(dir) {
  try {
    return readdirSync(dir).length === 0
  } catch {
    return !existsSync(dir)
  }
}

/**
 * 解析工作区路径来源（不创建、不询问）。
 * @param {{ explicit?: string | null, env?: NodeJS.ProcessEnv, saved?: string | null }} options
 * @returns {{ raw: string | null, source: 'flag' | 'env' | 'settings' | null }}
 */
export function resolveWorkspaceSource({ explicit = null, env = process.env, saved = null }) {
  if (typeof explicit === 'string' && explicit !== '') return { raw: explicit, source: 'flag' }
  const fromEnv = env?.[WORKSPACE_ENV]
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return { raw: fromEnv, source: 'env' }
  if (typeof saved === 'string' && saved !== '') return { raw: saved, source: 'settings' }
  return { raw: null, source: null }
}

/**
 * TTY 询问工作区；默认值 = 当前目录（回车接受）。
 * @param {{ cwd: string, input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream }} options
 * @returns {Promise<string>}
 */
export async function promptWorkspace({ cwd, input = process.stdin, output = process.stdout }) {
  const rl = createInterface({ input, output })
  try {
    const answer = (await rl.question(`研究工作区 [${cwd}]: `)).trim()
    return answer === '' ? cwd : answer
  } finally {
    rl.close()
  }
}

/**
 * 解析研究根。
 * @param {{ workspaceDir: string, root?: string | null, inPlace?: boolean }} options
 * @returns {{ root: string, mode: 'existing' | 'empty' | 'project-subdir' | 'in-place' | 'explicit-root', note: string | null }}
 */
export function resolveResearchRoot({ workspaceDir, root = null, inPlace = false }) {
  const dir = canonical(workspaceDir)
  if (typeof root === 'string' && root !== '') {
    return { root: canonical(root), mode: 'explicit-root', note: null }
  }
  if (hasResearchContract(dir)) return { root: dir, mode: 'existing', note: null }
  if (isEmptyDir(dir)) return { root: dir, mode: 'empty', note: null }
  if (inPlace) return { root: dir, mode: 'in-place', note: null }
  const sub = join(dir, PROJECT_RESEARCH_DIR)
  return {
    root: sub,
    mode: 'project-subdir',
    note: `项目目录不是研究工作区；研究根 = ${sub}（不碰项目文件；要用项目根本身加 --in-place）`,
  }
}

/**
 * 校验工作区/研究根安全（复用 workspace-guard 的 realpath 判据）。
 * @param {{ workspace: string, root?: string | null, home: string, dshHome: string, packDir: string, profileDir: string }} options
 * @returns {{ workspace: string, root: string, warnings: string[] }}
 */
export function assertWorkspaceSafety({ workspace, root = null, home, dshHome, packDir, profileDir }) {
  const wsGuard = assertSafeWorkspace({ workspace, home, dshHome, packDir, profileDir })
  const ws = wsGuard.workspace
  let rootPath = ws
  if (typeof root === 'string' && root !== '') {
    const rootGuard = assertSafeWorkspace({ workspace: root, home, dshHome, packDir, profileDir })
    rootPath = rootGuard.workspace
  }
  return { workspace: ws, root: rootPath, warnings: wsGuard.warnings }
}

/**
 * 确保目录存在（递归）。
 * @param {string} dir
 */
export function ensureDirectory(dir) {
  mkdirSync(dir, { recursive: true })
}

/**
 * 读 .gitignore 是否已有托管块。
 * @param {string} root
 * @returns {boolean}
 */
export function hasGitignoreBlock(root) {
  const path = join(root, '.gitignore')
  try {
    return readFileSync(path, 'utf8').includes(GITIGNORE_MARKER)
  } catch {
    return false
  }
}

/**
 * 向已有 .gitignore 追加托管块（幂等）。不存在 .gitignore 时创建。
 * @param {string} root
 * @returns {{ ok: boolean, appended: boolean, path: string, error: string | null }}
 */
export function appendGitignoreBlock(root) {
  const path = join(root, '.gitignore')
  try {
    const existing = existsSync(path) ? readFileSync(path, 'utf8') : ''
    if (existing.includes(GITIGNORE_MARKER)) return { ok: true, appended: false, path, error: null }
    const prefix = existing === '' || existing.endsWith('\n') ? '' : '\n'
    const block = `${prefix}\n${GITIGNORE_MARKER}\n${GITIGNORE_RULES.join('\n')}\n`
    if (existsSync(path)) appendFileSync(path, block)
    else writeFileSync(path, block.replace(/^\n/, ''))
    return { ok: true, appended: true, path, error: null }
  } catch (error) {
    return { ok: false, appended: false, path, error: String(error?.message ?? error).slice(0, 200) }
  }
}

/**
 * 路径是否在 root 内（用于设置/写入守卫；realpath 语义）。
 * @param {string} root
 * @param {string} target
 * @returns {boolean}
 */
export function isInside(root, target) {
  const rel = relative(canonical(root), canonical(target))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * 人类可读的 basename（工作区标题/错误消息）。
 * @param {string} path
 * @returns {string}
 */
export function workspaceLabel(path) {
  return basename(canonical(path)) || path
}

/** 默认 home（测试注入用）。 */
export const defaultHome = () => homedir()
