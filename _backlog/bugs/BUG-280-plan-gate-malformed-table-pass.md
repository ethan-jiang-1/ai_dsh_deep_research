---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-280：plan.md 存在但节点表畸形/缺席时 planGate PASS 0 节点

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁/合同触面）
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`planGate` 只在 plan.md 缺席时 N/A；表头缺失/畸形时 `planIndex` 返回空索引，`planIssuesOf` 无 issue，剩余工作在场即 PASS（实测 `# Plan\n## 剩余工作\n- 无` → PASS 节点 0）。

## 根因（已证）

plan.md 是执行图正本；畸形表=0 节点不是合法空图。

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
