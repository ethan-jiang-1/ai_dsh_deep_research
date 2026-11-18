---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-322：两个进程同时判定 stale 后互相删除对方的新锁——可同时拿到启动锁

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

`acquireStartLock` stale 分支先 `rmSync(lockDir)` 再 `mkdirSync`；A/B 都读到 stale，A 删除并创建，B 随后删除 A 的新锁并创建。两者都返回 ok。

## 根因（已证）

stale 回收不是 compare-and-delete，没有 owner 校验。

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
