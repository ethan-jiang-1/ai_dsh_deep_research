/**
 * product-settings — 产品的 home 级状态（D40）：`$DSH_HOME/deep-research/settings.json`。
 *
 * 为什么在 home 而不是 profile 目录：Host 行拿不到当前 profile 名（CLI 没把它暴露成
 * env 或服务）；home 级是 FAQ 26 允许的"产品自建 `$DSH_HOME/<plugin>/` 路径约定"。
 * 一个 home 一份产品状态；`--home` 天然隔离；删目录即重置。多 profile 共享——文档写明。
 *
 * 边界：只存工作区与上次会话；无秘密；不是 DSH Settings（Settings UI 不暴露工作区）。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

/** 当前设置 schema。旧文件（schema 1/缺失）读到即按缺失处理，首次写入升到 2。 */
export const SETTINGS_SCHEMA = 2

/** 产品设置文件的相对 `<DSH_HOME>` 路径。 */
const SETTINGS_REL = join('deep-research', 'settings.json')

/** 一段可读的失败原因；调用方决定 log 还是 fail loud。 */
export interface SettingsFailure {
  readonly ok: false
  readonly reason: 'missing' | 'corrupt' | 'schema' | 'io'
  readonly detail: string
}

/** 成功读到的设置。 */
export interface ProductSettings {
  readonly schemaVersion: number
  readonly workspace?: string
  readonly sessionId?: string
  readonly updatedAt?: string
}

/** 读设置的结果。 */
export type SettingsRead = { readonly ok: true; readonly value: ProductSettings } | SettingsFailure

/** 写设置的补丁；`undefined` 字段不覆盖。 */
export interface SettingsPatch {
  readonly workspace?: string
  readonly sessionId?: string
}

/**
 * 解析 DSH home：`$DSH_HOME` 优先，否则 `~/.dsh`。
 * @param env - 进程环境（测试可注入）。
 * @returns 绝对 home 路径。
 */
export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.DSH_HOME
  return configured === undefined || configured.trim() === '' ? join(homedir(), '.dsh') : resolve(configured)
}

/**
 * 产品设置文件绝对路径。
 * @param env - 进程环境。
 * @returns `$DSH_HOME/deep-research/settings.json`。
 */
export function settingsPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveDshHome(env), SETTINGS_REL)
}

/** 字符串字段的类型守卫。 */
const stringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined

/**
 * 读产品设置。缺失/损坏都是可恢复状态，不抛。
 * @param env - 进程环境。
 * @returns 读结果。
 */
export function readSettings(env: NodeJS.ProcessEnv = process.env): SettingsRead {
  const path = settingsPath(env)
  if (!existsSync(path)) return { ok: false, reason: 'missing', detail: path }
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (error) {
    return { ok: false, reason: 'io', detail: `${path}: ${(error as Error).message}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // 坏文件先留证据再让调用方按"未设置"处理；不静默覆盖用户内容。
    try {
      writeFileSync(`${path}.corrupt`, raw)
      rmSync(path, { force: true })
    } catch { /* 备份失败不阻断读取方 */ }
    return { ok: false, reason: 'corrupt', detail: path }
  }
  if (parsed === null || typeof parsed !== 'object') return { ok: false, reason: 'corrupt', detail: path }
  const record = parsed as Record<string, unknown>
  const schemaVersion = record.schemaVersion
  if (schemaVersion !== SETTINGS_SCHEMA) {
    return { ok: false, reason: 'schema', detail: `${path}: schemaVersion=${String(schemaVersion)}（期望 ${SETTINGS_SCHEMA}）` }
  }
  const workspace = stringOrUndefined(record.workspace)
  const sessionId = stringOrUndefined(record.sessionId)
  const updatedAt = stringOrUndefined(record.updatedAt)
  return {
    ok: true,
    value: {
      schemaVersion: SETTINGS_SCHEMA,
      ...(workspace === undefined ? {} : { workspace }),
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(updatedAt === undefined ? {} : { updatedAt }),
    },
  }
}

/**
 * 原子写产品设置（merging patch over the current readable value）。
 * @param patch - 要更新的字段。
 * @param env - 进程环境。
 * @returns 写入后的完整设置。
 */
export function writeSettings(patch: SettingsPatch, env: NodeJS.ProcessEnv = process.env): ProductSettings {
  const path = settingsPath(env)
  const current = readSettings(env)
  const base: ProductSettings = current.ok ? current.value : { schemaVersion: SETTINGS_SCHEMA }
  const workspace = patch.workspace ?? base.workspace
  const sessionId = patch.sessionId ?? base.sessionId
  const next: ProductSettings = {
    schemaVersion: SETTINGS_SCHEMA,
    ...(workspace === undefined ? {} : { workspace }),
    ...(sessionId === undefined ? {} : { sessionId }),
    updatedAt: new Date().toISOString(),
  }
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.tmp`
  writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`)
  renameSync(temp, path)
  return next
}

/** 工作区校验结果：`null` = 可用。 */
export type WorkspaceProblem = string | null

const inside = (root: string, target: string): boolean => {
  const rel = relative(resolve(root), resolve(target))
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

/**
 * 校验一个候选工作区（绝对、存在、目录、不指向受保护目录）。
 * @param path - 候选路径。
 * @param options - 受保护根（home / dshHome / packRoot）。
 * @returns 问题描述；`null` = 可用。
 */
export function workspaceProblem(
  path: string,
  options: { home?: string; dshHome?: string; packRoot?: string } = {},
): WorkspaceProblem {
  if (!isAbsolute(path)) return `不是绝对路径：${path}`
  if (!existsSync(path)) return `目录不存在：${path}`
  let info
  try {
    info = statSync(path)
  } catch (error) {
    return `读不到目录：${path}（${(error as Error).message}）`
  }
  if (!info.isDirectory()) return `不是目录：${path}`
  const home = resolve(options.home ?? homedir())
  const dshHome = resolve(options.dshHome ?? resolveDshHome())
  if (inside(path, home)) return `不能把 HOME 或其祖先作为工作区：${path}`
  if (inside(dshHome, path)) return `不能把 DSH home 或其内部作为工作区：${path}`
  if (options.packRoot !== undefined && inside(resolve(options.packRoot), path)) {
    return `不能把插件安装副本或其内部作为工作区：${path}`
  }
  return null
}

/**
 * 解析"本次启动的工作区"：env 覆盖 > 设置文件；不做交互询问（询问归首屏）。
 * @param env - 进程环境。
 * @param options - 受保护根。
 * @returns 绝对路径与来源；无配置返回 null。
 */
export function resolveStartupWorkspace(
  env: NodeJS.ProcessEnv = process.env,
  options: { home?: string; dshHome?: string; packRoot?: string } = {},
): { path: string; source: 'env' | 'settings'; problem: WorkspaceProblem } | null {
  const explicit = env.DEEP_RESEARCH_WORKSPACE
  const fromEnv = explicit !== undefined && explicit.trim() !== ''
  const settings = fromEnv ? null : readSettings(env)
  const configured = fromEnv ? explicit : settings?.ok === true ? settings.value.workspace : undefined
  if (configured === undefined) return null
  const path = resolve(configured)
  return { path, source: fromEnv ? 'env' : 'settings', problem: workspaceProblem(path, options) }
}
