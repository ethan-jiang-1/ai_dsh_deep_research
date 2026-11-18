---
status: 等人拍板
severity: P2
opened: 2026-11-18
---

# BUG-265：topics 的 `depends_on` 只有模板/技能在说——没有任何代码读它

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：等人拍板（门禁与验收合同触面）
>
> 位置：`packages/deep-research-pack/content/templates/run/topics.md:12,21`（`- depends_on:`）；
> 消费面 = `checks` / `packages/deep-research-pack/src`（`grep depends_on` 只命中模板与 nodes-contract 技能）。
> 探索轮 = [20 卡低置信区](../issues/2026-11-18-low-confidence-20.md)。

## 症状

topics 模板要求每个 topic 写 `depends_on: <topic id 或 无>`，nodes-contract 也把它列为立项必填；
但整个代码库没有解析/校验/消费：

```sh
grep -rn depends_on packages/deep-research-pack/src checks packages/deep-research-pack/content packages/deep-research-pack/presets
# 只有 templates/run/topics.md 与 nodes-contract/SKILL.md
```

因此：

- 未知 id、环、自依赖、`T1, T2` 任意写法，都没有后果；
- plan 的节点 deps 与 topics 的 depends_on 可以互相矛盾，没有对账；
- 模型写一个“看似有依赖”的 topics.md 就通过，而覆盖/执行顺序没有依据。

## 分诊与授权

- 严重级：P2 — 模板声明的图关系无消费者；topic 依赖形同虚设。
- 表面 / 边界：topics 图 / ② 静态
- DSH 不变量：fail-loud；模板字段必须有消费者
- 触及面：门禁与验收合同
- 授权：等人拍板（门禁触面）
- 批：低置信区 20 卡

## 复现

复现状态：稳定。

```sh
grep -rn depends_on packages/deep-research-pack/src checks packages/deep-research-pack/content | head
# 只命中模板/技能；无解析器
```

## 根因（已证）

D28 的 topic 图字段只进了模板与立项技能；`parseTopicsOf`（findings-core）只解析 role/lenses，
`plan-index` 只解析 plan 的 deps，两套图没有汇合。

## 牵出的失败类

- 语义 C2（字段无消费者）+ C7；与 266（must_answer）同族，都是 topics 结构字段。
- 类级方向 = topics 的结构字段（T#、must_answer、scope_role、depends_on、lenses）逐一有解析器；
  depends_on 至少要有“id 存在/无环/无自依赖 + 与 plan 对账”。

## 修法

1. `parseTopicsOf` 加 depends_on；建 `T# → deps` 图；
2. 校验：未知 id、自依赖、环、重复 id；与 plan 的 topic 依赖对账（或显式豁免）；
3. 在门 L/plan 门里消费；旧场按断代；
4. 测试：环/未知 → 红；合法 → 绿。

## 修复判据

- depends_on 有解析器、有图校验、有消费；非法图 → 红；
- 旧场不误伤；`pnpm test` / run-gates 绿。
