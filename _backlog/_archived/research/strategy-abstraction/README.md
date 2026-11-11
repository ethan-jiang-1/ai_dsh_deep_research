---
status: 已定性
opened: 2026-11-11
---

# 策略抽象：固定权重下，UI → 数据 → 行动

> 状态：已定性
> 问题：在模型权重不可改、只有 preset 层（knowledge / orchestration / workflow / gates）可变的约束下，用户 UI 输入能否、以及如何编译成不同的 Deep Research 策略；现有 UI 哪些合理、哪些该改/停。
> 消费者：用户 2026-11-11 直派的设计复核；落地 = [策略投影 + HITL1 typed 输入](../../settled_issues/2026-11-11-strategy-projection.md)；与 [orchestration-alignment](../orchestration-alignment/README.md) 并行——后者提供 DSH 行动层约束。
> 产出的卡：[策略投影 + HITL1 typed 输入（O1）](../../settled_issues/2026-11-11-strategy-projection.md)
> 结论：三层抽象成立，缺的是 Strategy（K/O/G/B）层；按 O1 立卡（派生投影 + HITL1 三个 typed 输入 + 投影门 + 3 场 pilot），O2/O3 暂不做。D47 + team-subagent/provenance 合同已并入材料 §2.4/§6.3。
> 归档：2026-11-11

## 研究问题

1. 固定权重下，行动层（DSH 原语 + preset 组合 + plan）到底有哪些自由度；哪些是机器强制、哪些只是政策。
2. 现有 UI 的每个输入（研究配置页签、方法库、HITL1 卡、对话）实际落到哪里；typed 还是 prose；哪些是伪选择。
3. Protocol 的每个字段有没有行动层消费者；`protocol-audit` 能咬住什么、咬不住什么。
4. 「策略」应定义成什么：Protocol 的一个投影、独立对象，还是 plan 的一部分；它和 lens / method / style 的关系。
5. 外部系统把「用户配置」编译成「策略」的真机制有哪些；哪些可移植、哪些是产品层不可移植的。
6. 下一步最小可证的动作是什么：先改 UI、先加 Strategy 投影，还是先动 DSH 组合（worker preset / spawn-first）。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-11-strategy-abstraction.md](2026-11-11-strategy-abstraction.md) | 三层现状、3 个 run 的实证、protocol-audit 红队、外部证据、Strategy 参考模型、UI 审计与设计选项 | 2026-11-11 |
