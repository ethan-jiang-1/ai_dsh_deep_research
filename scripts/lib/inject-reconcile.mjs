// scripts/lib/inject-reconcile.mjs —— 「注入的消息是否真的落进会话日志」的纯判据（BUG-021 修复核心）。
//
// 为什么存在：`cdp-probe --ask` 旧版把「点击了发送按钮」当成「消息送达」——两者之间还隔着
// 一层服务端接受。于是"没发出去"与"发出去了但模型没回"共用同一句失败信息，真因被盖住
// （BUG-021 三次现场即此形态）。会话日志是权威落点（model-visible ⟺ logged 的对偶），
// 故判据 = **在日志里对账**，不是等 UI 回复、也不是看文本长度增长。
//
// 分层：本模块是纯函数（无 fs / 无浏览器 / 无子进程），消费方 =
//   · `scripts/probe/cdp-probe.mjs`（真浏览器探针；负责取日志并调用）
//   · `tests/inject-reconcile.test.mjs`（keyless 契约测试；用例即负例留证）
// 取日志与"日志读不出来"的策略留在消费方（探针把 log-unreadable 与 not-landed 分开报）。

/** 默认只认用户注入事件：模型自己的输出（assistant/message）含同文不算"落盘"。 */
export const INJECT_EVENT_TYPES = ['user/message']

/** 从一条事件的 `data` 里抽出全部文本段（多段 content 拼接；兼容 `data.text` 直挂形态）。 */
function textOf(data) {
  if (data === null || typeof data !== 'object') return ''
  if (Array.isArray(data.content)) {
    return data.content
      .filter((part) => part !== null && typeof part === 'object' && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
  }
  return typeof data.text === 'string' ? data.text : ''
}

/**
 * 对账：`text` 是否作为**用户消息**落进了 `events`。
 *
 * @param {object} o
 * @param {Array<object>} o.events  `readSessionEvents(logPath).events`（已 parse 的事件数组）
 * @param {string} o.text           注入的消息原文（逐字子串匹配，不做归一化——归一化会掩盖转写差异）
 * @param {number} [o.sinceMs]      时间下界（含）：只认 `event.time >= sinceMs` 的事件。
 *                                  防"上一次同文注入"假阳——判据必须能咬住这条。
 * @param {string[]} [o.types]      认哪些事件类型，默认 `INJECT_EVENT_TYPES`
 * @returns {{landed:boolean, seq:number|null, at:number|null, scanned:number, reason:string}}
 *          `seq`/`at` 取**最后一条**命中（最新 = 本次注入）；`scanned` = 实际检查的事件数（防空语料）
 */
export function reconcileInjectedMessage({ events, text, sinceMs = 0, types = INJECT_EVENT_TYPES }) {
  const out = { landed: false, seq: null, at: null, scanned: 0, reason: 'not-found' }
  if (typeof text !== 'string' || text.trim() === '') {
    out.reason = 'empty-text' // includes('') 恒真——空串必须显式拒绝，不给假绿
    return out
  }
  if (!Array.isArray(events)) {
    out.reason = 'no-events'
    return out
  }
  const wanted = new Set(types)
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    if (!wanted.has(event.type)) continue
    if (typeof event.time !== 'number' || event.time < sinceMs) continue
    out.scanned++
    if (textOf(event.data).includes(text)) {
      out.landed = true
      out.seq = typeof event.seq === 'number' ? event.seq : null
      out.at = event.time
      out.reason = 'landed'
    }
  }
  return out
}
