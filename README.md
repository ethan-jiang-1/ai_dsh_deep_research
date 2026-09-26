# ai_dsh_deep_research

DSH 插件项目：**Deep Research 多角色研究团队**——一个包（`packages/deep-research-pack`）提供四个研究角色 preset（`Deep Research Lead / Scout / Analyst / Critic`），协作走 DSH 现成 Agent Team 通道。

设计来源：方法论内核出自 codex 下的 Deep Research harness 考古（`notes/research/2026-09-24-deep-research-harness-analysis.md`），插件工程范式照搬 `ai_dsh_company`（`notes/research/2026-09-24-dsh-plugin-repo-anatomy.md`）。

## Start Here

- 开工入口链（唯一正本，5 步）= [`AGENTS.md`](AGENTS.md) §入口链——依次读什么、接下来做什么、怎么验收、怎么开工收尾，全在那节。
- 人类速览"现在干什么"：[`roadmap.md`](roadmap.md) §队列 ▶（全仓唯一"当前"指针）。

## Directory Map

布局正本 = [`AGENTS.md`](AGENTS.md) §布局（notes/ 各层语义、scripts/ 与 dev/ 全部工具、运行区）——本文件不复制第二份清单（清单漂移先例：基础整治 C7）。

## Commands

命令表正本 = [`AGENTS.md`](AGENTS.md) §命令表（L0/L1/L2/真模型档/run 通道全档，含 `source dev/env.sh` 前置说明）——本文件不复制。

## Rules In One Screen

- 配置为主的 pack（预设/技能/bundle 行）+ 一个观察面 client 面（D18 单点例外）；Node `^22.19.0 || >=24.0.0`（`engines`，与 vendor 对齐）；测试用 `node:test` + `node:assert`（无测试框架）。
- 评估五面（L0 结构 / L1 挂载 / L2 安装 / L3 领域 / L4 交付）不互抵，定义见 `docs/evaluation.md`。
- 不发明：优先用 DSH 现成载体（preset/skill/agent-team/todo/present/goal），自建机制须有“DSH 载体不可用”的证据。
- 迭代单位 = 垂直轮（最薄全路径 → 逐轮加宽），当前进度看 `roadmap.md` §队列。
