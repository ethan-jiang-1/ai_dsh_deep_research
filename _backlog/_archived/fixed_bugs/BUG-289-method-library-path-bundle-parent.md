---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-289：method-library 从 bundle 父目录找 `method-library.md`——自定义工作区/归档位置会假红

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：方法库多候选；缺库 N/A，库在条目缺红；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

protocol-audit 按 bundle 父目录定位方法库；用户工作区布局/归档/子目录 run 时找不到库，声明 library 的 run 被判红，哪怕方法库在会话工作区。

## 根因（已证）

路径假设把“找不到库”当负证据，而不是显式配置/解析。

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
    "checks/lib/gates/protocol-audit-core.mjs",
    "checks/run-gates/protocol-audit.mjs",
    "tests/run/gates/protocol-core.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 42 - BUG-289：方法库缺失（undefined）= N/A；库在但条目缺（null）= 红"
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
