---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-335：snapshot `--port=abc` 时 Number 得 NaN，不回落 pickFreePort

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：已修（2026-11-21）— 结论：snapshot --port 走同一 parsePort，入口 exit 2；审查：agent — 注入红回归 + 入口负控；去向：none — 机械修复
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../../issues/2026-11-19-low-confidence-40.md)。

## 症状

`PORT_ARG === null ? await pickFreePort() : Number(PORT_ARG)`；`abc`/`0` 得到 NaN/0，没有校验。

## 根因（已证）

显式 port 参数没有正整数/范围校验。

## 复现

复现状态：稳定 — 真入口：

```sh
node checks/smoke/snapshot-replay.entry.mjs --port=abc
# 观察：Number('abc') = NaN，不回落 pickFreePort，失败落在浏览器/HTTP 层
```

## 修法

`--port` 走同一 `parsePort`：非法 → exit 2；缺省 → 仍 `pickFreePort()`。

## 修复判据

- `abc/0/-1/65536` 各一例 exit 2；缺省自动选端口；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/port.mjs",
    "checks/smoke/snapshot-replay.entry.mjs",
    "tests/run/shared/port.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/shared/port.spec.mjs",
    "exit": 1,
    "output": "注入回归：Number(raw) 放行 0/abc；旧入口 --port abc 得 NaN，入口不拒绝，先撞无关 profile 前置 exit 2（失败信息远离入口）"
  },
  "green": {
    "command": "node --test tests/run/shared/port.spec.mjs",
    "exit": 0,
    "output": "端口矩阵 + 入口接线全过；snapshot-replay.entry --port abc → exit 2，--port 端口必须是 1–65535 的整数；缺省仍 pickFreePort"
  },
  "guard": {
    "path": "tests/run/shared/port.spec.mjs"
  }
}
```
