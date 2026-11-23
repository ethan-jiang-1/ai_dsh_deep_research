---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-399：DefaultsPanel 跨会话切换时未重置 confirmClear 二次确认态

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：破坏性二次确认绑 sessionId 复位；新会话首点只上膛不发 clear；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在研究配置页签顶部的「项目默认」块（`DefaultsPanel`）中，用户在会话 A 点击「清除本项目默认」使按钮进入危险二次确认态（文案变为「再点一次确认」，`confirmClear = true`），但没有完成第二次点击就切换到另一条会话 B：
- `DefaultsPanel` 对话框切换到会话 B 的配置，但底部清除按钮仍然保持「再点一次确认」的已上膛状态；
- 用户在会话 B 中初次点击清除按钮会跳过二次确认，**直接触发 `store.clear(sessionId_B)`** 清空会话 B 的 `research-defaults.json`。

## 分诊与授权

- 严重级：P2 — 危险破坏性操作（清空研究默认）的二次确认状态跨会话泄漏，可能在新工作区/会话单次误点清空。
- 表面 / 边界：pack client（[DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)）/ ② 行为（JSDOM）。
- DSH 不变量：Identity, initial state & disposal — 面板本地瞬态交互状态必须跟随 `sessionId` 切换复位。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — 在 `s1` 点击 `[data-testid="defaults-clear"]` 进入确认态，将 `DefaultsPanel` 的 `sessionId` 重渲染为 `s2`，可见清除按钮文案仍停在 `再点一次确认`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeTranslator } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { createDefaultsStore } from "./packages/deep-research-pack/src/client/defaults/store.ts";
import { DefaultsPanel } from "./packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx";
const { render, fireEvent, cleanup, waitFor } = await loadRtl();
const t = makeTranslator(zh);
const store = createDefaultsStore({
  readText: async (sid) => JSON.stringify({ schema: 1, revision: 1, effort: sid === "s1" ? "quick" : "deep" }),
  readLibrary: async () => ({ kind: "absent", path: "method-library.md" }),
  listDir: async () => [],
  execute: async () => ({ ok: true, value: { result: { kind: "success", text: "ok revision=2" } } }),
});
const { container, rerender } = render(createElement(DefaultsPanel, { sessionId: "s1", store, t }));
await waitFor(() => { if (container.querySelector("[data-testid=defaults-depth]")?.value !== "quick") throw new Error("wait s1"); });
const clearBtn = container.querySelector("[data-testid=defaults-clear]");
fireEvent.click(clearBtn);
rerender(createElement(DefaultsPanel, { sessionId: "s2", store, t }));
await waitFor(() => { if (container.querySelector("[data-testid=defaults-depth]")?.value !== "deep") throw new Error("wait s2"); });
console.log("CLEAR_BTN_ON_S2=", clearBtn.textContent);
assert.equal(clearBtn.textContent, t("defaultsClear"));
cleanup();
'
```

## 根因（已证）

[DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx) 第 87–90 行只有同步 `audience` 的 `useEffect`（且依赖为 `state.value.output?.audience`），`confirmClear` 状态没有绑定 `useEffect(() => { setConfirmClear(false) }, [sessionId])`，导致切换 `sessionId` 时本地布尔开关跨越会话保留。

## 牵出的失败类

- 同机制第 1 次｜处置：点修（绑定 `[sessionId]` 重置 + 补 JSDOM 单测；同类局部确认态可一并核对）。

## 修法方向

- 在 `DefaultsPanel` 增加 `useEffect(() => { setConfirmClear(false) }, [sessionId])`（并在收到其它字段写入或加载中态变化时按需复位确认态）。

## 修复判据

- 复现脚本执行通过：切换 `s1 -> s2` 后清除按钮文案恢复为 `t('defaultsClear')`（`清除本项目默认`），首次点击不会直接调用 `store.clear('s2')`。
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 `useEffect(() => setConfirmClear(false), [sessionId])` → 切会话后清除按钮仍上膛，新会话首点即清空默认。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx",
    "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-399' tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "exit": 1,
    "output": "expected '清除本项目默认' / actual '再点一次确认'"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs"
  }
}
```
