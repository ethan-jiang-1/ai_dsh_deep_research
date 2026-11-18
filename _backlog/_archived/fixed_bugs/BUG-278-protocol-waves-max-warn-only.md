---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-278：protocol 的 `effort.waves_max` 只 WARN——plan 可以无限加 Wave 层，预算不拦

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：waves 超预算红；deviations 显式批准
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`checks/lib/gates/protocol-audit-core.mjs:109–117`（`waves > waves_max` 只 `warn`，
> 注释“不拦交付”）；`protocol-core` 只校验 waves_max 是非负整数/band 参考 warning；
> 模板 = `content/templates/run/protocol.json`。探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

`effort.waves_max` 是研究设计的 Wave 预算；`protocol-audit` 发现超出只 warning：

```js
} else if (waves > protocol.effort.waves_max) {
  out.push(warn('effort-contract', `Wave 层数 ${waves} > waves_max ${protocol.effort.waves_max}（不拦交付）`))
}
```

于是：

- protocol 写 `waves_max: 6`，plan 可以 20 层 Wave，全部 PASS；
- `nodes_max`/`cells_max` 有红/上限，waves_max 没有；
- HITL1 批准的预算对 Wave 不生效。

## 分诊与授权

- 严重级：P2 — 预算三件套里只有两件硬拦；wave 膨胀无后果。
- 表面 / 边界：protocol effort / ② 静态
- DSH 不变量：fail-loud；批准的预算必须约束执行图
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
sed -n '109,118p' checks/lib/gates/protocol-audit-core.mjs
# 临时 protocol waves_max 1 + plan 5 层 → protocol-audit 只 warn；node-gate 不拦
```

## 根因（已证）

`waveCountOf` 只用于 warning；`protocol-audit` 的 effort-contract 对 nodes/cells 用 red，对 waves 用 warn
（历史宽松）。`node-gate` 不读 protocol。

## 牵出的失败类

- 语义 C2（预算字段软处理）+ C7；与 271（threshold）同族。
- 类级方向 = effort 三上限同一力度；超预算 = 红（或 HITL1 显式 deviation）。

## 修法

1. `waves > waves_max` → 红（或要求 protocol.deviations 显式批准）；
2. 与 nodes_max/cells_max 同判据；
3. 测试：waves 超 → 红；预算内 → 绿；
4. 旧场按断代。

## 修复判据

- Wave 超预算 → 红；合法 → 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "checks/run-gates/protocol-audit.mjs",
    "tests/run/gates/protocol-core.spec.mjs",
    "checks/run-gates/run-accept.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "not ok 40 - waves 超预算 → 红（BUG-278）"
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
