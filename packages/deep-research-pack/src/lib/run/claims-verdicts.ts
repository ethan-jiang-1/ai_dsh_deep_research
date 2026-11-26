/**
 * claims-verdicts.ts —— claims.json + verdicts.json 联合解码与核查清单折算（纯函数）。
 *
 * 正本 Schema = content/templates/run/claims.json 与 content/templates/run/verdicts.json。
 * 五态语义：缺失 → absent；0 字节 → empty；读异常/截断 → unreadable；JSON 或 schema 非法 → invalid；
 * claim 存在但 verdict 缺失 → 显性标为 'UNVERIFIED'，绝不静默标为通过。
 */
import { readArtifact, type ArtifactState, type ArtifactView, type DecodedArtifactResult } from './artifact-read.ts'
import type { Entry, Outcome } from './run-context.ts'

export type ClaimVerdictStatus = 'supported' | 'partial' | 'unsupported' | 'insufficient' | 'UNVERIFIED'

export interface ClaimRecord {
  readonly id: string
  readonly text: string
  readonly critical: boolean
  readonly topics: readonly string[]
  readonly evidence: readonly string[]
  readonly urls: readonly string[]
}

export interface VerdictRecord {
  readonly claimId: string
  readonly verdict: Exclude<ClaimVerdictStatus, 'UNVERIFIED'>
  readonly quote: string | null
  readonly reason: string | null
  readonly recheckedUrls: readonly string[]
  readonly sourceTierOk: boolean | null
}

export interface ClaimsDocument {
  readonly version: number | null
  readonly finalRef: number | null
  readonly claims: readonly ClaimRecord[]
}

export interface VerdictsDocument {
  readonly version: number | null
  readonly round: number | null
  readonly verdicts: readonly VerdictRecord[]
}

export interface ClaimAuditRow {
  readonly claimId: string
  readonly text: string
  readonly critical: boolean
  readonly topics: readonly string[]
  readonly evidence: readonly string[]
  readonly status: ClaimVerdictStatus
  readonly quote: string | null
  readonly reason: string | null
  readonly recheckedUrls: readonly string[]
  readonly sourceTierOk: boolean | null
}

export interface ClaimsAuditSummary {
  readonly claimsState: ArtifactState
  readonly verdictsState: ArtifactState
  readonly rows: readonly ClaimAuditRow[]
  readonly counts: {
    readonly total: number
    readonly supported: number
    readonly partial: number
    readonly unsupported: number
    readonly insufficient: number
    readonly unverified: number
    readonly critical: number
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function strArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim())
}

function normalizeVerdict(raw: unknown): Exclude<ClaimVerdictStatus, 'UNVERIFIED'> | null {
  if (typeof raw !== 'string') return null
  const val = raw.trim().toLowerCase()
  if (val === 'supported' || val === 'unsupported') return val
  if (val === 'partial' || val === 'partially_supported') return 'partial'
  if (val === 'insufficient' || val === 'insufficient_evidence' || val === 'unverifiable') return 'insufficient'
  return null
}

/**
 * 边界解码 `claims.json`：必须为对象且含 `claims` 数组（成员至少含 id/text）。
 */
export function decodeClaims(
  raw: unknown,
): { readonly ok: true; readonly value: ClaimsDocument } | { readonly ok: false; readonly detail: string } {
  const root = asRecord(raw)
  if (root === null || !Array.isArray(root.claims)) {
    return { ok: false, detail: 'claims.json must be an object with a claims array' }
  }
  const claims: ClaimRecord[] = []
  for (const item of root.claims) {
    const rec = asRecord(item)
    if (rec === null) return { ok: false, detail: 'claim entry must be an object' }
    const id = strOrNull(rec.id)
    const text = strOrNull(rec.text)
    if (id === null || text === null) return { ok: false, detail: 'claim entry requires id and text' }
    claims.push({
      id,
      text,
      critical: rec.critical === true,
      topics: strArray(rec.topics),
      evidence: strArray(rec.evidence),
      urls: strArray(rec.urls),
    })
  }
  return {
    ok: true,
    value: {
      version: numOrNull(root.version),
      finalRef: numOrNull(root.finalRef),
      claims,
    },
  }
}

/**
 * 边界解码 `verdicts.json`：必须为对象且含 `verdicts` 数组。
 */
export function decodeVerdicts(
  raw: unknown,
): { readonly ok: true; readonly value: VerdictsDocument } | { readonly ok: false; readonly detail: string } {
  const root = asRecord(raw)
  if (root === null || !Array.isArray(root.verdicts)) {
    return { ok: false, detail: 'verdicts.json must be an object with a verdicts array' }
  }
  const verdicts: VerdictRecord[] = []
  for (const item of root.verdicts) {
    const rec = asRecord(item)
    if (rec === null) return { ok: false, detail: 'verdict entry must be an object' }
    const claimId = strOrNull(rec.claim_id)
    const verdict = normalizeVerdict(rec.verdict)
    if (claimId === null || verdict === null) {
      return { ok: false, detail: 'verdict entry requires valid claim_id and verdict' }
    }
    verdicts.push({
      claimId,
      verdict,
      quote: strOrNull(rec.quote),
      reason: strOrNull(rec.reason),
      recheckedUrls: strArray(rec.rechecked_urls),
      sourceTierOk: typeof rec.source_tier_ok === 'boolean' ? rec.source_tier_ok : null,
    })
  }
  return {
    ok: true,
    value: {
      version: numOrNull(root.version),
      round: numOrNull(root.round),
      verdicts,
    },
  }
}

