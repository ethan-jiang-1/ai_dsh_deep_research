---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-318：pack 指纹遍历只收 `isFile()`——pack 源里的 symlink 不进哈希

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：symlink 目标/内容入 pack 指纹；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

collectPackEntries 对 directory 递归、file 收 sha256；symlink 被跳过。pack 源若用 symlink（或未来加），内容变化不失效。

## 根因（已证）

缓存身份漏条目类型。

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
    "output": "not ok 12 - BUG-318：symlink 的目标/内容进入 pack 指纹"
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
