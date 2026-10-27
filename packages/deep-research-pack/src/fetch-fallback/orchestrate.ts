/**
 * orchestrate.ts —— 抓取回退的**两腿编排**（D31）：本地 → API 的决策流，依赖全注入。
 *
 * 零 vendor 运行时依赖：provider 实例、凭据解析、时钟、deadline、错误构造都由
 * `src/fetch-fallback/index.ts` 注入；keyless 回归（tests/pack/fetch-fallback.test.mjs）
 * 用假腿覆盖"什么情况回退 / 什么情况绝不回退 / 两腿失败怎么报"。
 */

import {
  errorCodeOf, fallbackForError, fallbackNotice, fallbackStatusMatches, legBudget,
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
}

/** Human/model-readable detail for one local failure, bounded to a phrase. */
export function describeFailure(error: unknown): string {
  const code = errorCodeOf(error)
  const message = error instanceof Error ? error.message : String(error)
  const detail = message.length > 160 ? `${message.slice(0, 157)}…` : message
  return code === undefined ? detail : `${code}: ${detail}`
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
  const budget = legBudget(settings.totalBudgetMs, settings.localTimeoutMs)

  let localOutcome: FetchOutcome
  try {
    localOutcome = await deps.local(request, deps.deadline(signal, budget.local))
  } catch (localError) {
    if (callerAborted()) throw localError
    const code = errorCodeOf(localError)
    if (!fallbackForError(code)) throw localError
    const remaining = legBudget(settings.totalBudgetMs, settings.localTimeoutMs, deps.now() - startedAt).fallback
    if (remaining <= 0) throw localError

    const detail = describeFailure(localError)
    let rescued: FetchOutcome | undefined
    try {
      rescued = await deps.api(request, deps.deadline(signal, remaining), remaining, detail)
    } catch (apiError) {
      if (callerAborted()) throw apiError
      throw deps.makeError(
        `web fetch failed for ${request.url}: local retrieval failed (${detail}); `
        + `DeepSeek Fetch API fallback also failed (${describeFailure(apiError)})`,
        code ?? 'WEB_PROVIDER_ERROR',
        apiError,
      )
    }
    if (rescued !== undefined) return markRescued(rescued, detail)
    throw deps.makeError(
      `${detail} [DeepSeek fetch fallback unavailable: ${settings.apiKeyEnv} is not configured]`,
      code ?? 'WEB_PROVIDER_ERROR',
      localError,
    )
  }

  // A returned response exists; only configured server statuses buy one rescue.
  if (!fallbackStatusMatches(localOutcome.statusCode, settings.fallbackOnStatus)) return localOutcome
  const remaining = legBudget(settings.totalBudgetMs, settings.localTimeoutMs, deps.now() - startedAt).fallback
  if (remaining <= 0) return localOutcome
  try {
    const rescued = await deps.api(request, deps.deadline(signal, remaining), remaining, `HTTP ${localOutcome.statusCode}`)
    return rescued === undefined ? localOutcome : markRescued(rescued, `HTTP ${localOutcome.statusCode}`)
  } catch (apiError) {
    if (callerAborted()) throw deps.makeError('web fetch aborted', 'WEB_ABORTED', apiError)
    return localOutcome
  }
}

/** Prepend the provenance notice to a rescued text body (status/URL stay the API's). */
export function markRescued(outcome: FetchOutcome, detail: string): FetchOutcome {
  return outcome.body.kind === 'text'
    ? { ...outcome, body: { kind: 'text', content: fallbackNotice(detail) + outcome.body.content } }
    : outcome
}
