---
status: 待修
severity: P2
opened: 2026-11-19
---

# BUG-326：run-driver up 与 boot-run 直起是两把独立锁——直起可在 up 判空后插队

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../../issues/2026-11-19-low-confidence-40.md)。

## 症状

run-driver 持 `run-driver-up.lock`，boot-run 持 `boot-run.lock`；直接 boot-run 不检查 run-driver 锁，可在我 up 判空后先启动。

## 根因（已证）

启动互斥没有跨入口共享同一把锁/同一 compare-and-set。

## 复现

复现状态：稳定（读码/临时脚本/局部命令）。

```sh
# 证据见症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 为锁/端口/缓存/plan 字段补 owner token、校验或范围；
2. 加正反控与旧场/迁移豁免；
3. 两套入口共用同一实现。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。
