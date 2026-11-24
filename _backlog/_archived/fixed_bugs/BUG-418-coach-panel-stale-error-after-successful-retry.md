---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-418：MethodCoachPanel 建会话失败后重试成功不复位 error，面板同时显示「就绪」与「暂不可用」

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：重试成功清 error；详情走 errorDetailOf（无 `Error: ` 前缀）；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

方法库页「方法编辑」面板的建会话 effect 失败一次后（`ensure` 抛错 → `error` 置位），若之后 effect 重跑并**成功**建好会话，面板进入自相矛盾态：

- 标题行显示 **`方法编辑 就绪`**；
- 下方红字仍显示 **`方法编辑暂不可用：Error: 建会话失败 A（表单可以继续填，稍后重试）`**。

错误只在按下「开始访谈」时（`startInterview` 里 `setError(null)`）才被清掉，用户在此之前一直以为编辑器坏了。同时错误文案带 `Error: ` 前缀（`String(cause)` 直出）。

## 分诊与授权

- 严重级：P2 — 观察面呈现互相矛盾的可用性结论，误导用户放弃本可用的功能。
- 表面 / 边界：cockpit UI（[coach.tsx](../../../packages/deep-research-pack/src/client/method-library/coach.tsx)）/ ② UI 状态机。
- DSH 不变量：UI 陈述必须与真实状态一致（「就绪」与「不可用」不能同时为真）。
- 触及面：none — 观察面 client + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — RTL 渲染两次（第一次 `ensure` 抛错、第二次成功，靠 `t` 标识变化触发 effect 重跑），第二次文本里错误横幅仍在。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import React from "react";
import { installClientDom, loadRtl, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
installClientDom();
const { MethodCoachPanel } = await import("./packages/deep-research-pack/src/client/method-library/coach.tsx");
const { render, cleanup, act } = await loadRtl();
let fail = true;
const ensure = async () => fail
  ? Promise.reject(new Error("建会话失败 A"))
  : { id: "coach-1", reference: { release: () => {}, ready: Promise.resolve(), binding: { session: { getSnapshot: () => ({ openState: "open" }) } } } };
const props = (t) => ({ sessionId: "s1", draftKey: "k1", visible: true, ensure, onStartInterview: async () => ({ ok: true }), title: "方法编辑", startLabel: "开始访谈", readyLabel: "就绪", pendingLabel: "启动中", startedLabel: "已开始", t });
const { container, rerender } = render(React.createElement(MethodCoachPanel, props(makeTranslator(zh))));
await flushUi(act);
fail = false;
rerender(React.createElement(MethodCoachPanel, props(makeTranslator(zh))));
await flushUi(act);
const text = container.textContent ?? "";
console.log("TEXT=", text);
assert.doesNotMatch(text, /暂不可用/);
cleanup();
'
```

实测：`TEXT= 方法编辑就绪开始访谈方法编辑暂不可用：Error: 建会话失败 A（…）`（断言红）。

## 根因（已证）

[coach.tsx](../../../packages/deep-research-pack/src/client/method-library/coach.tsx)：

1. 建会话 effect（依赖 `[sessionId, draftKey, ensure, onCoach, onError, t]`）内部只在 `catch` 里 `setError(String(cause))`，**成功路径与 effect 重入时都不 `setError(null)`**；
2. 全仓只有 `startInterview` 开头调 `setError(null)` —— 所以「失败 → 重试成功」这条最常见的恢复路径永远不清旧错误；
3. `String(cause)` 把 `Error` 序列化成 `Error: <message>`，与 `lib/shared/error-detail.ts`（BUG-410 引入的安全取详情）口径不一致。

## 牵出的失败类

- 同机制第 1 次（错误态只增不清 + 非 `errorDetailOf` 取详情）｜处置：点修 + 在 effect 入口/成功分支复位 `error`，并改用 `errorDetailOf`。

## 修法方向

- 建会话 effect 开头（或每次重入）`setError(null)`，成功路径再显式清一次；
- 用 `errorDetailOf(cause)` 取详情（去掉 `Error: ` 前缀）；
- 若 `started`/`startBusy` 也需随 draft 变化复位，一并核对（当前依赖 `MethodLibraryView` 的 `key` 重挂载兜底，属隐式契约，建议注释写明）。

## 修复判据

- 复现脚本断言为绿：重试成功后面板不再出现「暂不可用」，标题行「就绪」与按钮可用；
- 首次失败时错误仍显示且文案不含 `Error: ` 前缀（负控：不得吞掉失败）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉建会话成功分支的 `setError(null)`（或把 errorDetailOf 换回 String(cause)）→ 面板同时说「就绪」与「暂不可用」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/method-library/coach.tsx",
    "tests/cockpit/client/method-library/coach-panel.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-418 建会话' tests/cockpit/client/method-library/coach-panel.spec.mjs",
    "exit": 1,
    "output": "waitFor 超时：重试成功后错误条仍在（面板同时说「就绪」与「暂不可用」）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-418 建会话' tests/cockpit/client/method-library/coach-panel.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/method-library/coach-panel.spec.mjs"
  }
}
```
