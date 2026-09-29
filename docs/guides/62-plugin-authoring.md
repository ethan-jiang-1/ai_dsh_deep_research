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
| plugin | 导出 `apply(ctx)` 的 TS 模块；注册即 `apply(ctx)`，配置经 cordis schema 校验 | 本仓自写两个插件（D18 单点例外，构成正本 = [design/40](../design/40-research-cockpit.md)）：`src/index.ts`（host 半空壳 = 观察面宿主位）与 `src/client/index.ts`（client 半：注册右栏「研究状态」页签 / 活标题 / 研究语义工具卡）；新插件从 `vendor/dsh/docs/user/develop/basic/` 起步 |
| bundle | 你编写与分发的单位（`dsh.bundle`）——回答"这个包贡献什么"，是插入/覆盖 plugin rows 的 patch 层 | `packages/deep-research-pack/cordis.patch.yml` + 包内 `presets/`、`skills/` |
| profile | 用户 `dsh --profile <name>` 启动的环境（`dsh.profile`）——回答"哪些 bundle 按什么顺序组成" | `dev/harness-home/profiles/research/`（镜像；源 = overlay） |
| preset | 一个 agent 形态：persona 行 + skills + 工具行 | `presets/<role>.patch.yml`（preset 行）+ `presets/<role>/skills/`（lead / scout / analyst / critic） |
| patch / overlay | 层叠覆盖条目（id 定向的 config 覆盖、禁用、插入） | `dev/research.overlay.yml`（源码域通道的镜像源） |

**Nothing is both**：bundle 与 profile 是两个 manifest 的两种东西，别把本包写成 profile。

## 参与阶梯（本仓版本；DSH 原表见 `repo-harness/04`）

| 层级 | 本仓首选入口 | 典型变化 | 何时升级 |
|---|---|---|---|
| **L0 组合** | cordis 行 config、bundle 行、preset 行、profile 层 | 换 provider、调超时、开关并行、改工具行参数 | 配置表达不了新行为 |
| **L1 扩展点** | preset（persona / skills / 工具行）、`SKILL.md`、client 插件（`src/client/` 的槽与页签注册） | 新增研究角色、新增方法论 skill、调整工具面、新增观察面槽位 | 需要一项**可替换的完整能力** |
| **L2 capability seam** | Service Definition + Provider + Consumer | 新的研究能力接缝（本仓尚无） | 现有扩展点表达不了循环驱动 |
| **L3 core loop** | `agent-loop`（vendor 所有） | 改默认循环 | 本仓**不直接改**（vendor 只读铁律）；走上游 + 升 pin |

阶梯不是价值排序：L0 的部署替换是完整系统能力，L3 只是影响面最大。**横切义务**：任何层级
新增"模型可见"的事实时，必须同时扩展 `SessionEventMap` 并从日志可投影（model-visible ⟺
logged）——pack 行只引入**现成**能力，这项义务落在 vendor 面；本仓自写的 client 面（D18）
只注册槽位、渲染观察数据，不新增模型可见事实。

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
| 角色 preset 行形状（`presets/<role>.patch.yml`：dsh-agent-preset 行 + config.plugins + skills/） | `node scripts/verify.mjs`（`preset-structure` / `row-deps` / `role-list-sync`） |
| 接线（roster、bundle 行、skills 隔离） | `DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs`（L1 真挂载） |
| 安装形状（pack → 干净 profile → plugin add） | `node scripts/release-smoke.mjs`（L2） |
| persona / skill 文本（模型可见） | 追加 `node scripts/l4-lite-smoke.mjs`（真模型档） |
| docs / AGENTS / queue | 追加 `node scripts/entry-chain-probe.mjs`（真模型档） |
| 门禁本身 | 注入回归看红 → 还原 → 绿（反证记录进 `docs/evaluation.md`） |

## 交付与部署形态（本包怎么送到用户手里）

DSH 的规则（上游正本 = `vendor/dsh/docs/user/develop/basic/publish.md`）：**bundle 是你编写与
分发的单位，profile 是用户启动的环境，二者互斥**。本仓据此的交付拓扑：

| 参与方 | 形态 | 谁提供 |
|---|---|---|
| DSH 本体 | 平台（`@deepseek-ai/dsh-base` + `dsh-web-app` 两个 bundle） | 用户装 DSH |
| 本包 | 一个 bundle（`dsh-deep-research-pack`） | 本仓 |
| 团队机制层 | 另一个 bundle（`@deepseek-ai/dsh-experimental-agent-team-profile`） | vendor（本包**故意不声明**团队行——组合与实战 config 归该层，RFC m2-p1-run-channel A 定案） |
| 研究工作区 | 会话 cwd 的目录（手册 `AGENTS.md` + `templates/run/`） | 本包 `workspace/` 种子（`dev/sync-pack-workspace.mjs` 同步） |

