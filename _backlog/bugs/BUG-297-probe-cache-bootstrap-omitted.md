---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-297：probe 缓存键不含 `--bootstrap`——bootstrap 与非 bootstrap 共用旧 GREEN

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：修复就绪（测试/缓存）
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`run-driver up --bootstrap` 改变启动序列，但缓存 key 没有 bootstrap 位；同一 pack/runtime 下先跑普通 up 再跑 bootstrap 会命中旧 veredict。

## 根因（已证）

缓存键少一个影响页面状态的关键 flag。

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
