// scripts/lib/llm-stream-tee-core.mjs — LLM 流透明 tee 预载壳（scripts/probe/llm-stream-tee.cjs）
// 的可提取纯函数面：捕获目标判定 + 凭据头脱敏。
//
// 为什么住 lib：预载壳是活进程仪器（挂进真目标进程才有意义），无 keyless 自动测试；
// 但它依赖的两个判据必须是可断言的——判错 = 漏抓字节（丢证据）或泄密钥（证据包不可
// 外发），两者都是纯函数，默认回归直接钉住。壳对判据的消费 = require（Node 22.12+
// require(esm)；壳是 CJS 预载形态，与 dev/llm-socket-isolation.cjs 同构）。

/**
 * 捕获目标判定：URL 含主机子串 → 抄写。
 * 子串语义（与 session-log.findGroup 同款）而非 host 解析——仪器宁可多抄（透明，不改
 * 行为）不可漏抄（丢证据）；host 解析器对怪形态（IPv6、userinfo 里的 @）各有陷阱。
 * 缺省子串 = api.deepseek.com（本仓 LLM 流/web_search 的真实端点——先读代码确认端点
 * 再打，技能红线）；fail-closed：空/空白子串与空/非字符串 URL 一律 false——空子串
 * `includes('')` 恒真会静默全捕获，是脚枪不是特性；要全捕获请显式给一个通配度高的子串。
 * @param {unknown} url 壳侧归一化后的 URL 字符串（fetch 的 input 或 Request.url）。
 * @param {string} [hostSubstring] 主机子串（壳侧 = env LLM_STREAM_TEE_HOST 透传）。
 */
export function isCaptureTarget(url, hostSubstring = 'api.deepseek.com') {
  if (typeof url !== 'string' || url === '') return false
  if (typeof hostSubstring !== 'string' || hostSubstring.trim() === '') return false
  return url.includes(hostSubstring)
}

const REDACT_KEYS = ['authorization', 'x-api-key']
const mask = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  if (text.length <= 8) return '****'
  const space = text.indexOf(' ')
  const scheme = space > 0 ? `${text.slice(0, space)} ` : ''
  return `${scheme}****${text.slice(-4)}`
}

/**
 * 凭据头脱敏：authorization / x-api-key（大小写不敏感）→ 保留 scheme 词与末 4 位，
 * 其余头原样；返回纯对象（Headers 实例或 plain object 均可入）。
 * 证据包（*.req.json）面向外发（技能 §6 UPSTREAM-REPORT），密钥永不出现在抄写面。
 */
export function redactHeaders(headers) {
  const out = {}
  if (headers && typeof headers.entries === 'function') {
    for (const [key, value] of headers.entries()) out[key] = REDACT_KEYS.includes(key.toLowerCase()) ? mask(value) : value
    return out
  }
  if (headers === null || typeof headers !== 'object') return out
  for (const [key, value] of Object.entries(headers)) {
    out[key] = REDACT_KEYS.includes(key.toLowerCase()) ? mask(value) : value
  }
  return out
}