export interface ClaimsVerdictsView extends ArtifactView {
  list?(dir?: string, opts?: { readonly signal?: AbortSignal }): Promise<Outcome<readonly Entry[]>>
}

async function readLatestVerdicts(
  view: ClaimsVerdictsView,
  signal?: AbortSignal,
): Promise<DecodedArtifactResult<VerdictsDocument>> {
  const signalOpts = signal === undefined ? {} : { signal }
  if (typeof view.list === 'function') {
    const listed = await view.list('review', signalOpts)
    if (!listed.ok) {
      if (listed.reason === 'unreadable') return { state: 'unreadable', text: null, value: null }
      return readArtifact(view, 'verdicts.json', { ...signalOpts, decoder: decodeVerdicts })
    }
    const rounds = listed.value
      .filter((entry) => entry.type === 'file')
      .map((entry) => {
        const match = /^verdicts-r([1-9]\d*)\.json$/.exec(entry.name)
        return match === null ? null : { name: entry.name, round: Number(match[1]) }
      })
      .filter((item): item is { readonly name: string; readonly round: number } => item !== null)
      .sort((a, b) => b.round - a.round)
    const latest = rounds[0]
    if (latest !== undefined) {
      return readArtifact(view, `review/${latest.name}`, { ...signalOpts, decoder: decodeVerdicts })
    }
    return readArtifact(view, 'verdicts.json', { ...signalOpts, decoder: decodeVerdicts })
  }
  for (const candidate of ['review/verdicts-r2.json', 'review/verdicts-r1.json', 'verdicts.json']) {
    const res = await readArtifact(view, candidate, { ...signalOpts, decoder: decodeVerdicts })
    if (res.state !== 'absent') return res
  }
  return { state: 'absent', text: null, value: null }
}

/**
 * 联合读取 `review/claims.json` + 最新 `review/verdicts-r<N>.json`（缺席时兼容根路径）。
 */
export async function readClaimsAndVerdicts(
  view: ClaimsVerdictsView,
  signal?: AbortSignal,
): Promise<{
  readonly claims: DecodedArtifactResult<ClaimsDocument>
  readonly verdicts: DecodedArtifactResult<VerdictsDocument>
}> {
  const signalOpts = signal === undefined ? {} : { signal }
  const canonClaims = await readArtifact(view, 'review/claims.json', { ...signalOpts, decoder: decodeClaims })
  const claims = canonClaims.state === 'absent'
    ? await readArtifact(view, 'claims.json', { ...signalOpts, decoder: decodeClaims })
    : canonClaims
  const verdicts = await readLatestVerdicts(view, signal)
  return { claims, verdicts }
}

/**
 * 将 `claims.json` 与 `verdicts.json` 的五态读取结果合并为 Claim 核查表。
 */
export function joinClaimsVerdicts(
  claimsArt: DecodedArtifactResult<ClaimsDocument>,
  verdictsArt: DecodedArtifactResult<VerdictsDocument>,
): ClaimsAuditSummary {
  const claimsList = claimsArt.state === 'ok' && claimsArt.value !== null ? claimsArt.value.claims : []
  const verdictMap = new Map<string, VerdictRecord>()
  if (verdictsArt.state === 'ok' && verdictsArt.value !== null) {
    for (const v of verdictsArt.value.verdicts) verdictMap.set(v.claimId, v)
  }

  let supported = 0
  let partial = 0
  let unsupported = 0
  let insufficient = 0
  let unverified = 0
  let critical = 0

  const rows: ClaimAuditRow[] = claimsList.map((claim) => {
    const verdict = verdictMap.get(claim.id)
    const status: ClaimVerdictStatus = verdict === undefined ? 'UNVERIFIED' : verdict.verdict
    if (claim.critical) critical += 1
    if (status === 'supported') supported += 1
    else if (status === 'partial') partial += 1
    else if (status === 'unsupported') unsupported += 1
    else if (status === 'insufficient') insufficient += 1
    else unverified += 1
    return {
      claimId: claim.id,
      text: claim.text,
      critical: claim.critical,
      topics: claim.topics,
      evidence: claim.evidence,
      status,
      quote: verdict?.quote ?? null,
      reason: verdict?.reason ?? null,
      recheckedUrls: verdict?.recheckedUrls ?? [],
      sourceTierOk: verdict?.sourceTierOk ?? null,
    }
  })

  return {
    claimsState: claimsArt.state,
    verdictsState: verdictsArt.state,
    rows,
    counts: {
      total: rows.length,
      supported,
      partial,
      unsupported,
      insufficient,
      unverified,
      critical,
    },
  }
}
