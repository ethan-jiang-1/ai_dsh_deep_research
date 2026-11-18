---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-315：cold-start 固定 3129，两个实例/并发测试会互相抢占

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：cold-start 动态端口；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

cold-start 用 `COLD_START_PORT ?? 3129`；并行跑两次或端口被占时会 fail/抢占，不是每实例自持有。

## 根因（已证）

冒烟端口没有按实例分配。

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

## 修复落地（2026-11-19）

```json fix-evidence
{
  "changes": [
    "checks/lib/harness/port-reclaim.mjs",
    "checks/smoke/cold-start.entry.mjs",
    "checks/smoke/snapshot-replay.entry.mjs",
    "checks/smoke/client-load.entry.mjs",
    "tests/run/harness/port-reclaim.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/harness/port-reclaim.spec.mjs",
    "exit": 1,
    "output": "not ok 2 - 入口端口缺省 = pickFreePort（BUG-315 / BUG-316 / BUG-317）"
  },
  "green": {
    "command": "node --test tests/run/harness/port-reclaim.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/harness/port-reclaim.spec.mjs"
  }
}
```
