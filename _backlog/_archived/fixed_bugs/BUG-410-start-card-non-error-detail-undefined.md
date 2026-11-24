---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-410：StartCard 对非 Error 拒绝值读 `(error as Error).message`，「目录选择失败」详情退化成 undefined

> 严重级别：P2（影响面小：纯观察面文案/详情，不阻断主路径）｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：errorDetailOf 统一失败详情折算（Error/字符串/结构化/原始值），三处消费点收口；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

用户点首屏起步卡的「选择项目目录」后，如果目录选择链路以**非 `Error` 值**拒绝（宿主 RPC 的结构化错误对象、字符串码、`{ code, message }` 以外的形状等），错误条渲染成：

```
目录选择失败：undefined
```

真实失败原因（错误码/描述）完全丢失——用户与后续排查都拿不到任何信息。

## 分诊与授权

- 严重级：P3 — 观察面错误详情丢失，不阻断主路径（用户仍可重试）。
- 表面 / 边界：cockpit UI（[StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)）/ ② UI 边界。
- DSH 不变量：fail-loud 的「可行动」面——失败提示必须携带真实原因，不得把未知类型静默转成字面量 `undefined`。
- 触及面：none — 观察面 client + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — `chooseWorkspace` 以字符串拒绝时，渲染文本固定为 `目录选择失败：undefined`。

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
const { container } = render(React.createElement(StartCard, {
  sessionId: "s1", workspaceTitle: "WS1", workspacePath: "/tmp/ws1",
  listDir: async () => [], hasUserMessage: async () => false,
  chooseWorkspace: () => Promise.reject("EACCES: permission denied"),
  t,
}));
await waitFor(() => { if (!container.querySelector("[data-testid=deep-research-choose-workspace]")) throw new Error("wait"); });
fireEvent.click(container.querySelector("[data-testid=deep-research-choose-workspace]"));
await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
console.log("ALERT=", container.querySelector("[role=alert]")?.textContent);
assert.doesNotMatch(container.querySelector("[role=alert]")?.textContent ?? "", /undefined/);
cleanup();
'
```

实测输出：`ALERT= 目录选择失败：undefined`。

## 根因（已证）

[StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)（约第 96–98 行）：

```ts
void chooseWorkspace()
  .catch((error: unknown) => setChooseError(t('startChooseWorkspaceFailed', { detail: (error as Error).message })))
```

`.catch` 收到的是 `unknown`，但实现直接假设它是 `Error`：字符串拒绝时 `error.message` 为 `undefined`，结构化对象拒绝时同样没有 `message`。模板把 `undefined` 原样插进文案（`interpolate` 对 `undefined` 走 `String(params[name])`，得到字面量 `"undefined"`）。

## 牵出的失败类

- 同机制第 1 次（仓内「按 Error 取 message」的窄化假设）｜处置：点修 + 抽一个 `errorDetailOf(unknown)` 小工具（Error → message；有 `message` 字符串的对象 → message；有 `code` → code；否则 `String(value)`），供 UI 失败路径统一复用。

## 修法方向

- 在 [StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx) 用安全取详情（`error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)` 或抽出的共享工具）替换 `(error as Error).message`；
- 若后续它处也按 `Error.message` 取详情，一并迁到同一工具（避免第二份口径）。

## 修复判据

- 复现脚本断言为绿：字符串 / 结构化对象 / `Error` 三种拒绝都能显示各自的真实详情，永不出现字面量 `undefined`；
- `Error` 拒绝时文案保持不变（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 `errorDetailOf(error)` 换回 `(error as Error).message` → 字符串/结构化对象拒绝值渲染成「失败：undefined」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/shared/error-detail.ts",
    "packages/deep-research-pack/src/lib/faces.json",
    "packages/deep-research-pack/tsconfig.host.json",
    "packages/deep-research-pack/src/client/StartCard.tsx",
    "packages/deep-research-pack/src/client/method-library/useOperationQueue.ts",
    "packages/deep-research-pack/src/fetch-fallback/orchestrate.ts",
    "tests/cockpit/lib/shared/error-detail.spec.mjs",
    "tests/cockpit/client/start-card.spec.mjs",
    "docs/design/40-research-cockpit.md"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-410' tests/cockpit/client/start-card.spec.mjs",
    "exit": 1,
    "output": "拒绝值 \"EACCES: permission denied\" 的详情退化成 undefined"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-410' tests/cockpit/client/start-card.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/start-card.spec.mjs"
  }
}
```
