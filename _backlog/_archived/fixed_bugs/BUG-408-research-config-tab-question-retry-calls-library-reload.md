---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-408：ResearchConfigTab 中 question.md 读取失败/空文件横幅的「重试」按钮错调库文件 reload()，永远不会重读 question.md

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：新增 retryAdoption()，question 读失败/空横幅的重试真正重读该次研究的 question.md；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在「研究配置」页签（`ResearchConfigTab`）的「本次研究」卡片区，当绑定的 run bundle 下的 `question.md` 读取失败（`adoption.kind === 'question-unreadable'`）或为空（`adoption.kind === 'question-empty'`）时：
- 页面提示 `⚠ question.md 读取失败`（或 `question.md 内容为空`）并渲染一个「重试」按钮；
- 用户点击该「重试」按钮后，即使底层文件已恢复可读，卡片依然卡在读取失败/空态，没有任何刷新效果（实际上只在后台重新读了 `method-library.md`）。

## 分诊与授权

- 严重级：P2 — 错误恢复路径按钮空转（在 `COMPACT=true` 默认界面下，重试甚至刷的是用户看不见的方法库读取，对当前出错的 `question.md` 完全无效）。
- 表面 / 边界：cockpit UI（[ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) × [useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)）/ ② UI 交互重连边界。
- DSH 不变量：Recovery action hits actual source — 某数据面的「重试」控件必须真正重新触发该数据面的读取。
- 触及面：none — config tab + hook 两个文件 + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — 首读 `drt_cfg/question.md` 返回 `unreadable`、第二次返回正常 `question.md`；渲染 `ResearchConfigTab` 后点击 `statusQuestionReadFailed` 旁边的「重试」按钮，观察到 `readLibrary` 调用次数从 `1 -> 2`，而 `question.md` 的读取次数保持 `1 -> 1`，错误横幅持续残留。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { installClientDom } from "./tests/cockpit/client-dom-helpers.mjs";
installClientDom();
const React = await import("react");
const { render, fireEvent, cleanup, act, waitFor } = await import("@testing-library/react");
const localeMod = await import("./packages/deep-research-pack/src/client/locales/zh.ts");
const zh = localeMod.default ?? localeMod.zh;
const t = (k, v = {}) => Object.entries(v).reduce((s, [x, y]) => s.replaceAll(`{${x}}`, String(y)), zh[k] ?? k);
const { ResearchConfigTab } = await import("./packages/deep-research-pack/src/client/ResearchConfigTab.tsx");
const { createDefaultsStore } = await import("./packages/deep-research-pack/src/client/defaults/store.ts");
let qReadCount = 0;
let libReadCount = 0;
const store = createDefaultsStore({
  readText: async () => null, listDir: async () => [],
  readLibrary: async () => ({ kind: "absent" }),
  execute: async () => ({ ok: true, value: { result: { kind: "success", text: "ok revision=0" } } }),
});
try {
  const utils = render(React.createElement(ResearchConfigTab, {
    sessionId: "s1", t, defaults: store,
    readText: async () => null, readFile: async () => null,
    readLibrary: async () => { libReadCount += 1; return { kind: "absent" }; },
    runSource: () => ({
      root: "/ws",
      async list(dir) { return dir === "drt_cfg" ? { ok: true, value: [{ name: "question.md", type: "file" }] } : { ok: false, reason: "missing" }; },
      async read(path) {
        if (path === "drt_cfg/question.md") {
          qReadCount += 1;
          return qReadCount === 1 ? { ok: false, reason: "unreadable" } : { ok: true, value: { text: "## 研究方法\n- 采用：方案A\n", lines: 2, eof: true } };
        }
        return { ok: false, reason: "missing" };
      },
      async version() { return { ok: false, reason: "missing" }; },
    }),
    listDir: async () => [],
    async *follow() {
      yield { kind: "history", events: [{ type: "tool/call", data: { name: "write", arguments: JSON.stringify({ path: "drt_cfg/question.md" }) } }] };
    },
    sendInstruction: async () => ({ ok: true, detail: "ok" }),
  }));
  await waitFor(() => { if (!utils.container.textContent?.includes(t("statusQuestionReadFailed"))) throw new Error("wait"); });
  const retryBtn = [...utils.container.querySelectorAll("button")].find((b) => b.textContent === t("retry"));
  await act(async () => { fireEvent.click(retryBtn); await new Promise((r) => setTimeout(r, 60)); });
  console.log("libReadCount=", libReadCount, "qReadCount=", qReadCount);
  assert.equal(qReadCount, 2);
} finally {
  cleanup();
}
'
```

## 根因（已证）

1. [useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts) 第 79–93 行的 `reload(sid)` 只读取 `LIBRARY_PATH`（`method-library.md`）；`adoption` 则住在第 154–180 行的独立 `useEffect([sessionId, boundSlug, runSource])` 中，没有暴露重读触发器（例如 `retryAdoption` 或 `retryNonce`）；
2. [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 第 336 与 342 行（`BUG-372` 补 UI 横幅时）把两个 `question.md` 错误横幅的 `onClick` 直接接到了 `reload(sessionId)` 上，结果点「重试」完全绕开了 `question.md` 读取。

## 牵出的失败类

- 同机制第 1 次（修复 `BUG-372` 暴露问题读取失败态时新增的重试按钮误连向另一个数据源的刷新函数）｜处置：为 `useConfigFeed` 的 `adoption` effect 增加独立的 `retryAdoption`（或 `adoptionRetryNonce`）并将两条按钮改接过去。

## 修法方向

- 在 [useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts) 新增 `retryAdoption`（递增 `adoptionRetry` state 并加入第 154–180 行 `useEffect` 依赖数组，且只在当前 `sessionId` / `boundSlug` 下重读 `openRun` + `question.md`）；
- 在 [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 第 336、342 行的重试按钮改调 `retryAdoption`；
- 补充「首读 `question.md` unreadable，点重试后恢复正常显示 `configThisRunAdopted`」的 RTL 单测。

## 修复判据

- 复现脚本中点击「重试」后 `qReadCount === 2`，错误横幅消失并正确展示已采用方法；
- 新增单测及 `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把两处「重试」改回 `reload(sessionId)`（删 retryAdoption）→ 点重试只重读方法库，question.md 永不重读。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-config/useConfigFeed.ts",
    "packages/deep-research-pack/src/client/ResearchConfigTab.tsx",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-408' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "重试必须重读 question.md，实际读：[]（只触发了库文件 reload）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-408' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  }
}
```
