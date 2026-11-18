---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-267：plan 的图结构问题只有驾驶舱提示——环/悬空 dep/重号不阻断任何交付门

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）
>
> 结论：plan 硬结构进独立 plan-gate
> 去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-20.md)
> 审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 位置：`packages/deep-research-pack/src/lib/plan/plan-index.ts` 的 `planIssuesOf`（注释明说“只读稳定性提示，
> 不是 node-gate”）；唯一消费 = `src/client/ResearchGraphTab.tsx:130`（UI 提示）+ 测试。
> 探索轮 = [20 卡低置信区](../settled_issues/2026-11-18-low-confidence-20.md)。

## 症状

`planIssuesOf` 能发现重号 / 悬空 parent / 悬空 dep / 自依赖 / 环 / wave 前缀等，但：

- 只有驾驶舱 `ResearchGraphTab` 调它，显示提示；
- `node-gate`/`run-accept`/`schema-scan` 都不调用；
- 一个带环、悬空 dep、重复 id 的 `plan.md` 仍可交付/通过 run 门（plan 不属交付件，但它是执行图正本）。

实测：

```text
| id | deps |
| W1.1 | W2.1 |
| W2.1 | W1.1 |
→ planIssuesOf 报 cycle；node-gate/run-accept 不报
```

## 分诊与授权

- 严重级：P2 — 执行图正本的硬结构错误只显示不阻断；Team 重建/驾驶舱可能按坏图执行。
- 表面 / 边界：plan 图 / ② 静态
- DSH 不变量：fail-loud；图的正本错误不能只在 UI 提示
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -n 'planIssuesOf' packages/deep-research-pack/src/lib/plan/plan-index.ts src/client/ResearchGraphTab.tsx checks/lib/gates checks/run-gates
# 只有 UI + 测试；无门
```

## 根因（已证）

`planIssuesOf` 被设计成“稳定性提示”，因为 plan 不是交付件；但没有第二层 gate 消费它。
`node-gate` 只看 leads/findings/version/delivery/reader；`schema-scan` 只查文件在场。

## 牵出的失败类

- 语义 C7（只读提示冒充检查）/ C2；与 268（plan 字段）同族。
- 类级方向 = plan 结构错误分两级：硬错误（环/悬空/重号）进 gate；软提示留 UI。

## 修法

1. 在 `node-gate` 或新的 `plan-gate` 消费 `planIssuesOf`，对 cycle/duplicate/dangling/self-dep 判红；
   wave-prefix/legacy 等可按迁移提示；
2. 与 `schema-scan` 的 plan 在场检查衔接；旧场按断代；
3. 测试：环/悬空/重号 → 红；合法 → 绿；UI 仍显示软提示。

## 修复判据

- 硬结构错误阻断 run 门；软提示不误伤；
- `pnpm test` / run-gates 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/plan-gate.mjs",
    "checks/lib/gates/node-gate-core.mjs",
    "checks/run-gates/node-gate.mjs",
    "tests/run/gates/plan-gate.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/gates/plan-gate.spec.mjs",
    "exit": 1,
    "output": "not ok 2 - 环/悬空/重号/自依赖 → RED（BUG-267）"
  },
  "green": {
    "command": "node --test tests/run/gates/plan-gate.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/plan-gate.spec.mjs"
  }
}
```
