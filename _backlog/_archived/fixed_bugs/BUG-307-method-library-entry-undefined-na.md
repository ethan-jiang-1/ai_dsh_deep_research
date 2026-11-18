---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-307：声明 library 但没有方法库文件时 checkMethodLibrary 返回 []（N/A）

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：声明 library sha 但缺库红；sha null 才 N/A；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

`checkMethodLibrary` 在 `entry === undefined` 时直接返回 []；声明了 library_fields_sha256/library_name、但候选路径都没有库文件时，不是红而是 N/A。

## 根因（已证）

缺库被当“无对象”，声明可绕过。

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
    "checks/lib/gates/protocol-audit-core.mjs",
    "checks/run-gates/protocol-audit.mjs",
    "tests/run/gates/protocol-core.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 42 - BUG-289 / BUG-307：sha 非 null + 缺库 → 红"
  },
  "green": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
