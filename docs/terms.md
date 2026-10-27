# 术语映射（本项目 ↔ DSH 官方 ↔ vendor 落点）

> 层：导航/合同。**一个概念一行**：本项目的说法 → DSH 官方载体 → `vendor/dsh` 里的落点或本仓实现。
> 用途：读文档/代码时遇到同名不同义、或不知道"这东西在 DSH 里叫什么"时查这里；新造编号词汇
> （如参与阶梯 S0–S3、运行形态 M1–M3）必须先在本表登记所指（规则 = [docs/AGENTS](AGENTS.md)）。
> 本页从 [00-index](00-index.md) 拆出：入口链第 2 步只需读地图，术语按需查。

| 本项目 | DSH 官方 | vendor/dsh 落点 |
|---|---|---|
| 研究角色（Lead/Scout/Analyst/Critic） | agent preset（0.1.7 起：`@deepseek-ai/dsh-agent-preset` 一条行，config.plugins 内声明 persona/skills/工具行；行文件 = `presets/<id>.patch.yml`） | `packages/preset/agent-preset` + `packages/preset/persona` |
| 研究团队 / 组队 | Agent Teams（`spawn_teammate` / 任务板，experimental；**组合层 = vendor agent-team-profile**，D16） | `packages/experimental/agent-team` + `tool-agent-team` + `agent-team-profile` + `docs/subsystems/agent-team.md` |
| 研究工人（一次性查证） | one-shot/continuable subagent（`dsh-tool-subagent`, spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 研究方法论的载体 | skill（`presets/<role>/skills/<n>/SKILL.md`，硬隔离） | `packages/skill/skill-filesystem` |
| 研究执行图 / Wave | plan.md 的 **W<wave>.<index>**（W2 = Wave 2 分组，W2.1 = 层内节点，W2.1.1 = 内部拆解）；Wave 按 deps 计算；stage 由节点 kind 派生；旧 N/旧 flat W 只读 | `research-workspace/templates/run/plan.md` + `src/lib/plan-index.ts`（解析/问题提示）+ `src/lib/plan-graph.ts`（Team 任务图）；[Note](../notes/implemented/2026-10-22-w-wave-node-identity.md) |

| HITL1 / HITL2（两次人工停靠） | `ask_user_question` 的停靠面（工具行 = `@deepseek-ai/dsh-tool-ask-user`） | HITL1 = 三问卡 + 计划确认卡两段（`quick_factual` 豁免）；HITL2 = 终局审阅；操作 = [guides/61 §3/§4](./guides/61-run-playbook.md) |
| web 搜索/抓取 | `dsh-tool-web` + search/fetch provider（本仓：DeepSeek Search API + 抓取回退 provider） | `packages/web/tool-web` + `web-deepseek-api`（`deepseek-search-api`）+ 本包 `deepseek-fallback-fetch`（本地 `web-fetch-http` → Fetch API）；选择 = [D30](./decisions.md) / [D31](./decisions.md) |
| 成品交付 | `present` 工具 explicit deliveries | `packages/fs/tool-present` + `client/ui-deliverables` |
| 读者版终稿 | reader-facing final（本仓原生；canonical 的派生压缩，不是第二份事实） | `final/readable.md` → `final/readable-vN.md`（同版交付件）+ lead 的 `reader-final` skill + node-gate 门C + [design/40](./design/40-research-cockpit.md) 终稿页签双视图 |
| 研究工作区 | 会话 cwd + `agent-instructions` 注入手册 | `packages/context/agent-instructions` |
| **研究驾驶舱（Research Cockpit）** | —（本仓原生套件名）：观察面 client 套件（观察面伞下最频改的一件） | `packages/deep-research-pack/src/client/` + `src/lib/`；分层与构成正本 = [design/40](./design/40-research-cockpit.md) |
| 开发 harness / 运行 harness | development harness / runtime harness（同一仓库的两面：前者让 agent 看懂、修改、验证自己；后者是产品运行框架） | 本仓两面并存：`packages/deep-research-pack/` 是 runtime 面，`AGENTS.md` + `docs/` + `notes/` + `.agents/skills/` + 门禁是 development 面 |
| 运行形态 M1/M2/M3 | run forms（安装 / 独立开发 / 移交） | [guides/65](guides/65-run-forms.md)；与 [evaluation §3](evaluation.md) 的里程碑 M1/M2/M3+ **不同前缀语义**——跨文档引用写「运行形态 M1」 |
| 参与阶梯 | participation ladder（S0 组合 → S1 扩展点 → S2 capability seam → S3 core loop；前缀 S 与评估五面 L 分离，D27） | [guides/62 §参与阶梯](./guides/62-plugin-authoring.md)（本仓版本：S0 配置行 / S1 preset+skill+观察面 client 面 / S2 尚无 / S3 归上游） |
| 程序化工作记忆 | procedural memory（可复用工作流 + 专门判断标准） | `.agents/skills/`（开发技能：换 pin / 加角色 / 写门禁 / 跑 run / 改轨道 / 交付自审 / 复现间歇缺陷——清单 = 盘上目录）——与产品内 runtime skills（`presets/*/skills/`）严格分家 |
| plugin / bundle / profile | plugin = 导出 `apply(ctx)` 的模块；bundle = 你编写与分发的单位（`dsh.bundle`）；profile = 用户 `dsh --profile` 启动的环境（`dsh.profile`）——**Nothing is both** | bundle = `packages/deep-research-pack/cordis.patch.yml`；profile = `runtime/harness-home/profiles/research/`（镜像；源 = pack——`boot-run.sh` 从 pack 重建；overlay 只是源码域冒烟通道的生成物） |
| 配置行（bundle 行 / preset 行 / 工具行） | patch/overlay 的条目：`- id:` 定向替换、`- insert:` 新增（cordis.patch.yml 与 presets/*.patch.yml 的每一行） | [guides/62 §词汇](./guides/62-plugin-authoring.md)——与 run bundle（一次调研的变量容器，见下行消歧行）无涉 |
| run bundle（一次调研的变量容器） | —（本仓原生概念，源头 = DEEP_RESEARCH_HARNESS run bundle） | 载体 = `research-workspace/drt_<slug>/`（契约 = 研究手册目录约定）；**消歧**：DSH "bundle 行"（cordis.patch.yml 配置行）≠ run bundle（一次调研的变量容器），后者禁缩写成裸 "bundle" |
| 独立预期（金标准） | oracle（测试判定的独立来源——刷新录制不许顺手改写判定标准；record/refresh ≠ 接受新行为） | vendor `docs/testing.md`（verify the world, not the self-report）+ `snapshots/AGENTS.md`；本仓载体 = snapshot-replay C 层渲染金标准 + [tests/AGENTS](../tests/AGENTS.md)「fix fixtures, not normalizers」 |
| 真实组合 | real composition（经 Loader 与真实入口组合，只 mock 外部服务/非确定输入；mock-only 单测证明不了组合成立） | vendor `docs/testing.md`（test the real entry path）；本仓载体 = L1 真挂载 + L2 安装域 |
| 语义评审（对抗自审） | semantic review（意图-实现-文档-证据对齐的判断层，可由 agent 执行，不可机械化） | vendor `dsh-code-review` skill；本仓载体 = [reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md) + 收尾对账（[guides/60 §4](guides/60-dev-loop.md)） |
