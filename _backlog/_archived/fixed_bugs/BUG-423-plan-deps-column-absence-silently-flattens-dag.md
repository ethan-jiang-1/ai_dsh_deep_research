---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-423：plan 表缺 `deps` 列时依赖图静默扁平化——planGate 仍 PASS 且零诊断

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：plan 缺 deps/parent 列 = RED（缺列 ≠ 全空；门不得自称验证过依赖图）；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`plan.md` 节点表若**少一列 `deps`**（模板漂移/编辑器导出/模型漏列），所有节点都变成「无依赖」：

| 节点表 | W1.2 的 deps | planGate |
|---|---|---|
| 12 列（含 `deps`，W1.2 ← W1.1） | `['W1.1']` | PASS「节点 2；图无环/无悬空」 |
| 11 列（去掉 `deps`，其余原样） | **`[]`** | **PASS**「节点 2；图无环/无悬空」❌ |

且 `planIndex.table.diagnostics` 为 `[]`——**连 `row-arity` 都不报**（行元数与表头一致，表头少一列不算错）。后果：DAG 小图把串行节点画成并行、`wavesOf` 分层变成一层、`planDiff` 的「依赖变化」永不触发、`planGate` 却给出「图无环/无悬空」的绿色结论——门禁在说一件它没验证过的事。

同族的 `parent` / `lifecycle` 两列也不在 `plan-gate` 的必填列集合里（读码确认：它显式要求 `acceptance`/`budget`/`depth`/`task_id`/`ownerRole`/`output`/`kind`/`question` 八列，唯独这四列无判据）；`lifecycle` 缺省 = `active` 属合理默认，但 `deps`/`parent` 缺省成「无依赖/顶层」是把**未知**写成**已知**。

## 分诊与授权

- 严重级：P2 — 门禁给出未经验证的结构结论（假绿），并让下游观察面（图谱/版本轨）系统性失真；不直接破坏数据。
- 表面 / 边界：run 门禁（[plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) × [plan-index.ts](../../../packages/deep-research-pack/src/lib/plan/plan-index.ts)）/ ① 代码（表头必填集合 + 列缺失诊断）。
- DSH 不变量：fail-loud——「没这一列」不得等价于「这一列全空」；门禁的自述结论必须与它实际验证的内容一致。
- 触及面：none — checks 判据 + pack 解析 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 两节点串行表，去掉 `deps` 列后 `planGate` 仍 PASS、`deps` 全空、诊断为空。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planGate } from "./checks/lib/gates/plan-gate.mjs";
import { planIndex } from "./packages/deep-research-pack/src/lib/plan/plan-index.ts";
const HEAD = "| id | parent | lifecycle | kind | question | ownerRole | deps | output | acceptance | budget | depth | task_id |";
const SEP = "|---|---|---|---|---|---|---|---|---|---|---|---|";
const R1 = "| W1.1 | — | active | broad-scan | q | scout | — | leads | a | 2 | L1 | T1 |";
const R2 = "| W1.2 | — | active | deep-dive | q | scout | W1.1 | findings | a | 2 | L1 | T2 |";
const build = (head, r1, r2) => ["图版本：v1", "- protocol: v1", "- 策略: broad-first；通道 = team", "", head, SEP, r1, r2, "", "## 剩余工作", "", "| task_id | state |", "|---|---|", "| W1.1 | 完成 |", "| W1.2 | 完成 |", ""].join("\n");
const withDeps = build(HEAD, R1, R2);
const noDeps = build(HEAD.replace("| deps ", " "), R1.replace("| — | leads", "| leads"), R2.replace("| W1.1 | findings", "| findings"));
const gate = (text) => { const d = mkdtempSync(join(tmpdir(), "bug423-")); try { writeFileSync(join(d, "plan.md"), text, "utf8"); return { gate: planGate(d), idx: planIndex(text) }; } finally { rmSync(d, { recursive: true, force: true }); } };
const a = gate(withDeps); const b = gate(noDeps);
console.log("有 deps 列:", a.gate.status, JSON.stringify(a.idx.nodes.map((n) => [n.id, n.deps])));
console.log("无 deps 列:", b.gate.status, JSON.stringify(b.idx.nodes.map((n) => [n.id, n.deps])), "diag:", JSON.stringify(b.idx.table.diagnostics));
assert.deepEqual(b.idx.nodes.map((n) => n.deps), a.idx.nodes.map((n) => n.deps));
'
```

实测：`有 deps 列: PASS [["W1.1",[]],["W1.2",["W1.1"]]]` / `无 deps 列: PASS [["W1.1",[]],["W1.2",[]]] diag: []`（断言红）。

## 根因（已证）

1. [plan-index.ts](../../../packages/deep-research-pack/src/lib/plan/plan-index.ts) `tableOf`：`columns` 只登记**表头里出现过的**列，未出现的列一律取缺省（`deps` → `[]`、`parent` → `undefined`、`lifecycle` → `active`），不留诊断；
2. `row-arity` 只在「数据行单元格数 ≠ 表头单元格数」时触发——表头整体少一列不触发；
3. [plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) 的必填列校验是一份手写白名单（八列），`deps`/`parent`/`lifecycle` 不在其中，且 `detail` 恒称「图无环/无悬空」——这句话在没有 deps 列时无对象可指。

## 牵出的失败类

- 同机制第 1 次（「列/字段缺失」被当成「空值」而非「形态不全」；BUG-421/422 同族）｜处置：类修——`plan-gate` 的必填列集合改为「表头必须含 `id` + 契约要求的全部列（含 `deps`/`parent`/`lifecycle`）」，并在 `tableOf` 对缺列产出一条显式 diagnostic（`column-missing`），让 `detail` 能说清「deps 列不在场 → 无边可判」。

## 修法方向

- `tableOf`：缺列 → `diagnostics.push({ code: 'column-missing', ... })`；
- `planGate`：缺 `deps` 列且节点数 > 1 → RED「节点表缺 deps 列——依赖边无法判定，不得声称图无环」；缺 `parent` 列且存在 `W*.*.*` 形态的 id → 同样 RED；
- `detail` 文案与判据同源：没判定依赖就别说「无悬空」。

## 修复判据

- 复现脚本断言为绿（缺 deps 列 → RED，措辞点名「缺 deps 列」）；
- 12 列完整表仍 PASS（负控），`lifecycle` 缺省仍按 `active` 处理（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：从 planGate 的缺列判据里删掉 deps/parent → 缺列被当成「全空」，依赖图静默扁平化仍 PASS。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/plan-gate.mjs",
    "tests/run/gates/plan-gate.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-423' tests/run/gates/plan-gate.spec.mjs",
    "exit": 1,
    "output": "缺 deps 列仍 PASS（detail = 节点 1；图无环/无悬空/无重号——门在说没验证过的话）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-423' tests/run/gates/plan-gate.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/plan-gate.spec.mjs"
  }
}
```
