---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-405：plan-gate.mjs 用不存在的 node.budget 属性比对新旧图快照差异，纯调预算的合法计划重写必误判 RED

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：快照事实比对的预算项读 node.cells.budget.value（与字段门同源）；去向：implemented — 批 Note [2026-11-24-gate-cli-parsing-and-session-local-state](../../../notes/implemented/2026-11-24-gate-cli-parsing-and-session-local-state.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

当研究按流程把 `plan.md` 从 `v1` 重写升级为 `v2`（把旧图归档到 `plan/v1.md`）、且本次重写只调整了各节点的 `budget` 预算列（未增删节点、未改 `acceptance` / `lifecycle` / `kind`）时：
- 运行 `node-gate`（门 P / `planGate`）必判为 `RED`，报错 `plan/v1.md 与当前图的节点/验收/预算无差异——快照必须是旧图（BUG-328）`。

## 分诊与授权

- 严重级：P2 — `BUG-328` 守卫自写错误字段路径 `node.budget`，令预算对比维度完全失效并误杀合法计划重写。
- 表面 / 边界：run 门禁核（[plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) × [plan-index.ts](../../../packages/deep-research-pack/src/lib/plan/plan-index.ts)）/ ③ 门禁边界。
- DSH 不变量：Single source of truth / Fail-accurate — 门禁消费 `PlanNode` 结构时不得猜字段名（应与同文件已有 `node.cells.budget.value` 一致）。
- 触及面：none — `plan-gate` 单行 + 单测。
- 授权：修复就绪（P2/P3 修理型，根因/修法/判据齐）——本批直接落地；批 = observation-refresh-404-411。
- 批：observation-refresh-404-411。

## 复现

复现状态：稳定 — 构造 `plan/v1.md`（`W1.1` `budget=1`）与 `plan.md`（`图版本：v2`，`W1.1` `budget=3`），调用 `planGate(tmp)` 返回 `status: "RED"`。

```sh
node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planGate } from "./checks/lib/gates/plan-gate.mjs";
const tmp = mkdtempSync(join(tmpdir(), "bug405-"));
try {
  mkdirSync(join(tmp, "plan"), { recursive: true });
  const makePlan = (v, budget) => [
    `图版本：v${v}`, "", "## 节点表", "",
    "| id | parent | deps | task_id | owner_role | kind | question | output | acceptance | budget | depth | lifecycle |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    `| W1.1 | — | — | T1 | scout | broad-scan | q | o | a | ${budget} | L0 | active |`,
    "", "## 剩余工作", "", "| task_id | state |", "|---|---|", "| W1.1 | 进行中 |", "",
  ].join("\n");
  writeFileSync(join(tmp, "plan", "v1.md"), makePlan(1, 1), "utf8");
  writeFileSync(join(tmp, "plan.md"), makePlan(2, 3), "utf8");
  const res = planGate(tmp);
  console.log("RESULT=", JSON.stringify(res));
  assert.equal(res.status, "PASS");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
'
```

## 根因（已证）

1. [plan-index.ts](../../../packages/deep-research-pack/src/lib/plan/plan-index.ts) 第 49–68、259–273 行返回的 `PlanNode` 对象**没有**顶层 `.budget` 属性，预算只存储在 `node.cells.budget.value` 上；
2. [plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) 在第 62 行正确写了 `const budget = node.cells.budget.value`，但在第 89–92 行的 `factsOf` 里却写成了 `node.budget ?? ''`，导致快照与当前图每一行都把预算投影成 `''`，只改 `budget` 时 `factsOf(snap) === factsOf(index)` 恒为真。

## 牵出的失败类

- 同机制第 1 次（纯逻辑门里手写未进 TS 类型检查的 `.mjs` 属性名拼错导致静默读出 `undefined`）｜处置：改用 `node.cells?.budget?.value ?? ''`（或将 `budget` 纳入 `PlanNode` 正式类型字段）并补单测。

## 修法方向

- 在 [plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) 第 90 行把 `node.budget ?? ''` 改为 `node.cells.budget.value ?? ''`；
- 在 `tests/` 补充「仅改预算字段的 v2 `plan.md` 与 `plan/v1.md` 快照应判 PASS，而预算也相同才判 RED」的对照回归测试。

## 修复判据

- 复现脚本中 `planGate(tmp).status === "PASS"`，而当两版预算也相同时仍维持 `RED`（`BUG-328` 反证不退化）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 factsOf 的预算项改回 `node.budget`（PlanNode 上不存在，预算维度恒空）→ 只调 budget 的合法重写被误判「无差异」。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/plan-gate.mjs",
    "tests/run/gates/plan-gate.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-405' tests/run/gates/plan-gate.spec.mjs",
    "exit": 1,
    "output": "只调预算的旧图必须被承认是旧图（同事实判定把 budget 变化漏掉）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-405' tests/run/gates/plan-gate.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/plan-gate.spec.mjs"
  }
}
```
