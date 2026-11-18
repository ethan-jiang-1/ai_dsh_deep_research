---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-297：probe 缓存键不含 `--bootstrap`——bootstrap 与非 bootstrap 共用旧 GREEN

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：probe 键含 bootstrap；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

`run-driver up --bootstrap` 改变启动序列，但缓存 key 没有 bootstrap 位；同一 pack/runtime 下先跑普通 up 再跑 bootstrap 会命中旧 veredict。

## 根因（已证）

缓存键少一个影响页面状态的关键 flag。

## 复现

复现状态：稳定（读码/临时 fixture/局部脚本）。

```sh
# 证据见本卡症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 为该字段/入口补判据或缓存身份；
2. 加正反控与旧场/迁移豁免；
3. 与同类字段共用单一正本。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/channel/channel-cache.mjs",
    "tools/channel/run-driver.mjs",
    "tests/run/channel/channel-cache.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/channel/channel-cache.spec.mjs",
    "exit": 1,
    "output": "not ok 10 - probeIdentityOf…bootstrap 变化必变（BUG-297）"
  },
  "green": {
    "command": "node --test tests/run/channel/channel-cache.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/channel/channel-cache.spec.mjs"
  }
}
```
