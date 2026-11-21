---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-334：`COLD_START_PORT=abc` 时 Number 得 NaN，pickFreePort 不触发

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

cold-start `process.env.COLD_START_PORT ? Number(...) : await pickFreePort()`；非数字 env 得到 NaN，后续 startWeb/端口检查才失败。

## 根因（已证）

env 端口没有正整数校验。

## 复现

复现状态：稳定 — 真入口：

```sh
COLD_START_PORT=abc node checks/smoke/cold-start.entry.mjs
# 观察：Number('abc') = NaN，后续 startWeb/端口检查才失败
```

## 修法

`COLD_START_PORT` 走同一 `parsePort`：非法 → exit 2；未设置 → 仍 `pickFreePort()`；不再把 NaN 传下去。

## 修复判据

- `abc/0/-1/65536` 各一例 exit 2；未设置时仍自动选空闲端口；
- `pnpm verify` / `pnpm test` 绿。
