/**
 * research-projection.ts —— Host `sessionProjections` 与 Browser 消费方共用的纯增量研究态势投影。
 *
 * 唯一权威输入 = DSH 已提交会话日志（`SessionEvent`），零额外磁盘写入、零静默默认值。
 * Host 侧 `sessionProjections` 驱动 `initialResearchRunState` / `applyResearchRunEvent` /
 * `projectResearchRunView`，并在事件无关时严格返回原状态引用（`Object.is` 零下游开销）；
 * Browser 侧 `useSessions` 经 `selectSessionResearchProjection` 直接读取，零 N+1 follow 风暴。
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { argsObjectOf, TOOL_PATH_FIELDS, WRITE_TOOLS } from './journal-wire.ts'

export const RESEARCH_RUN_PROJECTION_KEY = 'researchRun' as const

export type ResearchRunPhase = 'idle' | 'intake' | 'running' | 'hitl_pending' | 'delivered'
export type ResearchRunHitlKind = 'hitl1' | 'hitl2' | 'other'

/** Client-visible wire projection value for one Session's Deep Research run state. */
export interface ResearchRunProjection {
  readonly schemaVersion: 1
  readonly slug: string | null
  readonly phase: ResearchRunPhase
  readonly hitlKind: ResearchRunHitlKind | null
  readonly deliveredPath: string | null
  readonly updatedAt: number
}

/** Host checkpoint-safe plain-JSON fold state (keeps write/read binding separate to prevent pre-check hijack). */
export interface ResearchRunProjectionState {
  readonly schemaVersion: 1
  readonly writeSlug: string | null
  readonly readSlug: string | null
  readonly kickoffSeen: boolean
  readonly pendingAskCallId: string | null
  readonly hitlKind: ResearchRunHitlKind | null
  readonly deliveredPath: string | null
  readonly updatedAt: number
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    researchRun: ResearchRunProjection
  }
  interface SessionProjectionStateMap {
    researchRun: ResearchRunProjectionState
  }
}

const PATH_FIELDS = TOOL_PATH_FIELDS
const RUN_SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const TIMED_PENDING_RE = /"pending"\s*:\s*true/
const FINAL_FAMILY_RELATIVE_RE = /^(?:archive\/|_abandoned\/)?drt_[\w.-]+\/(?:final\.md|final\/(?:v[1-9]\d{0,5}\.md|readable(?:-v[1-9]\d{0,5})?\.md))$/
const FINAL_FAMILY_SUFFIX_RE = /((?:archive\/|_abandoned\/)?drt_[\w.-]+\/(?:final\.md|final\/(?:v[1-9]\d{0,5}\.md|readable(?:-v[1-9]\d{0,5})?\.md)))$/
const FINAL_VERSION_FILE_RE = /^v([1-9]\d{0,5})\.md$/

interface WireEventLike {
  readonly type?: unknown
  readonly time?: unknown
  readonly data?: Record<string, unknown> | undefined
}

function eventTimeMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.trunc(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed) && parsed >= 0) return Math.trunc(parsed)
  }
  return null
}

function pathStringsOf(value: unknown, out: string[]): void {
  if (typeof value === 'string') { out.push(value); return }
  if (Array.isArray(value)) { for (const item of value) pathStringsOf(item, out); return }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if ((PATH_FIELDS as readonly string[]).includes(key)) pathStringsOf(nested, out)
    }
  }
}

function slugFromToolArgs(name: string, args: unknown): string | null {
  const obj = argsObjectOf(args)
  if (obj === null) return null
  const paths: string[] = []
  for (const field of PATH_FIELDS) if (field in obj) pathStringsOf(obj[field], paths)
  if (name === 'glob' && typeof obj.pattern === 'string') paths.push(obj.pattern)
  for (const raw of paths) {
    const m = /(?:^|[\\/])drt_([^\\/\s]+)[\\/]/.exec(raw.replace(/\\/g, '/'))
    if (m?.[1] !== undefined && RUN_SLUG_RE.test(m[1])) return m[1]
  }
  return null
}

