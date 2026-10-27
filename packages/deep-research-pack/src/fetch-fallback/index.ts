/**
 * index.ts —— 抓取回退 provider 的宿主接线（D31）：注册 `deepseek-fallback-fetch`，把
 * 本地 `web-fetch-http` 与 DeepSeek Fetch API 两腿交给 `orchestrate.ts` 的决策流。
 *
 * 为什么是 provider 而不是配置：`ctx.web` 是单 provider 语义，vendor 明文拒绝隐藏的
 * 优先级链（见 notes/implemented/2026-09-27-search-fallback-seam.md）；要让"本地失败 →
 * API"成为产品行为，只能注册一个**自己的** fetch provider（本包 host 半的第二处代码面，
 * 边界与理由 = D31）。
 *
 * 行为边界（全部显式，不做静默降级；判据在 policy.ts，编排在 orchestrate.ts）：
 * - 本地失败码若属安全策略（非公网地址/非法 URL）或调用方取消 → **不**回退，原样抛出；
 * - API 回退成功时正文前加一行来源标记（状态码恒 200、最终 URL 不可见）；
 * - 没有 `DEEPSEEK_API_KEY`（且 credentials 服务里没有该 ref）→ 不回退，原错误附一行
 *   "fallback unavailable" 说明——不假装救过；
 * - 两腿共用 `totalBudgetMs`，本地腿先占 `localTimeoutMs`，剩余给 API 腿。
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { WebError, type WebFetchProvider, type WebFetchRequest, type WebFetchResult } from '@deepseek-ai/dsh-web'
import {
  DEEPSEEK_WEB_API_BASE_URL, DeepSeekFetchApiProvider, type DeepSeekFetchApiOptions,
} from '@deepseek-ai/dsh-web-deepseek-api'
import { HttpFetchProvider } from '@deepseek-ai/dsh-web-fetch-http'
import { resolveCredential, type CredentialsSource } from './credentials.ts'
import { fetchWithFallback, type FallbackSettings } from './orchestrate.ts'
import { PROVIDER_ID } from './policy.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'fetch-fallback'

/** Both the local and API legs need the web seam. */
export const inject = ['web']

/** Resolve one caller signal and one wall-clock deadline into a single abort signal. */
function withDeadline(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(Math.max(1, Math.floor(ms)))
  return signal === undefined ? timeout : AbortSignal.any([signal, timeout])
}

/** Plugin config: budgets, credential reference, and which local statuses trigger a rescue. */
export interface Config {
  /** Turn the fallback off without unwiring the provider (local-only mode). */
  enabled: boolean
  /** Literal DeepSeek API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved per fallback attempt; defaults to `DEEPSEEK_API_KEY`. */
  apiKeyEnv: string
  /** Search / Fetch API base including its path prefix; `/fetch` is appended. */
  baseURL: string
  /** Wall-clock budget for the local leg before the API leg starts. */
  localTimeoutMs: number
  /** Wall-clock budget for both legs together; keep below `tool-web.fetchTimeoutMs`. */
  totalBudgetMs: number
  /** Local HTTP statuses that also trigger a rescue (default: server errors only). */
  fallbackOnStatus: number[]
}

export const Config = z.object({
  enabled: z.boolean().default(true),
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default('DEEPSEEK_API_KEY'),
  baseURL: z.string().default(DEEPSEEK_WEB_API_BASE_URL),
  localTimeoutMs: z.number().step(1).min(1_000).default(10_000),
  totalBudgetMs: z.number().step(1).min(1_000).default(28_000),
  fallbackOnStatus: z.array(z.number()).default([500, 502, 503, 504]),
})

/**
 * Register the local-first fetch provider; the seam selects it through
 * `web.fetchProvider: deepseek-fallback-fetch`.
 * @param ctx - plugin context owning the web seam and credentials service.
 * @param config - resolved plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  const local = new HttpFetchProvider({
    maxResponseBytes: 5_000_000,
    maxBodyChars: 100_000,
    timeoutMs: config.localTimeoutMs,
    maxRedirects: 5,
    userAgent: 'deepseek-harness/0.0.1 (+https://github.com/deepseek-ai)',
  })

  /**
   * Resolve the API key per attempt: mounted credentials service first, launch environment
   * when it yields nothing (headless/dev; the LLM route reads the environment the same way).
   */
  async function resolveApiKey(): Promise<string | undefined> {
    const credentials = (ctx as unknown as { get(name: string): CredentialsSource | undefined }).get('credentials')
    return resolveCredential(credentials, process.env, config.apiKeyEnv)
  }

  const api = new DeepSeekFetchApiProvider((): DeepSeekFetchApiOptions => ({
    ...(config.apiKey !== undefined && config.apiKey.length > 0 ? { apiKey: config.apiKey } : {}),
    apiKeyEnv: config.apiKeyEnv as unknown as NonNullable<DeepSeekFetchApiOptions['apiKeyEnv']>,
    baseURL: config.baseURL,
    resolveApiKey,
  }))

  const settings: FallbackSettings = {
    enabled: config.enabled,
    localTimeoutMs: config.localTimeoutMs,
    totalBudgetMs: config.totalBudgetMs,
    fallbackOnStatus: config.fallbackOnStatus,
    apiKeyEnv: config.apiKeyEnv,
  }

  const provider: WebFetchProvider = {
    id: PROVIDER_ID,
    available: () => true,
    fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult> {
      return fetchWithFallback({
        local: (req, sig) => local.fetch(req, sig),
        api: async (req, sig, _budgetMs, _detail): Promise<WebFetchResult | undefined> => {
          const key = await resolveApiKey()
          if (key === undefined) return undefined
          return api.fetch(req, sig)
        },
        deadline: withDeadline,
        makeError: (message, code, cause) => new WebError(
          message, code, cause === undefined ? undefined : { cause },
        ),
        now: () => Date.now(),
      }, settings, request, signal)
    },
  }

  ctx.web.registerFetchProvider(provider)
}
