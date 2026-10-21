---
topic: DSH 插件生态与外部的动态 DAG 实践
intent: 为动态研究 DAG 设计卡提供生态扫描（DSH 插件与外部框架）及可借鉴/不可借鉴的机制清单。
---

# DSH 插件生态与外部的动态 DAG 实践（2026-10-21）

> 服务 = [_backlog/issues/2026-10-21-dynamic-research-dag.md](../../_archived/settled_issues/2026-10-21-dynamic-research-dag.md)。
> 方法 = 读 DSH 社区插件目录（`dsh-plugin-catalog`，3112 条）→ 关键词筛出 447 条 → 精读 10 个最相关
> README → 对照 4 个外部官方文档。**只读，不安装、不运行**；插件 README 的主张未实测，版本兼容性
> 未逐件核验。DSH 机制事实以 [第一份笔记](./2026-10-21-dsh-orchestration-primitives.md) 的同 pin 源码为准。

## 0. 一句话结论

- 生态里已经出现**多条**"模型生成/执行 DAG"的路线：声明式 DAG 工具、持久 DAG runtime、可视化编排器、
  任务板 + 调度器、递归 planner/worker preset、固定研究循环、自组织 swarm。
- **没有一个**同时满足：DSH Team 板 + 角色 preset + run bundle 文件事实 + 两点 HITL + 可恢复。
  我们要做的是**组合与取舍**，不是找一个现成插件替换。
- 最值得借的不是"画图"，而是**调度、锁、重试、恢复、验收、预算**这些工程护栏；最值得警惕的是
  **自建第二套状态库**与**无界动态图**。

## 1. 扫描方法与证据边界

- 目录源：`https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`（`format: 1`，3112 条，
  2026-10-21 抓取）；市场 UI 为 `dshmarket` 1.66.42（本机 web profile 已装）。
- 关键词：dag / graph / workflow / orchestrat / multi-agent / planner / decompos / task graph /
  pipeline / swarm / supervisor / 编排 / 多智能体 / 任务图 / 规划 / 拆解 / 并行 / 调度 / 团队等。
