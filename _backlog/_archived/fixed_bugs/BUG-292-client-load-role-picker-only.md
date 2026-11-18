---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-292：client-load 只验角色选择器四个 preset 名，不验各角色驾驶舱渲染/状态面

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：rolePickerIssues 纯判据：四角色连续 + Method Editor；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`client-load.entry` 的角色断言是“点开 seat 标签，读四个 preset 名连续相邻”；没有逐角色打开/渲染/状态 marker。角色级 UI 回归可过。

## 根因（已证）

角色选择器在场 ≠ 角色面可渲染。

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
    "checks/lib/harness/role-picker.mjs",
    "checks/smoke/client-load.entry.mjs",
    "tests/checks/harness/role-picker.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/harness/role-picker.test.mjs",
    "exit": 1,
    "output": "not ok 1 - 角色选择器：四研究角色连续 + Method Editor（BUG-292 / BUG-295）"
  },
  "green": {
    "command": "node --test tests/checks/harness/role-picker.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/harness/role-picker.test.mjs"
  }
}
```
