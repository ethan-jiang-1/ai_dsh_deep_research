/**
 * research-defaults — workspace 级「项目研究默认」的共享纯件（host + client 同一份）。
 *
 * 为什么不物化默认值：缺席 = 自动 = Lead 按题型/证据自主判断。写 `"auto"` sentinel 会把
 * 「不约束」读成「系统选了一个值」；读盘补默认值会在用户没选时留下隐形约束。本模块只做
 * schema/parse/merge/unset/serialize 与按钮状态；**不写任何 field 的缺省值**。
 *
 * 边界：方法默认不在这里（住 `method-library.md` 的〔默认偏好〕；`findDefaultMethod` 只读）；
 * gates/lens/referenceRoot/language 不是本文件的轴。磁盘格式 = `research-defaults.json`，
 * 写入只经 host command（`src/defaults/`）。
 */
import { foldLibrary } from './library-fold.ts'

/** 磁盘文件名（workspace 根）。 */
export const DEFAULTS_FILE = 'research-defaults.json'

/** 当前磁盘 schema。 */
export const DEFAULTS_SCHEMA = 1

/** 研究投入档（只存 band；caps 由 band 表派生）。 */
export const EFFORT_BANDS = ['quick', 'standard', 'deep'] as const
export type EffortBand = typeof EFFORT_BANDS[number]

/** 输出形态 = HITL1 面向用户的六种；protocol 的 literature_review 不在本层。 */
export const OUTPUT_SHAPES = ['quick_answer', 'full_report', 'one_page_memo', 'comparison_table', 'timeline', 'landscape_map'] as const
export type OutputShape = typeof OUTPUT_SHAPES[number]

/** 来源家族（与 protocol-core 同值）。 */
export const SOURCE_FAMILIES = ['official', 'web', 'academic', 'regulatory', 'practitioner', 'local'] as const
export type SourceFamily = typeof SOURCE_FAMILIES[number]

/** 权威度。 */
export const AUTHORITIES = ['primary', 'secondary', 'any'] as const
export type Authority = typeof AUTHORITIES[number]

/** 时效（HITL1 四值）。 */
export const RECENCIES = ['6m', '12m', '24m', 'as-of-capture'] as const
export type Recency = typeof RECENCIES[number]

/** 本层拥有的三轴（顶层字段）。 */
export const DEFAULTS_AXES = ['effort', 'output', 'source'] as const
export type DefaultsAxis = typeof DEFAULTS_AXES[number]

/** 输出默认：shape / audience 各自可缺席（缺席 = 该子项自动）。 */
export interface OutputDefaults {
  readonly shape?: OutputShape
  readonly audience?: string
}

/** 来源默认：families / authority / recency 各自可缺席。 */
export interface SourceDefaults {
  readonly families?: readonly SourceFamily[]
  readonly authority?: Authority
  readonly recency?: Recency
}

/** 解析/写入用的规范化值；字段缺席 = 自动。 */
export interface DefaultsValue {
  readonly schema: typeof DEFAULTS_SCHEMA
  readonly revision: number
  readonly updatedAt?: string
  readonly effort?: EffortBand
  readonly output?: OutputDefaults
  readonly source?: SourceDefaults
}

/** patch：只允许三轴；字段缺席 = 不改。 */
export interface DefaultsPatch {
  readonly effort?: EffortBand
  readonly output?: OutputDefaults
  readonly source?: SourceDefaults
}

/** 解析问题（红）或未知键（黄）。 */
export interface DefaultsProblem {
  readonly field: string
  readonly code: string
  readonly detail: string
}

/** 解析结果。 */
export interface ParsedDefaults {
  readonly value: DefaultsValue
  readonly problems: readonly DefaultsProblem[]
  readonly warnings: readonly DefaultsProblem[]
  readonly hasAnyValue: boolean
}

/** 按钮/面板用的粗状态；文案由 client 字典映射。 */
export interface DefaultsButtonState {
  readonly kind: 'auto' | 'method' | 'count' | 'invalid'
  readonly count: number
  readonly methodDefault: string | null
}

/** 命令结果解析。 */
export interface CommandOutcome {
  readonly ok: boolean
  readonly code?: string
  readonly revision?: number
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)

/** 空值（schema + revision 0）；不包含任何轴。 */
export function emptyDefaults(): DefaultsValue {
  return { schema: DEFAULTS_SCHEMA, revision: 0 }
}

/** 该值是否至少有一个显式轴。 */
export function hasAnyValue(value: DefaultsValue): boolean {
  return value.effort !== undefined
    || value.output !== undefined
    || value.source !== undefined
}

