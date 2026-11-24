---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-409：StartCard 的 choosing / chooseError 不随 sessionId 复位，切会话后按钮永久禁用且旧会话错误提示残留

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：choosing/chooseError 绑 sessionId 复位；代次 token 让旧 promise 结算失效；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

产品首屏起步卡（`StartCard`）的「选择项目目录」按钮在两条真实路径上跨会话泄漏本地交互态：

1. **按钮永久禁用**：用户点「选择项目目录」后系统目录选择器一直未结算（模态框挂着、或宿主 promise 挂起），此时切到另一个会话 —— 新会话的起步卡按钮仍是「正在打开目录选择器…」且 `disabled=true`，用户在该会话再也无法选择工作区，只能刷新页面；
2. **旧错误提示残留**：会话 A 里选择目录失败（如用户取消），错误条 `目录选择失败：…`（`role="alert"`）在会话 B 的起步卡上继续显示——用户会以为刚在当前会话失败过。

## 分诊与授权

- 严重级：P2 — 会话级瞬态交互态跨会话泄漏，导致新会话功能不可用（禁用）与错误归因错位（残留提示）；与 [BUG-399](../../_archived/fixed_bugs/BUG-399-defaults-panel-confirm-clear-leaks-across-sessions.md) 同一失败类。
- 表面 / 边界：cockpit UI（[StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)）/ ② UI 状态机。
- DSH 不变量：Identity, initial state & disposal — 组件本地瞬态必须绑定当前 `sessionId`；上一代的在途 promise 不得改写新会话的 UI 状态。
- 触及面：none — 观察面 client + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — RTL 渲染 `StartCard` 后（a）令 `chooseWorkspace` 返回永不结算的 promise 再切 `sessionId`，（b）令其 reject 后再切 `sessionId`，两条断言均红。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import React from "react";
import { installClientDom, loadRtl, makeTranslator } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { StartCard } from "./packages/deep-research-pack/src/client/StartCard.tsx";
installClientDom();
const { render, fireEvent, cleanup, act, waitFor } = await loadRtl();
const t = makeTranslator(zh);
const props = (o) => ({ sessionId: "s1", workspaceTitle: "WS1", workspacePath: "/tmp/ws1", listDir: async () => [], hasUserMessage: async () => false, chooseWorkspace: async () => {}, t, ...o });
const btn = (c) => c.querySelector("[data-testid=deep-research-choose-workspace]");

// (a) 挂起的 chooseWorkspace 跨会话残留 → 新会话按钮禁用
{
  const never = new Promise(() => {});
  const { container, rerender } = render(React.createElement(StartCard, props({ chooseWorkspace: () => never })));
  await waitFor(() => { if (!btn(container)) throw new Error("wait"); });
  fireEvent.click(btn(container));
  await act(async () => {});
  rerender(React.createElement(StartCard, props({ sessionId: "s2", chooseWorkspace: () => never })));
  await act(async () => {});
  console.log("S2_BTN_DISABLED=", btn(container)?.disabled);
  assert.equal(btn(container)?.disabled, false);
  cleanup();
}

// (b) 上一会话的错误提示跨会话残留
{
  const { container, rerender } = render(React.createElement(StartCard, props({ chooseWorkspace: () => Promise.reject(new Error("用户取消")) })));
  await waitFor(() => { if (!btn(container)) throw new Error("wait"); });
  fireEvent.click(btn(container));
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  rerender(React.createElement(StartCard, props({ sessionId: "s2", chooseWorkspace: () => Promise.reject(new Error("用户取消")) })));
  await act(async () => {});
  console.log("S2_ALERT=", container.querySelector("[role=alert]")?.textContent);
  assert.equal(container.querySelector("[role=alert]"), null);
  cleanup();
}
'
```

实测输出：`S2_BTN_DISABLED= true`（断言红）、`S2_ALERT= 目录选择失败：用户取消`（断言红）。

## 根因（已证）

[StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)（约第 49–71 行与第 87–104 行）：

1. `choosing` / `chooseError` 都是 `useState` 本地态，**没有任何随 `sessionId` 复位的 effect**；唯一的 `useEffect` 只负责「是否显示起步卡」并随 `sessionId` 重跑，不触碰这两个状态；
2. 点击处理里 `void chooseWorkspace().catch(...).finally(() => setChoosing(false))`：`finally` 只在 promise 结算时执行，既没有会话代际守卫，也没有在 `sessionId` 变化/卸载时把 `choosing` 归位 → 挂起的 promise 会让新会话一直 `disabled`；
3. 同一路径的 `.catch` 直接 `setChooseError(...)`，无「仍是当前会话」判定 → 旧会话的失败写入新会话的 `role="alert"`。

## 牵出的失败类

- 同机制第 2 次（继 [BUG-399](../../_archived/fixed_bugs/BUG-399-defaults-panel-confirm-clear-leaks-across-sessions.md) 之后又一处「组件本地瞬态未绑 sessionId」）｜处置：类修——为 `StartCard` 增加 `useEffect(() => { setChoosing(false); setChooseError(null) }, [sessionId])` 与卸载守卫（或引入会话代际 ref），并顺带核对其它 dock/tab 组件是否存在同类无复位本地态。

## 修法方向

- 增加 `sessionId` 复位 effect（`choosing` 置 false、`chooseError` 置 null）；
- 用 `sessionRef`/`epochRef` 守卫 `.catch`/`.finally` 的状态写入：只有「发起会话 === 当前会话」才允许写 `chooseError`/`choosing`；卸载时不再 setState。

## 修复判据

- 复现脚本两段断言均为绿：切到 `s2` 后按钮 `disabled === false`、页面上无 `role="alert"` 残留；
- 同会话内的正常流程不受影响（选择失败仍显示错误、结算后按钮恢复可用）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 `[sessionId]` 复位效应与请求代次守卫 → 挂起的选择器永久禁用新会话按钮、旧错误条残留。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/StartCard.tsx",
    "tests/cockpit/client/start-card.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-409 挂起的目录选择器' tests/cockpit/client/start-card.spec.mjs",
    "exit": 1,
    "output": "waitFor 超时：切会话后按钮仍 disabled=true（choosing 未复位）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-409 挂起的目录选择器' tests/cockpit/client/start-card.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/start-card.spec.mjs"
  }
}
```
