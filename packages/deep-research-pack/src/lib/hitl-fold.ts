/**
 * HITL 挂起折算（纯函数，keyless 单测面）。
 *
 * 谓词（run-dashboard detectHitlWait 的移植 + v4 修正）：从事件序列**尾部**向前，跳过
 * `session/*` 元数据事件（0.1.7 的 v4 日志里自动命名 session/title 会落在 ask 之后——实测
 * 首版"恰为末位"谓词被它绊住），第一个**回合事件**是 `ask_user_question` 的 tool/call
 * 即挂起——其后无任何回合事件（取消/答完会有，天然排除陈旧挂起）。
 *
 * 数据/展示分层纪律（RFC observability-gui）：折算住 src/lib 纯函数 + keyless 单测；
 * 组件薄渲染。client bundle 经 tsdown 打包此文件（tsc client 面含 src/lib）。
 */

/** 一个 journal 事件的最小形状（wire 事件；只取折算要用的字段）。 */
export interface JournalEventLike {
  readonly type?: unknown
  readonly data?: { readonly name?: unknown } | undefined
  readonly time?: unknown
}

/** HITL 挂起态：pending = 末位回合事件是未答的 ask_user_question；since = 该事件时间。 */
export interface HitlState {
  readonly pending: boolean
  readonly since: string | undefined
}

/** 回合事件（参与"轮到谁"判定）；session/* 是元数据（标题/创建等），不改变轮次。 */
function isTurnEvent(type: unknown): boolean {
  return typeof type === 'string' && !type.startsWith('session/')
}

/**
 * 折算：journal 事件序列 → HITL 挂起态。
 * @param events - 按 wire 顺序的事件（follow 的 snapshot 历史或实时流；畸形输入 fail-soft）。
 * @returns 挂起态（永不 throw）。
 */
export function foldHitlPending(events: readonly unknown[]): HitlState {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (typeof event !== 'object' || event === null) continue
    const e = event as JournalEventLike
    if (!isTurnEvent(e.type)) continue
    if (e.type === 'tool/call' && typeof e.data === 'object' && e.data !== null && e.data.name === 'ask_user_question') {
      const time = e.time
      return { pending: true, since: typeof time === 'string' ? time : undefined }
    }
    return { pending: false, since: undefined }
  }
  return { pending: false, since: undefined }
}
