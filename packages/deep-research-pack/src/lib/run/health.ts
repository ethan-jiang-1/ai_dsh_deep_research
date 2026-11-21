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

/**
 * 活动谓词（BUG-351）：只有 agent 回合工作事件推进「最后活动时间」。
 * 打开历史会话时服务端会向 follow 快照注入 `session/end-seed`、`permission/preset`、`sandbox/mode`、
 * `approval/policy`（时间戳 = 打开时刻），它们不进 durable log，也不能把静默窗口清零。
 */
const ACTIVITY_TYPES = new Set([
  'turn/start', 'turn/end', 'step/start', 'step/end',
  'llm/retry', 'llm/retry-started',
  'tool/call', 'tool/result',
  'assistant/message', 'assistant/attempt', 'user/message',
  'agent/inbox/spliced', 'team/task',
  'subagent/catalog', 'subagent/start', 'subagent/end',
  'deliverables/presented',
])
const isAgentActivity = (event: unknown): boolean => {
  const type = (event as { type?: unknown } | null)?.type
  return typeof type === 'string' && ACTIVITY_TYPES.has(type)
}

export function runHealthOf(events: readonly unknown[], { now = Date.now(), stallMs = DEFAULT_STALL_MS } = {}): RunHealth {
  let lastActivityAt: number | null = null
  let lastTurnError: string | null = null
  for (const event of events) {
    const time = timeOf(event)
    if (time !== null && isAgentActivity(event) && (lastActivityAt === null || time > lastActivityAt)) lastActivityAt = time
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

/**
 * 停摆横幅的可行动门（BUG-348/353/354）：只有**已绑定、未交付、未挂起**的 run 才给恢复指引。
 * 已交付后再失败的回合（353）与未绑定会话的失败回合（354）都不该让用户去"恢复"一个
 * 已完成的 run 或不存在的 run；文案键与参数由调用方注入的 t 解析。
 */
export interface StalledBannerState {
  readonly health: RunHealth | null | undefined
  readonly bound: boolean
  readonly delivered: boolean
  readonly hitlPending?: boolean
}
export function stalledBannerOf(state: StalledBannerState, t: (key: 'runStalledBanner', params?: Record<string, string>) => string): string | null {
  const { health, bound, delivered, hitlPending = false } = state
  if (health?.stalled !== true) return null
  if (bound !== true || delivered !== false || hitlPending) return null
  return t('runStalledBanner', {
    minutes: String(Math.round((health.quietMs ?? 0) / 60000)),
    error: health.lastTurnError ?? '',
  })
}
