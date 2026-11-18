---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-300：plan active 节点缺 owner_role 不报——只校验“有值时合法”

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：plan active 缺 owner_role 红；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

planGate 的 owner 检查是 `if (node.ownerRole !== undefined && !roles.has(...))`；active 节点完全不写 owner_role 时绕过。模板列声明 owner_role，nodes-contract 要求每个节点有 owner。

## 根因（已证）

字段“可选”与“active 必填”混淆。

## 复现

复现状态：稳定（读码/临时 fixture/局部脚本）。

```sh
# 证据见症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 补字段/图/缓存身份/并发/端口判据；
2. 加正反控与旧场/迁移豁免；
3. 与同类字段共用单一正本。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-19）

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
    "output": "not ok 11 - BUG-300 / BUG-301 / BUG-302：active 缺 owner_role/kind/task_id → RED"
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
