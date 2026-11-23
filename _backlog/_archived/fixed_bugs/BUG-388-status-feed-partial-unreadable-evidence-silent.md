---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-388：useStatusFeed 在部分证据卡有效时静默吞掉其它证据卡读失败

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：BundleFace.evidenceUnreadable 记录缺口数，部分读失败显性提示且计数只含可读卡；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

当 `evidence/` 目录本身可读且包含多张证据卡时，若其中 ≥1 张正常（如 `e1.md`）、另有卡不可读或非法（如 `e2.md` 权限错误/截断），「研究状态」页签只显示 `证据 1 份`，完全不提示部分证据卡读取失败，也没有重试按钮。

## 分诊与授权

- 严重级：P2 — 部分读失败被静默折算为“只有 1 份证据”，掩盖真实读取缺口。
- 表面 / 边界：pack client（[useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)）/ ② 行为（JSDOM）。
- DSH 不变量：fail-loud — 读失败不得因为同一目录下其它文件正常而被静默吞掉。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — `evidence/` 放 `e1.md`（正常）与 `e2.md`（`unreadable`）即可复现。

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { createElement } from "react";
import { loadRtl, makeMaliciousRunSource, makeTranslator, flushUi } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { ResearchStatusTab } from "./packages/deep-research-pack/src/client/ResearchStatusTab.tsx";
import { toolCall } from "./tests/fixtures/events.mjs";
const { render, cleanup, act } = await loadRtl();
const run = makeMaliciousRunSource({
  tree: { drt_demo: { "question.md": "# Q\n\nBody\n", evidence: { "e1.md": "# E1\nbody\n", "e2.md": "# E2\nbody\n" } } },
  fileFaults: { "drt_demo/evidence/e2.md": "unreadable" },
});
const { container } = render(createElement(ResearchStatusTab, {
  sessionId: "s-388", t: makeTranslator(zh),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  openFinal: () => {}, openOwner: () => {}, revealStatusTab: () => {},
  follow: (_t, s) => ({ async *[Symbol.asyncIterator]() {
    yield { kind: "history", events: [toolCall({ name: "write_file", arguments: { path: "drt_demo/question.md" } })] };
    await new Promise(r => s.addEventListener("abort", r, { once: true }));
  }}),
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
assert.match(container.textContent ?? "", /证据读取失败/);
cleanup();
'
```

## 根因（已证）

[useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)（第 262–266 行）：

```ts
const evidenceIssue = evidenceState === 'unreadable'
  ? 'unreadable'
  : evidenceCount === 0 && (evidenceEntries.length > 0 || evidenceFailedLog)
    ? (evidenceUnreadableCount > 0 ? 'unreadable' : ...)
    : null
```

`evidenceUnreadableCount > 0` 被嵌在 `evidenceCount === 0` 分支内，只要至少读到 1 张有效卡，其余卡的 `unreadable`/`invalid` 就被完全吞掉。

## 牵出的失败类

- 同机制第 1 次｜处置：实例修（解除 `evidenceUnreadableCount > 0` 对 `evidenceCount === 0` 的条件耦合，并在故障矩阵增加混合证据卡用例）。

## 修法方向

- 只要 `evidenceState === 'unreadable' || evidenceUnreadableCount > 0`，`evidenceIssue` 即为 `'unreadable'`，状态页给出读取失败提示与重试入口（同时可保留已读到的有效计数说明或标记不完整）。

## 修复判据

- 1 张正常 + 1 张不可读证据卡时，状态页显式提示证据读取失败/不完整并提供重试入口。
- 全部正常卡（含伴随 `_failed.md`）不误报读取失败（负控）。

## 修复落地（2026-11-24）

红证配方：把 `face.evidenceUnreadable > 0` 的 partial 通知分支删掉（回到只在 evidenceCount===0 时报错）→ 部分读失败静默。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/research-status/status-state.ts",
    "packages/deep-research-pack/src/client/research-status/types.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-388 状态' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "部分读失败必须显性提示"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  }
}
```
