---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-058：plan 图成环无任何机械判据——`waveCountOf` 的 null 被静默跳过，`planIssuesOf` 也不认环

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 用户 2026-11-11 指示「所有 bug 都要修复」授权；有环 plan → red `plan-cycle`；`planIssuesOf` 增 `cycle` kind 并在有环时抑制 `wave-prefix`；先红后绿（2026-11-11，去向：implemented — [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)，审查：agent 自审 + 机械门禁）

## 症状

plan 模板的成文合同是「**图必须无环**；审查回边用版本化节点（`repair-r1` / `review-r2`）」，
但一个**有环的 plan** 在交付审计里零 finding：

```
## 有环
  （无 finding）
## 无环（对照）
  （无 finding）
```

即：不可执行的执行图（`W1.1 deps W2.1`、`W2.1 deps W1.1`）与合法图得到完全相同的审计结论。

## 复现

```sh
node --import tsx/esm runtime/explore-20261111/plan-cycle.mjs
```

输出三件：

| 检测点 | 有环输入的结果 |
|---|---|
| `waveCountOf(planIndex)` | `null`（唯一的「检测到了」信号） |
| `planIssuesOf(planIndex)` | 只报 `{"kind":"wave-prefix","nodeId":"W1.1","message":"W1.1 实际在 Wave 3——按 deps 重编号…"}`——**没有 cycle kind**，提示还会把人引向「重编号」（重编号不能解环） |
| `evaluateBundle(...)` | **零 finding**（`checkEffortContract` 的 `waves !== null && waves > waves_max` 把 null 当成「无对象」） |

## 根因（已证）

- [`waveCountOf`](../../../scripts/lib/protocol-core.mjs) 在成环时返回 `null`（注释原文「有环 → null」）；
- [`checkEffortContract`](../../../scripts/lib/protocol-audit-core.mjs) 只在 `waves !== null` 时比较上限——
  null 被解释成「无需检查」，与 [BUG-050](BUG-050-strategy-channel-absent-and-workflow-null-workers.md)
  的「null 同时表示没有对象与无需对账」是同一失败类；
- [`planIssuesOf`](../../../packages/deep-research-pack/src/lib/plan-index.ts) 的 kinds 只有重号 / 悬空 parent /
  悬空 dep / 自依赖 / wave 前缀——**没有环检测**；它的唯一消费方是驾驶舱「研究图谱」只读提示
  （[ResearchGraphTab](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)），不是门禁。

## 影响面

- 交付审计（protocol-audit / run-accept）对「不可执行的执行图」给绿：`- 策略:` 对账、effort 上限、
  投影一致性全部通过；图能不能跑没人机械判；
- 驾驶舱会把「有环」显示成「重编号」提示（误导性诊断）；
- 今天没有已知的有环交付场次，属**潜在**缺口；模型写 deps 时回边、复制节点都可能造环。

## 修复判据

1. 有环 plan → red（新 code 如 `plan-cycle`，或并入 `effort-contract`），文案指明「图有环，不可执行；
   审查回边用版本化节点」；
2. 有环时不再输出误导性的 wave-prefix 提示（`planIssuesOf` 增加 `cycle` kind，或在环上抑制重编号提示）；
3. 无环对照仍绿；悬空 dep / 自依赖的既有提示不回归；
4. 先红后绿：`tests/run/protocol-core.test.mjs`（审计面）与 `tests/cockpit/plan-index.test.mjs`（提示面）
   各加「有环」用例，修复前绿、修复后红；
5. 真实 8 个带 protocol.json 的 bundle 重跑 `protocol-audit` 仍全绿（现实 plan 无环）；
6. `pnpm test` + `pnpm verify` 绿。

## 修复关联

已落地（2026-11-11）：`checkEffortContract` 把 `waveCountOf === null` 判红 `plan-cycle`；`plan-index.ts` 的 `planIssuesOf` 增 `cycle` kind（DFS，只沿 active 节点），有环时跳过 `wave-prefix`。证据 = `tests/run/protocol-core.test.mjs` 与 `tests/cockpit/plan-index.test.mjs` 的 BUG-058 用例先红后绿（41/41）；8 个生产 bundle 审计 parity 不变（现实 plan 无环）。去向 = [Note](../../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)。

原始处置（留档）：修复触及验收合同（`protocol-audit` 是 L4 门）且扩展 `planIssuesOf` 的判据面，按
[_backlog/AGENTS](../../AGENTS.md) 不由本卡自授权；与
[BUG-050](BUG-050-strategy-channel-absent-and-workflow-null-workers.md) 的
「null 哨兵」失败类同源，建议同一原则收口：**检测器的 null 必须显性化，不许被消费方当跳过**。
