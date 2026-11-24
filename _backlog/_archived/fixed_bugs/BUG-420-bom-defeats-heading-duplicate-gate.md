---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-420：final.md 带 BOM 时 headingGate 少算一条标题，退化输出（同一节重复 ≥4 次）被判 PASS

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：headingGate 逐行走 linesOf；退化输出的阈值不被编码前缀移动；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`headingGate` 的唯一职责是抓「模型失 EOS 反复重发同一节」的退化输出（同一 verbatim 标题 ≥4 次即 RED）。当 `final.md` 以 UTF-8 BOM 开头时：

| 同一节重复次数 | LF | BOM |
|---|---|---|
| 3 | PASS（3 条） | PASS（2 条） |
| **4** | **RED（退化判定）** | **PASS（3 条，未达阈值）** ❌ |
| 5 | RED | RED |

即：**一个字节的前缀把这条交付门的核心判据骗过**，退化交付物带着绿灯进 HITL2。

## 分诊与授权

- 严重级：P1 — 交付门前置判据 false PASS（门存在就是为了拦这一类，BOM 让它失效）。
- 表面 / 边界：run 门禁（[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) `headingGate`）/ ① 代码（行分割 + 首行锚定）。
- DSH 不变量：门禁不得因编码前缀改变裁决（同一文本的等价书写必须同判）；「没看到」不等于「不存在」。
- 触及面：none — checks 解析器 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 四段相同的 `## 决策摘要` 前置 BOM 即由 RED 翻成 PASS。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { headingGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
const gate = (text) => { const d = mkdtempSync(join(tmpdir(), "bug420-")); try { writeFileSync(join(d, "final.md"), text, "utf8"); return headingGate(d); } finally { rmSync(d, { recursive: true, force: true }); } };
const four = Array.from({ length: 4 }, () => "## 决策摘要\n\n正文\n").join("\n");
const lf = gate(four);
const bom = gate(`\uFEFF${four}`);
console.log("LF =", lf.status, "| BOM =", bom.status);
console.log("LF_DETAIL =", lf.detail.slice(0, 60));
console.log("BOM_DETAIL=", bom.detail.slice(0, 60));
assert.equal(bom.status, lf.status);
'
```

实测：`LF = RED | BOM = PASS`（断言红）；detail 从 `同一标题行重复 ≥4 次…"决策摘要" ×4` 退化成 `final.md 标题 3 条，无同一标题 ≥4 次重复`。

## 根因（已证）

[headingGate](../../../checks/lib/gates/node-gate-run-gates.mjs)（第 236 行起）逐行读 `final.md` 并以 `/^##\s/` 类锚点收标题：首行形如 `\uFEFF## 决策摘要`，`^##` 不成立 → 第一段标题**不被计数**，重复计数恒少 1。阈值判据是 `count >= 4`，少 1 恰好把 4 次重复压到 3 次。

同族已确认的 BOM 失效点（另卡在册）：`topics.md` 首条 / `leads.md` 首方向 / `findings.md` 首块 / `evidence/*.md` frontmatter / `method-library.md` 首条（BUG-414）、四处 JSON 工件（BUG-415）。本卡是其中**唯一会翻转 RED→PASS** 的实例。

## 牵出的失败类

- 同机制第 2 次（BOM 未在读取边界统一剥离；BUG-414 同族）｜处置：类修——在 run 工件读取入口剥一次 BOM（`run-context.read` 与 gate 侧文本读取助手），并对 headingGate 补「首行/末行/中间行重复」三位置回归，防止只修首行。

## 修法方向

- 与 BUG-414 合并修：读取边界统一 `stripBom`；
- headingGate 补回归：重复节分别位于首段、中间、末尾时，LF/BOM/CRLF 三形态裁决一致；
- 顺带把同类「计数型」判据（标题数、条目数、卡片数）在 BOM 下各加一条断言——计数少 1 的失败模式最难被肉眼发现。

## 修复判据

- 复现脚本断言为绿（BOM 与 LF 同为 RED，detail 同为「×4」）；
- 重复节在首/中/末三个位置 × 三编码 = 9 种组合裁决一致；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 headingGate 的 `linesOf(text)` 改回 `text.split('\n')` 且不剥 BOM → 首条标题失配、4 次重复判 PASS。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/node-gate-run-gates.mjs",
    "packages/deep-research-pack/src/lib/shared/text-fold.ts",
    "tests/run/gates/text-encoding-equivalence.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-420' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 1,
    "output": "bom: 同一节重复 4 次的退化输出 expected 'RED' / actual 'PASS'（BOM 少计一条标题）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-420' tests/run/gates/text-encoding-equivalence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/text-encoding-equivalence.spec.mjs"
  }
}
```
