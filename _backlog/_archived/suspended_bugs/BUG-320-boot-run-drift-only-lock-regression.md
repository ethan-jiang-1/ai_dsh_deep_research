---
status: 待修
severity: P2
opened: 2026-11-19
---

# BUG-320：`boot-run --drift-only` 先抢 boot 锁——活通道持锁时漂移检查永远失败

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../../issues/2026-11-19-low-confidence-40.md)。

## 症状

boot-run 在 `--drift-only` 分支之前就 `mkdir $BOOT_LOCK`；boot 进程在 web 存活期间一直持锁。`run-driver up` 复用活通道时调 `boot-run --drift-only`，必然 EEXIST → 漂移检查失败。

## 根因（已证）

锁的范围盖住了只读模式，启动锁与漂移检查互斥。

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
