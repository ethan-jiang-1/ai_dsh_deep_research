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

/** 工件读取结果（readArtifact 唯一出口）。 */
export interface ArtifactResult {
  readonly state: ArtifactState
  /** 仅 state=ok 时有文本；empty/invalid/unreadable/absent 均为 null。 */
  readonly text: string | null
  /** JSON 工件的解析值；非 JSON 或非 ok = null。 */
  readonly json: unknown
}

/** `readArtifact` 需要的读面（`RunView` 的结构子集）。 */
export interface ArtifactView {
  read(name: string, opts?: { readonly signal?: AbortSignal }): Promise<TextOutcome>
}

/**
 * 唯一文本工件读取器：读 → 状态 → JSON 解析（若策略要求）。
 * 未登记文件名返回 `invalid`，不猜策略；消费方必须显式登记（源级守卫同时把守）。
 * @param view - run bundle 读面。
 * @param name - bundle 内相对文件名（如 question.md / final/v1.md）。
 * @param opts - 可选 AbortSignal。
 * @returns 工件读取结果。
 */
export async function readArtifact(view: ArtifactView, name: string, opts?: { readonly signal?: AbortSignal }): Promise<ArtifactResult> {
  const policy = artifactPolicyOf(name)
  if (policy === null) return { state: 'invalid', text: null, json: null }
  const outcome = await view.read(name, opts)
  // JSON 坏也在状态里落 invalid：先按文本态判空/读失败，再做解析。
  const state = artifactStateOf(outcome, policy)
  if (state !== 'ok') return { state, text: null, json: null }
  const text = outcome.ok ? outcome.value.text : null
  if (!policy.json) return { state: 'ok', text, json: null }
  if (text === null) return { state: 'invalid', text: null, json: null }
  try {
    return { state: 'ok', text, json: JSON.parse(text) }
  } catch {
    return { state: 'invalid', text: null, json: null }
  }
}
