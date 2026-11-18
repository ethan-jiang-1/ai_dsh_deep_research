---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-308：probe 缓存键不含 MCP_PLAYWRIGHT——开关 MCP 仍命中旧 GREEN

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁/合同触面）
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../issues/2026-11-18-low-confidence-30.md)。

## 症状

probeIdentityOf 只含 profile/bootstrap/workspace；MCP_PLAYWRIGHT 改变 MCP 预置/页面工具面，但 key 不含。

## 根因（已证）

环境开关不在缓存身份。

## 复现

复现状态：稳定（读码/临时 fixture/局部脚本）。

```sh
# 证据见症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 补字段/图/缓存身份/并发/端口判据；
2. 加正反控与旧场/迁移豁免；
3. 与同类字段共用单一正本。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。
