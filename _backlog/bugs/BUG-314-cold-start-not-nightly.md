---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-314：clean-room cold-start 是 dev-only，nightly 不跑——唯一“仓外 home + tarball”安装证据只在手动

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：修复就绪（测试覆盖）
>
> 证据：`checks/smoke/registry.json` 的 `cold-start.entry.mjs` = `tier: dev-only`，reason
> “独立 home/profile/端口 + tarball；CI 组合不复现，L2 手工档”；nightly 只有 deploy/client-load/
> snapshot 等条目。探索轮 = [低置信区 20 卡（第 8 轮）](../issues/2026-11-18-low-confidence-30.md)。

## 症状

干净室安装（仓外 home + 钉版 dsh + `_dist` tarball + 解析不落仓根）是最容易“本地绿、用户机上坏”的面；
`cold-start.entry` 是唯一完整组合，但注册为 **dev-only**，nightly 不跑。nightly 的 release.entry 用
`--dev-home`/安装形状，不覆盖“仓外 home + tarball + 无仓内 node_modules”这一格。

## 根因（已证）

registry 频率把 cold-start 定为手工档（CI 组合不复现）；`release.entry`/`lifecycle` 各有边界，
三者没有 nightly 矩阵。结果：干净室证据靠人工。

## 修法

1. 在 nightly 增加 cold-start（或至少 release + 仓外 home 的矩阵格），记录失败可诊断；
2. 若成本不可接受，显式写“L2 干净室每周手动”并在 triggers 登记到期重议；
3. 与 240/241 的 profile 解析断言共用。

## 修复判据

- nightly 有一条仓外 home + tarball + 钉版 DSH 的冷启动证据（或显式周期性手动记录）；
- 失败有 URL/日志；`pnpm test` 绿。
