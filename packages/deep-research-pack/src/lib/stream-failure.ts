/**
 * 流畸形死亡折算（BUG-023 修复①）：journal 事件 → 「上一回合死于上游流畸形」谓词。
 * 纯函数（keyless 单测）；判据 = **末位** `turn/end` 为 `kind: "error"` 且
 * `error.code ∈ STREAM_FAILURE_CODES`，且其后没有新的 `turn/start`（有 = 重试回合已在跑，
 * 不打扰）。死亡时观察面给人话恢复指引；上游窗口本身本仓修不了（见 BUG-023 卡候选②）。
 */

/** 触发恢复指引的流失败码（当前仅上游畸形签名；同族可扩）。 */
export const STREAM_FAILURE_CODES: readonly string[] = ['MALFORMED_RESPONSE']

/** 流畸形死亡状态。 */
export interface StreamFailure {
  /** 末位回合死于流失败且尚无新回合接手。 */
  readonly dead: boolean
  /** 失败码（dead 时非 null）。 */
  readonly code: string | null
  /** 上游错误消息原文（dead 时非 null；透传给观察面提示）。 */
  readonly message: string | null
}

/** 从 journal 事件折算流失败状态（事件形状 = vendor session wire；未知形状如实 not-dead）。 */
export function streamFailureOf(events: readonly unknown[]): StreamFailure {
  let lastTurnEnd: { seq: number; code: string | null; message: string | null } | null = null
  for (const raw of events) {
    const event = raw as { type?: unknown; seq?: unknown; data?: { reason?: { kind?: unknown; error?: { code?: unknown; message?: unknown } } } }
    if (event?.type !== 'turn/end' || typeof event.seq !== 'number') continue
    const reason = event.data?.reason
    if (reason === undefined || reason === null || typeof reason !== 'object') { lastTurnEnd = { seq: event.seq, code: null, message: null }; continue }
    const error = (reason as { error?: { code?: unknown; message?: unknown } }).error
    lastTurnEnd = {
      seq: event.seq,
      code: reason.kind === 'error' && typeof error?.code === 'string' ? error.code : null,
      message: reason.kind === 'error' && typeof error?.message === 'string' ? error.message : null,
    }
  }
  if (lastTurnEnd === null || lastTurnEnd.code === null || !STREAM_FAILURE_CODES.includes(lastTurnEnd.code)) {
    return { dead: false, code: null, message: null }
  }
  for (const raw of events) {
    const event = raw as { type?: unknown; seq?: unknown }
    if (event?.type === 'turn/start' && typeof event.seq === 'number' && event.seq > lastTurnEnd.seq) {
      return { dead: false, code: null, message: null }
    }
  }
  return { dead: true, code: lastTurnEnd.code, message: lastTurnEnd.message }
}
