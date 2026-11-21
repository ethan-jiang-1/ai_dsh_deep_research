---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-336：client-load `--port=abc` 时 Number 得 NaN，不回落 pickFreePort

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

同 snapshot：`PORT_ARG === null ? await pickFreePort() : Number(PORT_ARG)`；非数字/0 进入 bootWeb。

## 根因（已证）

显式 port 参数没有闭集。

## 复现

复现状态：稳定 — 真入口：

```sh
node checks/smoke/client-load.entry.mjs --port=abc
# 观察：Number('abc') = NaN，不回落 pickFreePort，失败落在 bootWeb/浏览器层
```

## 修法

`--port` 走同一 `parsePort`：非法 → exit 2；缺省 → 仍 `pickFreePort()`。

## 修复判据

- `abc/0/-1/65536` 各一例 exit 2；缺省自动选端口；
- `pnpm verify` / `pnpm test` 绿。
