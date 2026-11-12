/**
 * defaults/command — `/research-defaults` 的核心（host-only）：show / set / unset / clear。
 *
 * 唯一写路径：原子写（temp + rename）、revision + expectedRevision、写后回读；只写
 * `<cwd>/research-defaults.json`，拒绝相对 cwd / symlink / 目录 / 不属于三轴的字段。
 * 结果 text 是 code-like（`ok revision=4 …` / `error stale revision=5`），面板映射为本地化
 * 文案；命令本身不做 prose。
 */
import { existsSync, lstatSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { withMethodLibraryLock } from '../method-library-io.ts'
import {
  DEFAULTS_AXES, DEFAULTS_FILE, DEFAULTS_SCHEMA,
  emptyDefaults, mergeDefaults, parseDefaults, sanitizePatch, serializeDefaults, unsetDefaults,
  type DefaultsAxis, type DefaultsProblem, type DefaultsValue,
} from '../lib/research-defaults.ts'

/** 命令结果（结构型，避免把 @deepseek-ai/dsh-commands 拉成运行时 import）。 */
export type CommandResultLike =
  | { readonly kind: 'success'; readonly text: string }
  | { readonly kind: 'error'; readonly text: string }

/** 命令核心输入。 */
export interface RunDefaultsCommandInput {
  /** 当前 agent 的 session cwd；host 从 invocation.agent.session.header.cwd 取。 */
  readonly cwd: string | undefined
  /** `/research-defaults` 之后的原文（含分隔空白）。 */
  readonly rawInput: string
  /** 测试注入时钟。 */
  readonly now?: () => Date
}

const USAGE = 'show | set <json> | unset <field[,field]> [revision=N] | clear [revision=N]'

const success = (text: string): CommandResultLike => ({ kind: 'success', text })
const failure = (text: string): CommandResultLike => ({ kind: 'error', text })

const problemText = (problems: readonly DefaultsProblem[]): string =>
  problems.map((item) => `${item.field}=${item.code}`).join(',')

const warningText = (warnings: readonly DefaultsProblem[]): string =>
  warnings.map((item) => `${item.field}=${item.code}`).join(',')

function summaryOf(value: DefaultsValue): string {
  const parts = [`revision=${value.revision}`]
  if (value.effort !== undefined) parts.push(`effort=${value.effort}`)
  if (value.output?.shape !== undefined) parts.push(`output=${value.output.shape}`)
  if (value.output?.audience !== undefined) parts.push('audience=set')
  if (value.source?.families !== undefined) parts.push(`families=${value.source.families.join(',')}`)
  if (value.source?.authority !== undefined) parts.push(`authority=${value.source.authority}`)
  if (value.source?.recency !== undefined) parts.push(`recency=${value.source.recency}`)
  return parts.join(' ')
}

function cwdOf(input: RunDefaultsCommandInput): { cwd: string; target: string } | { error: CommandResultLike } {
  const cwd = input.cwd
  if (cwd === undefined || cwd.trim() === '') return { error: failure('error no-workspace') }
  if (!isAbsolute(cwd)) return { error: failure(`error unsafe cwd-relative`) }
  try {
    if (!statSync(cwd).isDirectory()) return { error: failure('error unsafe cwd-not-directory') }
  } catch {
    return { error: failure('error unsafe cwd-missing') }
  }
  return { cwd, target: join(cwd, DEFAULTS_FILE) }
}

/** target 存在时拒绝 symlink / 目录；读也走这里（防读穿到 workspace 外）。 */
function safeTarget(target: string): CommandResultLike | null {
  if (!existsSync(target)) return null
  try {
    const info = lstatSync(target)
    if (info.isSymbolicLink()) return failure('error unsafe symlink')
    if (info.isDirectory()) return failure('error unsafe directory')
    return null
  } catch (error) {
    return failure(`error io ${(error as Error).message}`)
  }
}

function readCurrent(target: string): { value: DefaultsValue; problems: readonly DefaultsProblem[]; warnings: readonly DefaultsProblem[]; exists: boolean } | CommandResultLike {
  const unsafe = safeTarget(target)
  if (unsafe !== null) return unsafe
  if (!existsSync(target)) return { value: emptyDefaults(), problems: [], warnings: [], exists: false }
  try {
    const text = readFileSync(target, 'utf8')
    const parsed = parseDefaults(text)
    return { value: parsed.value, problems: parsed.problems, warnings: parsed.warnings, exists: true }
  } catch (error) {
    return failure(`error io ${(error as Error).message}`)
  }
}

function isFailure(value: unknown): value is CommandResultLike {
  return typeof value === 'object' && value !== null && 'kind' in value
}

function writeValue(target: string, value: DefaultsValue): CommandResultLike {
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(temp, serializeDefaults(value), 'utf8')
    renameSync(temp, target)
  } catch (error) {
    try { rmSync(temp, { force: true }) } catch { /* 清临时文件失败不盖住主错误 */ }
    return failure(`error io ${(error as Error).message}`)
  }
  // 写后回读：文件事实优先，不信内存值。
  const back = readCurrent(target)
  if (isFailure(back)) return back
  if (back.problems.length > 0) return failure(`error invalid ${problemText(back.problems)}`)
  if (back.value.revision !== value.revision) return failure(`error io revision-mismatch expected=${value.revision} actual=${back.value.revision}`)
  const warn = back.warnings.length > 0 ? ` warn=${warningText(back.warnings)}` : ''
  return success(`ok ${summaryOf(back.value)}${warn}`)
}

