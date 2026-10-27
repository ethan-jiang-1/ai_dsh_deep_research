/**
 * policy.ts —— 本地抓取 → DeepSeek Fetch API 回退的**纯判据**（D31）。
 *
 * 零运行时依赖：keyless 回归（tests/pack/fetch-fallback.test.mjs）直接 import 本文件；
 * 决策流在 ./orchestrate.ts（依赖注入，同样 keyless 可测），vendor 接线只在 ./index.ts。
 *
 * 判据边界（为什么这样切）：
 * - 回退只救"本地取不到页面"的失败（超时 / 过大 / 不支持的类型 / 跨源重定向 / 传输错误）；
 * - **绝不**回退本地安全策略的拒绝（非公网地址、非法 URL）——那会把内网 URL 送给第三方；
 * - **绝不**回退调用方取消（WEB_ABORTED）——用户/工具已经不要了，再发一次是浪费与违背意图。
 */

/** 本包注册的 fetch provider id；bundle 的 `web.fetchProvider` 必须与它一致（单测对账）。 */
export const PROVIDER_ID = 'deepseek-fallback-fetch'

/** 本地失败里"换一条取回路径可能救回"的码。 */
export const FALLBACK_ERROR_CODES: ReadonlySet<string> = new Set([
  'WEB_FETCH_TIMEOUT',
  'WEB_FETCH_TOO_LARGE',
  'WEB_UNSUPPORTED_CONTENT_TYPE',
  'WEB_REDIRECT_BLOCKED',
  'WEB_PROVIDER_ERROR',
])

/** 安全策略与取消：任何情况下都不回退。 */
export const NEVER_FALLBACK_ERROR_CODES: ReadonlySet<string> = new Set([
  'WEB_ABORTED',
  'WEB_BLOCKED_URL',
  'WEB_INVALID_URL',
])

/** 从任意错误里取稳定的机器码（HarnessError/WebError 都有 `code`）。 */
export function errorCodeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && code.length > 0 ? code : undefined
}

/**
 * 本地抛错后是否该试回退。
 * @param code - 本地失败码；undefined = 非结构化错误（未知传输失败），按可回退处理。
 */
export function fallbackForError(code: string | undefined): boolean {
  if (code === undefined) return true
  if (NEVER_FALLBACK_ERROR_CODES.has(code)) return false
  return FALLBACK_ERROR_CODES.has(code)
}

/** 本地 2xx 以外的结果里，哪些状态码值得换路径再取一次（默认只救 5xx）。 */
export function fallbackStatusMatches(status: number, configured: readonly number[]): boolean {
  return configured.includes(status)
}

/** 两段预算：本地腿最多占 localTimeoutMs，剩余给 API 腿；elapsed 是本地已花时间。 */
export function legBudget(totalMs: number, localTimeoutMs: number, elapsedMs = 0): { local: number; fallback: number } {
  const remaining = Math.max(0, totalMs - elapsedMs)
  const local = Math.max(1, Math.min(localTimeoutMs, remaining))
  return { local, fallback: Math.max(0, remaining - local) }
}

/**
 * 回退成功时给正文加的一行来源标记——模型必须知道这段内容不是本地取的：
 * 状态码恒为 200、最终 URL 不可见、转义风格也不同。
 */
export function fallbackNotice(detail: string): string {
  return `> 回退：本地抓取失败（${detail}），以下内容经 DeepSeek Fetch API 取得。\n\n`
}
