---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-266：topics 的 `must_answer` 2–5 问只被仪表盘计数——0 问/9 问都过门

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`packages/deep-research-pack/content/templates/run/topics.md:3`（2–5 问）、
> `packages/deep-research-pack/content/manual.md:26`；消费 = `checks/lib/analyze/run-dashboard-core.mjs`
> （只数条数，无 2–5 判据）。探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

模板/手册规定每个 topic 的 `must_answer` 是 **2–5 问**；唯一消费者是仪表盘的
`run-dashboard-core.mjs`，它只把问题列表解析出来显示，不判数量。于是：

- `- must_answer:` 下 0 问（空列表）→ 仪表盘 0，门不报；
- 9 问 → 也不报；
- 每问是否“可判答了/没答”无结构（自由文本），无法机械判。

立项门/L2 覆盖只读 scope_role，不读 must_answer 数量；一个 topic 可以没有可答问题仍被覆盖。

## 分诊与授权

- 严重级：P2 — “问题列表 2–5”是立项合同，当前只有 UI 计数；空/超量无后果。
- 表面 / 边界：topics 合同 / ② 静态（数量）
- DSH 不变量：fail-loud；模板声明的数量约束必须有检查
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn 'must_answer' packages/deep-research-pack/src checks packages/deep-research-pack/content | head
# 只有 dashboard parser + 模板/手册；无 2–5 判据
# 临时 topics.md：T1 下 must_answer 为空 → 门 L/仪表盘不报
```

## 根因（已证）

`run-dashboard-core` 的 `parseTopics` 只收集问题，不校验数量；`node-gate` 只读 scope_role；
`findings-core` 只读 role/lenses。模板注释里的 2–5 没有消费者。

## 牵出的失败类

- 语义 C2（数量约束无消费者）+ C7；与 265（depends_on）同族。
- 类级方向 = topics 结构字段的每条数量/闭集约束都要有门，而不是只显示。

## 修法

1. 立项/L2 门：每个 topic 的 must_answer 数量 ∈ [2,5]；0/1/6+ → 红/警告（按契约）；
2. 每问可判“答/未答”至少要求非空、去重；可选结构化 `[ ]` 标记；
3. 测试：0/1/6 → 红；2/5 → 绿；
4. 旧场按断代。

## 修复判据

- must_answer 数量越界 → 红；合法 → 绿；
- 旧场不误伤；`pnpm test` / run-gates 绿。