/** 已设置的顶层轴数量（0–3）。 */
export function countSetAxes(value: DefaultsValue): number {
  return (value.effort === undefined ? 0 : 1)
    + (value.output === undefined ? 0 : 1)
    + (value.source === undefined ? 0 : 1)
}

function problem(field: string, code: string, detail: string): DefaultsProblem {
  return { field, code, detail }
}

function normalizeAudience(value: unknown): { audience?: string; problem?: DefaultsProblem } {
  if (typeof value !== 'string') return { problem: problem('output.audience', 'invalid', 'audience must be a string') }
  const audience = value.replace(/[\r\n]+/g, ' ').trim()
  if (audience === '') return { problem: problem('output.audience', 'invalid', 'audience must not be empty') }
  if (audience.length > 200) return { problem: problem('output.audience', 'invalid', 'audience exceeds 200 chars') }
  return { audience }
}

function normalizeFamilies(value: unknown): { families?: readonly SourceFamily[]; problem?: DefaultsProblem } {
  if (!Array.isArray(value) || value.length === 0) {
    return { problem: problem('source.families', 'invalid', 'families must be a non-empty array') }
  }
  const picked = new Set<SourceFamily>()
  for (const item of value) {
    if (!isOneOf(item, SOURCE_FAMILIES)) {
      return { problem: problem('source.families', 'invalid', `unknown family: ${String(item)}`) }
    }
    picked.add(item)
  }
  return { families: SOURCE_FAMILIES.filter((family) => picked.has(family)) }
}

function normalizeOutput(value: unknown, problems: DefaultsProblem[], warnings: DefaultsProblem[]): OutputDefaults | undefined {
  if (!isObject(value)) {
    problems.push(problem('output', 'shape', 'output must be an object'))
    return undefined
  }
  let shape: OutputShape | undefined
  let audience: string | undefined
  for (const key of Object.keys(value)) {
    if (key !== 'shape' && key !== 'audience') warnings.push(problem(`output.${key}`, 'unknown', 'unknown output key'))
  }
  if (value.shape !== undefined) {
    if (!isOneOf(value.shape, OUTPUT_SHAPES)) problems.push(problem('output.shape', 'invalid', `unknown shape: ${String(value.shape)}`))
    else shape = value.shape
  }
  if (value.audience !== undefined) {
    const normalized = normalizeAudience(value.audience)
    if (normalized.problem !== undefined) problems.push(normalized.problem)
    else audience = normalized.audience
  }
  if (shape === undefined && audience === undefined) return undefined
  return { ...shape === undefined ? {} : { shape }, ...audience === undefined ? {} : { audience } }
}

function normalizeSource(value: unknown, problems: DefaultsProblem[], warnings: DefaultsProblem[]): SourceDefaults | undefined {
  if (!isObject(value)) {
    problems.push(problem('source', 'shape', 'source must be an object'))
    return undefined
  }
  let families: readonly SourceFamily[] | undefined
  let authority: Authority | undefined
  let recency: Recency | undefined
  for (const key of Object.keys(value)) {
    if (key !== 'families' && key !== 'authority' && key !== 'recency') warnings.push(problem(`source.${key}`, 'unknown', 'unknown source key'))
  }
  if (value.families !== undefined) {
    const normalized = normalizeFamilies(value.families)
    if (normalized.problem !== undefined) problems.push(normalized.problem)
    else families = normalized.families
  }
  if (value.authority !== undefined) {
    if (!isOneOf(value.authority, AUTHORITIES)) problems.push(problem('source.authority', 'invalid', `unknown authority: ${String(value.authority)}`))
    else authority = value.authority
  }
  if (value.recency !== undefined) {
    if (!isOneOf(value.recency, RECENCIES)) problems.push(problem('source.recency', 'invalid', `unknown recency: ${String(value.recency)}`))
    else recency = value.recency
  }
  if (families === undefined && authority === undefined && recency === undefined) return undefined
  return {
    ...families === undefined ? {} : { families },
    ...authority === undefined ? {} : { authority },
    ...recency === undefined ? {} : { recency },
  }
}

/**
 * 解析 `research-defaults.json` 文本。空/缺席 = 全自动；非法值进 problems 且不入值；
 * schema 不符 → 不使用其任何轴（避免把未来格式读成今天的选择）。
 * @param text - 文件全文；null/undefined/空串合法。
 * @returns 解析结果。
 */