function withRevision(value: DefaultsValue, revision: number, now: () => Date): DefaultsValue {
  return { ...value, schema: DEFAULTS_SCHEMA, revision, updatedAt: now().toISOString() }
}

function revisionToken(rest: string): { revision?: number; error?: CommandResultLike } {
  const tokens = rest.trim().split(/\s+/).filter(Boolean)
  let revision: number | undefined
  for (const token of tokens) {
    const match = /^revision=(\d+)$/.exec(token)
    if (match === null) return { error: failure(`error bad-request ${USAGE}`) }
    revision = Number(match[1])
  }
  return revision === undefined ? {} : { revision }
}

/** 跨进程串行化设置写入（与 BUG-132 的 expectedRevision 组成原子 CAS）。 */
function withDefaultsLock(cwd: string, fn: () => CommandResultLike): CommandResultLike {
  // 并发写者短等锁：拿到锁后重读 revision，返回 stale（而不是把锁竞争当业务错误）。
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try { return withMethodLibraryLock(cwd, fn) } catch (error) {
      if (attempt === 5) return failure(`error lock ${(error as Error).message}`)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30)
    }
  }
  return failure('error lock')
}

function runSet(input: RunDefaultsCommandInput, target: string, raw: string): CommandResultLike {
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return failure(`error bad-request set-json`)
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return failure(`error bad-request set-json`)
  const record = payload as Record<string, unknown>
  const expected = record.expectedRevision
  if (expected !== undefined && (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 0)) {
    return failure('error bad-request expectedRevision')
  }
  const patchInput = record.patch
  if (patchInput === null || typeof patchInput !== 'object' || Array.isArray(patchInput)) {
    return failure('error bad-request patch')
  }
  const sanitized = sanitizePatch(patchInput)
  if (sanitized.problems.length > 0) return failure(`error invalid ${problemText(sanitized.problems)}`)
  if (Object.keys(sanitized.patch).length === 0) return failure('error bad-request empty-patch')

  return withDefaultsLock(dirname(target), () => {
    const current = readCurrent(target)
    if (isFailure(current)) return current
    if (current.problems.length > 0) return failure(`error invalid ${problemText(current.problems)}`)
    if (current.warnings.length > 0) return failure(`error unknown-keys ${warningText(current.warnings)}——请先修正 research-defaults.json（未知键不会被静默删除）`)
    if (expected !== undefined && expected !== current.value.revision) return failure(`error stale revision=${current.value.revision}`)

    const merged = withRevision(mergeDefaults(current.value, sanitized.patch), current.value.revision + 1, input.now ?? (() => new Date()))
    return writeValue(target, merged)
  })
}