function hitlKindFromArgs(args: unknown): ResearchRunHitlKind {
  const obj = argsObjectOf(args)
  if (obj === null) return 'other'
  const questions = Array.isArray(obj.questions) ? obj.questions : []
  if (questions.some((q) => (q as { id?: unknown } | null)?.id === 'hitl2_delivery')) return 'hitl2'
  if (questions.some((q) => (q as { id?: unknown } | null)?.id === 'research_type')) return 'hitl1'
  const texts = `${questions.map((q) => JSON.stringify(q ?? {})).join('\n')}\n${JSON.stringify(obj)}`
  if (/定稿（按现稿交付）|按现稿定稿|finalize|deliver as[- ]is/i.test(texts)) return 'hitl2'
  if (/研究类型|research type/i.test(texts)) return 'hitl1'
  return 'other'
}

function isResearchBriefSkill(name: string, args: unknown): boolean {
  if (name !== 'skill') return false
  const obj = argsObjectOf(args)
  return obj !== null && obj.name === 'research-brief'
}

function resultBlockText(block: unknown): string {
  if (typeof block !== 'object' || block === null) return ''
  const value = block as { readonly text?: unknown; readonly type?: unknown; readonly content?: unknown }
  if (typeof value.text === 'string') return value.text
  if (value.type !== 'tool-result') return ''
  if (typeof value.content === 'string') return value.content
  return Array.isArray(value.content) ? value.content.map(resultBlockText).join('') : ''
}

function resultTextOf(data: Record<string, unknown> | undefined): string {
  const message = data?.message as { readonly content?: unknown } | undefined
  const content = message?.content
  if (!Array.isArray(content)) return ''
  return content.map(resultBlockText).join('')
}

function isResultForCall(data: Record<string, unknown> | undefined, callId: string): boolean {
  if (callId === '' || data === undefined) return false
  const message = data.message as { readonly toolCallId?: unknown; readonly source?: { readonly callId?: unknown } } | undefined
  return message?.toolCallId === callId
    || message?.source?.callId === callId
    || data.callId === callId
}

function normalizeFinalPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const normalized = raw.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '').replace(/\/+$/, '')
  if (normalized === '') return null
  if (!normalized.startsWith('/')) {
    if (!/^(?:archive\/|_abandoned\/)?drt_[^/]+\//.test(normalized)) return null
    return FINAL_FAMILY_RELATIVE_RE.test(normalized) ? normalized : null
  }
  if (/(?:^|\/)(?:notes|drafts|src|tests)\/drt_/.test(normalized)) return null
  const match = FINAL_FAMILY_SUFFIX_RE.exec(normalized)
  if (match?.[1] === undefined) return null
  return FINAL_FAMILY_RELATIVE_RE.test(match[1]) ? match[1] : null
}

function finalFamilyRank(path: string): number {
  if (path.includes('/final/readable')) return 3
  if (FINAL_VERSION_FILE_RE.test(path.slice(path.lastIndexOf('/') + 1))) return 2
  return 1
}

function slugFromFinalPath(path: string): string | null {
  const m = /^(?:archive\/|_abandoned\/)?drt_([^/]+)\//.exec(path)
  return m?.[1] !== undefined && RUN_SLUG_RE.test(m[1]) ? m[1] : null
}

function effectiveSlugOf(state: ResearchRunProjectionState): string | null {
  if (state.writeSlug !== null) return state.writeSlug
  if (state.kickoffSeen) return null
  return state.readSlug
}

function phaseOf(state: ResearchRunProjectionState): ResearchRunPhase {
  if (state.pendingAskCallId !== null) return 'hitl_pending'
  if (state.deliveredPath !== null) return 'delivered'
  if (effectiveSlugOf(state) !== null) return 'running'
  if (state.kickoffSeen) return 'intake'
  return 'idle'
}

/** Build the initial checkpoint-safe state for a Session header. */
export function initialResearchRunState(header?: { readonly createdAt?: unknown }): ResearchRunProjectionState {
  return {
    schemaVersion: 1,
    writeSlug: null,
    readSlug: null,
    kickoffSeen: false,
    pendingAskCallId: null,
    hitlKind: null,
    deliveredPath: null,
    updatedAt: eventTimeMs(header?.createdAt) ?? 0,
  }
}

