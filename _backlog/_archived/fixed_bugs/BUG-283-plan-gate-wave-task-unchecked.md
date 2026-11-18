---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-283：plan 的 `## Wave 执行` / task_id / plan-only 约定没有门禁

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：Wave 执行表头/task_id 唯一/plan-only 约定进门 P；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`planGate` 不读 `## Wave 执行`；`task_id` 不校验重复/格式；wave 节点 `task_id=plan-only`、不挂 engine/channel 的约定只活在模板注释，`wave-prefix` 仅 detail 提示。

## 根因（已证）

脚本层是执行图的一部分，当前只有渲染/提示。

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
    "output": "not ok 7 - BUG-283：Wave 执行层节点 task_id 必须 plan-only"
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
