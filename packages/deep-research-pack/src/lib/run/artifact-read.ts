/**
 * artifact-read.ts —— 观察面工件的读取状态（纯函数 + 统一读取器；client 面）。
 *
 * 为什么存在（2026-11-22 BUG-361…368）：上一批只建模了 bundle/review/evidence 的
 * `ok|absent|unreadable`，没有建模「文件在但内容空/坏」，也没有把 question、回执、
 * readiness 声明、终稿正文/读者版收进事实清单。0 字节文件在 IO 层是 `ok`，于是被当成
 * 有效正文/有效审查/有效问题；读失败又在各消费点折成 null/absent。
 *
 * 本件把「工件读取」收成一个入口：
 *   - `ArtifactState = ok | absent | unreadable | empty | invalid`；
 *   - `ARTIFACT_POLICY`：每个 canonical 工件的文本/JSON、是否必须非空、truncated 语义；
 *   - `artifactStateOf`：`run-context.Outcome` + policy → 状态（纯，矩阵测试）；
 *   - `readArtifact`：唯一 `view.read` 调用点；JSON 工件在这里解析，坏 JSON = invalid。
 *
 * 纪律：容器/目录（bundle、evidence list、final list）不是文本工件，走 `readStateOf`
 * （三态）；新增文本工件必须在 policy 表登记，否则 `readArtifact` 返回 invalid（fail-loud），
 * 由源级守卫与浏览器场景覆盖。
 */

/** 容器/读取三态（bundle、evidence 目录、final 目录等）。 */
export type SourceRead = 'ok' | 'absent' | 'unreadable'

/** 文本工件五态：空（0 字节/纯空白）与非法（JSON 坏）是独立状态，不折成 absent/unreadable。 */
export type ArtifactState = SourceRead | 'empty' | 'invalid'

/** 编译期穷举守卫：分支必须覆盖闭集全部成员，否则参数类型无法收敛为 `never`。 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected union member: ${String(value)}`)
}

/** `ArtifactState` → 纯读取问题（不检查内容是否有正文；`ok`/`absent` 为 null）。 */
export function artifactReadIssueOf(state: ArtifactState): 'empty' | 'unreadable' | null {
  switch (state) {
    case 'ok':
    case 'absent':
      return null
    case 'empty':
      return 'empty'
    case 'unreadable':
    case 'invalid':
      return 'unreadable'
    default:
      return assertNever(state)
  }
}

/** `ArtifactState` × 正文存在性 → 内容问题（`ok` 但无正文 → `'body-empty'`）。 */
export function artifactBodyIssueOf(state: ArtifactState, hasBody: boolean): 'empty' | 'unreadable' | 'body-empty' | null {
  switch (state) {
    case 'ok':
      return hasBody ? null : 'body-empty'
    case 'absent':
      return null
    case 'empty':
      return 'empty'
    case 'unreadable':
    case 'invalid':
      return 'unreadable'
    default:
      return assertNever(state)
  }
}

/** 状态页六个显示事实的读取态（视图/摘要只消费；新增事实必须同时改测试）。 */
export interface StatusReads {
  readonly bundle: SourceRead
  readonly question: ArtifactState
  readonly review: ArtifactState
  readonly readiness: ArtifactState
  readonly evidence: SourceRead
  readonly plan: ArtifactState
  readonly leads: ArtifactState
  readonly findings: ArtifactState
  readonly final: SourceRead
  readonly receipt: ArtifactState
}

/** 工件策略：文本工件是否必须非空；JSON 工件是否要解析。 */
export interface ArtifactPolicy {
  readonly nonEmpty: boolean
  readonly json: boolean
}

/** canonical 文本工件的策略表（动态 final 版本名见 `artifactPolicyOf`）。 */
export const ARTIFACT_POLICY: Readonly<Record<string, ArtifactPolicy>> = {
  'question.md': { nonEmpty: true, json: false },
  'review.md': { nonEmpty: true, json: false },
  'review/readiness.json': { nonEmpty: true, json: true },
  'delivered.json': { nonEmpty: true, json: true },
  'plan.md': { nonEmpty: true, json: false },
  'leads.md': { nonEmpty: true, json: false },
  'findings.md': { nonEmpty: true, json: false },
  'topics.md': { nonEmpty: true, json: false },
  'protocol.json': { nonEmpty: true, json: true },
  'claims.json': { nonEmpty: true, json: true },
  'verdicts.json': { nonEmpty: true, json: true },
  'final.md': { nonEmpty: true, json: false },
  'final/readable.md': { nonEmpty: true, json: false },
}

/**
 * 文件名 → 策略；final/ 下的版本/读者版按正则匹配，其余未知名 → null。
 * @param name - bundle 内的相对文件名。
 * @returns 策略或 null（未登记 = 调用方必须 fail-loud）。
 */
export function artifactPolicyOf(name: string): ArtifactPolicy | null {
  const fixed = ARTIFACT_POLICY[name]
  if (fixed !== undefined) return fixed
  if (/^plan\/v[1-9]\d{0,5}\.md$/.test(name)) return { nonEmpty: true, json: false }
  if (/^evidence\/[^/]+\.md$/.test(name)) return { nonEmpty: true, json: false }
  if (/^final\/v[1-9]\d{0,5}\.md$/.test(name)) return { nonEmpty: true, json: false }
  if (/^final\/readable(?:-v[1-9]\d{0,5})?\.md$/.test(name)) return { nonEmpty: true, json: false }
  return null
}

/** `run-context.Outcome` 的结构子集（只读文本字段，避免 client 依赖 Node 侧）。 */
type TextOutcome =
  | { readonly ok: true; readonly value: { readonly text: string; readonly truncated?: boolean } }
  | { readonly ok: false; readonly reason: 'missing' | 'unreadable' }