export function parseDefaults(text: string | null | undefined): ParsedDefaults {
  const empty: ParsedDefaults = { value: emptyDefaults(), problems: [], warnings: [], hasAnyValue: false }
  if (text === null || text === undefined || text.trim() === '') return empty
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { ...empty, problems: [problem('file', 'parse', (error as Error).message)] }
  }
  if (!isObject(parsed)) return { ...empty, problems: [problem('file', 'shape', 'root must be an object')] }

  const problems: DefaultsProblem[] = []
  const warnings: DefaultsProblem[] = []
  if (parsed.schema === undefined) warnings.push(problem('schema', 'default', 'schema missing; treated as 1'))
  else if (parsed.schema !== DEFAULTS_SCHEMA) {
    return {
      ...empty,
      problems: [problem('schema', 'schema', `unsupported schema: ${String(parsed.schema)}`)],
    }
  }

  let revision = 0
  if (parsed.revision !== undefined) {
    if (typeof parsed.revision !== 'number' || !Number.isInteger(parsed.revision) || parsed.revision < 0) {
      problems.push(problem('revision', 'invalid', 'revision must be a non-negative integer'))
    } else revision = parsed.revision
  }
  let updatedAt: string | undefined
  if (parsed.updatedAt !== undefined) {
    if (typeof parsed.updatedAt !== 'string' || parsed.updatedAt.trim() === '') {
      warnings.push(problem('updatedAt', 'invalid', 'updatedAt must be a string'))
    } else updatedAt = parsed.updatedAt
  }

  let effort: EffortBand | undefined
  if (parsed.effort !== undefined) {
    if (!isOneOf(parsed.effort, EFFORT_BANDS)) problems.push(problem('effort', 'invalid', `unknown band: ${String(parsed.effort)}`))
    else effort = parsed.effort
  }
  const output = parsed.output === undefined ? undefined : normalizeOutput(parsed.output, problems, warnings)
  const source = parsed.source === undefined ? undefined : normalizeSource(parsed.source, problems, warnings)

  const forbidden = new Set(['method', 'gates', 'lens', 'referenceRoot', 'language'])
  for (const key of Object.keys(parsed)) {
    if (['schema', 'revision', 'updatedAt', 'effort', 'output', 'source'].includes(key)) continue
    if (forbidden.has(key)) problems.push(problem(key, 'not-allowed', `${key} is not a project default`))
    else warnings.push(problem(key, 'unknown', `unknown key: ${key}`))
  }

  const value: DefaultsValue = {
    schema: DEFAULTS_SCHEMA,
    revision,
    ...updatedAt === undefined ? {} : { updatedAt },
    ...effort === undefined ? {} : { effort },
    ...output === undefined ? {} : { output },
    ...source === undefined ? {} : { source },
  }
  return { value, problems, warnings, hasAnyValue: hasAnyValue(value) }
}

/**
 * 稳定序列化：固定的 key 顺序、2 空格缩进、尾换行；缺席字段不写。
 * @param value - 规范化值。
 * @returns 文件全文。
 */
export function serializeDefaults(value: DefaultsValue): string {
  const out: Record<string, unknown> = { schema: DEFAULTS_SCHEMA, revision: value.revision }
  if (value.updatedAt !== undefined) out.updatedAt = value.updatedAt
  if (value.effort !== undefined) out.effort = value.effort
  if (value.output !== undefined) {
    out.output = {
      ...value.output.shape === undefined ? {} : { shape: value.output.shape },
      ...value.output.audience === undefined ? {} : { audience: value.output.audience },
    }
  }
  if (value.source !== undefined) {
    out.source = {
      ...value.source.families === undefined ? {} : { families: value.source.families },
      ...value.source.authority === undefined ? {} : { authority: value.source.authority },
      ...value.source.recency === undefined ? {} : { recency: value.source.recency },
    }
  }
  return `${JSON.stringify(out, null, 2)}\n`
}

/**
 * 顶层合并：patch 的字段整体替换；缺席 = 保留；空 output/source 对象 = 删除该轴。
 * @param current - 当前值。
 * @param patch - 已 sanitize 的 patch。
 * @returns 合并值（保留 metadata）。
 */
export function mergeDefaults(current: DefaultsValue, patch: DefaultsPatch): DefaultsValue {
  const output = patch.output === undefined
    ? current.output
    : patch.output.shape === undefined && patch.output.audience === undefined ? undefined : patch.output
  const source = patch.source === undefined
    ? current.source
    : patch.source.families === undefined && patch.source.authority === undefined && patch.source.recency === undefined ? undefined : patch.source
  return {
    schema: DEFAULTS_SCHEMA,
    revision: current.revision,
    ...current.updatedAt === undefined ? {} : { updatedAt: current.updatedAt },
    ...patch.effort === undefined ? current.effort === undefined ? {} : { effort: current.effort } : { effort: patch.effort },
    ...output === undefined ? {} : { output },
    ...source === undefined ? {} : { source },
  }
}

/**
 * 删除顶层轴；保留 schema/revision/updatedAt（文件存在但无值 = 自动）。
 * @param current - 当前值。
 * @param fields - 要删除的轴。
 * @returns 新值。
 */
