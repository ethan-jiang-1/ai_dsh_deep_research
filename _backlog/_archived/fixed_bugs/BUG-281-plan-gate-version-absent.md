---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-281：plan.md 不写图版本时 planGate 不报——版本链整段跳过

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：缺图版本 → 红；v>1 快照必须可解析且版本相符；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`planGate` 只在 `index.version !== undefined` 时校验；缺 `图版本：vN` 时直接跳过版本/前版快照检查。nodes-contract 要求图版本；无版本的重写无法追溯。

## 根因（已证）

缺省被当作“无版本”合法，而不是“字段缺失”。

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
    "output": "not ok 5 - BUG-281：缺图版本 → RED"
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
