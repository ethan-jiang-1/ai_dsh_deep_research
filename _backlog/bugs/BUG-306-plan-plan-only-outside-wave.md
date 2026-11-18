---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-306：非 Wave 节点写 task_id=plan-only 不报

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁/合同触面）
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../issues/2026-11-18-low-confidence-30.md)。

## 症状

planGate 只对出现在 `## Wave 执行` 的层检查 task_id=plan-only；非 Wave 节点写 plan-only（跳过 Team 映射）仍 PASS。

## 根因（已证）

plan-only 的合法域没有闭集。

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
