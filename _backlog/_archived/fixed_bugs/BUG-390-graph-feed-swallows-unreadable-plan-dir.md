---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-390：useGraphFeed 吞掉 plan/ 目录不可读，伪造「无旧图快照，不能 diff」

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：GraphFeedState.snapshotsState 区分 absent/unreadable；读失败不再伪装「无旧图快照」；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

当 bundle 内 `plan/` 快照目录存在但 `list('plan')` 返回 `unreadable` 或抛出异常时，「研究图谱」页签的版本轨直接显示 **`无旧图快照，不能 diff`**，隐瞒了目录读取失败事实。

## 分诊与授权

- 严重级：P2 — 把快照目录读取失败折成“无旧图快照”，误导用户判断版本轨。
- 表面 / 边界：pack client（[useGraphFeed.ts](../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)）/ ② 行为（JSDOM）。
- DSH 不变量：fail-loud — 读不到数据不得伪装成没有数据。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 对 `drt_demo/plan` 注入 `dirFaults: { 'drt_demo/plan': 'unreadable' }` 即可复现。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { ResearchGraphTab } from "./packages/deep-research-pack/src/client/ResearchGraphTab.tsx";
import { toolCall } from "./tests/fixtures/events.mjs";
const { render, cleanup, act } = await loadRtl();
const run = makeMaliciousRunSource({
  tree: { drt_demo: { "plan.md": "图版本：v2\n| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n", plan: { "v1.md": "| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n" } } },
  dirFaults: { "drt_demo/plan": "unreadable" },
});
const { container } = render(createElement(ResearchGraphTab, {
  sessionId: "s-390", t: makeTranslator(zh),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  follow: (_t, s) => ({ async *[Symbol.asyncIterator]() {
    yield { kind: "history", events: [toolCall({ name: "write_file", arguments: { path: "drt_demo/question.md" } })] };
    await new Promise(r => s.addEventListener("abort", r, { once: true }));
  }}),
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
assert.doesNotMatch(container.textContent ?? "", /无旧图快照/);
cleanup();
'
```

## 根因（已证）

[useGraphFeed.ts](../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)（第 138–146 行）：

```ts
const planList = view.names.has('plan')
  ? await view.list('plan', { signal: controller.signal }).catch(() => null)
  : null
const found = (planList?.ok === true ? planList.value : [])...
```

既用 `.catch(() => null)` 吞异常（且逃过了只检查块语句的 `semantic-guardrails`），又对 `planList.ok === false` 静默回落成 `[]`。

## 牵出的失败类

- 同机制第 2 次｜处置：类修（封死 `RunView.list()` 未处理 `unreadable` 与 `.catch(() => null)` 吞错，并在 `tabs-fault-matrix` 纳入 `ResearchGraphTab` 目录故障）。

## 修法方向

- 在 `useGraphFeed` + `graph-state.ts` 为 `plan/` 目录读失败增加独立状态（或 `snapshotsRead: SourceRead`），在版本轨明确提示快照目录读取失败 + 重试；仅当 `plan/` 缺席或真为空目录时才显示“无旧图快照”。

## 修复判据

- `plan/` 目录不可读或 `list('plan')` 抛错时，版本轨提示读取失败并提供重试，不再显示「无旧图快照，不能 diff」。
- `plan/` 缺席或正常空目录仍显示「无旧图快照」（负控）。

## 修复落地（2026-11-24）

红证配方：把 GraphVersionRail 的 `snapshotsState === 'unreadable'` 分支删掉 → 快照目录读失败显示成「无旧图快照」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-graph/graph-state.ts",
    "packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts",
    "packages/deep-research-pack/src/client/research-graph/GraphVersionRail.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-390 图谱' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "读失败不得显示成「没有快照」"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  }
}
```
