---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-321：boot-run 的 mkdir 锁没有 owner/时间戳/stale 回收——SIGKILL 后必须手删

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

run-driver 的 start-lock 有 owner.json/stale 回收；boot-run.sh 只有 `mkdir` + `rmdir` trap。进程被 SIGKILL/崩溃后锁目录永久残留，下一次 boot 只能人工删除。

## 根因（已证）

两套启动锁实现不一致，bash 锁没有 stale 机制。

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
