---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-294：snapshot `cases[].renderExpected` 只有 lead；新增角色/方法编辑器的渲染期望没有登记入口约束

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：renderExpected 场景级契约测试与文档边界；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

场景加载要求 cases 与 roleFace 对齐，但 renderExpected 可选；只有 lead 声明。新增角色可无 C，加载期不报“角色面无渲染证据”。

## 根因（已证）

可选字段让覆盖缺口合法化。

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
    "snapshots/README.md",
    "tests/run/harness/replay-scene.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/harness/replay-scene.spec.mjs",
    "exit": 1,
    "output": "not ok 16 - research-face：C 渲染金标准是场景级（BUG-294）"
  },
  "green": {
    "command": "node --test tests/run/harness/replay-scene.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/harness/replay-scene.spec.mjs"
  }
}
```
