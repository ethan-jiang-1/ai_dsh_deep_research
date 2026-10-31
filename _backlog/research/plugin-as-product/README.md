# 插件即产品：独立启动 profile、用户工作区与 run bundle 归属

> 问题：怎样把本插件从"装进用户已有 profile 的 bundle"变成"带自己启动入口的产品"——插件自带一个启动 profile，启动时知道或询问用户工作区，全部插件内容留在插件内，run bundle 等生产产物落到用户工作区？
> 消费者：[插件即产品决策卡](../../issues/2026-11-01-plugin-as-product.md)、[产品启动运行时](../../issues/2026-11-01-product-launch-runtime.md)、[产品文档与分发](../../issues/2026-11-01-product-docs-and-dist.md)、[仓库对齐与证据](../../issues/2026-11-01-repo-alignment-and-evidence.md)、[产品首屏体验](../../issues/2026-11-01-product-first-run-ux.md)。
> 产出的卡：[插件即产品决策卡](../../issues/2026-11-01-plugin-as-product.md)（父卡）、[产品启动运行时](../../issues/2026-11-01-product-launch-runtime.md)、[产品文档与分发](../../issues/2026-11-01-product-docs-and-dist.md)、[仓库对齐与证据](../../issues/2026-11-01-repo-alignment-and-evidence.md)、[产品首屏体验](../../issues/2026-11-01-product-first-run-ux.md)。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-01-faq26-digest.md](2026-11-01-faq26-digest.md) | FAQ 26 的 profile / workspace / artifact / 数据归属结论摘录与对本项目的含义 | 2026-11-01 |
| [2026-11-01-dsh-mechanics.md](2026-11-01-dsh-mechanics.md) | vendor/dsh 源码核验：第三方 profile 模板、profile 装配、workspace 注册、Web 参数、session cwd | 2026-11-01 |
| [2026-11-01-repo-gaps.md](2026-11-01-repo-gaps.md) | 本仓现状盘点：两套启动叙事、工作区硬编码、随包文本引仓内脚本、会话组 substring | 2026-11-01 |
| [2026-11-01-architecture-options.md](2026-11-01-architecture-options.md) | 目标架构与候选方案取舍：launcher、host 注册、工作区模式、设置文件、打包 | 2026-11-01 |
| [2026-11-01-verification-plan.md](2026-11-01-verification-plan.md) | 验收矩阵与证据设计：产品 smoke、首启 Web smoke、门禁与测试迁移 | 2026-11-01 |
| [2026-11-01-review-findings.md](2026-11-01-review-findings.md) | 复核：初衷、挑战点、打包 spike 结果、仍未透的未知 | 2026-11-01 |
| [2026-11-01-runtime-implementation-spec.md](2026-11-01-runtime-implementation-spec.md) | launcher/profile 装配/Host 注册/打包的工程规格与真机 spike 证据 | 2026-11-01 |
| [2026-11-01-first-run-ux-spec.md](2026-11-01-first-run-ux-spec.md) | 起步卡/工作区指示/凭据提示的 client slot 与数据源规格 | 2026-11-01 |
| [2026-11-01-repo-tooling-and-tests-spec.md](2026-11-01-repo-tooling-and-tests-spec.md) | dev 根解析、会话组 projectKey、测试迁移、产品 smoke 的实现规格 | 2026-11-01 |
| [2026-11-01-docs-and-dist-spec.md](2026-11-01-docs-and-dist-spec.md) | README/_dist/全仓文档的产品化编辑规格与 de-repo 清单 | 2026-11-01 |
| [2026-11-01-landing-plan.md](2026-11-01-landing-plan.md) | 把父卡+四张子卡串成 S0–S4 薄垂直切片的落地顺序、依赖与结束判据 | 2026-11-01 |

## 边界

- 本课题只回答"产品形态怎么落地"；不改写研究方法论、角色内容或驾驶舱构成。
- 外部材料只是参考；DSH 合同以 `vendor/dsh` 当前 pin 的源码与 README 为准（pin = `687f282e86`，0.2.1-rc.2 基线；FAQ 26 的来源标注为 rc.3，两者在本文涉及的机制上已逐条对照）。
- 本课题产出的卡是判断与实施切片的记录，不授予实施授权；实施授权由用户对父卡的明确答复给出。