工作区是**纪律的载体**：DSH 的 agent-instructions 从会话 cwd 向上发现 `AGENTS.md` 并注入每个
角色——手册不在工作区，四个角色就没有证据契约与完成判据。安装步骤（用户视角）与前置
检查 = [pack README](../../packages/deep-research-pack/README.md)；部署工具 = 包内两条 bin
（`dsh-deep-research-preflight` 检查、`dsh-deep-research-scaffold` 铺种子 + 补团队层）。

本仓开发面的四个生成物各有生成器与新鲜度门禁（漂移即红）：`dev/research.overlay.yml`
（`dev/render-overlay.mjs` → `overlay-fresh`）、pack 的 `workspace/` 种子
（`dev/sync-pack-workspace.mjs` → `pack-workspace-fresh`）、run 通道 profile 镜像
（`dev/boot-run.sh` 幂等重建，逐文件漂移检测）、dist 导出手册（`scripts/export-dist.mjs`
→ `dist-manual-version`——一条命令出 tarball + 安装手册到 `_dist/`，tarball 不进库，
手册 tracked；版本动必须重导出，导出不是发布）。

## 改动影响面（添 / 换 / 删要一起动什么）

一次改动往往牵动多处；漏一处的表现是"本地对、部署错"或"静默不生效"。本表是**文件级**影响面；
**执行程序**（必跑哪些面、生成物与检查的次序、done 判据）的唯一 owner =
[guides/60 §2 任务型路由表](./60-dev-loop.md)。按下表一次改齐：

| 你要做的事 | 必须一起动 | 最小证据 |
|---|---|---|
| 加/换一条 bundle 行（host 共享面） | `cordis.patch.yml` → `node dev/render-overlay.mjs` 重渲染；行引用的 `@deepseek-ai/*` 进 `peerDependencies` | `overlay-fresh` / `row-deps` 门禁 + L1 真挂载 + L2 安装形状 |
| 加一个研究角色 | `presets/<role>.patch.yml` + `package.json` 的 `dsh.bundle.patch` 数组 + `l4-lite-smoke` 的 `PROMPTS` + 台账 D 号（D2 是角色数） | `preset-smoke` 真挂载（L1）+ `preset-structure` / `role-list-sync` |
| 加一个方法论 skill | `presets/<role>/skills/<n>/SKILL.md`（frontmatter `name` 逐字等于目录名） | `preset-structure` + L1 的 skills 隔离断言 |
| 改研究手册 / run 模板 | 改 `research-workspace/` 正本 → `node dev/sync-pack-workspace.mjs` 同步进 pack | `pack-workspace-fresh` 门禁 |
| 加部署脚本 / bin | `package.json` 的 `files` + `bin` | `release-smoke`（L2：真装一次，装完能跑） |
| 加观察面 client 面能力 | `src/client/` + `tsconfig.client.json` 的 include + `dsh.client.inject` + keyed 字面量进 `keys.ts` | `client-load-smoke`（真浏览器）+ `client-keys` 门禁 |
| 改 persona / skill / 手册文本（模型可见） | 同 diff 跑真模型档；运行中的 web 缓存 boot 文本，须重启通道 | `l4-lite-smoke`（真模型档） |
| 换 vendor pin | `dev/vendor-build.sh` 全链重建 + 逐条重审 | 升 pin 毕业记录（[2026-09-25](../../notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md)） |
| 改 profile 镜像 | 不手改——改 pack 源后跑 `bash dev/boot-run.sh`：组合不完整/缺席时它重建，漂移时它 **exit 1** 并打印 `rm -rf <profile>` 补救（直接 `dsh --profile research` 会静默用旧镜像） | boot-run 漂移检测（fail-loud） |

**一句话规则**：源改一处（pack），生成物跑生成器，证据按面选档（keyless 证管道 / 真模型档
证 agent 行为），部署形状变更追加 L2。

## 继承边界（DSH 不要求插件仓库复制什么）

`AGENTS.md`、Agent Notes、gates、发布序列是 **DSH 自身作为 development harness** 的参与
机制；插件仓库直接继承的是**插件形态、配置与打包模型、术语**，分类学精神（一个事实一个
owner、生成物有生成器、决定有记录）是可迁移原则而非强制要求。本仓选择继承它们，理由 =
自持与可审计（逐行三态见 [discipline-map](../discipline-map.md)），不是为了模仿形态。
