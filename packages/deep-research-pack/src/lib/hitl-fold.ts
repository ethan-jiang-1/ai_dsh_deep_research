/**
 * HITL 挂起折算（纯函数，keyless 单测面）。
 *
 * 谓词（v5：末位 ask 状态机——0.2.0 timed ask-user 适配）：定位**最后一个**
 * `ask_user_question` 的 tool/call，看它之后的事件——
 * - 对应 callId 的 tool/result 带 `"pending":true` 标记（timed 超时落定）= 问题仍可答
 *   （后答经 answer_to_pending_question 唤醒）→ **仍挂起**；其后的 agent 自身事件
 *   （assistant / 其他工具 / step / turn 边界）不关闭它；
 * - 对应 callId 的其他 tool/result（answers 形态或错误/取消）= 已答/已终 → 不挂起；
 * - 其后出现 user/message（真人说话：答案批次或新指令）= 已应 → 不挂起；
 * - 其后无任何事件（legacy 在飞等待）→ 挂起。
 * v4 及之前的纯尾窗谓词（"末位回合事件恰为未答 ask"）在 timed 超时后会漏报可答挂起，
 * 被 v5 取代（行为对 legacy 形态完全兼容：在飞 = 其后无事件）。
 *
 * 数据/展示分层纪律（RFC observability-gui）：折算住 src/lib 纯函数 + keyless 单测；
 * 组件薄渲染。client bundle 经 tsdown 打包此文件（tsc client 面含 src/lib）。
 */

import { argsObjectOf } from './journal-wire.ts'

/** 一个 journal 事件的最小形状（wire 事件；只取折算要用的字段）。 */
export interface JournalEventLike {
  readonly type?: unknown
  readonly data?: { readonly name?: unknown } | undefined
  readonly time?: unknown
}

/** HITL 挂起态：pending = 末位 ask 仍开放（在飞等待或 timed 超时可补答）；since = 该 ask 的时间。 */
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

/** 从 tool/call 事件取 callId（无则 undefined——畸形 fail-soft）。 */
function callIdOf(event: unknown): string | undefined {
  const data = (event as { readonly data?: { readonly callId?: unknown } } | null)?.data
  const id = data?.callId
  return typeof id === 'string' ? id : undefined
}

/** tool/result 事件正文文本（content 块的 text 拼接；畸形 → ''）。 */
function resultTextOf(event: unknown): string {
  const message = (event as { readonly data?: { readonly message?: { readonly content?: unknown } } } | null)?.data?.message
  const content = message?.content
  if (!Array.isArray(content)) return ''
  return content.map(resultBlockText).join('')
}

function resultBlockText(block: unknown): string {
  if (typeof block !== 'object' || block === null) return ''
  const value = block as { readonly text?: unknown; readonly type?: unknown; readonly content?: unknown }
  if (typeof value.text === 'string') return value.text
  if (value.type !== 'tool-result') return ''
  if (typeof value.content === 'string') return value.content
  return Array.isArray(value.content) ? value.content.map(resultBlockText).join('') : ''
}

/** timed 落定标记（tool-result 正文带 `"pending":true` = 问题仍可答）。 */
const TIMED_PENDING = /"pending"\s*:\s*true/

/** 同一 callId 的 tool/result（含嵌套 message.toolCallId 两种携带位——fail-soft 兼容）。 */
function isResultFor(event: unknown, callId: string | undefined): boolean {
  if (callId === undefined) return false
  const data = (event as {
    readonly data?: {
      readonly message?: { readonly toolCallId?: unknown; readonly source?: { readonly callId?: unknown } }
      readonly callId?: unknown
    }
  } | null)?.data
  return data?.message?.toolCallId === callId
    || data?.message?.source?.callId === callId
    || data?.callId === callId
}

/** 末位 ask 的定位（index / callId / time / 问数）。 */
interface LastAsk {
  readonly index: number
  readonly callId: string | undefined
  readonly time: unknown
  readonly questions: number
  readonly kind: AskKind
}