/**
 * Pure incremental transition over one committed Session event.
 * Returns the exact same `state` reference (`Object.is`) for uninterested or malformed events.
 */
export function applyResearchRunEvent(
  state: ResearchRunProjectionState,
  event: unknown,
): ResearchRunProjectionState {
  if (typeof event !== 'object' || event === null) return state
  const e = event as WireEventLike
  const type = e.type
  if (typeof type !== 'string') return state
  const data = typeof e.data === 'object' && e.data !== null ? e.data : undefined
  const ts = eventTimeMs(e.time) ?? state.updatedAt

  if (type === 'tool/call') {
    const name = typeof data?.name === 'string' ? data.name : ''
    if (name === '') return state
    const args = data?.arguments
    if (name === 'ask_user_question') {
      const kind = hitlKindFromArgs(args)
      const callId = typeof data?.callId === 'string' ? data.callId : ''
      const kickoffSeen = state.kickoffSeen || kind === 'hitl1'
      if (
        state.pendingAskCallId === callId
        && state.hitlKind === kind
        && state.kickoffSeen === kickoffSeen
        && state.updatedAt === ts
      ) return state
      return {
        ...state,
        kickoffSeen,
        pendingAskCallId: callId,
        hitlKind: kind,
        updatedAt: ts,
      }
    }
    const kickoffAdd = isResearchBriefSkill(name, args)
    const slug = slugFromToolArgs(name, args)
    if (!kickoffAdd && slug === null) return state
    const writeSlug = slug !== null && WRITE_TOOLS.has(name) ? slug : state.writeSlug
    const readSlug = slug !== null && !WRITE_TOOLS.has(name) && state.writeSlug === null ? slug : state.readSlug
    const kickoffSeen = state.kickoffSeen || kickoffAdd
    const switchedWriteSlug = writeSlug !== null && writeSlug !== state.writeSlug
    const deliveredPath = switchedWriteSlug ? null : state.deliveredPath
    if (
      writeSlug === state.writeSlug
      && readSlug === state.readSlug
      && kickoffSeen === state.kickoffSeen
      && deliveredPath === state.deliveredPath
    ) return state
    return {
      ...state,
      writeSlug,
      readSlug,
      kickoffSeen,
      deliveredPath,
      updatedAt: ts,
    }
  }

  if (type === 'tool/result') {
    if (state.pendingAskCallId === null) return state
    if (!isResultForCall(data, state.pendingAskCallId)) return state
    if (TIMED_PENDING_RE.test(resultTextOf(data))) return state
    return {
      ...state,
      pendingAskCallId: null,
      hitlKind: null,
      updatedAt: ts,
    }
  }

  if (type === 'user/message') {
    if (state.pendingAskCallId === null) return state
    return {
      ...state,
      pendingAskCallId: null,
      hitlKind: null,
      updatedAt: ts,
    }
  }

  if (type === 'deliverables/presented') {
    const files = data?.files
    if (!Array.isArray(files)) return state
    let best: { path: string; rank: number } | null = null
    for (const file of files) {
      const path = normalizeFinalPath((file as { path?: unknown } | null | undefined)?.path)
      if (path === null) continue
      const rank = finalFamilyRank(path)
      if (best === null || rank > best.rank) best = { path, rank }
    }
    if (best === null) return state
    const inferredSlug = state.writeSlug ?? slugFromFinalPath(best.path)
    if (
      state.deliveredPath === best.path
      && state.writeSlug === inferredSlug
      && state.updatedAt === ts
    ) return state
    return {
      ...state,
      writeSlug: inferredSlug,
      deliveredPath: best.path,
      updatedAt: ts,
    }
  }

  return state
}

const projectedViewCache = new WeakMap<ResearchRunProjectionState, ResearchRunProjection>()

/**
 * Project checkpoint state into its stable client wire view.
 * Reuses the cached view object per state reference so identical states keep `Object.is`.
 */
