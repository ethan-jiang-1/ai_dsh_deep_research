---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-334：`COLD_START_PORT=abc` 时 Number 得 NaN，pickFreePort 不触发

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：已修（2026-11-21）— 结论：COLD_START_PORT 走同一 parsePort，入口 exit 2；审查：agent — 注入红回归 + 入口负控；去向：none — 机械修复
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../../issues/2026-11-19-low-confidence-40.md)。

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

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/port.mjs",
    "checks/smoke/cold-start.entry.mjs",
    "tests/run/shared/port.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/shared/port.spec.mjs",
    "exit": 1,
    "output": "注入回归：parsePort 退化为 Number(raw) → 端口矩阵红；旧入口 COLD_START_PORT=abc 得 NaN，不拒绝，最终以堆栈 exit 1 失败"
  },
  "green": {
    "command": "node --test tests/run/shared/port.spec.mjs",
    "exit": 0,
    "output": "端口矩阵 + 入口接线全过；COLD_START_PORT=abc → exit 2，cold-start.entry: COLD_START_PORT 端口必须是 1–65535 的整数（收到 \"abc\"）；未设置仍 pickFreePort"
  },
  "guard": {
    "path": "tests/run/shared/port.spec.mjs"
  }
}
```
