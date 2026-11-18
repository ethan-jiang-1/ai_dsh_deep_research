---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-268：plan 的 owner_role / kind / lifecycle / `## 剩余工作` / 重写记录没有机械消费者

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`content/templates/run/plan.md`（节点表列 + 剩余工作 + 重写记录）、
> `presets/lead/skills/nodes-contract/SKILL.md:35`（“在场时必须有 `## 剩余工作`”）；
> 消费 = `plan-index.ts`（解析但不校验 owner/kind/lifecycle），`node-gate` 不读。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

plan 模板/nodes-contract 声明：

- `owner_role` 属于角色集；
- `kind` 属于 scan/dive/check/synthesis/review/gate（未知=unknown）；
- `lifecycle` ∈ active/retired/merged_into/superseded_by；
- 在场时必须有 `## 剩余工作`；
- 每次重写有 `图版本` + `重写记录`（旧号别名）。

`plan-index.ts` 只解析这些列（缺省/未知不报）；`planIssuesOf` 不查 owner/kind/lifecycle/剩余工作/记录；
`node-gate` 不读 plan。因此一个节点写 `owner_role: ghost`、`kind: whatever`、`lifecycle: dead`、
没有 `## 剩余工作` 的 plan 仍可运行/交付。

## 分诊与授权

- 严重级：P2 — 执行图的角色/类型/生命周期与恢复节无机械契约；坏节点被当 active 解析。
- 表面 / 边界：plan 字段 / ② 静态
- DSH 不变量：fail-loud；模板列必须有闭集/在场判据
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -n 'ownerRole\|kind\|lifecycle\|剩余工作\|重写记录' packages/deep-research-pack/src/lib/plan/plan-index.ts
grep -rn '剩余工作\|lifecycle' checks/lib/gates checks/run-gates | head   # 无
# 临时 plan.md：owner_role ghost / kind whatever / lifecycle dead / 无 ## 剩余工作 → 门不报
```

## 根因（已证）

`planIndex` 是 fail-soft 查询面，只解析；`planIssuesOf` 只查图结构；`node-gate` 只查 leads/findings/
version/delivery/reader。`nodes-contract` 的字段承诺没有门。

## 牵出的失败类

- 语义 C2（模板列无消费者）+ C7；与 267 同族（plan 结构/字段）。
- 类级方向 = plan 表头的每个闭集列 + 剩余工作/重写记录有 gate；软迁移提示另列。

## 修法

1. `plan-gate` 校验 owner_role ∈ 角色集、kind ∈ 闭集、lifecycle 合法（墓碑有 successor）；
2. 在场 plan 必须有 `## 剩余工作`；`图版本`/`重写记录` 与 `plan/vN.md` 对账；
3. 测试：ghost/whatever/dead/缺节 → 红；合法 → 绿；
4. 旧场按断代。

## 修复判据

- plan 字段闭集/在场/版本链有 gate；非法 → 红；
- 旧场不误伤；`pnpm test` / run-gates 绿。
