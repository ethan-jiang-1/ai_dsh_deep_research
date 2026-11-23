---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-391：ResearchGraphTab 差异视图遇快照读失败/空/畸形永久显示「旧图快照读取中…」且无重试入口

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：差异卡对 SnapshotState 穷举（assertNever）+ 重试，retryTick 进入快照 effect 依赖；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

当 `plan/v1.md` 为 `unreadable`、`empty` 或 `invalid` 时，点击「研究图谱」版本轨的「看差异」按钮，结构差异卡片会永久卡在 **`旧图快照读取中…`**（`oldGraphLoading`），既不显示失败原因，也没有重试触发（且即使 `plan` 触发 `retry()`，快照 effect 也不会重跑）。

## 分诊与授权

- 严重级：P2 — `BUG-370` 补齐版本轨五态时漏掉了相邻的 `graphView === 'diff'` 渲染分支，导致永远“加载中”假象。
- 表面 / 边界：pack client（[ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) / [useGraphFeed.ts](../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)）/ ② 行为（JSDOM）。
- DSH 不变量：fail-loud — 读取失败/空/解析失败不得永久显示 loading。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — `plan/v1.md` 注入 `unreadable` 后点击「看差异」即可复现。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { ResearchGraphTab } from "./packages/deep-research-pack/src/client/ResearchGraphTab.tsx";
import { toolCall } from "./tests/fixtures/events.mjs";
const { render, fireEvent, screen, cleanup, act } = await loadRtl();
const run = makeMaliciousRunSource({
  tree: { drt_demo: { "plan.md": "图版本：v2\n| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n", plan: { "v1.md": "| id | kind |\n|---|---|\n| W1.1 | broad-scan |\n" } } },
  fileFaults: { "drt_demo/plan/v1.md": "unreadable" },
});
const { container } = render(createElement(ResearchGraphTab, {
  sessionId: "s-391", t: makeTranslator(zh),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  follow: (_t, s) => ({ async *[Symbol.asyncIterator]() {
    yield { kind: "history", events: [toolCall({ name: "write_file", arguments: { path: "drt_demo/question.md" } })] };
    await new Promise(r => s.addEventListener("abort", r, { once: true }));
  }}),
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
fireEvent.click(screen.getByRole("button", { name: /看差异/ }));
await flushUi(act);
assert.doesNotMatch(container.textContent ?? "", /旧图快照读取中/);
cleanup();
'
```

## 根因（已证）

1. [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（第 295–296 行）在 `planDiff === null` 时只判 `snapshotState === 'missing' ? props.t('oldGraphUnread') : props.t('oldGraphLoading')`，把 `unreadable`、`empty`、`invalid` 全落进 `oldGraphLoading`。
2. [useGraphFeed.ts](../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)（第 170–189 行）的快照读取 `useEffect` 依赖不含 `retryTick`，失败后无法通过重试恢复。

## 牵出的失败类

- 同机制第 2 次｜处置：类修（`SnapshotState` 闭集映射必须走带 `assertNever` 的 `switch`，补 `retryTick` 依赖与重试按钮）。

## 修法方向

- 在 `ResearchGraphTab` 提取基于 `assertNever` 穷举 `SnapshotState` 的 `diffPlaceholderOf(snapshotState, t)`，并给失败态挂载 `retry` 按钮；将 `retryTick` 纳入 `useGraphFeed` 快照 `useEffect` 依赖。

## 修复判据

- `plan/vN.md` 为 `unreadable` / `empty` / `invalid` / `missing` 时，「看差异」卡片分别显示对应失败提示（永不卡在 `旧图快照读取中…`），且支持重试恢复。
- `snapshotState === 'loading'` 时仍正常显示加载中（负控）。

## 修复落地（2026-11-24）

红证配方：把 snapshotDiffMessage 穷举改回 `missing ? oldGraphUnread : oldGraphLoading`（并删重试按钮）→ unreadable/empty/invalid 永久「读取中」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchGraphTab.tsx",
    "packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-391 图谱' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "不得永久显示读取中"
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
