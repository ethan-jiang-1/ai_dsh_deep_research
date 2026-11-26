/**
 * protocol-fold.ts —— HITL1 结构化研究契约（protocol.json）解码与读取（纯函数 + readArtifact）。
 *
 * 正本 Schema = content/templates/run/protocol.json。
 * 五态语义：absent（未建）/ empty（0 字节）/ unreadable（IO 或截断）/ invalid（坏 JSON 或缺少 schema/status）/ ok。
 */
import { readArtifact, type ArtifactState, type ArtifactView, type DecodedArtifactResult } from './artifact-read.ts'

export interface ProtocolContract {
  readonly schema: number
  readonly version: number | null
  readonly status: string
  readonly created: string | null
  readonly approvedAt: string | null
  readonly method: {
    readonly id: string
    readonly kind: string
    readonly libraryName: string | null
    readonly adjustments: readonly string[]
  } | null
  readonly sourceScope: {
    readonly families: readonly string[]
    readonly recency: string | null
    readonly authority: string | null
    readonly language: readonly string[]
  } | null
  readonly effort: {
    readonly band: string | null
    readonly nodesMax: number | null
    readonly cellsMax: number | null
    readonly wavesMax: number | null
  } | null
  readonly output: {
    readonly shape: string | null
    readonly audience: string | null
    readonly sections: readonly string[]
    readonly lengthMin: number | null
    readonly lengthMax: number | null
    readonly lengthUnit: string | null
  } | null
  readonly gates: {
    readonly hitl1: string | null
    readonly hitl2: string | null
    readonly evidenceThreshold: string | null
    readonly critic: string | null
    readonly claimVerification: string | null
  } | null
  readonly deviations: readonly string[]
}

export interface ProtocolFace {
  readonly state: ArtifactState
  readonly contract: ProtocolContract | null
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

/**
 * 解码 `protocol.json` 原始 JSON（边界 Decoder：缺少 `schema`/`status` 即判 invalid）。
 * @param raw - `JSON.parse` 产物。
 * @returns 强类型契约或错误说明。
 */
export function decodeProtocol(
  raw: unknown,
): { readonly ok: true; readonly value: ProtocolContract } | { readonly ok: false; readonly detail: string } {
  const root = asRecord(raw)
  if (root === null) return { ok: false, detail: 'protocol.json root must be an object' }
  const schema = numOrNull(root.schema)
  const status = strOrNull(root.status)
  if (schema === null || status === null) {
    return { ok: false, detail: 'protocol.json requires numeric schema and non-empty status' }
  }
  const methodRec = asRecord(root.method)
  const sourceRec = asRecord(root.source_scope)
  const effortRec = asRecord(root.effort)
  const outputRec = asRecord(root.output)
  const lengthRec = asRecord(outputRec?.length)
  const gatesRec = asRecord(root.gates)

  return {
    ok: true,
    value: {
      schema,
      version: numOrNull(root.version),
      status,
      created: strOrNull(root.created),
      approvedAt: strOrNull(root.approved_at),
      method: methodRec === null
        ? null
        : {
            id: strOrNull(methodRec.id) ?? 'auto',
            kind: strOrNull(methodRec.kind) ?? 'preset',
            libraryName: strOrNull(methodRec.library_name),
            adjustments: strArray(methodRec.adjustments),
          },
      sourceScope: sourceRec === null
        ? null
        : {
            families: strArray(sourceRec.families),
            recency: strOrNull(sourceRec.recency),
            authority: strOrNull(sourceRec.authority),
            language: strArray(sourceRec.language),
          },
      effort: effortRec === null
        ? null
        : {
            band: strOrNull(effortRec.band),
            nodesMax: numOrNull(effortRec.nodes_max),
            cellsMax: numOrNull(effortRec.cells_max),
            wavesMax: numOrNull(effortRec.waves_max),
          },
      output: outputRec === null
        ? null
        : {
            shape: strOrNull(outputRec.shape),
            audience: strOrNull(outputRec.audience),
            sections: strArray(outputRec.sections),
            lengthMin: numOrNull(lengthRec?.min),
            lengthMax: numOrNull(lengthRec?.max),
            lengthUnit: strOrNull(lengthRec?.unit),
          },
      gates: gatesRec === null
        ? null
        : {
            hitl1: strOrNull(gatesRec.hitl1),
            hitl2: strOrNull(gatesRec.hitl2),
            evidenceThreshold: strOrNull(gatesRec.evidence_threshold),
            critic: strOrNull(gatesRec.critic),
            claimVerification: strOrNull(gatesRec.claim_verification),
          },
      deviations: strArray(root.deviations),
    },
  }
}

/**
 * 经统一 `readArtifact` 读取并解码 `protocol.json`。
 * @param view - run bundle 读面。
 * @param signal - 可选取消信号。
 * @returns 五态解码结果。
 */
export async function readProtocolContract(
  view: ArtifactView,
  signal?: AbortSignal,
): Promise<DecodedArtifactResult<ProtocolContract>> {
  return readArtifact(view, 'protocol.json', {
    ...(signal === undefined ? {} : { signal }),
    decoder: decodeProtocol,
  })
}
