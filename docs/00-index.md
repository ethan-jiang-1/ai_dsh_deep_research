# 00 · 文档地图、组织原则与决策台账

本目录是"DSH Deep Research 插件"项目的文档层。性质：**当前合同 + 设计依据**——实现开始后，
随代码同 diff 维护"现在为真"的部分；单次决策与时间线归 `notes/`。

## 文档组织原则

**docs/ 按"性质"分层，不按"时间"分层**（沿 ai_dsh_company D10）：时间维度的东西（初始意图、
提案、已废方案）住 `notes/`；按时间分目录必然长出"烂尾层"。

| 层 | 目录 | 性质 | 生命周期 |
|---|---|---|---|
| 导航 | 本文件 | 地图 + 台账 | 活（每决策/每新文档更新） |
| 合同 | [evaluation.md](./evaluation.md) | **验收怎么判**（五面） | 活（变更须 D 号） |
| 设计 | `design/` | **为什么**：机制依据、方案取舍 | 稳定；被推翻时归档并记 D 号 |
| 计划 | `plans/` | **接下来**：队列 | 被实现逐条吞掉（完成即离队） |
| 指南 | `guides/` | **怎么操作**：开发环 | 活（随操作方式演进） |

## 文档地图

| 文档 | 层 | 回答什么 |
|---|---|---|
| [evaluation.md](./evaluation.md) | 合同 | 评估五面（L0 结构/L1 挂载/L2 安装/L3 领域/L4 交付）与里程碑矩阵——**先于框架定案** |
| [design/10-architecture.md](./design/10-architecture.md) | 设计 | repo 形态与组合层（单包四角色）；通道选型（agent-team 主通道）；工具面；偏离登记 |
| [design/20-roles.md](./design/20-roles.md) | 设计 | 四角色内容：职责 owner 表、persona 要素、skills 清单、信噪比策略落点 |
| [design/30-methodology-mapping.md](./design/30-methodology-mapping.md) | 设计 | **方法论映射**：codex Deep Research harness 内核 → DSH 载体（L3 领域面的核心载体） |
| [plans/roadmap.md](./plans/roadmap.md) | 计划 | 队列（条目按主题命名、完成即离队）+ 搁置池 |
| [guides/60-dev-loop.md](./guides/60-dev-loop.md) | 指南 | 开发环：六步闭环、面选择表、双 home、密钥 |

## 决策台账

### 已定（写代码前不再讨论）

| # | 决定 | 依据/出处 |
|---|---|---|
| D1 | **自写包 = 1 个**（`deep-research-pack`）；行多包少，角色是 preset 目录不是包 | company D1 同构；[10-architecture](./design/10-architecture.md) |
| D2 | **角色 = 4 个**：Lead（主编）/ Scout（侦察）/ Analyst（分析）/ Critic（核查）；wave2 综合归 Lead（最薄队形；专职 synthesizer 视 run 实测再拆） | 用户指令（多角色分工）；[20-roles](./design/20-roles.md) |
| D3 | **协作主通道 = Agent Teams**（spawn_teammate 组队 + 任务板）；单点快捷查证走 one-shot subagent——续驶语义归 team（company D18 实证边界：team-scoped 会话里 continuable child 不可达，不重蹈） | 用户指令；company D18；[10-architecture §3](./design/10-architecture.md) |
| D4 | **方法论内核 = codex harness 考古十条**（两 HITL 锚点 + 三波 + 证据身份链 + 声明式质量门 + 反伪造审计）；markdown 控制面/CLI 状态机/手工队列**弃用**，DSH 原生载体承接 | [方法论映射](./design/30-methodology-mapping.md)；[harness 考古报告](../notes/research/2026-09-24-deep-research-harness-analysis.md) |
| D5 | **证据身份链 = 唯一自建残留**：evidence frontmatter 文件契约 + critic 狩猎，不做 CLI 引擎（完成判定锚定文件事实而非账本外观——codex 教训 1 的轻量等价物） | [30 §证据身份链](./design/30-methodology-mapping.md)；evaluation.md L3 判据 3 |
| D6 | **评估先行**：docs/evaluation.md 五面合同先于框架定案；完成定义 = 该面最小真检查；goal complete 的唯一条件 = 里程碑矩阵全绿 | 用户指令；company D15 |
| D7 | **首版 = 纯配置包**：零自写 JS、零构建、无 client 面；UI 用现成 `ui-agent-team` | company D5 同教义（第 0 天零自定义 JS） |
| D8 | **迭代单位 = 垂直轮 + 八成把握先行**：最薄全路径先行 → 逐轮加宽；不追求一次想透 | 用户指令（迭代纠错优先于完美规划）；company D11 |
| D9 | **web 工具行 = bundle + preset 双声明**：bundle 层 host 共享（含非 preset 会话），preset 层自包含教义（company R1 实证：不声明则会话无工具）；行 config 确切写法未实证 → 队列「web-tool-rows 实证」 | [10 §4](./design/10-architecture.md)；roadmap 队列 |
| D10 | **vendor submodule 延后**：首版无构建需求（纯配置包）；机制权威暂借 `/Users/bowhead/ai_dsh_company/vendor/dsh`（同一钉住 tag，只读）；verify 的 vendor-pin 门禁随队列条目启用 | [偏离登记](../notes/implemented/2026-09-24-r1-scaffold.md)；队列「vendor-submodule-and-pnpm-dsh」 |

