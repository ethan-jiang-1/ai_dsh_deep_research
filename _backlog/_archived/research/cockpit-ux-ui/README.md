---
status: 已定性
opened: 2026-11-26
---

# 研究驾驶舱 UX/UI 重塑与 DSH 能力充分利用

> 状态：已定性
> 问题：如何在不破坏 harness/bundle 数据面与只读诚实边界的前提下，补齐研究驾驶舱（Research Cockpit）的设计系统、信息架构与交互短板，并充分利用 DSH 客户端框架的扩展槽位、原子组件与构建能力？
> 消费者：用户 2026-11-26 发起的 UX/UI 评估与调研实验（及已结 [2026-11-26-cockpit-ux-ui-native-upgrade.md](../../settled_issues/2026-11-26-cockpit-ux-ui-native-upgrade.md)）
> 产出的卡：[2026-11-26-cockpit-ux-ui-native-upgrade.md](../../settled_issues/2026-11-26-cockpit-ux-ui-native-upgrade.md)
> 结论：12 项 UX/UI 升级与加码点中 11 项可 100% 通过 DSH 原生公开槽位、ui-primitives 与 CSS Modules 零魔改落地，1 项延后至 Host 聚合源，已转为 M1–M7 goal-driven 实施卡并完成验收
> 归档：2026-11-26

## 本方向范围与约束

- **对象**：`packages/deep-research-pack/src/client/`、`tsdown.config.ts`、`cordis.patch.yml` 的 UI/UX 呈现面，以及 `vendor/dsh/packages/client/*` 提供的真实宿主扩展点（只读基线 `dsh-v0.2.1-rc.5`）。
- **守住的底线**：不破坏 `src/lib/` 纯折算层与 `ArtifactState` 五态诚实降级（空 ≠ 缺席 ≠ 读失败 ≠ 非法）、不破坏双语 day-one 守卫（`tests/cockpit/*`）、不破坏只读观察边界（不按钮化 rerun / 不直写业务文件，写仍走 Lead 或 host command）。
- **实验优先**：先立视觉基线与小范围原型验证（E1–E5），证据充分后再转为 `issues/` 卡与实施变更。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-26-cockpit-ux-ui-audit.md](2026-11-26-cockpit-ux-ui-audit.md) | 现状代码级 UX/UI 诊断、DSH 客户端可用能力全景盘点、改造方向与 E1–E5 实验路线图 | 2026-11-26 |
| [2026-11-26-dsh-native-feasibility-and-design.md](2026-11-26-dsh-native-feasibility-and-design.md) | 逐项可行性与升级安全性决策表（12 项）、构建/测试破局点、否决清单与 M1–M7 实施蓝图 | 2026-11-26 |
