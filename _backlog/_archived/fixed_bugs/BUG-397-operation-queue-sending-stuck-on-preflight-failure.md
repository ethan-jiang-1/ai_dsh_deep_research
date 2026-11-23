---
status: 已修
severity: P1
opened: 2026-11-23
---

# BUG-397：useOperationQueue 排队恢复预检失败或 sendCoach 抛错后永久锁死 sending=true

> 严重级别：P1 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：7 处预检早退与 sendCoach 抛错统一走 failOperation（回执 + 释放 sending/教练句柄）；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在「方法库」页签（`MethodLibraryView`）中，若用户动作（保存 / 设默认 / 清除默认 / 删除）命中以下两条路径之一：
1. 方法编辑会话尚未就绪（`!coachReadyRef.current`）时点击动作，`runOperation` 先排队并置 `setSending(true)`；随后会话就绪通过 `runOperation(queued, true)` 恢复执行，一旦在发送前预检分支提前返回（例如 `sessionId === undefined`、`readLibrary` 返回 `error` 或抛错、库中出现同名重复、未确认覆盖、`expected === null` 或 `methodLibraryEntryHash` 抛错），函数只写错误回执就 `return`，**从未调用 `setSending(false)`**，且排队超时器已被清掉、发送超时器尚未建立；
2. 正常路径第 341 行 `await sendCoach(...)` 若直接 reject/抛错（缺少 `try/catch`），`pendingOperationRef.current` 与 `sending=true` 也会滞留（直到 120s 超时）并产生未捕获 Promise 拒绝。

两条路径的结果都是页面所有操作按钮（`新建方法`、`保存`、`编辑`、`设默认`、`删除`）被永久禁用锁死，直到切换会话或整页刷新。

## 分诊与授权

- 严重级：P1 — 排队预检失败即永久锁死整个方法库工作台写交互，用户无法继续任何编辑或重试。
- 表面 / 边界：pack client（[useOperationQueue.ts](../../../packages/deep-research-pack/src/client/method-library/useOperationQueue.ts)、[MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)）/ ② 行为（JSDOM）。
- DSH 不变量：Fail-loud recovery — 状态机在任何早退/异常分支都必须重置忙态 `sending`，不允许悬挂锁。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 在 `ensureCoach` 挂起期间点击「设为默认」（进入排队态，`sending=true`），`ensureCoach` 就绪并触发排队恢复时让 `readLibrary` 返回 `kind: 'error'`，可见界面显示错误回执 `✕ 请先完整加载方法库，再执行写入。`，但 `[data-method-new]` 仍保持 `disabled=true`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { MethodLibraryView } from "./packages/deep-research-pack/src/client/MethodLibraryView.tsx";
const { render, fireEvent, cleanup, act, waitFor } = await loadRtl();
const t = makeTranslator(zh);
let resolveCoach; let reads = 0;
const lib = "## Alpha（2026-11-23，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n";
const { container } = render(createElement(MethodLibraryView, {
  sessionId: "s1", t,
  readLibrary: async () => (++reads === 1 ? { kind: "ok", text: lib, path: "method-library.md" } : { kind: "error", detail: "read fail", path: "method-library.md" }),
  readPreview: async () => ({ kind: "absent" }), listDir: async () => [],
  ensureCoach: async () => new Promise((res) => { resolveCoach = () => res({ id: "coach-1", reference: { ready: Promise.resolve(), release: () => {} } }); }),
  watchCoach: async (_id, sig, _onEvt, onReady) => { onReady(); await new Promise((r) => sig.addEventListener("abort", r, { once: true })); },
  sendCoach: async () => ({ ok: true }),
}));
await waitFor(() => { if (!container.textContent?.includes("Alpha")) throw new Error("wait"); });
fireEvent.click([...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Alpha")));
await waitFor(() => { if (![...container.querySelectorAll("button")].some((b) => b.textContent === t("setDefault"))) throw new Error("wait btn"); });
fireEvent.click([...container.querySelectorAll("button")].find((b) => b.textContent === t("setDefault")));
await flushUi(act);
await act(async () => { resolveCoach(); await new Promise((r) => setTimeout(r, 80)); });
console.log("RECEIPT=", container.querySelector("[role=status]")?.textContent, "NEW_BTN_DISABLED=", container.querySelector("[data-method-new]")?.disabled);
assert.equal(container.querySelector("[data-method-new]")?.disabled, false);
cleanup();
'
```

## 根因（已证）

1. [useOperationQueue.ts](../../../packages/deep-research-pack/src/client/method-library/useOperationQueue.ts) 第 261 行在入队时调用 `setSending(true)`，并在 [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) 第 308–311 行于 coach 就绪后清理超时器并以 `runOperationRef.current(queued, true)` 恢复；
2. 但 `runOperation` 第 272–318 行的 7 处预检早退分支只假设非排队路径（`sending` 尚为 `false`），全都没有在 `return` 前调用 `setSending(false)`；
3. 同时第 341 行 `await sendCoach(...)` 无异常捕获，抛错时会绕过第 347–351 行的清理代码。

## 牵出的失败类

- 同机制第 1 次｜处置：点修（统一早退清理函数 + 包裹 `sendCoach` 异常路径），并为 `MethodLibraryView` / `useOperationQueue` 补 L0 JSDOM 状态回归。

## 修法方向

- 在 `runOperation` 中抽出局部失败退出助手（设置回执、`setSending(false)` 并在空闲时释放未用草稿占位，仅保留 `resume` 未就绪路径外所有早退一律清理 `sending`）；
- 为 `await sendCoach(...)` 加 `try/catch`，按发送失败/不确定分支清理 `pendingOperationRef`、`operation.timeout` 与 `setSending(false)`。

## 修复判据

- 复现脚本中收到 `✕ 请先完整加载方法库，再执行写入。` 后 `[data-method-new]` 为未禁用（`disabled === false`），`sendCoach` 直接 throw 时也立即恢复可用并展示失败/未知提示且无 unhandledRejection。
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 `failOperation` 里的 `setSending(false)`（早退分支只写回执）与 sendCoach 的 try/catch → 排队恢复预检失败后 sending 永久 true。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/method-library/useOperationQueue.ts",
    "tests/cockpit/client/method-library/method-library-queue.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-397' tests/cockpit/client/method-library/method-library-queue.spec.mjs",
    "exit": 1,
    "output": "sendCoach 抛错后必须解锁"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/client/method-library/method-library-queue.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/method-library/method-library-queue.spec.mjs"
  }
}
```
