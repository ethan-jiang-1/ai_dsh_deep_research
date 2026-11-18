---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-304：`## Wave 执行` 声明的 W 层没有节点也 PASS

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：Wave 声明层必须有节点；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

planGate 只要求 `- W<n>:` 条目存在，不要求该 Wave 有节点；也不检查 Wave 里的节点是否 task_id=plan-only（只查“表里 W 号在 waves 中”的反向）。

## 根因（已证）

脚本层声明与节点表没有双向对账。

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
    "output": "not ok 13 - BUG-304/305/306：Wave 层无节点 → RED"
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
