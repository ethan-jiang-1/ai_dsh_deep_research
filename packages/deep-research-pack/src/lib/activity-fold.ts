/**
 * activity-fold.ts —— journal 事件 → 人性化活动行（观察面 UI 优先；纯函数，keyless 单测）。
 *
 * 设计（RFC research-status-ui）：页签正文只出**人能读的行**——原始事件类型名
 * （step/end、tool/call、assistant/message…）是工程噪音，不出行。四类出行事件：
 *   🔍 检索（web_search 的 query）· 👥 派出（spawn_teammate 的成员与职责）·
 *   💬 成员正文（assistant 消息前 50 字）· 📦 交付（present 声明）。
 * 其余全部过滤。行模型 = { icon, text, time }——组件薄渲染。
 */

import { argValueOf, contentTextParts, normalizeQueries } from './journal-wire.ts'

/** 一条人性化活动行。 */
export interface ActivityRow {
  readonly icon: string
  readonly text: string
  readonly time: string | undefined
}

/** journal 事件的最小形状（wire 事件；只取折算要用的字段）。 */
interface EventLike {
  readonly type?: unknown
  readonly data?: {
    readonly name?: unknown
    readonly arguments?: unknown
    readonly content?: unknown
    readonly message?: { readonly content?: unknown }
  } | undefined
  readonly time?: unknown
}

/** 从 call 的 arguments（JSON 字符串或对象）取一个字符串字段；截断 JSON → null。
 *  解析核 = journal-wire.argValueOf（共享正本）；本包装保留本件的哨兵语义（空串放行——
 *  spawn_teammate 的 description 空串与缺席同待遇）。 */
function argOf(args: unknown, key: string): string | undefined {
  const v = argValueOf(args, key)
  return typeof v === 'string' ? v : undefined
}

/** 从 assistant 消息事件取正文文本（content 数组的 text 项拼接，截前 50 字）。 */
function messageTextOf(data: EventLike['data']): string | undefined {
  const content = data?.message?.content ?? data?.content
  const parts = contentTextParts(content)
  // G3 同款（RFC cockpit-flow-face）：活动行是"人能读的行"——markdown 源标记（**/`）不出正文。
  const joined = parts.join(' ').replace(/\*\*/g, '').replace(/`/g, '').trim()
  return joined === '' ? undefined : joined.slice(0, 50)
}

/** 尾部保留行数（一屏能扫完）。 */
const MAX_ROWS = 30

/**
 * 折算：journal 事件序列 → 人性化活动行（尾部保留；噪音过滤）。
 * @param events - 按 wire 顺序的事件（follow 的 snapshot 历史或实时流）。
 * @returns 活动行（永不 throw）。
 */
export function foldActivityRows(events: readonly unknown[]): readonly ActivityRow[] {
  const rows: ActivityRow[] = []
  for (const event of events) {
    if (typeof event !== 'object' || event === null) continue
    const e = event as EventLike
    const time = typeof e.time === 'string' ? e.time : undefined
    if (e.type === 'tool/call') {
      const name = e.data?.name
      if (name === 'web_search') {
        // wire 权威形状 = queries 数组（vendor tool-web search schema；录制流实证——2026-09-27
        // 快照 lane 首个战果：旧代码读 query 单串，真实 web_search 行从未出过 🔍 行）。
        const list = normalizeQueries(argValueOf(e.data?.arguments, 'queries'))
        if (list.length > 0) rows.push({ icon: '🔍', text: `检索：${list.join(' · ').slice(0, 40)}`, time })
      } else if (name === 'spawn_teammate') {
        const n = argOf(e.data?.arguments, 'name') ?? '(未具名)'
        const d = argOf(e.data?.arguments, 'description') ?? ''
        rows.push({ icon: '👥', text: `派出 ${n}${d === '' ? '' : `：${d.slice(0, 30)}`}`, time })
      } else if (name === 'present') {
        rows.push({ icon: '📦', text: '交付声明', time })
      } else if (name === 'wait_agent') {
        // 静默区观察盲区缓解（RFC cockpit-flow-face G2）：lead 等队员期间页签不再全静——
        // 连续重复折叠（wait_agent 可多次调用，同文行不重复出）。
        const lastRow = rows[rows.length - 1]
        if (lastRow?.text !== '队员作业中——等待返回') {
          rows.push({ icon: '👥', text: '队员作业中——等待返回', time })
        }
      }
      // 其他工具调用：v1 不出行（可按需加 key→icon 映射）
    } else if (e.type === 'assistant/message') {
      const text = messageTextOf(e.data)
      if (text !== undefined) rows.push({ icon: '💬', text, time })
    }
    // 其余事件类型（step/turn/session/user/system/permission…）：噪音，不出行
  }
  return rows.slice(-MAX_ROWS)
}
