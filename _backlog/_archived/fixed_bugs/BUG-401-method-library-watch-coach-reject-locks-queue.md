---
status: 已修
severity: P1
opened: 2026-11-23
---

# BUG-401：MethodLibraryView 中 watchCoach reject 时未释放 sending 与排队操作状态，UI 按钮锁死且 30s 后覆写错误回执

> 严重级别：P1 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：watchCoach 失败 = 清排队 ref/超时 + 释放 sending，明确错误不被 30s 队列超时覆写；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在 Method Editor 会话尚未就绪（`coachReady` 仍为 `false`）时，用户在 `MethodLibraryView` 点击「设默认」「删除」「新建」等通过 `enqueueOrRunOperation` 入队的操作，若后台 `watchCoach` 在 `onReady` 触发前 reject（例如 WebSocket follow 失败或断连）：
- 页面状态条显示 `✕ 方法编辑未能完成此操作：Error: ...`；
- 但按钮依然全部处于 `disabled` 状态（`sending` 卡在 `true`，`data-method-new` 等按钮无法点击），且 `queuedOperationRef.current` 与 `queuedOperationTimeoutRef.current` 均未清理，继续阻止后续操作，并在 30 秒队列超时到达后把明确错误回执覆写成 `editorUnavailable`。

## 分诊与授权

- 严重级：P1 — 会话建连失败后整张方法库管理界面交互锁死（与 `BUG-397` 同一队列恢复状态机的另一未清出口）。
- 表面 / 边界：cockpit UI（[MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) × [useOperationQueue.ts](../../../packages/deep-research-pack/src/client/method-library/useOperationQueue.ts)）/ ② UI 状态机。
- DSH 不变量：Fail-loud without wedging — 传输失败必须释放互斥锁与定时器，不能将表面锁死在永久进行态。
- 触及面：none — UI 组件单文件 + 单测。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 令 `watchCoach` 在调用 `onReady` 前 reject，点击「设为默认」入队等待后，错误回执已出现但 `[data-method-new]` 仍保持 `disabled === true`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { installClientDom } from "./tests/cockpit/client-dom-helpers.mjs";
installClientDom();
const React = await import("react");
const { render, fireEvent, cleanup, act, waitFor } = await import("@testing-library/react");
const zh = (await import("./packages/deep-research-pack/src/client/locales/zh.ts")).default;
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replaceAll(`{${x}}`, String(y)), zh[k] ?? k);
const { MethodLibraryView } = await import("./packages/deep-research-pack/src/client/MethodLibraryView.tsx");
const lib = "## Alpha（2026-11-23，用户）\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n";
try {
  const utils = render(React.createElement(MethodLibraryView, {
    sessionId: "s1",
    t,
    readLibrary: async () => ({ kind: "ok", text: lib, path: "method-library.md" }),
    readPreview: async () => ({ kind: "absent" }),
    listDir: async () => [],
    ensureCoach: async () => ({ id: "coach-err", reference: { ready: Promise.resolve(), release: () => {} } }),
    watchCoach: async () => { throw new Error("ws follow failed"); },
    sendCoach: async () => ({ ok: true }),
  }));
  await waitFor(() => { if (!utils.container.textContent?.includes("Alpha")) throw new Error("wait"); });
  fireEvent.click([...utils.container.querySelectorAll("button")].find((b) => b.textContent?.includes("Alpha")));
  await waitFor(() => { if (![...utils.container.querySelectorAll("button")].some((b) => b.textContent === t("setDefault"))) throw new Error("wait btn"); });
  await act(async () => {
    fireEvent.click([...utils.container.querySelectorAll("button")].find((b) => b.textContent === t("setDefault")));
    await new Promise((r) => setTimeout(r, 80));
  });
  const receipt = utils.container.querySelector("[role=status]")?.textContent;
  const disabled = utils.container.querySelector("[data-method-new]")?.disabled;
  console.log("RECEIPT=", receipt, "NEW_BTN_DISABLED=", disabled);
  assert.equal(disabled, false);
} finally {
  cleanup();
}
'
```

## 根因（已证）

[MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) 第 313–315 行的 `watchCoach(...).catch((cause) => { ... })` 只在 `!controller.signal.aborted` 时写入错误 `receipt`，没有清理挂起的操作队列与发送状态：
1. 未调用 `clearTimeout(queuedOperationTimeoutRef.current)` 并置 `null`；
2. 未清空 `queuedOperationRef.current = null`；
3. 未调用 `setSending(false)`（若当时有操作正处于队列等待而挂起了 `sending = true`），从而令整个 `MethodLibraryView` 一直处于 `sending === true` 锁死态。

## 牵出的失败类

- 同机制第 2 次（与 `BUG-397` 同属 `useOperationQueue` / `MethodLibraryView` 排队操作收尾清理遗漏）｜处置：集中清理 helper（如 `clearQueuedOperation`）统一收口 `onReady`、`.catch`、timeout、unmount 与 session 切换四处出口。

## 修法方向

- 从 [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) 与 [useOperationQueue.ts](../../../packages/deep-research-pack/src/client/method-library/useOperationQueue.ts) 抽齐或调用统一的排队失败清理逻辑：当 `watchCoach` reject 且 `!controller.signal.aborted` 时，取消 `queuedOperationTimeoutRef.current`、清空 `queuedOperationRef.current`、重置 `setSending(false)`（若队列中有挂起操作或仅在排队等待态），并设置错误 `receipt`；
- 补充 `watchCoach` 先 reject 后用户仍可点击新建/重试操作的 RTL 单测。

## 修复判据

- 复现场景中 `RECEIPT` 显示错误信息，且 `[data-method-new]` 等按钮 `disabled === false`，30s 内不会被 `editorUnavailable` 覆写，且用户可立即继续操作；
- 新增单测与 `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 watchCoach `.catch` 里的 `clearQueuedOperation()`/`setSending(false)` → 建连失败后按钮锁死，30s 后覆写回执。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/MethodLibraryView.tsx",
    "tests/cockpit/client/method-library/method-library-queue.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-401' tests/cockpit/client/method-library/method-library-queue.spec.mjs",
    "exit": 1,
    "output": "建连失败后必须解锁"
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
