---
status: 已修
severity: P1
opened: 2026-11-23
---

# BUG-392：useConfigFeed.send() 20×3s 对账轮询跨会话改写 epoch、中止新会话 reload 并串染库列表

> 严重级别：P1 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：send 的后台对账绑定发起会话 + AbortController；切会话立即退出，不触碰新会话 epoch；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

在会话 A 中通过 `useConfigFeed.send(..., { expectsChange: true })` 触发方法库变更指令后，在 `20 × 3s` 落盘对账轮询窗口内切换到会话 B：
- 会话 A 的定时轮询 3 秒后仍会执行 `reload('s-A')`；
- `reload('s-A')` 会把共享 `epochRef.current.current` 改回 `'s-A'`，并调用 `reloadControllerRef.current?.abort()` **中止会话 B 正在进行的 `reload('s-B')`**；
- 最终会话 B 页面卡在旧会话 A 的方法库条目（`["方法A"]`），且 `finally { setSending(false) }` 无会话守卫也会冲掉新会话状态。

## 分诊与授权

- 严重级：P1 — 跨会话状态串染且破坏新会话初始加载（`BUG-086` 仅修 `reload` 自身竞态，未覆盖 `send()` 后台轮询）。
- 表面 / 边界：pack client（[useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)）/ ② 行为（JSDOM）。
- DSH 不变量：Identity, initial state & disposal — 异步轮询必须绑定发起时的会话代际并在切换时立即中止。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — `s-A` 调用 `send(..., { expectsChange: true })` 后立即切换到慢响应的 `s-B`，等待 3.2s 即可观察到 `s-B` 的 `signal.aborted === true` 且界面仍显示 `方法A`。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { useConfigFeed } from "./packages/deep-research-pack/src/client/research-config/useConfigFeed.ts";
import { toolCall } from "./tests/fixtures/events.mjs";
const { render, cleanup, act } = await loadRtl();
let feed = null; let resolveB;
const run = makeMaliciousRunSource({ tree: { drt_demo: { "question.md": "# Q\n\nBody\n" } } });
const snap = { phase: "ready", value: {}, problems: [], warnings: [], methodDefault: null, methodConflict: false, methodRead: "absent", revision: 0, pending: false, outcome: null };
const defaults = { subscribe: () => () => {}, getSnapshot: () => snap, refresh: async () => {}, setPatch: async () => {}, unset: async () => {}, clear: async () => {}, dispose: () => {} };
function Harness(p) { feed = useConfigFeed(p); return createElement("div", null, JSON.stringify(feed.entries?.map(e => e.name) ?? null)); }
const base = {
  t: makeTranslator(zh), readFile: async () => null, runSource: () => run.source, listDir: async () => [], defaults,
  follow: (_t, s) => ({ async *[Symbol.asyncIterator]() { yield { kind: "history", events: [toolCall({ name: "write_file", arguments: { path: "drt_demo/question.md" } })] }; await new Promise(r => s.addEventListener("abort", r, { once: true })); } }),
  sendInstruction: async () => ({ ok: true, detail: "ok" }),
  readLibrary: async (sid) => sid === "s-B"
    ? (await new Promise(r => { resolveB = r; }), { kind: "ok", text: "## 方法B\n- 找来源: x\n- 怎么核实: y\n- 报告怎么写: z\n- 不承诺: w\n" })
    : { kind: "ok", text: "## 方法A\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n" },
};
const { container, rerender } = render(createElement(Harness, { ...base, sessionId: "s-A" }));
await flushUi(act);
void feed.send("create", { target: "新建", expectsChange: true });
await act(async () => { await new Promise(r => setTimeout(r, 20)); });
rerender(createElement(Harness, { ...base, sessionId: "s-B" }));
await act(async () => { await new Promise(r => setTimeout(r, 3200)); });
resolveB?.(); await flushUi(act);
assert.match(container.textContent ?? "", /方法B/);
cleanup();
'
```

## 根因（已证）

[useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)（第 187–216 行）：
1. `send()` 轮询只检查 `aliveRef.current`（仅组件卸载时置 `false`），没有记录/校验 `sessionId` 代际或可取消 `AbortController`；
2. 轮询内直接调用 `reload(sid)`，在 `reload()` 第 78–80 行无条件自增 `epochRef.current.seq`、改写 `epochRef.current.current = sid` 并中止全局共享的 `reloadControllerRef.current`；
3. 第 202 行 `setTimeout(..., 2500)` 未在切会话/卸载时清理，第 212/215 行 `setReceiptDiff`/`setSending(false)` 也缺少会话守卫。

## 牵出的失败类

- 同机制第 2 次｜处置：类修（`BUG-086` 续案：把 `send()` 轮询纳入会话代际与 `AbortController` 生命周期管理，或抽进纯状态机）。

## 修法方向

- 为 `send()` 绑定会话代际 + `AbortController`（切会话/卸载立即 abort 定时 sleep 与轮询），`reload()` 与 `send()` 状态写入均守卫 `epoch` 归属（不允许旧会话 `reload(oldSid)` 中止新会话请求或篡改 `epochRef.current.current`）。

## 修复判据

- 在 `s-A` 发起 `send()` 轮询后切到 `s-B`，`s-A` 轮询立即退出，不得中止 `s-B` 的 `reload`，`s-B` 正常展示 `["方法B"]` 且不串染回执或 `sending` 态。
- 同会话内不切会话时 `send()` 对账轮询与回执照常（负控）。

## 修复落地（2026-11-24）

红证配方：把 `stillMine()` 的会话守卫删回 `aliveRef.current`（不绑会话代际/不中止）→ 切会话后旧轮询串染新会话库列表。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-config/useConfigFeed.ts",
    "tests/cockpit/client/research-config/config-feed-poll.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-392 切会话' tests/cockpit/client/research-config/config-feed-poll.spec.mjs",
    "exit": 1,
    "output": "新会话不得被旧会话的轮询串染"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/client/research-config/config-feed-poll.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-config/config-feed-poll.spec.mjs"
  }
}
```
