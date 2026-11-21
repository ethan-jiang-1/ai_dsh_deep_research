---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-327：probe 缓存读键含 MCP，写键不含——MCP=on 的 GREEN 会被 MCP=off 命中

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（运行态/测试）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状

read key 用 `probeIdentityOf({..., mcp: process.env.MCP_PLAYWRIGHT ?? ""})`；write key 的 `probeIdentityOf` 没传 mcp。MCP=on 写入 no-mcp 键；MCP=off 读取 no-mcp 键 → 命中 MCP=on 的旧 GREEN。

## 根因（已证）

同一缓存读/写键构造了两份，身份不一致。

## 复现

复现状态：未复现 — 读写键在 `tools/channel/run-driver.mjs` 两处内联构造，动态复现需要一次真实 probe 写读；读法协议 = 对照 `:395`（带 `mcp`）与 `:431`（不带）的 `probeIdentityOf` 实参，并用下面的命令证明两个身份的键不同：

```sh
node --input-type=module -e "import { probeIdentityOf } from './checks/lib/channel/channel-cache.mjs'; console.log(probeIdentityOf({ profile: 'p', workspace: 'w', mcp: 'on' }) !== probeIdentityOf({ profile: 'p', workspace: 'w' }))"
```

## 修法

一个身份函数、读写共用：把两处内联 key 收进 `channel-cache.mjs` 的 `probeCacheKeyOf(...)`（含 `mcp`），run-driver 读写都调它；不做旧缓存迁移（miss 可接受）。

## 修复判据

- MCP=on 与 MCP=off 的 key 不同；同一配置下 key(read) === key(write)；
- `tests/run/channel/channel-cache.spec.mjs` 有正反控（对称 + 不串命中）；
- `pnpm verify` / `pnpm test` 绿。
