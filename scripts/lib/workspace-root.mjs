// workspace-root — dev 工具的唯一工作区根/会话组解析（D38 / C1）。
//
// 为什么需要：dev 工具曾各自写死 `research-workspace` 路径或按组名 substring 找会话组；
// 产品工作区可以是任意目录（例如 `/path/to/Notes`），substring 必失败。会话组目录不是任意命名，
// 而是 vendor `session-persistence-jsonl/src/format.ts` 的 `projectKey(cwd)`：
//   分隔符 / \ : → '-'（连续合并）；[A-Za-z0-9._-] 原样；其他 code unit → ~XXXX；
//   去前导 '-'；`--${slug.slice(0,251)}--`。spike 实测 `/private/tmp/x/ws` → `--private-tmp-x-ws--`。
//
// 只依赖 node:path/fs；纯函数可直接 keyless 测试。
import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

/** 展开 `~` 后按 cwd 绝对化（与 pack scripts/lib/dsh-home.mjs 同义）。 */
const resolvePathInput = (value, home = homedir()) => {
  const text = String(value)
  if (text === '~') return home
  if (text.startsWith('~/') || text.startsWith('~\\')) return join(home, text.slice(2))
  return resolve(text)
}

/** 产品 Host 使用的工作区环境变量（dev 工具也可用来盯产品 run）。 */
export const PRODUCT_WORKSPACE_ENV = 'DEEP_RESEARCH_WORKSPACE'

/** dev 通道使用的环境变量。 */
export const DEV_WORKSPACE_ENV = 'DSH_RUN_WORKSPACE'

/**
 * 从 argv/env 解析 dev 工具的工作区根；顺序 = 显式 flag → DSH_RUN_WORKSPACE → 默认。
 * @param {{ argv?: readonly string[], env?: NodeJS.ProcessEnv, defaultRoot: string, flag?: string, home?: string }} options
 * @returns {{ root: string, source: 'flag' | 'env' | 'default' }}
 */
export function workspaceRoot({ argv = process.argv.slice(2), env = process.env, defaultRoot, flag = '--workspace', home = homedir() }) {
  const index = argv.indexOf(flag)
  const inline = argv.find((arg) => arg.startsWith(`${flag}=`))
  const raw = index !== -1 && argv[index + 1] !== undefined && !argv[index + 1].startsWith('-')
    ? argv[index + 1]
    : inline !== undefined
      ? inline.slice(flag.length + 1)
      : typeof env[DEV_WORKSPACE_ENV] === 'string' && env[DEV_WORKSPACE_ENV].trim() !== ''
        ? env[DEV_WORKSPACE_ENV]
        : typeof env[PRODUCT_WORKSPACE_ENV] === 'string' && env[PRODUCT_WORKSPACE_ENV].trim() !== ''
          ? env[PRODUCT_WORKSPACE_ENV]
          : defaultRoot
  const source = index !== -1 || inline !== undefined
    ? 'flag'
    : typeof env[DEV_WORKSPACE_ENV] === 'string' && env[DEV_WORKSPACE_ENV].trim() !== ''
      ? 'env'
      : typeof env[PRODUCT_WORKSPACE_ENV] === 'string' && env[PRODUCT_WORKSPACE_ENV].trim() !== ''
        ? 'env'
        : 'default'
  return { root: resolvePathInput(raw, home), source }
}

/**
 * vendor 同形的会话组目录名。
 * @param {string} cwd - 会话 cwd（绝对路径）。
 * @returns {string}
 */
export function projectKey(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) throw new Error('projectKey requires a non-empty cwd')
  let readable = ''
  let separatorRun = false
  for (let i = 0; i < cwd.length; i++) {
    const code = cwd.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += `~${code.toString(16).toUpperCase().padStart(4, '0')}`
      separatorRun = false
    }
  }
  const slug = readable.replace(/^-+/, '') || 'root'
  return `--${slug.slice(0, 251)}--`
}

/**
 * 一个工作区在 `$DSH_HOME/sessions` 下的组目录（canonical）。
 * @param {string} sessionsRoot
 * @param {string} workspace
 * @returns {string}
 */
export function projectGroupDir(sessionsRoot, workspace) {
  return join(sessionsRoot, projectKey(resolve(workspace)))
}

/**
 * 默认会话组 substring：有产品/dev 工作区 env 时用其 projectKey（精确命中），否则 null（调用方回退 legacy）。
 * @param {NodeJS.ProcessEnv} env
 * @returns {string | null}
 */
export function defaultGroupSubstring(env = process.env) {
  const raw = typeof env.DEEP_RESEARCH_WORKSPACE === 'string' && env.DEEP_RESEARCH_WORKSPACE.trim() !== ''
    ? env.DEEP_RESEARCH_WORKSPACE
    : typeof env.DSH_RUN_WORKSPACE === 'string' && env.DSH_RUN_WORKSPACE.trim() !== ''
      ? env.DSH_RUN_WORKSPACE
      : null
  return raw === null ? null : projectKey(resolve(raw))
}

/**
 * 解析一个工作区的会话组：projectKey 命中优先；不存在时回退 legacy substring（旧场）。
 * @param {{ sessionsRoot: string, workspace: string, legacySubstring?: string }} options
 * @returns {string | null} 组目录名；无命中 null。
 */
export function groupForWorkspace({ sessionsRoot, workspace, legacySubstring = 'research-workspace' }) {
  if (!existsSync(sessionsRoot)) return null
  const key = projectKey(resolve(workspace))
  if (existsSync(join(sessionsRoot, key))) return key
  try {
    return readdirSync(sessionsRoot).find((group) => group.includes(legacySubstring)) ?? null
  } catch {
    return null
  }
}

/**
 * 从一份目录路径取人类可读名（产品工作区标题/错误消息）。
 * @param {string} path
 * @returns {string}
 */
export const workspaceName = (path) => basename(resolve(path)) || dirname(resolve(path))

/**
 * 仓内默认工作区（M2 开发实例）。
 * @param {string} repoRoot
 * @returns {string}
 */
export const defaultDevWorkspace = (repoRoot) => join(repoRoot, 'research-workspace')
