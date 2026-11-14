---
status: 已定性
opened: 2026-11-13
archived: 2026-11-15
---

# 测试资产围栏：把证据重心压到秒级单元/集成层

> 状态：已定性
> 问题：现有测试资产（`tests/`、verify gates、smoke、probes、snapshots、run gates、fixtures）的成本与
> 证明力如何分布？哪些慢资产可以降级、合并或退役，哪些关键合同只被慢资产覆盖而需要补快守卫，
> 哪些快资产是重复、失修或假绿？目标形态 = 默认回归与 pre-commit 以秒级 keyless 单元/契约为重心，
> 慢 E2E 只保留不可替代的装配、安装、浏览器与模型面。
> 消费者：[issue 2026-11-13-test-asset-fence](../../settled_issues/2026-11-13-test-asset-fence.md)
> 产出的卡：[issue 2026-11-13-test-asset-fence](../../settled_issues/2026-11-13-test-asset-fence.md)
> 结论：快核健康、慢核有成本悬崖；最大缺口是慢资产判据仍长在慢壳里（需抽 `scripts/lib/*` + 直测）
> 而非测试少；客户端纯逻辑 36/59 无直测；夹具会随判据漂移。落地方向 = 默认快环 ≤10s、每条慢资产须有
> 唯一证明面 + 可直测判据核；S0–S2 已落地（见产出的卡），S3 另卡/trigger。
> 归档：2026-11-15（产出的卡已结、无活跃消费者）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-13-test-asset-fence.md](2026-11-13-test-asset-fence.md) | 资产盘点、实测成本、缺口/重叠/失修清单与迁移切片 | 2026-11-13 |
