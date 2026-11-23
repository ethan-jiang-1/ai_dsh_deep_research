---
status: 已修
severity: P1
opened: 2026-11-23
---

# BUG-386：ResearchFinalTab 吞掉 final/ 目录不可读，静默回落展示工作稿 final.md

> 严重级别：P1 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：final/ 目录 unreadable = 显式失败 + 重试（finalDirUnreadable）；absent 才回落 final.md；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

当 bundle 的 `final/` 目录在场但不可读（`EACCES`/通道故障）且根 `final.md` 存在时，打开「终稿」页签会直接渲染工作稿 `final.md`（静音条显示 `当前版` / `终稿工作稿`），界面没有任何关于 `final/` 目录不可读的错误提示或重试入口；若打开 `final/v1.md` 且同版读者版存在，还会静默隐藏 `readable-v1.md`。

## 分诊与授权

- 严重级：P1 — 观察面把目录读失败静默折成空版本账并回落到未交付工作稿，用户会把草案误认作当前唯一终稿（与已修状态页同因 [BUG-373](../../_archived/fixed_bugs/BUG-373-status-final-dir-read-failure-no-warning.md)）。
- 表面 / 边界：pack client（[ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)）/ ② 行为（JSDOM）。
- DSH 不变量：fail-loud — 目录不可读不得静默折为空数组。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — `makeMaliciousRunSource` 注入 `dirFaults: { 'drt_demo/final': 'unreadable' }` 即可复现。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
const { ResearchFinalTab } = await import("./packages/deep-research-pack/src/client/ResearchFinalTab.tsx");
const { render, cleanup, act } = await loadRtl();
const run = makeMaliciousRunSource({
  tree: { drt_demo: { "final.md": "# 工作稿\n\n完整审计正文（工作稿）\n", final: { "v1.md": "# v1\n\nv1\n" } } },
  dirFaults: { "drt_demo/final": "unreadable" },
});
const { container } = render(createElement(ResearchFinalTab, {
  sessionId: "s-386", t: makeTranslator(zh),
  useTabInfo: () => ({ tab: { navigation: { address: "dsh-resource://file/session/s-386/drt_demo/final.md" }, visible: true, actions: { openTab: () => {} } } }),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
assert.doesNotMatch(container.textContent ?? "", /完整审计正文（工作稿）/);
cleanup();
'
```

## 根因（已证）

[ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（第 141–145 行）只检查 `listed.ok` 并把失败一律折成 `[]`：

```ts
const listed = await viewIo.list(FINAL_LEDGER_DIR, { signal })
const versionNames = listed.ok ? ... : []
```

没有用 `readStateOf(listed)` 区分 `missing` 与 `unreadable`。

## 牵出的失败类

- 同机制第 2 次｜处置：类修（与 [BUG-373](../../_archived/fixed_bugs/BUG-373-status-final-dir-read-failure-no-warning.md) 状态页 `finalDir` 同一模式；同时应排查 `RunView.list()` 的 `unreadable` 边界）。

## 修法方向

- 在 `ResearchFinalTab` 用 `readStateOf(listed)` 区分 `final/` 目录 `absent`（正常回落 `final.md`）与 `unreadable`（显式失败态或显眼报错条 + 重试，不得把工作稿伪装成无版本账）。

## 修复判据

- `final/` 不可读（`unreadable`）时显式提示终稿目录读取失败并提供重试按钮，不静默回落成正常工作稿视图。
- `final/` 缺席（`missing`）时保持回落 `final.md` 工作稿行为不变（负控）。
- `ResearchFinalTab` 接入 `tabs-fault-matrix.spec.mjs` 的目录不可读矩阵。

## 修复落地（2026-11-24）

红证配方：把 `readStateOf(listed) === 'unreadable'` 判定删回 `listed.ok ? … : []`（目录读失败折成空版本账）→ 终稿页签静默展示工作稿。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-386 终稿' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "目录不可读时不得静默展示工作稿"
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
