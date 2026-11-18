---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-293：`.agents/skills` 的开发技能正文没有 sha256 金标准（与 290 同根，载体不同）

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：.agents 技能正文入金标准；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`skillBodyManifest` 只扫 pack presets；`.agents/skills` 是 DSH 约定发现根，技能正文是模型可见指令，改动无金标准；agent 自己改开发技能不会被 skill-golden 红。

## 根因（已证）

开发技能与随包技能分家，但都是模型可见。

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
    "checks/lib/shared/skill-golden.mjs",
    "tools/record/record-skill-golden.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/checks/shared/skill-golden.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shared/skill-golden.test.mjs",
    "exit": 1,
    "output": "not ok 1 - skill 正文…（BUG-290 / BUG-293）：.agents 技能变更红"
  },
  "green": {
    "command": "node --test tests/checks/shared/skill-golden.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shared/skill-golden.test.mjs"
  }
}
```
