---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-311：review 覆盖表的“N 卡”只按 evidence 文件计数，不核卡的质量/结论

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：覆盖表 A/B 分档与 evidence quality 对账；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

288 的修复按 `topic × lens` 的 evidence 文件数对账；同一文件多 lens/多结论、低质卡仍计 1。

## 根因（已证）

结构计数 ≠ 覆盖质量。

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
    "checks/lib/gates/review-contract.mjs",
    "tests/run/gates/review-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/review-contract.spec.mjs",
    "exit": 1,
    "output": "not ok 5 - BUG-311：格内 A/B 分档与盘上 quality 不符 → 红"
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
