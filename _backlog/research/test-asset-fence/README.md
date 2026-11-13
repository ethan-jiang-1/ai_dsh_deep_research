---
status: 调研中
opened: 2026-11-13
---

# 测试资产围栏：把证据重心压到秒级单元/集成层

> 状态：调研中
> 问题：现有测试资产（`tests/`、verify gates、smoke、probes、snapshots、run gates、fixtures）的成本与
> 证明力如何分布？哪些慢资产可以降级、合并或退役，哪些关键合同只被慢资产覆盖而需要补快守卫，
> 哪些快资产是重复、失修或假绿？目标形态 = 默认回归与 pre-commit 以秒级 keyless 单元/契约为重心，
> 慢 E2E 只保留不可替代的装配、安装、浏览器与模型面。
> 消费者：[issue 2026-11-13-test-asset-fence](../../_archived/settled_issues/2026-11-13-test-asset-fence.md)
> 产出的卡：[issue 2026-11-13-test-asset-fence](../../_archived/settled_issues/2026-11-13-test-asset-fence.md)
> 结论：—（调研中）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-13-test-asset-fence.md](2026-11-13-test-asset-fence.md) | 资产盘点、实测成本、缺口/重叠/失修清单与迁移切片 | 2026-11-13 |
