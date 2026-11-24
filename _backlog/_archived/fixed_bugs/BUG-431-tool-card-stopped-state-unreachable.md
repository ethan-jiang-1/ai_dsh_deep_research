---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-431：工具卡的 `stopped` 状态不可达——vendor 用 `TOOL_OUTCOME_UNKNOWN`，代码只认 `'interrupted'`，崩溃中断被显示成「失败」

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：崩溃恢复码（TOOL_OUTCOME_UNKNOWN/TOOL_NOT_STARTED）判 stopped「结果未知」；两张工具卡据此渲染可重试提示；去向：implemented — 批 Note [2026-11-24-vendor-wire-semantics-and-log-tail](../../../notes/implemented/2026-11-24-vendor-wire-semantics-and-log-tail.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`cardStateOf` 给工具卡定义了四态 `running | ok | error | stopped`，其中 `stopped` 用于「工具调用被崩溃/中断截断，**结果未知**」。它的判据是 `block.error?.code === 'interrupted'`——但真实 vendor 从不发这个码：

| 真实来源（vendor `session/src/repair.ts`） | `error.code` | `cardStateOf` 结果 |
|---|---|---|
| 调用已记录、结果未落盘（崩溃恢复） | `TOOL_OUTCOME_UNKNOWN` | **`error`** |
| 调用未开始（崩溃恢复） | `TOOL_NOT_STARTED` | **`error`** |
| 普通工具失败（实例：`FS_STALE_VERSION`） | `FS_STALE_VERSION` | `error` |
| 代码假设的 `'interrupted'` | `'interrupted'` | `stopped`（此码不存在） |

后果：**「结果未知」被渲染成「失败」**——vendor 自己的措辞是 *"Its outcome is unknown. Decide whether to retry…"*，而观察面给用户的是失败标记。且 `'stopped'` 这个类型成员在 pack 内**零消费者**（`grep "'stopped'"` 只命中定义与这一行判据），等于整条语义从未上线。

## 分诊与授权

- 严重级：P2 — 观察面把「不知道」写成「失败」（否定性误判）；不破坏数据。
- 表面 / 边界：cockpit 数据面（[tool-card.ts](../../../packages/deep-research-pack/src/lib/events/tool-card.ts) `cardStateOf`）/ ② 行为（keyless，纯函数）。
- DSH 不变量：不得把「未知」当「失败」；model-visible ⟺ logged 的 UI 对偶面必须如实。
- 触及面：none — pack lib + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = wire-semantics-and-log-tail-431-434。
- 批：wire-semantics-and-log-tail-431-434。

## 复现

复现状态：稳定 — 传入 vendor 真实码，永远得到 `error`。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { cardStateOf } from "./packages/deep-research-pack/src/lib/events/tool-card.ts";
const cases = [
  ["TOOL_OUTCOME_UNKNOWN", { kind: "tool-result", isError: true, error: { name: "ToolOutcomeUnknownError", code: "TOOL_OUTCOME_UNKNOWN" } }],
  ["TOOL_NOT_STARTED", { kind: "tool-result", isError: true, error: { name: "ToolNotStartedError", code: "TOOL_NOT_STARTED" } }],
  ["interrupted（代码假设）", { kind: "tool-result", isError: true, error: { code: "interrupted" } }],
];
for (const [label, block] of cases) console.log(label, "→", cardStateOf(block));
assert.equal(cardStateOf(cases[0][1]), "stopped");
'
```

实测：`TOOL_OUTCOME_UNKNOWN → error` / `TOOL_NOT_STARTED → error` / `interrupted（代码假设）→ stopped`（断言红）。

## 根因（已证）

[tool-card.ts](../../../packages/deep-research-pack/src/lib/events/tool-card.ts)（第 25 行）：

```js
if (b.error?.code === 'interrupted') return 'stopped'
```

vendor 的中断语义走**两个具体错误码**（`repair.ts` 的 `TOOL_NOT_STARTED` / `TOOL_OUTCOME_UNKNOWN`，均由 `openTurnClosers` 的合成 `tool/result` 携带），外加 `cause.kind === 'interrupted'` 只出现在 `turn/end.reason`，从不进 `error.code`。代码把「cause 名」当成了「error code」。

## 牵出的失败类

- 同机制第 1 次（把 vendor 的某种内部枚举值当 wire 值；与 BUG-424/425 的「判据假设」同族）｜处置：类修——判据改为 vendor 导出的两个常量（`TOOL_NOT_STARTED`/`TOOL_OUTCOME_UNKNOWN`，可直接 import `@deepseek-ai/dsh-session`），并把 `'stopped'` 接到至少一个消费方（否则删掉这个状态，别留死语义）。

## 修法方向

- `cardStateOf`：`error.code ∈ {TOOL_NOT_STARTED, TOOL_OUTCOME_UNKNOWN}` → `'stopped'`；
- 研究语义卡（`ResearchToolCard`）与写库卡（`MethodLibraryToolCard`）按 `stopped` 渲染「结果未知（可重试）」而不是失败；
- 回归：三码矩阵 + 一个「卡上文案」断言。

## 修复判据

- 复现脚本断言为绿（两码都得到 `stopped`）；
- 普通失败码（`FS_STALE_VERSION`）仍 `error`（负控）；
- 至少一处 UI 在 `stopped` 下显示「未知」而非「失败」；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 cardStateOf 的判据改回只认 `error.code === 'interrupted'`（vendor 恢复码 → error）。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/events/tool-card.ts",
    "packages/deep-research-pack/src/client/ResearchToolCard.tsx",
    "packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/run/shared/tool-card.spec.mjs",
    "tests/cockpit/client/method-library/method-library-tool-card.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-431' tests/run/shared/tool-card.spec.mjs",
    "exit": 1,
    "output": "vendor 恢复码 expected 'stopped' / actual 'error'（未知被写成失败）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-431' tests/run/shared/tool-card.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/shared/tool-card.spec.mjs"
  }
}
```
