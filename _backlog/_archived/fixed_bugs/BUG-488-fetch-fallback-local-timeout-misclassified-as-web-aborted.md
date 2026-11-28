---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-488：`fetch-fallback` 传入外层 `AbortSignal.timeout(10s)` 被 `HttpFetchProvider` 判为 `WEB_ABORTED`，导致本地超时永久跳过 DeepSeek Fetch API 回退

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

在真实研究 run `drt_huawei-ascend-dd` 中，慢站/拦截站点的 4 次 `web_fetch` 全部在约 **10.1 秒**（`localTimeoutMs: 10000`）以裸错 `Error: web fetch aborted` 失败，**完全没有触发 DeepSeek Fetch API 回退**（剩余约 18 秒 `totalBudgetMs` 未被使用，错误信息也丢失了 URL）：

- `analyst-a`（`e6bd0b27`）step 17 `https://www.eet-china.com/mp/a502367.html`：耗时 `10,126 ms` → `Error: web fetch aborted`
- `analyst-a`（`e6bd0b27`）step 18 `https://cloud.tencent.com.cn/developer/article/2643177`：耗时 `10,073 ms` → `Error: web fetch aborted`
- `analyst-c`（`1c8add3d`）step 22 `https://www.eet-china.com/mp/a533108.html`：耗时 `10,067 ms` → `Error: web fetch aborted`
- `analyst-c`（`1c8add3d`）step 23 `https://www.eet-china.com/mp/a533108.html`（单发调用）：耗时 `10,105 ms` → `Error: web fetch aborted`

## 分诊与授权

- 严重级：P1 — `fetch-fallback`（D31）最核心的「本地超时 → 自动回退 DeepSeek Fetch API」路径在真实运行态被彻底架空，且错误消息退化为无 URL 的 `web fetch aborted`。
- 表面 / 边界：`packages/deep-research-pack/src/fetch-fallback/index.ts`、`packages/deep-research-pack/src/fetch-fallback/orchestrate.ts` / pack host provider
- DSH 不变量：fail-loud
- 触及面：pack 公共行为（D31 抓取回退链路）
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-fetch-fallback-timeout-and-protocol-sections

## 复现

1. 对照 [`fetch-fallback/index.ts`](../../../packages/deep-research-pack/src/fetch-fallback/index.ts)（`L36-L39, L48-L54`）、[`fetch-fallback/orchestrate.ts`](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts)（`L74-L87`）与上游 `vendor/dsh/packages/web/web-fetch-http/src/provider.ts`（`L61, L260-L269`）；
2. 用真实 `HttpFetchProvider` 指向挂起超过 `localTimeoutMs` 的本地桩服务器（不取消调用方 `signal`），观察返回 `WebError(code='WEB_ABORTED')` 且 `api` 回退桩调用次数为 0；
3. 实跑日志现场：`runtime/harness-home/sessions/--Users-bowhead-ai_dsh_deep_research-research-workspace--/{e6bd0b27-*,1c8add3d-*}/session.v4.jsonl.zstd`（`seq 142->144`, `150->152`, `178->180`, `186->187`）。

## 证据链

1. 上游 `vendor/dsh/packages/web/web-fetch-http/src/provider.ts`（`L260-L269`）明确规定：`translateAbortOrNetwork` 仅在 `timeoutOf(signal, 'WEB_FETCH_TIMEOUT') !== undefined`（即其内部自建 `deadline(signal, this.limits.timeoutMs, 'WEB_FETCH_TIMEOUT')` 触发）时才返回 `WEB_FETCH_TIMEOUT`；任何外层/异源 `AbortSignal` 超时（*"a foreign/outer deadline's timeout under nesting"*）均归类为 `WEB_ABORTED`（`new WebError('web fetch aborted', 'WEB_ABORTED')`）。
2. [`fetch-fallback/index.ts`](../../../packages/deep-research-pack/src/fetch-fallback/index.ts)（`L36-L39`）的 `withDeadline` 在调用 `local.fetch(req, sig)` 之前先用 `AbortSignal.timeout(budget.local)`（10s）包了一层外源超时信号；由于该计时器比 `HttpFetchProvider` 内部同样 10s 的 `deadline(...)` 更早创建，必然先一步触发，导致 `HttpFetchProvider` 把本地超时错判成 `WEB_ABORTED`。
3. [`fetch-fallback/orchestrate.ts`](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts)（`L81-L84`）在 `callerAborted()` 为 `false` 后检查 `fallbackForError(code)`，而 [`fetch-fallback/policy.ts`](../../../packages/deep-research-pack/src/fetch-fallback/policy.ts)（`L26-L30`）将 `WEB_ABORTED` 列入 `NEVER_FALLBACK_ERROR_CODES`，直接 `throw localError`，永久跳过 API 回退腿。
4. 此外 [`orchestrate.ts`](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts)（`L117`）在状态码回退分支触发 `callerAborted()` 时同样抛出不含 URL 的裸 `'web fetch aborted'`。

## 建议方向 / 不越界边界

- 在 `orchestrate.ts` 区分「外层调用方 `callerAborted()`」与「本层创建的 `localDeadline.aborted`」：当 `localDeadline` 触发且 `!callerAborted()` 时，无论底层 `local` 返回 `WEB_ABORTED` 还是 `TimeoutError`，一律按 `WEB_FETCH_TIMEOUT` 走回退决策（或直接把本地腿超时交给 `HttpFetchProvider` 自己的 `timeoutMs` 并在外层仅对 `localDeadline` 做超时归因）；同时保留 URL 上下文，不丢诊断信息。
- 补一条用真实 `HttpFetchProvider`（非假桩）验证本地超时进入 API 回退腿的测试，堵住「假桩恒抛 `WEB_FETCH_TIMEOUT` 遮蔽真实接线契约」的盲区。
- 严守 `vendor/dsh/` 只读红线，修法完全落在 `packages/deep-research-pack/src/fetch-fallback/`。

## 修复关联

去向：implemented — [2026-11-28-fetch-fallback-timeout-and-protocol-sections](../../../notes/implemented/2026-11-28-fetch-fallback-timeout-and-protocol-sections.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/fetch-fallback/orchestrate.ts",
    "packages/deep-research-pack/src/fetch-fallback/index.ts",
    "tests/pack/fetch-fallback/fetch-fallback-orchestration.spec.mjs",
    "checks/smoke/fetch-fallback.e2e.mjs",
    "checks/smoke/registry.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/pack/fetch-fallback/fetch-fallback-orchestration.spec.mjs && node --import tsx/esm checks/smoke/fetch-fallback.e2e.mjs",
    "exit": 1,
    "output": "Error [WebError]: web fetch aborted (code: WEB_ABORTED, cause: TimeoutError) at HttpFetchProvider.translateAbortOrNetwork; apiCalls=0"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/pack/fetch-fallback/fetch-fallback-orchestration.spec.mjs && node --import tsx/esm checks/smoke/fetch-fallback.e2e.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/pack/fetch-fallback/fetch-fallback-orchestration.spec.mjs"
  }
}
```
