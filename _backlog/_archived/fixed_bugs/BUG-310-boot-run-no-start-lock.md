---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-310：两个 boot-run 同时过端口检查后可竞争同一端口/状态根

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：boot-run 启动锁；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

boot-run 先 lsof 检查端口，再启动；两个进程可同时看到空闲并竞争同一 PORT/STATE_DIR。

## 根因（已证）

端口检查与 bind 不是原子。

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
    "checks/lib/channel/start-lock.mjs",
    "tools/channel/run-driver.mjs",
    "tools/channel/boot-run.sh",
    "tests/checks/channel/start-lock.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/channel/start-lock.test.mjs",
    "exit": 1,
    "output": "not ok 1 - 启动锁：互斥、release、stale 回收（BUG-309 / BUG-310）"
  },
  "green": {
    "command": "node --test tests/checks/channel/start-lock.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/channel/start-lock.test.mjs"
  }
}
```