export function projectResearchRunView(state: ResearchRunProjectionState): ResearchRunProjection {
  const cached = projectedViewCache.get(state)
  if (cached !== undefined) return cached
  const phase = phaseOf(state)
  const view: ResearchRunProjection = {
    schemaVersion: 1,
    slug: effectiveSlugOf(state),
    phase,
    hitlKind: phase === 'hitl_pending' ? state.hitlKind : null,
    deliveredPath: state.deliveredPath,
    updatedAt: state.updatedAt,
  }
  projectedViewCache.set(state, view)
  return view
}

/** Convenience pure fold over an ordered event sequence (for tests and offline verification). */
export function foldResearchRunEvents(
  events: readonly unknown[],
  header?: { readonly createdAt?: unknown },
): ResearchRunProjection {
  let state = initialResearchRunState(header)
  for (const event of events) state = applyResearchRunEvent(state, event)
  return projectResearchRunView(state)
}

/** Minimal browser `useSessions` snapshot slice needed to read `researchRun` projections. */
export interface ResearchSessionsSnapshotLike {
  readonly ids: readonly SessionId[]
  readonly byId: Readonly<Record<string, {
    readonly id: SessionId
    readonly origin?: string
    readonly cwd?: string
    readonly updatedAt?: number
    readonly projectionValues?: { readonly researchRun?: ResearchRunProjection }
  } | undefined>>
  readonly projectionsBySession: Readonly<Record<string, {
    readonly values: { readonly researchRun?: ResearchRunProjection }
  } | undefined>>
}

/**
 * Read one Session's `researchRun` projection from the browser sessions snapshot.
 * Prefers the live sequenced projection store, falling back to cold-cached listing hints.
 */
export function selectSessionResearchProjection(
  sessions: ResearchSessionsSnapshotLike,
  sessionId: SessionId,
): ResearchRunProjection | null {
  const live = sessions.projectionsBySession[sessionId]?.values.researchRun
  if (live !== undefined) return live
  const cached = sessions.byId[sessionId]?.projectionValues?.researchRun
  return cached ?? null
}

function normalizeCwd(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  return trimmed === '' ? null : trimmed
}

export type RunSessionMatch =
  | {
      readonly kind: 'owned'
      readonly sessionId: SessionId
      readonly projection: ResearchRunProjection
      readonly isActive: boolean
    }
  | { readonly kind: 'orphan' }

/**
 * Resolve which non-subagent local Session owns a workspace `drt_<slug>` bundle.
 * Matches exact `slug` plus normalized `cwd` (when both are known); never fabricates
 * ownership from `activeSessionId` when no Session's projection claims the slug.
 */
export function resolveRunSessionMatch(input: {
  readonly slug: string
  readonly workspaceCwd: string | null
  readonly activeSessionId: SessionId | null
  readonly sessions: ResearchSessionsSnapshotLike
}): RunSessionMatch {
  const targetSlug = input.slug.trim().replace(/^drt_/, '')
  if (targetSlug === '') return { kind: 'orphan' }
  const targetCwd = normalizeCwd(input.workspaceCwd)
  let best: { sessionId: SessionId; projection: ResearchRunProjection; score: number; isActive: boolean } | null = null

  for (const id of input.sessions.ids) {
    const row = input.sessions.byId[id]
    if (row === undefined || row.origin === 'subagent') continue
    const projection = selectSessionResearchProjection(input.sessions, id)
    if (projection === null || projection.slug !== targetSlug) continue
    const rowCwd = normalizeCwd(row.cwd)
    if (targetCwd !== null && rowCwd !== null && rowCwd !== targetCwd) continue
    const isActive = id === input.activeSessionId
    const score = Math.max(projection.updatedAt, row.updatedAt ?? 0)
    if (
      best === null
      || score > best.score
      || (score === best.score && isActive && !best.isActive)
    ) {
      best = { sessionId: id, projection, score, isActive }
    }
  }

  if (best === null) return { kind: 'orphan' }
  return {
    kind: 'owned',
    sessionId: best.sessionId,
    projection: best.projection,
    isActive: best.isActive,
  }
}
