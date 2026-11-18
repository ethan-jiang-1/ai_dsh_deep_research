---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-282：plan 表的 question/output/acceptance/budget/depth/task_id 列可空/任意，planGate 不报

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：active 节点 question/output/acceptance/budget/depth 必填/值域；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`planGate` 只校验 kind/owner_role/lifecycle；`planIndex` 解析其余列但不校验。一个节点可以没有输出件、验收、预算、深度、task_id，仍 PASS。

## 根因（已证）

模板列是节点 I/O 契约；在场级之外没有非空/闭集检查。

## 复现

复现状态：稳定（读码/临时 fixture/局部脚本）。

```sh
# 证据见本卡症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 为该字段/入口补判据或缓存身份；
2. 加正反控与旧场/迁移豁免；
3. 与同类字段共用单一正本。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/plan-gate.mjs",
    "packages/deep-research-pack/content/templates/run/plan.md",
    "tests/run/gates/plan-gate.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/plan-gate.spec.mjs",
    "exit": 1,
    "output": "not ok 6 - BUG-282：active 节点缺 question/output/acceptance/budget/depth → RED"
  },
  "green": {
    "command": "node --test tests/run/gates/plan-gate.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/plan-gate.spec.mjs"
  }
}
```