- 精读（README，非运行验证）：
  - `dsh-tool-orchestrate` — [apheli0os/deepseek-harness-orchestrate](https://github.com/apheli0os/deepseek-harness-orchestrate)
  - `@gm-hz/agent-dag-workflow` — [GM-HZ/agent-dag-workflow](https://github.com/GM-HZ/agent-dag-workflow)
  - `dsh-harness-one` — [chumingjun/dsh-harness-one](https://github.com/chumingjun/dsh-harness-one)
  - `dsh-knj-workflow` — [yangdongzhen590/dsh-knj-workflow](https://github.com/yangdongzhen590/dsh-knj-workflow)
  - `dsh-cortex` — [iguowz/dsh-cortex](https://github.com/iguowz/dsh-cortex)
  - `dsh-swarm-orchestrator` — [linkbag/dsh-swarm-orchestrator](https://github.com/linkbag/dsh-swarm-orchestrator)
  - `dsh-expert-orchestrator` — [mario841859784/dsh-expert-orchestrator](https://github.com/mario841859784/dsh-expert-orchestrator)
  - `dsh-agent-board` — [PPawnsir/task-board-plugin](https://github.com/PPawnsir/task-board-plugin)
  - `dsh-root-planner-preset` — [XiaoOu2024/dsh-root-planner-preset](https://github.com/XiaoOu2024/dsh-root-planner-preset)
  - `@creait/dsh-research-mode` — [CREAIT-nl/dsh-plugins](https://github.com/CREAIT-nl/dsh-plugins)
- **证据等级：** README 主张（可能过期/夸大）；没有安装、没有跑模型、没有核 DSH 版本兼容。
  采用前必须按本仓的 L1 真挂载 / L2 安装档验证。

## 2. 六种形态

| 形态 | 代表 | 核心机制 | 强项 | 硬伤 / 边界 | 对本仓 |
|---|---|---|---|---|---|
| **① 声明式 DAG 工具** | `dsh-tool-orchestrate` | 模型给 `tasks[]`（id/title/prompt/dependsOn/provider/model/schema）；工具先校验 DAG，再通过 `ctx.workflowEngine` 按拓扑层执行；失败/跳过确定传播；maxTasks 64 | 图生成与执行在一个工具调用内完成；schema 化；失败语义清楚 | **不能选 agentPreset**；无 durable 图/恢复；README 依赖 `dsh-workflow-worker-thread`，本 pin 是 `workflow-ptc`（兼容性待验）；子代继承父组合 | 适合**有界子图**；不适合整场研究控制面；若采用需 fork/扩展 preset 选择 |
| **② 持久 DAG runtime** | `@gm-hz/agent-dag-workflow` | `WorkflowTemplate` JSON：节点/边、条件、foreach、子工作流、审批、journal/checkpoint/replay、trigger、SQLite、Canvas；Host-neutral | 真正的 durable DAG：恢复、重放、审计、权限、预算、子流程深度；DSH adapter 适配 0.2.x | 引入**第二套状态库/DSL**；重；`agent.run@1` 用 toolFilter 而非 agentPreset；与 D17（run bundle canonical）冲突 | 作为**参考架构/外部引擎候选**；不建议直接塞进 run bundle |
| **③ 可视化编排器** | `dsh-harness-one`、`dsh-knj-workflow` | 自然语言 → 节点/边 DAG；画布编辑；节点级 retry/timeout/失败继续/断点续跑；条件/并行/HTTP/定时/Webhook；运行历史 | 用户可读、可改、可恢复；产品化程度高 | 独立引擎与状态；重 UI；与 Team/HITL 语义不互通；角色靠 prompt/节点配置 | 借"节点级恢复/可视化"；不借"第二个执行引擎" |
| **④ 任务板 + 调度器** | `dsh-swarm-orchestrator`、`dsh-expert-orchestrator`、`dsh-agent-board` | planner/architect → 任务 DAG → 自动/半自动派发；worker/verifier；review gate；evidence contract；write scopes / 文件锁；看板/Flow；append-only 事件 | 最接近生产：调度、验收、锁、重试、审计都有；`swarm_dispatch` 的节点 schema 很完整 | 多数**自建 store**（JSON/SQLite/Python），不用 DSH Team 板；角色/preset 机制各不相同；重 | 借**调度/锁/验收/看板**；把 store 换成 run bundle + Team 板 |
| **⑤ 递归 planner / worker preset** | `dsh-root-planner-preset` | root planner + `root-planner-worker` preset；delegation 行固定 `agentPreset`；`maxDepth: 2`；`maxActiveSubagents 8`；每个 worker 独立 `_agents/<label>/`；工具面按 preset 白名单；父级验证子级 | **最贴近 DSH 原生多层**：结构化的工具边界 + 独立 preset + 父级决策 | 不是 DAG；父子单向；需要把 Host 的 depth 设成 2；没有 Team 板 | 直接借鉴到我们的 Lead/Scout/Analyst 二层 worker |
| **⑥ 固定研究循环 / 自组织** | `@creait/dsh-research-mode`、`dsh-flock` | research-mode：固定 reviewed loop，先规划，按研究员自报缺口做自适应并行轮次，综合，对抗审阅；flock：无编排者，共享 append-only log，各 agent 自决读写 | 固定 loop 可复用、少犯错；swarm 探索性强 | research-mode 不是动态图；flock 无 HITL/证据契约，不适合本仓 | research-mode 是**重要反证**：稳定 loop 可能优于每次现写图 |

### 2.1 几个值得单独看的细节

**`dsh-tool-orchestrate`（最接近"模型生成 DAG → 执行"的最小实现）**

- 模型输入 `tasks[]`，每项有 `id` / `title` / `prompt` / `dependsOn` / `provider` / `model` /
  `outputSchema`；工具先做完整 DAG 校验，再执行。
- 执行方式是**包内 worker script + `ctx.workflowEngine`**，按确定性拓扑层跑；模型给的 id/prompt/
  依赖/schema 只作为 JSON 数据，不拼进 JS 源码。
- 失败子任务 → `{status:'failed'}`；被失败/跳过依赖阻塞的子任务 → `skipped` + `blockedBy`；
  结果保持原任务序，顶层 `completed|partial|failed`。
- 限制：maxTasks 64 / maxDependencies 16 / maxPromptChars 32768；**无 `agentPreset`**；无持久化/
  恢复；README 要求 `dsh-workflow-worker-thread`（本 pin 是 `workflow-ptc`，需实测）。

**`dsh-swarm-orchestrator`（最接近"研究 DAG 产品"的派发 schema）**

- 一个目标 → architect 审计划 → 并行 builder 按任务 DAG 执行 → reviewer 按 `reviewBy` 判 →
  integrator 收口；live kanban + flow chart；append-only 事件。
- `swarm_dispatch` 节点字段：`id / subject / description / role / blockedBy / reviewBy /
  reviewGate / model / evidence / writes`——这是本仓 `plan.md` 可以直接借的节点 schema。
- evidence contract（files/commands）在关单前机器检查；`writes` 做并发写范围提示；review 拒绝
  回流给 builder；human gate 可把裁决停在看板。
- 任务 agent 是普通 subagent；**成员消息单向**（只能向 dispatcher 报告，不能互相聊）——协调靠
  DAG 依赖与写范围，不靠对话。这对"研究团队要不要自由聊天"是个清晰的反面参照。

**`dsh-agent-board`（把"缺的调度器"补出来的最完整样本）**

- 自己的 JSON 板 + 自动派发心跳；`dependsOn` DFS 环检测；`touches` 文件级排他锁；worker/verifier
  分离；草稿态/发布；epic 父卡 + 子任务自动流转；continuable worker 失败冷复活；token/质量记分卡。
- 关键机制：**自动派发**（`boardMode=auto`）、**文件锁随工作态释放**、**stale claim 由心跳/守望回收**、
  **worker 连续失败计数**、**验收脚本实证**。这些正是 DSH Team 板没有的。
- 它不用 DSH Team 板，而是自己的 store——说明"Team 板缺少调度/锁/验收"不是我们一家的痛点。

**`dsh-root-planner-preset`（二层 agent 的原生范本）**

- 两个 delegation 行都固定 `agentPreset: root-planner-worker`；worker 预设挂 `tool-fs` /
  `tool-pwsh` / `tool-web` / delegation 行；root-only 工具（workflow/present/job_*/plugin_manager/
  schedule_*/cordis_inspect_*/exit_plan_mode）在 worker 上不可见。
- 要求 Host `subagent.maxDepth = 2`；`maxActiveSubagents` 默认 8；root 决定、worker 执行；
  worker 只能写 `_agents/<label>/`；父级用 `verify-session.mjs` 验证 root preset 和每层 depth。
- 这验证了我们"preset + maxDepth 2"的方向；也提醒：**root 会话本身必须用对 preset**，否则
  root 不受约束、子代却受约束（它记录了一次真实误配）。

**`@creait/dsh-research-mode`（反证）**

- 深研究做成一个**固定、经过审阅的 loop**：先规划，再按研究员自报缺口做自适应并行轮次，综合，
  对抗审阅；"轮次预算未覆盖的问题在报告里逐一点名，而不是悄悄丢弃"。
- 它的理由：**"A loop the model rewrites per call re-earns the same mistakes per call."**
- 对本仓的含义：不要默认"每次现写 DAG"一定优于"固定 meta-loop + 动态工作图"。最稳的形态可能是
  **外层固定（HITL/证据/审查/交付）+ 内层动态（节点、依赖、并行、深度）**。

## 3. 横向对照：他们到底在解决什么

| 能力 | ① 声明式 DAG | ② 持久 runtime | ③ 可视化 | ④ 板+调度 | ⑤ 递归 preset | ⑥ 固定 loop |
|---|---|---|---|---|---|---|
| 模型生成图 | 是（JSON） | 是（模板/画布） | 是（自然语言/画布） | 是（dispatcher/architect） | 否（父级决定） | 否（固定 loop） |
| DAG 校验/环检测 | 是 | 是 | 是 | 是 | 否 | 不适用 |
| 自动派发 | 拓扑层内 | 是 | 是 | 是 | 父级手动 | 固定轮次 |
| durable/恢复 | 否 | 是（journal/checkpoint） | 是（节点/运行） | 是（事件/板） | 否 | 轮次预算 |
| 角色 preset | 否 | 部分（toolFilter） | 否（节点 prompt） | 部分（role→model） | **是** | 固定角色 |
| HITL | 否 | 是（审批节点） | 是 | 是（human gate） | 父级 | 固定点 |
| 文件锁/写范围 | 否 | 部分 | 否 | 是 | 工作区隔离 | 否 |
| 证据/验收契约 | schema | 部分 | 否 | 是 | 父级验证 | 报告引用 |
| 成本/预算 | 总量 caps | 是 | 部分 | 是 | 工具预算（可选） | 轮次预算 |
| 第二套 store | 否 | 是（SQLite） | 是 | 是（JSON/事件） | 否 | 否 |

**观察：** 图生成不是难点；**派发、锁、重试、恢复、验收、预算、HITL** 才是。生态里做得好的插件，
都把力气花在后半段；只做"图 + 拓扑执行"的插件，通常停在一次性任务编排。

**另一个观察：** 多数插件**不用 DSH Team 板**。原因不是不知道它，而是它缺：
自动派发、文件锁、attempt 计数、worker/verifier 角色、任务级预算、stale owner 回收。
这反过来说明：如果本仓坚持 Team 板做控制面，就需要**薄薄一层调度/回收/验收约定**补上这些缺口，
或者接受"Lead 手动调度"的边界。

**角色 preset 是反复出现的缺口：** workflow / 声明式 DAG 的 `agent()` 不能选 preset；
Team teammate 继承 Lead 组合；只有 in-process spawn 的 `agentPreset` 和 webhook 的 root preset
能按角色组合。生态的 workaround 是：
- 固定多个 delegation tool 实例，每个钉一个 preset（company、root-planner）；
- 或让 worker 读角色 skill 文件、靠 prompt 模拟（本仓 Team teammate 现状）；
- 或自建 role→model/prompt 路由（swarm/expert）。
**本仓最干净的原生解仍是 `agentPreset` + `allowedAgentPresets`。**

## 4. 外部框架对照（简要）

### 4.1 ADK 2.0：graph workflows + dynamic workflows

- ADK 把 workflow 分成两类：**graph-based**（静态节点/边、路由、human input、data handling）和
  **dynamic**（用代码写编排：循环、条件、递归；`ctx.run_node()` 调子节点；自动 checkpoint，
  resume 时跳过已成功子节点；并行用 `asyncio.gather` / `Promise.all`；HITL 用 `RequestInput`）。
- 关键设计：**动态编排是代码，不是图**；但每个子节点执行都有 checkpoint 和确定性 execution id。
- 对本仓：DSH `workflow` 也是代码编排，但**没有 checkpoint/resume**；ADK 说明"代码编排 + 每节点
  checkpoint"是可行且成熟的组合。若要走 workflow 路线，缺的正是这层持久化。
- 来源：[ADK Dynamic workflows](https://adk.dev/graphs/dynamic/)、[ADK Workflow agents](https://adk.dev/agents/workflow-agents/)

### 4.2 AutoGen GraphFlow：显式 DiGraph + 条件边 + 环

- `GraphFlow` 用 `DiGraph` 控制 agent 执行顺序；支持 sequential / parallel fan-out+join /
  conditional branching / loops with exit conditions；边可带条件；消息过滤（message graph）与
  执行图分离。
- 它**允许环**（用 `activation_group` / `activation_condition` 处理多路径激活），并明确是
  experimental。
- 对本仓：Team task DAG 禁止环，所以审查回边只能版本化节点；若未来想要真正的 review loop，
  需要 workflow/GraphFlow 这类引擎，或者把 loop 放在一个节点内部（critic/analyst 多轮对话）。
- 来源：[AutoGen GraphFlow](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/graph-flow.html)

### 4.3 Magentic-One：Orchestrator + Task Ledger + Progress Ledger

- 一个 lead Orchestrator 制定计划，维护 **Task Ledger**（事实/猜测/计划）与 **Progress Ledger**
  （每步自省：是否完成、下一步派谁）；外层循环更新 Task Ledger/重规划，内层循环派子任务。
- 没有显式 DAG；图从 orchestrator 的决策中涌现。
- 对本仓：这几乎就是"Lead + plan.md + journal.md + Team 板"的另一个说法。它证明**ledger 式
  编排**可以支撑开放式任务；也说明"动态图"不一定非要先画成图。
- 来源：[AutoGen Magentic-One](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/magentic-one.html)

### 4.4 LangGraph：graph + checkpoint + interrupt + subgraph

- LangGraph 的 Graph API 把 workflow 表达为图（节点/边/条件边），并提供 persistence /
  checkpointers / interrupts / subgraphs 等能力；这是"durable graph runtime"的典型形态。
- 对本仓：如果要把动态 DAG 做到可恢复、可中断、可嵌套，这组能力是完整清单；但引入它意味着
  一整套状态/运行时，与本仓"run bundle + DSH 原生"方向冲突。
- 来源：[LangGraph Graph API](https://docs.langchain.com/oss/python/langgraph/graph-api)、
  [Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)、
  [Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)

## 5. 可借鉴清单（按价值排序）

1. **Task Ledger + Progress Ledger**（Magentic-One）→ `plan.md`（图 + 决策 + 预算）+ `journal.md`
   （进度/重规划）+ Team 板（执行镜像）。这比"只画一张 DAG"更抗漂移。
2. **派发节点 schema**（swarm-orchestrator）→ `id / subject / description / role / blockedBy /
   reviewBy / reviewGate / model / evidence / writes`；本仓可映射为 `owner_role / deps / output /
   acceptance / budget / depth`。
3. **自动派发 + reaper + 文件锁**（dsh-agent-board）→ 若要让 Team 板真正跑起来，需要：
   ready 任务自动通知/指派、stale owner 回收、写范围排他（advisory）、worker/verifier 分离。
   这是一层**薄插件**，不是新引擎。
4. **worker preset + maxDepth 2 + 独立工作区 + 工具白名单**（root-planner-preset）→ 本仓二层
   worker 的直接范本；同时提醒 root 会话必须用对 preset。
5. **声明式 DAG 工具**（dsh-tool-orchestrate）→ 适合"一个节点内部的批量 fan-out"：模型给
   tasks[]，工具校验并拓扑执行；但**不能选 preset**，只能在一个角色组合内用。
6. **固定 reviewed loop**（research-mode）→ 外层 loop 固定（HITL/证据/审查/交付），内层图动态；
   避免每次现写脚本重新踩坑。
7. **durable DAG 的不变量清单**（agent-dag-workflow / LangGraph）→ journal、checkpoint、replay、
   条件、foreach、子流程深度、HITL、预算；用清单检查我们的设计，不整体照搬。
8. **可视化**（dsh-task-graph / company `dag.ts` / swarm Flow）→ 观察面，不是控制面；可后置。

## 6. 不建议照搬

- **第二套 canonical store**（SQLite/JSON 板/Python taskboard）：与 D17"run bundle 是研究事实正本"
  冲突；Team 板/session log 可以做执行镜像，但 plan 必须在 bundle。
- **重画布/重 UI 作为前置**：先把控制面跑通，再谈可视化。
- **自组织 swarm 无 HITL/证据契约**：探索可以，交付不行。
- **无界递归/动态图**：必须显式 maxDepth / maxNodes / maxReplan / review 轮数 / 预算
  （cortex 的 6/50/10/3 是很好的数量级参照）。
- **无 schema 的模型生成图**：至少要 JSON schema + DAG 校验 + 失败传播；否则图会静默坏掉。
- **自动派发但没有人工/审查门**：研究质量不能只靠 worker 自报。

## 7. 对本仓的候选（refined，仍未拍板）

- **A′（推荐方向）**：Team 板做工作图 + `plan.md` 做 canonical + 薄调度/reaper + 角色 worker
  preset + 固定 meta-loop。借 ④ 的调度/验收、⑤ 的 preset、⑥ 的 loop。
- **B′**：把 `dsh-tool-orchestrate` 作为**子图执行器**（一个 task 内部），fork/扩展加
  `agentPreset`；不做整场控制面。
- **C′**：引入 `agent-dag-workflow` 做 durable DAG 引擎；能力最全，但与 D17/run bundle 冲突，
  且是第二套状态库；只在"愿意换掉文件事实正本"时考虑。
- **D′**：写一个**薄原生调度插件**（订阅 `team/task` / `agent/status`，自动通知/指派 ready 任务，
  回收 stale owner），把 Team 板补成真正的调度面；这是"充分利用 DSH 机制"的最直接动作，但要
  新增一个插件并承担生命周期/并发/恢复责任。

## 8. 证据与限制

- 插件目录：`dsh-plugin-catalog` index（3112 条）；市场客户端 `dshmarket` 1.66.42。
- 插件 README：上列 10 个仓库；主张未实测；版本/兼容性未逐件核验；部分插件可能是个人项目/实验品。
- 外部文档：ADK 2.0 dynamic workflows / workflow agents；AutoGen GraphFlow / Magentic-One / Teams；
  LangGraph Graph API / persistence / interrupts（页面内容有截断，只取已读到部分）。
- **限制：** 本材料是"生态地图"，不是"选型结论"；采用任何一个插件前，按本仓 L1 真挂载 / L2 安装
  档验证，并核对 DSH pin 兼容矩阵。
