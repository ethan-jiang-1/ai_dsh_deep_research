---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-427：`kickoffSeen` 只认中文字面「研究类型」，结构化 id / 英文 HITL1 的立项窗口把上一场 run 当本场

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：kickoffSeen 与 askKindOf 同源（结构化 id research_type 优先、语言无关）；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`sessionBindingOf().kickoffSeen`（BUG-001/096 的「本会话正在开新 run」信号）决定状态页在**立项窗口**是否抑制上一场 run 的读绑定。它只认 `JSON.stringify(args).includes('研究类型')`：

| HITL1 卡 | `askKindOf`（判型正本） | `kickoffSeen` | 状态页（HITL1 已答、尚未落笔） |
|---|---|---|---|
| 中文 `header: 研究类型` | `hitl1` | **true** | ✅「这场研究还没开始——当前读到的是上一场 run 的上下文」 |
| **结构化 id `research_type` + 英文题面** | `hitl1` | **false** | ❌「研究推进中——审查综合材料已在场…」= **上一场 run 的状态被当成本场** |
| 英文题面 `Research type` | `hitl1` | **false** | ❌ 同上 |

注意第一行之外的两行都是**文档推荐形态**（BUG-146 确立「结构化 id 优先、语言无关」），所以这不只是英文 locale 的问题：只要模型按推荐形态发 id 而不带中文字面，抑制就失效——BUG-001 的原始症状（观察面把别的 run 呈成本场）在英文/结构化 id 面上复发。

## 分诊与授权

- 严重级：P2 — 观察面在立项窗口显示上一场 run 的进度/证据计数（用户误以为本场已在跑、已有材料）；不破坏数据。
- 表面 / 边界：pack lib（[bundle-bind.ts](../../../packages/deep-research-pack/src/lib/run/bundle-bind.ts) `isKickoffCall`）vs pack 判型正本（[hitl-fold.ts](../../../packages/deep-research-pack/src/lib/events/hitl-fold.ts) `askKindOf`）/ ② 行为（JSDOM + 折叠层）。
- DSH 不变量：同一 wire 签名在两个模块必须同判；结构化 id 是语言无关的正本（BUG-146）。
- 触及面：none — pack lib + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = receipt-and-signature-single-source-424-430。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 同一段事件（读旧 bundle → HITL1 已答），只换卡的语言/id 形态，状态页结论相反。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import React from "react";
import { installClientDom, flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { ResearchStatusTab } from "./packages/deep-research-pack/src/client/ResearchStatusTab.tsx";
import { toolCall, toolResult } from "./tests/fixtures/events.mjs";
import { sessionBindingOf } from "./packages/deep-research-pack/src/lib/run/bundle-bind.ts";
installClientDom();
const { render, cleanup, act } = await loadRtl();
const t = makeTranslator(zh);
const READINESS = JSON.stringify({ version: 2, readiness: "PASS", conditional: false, counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } });
const tree = { drt_oldrun: { "question.md": "# 旧\n\nbody\n", "leads.md": "# L\n\n- x\n", "findings.md": "# F\n\n- y\n", evidence: { "e1.md": "# E\n" }, "review.md": "# R\nreadiness: PASS\n", review: { "readiness.json": READINESS } } };
const follow = (events) => (_t, s) => ({ async *[Symbol.asyncIterator]() { yield { kind: "history", events }; await new Promise((r) => s.addEventListener("abort", r, { once: true })); } });
const readOld = toolCall({ name: "read", arguments: { file_path: "drt_oldrun/question.md" } });
const answered = toolResult({ callId: "c-ask", text: JSON.stringify({ answers: [{ id: "q1", selected: ["A"] }] }) });
const mkAsk = (q, header) => toolCall({ callId: "c-ask", name: "ask_user_question", arguments: { questions: [{ id: q, header, question: "pick" }] } });
const cases = [
  ["zh", [readOld, mkAsk("q1", "研究类型"), answered]],
  ["en/id", [readOld, mkAsk("research_type", "Research type"), answered]],
];
for (const [label, events] of cases) {
  const binding = sessionBindingOf(events);
  cleanup();
  const src = makeMaliciousRunSource({ tree: structuredClone(tree) });
  const { container } = render(React.createElement(ResearchStatusTab, { sessionId: `s-${label}`, t, useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined, openFinal: () => {}, openOwner: () => {}, revealStatusTab: () => {}, follow: follow(events), runSource: () => src.source, visible: true }));
  await flushUi(act);
  const text = container.textContent ?? "";
  console.log(label, "kickoffSeen=", binding.kickoffSeen, "立项抑制=", /还没开始|立项对齐中/.test(text), "旧 run 浮现=", /研究推进中/.test(text));
}
cleanup();
assert.equal(sessionBindingOf([readOld, mkAsk("research_type", "Research type"), answered]).kickoffSeen, true);
'
```

实测：`zh kickoffSeen= true 立项抑制= true` / `en/id kickoffSeen= false 立项抑制= false 旧 run 浮现= true`（断言红）。

## 根因（已证）

[bundle-bind.ts](../../../packages/deep-research-pack/src/lib/run/bundle-bind.ts)：

```js
if (name === 'ask_user_question') {
  const obj = argsObjectOf(args)
  return obj !== null && JSON.stringify(obj).includes('研究类型') // i18n-ignore: HITL1 wire signature
}
```

判据是**整串 JSON 的中文字面子串**：既不看 `questions[].id === 'research_type'`（BUG-146 的正本信号），也没有英文 `research type` 兜底——而 [hitl-fold.ts](../../../packages/deep-research-pack/src/lib/events/hitl-fold.ts) `askKindOf` 两条都有。注释里的 `i18n-ignore` 掩盖了这处真实的语言面缺口。

## 牵出的失败类

- 同机制第 2 次（中文子串判据 vs 结构化 id/英文；与 BUG-426 同一根因族）｜处置：类修——`isKickoffCall` 改调 `askKindOf(args) === 'hitl1'`（单点正本），或复制 id 优先 + 英文兜底；同时把两处「HITL 签名」收敛成一个导出函数。

## 修法方向

- `bundle-bind` 复用 `askKindOf`；
- 回归：中/英/id-only 三形态 × pending / 已答未落笔 两窗口，共 6 格同判（zh 的立项抑制文案必须在三形态下都出现）。

## 修复判据

- 复现脚本断言为绿（`research_type` 形态 `kickoffSeen === true`，状态页出现立项抑制）；
- 中文形态与「无 kickoff」对照不变（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 isKickoffCall 改回 `JSON.stringify(...).includes('研究类型')` → 结构化 id/英文题面的立项窗口不抑制上一场 run。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/bundle-bind.ts",
    "tests/run/gates/bundle-bind.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-427' tests/run/gates/bundle-bind.spec.mjs",
    "exit": 1,
    "output": "结构化 id/英文 HITL1 的 kickoffSeen expected true / actual false"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-427' tests/run/gates/bundle-bind.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/bundle-bind.spec.mjs"
  }
}
```
