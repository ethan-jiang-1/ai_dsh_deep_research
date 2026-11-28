#!/usr/bin/env node
// fetch-fallback.e2e.mjs — 真 HttpFetchProvider × fetchWithFallback 契约冒烟（BUG-488，keyless 零外网）。
//
// 为什么住 checks/smoke/ 而非 tests/：vendor 的 HttpFetchProvider 传递引入 `node:net` 与 `fetch`，
// 回归层（tests/）按 layering 守卫必须零网络/零 fetch 闭包；本脚本通过构造函数第二参
// `resolveAddresses` 注入挂起到 signal abort 的零外网解析器，真实触发 HttpFetchProvider.fetch
// 内部 deadline 与外层 AbortSignal.timeout(localTimeoutMs) 的竞态，堵住纯假腿单测的盲区。
//
// 用法：node --import tsx/esm checks/smoke/fetch-fallback.e2e.mjs
// 负例留证 2026-11-28：BUG-488——去掉 orchestrate.ts 里 `localSignal.aborted && !callerAborted()` 的
// WEB_FETCH_TIMEOUT 归一化 → 本脚本场景① 报 `WebError: web fetch aborted`（apiCalls === 0）exit 1；修复后 exit 0。
import assert from 'node:assert/strict'
import { WebError } from '../../vendor/dsh/packages/web/web/src/index.ts'
import { HttpFetchProvider } from '../../vendor/dsh/packages/web/web-fetch-http/src/provider.ts'
import { fetchWithFallback, withDeadline } from '../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts'

function hangingResolver(_hostname, signal) {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new Error('aborted'))
      return
    }
    signal.addEventListener('abort', () => reject(signal.reason ?? new Error('aborted')), { once: true })
  })
}

async function run() {
  // 1) 真 HttpFetchProvider 遇外层 localTimeoutMs 超时 → 必须归一为 WEB_FETCH_TIMEOUT 并触发 API 回退
  {
    const localTimeoutMs = 40
    const local = new HttpFetchProvider({
      maxResponseBytes: 5_000_000,
      maxBodyChars: 100_000,
      timeoutMs: localTimeoutMs,
      maxRedirects: 5,
      userAgent: 'deepseek-harness-smoke/0.0.1',
    }, hangingResolver)

    let apiCalls = 0
    const url = 'https://www.reuters.com/world/china/example'
    const rescued = await fetchWithFallback({
      local: (req, sig) => local.fetch(req, sig),
      api: async (req) => {
        apiCalls++
        return {
          url: req.url,
          statusCode: 200,
          body: { kind: 'text', content: 'rescued by fallback API' },
          truncated: false,
        }
      },
      deadline: withDeadline,
      makeError: (message, code, cause) => new WebError(message, code, cause === undefined ? undefined : { cause }),
      now: () => Date.now(),
    }, {
      enabled: true,
      localTimeoutMs,
      totalBudgetMs: 1_000,
      fallbackOnStatus: [403, 429, 500, 502, 503, 504],
      apiKeyEnv: 'REF',
    }, { url })

    assert.equal(apiCalls, 1, '真 HttpFetchProvider 外层超时必须触发 API 回退')
    assert.match(rescued.body.content, /^> 回退：本地抓取失败（WEB_FETCH_TIMEOUT:/)
    assert.match(rescued.body.content, /rescued by fallback API$/)
    console.log('PASS  fetch-fallback.e2e #1: 真 HttpFetchProvider 外层超时触发 API 回退（WEB_FETCH_TIMEOUT）')
  }

  // 2) 负控：真 HttpFetchProvider 遇调用方主动 abort → 绝不触发 API 回退，保持 WEB_ABORTED
  {
    const local = new HttpFetchProvider({
      maxResponseBytes: 5_000_000,
      maxBodyChars: 100_000,
      timeoutMs: 2_000,
      maxRedirects: 5,
      userAgent: 'deepseek-harness-smoke/0.0.1',
    }, hangingResolver)

    let apiCalls = 0
    const caller = new AbortController()
    setTimeout(() => caller.abort(new Error('user stopped')), 25)

    await assert.rejects(
      () => fetchWithFallback({
        local: (req, sig) => local.fetch(req, sig),
        api: async () => {
          apiCalls++
          return { url: 'https://example.com/', statusCode: 200, body: { kind: 'text', content: 'unexpected' }, truncated: false }
        },
        deadline: withDeadline,
        makeError: (message, code, cause) => new WebError(message, code, cause === undefined ? undefined : { cause }),
        now: () => Date.now(),
      }, {
        enabled: true,
        localTimeoutMs: 2_000,
        totalBudgetMs: 5_000,
        fallbackOnStatus: [500, 503],
        apiKeyEnv: 'REF',
      }, { url: 'https://example.com/' }, caller.signal),
      (error) => error?.code === 'WEB_ABORTED',
    )
    assert.equal(apiCalls, 0, '调用方主动取消绝不能触发 API 回退')
    console.log('PASS  fetch-fallback.e2e #2: 真 HttpFetchProvider 调用方主动取消绝不触发 API 回退')
  }
}

run().then(() => {
  process.exit(0)
}).catch((error) => {
  console.error('FAIL  fetch-fallback.e2e:', error)
  process.exit(1)
})
