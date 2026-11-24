---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-422：findings 判 `gap: supported` 但没有任何支撑证据仍 PASS——「结论无证据」可过交付门

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：gap=supported 且零证据指针 = RED；needs_search/insufficient 不受影响（负控）；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`findingsGate` 只校验「写了证据指针但文件不存在」，**不校验「判 supported 却没写指针」**：

| findings.md 的 F 块 | findingsGate |
|---|---|
| `- 支撑证据：evidence/e1.md` + `- gap：supported` | PASS |
| **没有 `- 支撑证据：` 行** + `- gap：supported` | **PASS**（与有证据完全同判）❌ |
| `- 支撑证据：evidence/missing.md` + `- gap：supported` | RED「支撑证据不存在」 |

同一张表里，`lenses` / `lens_gaps` 行整行缺失时 `findingsGate` 也照样 PASS（`lens_gaps` 缺失只在「已有 lens 的 run」上才产生差集比对）。于是「一条 finding 声称已被证据支持，但一个证据都不指」的形态能一路过门到交付——这是把「没证据」与「有证据」判成同一件事。

## 分诊与授权

- 严重级：P1 — 交付门的核心断言（结论必须有支撑证据）存在结构性缺口，fail-open。
- 表面 / 边界：run 门禁（[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) `findingsGate` × [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseFindingsOf` / `findingsContractIssues`）/ ① 代码（判据缺口）。
- DSH 不变量：证据优先——`supported` 的定义就是「有证据」，无指针不得判 supported；「没写」不得等价于「不需要」。
- 触及面：none — checks 解析/判据 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 删掉 `- 支撑证据：…` 行，`findingsGate` 与 `findingsContractIssues` 都不变。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findingsGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
import { findingsContractIssues } from "./checks/lib/gates/findings-core.mjs";
const withEv = "# Findings\n\n## F1：通道可达\n- 支撑证据：evidence/e1.md\n- lenses：official\n- lens_gaps：无\n- gap：supported\n";
const noEv = "# Findings\n\n## F1：通道可达\n- lenses：official\n- lens_gaps：无\n- gap：supported\n";
const run = (text) => { const d = mkdtempSync(join(tmpdir(), "bug422-")); try { mkdirSync(join(d, "evidence"), { recursive: true }); writeFileSync(join(d, "evidence", "e1.md"), "# E\n- claim: x\n", "utf8"); writeFileSync(join(d, "findings.md"), text, "utf8"); return { gate: findingsGate(d), contract: findingsContractIssues(d) }; } finally { rmSync(d, { recursive: true, force: true }); } };
const a = run(withEv);
const b = run(noEv);
console.log("有证据:", a.gate.status, JSON.stringify(a.contract));
console.log("无证据:", b.gate.status, JSON.stringify(b.contract));
assert.notEqual(b.gate.status, a.gate.status);
'
```

实测：`有证据: PASS []` / `无证据: PASS []`（断言红——两者完全同判）。

## 根因（已证）

1. [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseFindingsOf`：`evidence` 初始为 `[]`，只有见到 `- 支撑证据：` 行才填；缺行 = 空数组，不产生任何 issue；
2. `findingsContractIssues` 只比对 `lens_gaps` 与 `topics − evidence` 的差集、以及 `gap` 值域，**不检查 `gap=supported` 时 `evidence.length > 0`**；
3. `findingsGate` 只验证已有指针的文件存在性（`F1 的支撑证据 evidence/x.md 不存在`），空指针集合直接跳过。

## 牵出的失败类

- 同机制第 1 次（「字段缺失」与「字段满足」同判）｜处置：类修——在 `findingsContractIssues` 增判：`gap === 'supported' || gap === 'partially_supported'` 时 `evidence.length > 0`，否则 RED「判 supported 但无支撑证据指针」；同时把「`lenses`/`lens_gaps` 行缺失」在有 lens 的 run 上显式化（当前整行缺失可绕过差集比对）。

## 修法方向

- 见上：判据补「supported ⇒ 至少一个证据指针」；有 lens 的 run 补「`lenses` 行必须在场」；
- 模板（`content/templates/run/findings.md`）与 synthesis skill 已要求这些行，门禁补齐后与模板一致。

## 修复判据

- 复现脚本断言为绿（无证据 → RED，措辞指出「gap=supported 缺支撑证据」）；
- `gap: insufficient` / `needs_search` 无证据仍 PASS（负控：这两种状态本来就可以没有证据）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 findingsContractIssues 的「supported 必须有 ≥1 支撑证据」判据 → 无证据的结论与有证据同判 PASS。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/findings-core.mjs",
    "tests/run/gates/findings-contract.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-422：gap' tests/run/gates/findings-contract.spec.mjs",
    "exit": 1,
    "output": "gap: supported 无证据 expected 'RED' / actual 'PASS'"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-422：gap' tests/run/gates/findings-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/findings-contract.spec.mjs"
  }
}
```
