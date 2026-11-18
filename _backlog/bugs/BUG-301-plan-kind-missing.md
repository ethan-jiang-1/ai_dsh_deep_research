---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-301：plan active 节点缺 kind 不报——stage 回落 unknown 也不红

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁/合同触面）
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../issues/2026-11-18-low-confidence-30.md)。

## 症状

同 planGate：kind 只在有值时校验闭集；缺 kind 的 active 节点 stage=unknown，仍 PASS。

## 根因（已证）

缺省被当作合法，而不是缺字段。

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
