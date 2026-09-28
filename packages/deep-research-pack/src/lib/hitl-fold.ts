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

/** 流程锚点（HITL 停靠点）状态——锚点入轨（RFC cockpit-flow-face）：参与点是地图不是惊喜弹窗。 */
export interface RunAnchor {
  readonly key: string
  readonly label: string
  readonly state: 'upcoming' | 'pending' | 'passed'
  /** 该次 ask 携带的问数（args.questions 长度；畸形 fail-soft → 0）。 */
  readonly questions: number
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

/** ask 调用携带的问数（args.questions 数组长度；截断 JSON / 畸形 fail-soft → 0）。 */
function askQuestionCount(args: unknown): number {
  let obj: unknown = args
  if (typeof args === 'string') {
    try { obj = JSON.parse(args) } catch { return 0 }
  }
  if (typeof obj !== 'object' || obj === null) return 0
  const qs = (obj as Record<string, unknown>).questions
  return Array.isArray(qs) ? qs.length : 0
}

/** 固定锚点标签（HITL1/HITL2，正本 = 研究手册 §交互纪律）。 */
const ANCHOR_LABELS = ['立项确认', '交付审阅'] as const

/** 锚点 passed 态的文件事实（调用方从 bundle 文件在场性构造——与 run-fold 同源）。 */
export interface AnchorFileFacts {
  /** question.md 在场 = 立项拍板已落盘（方向契约只在校准后写入）。 */
  readonly question: boolean
  /** final.md 在场 = 交付拍板已落盘（当前版权威副本）。 */
  readonly delivered: boolean
}

/** 尾窗内末位未答 ask 携带的问数（无挂起 → 0）。 */
function tailPendingQuestions(events: readonly unknown[]): number {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i] as (JournalEventLike & { readonly data?: { readonly arguments?: unknown } }) | null
    if (typeof e !== 'object' || e === null || !isTurnEvent(e.type)) continue
    if (e.type === 'tool/call' && typeof e.data === 'object' && e.data !== null && e.data.name === 'ask_user_question') {
      return askQuestionCount(e.data.arguments)
    }
    return 0
  }
  return 0
}

/**
 * 折算：journal 事件序列（+ 可选文件事实）→ 流程锚点态（立项确认 / 交付审阅）。
 *
 * **混合折算（尾窗约束的实测产物，2026-09-28 首跑）**：journal 流的 snapshot 是尾窗
 * （vendor history.ts `DEFAULT_MAX_MESSAGES = 50`），长会话里 ask 的序数与更早的停靠点
 * 不可见——passed 态**由文件事实承载**（question.md 在场 = 立项拍板落盘；final.md 在场 =
 * 交付拍板落盘），journal 尾窗只承载 **pending 态**（末位回合事件 = 未答 ask，与
 * foldHitlPending 同一谓词）。文件事实缺席（bundle 未建/未绑定）时退化为纯尾窗判定：
 * 只显示 pending，不虚构 passed。交付后再来的挂起 ask（契约外的中途确认）如实缀第三锚。
 * @param events - 按 wire 顺序的事件（follow 的 snapshot + 实时流；畸形输入 fail-soft）。
 * @param fileFacts - bundle 文件在场性（face 缺席时省略）。
 * @returns 锚点列表（固定两位 + 契约外挂起追加；永不 throw）。
 */
export function deriveAnchors(events: readonly unknown[], fileFacts?: AnchorFileFacts): readonly RunAnchor[] {
  const tailUnanswered = foldHitlPending(events).pending
  const pendingQs = tailPendingQuestions(events)
  const q = fileFacts?.question ?? false
  const f = fileFacts?.delivered ?? false
  const slots: RunAnchor[] = []
  slots.push(
    q
      ? { key: 'anchor-1', label: ANCHOR_LABELS[0] ?? '立项确认', state: 'passed', questions: 0 }
      : tailUnanswered
        ? { key: 'anchor-1', label: ANCHOR_LABELS[0] ?? '立项确认', state: 'pending', questions: pendingQs }
        : { key: 'anchor-1', label: ANCHOR_LABELS[0] ?? '立项确认', state: 'upcoming', questions: 0 },
  )
  slots.push(
    f
      ? { key: 'anchor-2', label: ANCHOR_LABELS[1] ?? '交付审阅', state: 'passed', questions: 0 }
      : q && tailUnanswered
        ? { key: 'anchor-2', label: ANCHOR_LABELS[1] ?? '交付审阅', state: 'pending', questions: pendingQs }
        : { key: 'anchor-2', label: ANCHOR_LABELS[1] ?? '交付审阅', state: 'upcoming', questions: 0 },
  )
  if (tailUnanswered && q && f) {
    slots.push({ key: 'anchor-extra', label: '中途确认', state: 'pending', questions: pendingQs })
  }
  return slots
}
