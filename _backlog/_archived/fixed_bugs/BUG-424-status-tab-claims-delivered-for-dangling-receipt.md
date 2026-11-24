---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-424：状态页把「回执声明的版本不存在」当成已交付——receipt 只验 schema 不验盘上在场

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：回执声明版本必须由盘上在场事实核对；不在场 = 不宣布已交付 + statusReceiptDangling 告警；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`delivered.json` 结构完全合法（`version:1` / `slug` 对 / `acceptedAt` 有 / `gate.status: PASS`），但它声明的终稿版本在盘上**不存在**时，状态页照样宣布交付：

| delivered.json | 盘上 | 状态页 |
|---|---|---|
| `final: {version: 1}` + `present.path: drt_alpha/final/v1.md` | `final/v1.md` 在场 | ✅「报告已交付」 |
| `final: {version: 9}` + `present.path: drt_alpha/final/v9.md` | **`final/v9.md` 不存在** | ✅「报告已交付」（同样文案、无任何告警）❌ |

即：回执可以指向一个不存在的交付物，而观察面把它当成「已交付」——与 BUG-356/374 同族（观察面把「声称」读成「事实」），这次漏的是回执与盘上的**版本在场性**对账。

## 分诊与授权

- 严重级：P1 — 观察面伪造交付态（用户据此认为已有终稿可读），且与交付门同输入的裁决相反（门会 RED）。
- 表面 / 边界：cockpit client（[ResearchStatusTab](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) × [useStatusFeed](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) × [final-target.ts](../../../packages/deep-research-pack/src/lib/run/final-target.ts) `decodeDeliveredReceipt`/`deliveryFromReceipt`）/ ② 行为（JSDOM）。
- DSH 不变量：model-visible ⟺ logged 的对偶——UI 陈述的「已交付」必须由盘上在场事实支撑，不得只由声明自证。
- 触及面：none — 观察面 client + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = receipt-and-signature-single-source-424-430。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 同一 bundle，只改回执里的版本号指向不存在文件，状态页仍报「报告已交付」。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import React from "react";
import { installClientDom, flushUi, loadRtl, makeMaliciousRunSource, makeTranslator } from "./tests/cockpit/client-dom-helpers.mjs";
import { zh } from "./packages/deep-research-pack/src/client/locales.ts";
import { ResearchStatusTab } from "./packages/deep-research-pack/src/client/ResearchStatusTab.tsx";
import { toolCall } from "./tests/fixtures/events.mjs";
installClientDom();
const { render, cleanup, act } = await loadRtl();
const t = makeTranslator(zh);
const READINESS = JSON.stringify({ version: 2, readiness: "PASS", conditional: false, counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } });
const tree = (receipt) => ({ drt_alpha: {
  "question.md": "# Topic\n\nbody\n", "leads.md": "# Leads\n\n- lead\n", "findings.md": "# Findings\n\n- f\n",
  evidence: { "e1.md": "# E1\n- claim: x\n" }, "review.md": "# Review\nreadiness: PASS\n", review: { "readiness.json": READINESS },
  "final.md": "# Draft\n\nbody\n", final: { "v1.md": "# Audit v1\n\nbody\n" }, "delivered.json": JSON.stringify(receipt, null, 2) } });
const follow = (_t, s) => ({ async *[Symbol.asyncIterator]() { yield { kind: "history", events: [toolCall({ name: "write_file", arguments: { path: "drt_alpha/question.md" } })] }; await new Promise((r) => s.addEventListener("abort", r, { once: true })); } });
const receipt = (v) => ({ version: 1, slug: "alpha", acceptedAt: "2026-11-24T00:00:00Z", gate: { status: "PASS", exit: 0 }, final: { version: v }, present: { path: `drt_alpha/final/v${v}.md`, version: v, callId: "c1" } });
for (const v of [1, 9]) {
  cleanup();
  const run = makeMaliciousRunSource({ tree: tree(receipt(v)) });
  const { container } = render(React.createElement(ResearchStatusTab, { sessionId: `s-${v}`, t, useSession: () => undefined, useSessions: () => undefined, useSessionStatus: () => undefined, openFinal: () => {}, openOwner: () => {}, revealStatusTab: () => {}, follow, runSource: () => run.source, visible: true }));
  await flushUi(act);
  const text = container.textContent ?? "";
  console.log(`final.version=${v} → 已交付=${/已交付/.test(text)} 告警=${/不合法|读取失败/.test(text)}`);
  if (v === 9) assert.equal(/已交付/.test(text), false, "v9 不存在时不得宣布已交付");
}
cleanup();
'
```

实测：`final.version=1 → 已交付=true 告警=false`；`final.version=9 → 已交付=true 告警=false`（断言红）。

## 根因（已证）

1. `readArtifact(view,'delivered.json',{ decoder: decodeDeliveredReceipt })` 只做**结构**校验（`version===1` / `slug` 形态 / `acceptedAt` 非空 / `gate.status==='PASS'`），不读盘上 `final/` 目录；
2. [final-target.ts](../../../packages/deep-research-pack/src/lib/run/final-target.ts) `deliveryFromReceipt` 用 `present.version` / `final.version` **合成**路径（`drt_<slug>/final/v<N>.md`）并直接返回 `FinalDelivery`，不检查该文件是否存在；
3. 状态页据此把 `receiptDelivery` 当作交付见证 → brief 说「已交付」；同一输入的 `receiptProblems`（门禁侧）会因为 `final/v9.md` 不在场而 RED——两面结论相反。

## 牵出的失败类

- 同机制第 1 次（回执自证 vs 盘上对账；BUG-356 的「声明 ≠ 事实」在回执版本号这一维）｜处置：类修——`deliveryFromReceipt` 增加「版本文件在场」参数（或由调用方在 `useStatusFeed` 里对 `final/vN.md` 做一次 `list`/`read` 对账），不在场 → 交付态降级为「回执与盘上不符」并显性告警。

## 修法方向

- 状态面读回执时，用已读到的 `final/` 目录清单核对 `final.version` / `present.version`：文件不在 → 不宣布已交付，改出「交付回执指向不存在的 final/vN.md」提示 + 重试；
- 与门禁共用同一判据（见 BUG-425），避免两侧各写一套。

## 修复判据

- 复现脚本断言为绿（v9 不存在 → 不出现「已交付」，出现「回执指向不存在版本」类提示）；
- `final.version=1` 在场仍正常宣布已交付（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 `danglingReceipt` 判定（回执 state ok 即 delivery）→ 声明 final/v9 不在场的 run 仍显示「报告已交付」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/final-target.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/research-status/status-state.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-424' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 1,
    "output": "声明版本不在场时不得宣布已交付（实际仍渲染「报告已交付」）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-424' tests/cockpit/client/tabs-fault-matrix.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/tabs-fault-matrix.spec.mjs"
  }
}
```
