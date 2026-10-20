// session-events-core.mjs — 会话日志事件的**人读摘要**与筛选（agent 的"刚才发生了什么"入口）。
//
// 为什么住 lib：session-events.mjs 是 CLI 壳（解析参数/发现会话/打印）；摘要与筛选是纯函数，
// 默认回归可直接断言（tests/session-events.test.mjs），不需要真日志或子进程。
// 事件形状只取已知稳定字段；未知事件保留 type + 截断 data，不猜语义。

const MAX_TEXT = 160

/** 内容数组/字符串 → 单行文本（assistant/user message 的 content 形态）。 */
export function textOfContent(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join(' ')
}

const short = (value, max = MAX_TEXT) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function argsSummary(args) {
  if (typeof args === 'string') {
    try { return short(JSON.parse(args)) } catch { return short(args) }
  }
  return short(args)
}

/** 单事件 → `type 摘要`（不含时间；时间由 formatEventLine 提供）。 */
export function eventSummary(event) {
  const type = typeof event?.type === 'string' ? event.type : 'unknown'
  const data = event?.data ?? {}
  switch (type) {
    case 'tool/call':
      return `tool ${short(data.name ?? '?', 40)} ${argsSummary(data.arguments)}`
    case 'tool/result': {
      const text = textOfContent(data.message?.content)
      const status = data.isError === true ? 'ERROR' : 'ok'
      return text === ''
        ? `result ${status} ${short(data.toolCallId ?? data.callId ?? '', 40)}`
        : `result ${status} ${short(text)}`
    }
    case 'assistant/message':
      return `assistant: ${short(textOfContent(data.message?.content))}`
    case 'user/message':
      return `user: ${short(textOfContent(data.message?.content))}`
    case 'turn/start':
      return `turn ${short(data.turn ?? '?', 12)} start`
    case 'turn/end':
      return `turn ${short(data.turn ?? '?', 12)} end ${short(data.reason?.kind ?? '', 40)}`
    case 'llm/retry':
      return `retry ${short(data.provider ?? '', 40)} ${short(data.reason ?? '', 60)}`
    case 'session': {
      const preset = data.agentPreset ?? data.preset
      return `session${typeof preset === 'string' ? ` preset=${preset}` : ''}`
    }
    case 'session/title':
      return `title ${short(data.title ?? '')}`
    default:
      return `${type} ${short(data)}`
  }
}

/** 事件时间 → `HH:MM:SS`（epoch ms；缺失/非法 → `--:--:--`）。 */
export function eventClock(event) {
  const t = event?.time
  if (typeof t !== 'number' || !Number.isFinite(t)) return '--:--:--'
  // 人读时间 = 本机本地时（与 `date`/journal 记账一致）；ISO UTC 会让 CST 用户看到早 8 小时。
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 单事件 → 一行 `[HH:MM:SS] type 摘要`。 */
export function formatEventLine(event) {
  return `[${eventClock(event)}] ${eventSummary(event)}`
}

/**
 * 筛选：type 子串 + 原文 grep（对 JSON 文本做大小写不敏感包含）。
 * 空筛选 = 原样返回。未知字段不影响。
 */
export function filterEvents(events, { type, grep } = {}) {
  let out = Array.isArray(events) ? events : []
  if (typeof type === 'string' && type !== '') out = out.filter((e) => String(e?.type ?? '').includes(type))
  if (typeof grep === 'string' && grep !== '') {
    const needle = grep.toLowerCase()
    out = out.filter((e) => JSON.stringify(e ?? '').toLowerCase().includes(needle))
  }
  return out
}

/** 尾部 N 条（N 非正/非数 → 全部；不修改入参）。 */
export function tailEvents(events, n) {
  if (!Array.isArray(events)) return []
  const count = Number(n)
  if (!Number.isFinite(count) || count <= 0) return events.slice()
  return events.slice(-count)
}
