---
status: 已定性
opened: 2026-11-28
---

# 研究驾驶舱 UX/UI 二期深水区重塑与 DSH 原生能力深度挖掘

> 状态：已定性
> 问题：在第一轮 M1–M7 完成 CSS Modules、`--dsw-*` 令牌与基础原语替换后，为什么整体体验仍停留在“把调试信息摆齐”的初步阶段？如何在不修改 `vendor/dsh/`、不破坏 `harness(bundle)` 只读诚实边界的前提下，重塑研究全生命周期的信息架构与交互质感，并深度释放 DSH 的会话投影、结构化输入引擎与原生输出组件能力？
> 消费者：用户 2026-11-28 发起的二期 UX/UI 与 DSH 标杆示范调研（及已结 [2026-11-28-cockpit-ux-v2-and-dsh-showcase.md](../../settled_issues/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md)）
> 产出的卡：[2026-11-28-cockpit-ux-v2-and-dsh-showcase.md](../../settled_issues/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md)
> 结论：以「前台极简、后台原教旨 DSH 化」统一极致 UX/UI 与 DSH 标杆示范双目标，集中打透五大标志性体验瞬间（意图首屏 / Host 投影全域队列与阶段聚焦驾驶舱 / 全屏三栏精读与悬停溯源 / Composer `/` 与 `@` 指令流 / 零 hack 嵌入式 Method Editor），补齐 3 分钟零 Key 示范体验通道、DSH 能力解剖图与上游反馈账本（U1–U10），并完成 R0–R4 落地与用户验收。
> 归档：2026-11-28

## 本方向范围与约束

- **基线认知**：第一轮 [cockpit-ux-ui](../cockpit-ux-ui/README.md)（落地见 [2026-11-26-cockpit-ux-ui-native-upgrade](../../../../notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md)）已解决**工程卫生与组件底座**（消除幽灵 token/裸色值、接入 CSS Modules、替换基础 `ui-primitives`、初建终稿三视图与全局 Hub），不再重复建设。
- **二期核心命题**：从「工程师观测仪表盘」跃迁为「以研究心流为中心的产品级工作台」——解决**首屏心智割裂、状态面板静态堆砌、Session↔Run 身份断联、配置多头分散、Composer 原生交互空白、精读溯源摩擦**六大深层问题。
- **红线不变**：`vendor/dsh/` 严格只读（`dsh-v0.2.1-rc.5`）；严守 [D17](../../../../docs/decisions.md#d17) `harness(bundle)` 分离与 [D18](../../../../docs/decisions.md#d18) 观察面边界（写操作仍经 Lead 会话、Method Editor 窄工具或显式 host command）；严守 `ArtifactState` 五态诚实降级与 day-one 中英双语守卫。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-28-ux-ui-v2-diagnosis-and-dsh-leverage.md](2026-11-28-ux-ui-v2-diagnosis-and-dsh-leverage.md) | 二期代码级 UX/UI 深层诊断、DSH 未开发高杠杆原生机制矩阵与 X1–X6 原型实验路线图 | 2026-11-28 |
| [2026-11-28-dsh-upstream-feedback.md](2026-11-28-dsh-upstream-feedback.md) | DSH 平台上游反馈账本（U1–U10 实测平台缺口、当前可逆降级边界与上游 Seam 提案） | 2026-11-28 |
| [prototype-north-star.html](prototype-north-star.html) | 单文件可交互 North Star UX/UI 设计意图 HTML 原型（覆盖 S1–S5 全生命周期场景、明暗双主题、视口切换、X-Ray DSH Seam 透视层与实时状态机） | 2026-11-28 |
