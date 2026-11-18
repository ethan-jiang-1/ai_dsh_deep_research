---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-288：review 的 topic×lens 覆盖表仍是结构判据，逐格 evidence/结论未核

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：review 覆盖表格内 N 卡与盘上 evidence 数对账；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

前一轮把覆盖表“有表/有格”接进门；fix note 的残余风险明说“逐格卡数/质量、结论是否真被证据支持仍靠 critic”。一个填满 `—` 或假 evidence 的表仍可过。

## 根因（已证）

结构绿 ≠ 覆盖真实。

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
    "checks/lib/gates/review-contract.mjs",
    "tests/run/gates/review-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/review-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 4 - BUG-288：格内声明卡数与盘上 evidence 数不一致 → 红"
  },
  "green": {
    "command": "node --test tests/run/gates/review-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/review-contract.spec.mjs"
  }
}
```
