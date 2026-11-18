---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-287：protocol `gates.critic: light` 与 report 同判，没有轻量审查行为

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：claimPolicyOf：light=claims only，report/none 不要求 claims；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20-round2.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 7 轮）](../settled_issues/2026-11-18-low-confidence-20-round2.md)。

## 症状

protocol-core 允许 `critic: report|claim|both|none|light`；run-accept/verdict-audit 只区分 none/其他，`light` 与 report 同判。用户选 light 不会减少/改变审查。

## 根因（已证）

配置值没有执行映射，属于假承诺。

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
    "checks/lib/gates/protocol-core.mjs",
    "checks/run-gates/run-accept.mjs",
    "tests/run/gates/protocol-core.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 41 - gates.critic light/report/none/claim/both → claim 政策（BUG-287）"
  },
  "green": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
