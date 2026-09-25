# 62 · 插件作者入口（在本仓改 DSH 插件内容）

> 层：指南。本页是 DSH 插件作者文档 tier 的**本仓投影**——上游正本 = `vendor/dsh/`
> 的 `docs/cordis-tutorial/`（七讲，keyless 可运行）+ `docs/user/develop/{basic,framework,practice}`
> （插件最小定义 / 事件与服务依赖 / LLM adapter 与动态配置）+ `docs/user/develop/basic/publish.md`
> （bundle/profile 二分）。本页只回答"在本仓改插件内容，落在哪、怎么验"。

## 为什么要有这一页

开发本插件时，coding agent 同时读**两个仓库**：本仓（插件内容）与 `vendor/dsh/`（机制本体）。
两边沿用同一套概念时，同样的检索模式与判断标准都成立；哪边自造词汇，agent 就要在哪边重建
一套局部模型（`_agent_ready_development/repo-harness/09-plugin-author-entry.md` §4）。
本页把本仓的落点钉在那些概念上。

## 词汇（与 DSH 对齐，不允许自造同义词）

| 术语 | DSH 定义 | 本仓落点 |
|---|---|---|
| plugin | 导出 `apply(ctx)` 的 TS 模块；注册即 `apply(ctx)`，配置经 cordis schema 校验 | 本仓是**纯配置包**，暂无自写 TS 插件；要写从 `vendor/dsh/docs/user/develop/basic/` 起步 |
| bundle | 你编写与分发的单位（`dsh.bundle`）——回答"这个包贡献什么"，是插入/覆盖 plugin rows 的 patch 层 | `packages/deep-research-pack/cordis.patch.yml` + 包内 `presets/`、`skills/` |
| profile | 用户 `dsh --profile <name>` 启动的环境（`dsh.profile`）——回答"哪些 bundle 按什么顺序组成" | `dev/harness-home/profiles/research/`（镜像；源 = overlay） |
| preset | 一个 agent 形态：persona 行 + skills + 工具行 | `presets/<role>/`（lead / scout / analyst / critic） |
| patch / overlay | 层叠覆盖条目（id 定向的 config 覆盖、禁用、插入） | `dev/research.overlay.yml`（源码域通道的镜像源） |

**Nothing is both**：bundle 与 profile 是两个 manifest 的两种东西，别把本包写成 profile。

## 参与阶梯（本仓版本；DSH 原表见 `repo-harness/04`）

| 层级 | 本仓首选入口 | 典型变化 | 何时升级 |
|---|---|---|---|
| **L0 组合** | cordis 行 config、bundle 行、preset 行、profile 层 | 换 provider、调超时、开关并行、改工具行参数 | 配置表达不了新行为 |
| **L1 扩展点** | preset（persona / skills / 工具行）、`SKILL.md` | 新增研究角色、新增方法论 skill、调整工具面 | 需要一项**可替换的完整能力** |
| **L2 capability seam** | Service Definition + Provider + Consumer | 新的研究能力接缝（本仓尚无） | 现有扩展点表达不了循环驱动 |
| **L3 core loop** | `agent-loop`（vendor 所有） | 改默认循环 | 本仓**不直接改**（vendor 只读铁律）；走上游 + 升 pin |

阶梯不是价值排序：L0 的部署替换是完整系统能力，L3 只是影响面最大。**横切义务**：任何层级
新增"模型可见"的事实时，必须同时扩展 `SessionEventMap` 并从日志可投影（model-visible ⟺
logged）——本仓只在 pack 行引入**现成**能力，因此这项义务落在 vendor 面。

## 新行为落在哪：按顺序问归属

1. 只是替换配置或组合？→ L0（改 cordis 行 / bundle 行，跑 L1+L2 冒烟）；
2. 能由现有 preset / skill / 工具行表达？→ L1（先看有没有可复制的范本）；
3. 是需要可替换 Provider、由 Consumer 通过稳定 Service Definition 使用的完整能力？→ L2；
4. 无论哪层，它是否新增模型可见、且必须在 reload / resume / fork 后重建的事实？→ 横切
   （SessionEventMap + 投影，vendor 面）；
5. 现有扩展点与 seam 都表达不了循环驱动？→ 才论证 L3（含升 pin 与流程合同重校）。

## 范本（照着改，别从零发明）

| 任务 | 范本 | 附带流程 |
|---|---|---|
| 新增研究角色 | `packages/deep-research-pack/presets/critic/`（skill 隔离最干净） | [`.agents/skills/adding-a-research-role`](../../.agents/skills/adding-a-research-role/SKILL.md) |
| 新增方法论 skill | `presets/lead/skills/synthesis/SKILL.md`（frontmatter `name`/`description` + 方法论正文） | 同上 |
| 新增/修改 bundle 行 | `packages/deep-research-pack/cordis.patch.yml` + `dev/research.overlay.yml`（两处必须一致） | 漂移检测在 `dev/boot-run.sh` |
| 新增机械门禁 | `scripts/verify.mjs` + `docs/evaluation.md` §L0 | [`.agents/skills/writing-a-gate`](../../.agents/skills/writing-a-gate/SKILL.md) |
| 跑一次研究 | `research-workspace/templates/run/` | [`.agents/skills/running-a-research-run`](../../.agents/skills/running-a-research-run/SKILL.md) |

## 证据义务（改哪面跑什么）

| 改动面 | 最小可信证据 |
|---|---|
| 角色目录形状（preset.yml / agent.cordis.yml / skills） | `node scripts/verify.mjs`（`preset-structure` / `row-deps` / `role-list-sync`） |
| 接线（roster、bundle 行、skills 隔离） | `DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs`（L1 真挂载） |
| 安装形状（pack → 干净 profile → plugin add） | `node scripts/release-smoke.mjs`（L2） |
| persona / skill 文本（模型可见） | 追加 `node scripts/l4-lite-smoke.mjs`（真模型档） |
| docs / AGENTS / roadmap | 追加 `node scripts/entry-chain-probe.mjs`（真模型档） |
| 门禁本身 | 注入回归看红 → 还原 → 绿（反证记录进 `docs/evaluation.md`） |

## 继承边界（DSH 不要求插件仓库复制什么）

`AGENTS.md`、Agent Notes、gates、发布序列是 **DSH 自身作为 development harness** 的参与
机制；插件仓库直接继承的是**插件形态、配置与打包模型、术语**，分类学精神（一个事实一个
owner、生成物有生成器、决定有记录）是可迁移原则而非强制要求。本仓选择继承它们，理由 =
自持与可审计（逐行三态见 [discipline-map](../discipline-map.md)），不是为了模仿形态。
