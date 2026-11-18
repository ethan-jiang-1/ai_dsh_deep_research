---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-290：skill 正文金标准只覆盖随包 15 个 SKILL.md——`.agents/skills` 开发技能无金标准

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：skill 金标准含 .agents/skills（26 份）；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`skillBodyManifest` 只遍历 `packages/deep-research-pack/presets/*/skills`；`.agents/skills` 同样是模型可见技能，正文变更不被 skill-golden/快照 B 抓。

## 根因（已证）

金标准名字说“每个 SKILL.md”，实现只到随包。

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
    "output": "not ok 1 - skill 正文…（BUG-258 / BUG-290 / BUG-293）：.agents 哈希漂移红"
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
