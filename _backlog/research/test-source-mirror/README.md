---
status: 已定性
opened: 2026-11-15
---

# 测试子目录 ↔ 源码位置：按消费者接口分层

> 状态：已定性
> 问题：`tests/` 下的子目录应当镜像哪一层「源码」，才能让 agent 与人以后都找得到东西；搬动的代价与机械面是什么。
> 消费者：[issue 2026-11-15-test-source-mirror](../../issues/2026-11-15-test-source-mirror.md)
> 产出的卡：[issue 2026-11-15-test-source-mirror](../../issues/2026-11-15-test-source-mirror.md)
> 结论：按**消费者接口**分层——研发面镜像命令家族（run-gates / run-ops / dev / smoke / verify / probes）并显式保留 `shared`；产品面镜像 DSH 组合面（preset / content / startup / defaults / fetch-fallback / client 页签）。import 图只证明依赖，不证明消费者。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-15-test-source-mirror.md](2026-11-15-test-source-mirror.md) | 消费者模型、全部代码目录盘点、可达性/归属/成本实测、轴的四选一与建议形状 | 2026-11-15 |
