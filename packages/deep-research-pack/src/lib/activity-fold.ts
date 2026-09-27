/**
 * activity-fold.ts —— journal 事件 → 人性化活动行（观察面 UI 优先；纯函数，keyless 单测）。
 *
 * 设计（RFC research-status-ui）：页签正文只出**人能读的行**——原始事件类型名
 * （step/end、tool/call、assistant/message…）是工程噪音，不出行。四类出行事件：
 *   🔍 检索（web_search 的 query）· 👥 派出（spawn_teammate 的成员与职责）·
 *   💬 成员正文（assistant 消息前 50 字）· 📦 交付（present 声明）。
 * 其余全部过滤。行模型 = { icon, text, time }——组件薄渲染。
 */

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

/** 从 call 的 arguments（JSON 字符串或对象）取字段原值；截断 JSON → null。 */
function argValueOf(args: unknown, key: string): unknown {
  let obj: unknown = args
  if (typeof args === 'string') {
    try { obj = JSON.parse(args) } catch { return null }
  }
  if (typeof obj !== 'object' || obj === null) return null
  return (obj as Record<string, unknown>)[key] ?? null
}

/** 从 call 的 arguments（JSON 字符串或对象）取一个字符串字段；截断 JSON → null。 */
function argOf(args: unknown, key: string): string | undefined {
  const v = argValueOf(args, key)
  return typeof v === 'string' ? v : undefined
}

/** 从 assistant 消息事件取正文文本（content 数组的 text 项拼接，截前 50 字）。 */
function messageTextOf(data: EventLike['data']): string | undefined {
  const content = data?.message?.content ?? data?.content
  if (!Array.isArray(content)) return undefined
  const parts: string[] = []
  for (const c of content) {
    if (typeof c === 'object' && c !== null && (c as { type?: unknown }).type === 'text') {
      const t = (c as { text?: unknown }).text
      if (typeof t === 'string') parts.push(t)
    }
  }
  const joined = parts.join(' ').trim()
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
        const args = argValueOf(e.data?.arguments, 'queries')
        const list = Array.isArray(args) ? args.filter((q) => typeof q === 'string' && q.trim() !== '') : []
        if (list.length > 0) rows.push({ icon: '🔍', text: `检索：${list.join(' · ').slice(0, 40)}`, time })
      } else if (name === 'spawn_teammate') {
        const n = argOf(e.data?.arguments, 'name') ?? '(未具名)'
        const d = argOf(e.data?.arguments, 'description') ?? ''
        rows.push({ icon: '👥', text: `派出 ${n}${d === '' ? '' : `：${d.slice(0, 30)}`}`, time })
      } else if (name === 'present') {
        rows.push({ icon: '📦', text: '交付声明', time })
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