### 待定（阻塞项标 ⛔）

| # | 问题 | 归宿 |
|---|---|---|
| Q1 | web 工具行的确切 id/config（provider 行写法、搜索 provider 是否要 API key） | 队列「web-tool-rows 实证」（对照 vendor shipped web-app bundle） |
| Q2 | agent-team spawn_teammate 成员会话的 preset 挂载行为（成员拿到谁的组合） | 队列「preset-smoke 真跑」 |
| Q3 | `dsh plugin add` 的目标 profile 形状与 release-smoke 完整流程 | 队列「release-smoke」 |
| Q4 | 专职 synthesizer 是否独立成角色（背景：[20-roles §4](./design/20-roles.md)） | 队列「首个完整研究 run」实测 |
| Q5 | 多 analyst 并行时的 topic 争用（背景：[20-roles §4](./design/20-roles.md)） | 队列「首个完整研究 run」实测 |
| Q6 | floor 数值门禁是否需要机械化（背景：[30 §4](./design/30-methodology-mapping.md)） | 队列「首个完整研究 run」实测 |

## 术语映射（本项目 ↔ DSH 官方 ↔ vendor/dsh 源码）

| 本项目 | DSH 官方 | vendor/dsh 落点 |
|---|---|---|
| 研究角色（Lead/Scout/Analyst/Critic） | agent preset（`presets/<id>/agent.cordis.yml` + persona + skills） | `packages/preset/agent-presets` + `packages/preset/persona` |
| 研究团队 / 组队 | Agent Teams（`spawn_teammate` / 任务板，experimental） | `packages/experimental/agent-team` + `tool-agent-team` + `docs/subsystems/agent-team.md` |
| 研究工人（一次性查证） | one-shot/continuable subagent（`dsh-tool-subagent`, spawn provider） | `packages/subagent/tool-subagent/README.md` |
| 研究方法论的载体 | skill（`presets/<role>/skills/<n>/SKILL.md`，硬隔离） | `packages/skill/skill-filesystem` |
| web 搜索/抓取 | `dsh-tool-web` + search/fetch provider | `packages/web/tool-web` + `web-search-deepseek` + `web-fetch-http` |
| 成品交付 | `present` 工具 explicit deliveries | `packages/fs/tool-present` + `client/ui-deliverables` |
| 研究工作区 | 会话 cwd + `agent-instructions` 注入手册 | `packages/context/agent-instructions` |

## 外部研究材料登记（repo 外，只读引用）

| 材料 | 内容 | 吸收落点 |
|---|---|---|
| `/Users/bowhead/ai_tool_deepresearch/`（codex Deep Research harness 全仓） | 11-phase 生命周期 / wave 语义 / gate 体系 / 证据四层 / 反伪造教训 | 考古报告 `notes/research/2026-09-24-deep-research-harness-analysis.md` → 映射表 design/30 |
| `/Users/bowhead/ai_dsh_company/`（DSH 插件工程范式仓） | 包结构 / patch 语法 / preset 教义 / verify 门禁 / 双 home / 垂直轮 | 解剖报告 `notes/research/2026-09-24-dsh-plugin-repo-anatomy.md` → design/10 + scripts/verify.mjs + dev/env.sh |
