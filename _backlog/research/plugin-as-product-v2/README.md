# 插件即产品 v2：产品 profile、启动期工作区、内容与产物分家

> 问题：怎样把 Deep Research 从"装进用户已有 DSH profile 的 bundle"改回"有自己启动 profile 的产品"——启动时解析或询问用户工作区，插件内容全部留在包内，只有 run bundle 等产物落在工作区？
> 消费者：[插件即产品 v2 决策卡](../../issues/2026-11-01-plugin-as-product-v2.md)
> 产出的卡：[插件即产品 v2 决策卡](../../issues/2026-11-01-plugin-as-product-v2.md)

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-01-postmortem-why-crooked.md](2026-11-01-postmortem-why-crooked.md) | 为什么会做歪：八层原因与系统性修复 | 2026-11-01 |
| [2026-11-01-diagnosis.md](2026-11-01-diagnosis.md) | 上一轮（D38/D39）歪在哪：五处错位、机制后果与证据 | 2026-11-01 |
| [2026-11-01-target-model.md](2026-11-01-target-model.md) | 目标形态合同：三条入口、profile、工作区、内容/产物边界、首屏、数据卡 | 2026-11-01 |
| [2026-11-01-mechanism-facts.md](2026-11-01-mechanism-facts.md) | 机制事实与证据等级（vendor 源码 + 更新后的 FAQ 26） | 2026-11-01 |
| [2026-11-01-change-surface.md](2026-11-01-change-surface.md) | 全仓改动面：代码 / 开发仓 / 测试 / 文档 / 分发，与 S0–S4 分片 | 2026-11-01 |
| [2026-11-01-implementation-plan.md](2026-11-01-implementation-plan.md) | 可 review 的实施计划：不变量、逐文件改动、验收、风险、回滚、review 清单 | 2026-11-01 |
| [2026-11-01-verification-plan.md](2026-11-01-verification-plan.md) | 验收矩阵：每片退出判据、证据档位、新门禁与反证 | 2026-11-01 |

## 边界

- 本课题只回答产品形态与内容/产物边界；不改研究方法论、角色内容或驾驶舱构成。
- DSH 合同以 `vendor/dsh` 当前 pin（`687f282e86`，0.2.1-rc.2）与 FAQ 26 最新 checkout（rc.3）为准；两者在本文涉及的机制上已逐条对照，冲突以 vendor 源码为准并标注。
- 本课题材料不授予实施授权；实施授权 = 用户对决策卡四个分叉的明确答复。
