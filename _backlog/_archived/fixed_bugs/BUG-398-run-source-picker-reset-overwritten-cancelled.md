---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-398：useRunSourcePicker.resetRunPicker 未清空 controller ref，旧读取结算后覆写为 cancelled

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：abort 同时清 ref + 卸载 cleanup + catch 代际守卫；复位后旧读取不得回写；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在 `MethodLibraryView` 中发起「从已完成研究沉淀」读取 run 列表（`loadRunNames`）或读取单个 run 预览（`selectRunSource`）后，若在底层 `listDir` / `readPreview` / `readLibrary` Promise 返回前触发 `reset()`（例如切到另一个会话），`resetRunPicker()` 先将状态复位为 `runState='idle'`、`selectedRunSource=null` 并 abort 请求；但当旧的未决 Promise 随后 resolve 时，状态竟被重新覆写成 `runState='cancelled'` 或 `selectedRunSource={ ..., status: 'sourceCancelled' }`，污染当前空闲态或新会话界面。

## 分诊与授权

- 严重级：P2 — 会话切换或重置来源选择器后仍被已中止的上一轮请求覆写 UI 状态。
- 表面 / 边界：pack client（[useRunSourcePicker.ts](../../../packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts)）/ ② 行为（JSDOM）。
- DSH 不变量：Identity, initial state & disposal — 重置/切换后，已取消代次的在途请求绝不能再写回组件状态。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — `loadRunNames()` 挂起时调用 `reset()`，随后让 `listDir` resolve，可见 `picker.runState` 从 `'idle'` 被改写回 `'cancelled'`（`selectRunSource` + `reset()` 后 resolve 同理覆写 `selectedRunSource`）。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeTranslator } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { useRunSourcePicker } from "./packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts";
const { render, cleanup, act } = await loadRtl();
let picker = null; const resolvers = [];
function Harness() {
  picker = useRunSourcePicker({
    sessionId: "s1", t: makeTranslator(zh),
    listDir: () => new Promise((res) => resolvers.push(res)),
    readPreview: async () => ({ kind: "absent" }),
    readLibrary: async () => ({ kind: "absent", path: "" }),
  });
  return null;
}
render(createElement(Harness));
act(() => { picker.loadRunNames(); });
act(() => { picker.reset(); });
await act(async () => { resolvers[0]([]); resolvers[1]([]); await new Promise((r) => setTimeout(r, 20)); });
console.log("RUN_STATE_AFTER_RESET_AND_RESOLVE=", picker.runState);
assert.equal(picker.runState, "idle");
cleanup();
'
```

## 根因（已证）

[useRunSourcePicker.ts](../../../packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts) 第 38–49 行中：
1. `abortRunRead()` 仅调用 `sourceReadControllerRef.current?.abort()`，并未清空 `sourceReadControllerRef.current`；`resetRunPicker()` 调用 `abortRunRead()` 后同样保留该 `controller` 引用；
2. 异步续体（第 64、94、127 行）以 `if (sourceReadControllerRef.current !== controller) return` 判定代际是否有效——由于 `sourceReadControllerRef.current` 仍指向同一个 `controller`，该守卫放行并执行第 65–68 / 95–105 / 128–131 行的 `'cancelled'` 写回，覆盖掉 `resetRunPicker()` 刚设好的 `'idle'` / `null`；
3. 此外 `.catch` 分支（第 79–81、152–164 行）也缺少 `sourceReadControllerRef.current !== controller` 守卫（还应在卸载时于 `useEffect` cleanup 中 abort 并清空 ref）。

## 牵出的失败类

- 同机制第 1 次｜处置：点修（清空 ref / 增加代际序号 + 卸载 cleanup），并覆盖 `loadRunNames` 与 `selectRunSource` 两处。

## 修法方向

- 在 `resetRunPicker()`（及组件卸载 cleanup）中执行 `sourceReadControllerRef.current?.abort()` 后将 `sourceReadControllerRef.current = null`（或使用递增 `epochRef` 判断当前代际）；
- `.catch()` 块同步守卫 `sourceReadControllerRef.current === controller`。

## 修复判据

- 复现脚本执行通过，`picker.runState` 保持 `'idle'`；对 `selectRunSource()` 触发 `reset()` 后再 resolve/reject，`selectedRunSource` 保持 `null`。
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：`abortRunRead` 只 abort 不清 controller ref（并删 catch 的代际守卫）→ 旧读取结算后把 idle 覆写成 cancelled。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts",
    "tests/cockpit/lib/method-library/run-source-picker.spec.mjs",
    "tests/checks/test-infra/client-surface.test.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-398 reset 后' tests/cockpit/lib/method-library/run-source-picker.spec.mjs",
    "exit": 1,
    "output": "expected 'idle' / actual 'cancelled'"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/lib/method-library/run-source-picker.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/lib/method-library/run-source-picker.spec.mjs"
  }
}
```