function findLastAsk(events: readonly unknown[]): LastAsk | undefined {
  let last: LastAsk | undefined
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (typeof event !== 'object' || event === null) continue
    const e = event as JournalEventLike
    if (e.type !== 'tool/call' || typeof e.data !== 'object' || e.data === null || e.data.name !== 'ask_user_question') continue
    const args = (e.data as { readonly arguments?: unknown }).arguments
    last = {
      index: i,
      callId: callIdOf(event),
      time: e.time,
      questions: askQuestionCount(args),
      kind: askKindOf(args),
    }
  }
  return last
}

/**
 * 末位 ask 状态机核（v5 谓词的单一正本——foldHitlPending 与 deriveAnchors 共用；挂起时携
 * ask（问数/判型/时间），不挂起时 ask 为 undefined）。谓词语义逐字不变；2026-10-13 结构
 * 重构收口：此前 deriveAnchors 经尾部包装各调一次 foldHitlPending / findLastAsk，同一事件
 * 流被状态机扫多遍——现在一次扫描出三件（挂起态 + 问数 + 判型）。
 */
function lastAskStateMachine(events: readonly unknown[]): { pending: boolean; ask: LastAsk | undefined } {
  const ask = findLastAsk(events)
  if (ask === undefined) return { pending: false, ask: undefined }
  for (let j = ask.index + 1; j < events.length; j++) {
    const event = events[j]
    if (typeof event !== 'object' || event === null) continue
    const e = event as JournalEventLike
    if (e.type === 'tool/result' && isResultFor(event, ask.callId)) {
      if (TIMED_PENDING.test(resultTextOf(event))) continue // timed 超时落定：仍可答，继续找关闭事件
      return { pending: false, ask: undefined } // answers 形态或错误/取消：已终
    }
    if (e.type === 'user/message') return { pending: false, ask: undefined } // 真人已应（答案批次/新指令）
  }
  return { pending: true, ask }
}

/**
 * 折算：journal 事件序列 → HITL 挂起态（末位 ask 状态机，见文件头注的 v5 谓词）。
 * @param events - 按 wire 顺序的事件（follow 的 snapshot 历史或实时流；畸形输入 fail-soft）。
 * @returns 挂起态（永不 throw）。
 */
export function foldHitlPending(events: readonly unknown[]): HitlState {
  const { pending, ask } = lastAskStateMachine(events)
  if (!pending || ask === undefined) return { pending: false, since: undefined }
  return { pending: true, since: eventTimeOf(ask.time) }
}