/**
 * Outcome × policy → ArtifactState（纯）。null = 未尝试/确实没有 → absent。
 * truncated 视为 unreadable（不是完整内容）；空/纯空白 + nonEmpty → empty；JSON 解析在
 * `readArtifact` 里做（坏 JSON → invalid）。
 * @param outcome - 读取结果或 null。
 * @param policy - 工件策略；null = 未登记（fail-loud → invalid）。
 * @returns 工件状态。
 */
export function artifactStateOf(outcome: TextOutcome | null, policy: ArtifactPolicy | null): ArtifactState {
  if (outcome === null) return 'absent'
  if (!outcome.ok) return outcome.reason === 'missing' ? 'absent' : 'unreadable'
  if (policy === null) return 'invalid'
  if (outcome.value.truncated === true) return 'unreadable'
  if (policy.nonEmpty && outcome.value.text.trim() === '') return 'empty'
  return 'ok'
}

/**
 * 容器/目录读取三态：null = 未尝试/不在场 → absent；ok → ok；missing → absent；其余 → unreadable。
 * @param outcome - `run-context.Outcome` 或 null。
 * @returns 三态。
 */
export function readStateOf(outcome: { readonly ok: boolean; readonly reason?: 'missing' | 'unreadable' } | null): SourceRead {
  if (outcome === null) return 'absent'
  if (outcome.ok) return 'ok'
  return outcome.reason === 'missing' ? 'absent' : 'unreadable'
}

/** JSON 工件受控键：调用方必须传 `decoder`，编译期与运行期双阻断未解码访问。 */
export type JsonArtifactName =
  | 'delivered.json'
  | 'review/readiness.json'
  | 'protocol.json'
  | 'claims.json'
  | 'verdicts.json'

/** 运行时 Schema 解码器：把 JSON 解析结果收窄为确定领域类型；非法返回 `{ ok: false }`。 */
export type JsonDecoder<T> = (
  raw: unknown,
  text: string,
) => { readonly ok: true; readonly value: T } | { readonly ok: false; readonly detail?: string }

/** 纯文本工件读取结果（无 `json` 字段：编译期彻底阻断绕过 decoder 访问）。 */
export interface TextArtifactResult {
  readonly state: ArtifactState
  /** 仅 state=ok 时有文本；empty/invalid/unreadable/absent 均为 null。 */
  readonly text: string | null
  /** 仅 underlying outcome 触及行/页上限被截断时为 true。 */
  readonly truncated?: boolean
}

/** 带边界解码器的 JSON 工件读取结果：只有 `state === 'ok'` 时 `value` 非空且为强类型 `T`。 */
export interface DecodedArtifactResult<T> {
  readonly state: ArtifactState
  readonly text: string | null
  readonly value: T | null
  readonly truncated?: boolean
}

/** `readArtifact` 需要的读面（`RunView` 的结构子集）。 */
export interface ArtifactView {
  read(name: string, opts?: { readonly signal?: AbortSignal }): Promise<TextOutcome>
}

export interface JsonDecoderRequiredError {
  readonly _compileError: 'JSON artifact requires opts.decoder'
}

export function readArtifact(
  view: ArtifactView,
  name: JsonArtifactName,
  opts?: { readonly signal?: AbortSignal; readonly decoder?: never },
): Promise<JsonDecoderRequiredError>
export function readArtifact<T>(
  view: ArtifactView,
  name: string,
  opts: { readonly signal?: AbortSignal; readonly decoder: JsonDecoder<T> },
): Promise<DecodedArtifactResult<T>>
export function readArtifact(
  view: ArtifactView,
  name: string,
  opts?: { readonly signal?: AbortSignal },
): Promise<TextArtifactResult>

/**
 * 唯一文本/JSON 工件读取器：读 → 状态 → 边界 Schema 解码（JSON 工件强制走 `opts.decoder`）。
 * 未登记文件名返回 `invalid`，JSON 工件缺 `decoder` 运行期同样 fail-closed 返回 `invalid`。
 * @param view - run bundle 读面。
 * @param name - bundle 内相对文件名（如 question.md / delivered.json）。
 * @param opts - 可选 AbortSignal 与 JSON Schema 解码器。
 * @returns 工件读取结果。
 */
export async function readArtifact<T>(
  view: ArtifactView,
  name: string,
  opts?: { readonly signal?: AbortSignal; readonly decoder?: JsonDecoder<T> },
): Promise<TextArtifactResult | DecodedArtifactResult<T> | JsonDecoderRequiredError> {
  const decoder = opts?.decoder
  const policy = artifactPolicyOf(name)
  if (policy === null) {
    return decoder === undefined ? { state: 'invalid', text: null } : { state: 'invalid', text: null, value: null }
  }
  if (policy.json && decoder === undefined) {
    return { state: 'invalid', text: null, value: null }
  }
  const outcome = await view.read(name, opts)
  const truncated = outcome !== null && outcome.ok && outcome.value.truncated === true
  // JSON 坏也在状态里落 invalid：先按文本态判空/读失败，再做解析与解码。
  const state = artifactStateOf(outcome, policy)
  if (state !== 'ok') {
    return decoder === undefined
      ? { state, text: null, ...(truncated ? { truncated: true } : {}) }
      : { state, text: null, value: null, ...(truncated ? { truncated: true } : {}) }
  }
  const text = outcome.ok ? outcome.value.text : null
  if (decoder === undefined) return { state: 'ok', text }
  if (text === null) return { state: 'invalid', text: null, value: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { state: 'invalid', text: null, value: null }
  }
  const decoded = decoder(parsed, text)
  if (!decoded.ok) return { state: 'invalid', text: null, value: null }
  return { state: 'ok', text, value: decoded.value }
}
