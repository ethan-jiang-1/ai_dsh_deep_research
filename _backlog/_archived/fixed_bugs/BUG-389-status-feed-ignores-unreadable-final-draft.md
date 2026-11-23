---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-389：useStatusFeed 读取 final.md 后丢弃 unreadable/invalid 状态，工作稿读失败零告警

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：已修 — 结论：BundleFace.finalBodyIssue 独立成态，statusFinalReadFailed 显性提示；去向：implemented — 批 Note [2026-11-23-observation-read-failure-and-async-closeout](../../../notes/implemented/2026-11-23-observation-read-failure-and-async-closeout.md)；审查：agent — 机械门禁（lint/typecheck/spec/checks/verify）+ 定向回归；修复落地记录见下。

## 症状

`final/` 目录正常或不存在时，若工作稿 `final.md` 在场但不可读（`EACCES`/截断），`useStatusFeed` 通过 `readArtifact(view, 'final.md')` 读到 `state === 'unreadable'` 后仅算出 `finalBody = false`，未纳入 `StatusReads` 或任何告警列表；状态页签既无 `final.md` 读失败告警，也不给出重试按钮。

## 分诊与授权

- 严重级：P2 — 已接入 `readArtifact` 但未消费其失败态，与 `BUG-361…375` 同类工件读失败沉默缺陷。
- 表面 / 边界：pack client（[useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) / [status-state.ts](../../../packages/deep-research-pack/src/client/research-status/status-state.ts)）/ ② 行为（JSDOM）。
- DSH 不变量：fail-loud — 已读工件的 `unreadable`/`invalid` 态不得静默折为 `absent`。
- 触及面：none — 观察面 client + 测试。
- 授权：排查显性化，待分诊推进。
- 批：none。

## 复现

复现状态：稳定 — `drt_demo/final.md` 注入 `unreadable` 即可复现。

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
  tree: { drt_demo: { "question.md": "# Q\n\nBody\n", "final.md": "# Final\n\nBody\n" } },
  fileFaults: { "drt_demo/final.md": "unreadable" },
});
const { container } = render(createElement(ResearchStatusTab, {
  sessionId: "s-389", t: makeTranslator(zh),
  useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined,
  openFinal: () => {}, openOwner: () => {}, revealStatusTab: () => {},
  follow: (_t, s) => ({ async *[Symbol.asyncIterator]() {
    yield { kind: "history", events: [toolCall({ name: "write_file", arguments: { path: "drt_demo/question.md" } })] };
    await new Promise(r => s.addEventListener("abort", r, { once: true }));
  }}),
  runSource: () => run.source, visible: true,
}));
await flushUi(act);
assert.match(container.textContent ?? "", /终稿.*失败|读取失败/);
cleanup();
'
```

## 根因（已证）

[useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)（第 257–283 行）调用 `readArtifact(view, 'final.md')` 得到 `finalArt`，却只用它计算 `finalBody = finalArt.state === 'ok' && ...`；`reads.final` 仅存放 `list('final')` 的 `finalState`，`collectStatusNotices` 也只检查 `reads.final === 'unreadable'`。

## 牵出的失败类

- 同机制第 2 次｜处置：类修（对所有 `readArtifact` 返回的 `ArtifactState` 强制消费或校验穷举，不许读取后丢弃失败态）。

## 修法方向

- 在 `StatusReads` / `BundleFace` 纳入 `finalDraft`（或 `finalIssue`），当 `finalArt.state` 为 `'unreadable'`/`'invalid'` 时输出明确告警与重试按钮，并在 `deriveSteps` 的 `final` 步保持 `unknown` 而非 `absent`。

## 修复判据

- `final.md` 不可读时状态页显示终稿读取失败告警 + 重试，且步骤条 `交付` 标 `?`（`unknown`）。
- 仅 `final.md` 缺席（正常研究早期）不报警（负控）。

## 修复落地（2026-11-24）

红证配方：把 `face.finalBodyIssue === 'unreadable'` 的通知分支删掉（工作稿读失败只折成 finalBody=false）→ 零告警。

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
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-389 状态' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "工作稿读失败必须显性"
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
