// health.ts — run 停摆的派生判据（BUG-348）：只从会话事件算，不写任何文件。
// 判据 = 超过阈值没有新事件 **且** 最后回合留下了错误；只看静默不告警（长回合合法），
// 只看错误也不告警（已恢复的 retry 正常）。观察面（驾驶舱横幅 / watch-run）共同消费。
export interface RunHealth {
  readonly lastActivityAt: number | null
  readonly lastTurnError: string | null
  readonly quietMs: number | null
  readonly stalled: boolean
}

export const DEFAULT_STALL_MS = 30 * 60_000

const timeOf = (event: unknown): number | null => {
  const time = (event as { time?: unknown } | null)?.time
  return typeof time === 'number' && Number.isFinite(time) ? time : null
}

/** 最后一条可读的失败信号（provider retry / turn 终局错误）；没有 = null。 */
const failureOf = (event: unknown): string | null => {
  const record = event as { type?: unknown; data?: Record<string, unknown> } | null
  if (record === null || typeof record !== 'object') return null
  if (record.type === 'llm/retry') {
    const failure = record.data?.failure as { message?: unknown; code?: unknown } | undefined
    if (typeof failure?.message === 'string' && failure.message.trim() !== '') return failure.message
    if (typeof failure?.code === 'string' && failure.code.trim() !== '') return failure.code
  }
  const error = record.data?.error
  if (typeof error === 'string' && error.trim() !== '') return error
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim() !== '') return message
  }
  return null
}

export function runHealthOf(events: readonly unknown[], { now = Date.now(), stallMs = DEFAULT_STALL_MS } = {}): RunHealth {
  let lastActivityAt: number | null = null
  let lastTurnError: string | null = null
  for (const event of events) {
    const time = timeOf(event)
    if (time !== null && (lastActivityAt === null || time > lastActivityAt)) lastActivityAt = time
    // 只认**最后一回合**的错误：新回合开始即清空（旧回合的 retry 不应在之后的静默里翻旧账）。
    if ((event as { type?: unknown } | null)?.type === 'turn/start') lastTurnError = null
    const failure = failureOf(event)
    if (failure !== null) lastTurnError = failure
  }
  const quietMs = lastActivityAt === null || !Number.isFinite(now) ? null : Math.max(0, now - lastActivityAt)
  return {
    lastActivityAt,
    lastTurnError,
    quietMs,
    stalled: quietMs !== null && quietMs >= stallMs && lastTurnError !== null,
  }
}

/** 停摆横幅文案（BUG-348）：返回 null = 不显示；文案键与参数由调用方注入的 t 解析。 */
export function stalledBannerLine(health: RunHealth | null | undefined, t: (key: 'runStalledBanner', params?: Record<string, string>) => string): string | null {
  if (health?.stalled !== true) return null
  return t('runStalledBanner', {
    minutes: String(Math.round((health.quietMs ?? 0) / 60000)),
    error: health.lastTurnError ?? '',
  })
}