function runUnset(input: RunDefaultsCommandInput, target: string, raw: string): CommandResultLike {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return failure(`error bad-request ${USAGE}`)
  const fields = (tokens[0] ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  if (fields.length === 0) return failure(`error bad-request fields`)
  const unknown = fields.filter((field) => !(DEFAULTS_AXES as readonly string[]).includes(field))
  if (unknown.length > 0) return failure(`error invalid ${unknown.map((field) => `${field}=unknown-axis`).join(',')}`)
  const parsedRevision = revisionToken(tokens.slice(1).join(' '))
  if (parsedRevision.error !== undefined) return parsedRevision.error

  return withDefaultsLock(dirname(target), () => {
    const current = readCurrent(target)
    if (isFailure(current)) return current
    if (current.problems.length > 0) return failure(`error invalid ${problemText(current.problems)}`)
    if (current.warnings.length > 0) return failure(`error unknown-keys ${warningText(current.warnings)}——请先修正 research-defaults.json（未知键不会被静默删除）`)
    if (!current.exists) return success('ok revision=0')
    if (parsedRevision.revision !== undefined && parsedRevision.revision !== current.value.revision) {
      return failure(`error stale revision=${current.value.revision}`)
    }
    const next = withRevision(unsetDefaults(current.value, fields as readonly DefaultsAxis[]), current.value.revision + 1, input.now ?? (() => new Date()))
    return writeValue(target, next)
  })
}

function runClear(target: string, raw: string): CommandResultLike {
  const parsedRevision = revisionToken(raw)
  if (parsedRevision.error !== undefined) return parsedRevision.error
  return withDefaultsLock(dirname(target), () => {
    const unsafe = safeTarget(target)
    if (unsafe !== null) return unsafe
    if (!existsSync(target)) return success('ok revision=0')
    const current = readCurrent(target)
    if (isFailure(current)) return current
    // clear 是显式修复动作：坏文件也允许删；只有能读出 revision 时才做 stale 校验。
    if (current.problems.length === 0 && parsedRevision.revision !== undefined && parsedRevision.revision !== current.value.revision) {
      return failure(`error stale revision=${current.value.revision}`)
    }
    try {
      unlinkSync(target)
    } catch (error) {
      return failure(`error io ${(error as Error).message}`)
    }
    return success(`ok cleared revision=${current.value.revision}`)
  })
}

function runShow(target: string): CommandResultLike {
  const current = readCurrent(target)
  if (isFailure(current)) return current
  if (!current.exists) return success('ok revision=0 empty')
  if (current.problems.length > 0) return failure(`error invalid ${problemText(current.problems)}`)
  const warn = current.warnings.length > 0 ? ` warn=${warningText(current.warnings)}` : ''
  return success(`ok ${summaryOf(current.value)}${warn}`)
}

/**
 * 执行 `/research-defaults` 的一次调用（纯 host 侧；命令注册只做 cwd 提取）。
 * @param input - cwd + rawInput + 测试时钟。
 * @returns code-like command result。
 */
export function runDefaultsCommand(input: RunDefaultsCommandInput): CommandResultLike {
  const where = cwdOf(input)
  if ('error' in where) return where.error
  const { target } = where
  const raw = input.rawInput.trim()
  if (raw === '' || raw === 'show') return runShow(target)
  if (raw.startsWith('set ') || raw === 'set') {
    const body = raw.slice(3).trim()
    if (body === '') return failure(`error bad-request ${USAGE}`)
    return runSet(input, target, body)
  }
  if (raw === 'unset') return failure(`error bad-request ${USAGE}`)
  if (raw.startsWith('unset ')) return runUnset(input, target, raw.slice(6))
  if (raw === 'clear') return runClear(target, '')
  if (raw.startsWith('clear ')) return runClear(target, raw.slice(6))
  return failure(`error bad-request ${USAGE}`)
}
