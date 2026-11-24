---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-404：ResearchFinalTab 重读时硬编码按 reader 目标重绑 watcher，审计版/工作稿视图重读一次后永久丢失文件更新监测

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：load() 用 viewRef 计算 watcher 基线，审计版/工作稿重读后仍盯当前显示件；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

在「终稿」页签（`ResearchFinalTab`）同时存在读者版（`final/readable.md` 或 `final/readable-vN.md`）与审计版/工作稿（`final.md` 或 `final/vN.md`）时：
1. 用户切到「审计版」（或「当前工作稿」）查看 `final.md`；
2. 当 `final.md` 更新并触发一次重读（点击「重新读取」/「重试」，或切出页签后台触发静默 `load()`）后，当前仍停留在 `audit` 视图（正文也刷新为最新版 `final.md`）；
3. 但此后再修改 `final.md`，页签不再弹出「文件已更新」横幅，也不再自动刷新——watcher 已静默改盯回 `final/readable.md`（若改的是 `readable.md`，反倒会在审计版视图里弹出更新提示）。

## 分诊与授权

- 严重级：P2 — 终稿审计/工作稿视图重读一次后 file watcher 失灵（与 `BUG-371` 同属显示件 watcher 同步机制的残留缺口）。
- 表面 / 边界：cockpit UI（[ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)）/ ② UI 状态与轮询副作用边界。
- DSH 不变量：Observed target matches displayed target — watcher 所盯文件路径与基线版本必须始终与用户当前正在看的 `view` 一致。
- 触及面：none — UI 组件单文件 + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — 先切到「审计版」（`a1`），模拟 `final.md` 更新为 `a2` 后点 `finalReload` 重读，随后再把 `final.md` 更新为 `a3` 并跑一次 watcher 轮询，可观察到 `version()` 被改查 `drt_rft/final/readable.md`，`staleBtn_for_a3` 为 `false`。

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
const { ResearchFinalTab } = await import("./packages/deep-research-pack/src/client/ResearchFinalTab.tsx");
let versions = { "drt_rft/final/readable.md": "r1", "drt_rft/final.md": "a1" };
const versionCalls = [];
let timerCb = null;
const origSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms) => { if (ms === 30_000) timerCb = fn; return origSetInterval(fn, ms); };
try {
  const utils = render(React.createElement(ResearchFinalTab, {
    sessionId: "s1", t,
    useTabInfo: () => ({ tab: { id: "t1", visible: true, navigation: { address: "dsh-resource://file/session/s1/drt_rft/final.md" }, actions: { openTab() {} } } }),
    runSource: () => ({
      root: "/ws",
      async list(dir) {
        if (dir === "drt_rft") return { ok: true, value: [{ name: "final.md", type: "file" }, { name: "final", type: "directory" }] };
        if (dir === "drt_rft/final") return { ok: true, value: [{ name: "readable.md", type: "file" }] };
        return { ok: false, reason: "missing" };
      },
      async read(path) {
        if (path === "drt_rft/final.md") return { ok: true, value: { text: `Audit body ${versions["drt_rft/final.md"]}`, lines: 1, eof: true } };
        if (path === "drt_rft/final/readable.md") return { ok: true, value: { text: `Reader body ${versions["drt_rft/final/readable.md"]}`, lines: 1, eof: true } };
        return { ok: false, reason: "missing" };
      },
      async version(path) { versionCalls.push(path); return { ok: true, value: versions[path] }; },
    }),
  }));
  await waitFor(() => { if (!utils.container.textContent?.includes("Reader body r1")) throw new Error("wait"); });
  const toggleBtn = [...utils.container.querySelectorAll("button")].find((b) => b.textContent?.includes(t("auditToggleLabel", { version: "" }).trim()));
  await act(async () => { fireEvent.click(toggleBtn); await new Promise((r) => setTimeout(r, 40)); });
  versions["drt_rft/final.md"] = "a2";
  await act(async () => { await timerCb?.(); await new Promise((r) => setTimeout(r, 40)); });
  const reloadBtn = [...utils.container.querySelectorAll("button")].find((b) => b.textContent === t("finalReload"));
  versionCalls.length = 0;
  await act(async () => { fireEvent.click(reloadBtn); await new Promise((r) => setTimeout(r, 40)); });
  versions["drt_rft/final.md"] = "a3";
  await act(async () => { await timerCb?.(); await new Promise((r) => setTimeout(r, 40)); });
  const staleBtn = [...utils.container.querySelectorAll("button")].find((b) => b.textContent === t("finalReload"));
  console.log("versionCalls_after_reload=", versionCalls, "staleBtn_for_a3=", Boolean(staleBtn));
  assert.equal(Boolean(staleBtn), true);
} finally {
  globalThis.setInterval = origSetInterval;
  cleanup();
}
'
```

## 根因（已证）

[ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 第 186–190、210–211 行在 `load()` 中写死了 `view: 'reader'` 来计算 `primaryName`、覆写 `targetRef.current` 并写入 `versionRef.current`：
1. 只有首读/地址切换的 `useEffect`（第 233 行）会把 `view` 重置成 `'reader'`；`reloadManually()`（第 280–285 行）与后台静默 `load(controller.signal)`（第 274 行）均保留用户当前的 `view`（如 `'audit'` 或 `'draft'`）；
2. `load()` 完成后 `bodyState` / `readerState` 未发生值变化（同为 `'ok'`），因此监听 `[view, bodyState, readerState, sessionId]` 的第 241–257 行 `useEffect` 不会重新触发；`targetRef.current` 与 `versionRef.current` 就永久停留在错误的 `readable.md` 上。

## 牵出的失败类

- 同机制第 2 次（继 `BUG-371` 之后，同一显示件 watcher 目标同步的第二个状态分支遗漏）｜处置：用 `viewRef` 追踪当前实时 `view`（仅在地址切换效应重置为 `'reader'`），`load()` 计算 `primaryName` 时消费实时 `viewRef.current` 而非硬编码 `'reader'`。

## 修法方向

- 在 [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 维护 `viewRef.current = view`（并在地址切换重读把 `viewRef.current = 'reader'` 与 `setView('reader')` 同步），`load()` 内调用 `watchTargetOf` 时传入 `view: viewRef.current`；同时注意若切视图的同时恰巧在飞 `load()` 返回，应再由实际 `view` 对齐一次或以最新视图为准；
- 在终稿页签测试中补充「切到审计版 → 一次更新+点重新读取 → 第二次更新仍触发 stale 提示」回归用例。

## 修复判据

- 复现脚本中 `versionCalls_after_reload` 查询 `drt_rft/final.md` 且 `staleBtn_for_a3 === true`；
- 新增单测及 `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 `load()` 里传的 `view: viewRef.current` 改回 `'reader'`（watcher 基线硬编码 reader）→ 审计版重读后 stale 不再出现。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-404' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "watcher 基线必须是审计版，实际：drt_rft/final/readable-v1.md"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-404' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  }
}
```
