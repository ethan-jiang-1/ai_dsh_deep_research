---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-319：probe 缓存写是直接 writeFileSync——并发读/写可能读到半文件

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：probe 缓存原子写；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

run-driver 写 PROBE_CACHE 用 writeFileSync 直接覆盖；并发 probe 可能读到截断 JSON，readProbeCache 回退 miss（多一次真验）或读到旧 key。

## 根因（已证）

缓存文件没有临时文件+rename。

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
    "checks/lib/channel/channel-cache.mjs",
    "tools/channel/run-driver.mjs",
    "tests/run/channel/channel-cache.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/channel/channel-cache.spec.mjs",
    "exit": 1,
    "output": "not ok 13 - BUG-319：writeJsonAtomic 不留临时文件"
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
