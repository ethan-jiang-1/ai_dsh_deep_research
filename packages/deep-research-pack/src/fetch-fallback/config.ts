/**
 * config.ts —— 抓取回退 provider 的配置 schema（从 index.ts 抽出的深模块）。
 *
 * 为什么单独一层：schema 是**设置面合同**（Settings 页只投影 `.volatile()` 字段），需要被
 * keyless 测试直接消费；而 index.ts 含真实网络调用，被测试 import 会踩 layering 的禁物闭包。
 * 拆开后，schema/类型只依赖 schemastery 与常量，运行期接线留在 index.ts。
 */
import type { Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { DEEPSEEK_WEB_API_BASE_URL } from '@deepseek-ai/dsh-web-deepseek-api'

/** Plugin config: budgets, credential reference, and which local statuses trigger a rescue. */
export interface Config {
  /** Turn the fallback off without unwiring the provider (local-only mode). Volatile: live-updated by Settings. */
  enabled: Volatile<boolean>
  /** Credential reference resolved per fallback attempt; defaults to `DEEPSEEK_API_KEY`.
   *  Secrets never live in plugin config (profile patch is user-visible/backed up). */
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
  // volatile：回退开关是用户级运行时偏好，改了立刻作用于运行中的 provider（Settings 页可见）；
  // 其余字段（凭据 ref、baseURL、预算）改起来要重建 provider 的闭包，保持普通配置。
  enabled: z.boolean().default(true).volatile(),
  apiKeyEnv: z.string().role('credential-ref').default('DEEPSEEK_API_KEY'),
  baseURL: z.string().default(DEEPSEEK_WEB_API_BASE_URL),
  localTimeoutMs: z.number().step(1).min(1_000).default(10_000),
  totalBudgetMs: z.number().step(1).min(1_000).default(28_000),
  fallbackOnStatus: z.array(z.number()).default([500, 502, 503, 504]),
})
