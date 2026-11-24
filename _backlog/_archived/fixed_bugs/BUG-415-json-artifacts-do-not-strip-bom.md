---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-415：JSON 工件统一不剥 BOM，readiness / delivered / claims / verdicts 四处误判无效或不可读

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：四处 JSON 工件解析前剥 BOM（RFC 8259 §8.1）；编码差异不再被说成声明非法/回执损坏；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

四个 JSON 工件若带 UTF-8 BOM（Windows 工具常见），`JSON.parse` 直接抛错，于是：

| 工件 | BOM 后表现 | 后果 |
|---|---|---|
| `review/readiness.json` | `parseReadinessDeclaration` → `不是合法 JSON` | 审查结论判「未确认/声明不可读」→ 交付 RED |
| `delivered.json` | 交付门 → `回执不一致：delivered.json 不可解析（JSON）` | 已交付的 run 被判回执损坏 |
| `claims.json` | `parseClaims` → `claims-invalid`「JSON 不可解析」 | 结论核对门整体失效 |
| `verdicts-rN.json` | `parseVerdicts` → `verdicts-invalid`「JSON 不可解析」 | 同上 |

`research-defaults.json` 早已按 BUG-139 容忍 BOM（`parseDefaults` 显式 `replace(/^\uFEFF/,'')`），同一份 JSON 合同只在项目默认一处落地。

## 分诊与授权

- 严重级：P2 — 四处 fail-closed 但**误判原因**（把编码差异说成「声明非法/回执损坏」），导致合规 run 被挡且修正提示指向错误方向。
- 表面 / 边界：run 门禁 JSON 解析（[review-readiness.ts](../../../packages/deep-research-pack/src/lib/review/review-readiness.ts)、[run-receipt.mjs](../../../checks/lib/shared/run-receipt.mjs)、[verdict-audit-core.mjs](../../../checks/lib/gates/verdict-audit-core.mjs)）/ ① 代码（纯解析）。
- DSH 不变量：同一契约文本的等价书写必须同判（RFC 8259 §8.1 允许忽略 BOM）。
- 触及面：none — 解析器 + 单测（`readiness.json` 解析器与门禁共用，改它影响驾驶舱同一函数）。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 四个解析器在内容前加 `\uFEFF` 后全部失败。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { parseReadinessDeclaration } from "./packages/deep-research-pack/src/lib/review/review-readiness.ts";
import { parseClaims, parseVerdicts } from "./checks/lib/gates/verdict-audit-core.mjs";
const bom = (t) => `\uFEFF${t}`;
const READINESS = JSON.stringify({ version: 2, readiness: "PASS", conditional: false, counts: { critical: 0, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 } }, null, 2);
const CLAIMS = JSON.stringify({ version: 2, finalRef: 1, claims: [{ id: "C1", text: "结论", critical: true, topics: ["T1"], evidence: ["evidence/e1.md"], urls: [] }] }, null, 2);
const VERDICTS = JSON.stringify({ version: 1, round: 1, batches: [{ session: "c", preset: "critic", depth: 1, raw: "[]" }], verdicts: [{ claim_id: "C1", batch: 0, verdict: "supported", quote: "q", reason: "r" }] }, null, 2);
for (const [label, fn, text] of [["readiness", parseReadinessDeclaration, READINESS], ["claims", parseClaims, CLAIMS], ["verdicts", parseVerdicts, VERDICTS]]) {
  const lf = fn(text);
  const withBom = fn(bom(text));
  console.log(label, "lf.ok=", JSON.stringify(lf.ok ?? lf.value !== null), "bom.ok=", JSON.stringify(withBom.ok ?? withBom.value !== null), "bomDetail=", JSON.stringify(withBom.detail ?? withBom.problems));
  assert.deepEqual(withBom, lf);
}
'
```

实测：三项均 `bom` 侧失败（`不是合法 JSON` / `claims-invalid` / `verdicts-invalid`），断言红。

## 根因（已证）

四处都把文本**直接**交给 `JSON.parse`（无 BOM 剥离）：

1. [review-readiness.ts](../../../packages/deep-research-pack/src/lib/review/review-readiness.ts) `parseReadinessDeclaration`：`JSON.parse(text)`；
2. `delivered.json` 的解析（交付门 / run-receipt 一侧）同样直接 `JSON.parse`；
3. [verdict-audit-core.mjs](../../../checks/lib/gates/verdict-audit-core.mjs) `parseJson(text, code)`（`parseClaims` / `parseVerdicts` 共用）。

`JSON.parse('\uFEFF{…}')` 在 V8 下抛 `Unexpected token '﻿'`。

## 牵出的失败类

- 同机制第 1 次（JSON 合同只在 `research-defaults` 一处剥 BOM）｜处置：类修——抽 `parseJsonArtifact(text)`（剥 BOM + `JSON.parse` + 统一错误码），四处共用；并补 BOM 契约测试。

## 修法方向

- 在四处（或统一 helper）加 `text.replace(/^\uFEFF/, '')` 后再 `JSON.parse`；
- 错误文案区分「编码/BOM」与「语法错误」，避免再把编码问题报成「回执损坏」；
- 回归：同一份 JSON 的 LF / CRLF / BOM 三形态解析结果逐字段相同。

## 修复判据

- 复现脚本三断言全绿（BOM 与 LF 解析结果逐字段相等）；
- 交付门在 BOM 版 `delivered.json` 下不再报「回执损坏」；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 parseReadinessDeclaration/parseJson/receiptProblems 的 stripBom → BOM 的 JSON 被报成「非法/损坏」。

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/review/review-readiness.ts",
    "checks/lib/gates/verdict-audit-core.mjs",
    "checks/lib/shared/run-receipt.mjs",
    "packages/deep-research-pack/src/lib/shared/text-fold.ts",
    "tests/run/gates/text-encoding-equivalence.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-415' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 1,
    "output": "readiness(BOM) 判「不是合法 JSON」（测试在首个变体 breadown 处红）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-415' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/text-encoding-equivalence.spec.mjs"
  }
}
```
