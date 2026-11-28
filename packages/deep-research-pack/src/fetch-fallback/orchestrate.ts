/**
 * orchestrate.ts —— 抓取回退的**两腿编排**（D31）：本地 → API 的决策流，依赖全注入。
 *
 * 零 vendor 运行时依赖：provider 实例、凭据解析、时钟、deadline、错误构造都由
 * `抓取回退入口` 注入；包外 keyless 回归
 * 用假腿覆盖"什么情况回退 / 什么情况绝不回退 / 两腿失败怎么报"。
 */

import { errorDetailOf } from '../lib/shared/error-detail.ts'
import {
  errorCodeOf, fallbackForError, fallbackNotice, fallbackStatusMatches, legBudget, remainingAfterLocal,
} from './policy.ts'

/** Structural subset of `WebFetchResult` the orchestration needs (no vendor import). */
export interface FetchOutcome {
  readonly url: string
  readonly statusCode: number
  readonly body: { readonly kind: 'html' | 'text'; readonly content: string }
  readonly truncated: boolean
}

/** One fetch request; only `url` is read. */
export interface FetchRequest {
  readonly url: string
}

/** The knobs this module reads; the provider's config supplies them. */
export interface FallbackSettings {
  readonly enabled: boolean
  readonly localTimeoutMs: number
  readonly totalBudgetMs: number
  readonly fallbackOnStatus: readonly number[]
  readonly apiKeyEnv: string
}

/** Optional native logger sink (injected from `ctx.logger`; absent in minimal tests). */
export interface FallbackLogger {
  info?(message: string): void
  warn?(message: string): void
}

/** Everything the flow needs from the outside world. */
export interface FallbackDeps {
  /** Local anonymous retrieval leg. */
  local(request: FetchRequest, signal?: AbortSignal): Promise<FetchOutcome>
  /**
   * DeepSeek Fetch API leg. Returns `undefined` when no credential is configured
   * (the flow then reports `fallback unavailable` instead of attempting a call).
   */
  api(request: FetchRequest, signal: AbortSignal, budgetMs: number, detail: string): Promise<FetchOutcome | undefined>
  /** One caller signal + one deadline, combined. */
  deadline(signal: AbortSignal | undefined, ms: number): AbortSignal
  /** Construct a machine-routable error (index injects the vendor `WebError`). */
  makeError(message: string, code: string, cause?: unknown): Error
  /** Monotonic clock (ms); `Date.now` in production. */
  now(): number
  /** Optional host logger for native runtime tracing (`ctx.logger`). */
  readonly log?: FallbackLogger
}

/** Strip query string, fragment, and userinfo from a URL before writing runtime traces. */
export function sanitizeUrlForLog(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return 'invalid-url'
  }
}

function emitTrace(log: FallbackLogger | undefined, level: 'info' | 'warn', event: string, fields: Record<string, string | number | boolean | undefined>): void {
  const fn = level === 'warn' ? log?.warn : log?.info
  if (typeof fn !== 'function') return
  const pairs = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
  fn.call(log, `[deep-research:fetch-fallback] event=${event}${pairs.length > 0 ? ` ${pairs.join(' ')}` : ''}`)
}

