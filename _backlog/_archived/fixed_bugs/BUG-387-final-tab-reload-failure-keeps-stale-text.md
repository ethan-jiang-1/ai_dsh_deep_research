---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-387：ResearchFinalTab 重载失败后保留陈旧正文，失败分支被 text !== null 遮蔽

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：失败出口 failLoad 原子清展示态，重读失败不再残留旧正文；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

`ResearchFinalTab` 首次加载成功后，`text`（以及 `readerText`/`draftText`）保持非空。后续当文件变为不可读或为空，用户点击降级通知条上的「重试」或在隐藏态触发后台轮询重载时，界面仍然显示**旧版本的报告正文与旧降级条**，主失败屏被跳过，新的错误提示只显示在长报告最底部的次要行里。

## 分诊与授权

- 严重级：P2 — 观察面状态撕裂，文件已损坏/不可读时用户仍看到过期内容。
- 表面 / 边界：pack client（[ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)）/ ② 行为（JSDOM）。
- DSH 不变量：fail-loud — 失败态不得被旧状态缓存覆盖。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 先挂载仅有审计版（空读者版）的 `ResearchFinalTab`，再将 `final/v1.md` 注入 `unreadable` 并点击重试按钮即复现。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
const { ResearchFinalTab } = await import("./packages/deep-research-pack/src/client/ResearchFinalTab.tsx");
const { render, fireEvent, screen, cleanup, act } = await loadRtl();
const run = makeMaliciousRunSource({
  tree: { drt_demo: { "final.md": "# Draft\n\nBody\n", final: { "v1.md": "# Audit\n\n旧审计正文\n", "readable-v1.md": "" } } },
});
const { container } = render(createElement(ResearchFinalTab, {
  sessionId: "s-387", t: makeTranslator(zh),
  useTabInfo: () => ({ tab: { navigation: { address: "dsh-resource://file/session/s-387/drt_demo/final/v1.md" }, visible: true, actions: { openTab: () => {} } } }),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
run.update({ fileFaults: { "drt_demo/final/v1.md": "unreadable" } });
fireEvent.click(screen.getByRole("button", { name: zh.retry }));
await flushUi(act);
assert.doesNotMatch(container.textContent ?? "", /旧审计正文/);
cleanup();
'
```

## 根因（已证）

[ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（第 135–166、271 行）：
1. `load()` 在 `!opened.ok`、`target === null`、`initial.failure !== null` 分支直接 `setFailure(...); setLoading(false); return`，没有清掉上一轮的 `text` / `readerText` / `draftText` / `stale`；
2. 渲染守卫 271 行写为 `if (failure !== null && text === null)`，因 `text` 仍非空而跳过失败屏。

## 牵出的失败类

- 同机制第 1 次｜处置：类修（将 `ResearchFinalTab` 的散装 `useState` 状态迁移抽为纯 Reducer 状态机，保证每次跃迁原子覆盖）。

## 修法方向

- 在 `load()` 失败分支原子复位展示正文与 `stale`（或将 `ResearchFinalTab` 抽为判别联合纯状态机 `final-state.ts`，与 `status-state.ts` / `graph-state.ts` 同构）。

## 修复判据

- 首次加载成功后若后续重读失败（`unreadable` / `empty` / `missing`），不再残留旧报告正文或 `stale` 条，正确切回带重试按钮的失败界面。
- 正常重读成功时正文与版本状态照常更新（负控）。

## 修复落地（2026-11-24）

红证配方：把失败出口 `failLoad` 里的 `setText/readerText/draftText/readerName/shownVersion/stale` 复位删掉（只置 failure）→ 旧正文残留、`text === null` 守卫被绕过。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-387 终稿' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "失败后不得残留旧正文"
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
