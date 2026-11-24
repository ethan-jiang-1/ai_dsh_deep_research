---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-419：抓取回退把本地腿配额重复扣一次，API 腿预算被砍掉最多 10s（慢站点救不回）

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：legBudget 只做初始切分；新增 remainingAfterLocal（已耗时只扣一次）；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

D31 抓取回退（本地抓取失败 → DeepSeek Fetch API）在本地腿**已经跑完**之后，给 API 腿的预算被多扣了一整个 `localTimeoutMs`：

| 本地腿实际耗时 | API 腿拿到 | 按「总预算 − 已用」应为 |
|---|---|---|
| 0 ms | 18000 ms | 18000 ms ✅ |
| 9000 ms | **9000 ms** | 19000 ms ❌ |
| 9900 ms（本地超时上限附近） | **8100 ms** | 18100 ms ❌ |

默认配置 `totalBudgetMs=28000` / `localTimeoutMs=10000` 下，**本地腿越慢，API 腿越短**——而正确语义恰好相反（本地已花掉的时间应从总预算里扣一次，不是两次）。实际后果：本地超时（约 10s）后，本该还有 18s 的 API 抓取只剩 8.1s，一批中等大小/较慢的页面被判「抓取失败」，回退功能在最需要它的场景（本地超时）下预算最少。

## 分诊与授权

- 严重级：P2 — 回退路径的可用性显著下降（预算少 45%~55%），不崩溃、不改数据。
- 表面 / 边界：pack host（[orchestrate.ts](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts) × [policy.ts](../../../packages/deep-research-pack/src/fetch-fallback/policy.ts) `legBudget`）/ ① 代码（预算算术）。
- DSH 不变量：两条腿共享一份总预算——已消耗的时间只能扣一次。
- 触及面：pack 公共行为（`legBudget` 是导出纯函数，`tests/pack/fetch-fallback` 已钉住其现有取值）→ 修法需同 diff 改测试期望。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 注入时钟，让本地腿「耗时 9s 后抛超时」，读取 API 腿实收预算。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { fetchWithFallback } from "./packages/deep-research-pack/src/fetch-fallback/orchestrate.ts";
let clock = 0; let got = null;
const deps = {
  now: () => clock,
  local: async () => { clock += 9_000; throw Object.assign(new Error("timeout"), { code: "WEB_FETCH_TIMEOUT" }); },
  api: async (_r, _d, remaining) => { got = remaining; return { url: "https://api", statusCode: 200, body: { kind: "text", content: "ok" }, truncated: false }; },
  deadline: (_s, ms) => ms,
  makeError: (m, c) => Object.assign(new Error(m), { code: c }),
};
const settings = { enabled: true, localTimeoutMs: 10_000, totalBudgetMs: 28_000, fallbackOnStatus: [503], apiKeyEnv: "DEEPSEEK_API_KEY" };
await fetchWithFallback(deps, settings, { url: "https://example.com/a" });
console.log("API_LEG_BUDGET=", got, "EXPECTED=", settings.totalBudgetMs - 9_000);
assert.equal(got, settings.totalBudgetMs - 9_000);
'
```

实测：`API_LEG_BUDGET= 9000 EXPECTED= 19000`（断言红）。

## 根因（已证）

[policy.ts](../../../packages/deep-research-pack/src/fetch-fallback/policy.ts) `legBudget`：

```js
const remaining = Math.max(0, totalMs - elapsedMs)
const local = Math.max(1, Math.min(localTimeoutMs, remaining))
return { local, fallback: Math.max(0, remaining - local) }
```

`fallback = (total − elapsed) − min(localTimeout, total − elapsed)`，即 **`total − elapsed − localTimeout`**（只要剩余还够 localTimeout）。而调用方在本地腿**已经结束**时只取 `.fallback`（[orchestrate.ts](../../../packages/deep-research-pack/src/fetch-fallback/orchestrate.ts) 两处：抛错回退与状态码回退），此后本地腿不会再跑，那笔再预留的 `localTimeout` 永远不会被用掉，纯属多扣。

函数自己的注释写的是「本地腿最多占 localTimeoutMs，剩余给 API 腿」——按这句，API 腿应得 `total − 实际已用`。

## 牵出的失败类

- 同机制第 1 次（两段预算的"已用"被当成"预留"重复计入）｜处置：点修 + 把 `tests/pack/fetch-fallback` 的 `legBudget(28_000, 10_000, 9_000)` 期望从 `fallback: 9000` 改为 `19000`，并补一条「本地腿耗时 → API 腿预算」的实跑断言。

## 修法方向

- `legBudget` 的 `elapsedMs` 语义若为「本地已实际耗时」，则 `fallback = remaining`（不再减 local）；若要保持"两腿各占一份"的规划语义，则应另开 `remainingAfterLocal()` 供 orchestrate 使用——两条语义不能共用一个函数名。
- 明确 `local` 字段在 `elapsedMs > 0` 时的含义（现在它返回的是"若无其事再给一次本地腿的额度"，无人消费且误导）。

## 修复判据

- 复现脚本断言为绿（本地腿 9s 后失败 → API 腿 19000ms；9.9s → 18100ms；0ms → 18000ms 不变）；
- `tests/pack/fetch-fallback` 的 `legBudget` 期望随语义同 diff 更新且全绿；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 orchestrate 的 `remainingAfterLocal(...)` 换回「剩余 − localTimeout」的双扣算式 → 本地腿 9s 后 API 腿只剩 9s。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/fetch-fallback/policy.ts",
    "packages/deep-research-pack/src/fetch-fallback/orchestrate.ts",
    "tests/pack/fetch-fallback/fetch-fallback.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-419' tests/pack/fetch-fallback/fetch-fallback.spec.mjs",
    "exit": 1,
    "output": "API 腿预算 expected 19000 / actual 9000（已耗时被重复扣一次 localTimeout）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-419' tests/pack/fetch-fallback/fetch-fallback.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/pack/fetch-fallback/fetch-fallback.spec.mjs"
  }
}
```
