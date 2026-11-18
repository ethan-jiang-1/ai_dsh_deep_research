---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-290：skill 正文金标准只覆盖随包 15 个 SKILL.md——`.agents/skills` 开发技能无金标准

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：修复就绪（测试/缓存）
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../issues/2026-11-18-low-confidence-20-round2.md)。

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