export function unsetDefaults(current: DefaultsValue, fields: readonly DefaultsAxis[]): DefaultsValue {
  const drop = new Set(fields)
  return {
    schema: DEFAULTS_SCHEMA,
    revision: current.revision,
    ...current.updatedAt === undefined ? {} : { updatedAt: current.updatedAt },
    ...current.effort === undefined || drop.has('effort') ? {} : { effort: current.effort },
    ...current.output === undefined || drop.has('output') ? {} : { output: current.output },
    ...current.source === undefined || drop.has('source') ? {} : { source: current.source },
  }
}

/**
 * 校验并规范化一个 command patch：只允许三轴；method/gates/未知键拒绝；
 * output/source 的未知子键拒绝；空 output/source 拒绝（清空走 unset）。
 * @param patch - 待校验 patch。
 * @returns 规范化 patch + problems。
 */
export function sanitizePatch(patch: unknown): { patch: DefaultsPatch; problems: readonly DefaultsProblem[] } {
  const problems: DefaultsProblem[] = []
  if (!isObject(patch)) return { patch: {}, problems: [problem('patch', 'shape', 'patch must be an object')] }
  for (const key of Object.keys(patch)) {
    if (!(DEFAULTS_AXES as readonly string[]).includes(key)) {
      problems.push(problem(key, 'not-allowed', `${key} is not a writable project default`))
    }
  }
  let effort: EffortBand | undefined
  if (patch.effort !== undefined) {
    if (!isOneOf(patch.effort, EFFORT_BANDS)) problems.push(problem('effort', 'invalid', `unknown band: ${String(patch.effort)}`))
    else effort = patch.effort
  }
  let output: OutputDefaults | undefined
  if (patch.output !== undefined) {
    const normalized = normalizeOutput(patch.output, problems, problems)
    if (normalized !== undefined) {
      if (normalized.shape === undefined && normalized.audience === undefined) problems.push(problem('output', 'empty', 'output needs shape or audience'))
      else output = normalized
    }
  }
  let source: SourceDefaults | undefined
  if (patch.source !== undefined) {
    const normalized = normalizeSource(patch.source, problems, problems)
    if (normalized !== undefined) {
      if (normalized.families === undefined && normalized.authority === undefined && normalized.recency === undefined) {
        problems.push(problem('source', 'empty', 'source needs families, authority or recency'))
      } else source = normalized
    }
  }
  return {
    patch: {
      ...effort === undefined ? {} : { effort },
      ...output === undefined ? {} : { output },
      ...source === undefined ? {} : { source },
    },
    problems,
  }
}

/** 按钮粗状态：invalid > count > method > auto；count 只数三轴。 */
export function defaultsButtonState(input: {
  readonly value: DefaultsValue
  readonly methodDefault: string | null
  readonly problems?: readonly DefaultsProblem[]
}): DefaultsButtonState {
  const count = countSetAxes(input.value)
  if ((input.problems?.length ?? 0) > 0) return { kind: 'invalid', count, methodDefault: input.methodDefault }
  if (count > 0) return { kind: 'count', count, methodDefault: input.methodDefault }
  if (input.methodDefault !== null) return { kind: 'method', count: 0, methodDefault: input.methodDefault }
  return { kind: 'auto', count: 0, methodDefault: null }
}

/**
 * 从方法库文本读唯一默认条目名（复用 shared library-fold；多个默认取第一个并交给调用方报警）。
 * @param libraryText - `method-library.md` 全文。
 * @returns 默认条目名或 null。
 */
export function findDefaultMethod(libraryText: string | null | undefined): string | null {
  if (libraryText === null || libraryText === undefined) return null
  try {
    const entries = foldLibrary(libraryText)
    const found = entries.find((entry) => entry.isDefault)
    return found?.name ?? null
  } catch {
    return null
  }
}

/**
 * 解析 host command 的 code-like 结果。
 * @param text - `ok revision=4 …` / `error stale revision=5` / `error invalid …`。
 * @returns `{ ok, code?, revision? }`。
 */
export function parseCommandOutcome(text: string): CommandOutcome {
  const trimmed = text.trim()
  if (trimmed.startsWith('ok')) {
    const revision = /revision=(\d+)/.exec(trimmed)
    return {
      ok: true,
      ...revision === null ? {} : { revision: Number(revision[1]) },
    }
  }
  if (trimmed.startsWith('error')) {
    const match = /^error\s+([a-z-]+)/.exec(trimmed)
    const revision = /revision=(\d+)/.exec(trimmed)
    return {
      ok: false,
      code: match?.[1] ?? 'error',
      ...revision === null ? {} : { revision: Number(revision[1]) },
    }
  }
  return { ok: false }
}