/** Resolve one caller signal and one wall-clock deadline into a single abort signal. */
export function withDeadline(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(Math.max(1, Math.floor(ms)))
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

/** Human/model-readable detail for one local failure, bounded to a phrase. */
export function describeFailure(error: unknown): string {
  const code = errorCodeOf(error)
  const message = errorDetailOf(error)
  const detail = message.length > 160 ? `${message.slice(0, 157)}…` : message
  return code === undefined ? detail : `${code}: ${detail}`
}

function isAbortLikeCode(code: string | undefined): boolean {
  return code === undefined || code === 'WEB_ABORTED' || code === 'TimeoutError'
}

/**
 * Run one fetch with the local-first fallback policy.
 * @param deps - injected legs, clock, deadline, and error factory.
 * @param settings - budgets and the status codes worth rescuing.
 * @param request - the fetch request.
 * @param signal - the caller's cancellation signal.
 * @returns the local outcome, or the rescued API outcome with a provenance notice.
 */
export async function fetchWithFallback(
  deps: FallbackDeps, settings: FallbackSettings, request: FetchRequest, signal?: AbortSignal,
): Promise<FetchOutcome> {
  if (!settings.enabled) return deps.local(request, signal)

  const callerAborted = (): boolean => signal !== undefined && signal.aborted
  const startedAt = deps.now()
  const safeUrl = sanitizeUrlForLog(request.url)
  const budget = legBudget(settings.totalBudgetMs, settings.localTimeoutMs)

  let localOutcome: FetchOutcome
  const localSignal = deps.deadline(signal, budget.local)
  try {
    localOutcome = await deps.local(request, localSignal)
  } catch (localError) {
    const localMs = Math.max(0, deps.now() - startedAt)
    const rawCode = errorCodeOf(localError)
    if (callerAborted()) {
      emitTrace(deps.log, 'warn', 'local_aborted', { url: safeUrl, localCode: rawCode ?? 'WEB_ABORTED', localMs })
      throw localError
    }
    // Outer leg deadline fires before the underlying provider's internal timer; providers classify
    // an already-aborted outer signal as WEB_ABORTED, so distinguish leg timeout from caller cancel here.
    const localTimedOut = localSignal.aborted && isAbortLikeCode(rawCode)
    const code = localTimedOut ? 'WEB_FETCH_TIMEOUT' : rawCode
    const normalizedLocalError = localTimedOut
      ? deps.makeError(`web fetch timed out for ${request.url} after ${budget.local}ms`, 'WEB_FETCH_TIMEOUT', localError)
      : localError
    if (!fallbackForError(code)) {
      emitTrace(deps.log, 'warn', 'fallback_skipped', { reason: 'policy', url: safeUrl, localCode: code ?? 'UNKNOWN', localMs })
      throw normalizedLocalError
    }
    const remaining = remainingAfterLocal(settings.totalBudgetMs, localMs)
    if (remaining <= 0) {
      emitTrace(deps.log, 'warn', 'fallback_skipped', { reason: 'budget_exhausted', url: safeUrl, localCode: code ?? 'UNKNOWN', localMs, totalBudgetMs: settings.totalBudgetMs })
      throw normalizedLocalError
    }

    const detail = describeFailure(normalizedLocalError)
    const apiSignal = deps.deadline(signal, remaining)
    let rescued: FetchOutcome | undefined
    try {
      rescued = await deps.api(request, apiSignal, remaining, detail)
    } catch (apiError) {
      const totalMs = Math.max(0, deps.now() - startedAt)
      const rawApiCode = errorCodeOf(apiError)
      const apiTimedOut = !callerAborted() && apiSignal.aborted && isAbortLikeCode(rawApiCode)
      const apiCode = apiTimedOut
        ? 'WEB_FETCH_TIMEOUT'
        : (rawApiCode ?? (callerAborted() ? 'WEB_ABORTED' : 'WEB_PROVIDER_ERROR'))
      const normalizedApiError = apiTimedOut
        ? deps.makeError(`DeepSeek Fetch API timed out after ${remaining}ms`, 'WEB_FETCH_TIMEOUT', apiError)
        : apiError
      emitTrace(deps.log, 'warn', 'fallback_fail', { url: safeUrl, localCode: code ?? 'UNKNOWN', apiCode, localMs, totalMs, aborted: callerAborted() })
      if (callerAborted()) throw apiError
      throw deps.makeError(
        `web fetch failed for ${request.url}: local retrieval failed (${detail}); `
        + `DeepSeek Fetch API fallback also failed (${describeFailure(normalizedApiError)})`,
        code ?? 'WEB_PROVIDER_ERROR',
        apiError,
      )
    }
    const totalMs = Math.max(0, deps.now() - startedAt)
    if (rescued !== undefined) {
      emitTrace(deps.log, 'info', 'fallback_ok', { url: safeUrl, localCode: code ?? 'UNKNOWN', localMs, totalMs })
      return markRescued(rescued, detail)
    }
    emitTrace(deps.log, 'warn', 'fallback_unavailable', { url: safeUrl, localCode: code ?? 'UNKNOWN', apiKeyEnv: settings.apiKeyEnv, localMs })
    throw deps.makeError(
      `${detail} [DeepSeek fetch fallback unavailable: ${settings.apiKeyEnv} is not configured]`,
      code ?? 'WEB_PROVIDER_ERROR',
      normalizedLocalError,
    )
  }

  // A returned response exists; only configured server statuses buy one rescue.
  if (!fallbackStatusMatches(localOutcome.statusCode, settings.fallbackOnStatus)) return localOutcome
  const localMs = Math.max(0, deps.now() - startedAt)
  const remaining = remainingAfterLocal(settings.totalBudgetMs, localMs)
  if (remaining <= 0) {
    emitTrace(deps.log, 'warn', 'fallback_skipped', { reason: 'budget_exhausted', url: safeUrl, localStatus: localOutcome.statusCode, localMs, totalBudgetMs: settings.totalBudgetMs })
    return localOutcome
  }
  const apiSignal = deps.deadline(signal, remaining)
  try {
    const rescued = await deps.api(request, apiSignal, remaining, `HTTP ${localOutcome.statusCode}`)
    const totalMs = Math.max(0, deps.now() - startedAt)
    if (rescued === undefined) {
      emitTrace(deps.log, 'warn', 'fallback_unavailable', { url: safeUrl, localStatus: localOutcome.statusCode, apiKeyEnv: settings.apiKeyEnv, localMs })
      return localOutcome
    }
    emitTrace(deps.log, 'info', 'fallback_ok', { url: safeUrl, localStatus: localOutcome.statusCode, localMs, totalMs })
    return markRescued(rescued, `HTTP ${localOutcome.statusCode}`)
  } catch (apiError) {
    const totalMs = Math.max(0, deps.now() - startedAt)
    const rawApiCode = errorCodeOf(apiError)
    const apiTimedOut = !callerAborted() && apiSignal.aborted && isAbortLikeCode(rawApiCode)
    const apiCode = apiTimedOut
      ? 'WEB_FETCH_TIMEOUT'
      : (rawApiCode ?? (callerAborted() ? 'WEB_ABORTED' : 'WEB_PROVIDER_ERROR'))
    emitTrace(deps.log, 'warn', 'fallback_fail', { url: safeUrl, localStatus: localOutcome.statusCode, apiCode, localMs, totalMs, aborted: callerAborted() })
    if (callerAborted()) throw deps.makeError(`web fetch aborted for ${request.url}`, 'WEB_ABORTED', apiError)
    return localOutcome
  }
}

/** Prepend the provenance notice to a rescued text body (status/URL stay the API's). */
export function markRescued(outcome: FetchOutcome, detail: string): FetchOutcome {
  return outcome.body.kind === 'text'
    ? { ...outcome, body: { kind: 'text', content: fallbackNotice(detail) + outcome.body.content } }
    : outcome
}
