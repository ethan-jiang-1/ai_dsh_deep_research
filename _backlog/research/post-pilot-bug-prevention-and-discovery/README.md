---
status: 已定性
opened: 2026-11-23
---

# 预防试点后缺陷复盘与根治调研：代码实践与非 E2E 寻虫手段

> 状态：已定性
> 问题：11-20 预防试点落地后（11-20～11-23）为何仍靠 E2E 密集抓出 45 张缺陷（BUG-340…384）？根本上在代码实践（防御式、保守式、按契约与类型设计）和「非端到端」寻虫手段上还能补什么？
> 消费者：[Issue 1 静态与语义防线](../../issues/2026-11-23-static-semantic-guardrails.md) · [Issue 2 L0 客户端与寻虫底座](../../issues/2026-11-23-l0-client-and-property-testing.md) · [Issue 3 状态机与契约架构](../../issues/2026-11-23-state-machine-and-contract-architecture.md)
> 产出的卡：[2026-11-23-static-semantic-guardrails.md](../../issues/2026-11-23-static-semantic-guardrails.md) · [2026-11-23-l0-client-and-property-testing.md](../../issues/2026-11-23-l0-client-and-property-testing.md) · [2026-11-23-state-machine-and-contract-architecture.md](../../issues/2026-11-23-state-machine-and-contract-architecture.md)
> 结论：已通过只读实测校准并定型为三步递进的 3 张待落地 Issue（静态语义防线 → L0 Hook+故障矩阵+PBT 寻虫底座 → 状态机抽干与契约内化），详见 [实证基线与立项方案](2026-11-23-empirical-baseline-and-issue-plan.md)。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-23-post-pilot-bug-anatomy.md](2026-11-23-post-pilot-bug-anatomy.md) | 实证解剖：BUG-340…384 的分层分布、11-20 试点未覆盖的三座缺陷工厂与现代码残余隐患 | 2026-11-23 |
| [2026-11-23-defensive-and-contract-coding-practices.md](2026-11-23-defensive-and-contract-coding-practices.md) | 回答问题一：代码实践层还能做什么（非法状态不可表示、Parse-Don't-Validate、Hook 状态机抽干、Fail-Closed、vendor 防御模式、`.mjs` 类型防护） | 2026-11-23 |
| [2026-11-23-non-e2e-bug-discovery-methods.md](2026-11-23-non-e2e-bug-discovery-methods.md) | 回答问题二：除端到端外还有哪些更好的寻虫手段（Type-Aware Lint、`checkJs`、AST 不变量、Hook+jsdom、PBT/状态机序列、差分、变异、故障注入矩阵与覆盖率热力盲区） | 2026-11-23 |
| [2026-11-23-custom-semantic-linters-and-probes.md](2026-11-23-custom-semantic-linters-and-probes.md) | 自研项目专属武器：基于 TS `TypeChecker` 的 5 类语义 Linter 与通用恶意 `RunSource` 巡检器设计 | 2026-11-23 |
| [2026-11-23-empirical-baseline-and-issue-plan.md](2026-11-23-empirical-baseline-and-issue-plan.md) | v2 挖透：只读实测基线数据（当场抓出 `protocol-audit` 未导入崩溃与 `useStatusFeed` 漏依赖）、取舍决策表与 3 张 Issue 拆解方案 | 2026-11-23 |
