---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-333：`--port=abc` / `--port=0` 未校验，原样传给 boot-run/dsh

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：已修（2026-11-21）— 结论：--port 走唯一 parsePort，入口 exit 2；审查：agent — 注入红回归 + 入口负控；去向：none — 机械修复
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../../issues/2026-11-19-low-confidence-40.md)。

## 症状

run-driver `wantPort = String(arg("--port", DEFAULT_PORT))`；没有正整数/范围校验，`abc`/`0`/负数会进入 boot-run `DSH_RUN_PORT`，失败信息远离入口。

## 根因（已证）

端口参数没有闭集/范围校验。

## 复现

复现状态：稳定 — 真入口复现（先停当前通道，避免 `up` 复用）：

```sh
node tools/channel/run-driver.mjs up --port=abc
# 观察：入口不拒绝，abc 原样进入 boot-run；失败信息远离入口
```

## 修法

入口 fail-loud：新增 `parsePort`（1–65535 整数），`--port=abc|0|-1|1.5|65536` → exit 2 并报参数名，合法值原样传递；与 cold-start/snapshot/client-load 共用同一实现。

## 修复判据

- 5 个畸形值各一例 exit 2，错误信息含 `--port`；合法端口行为不变；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/port.mjs",
    "tools/channel/run-driver.mjs",
    "tests/run/shared/port.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/shared/port.spec.mjs",
    "exit": 1,
    "output": "注入回归：parsePort 退化为 Number(raw) → '必须拒绝 \"0\"' 失败；旧入口 --port abc 把 abc 传进 supervisor（起通道后 DSH_RUN_PORT must be an integer）"
  },
  "green": {
    "command": "node --test tests/run/shared/port.spec.mjs",
    "exit": 0,
    "output": "端口矩阵 + 入口接线全过；node tools/channel/run-driver.mjs up --port abc → exit 2，run-driver: --port 端口必须是 1–65535 的整数（收到 \"abc\"）"
  },
  "guard": {
    "path": "tests/run/shared/port.spec.mjs"
  }
}
```