function eventTimeOf(time: unknown): string | undefined {
  if (typeof time === 'string') return time
  if (typeof time !== 'number' || !Number.isFinite(time)) return undefined
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** ask 调用携带的问数（args.questions 数组长度；截断 JSON / 畸形 fail-soft → 0）。
 *  解析核 = journal-wire.argsObjectOf（共享正本）；本件哨兵 = 0。 */
function askQuestionCount(args: unknown): number {
  const obj = argsObjectOf(args)
  if (obj === null) return 0
  const qs = obj.questions
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

/**
 * 开放 ask 的归属判型（BUG-002：timed 模式让挂起持续存在，"question.md 在场 + 尾部未答
 * 一律记交付审阅"的旧启发式把 HITL1 重发/立项追问误标成交付审阅）。签名 = persona 钦定的
 * 卡片形状：HITL1 首问 header 恒为「研究类型」；HITL2 选项恒含「按现稿定稿」。其余 =
 * 契约外（中途确认）。
 */
type AskKind = 'hitl1' | 'hitl2' | 'unknown'

/** 开放 ask 的归属判型（解析核 = journal-wire.argsObjectOf；本件哨兵 = 'unknown'）。 */
function askKindOf(args: unknown): AskKind {
  const obj = argsObjectOf(args)
  if (obj === null) return 'unknown'
  const text = JSON.stringify(obj)
  if (text.includes('按现稿定稿')) return 'hitl2'
  if (text.includes('研究类型')) return 'hitl1'
  return 'unknown'
}

/**
 * 折算：journal 事件序列（+ 可选文件事实）→ 流程锚点态（立项确认 / 交付审阅）。
 *
 * **混合折算（尾窗约束的实测产物，2026-09-28 首跑）**：journal 流的 snapshot 是尾窗
 * （vendor history.ts `DEFAULT_MAX_MESSAGES = 50`），长会话里 ask 的序数与更早的停靠点
 * 不可见——passed 态**由文件事实承载**（question.md 在场 = 立项拍板落盘；final.md 在场 =
 * 交付拍板落盘），journal 尾窗只承载 **pending 态**。文件事实缺席（bundle 未建/未绑定）
 * 时退化为纯尾窗判定：只显示 pending，不虚构 passed。
 *
 * **pending 归属按 ask 内容判型（BUG-002，2026-09-30 UX 清扫实测）**：尾部开放 ask 带
 * HITL1 签名（首问 header「研究类型」）→ 立项确认 pending（question.md 已在场 = timed
 * 超时后 lead 按默认草案落盘、真人拍板仍开放的形态——re-open 是诚实态）；带 HITL2 签名
 * （「按现稿定稿」选项）→ 交付审阅 pending；两 signature 皆无 → 契约外的中途挂起 ask
 * 如实缀第三锚。开放 ask 优先于文件 passed 态——决策点重新开放时 pending 是诚实显示。
 * @param events - 按 wire 顺序的事件（follow 的 snapshot + 实时流；畸形输入 fail-soft）。
 * @param fileFacts - bundle 文件在场性（face 缺席时省略）。
 * @returns 锚点列表（固定两位 + 契约外挂起追加；永不 throw）。
 */
export function deriveAnchors(events: readonly unknown[], fileFacts?: AnchorFileFacts): readonly RunAnchor[] {
  // 一次扫描取三件（挂起态 + 问数 + 判型）——状态机单一正本 lastAskStateMachine（原先
  // 经尾部包装各扫一遍：foldHitlPending ×3 + findLastAsk ×2，语义无差纯重复）。
  const { pending: tailUnanswered, ask } = lastAskStateMachine(events)
  const pendingQs = tailUnanswered && ask !== undefined ? ask.questions : 0
  const kind = tailUnanswered && ask !== undefined ? ask.kind : undefined
  const q = fileFacts?.question ?? false
  const f = fileFacts?.delivered ?? false
  const slots: RunAnchor[] = []
  const a1Pending = tailUnanswered && (kind === 'hitl1' || (kind === 'unknown' && !q))
  const a2Pending = tailUnanswered && kind === 'hitl2'
  const extraPending = tailUnanswered && kind === 'unknown' && q
  slots.push(
    a1Pending
      ? { key: 'anchor-1', label: ANCHOR_LABELS[0] ?? '立项确认', state: 'pending', questions: pendingQs }
      : q
        ? { key: 'anchor-1', label: ANCHOR_LABELS[0] ?? '立项确认', state: 'passed', questions: 0 }
        : { key: 'anchor-1', label: ANCHOR_LABELS[0] ?? '立项确认', state: 'upcoming', questions: 0 },
  )
  slots.push(
    a2Pending
      ? { key: 'anchor-2', label: ANCHOR_LABELS[1] ?? '交付审阅', state: 'pending', questions: pendingQs }
      : f
        ? { key: 'anchor-2', label: ANCHOR_LABELS[1] ?? '交付审阅', state: 'passed', questions: 0 }
        : { key: 'anchor-2', label: ANCHOR_LABELS[1] ?? '交付审阅', state: 'upcoming', questions: 0 },
  )
  if (extraPending) {
    slots.push({ key: 'anchor-extra', label: '中途确认', state: 'pending', questions: pendingQs })
  }
  return slots
}
