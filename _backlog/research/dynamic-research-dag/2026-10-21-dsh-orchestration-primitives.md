---
topic: 动态研究 DAG 与多层 subagent 编排
intent: 为动态研究 DAG 设计卡提供同 pin 的 DSH 原生机制盘点、现仓编排现状、能力边界与候选方案。
---

# 动态研究 DAG：DSH 原生机制盘点与本仓落点（2026-10-21）

> 服务 = [_backlog/issues/2026-10-21-dynamic-research-dag.md](../../issues/2026-10-21-dynamic-research-dag.md)。
> 方法 = `vendor/dsh` 钉版 `dsh-v0.2.1-rc.2` 只读源码 + 本仓 preset / run 资产对照；行号 = 该 pin
> 现状，升 pin 后按 [discipline-map](../../../docs/discipline-map.md) 的重审路径复核。
> 分层：**事实**（有源码/文件锚点）/ **推断**（标明）/ **建议**（待拍板）。本材料不做选型决定。

## 0. 一句话结论

- **DSH 没有通用动态 DAG 执行器**，但有三块可组合原语：Agent Teams 的共享任务图（真 DAG，
  平面 roster）、subagent 递归（可带角色 preset）、workflow 脚本（任意控制流，但子代继承父组合）。
- **本仓现在不是用 `workflow` 串起来的**：四 preset + Agent Teams + NODES/文件契约；`topics.md`
  的 `depends_on` 与 Team task 的 `blocked_by` 已经是 DAG 的种子，但图是隐式的、模板化的。
- **最适合本仓的形态 = 以 Team 任务板为调度面的动态工作图**：Lead 写 `plan.md`（canonical），
  把节点物化为带 `blocked_by` 的任务；子层用带 `agentPreset` 的 subagent 补角色与深度；workflow
  暂不做主编排。
- **多层 ≠ 嵌套 Team**：Team roster 是平面且不可嵌套；"多层"要么是工作图的多层依赖（同一块
  任务板），要么是 subagent 递归树（无共享任务板）。两者要分开设计。
- **现状的硬阻塞**：四 preset 未设 `maxDepth`（Host 默认 1）→ teammate 不能再派 worker；未开
  `allowedAgentPresets` → 子代不能按 Scout/Analyst/Critic 组合；`workflow` 未挂载且不能选 preset
  → 从 Lead 直接跑 workflow 会产出 Lead 克隆，破坏角色隔离。

## 1. 先拆三个平面：不要把三件事都叫 DAG

| 平面 | 回答什么 | DSH 载体 | 图语义 | 本仓现状 |
|---|---|---|---|---|
| **工作图**（work DAG） | 哪些研究任务、谁先谁后、谁拥有 | Agent Teams 共享任务板（`blocked_by`） | 有向无环、all-blockers-completed 才 ready、CAS、可 dynamic replan | 已用，但只在少数 task 上显式（critic blocked_by analyst） |
| **agent 层级**（agent hierarchy） | 谁派谁、能派几层、子代是什么角色 | subagent（`maxDepth`、`agentPreset`）；Team 是平面 | 树；Team 不能嵌套；subagent 可递归 | 默认 1 层；未开 preset 选择 |
| **执行脚本**（execution script） | 一次运行里用代码表达 fan-out / 依赖 / 聚合 | workflow（JS + `agent()` / `parallel()` / `pipeline()`） | 脚本内的 await / Promise 图；无 durable 图、无 Team 板 | 未挂载；不适合当主编排器（见 §2.3） |

**推断：** 用户说的"设计 DAG"主要是工作图；"sub agent 可能多层"主要是 agent 层级。两者可以组合，
但不是同一个机制，不能指望一个开关同时解决。

## 2. DSH 原生机制逐项（同 pin 源码）

### 2.1 Agent Teams 任务板 = 真正的 DAG，但不是调度器

**能力（事实）：**

- 任务有 `blockedBy: TeamTaskId[]`，创建/改依赖时做完整图校验：缺依赖、重复依赖、自指、环
  都拒绝（`vendor/dsh/packages/experimental/agent-team/src/task-graph.ts:26-68`）。
- `ready` 的判据 = **所有 blocker 都 completed**；只有 `pending` 且 ready 才能 claim
  （`.../src/task-view.ts:25-28`、`.../src/task-board.ts:164-170`）。没有 OR、条件边、权重。
- 任务转移是 CAS：每次 mutation 带 `expectedRevision`，过期即拒绝；动作含 `claim` / `release` /
  `edit` / `set_dependencies` / `complete` / `reopen` / `reassign` / `delete`
  （`.../src/task-board.ts:123-235`；工具 schema 见 `vendor/dsh/docs/tool-catalog.md:2512` 起）。
- 权限：任何成员可创建任务；`edit` / `set_dependencies` / `complete` / `release` / `reopen` 归
  owner 或 Lead；`reassign` 仅 Lead；`delete` 若有依赖者则拒绝（`.../src/task-board.ts:150-235`）。
- 删除 blocker 前必须先清依赖；`set_dependencies` 可以重写整张局部图——这是动态重规划的机械基础。
- **readiness 不会自动启动 owner**：策略原文 "Task readiness never starts an owner"
  （`vendor/dsh/packages/experimental/tool-agent-team/src/index.ts:41`）。claim / assign / wake
  都要模型动作；`wait_agent` 只观察变化，不会唤醒 inactive 成员（`tool-agent-team/README.md:68`）。
- roster 是**平面**的：只有 Lead 能创建直属 teammate，不能 nested Team、不能 rename/delete
  （`vendor/dsh/packages/experimental/agent-team/README.md:205`）；profile 的 `maxMembers` = 8。
- 任务板 durable 在 **Lead session log**（`team/task` 事件，CAS + 重放），不是 run bundle
  （`agent-team/README.md:104-107,144-148`）；Web 有 roster/task board 投影，但没有"图"视图
  （`docs/subsystems/agent-team.md:56-121`）。
- **恢复边界（关键）：** 本仓的恢复语义是新开 lead 会话、只凭 run bundle 重建
  （`docs/design/50-agent-loop-and-state.md:30-32`）；旧 Lead session 的 Team 任务板不会自动
  迁移到新会话。因此动态图若要跨会话恢复，**图必须落在 bundle**；任务板只是当前会话的执行
  镜像，不能当 canonical。

**边界（事实）：**

- 无自动调度器：Lead 是事实上的 scheduler；teammate 可以自己 list/claim ready 任务，但没有
  机制保证 idle 成员会自动领取。
- 无 nested Team：第二层"团队"不存在；第二层只能是 subagent。
- 无环：审查回边必须编码成新版本节点（`review-r1` → `repair-r1` → `review-r2`）或 reopen，
  不能把 FAIL→修复→复审画成环。
- 任务板不是 run bundle 的 canonical；恢复时以 bundle 文件为准（`docs/design/50-agent-loop-and-state.md:27,32`）。

**对本仓的含义：** 这张板已经能表达"宽搜先于深挖、审查等草稿、综合等全部证据"的工作图；缺的是
把图从 Lead 的临时任务列表提升为可审阅、可恢复、可机械校验的 `plan.md`。

### 2.2 subagent 递归 + 角色 preset = 多层的原生载体

**能力（事实）：**

- `tool-subagent` 配置含 `agentPreset`（默认子代组合）、`allowedAgentPresets`（模型可选 enum）、
  `maxDepth`（绝对深度，0 禁派；省略读 Host 设置，默认 1）
  （`vendor/dsh/packages/subagent/tool-subagent/src/index.ts:90-98`；
  `tool-subagent/README.md:45-70`）。
- 省略 `agentPreset` 时，子代**加入父的当前 preset revision**；显式 id 则挂载独立 preset
  （`vendor/dsh/packages/subagent/subagent/src/child-agent.ts:142,191-200`；
  `tool-subagent/README.md:70`）。
- 每次 start 检查调用者当前 depth；达到 cap 时工具仍可见，但 start 被拒（`tool-subagent/README.md:63`）。
- 子代是独立 agent：completion notice 回父；本地 spawn/fork 子代可收 `send_message` / 继续
  （`tool-subagent/README.md:59-61`；但本仓 Team profile 禁了全局 continuable 控制工具）。
- 只有 in-process spawn 支持 preset 选择；fork / 外部 backend 拒绝（`tool-subagent/README.md:68`）。
- 单个 activation tree 的活跃子代上限 `maxActiveSubagents` 默认 8（root 不占槽；满了拒绝，不排队）
  （`vendor/dsh/packages/subagent/subagent/README.md:53-57`；
  `vendor/dsh/packages/subagent/subagent/src/index.ts:197`）。
- 同一 step 内并行安全工具最多 10 个（`maxParallelToolCalls` 默认 10）；`subagent` 是
  concurrency-safe，所以一条消息里可以同时起多个 worker
  （`vendor/dsh/packages/core/agent-loop/README.md:48,75`；
  `vendor/dsh/packages/core/agent-loop/src/constants.ts:6`；
  `vendor/dsh/packages/subagent/tool-subagent/src/index.ts:275`）。

**边界（事实）：**

- Team teammate **不能**带自己的 preset：`spawnTeammate` 的 `startActivation` 请求没有
  `agentPreset`，默认 composeFrom Lead（`vendor/dsh/packages/experimental/agent-team/src/roster.ts:264-274`；
  本仓 `docs/design/20-roles.md:21-25` 已登记这个继承语义）。
- 子代不是 Team member，不能 claim Team task、不能 `spawn_teammate`；它只能做父给的任务并回结果。
- 递归深度是绝对计数，不是"每层再给 N 层"；所有可能再派的 preset 都要有足够 `maxDepth`。
- 本仓现状：三份含 `tool-subagent` 的 preset 都没写 `maxDepth` / `allowedAgentPresets`
  （`packages/deep-research-pack/presets/{lead,scout,analyst}.patch.yml:84-89,54-59`）→ 实际
  cap = 1，teammate（depth 1）不能再派。

**对本仓的含义：** 这是补"第二层"最干净的原生机制：Lead 或 teammate 用
`subagent(prompt, agent_preset: "scout" | "analyst" | "critic")` 派角色化 worker；worker 的
persona/skills/工具面由 preset 决定，不再靠"读别人的 SKILL.md"来模拟角色。代价是 worker
不在 Team 板上，结果只回父级；第二层的协调归父级。

### 2.3 workflow = 脚本化编排，不是图引擎

**能力（事实）：**

- `workflow` 让模型写一段 JS，用 `agent(prompt, opts?)` 起 subagent，用 `parallel()` /
  `pipeline()` 组合，`phase()` / `log()` 只是进度叙事；脚本最终 `return` 一个 JSON 值
  （`vendor/dsh/packages/workflow/tool-workflow/README.md:28-42,123-161`）。
- `agent()` 的 opts 只有 `label` / `phase` / `provider` / `model` / `schema`；**没有 preset**
  （`vendor/dsh/packages/workflow/tool-workflow/src/index.ts:161`）。
- workflow-ptc 的 `startChild` 调 `subagents.startActivation` 时只传 provider / prompt /
  parent / outputSchema / agentOptions；**没有 `agentPreset`、没有 `maxDepth`**
  （`vendor/dsh/packages/workflow/workflow-ptc/src/host.ts:202-219`）。子代因此走
  "join parent's current preset revision" 默认路径 → **Lead 调用时子代是 Lead 组合**。
- 子代看不到 Team 工具（Team profile README 的 known limitation；`agent-team-profile/README.md:96`），
  也没有共享任务板；中间结果只回脚本，不落 bundle。
- 并发/总量：`maxConcurrentAgents`（0 = CPU 并行度）、`maxTotalAgents` 默认 1000、
  `maxItemsPerCall` 4096；cap 是协作式，不是安全配额（`workflow-ptc/README.md:39-49,155`）。
- 取消即杀进程并 dispose 子代；无整体 elapsed deadline；子代失败对脚本是 `null`
  （`workflow-ptc/README.md:53-61`）。
- 本仓四 preset **都没有声明** `tool-workflow`；base 层有 `workflow-ptc` / `tool-workflow`
  （`vendor/dsh/packages/bundle/base/cordis.patch.yml:400-406`），但 preset 自包含
  （`docs/design/10-architecture.md:47-52`），所以当前 Lead 会话的工具目录里没有 `workflow`
  （最新 lead session 的工具名 grep 亦无此名）。

**边界（事实）：**

- 它是**程序**，不是**持久图**：图只存在于脚本和 session 事件里；没有 task 状态、没有
  readiness、没有 recovery 到"第几个节点"。
- 它不能给子代选角色 preset；从 Lead 直接跑 = 一批 Lead 克隆（含 `ask_user_question` /
  `present` / `goal` 工具面），与本仓"工具面即职责边界"冲突。
- 它没有 Team 的任务板 / 成员 roster / HITL 暂停点；HITL 只能在 Lead 层做，workflow 运行中
  不能停下来等人。
- 脚本没有 `workflow()` 递归 hook（`vendor/dsh/packages/workflow/workflow/README.md:128`）；但
  子代 agent 若挂载了 workflow 工具，可以再起一个**独立** workflow run——这不是嵌套 hook，
  且这条路径不传 `maxDepth`。风险是递归 run 只受每 run 的 agent 总量与 prompt 纪律约束，需要
  显式护栏。
- 没有 journal / resume：脚本、子代进度、中间值都不 checkpoint，进程重启不能续跑
  （`vendor/dsh/packages/workflow/workflow/README.md:127`）。

**对本仓的含义：** workflow 适合**同质、叶级、可并行、无需中途 HITL** 的批量活（例如一次抓
20 个 URL 做抽取）；不适合当整场研究的控制面。若将来要用，最安全的落点是"只挂在一个专用
worker preset 里，不挂 Lead"，让它的子代继承那个 worker 组合，而不是 Lead 组合。

### 2.4 相邻原语：goal / todo / plan-mode / ralph / schedule

| 原语 | 它是什么 | 与 DAG 的关系 | 本仓用法 |
|---|---|---|---|
| `goal` | 跨轮持久目标 + 自动续轮 | 单目标的生命周期，不是图 | Lead 钉住 run，HITL 前 pause / 后 resume（`docs/design/50...:27`） |
| `todo_write` | 单 agent 的整表清单 | 无依赖、无共享、整表替换 | 轮内任务面；不承担研究 DAG |
| `plan-mode` | 实现前的计划评审模式 | 计划是给人看的 prose，不是可调度图 | 与本议题无关（研究 run 不走它） |
| `ralph` | 固定 fresh-agent 循环 | 无依赖图；单目标多轮 | 明确请求才用；本仓未挂 |
| `schedule` | 定时提醒 | 时间触发，不是依赖触发 | 与 run 编排无关 |

**结论：** 不要把这些当成 DAG 原语；它们各自解决生命周期、清单、评审、循环、定时。真正的
DAG 只在 Team task board 上。

### 2.5 与方法论源头对照：codex harness 也不是 DAG

这一点很重要，避免把"动态 DAG"误当成"移植 codex 的现成机制"：

- codex harness 的 `DEEP_RESEARCH_HARNESS/workflows/manifest.json:2-13` 是**固定 phase 清单**：
  instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness →
  rerun → final；每 phase 一个 gate，`enter-phase` 按 `check.next` 自驱动（`RUN.md:28-30`）。
- 委派走 **queue + work-unit**：queue demand → `operate-work-unit claim` → sub-agent task →
  submit → ledger → gate（`RUN.md:44-48`）；work-unit 有 claim/submit/repair 状态机，但 queue
  不是通用依赖图，topic 的依赖只用于 safe-remove 等生命周期判断
  （`command_playbook/operate-topic-state.md:224`）。
- 所以 codex 的形状是"固定阶段 + 队列 + 工单"，不是"按问题现场生成 DAG"。本仓现在基本沿这个
  形状（NODES + Team task），只是把队列换成了 Team 任务板。**动态 DAG 是新增能力，不是补装
  一个已存在的上游模块。**

## 3. 本仓现状：已经有 DAG 的种子，但图是隐式的

### 3.1 已经存在的三张"图"

1. **topic 图**：`topics.md` 的 `scope_role` + `depends_on`。真实 run 例：
   `drt_cn-llm-infra` 的 T4→T1、T5→T2/T3、T6→T1..T5
   （`research-workspace/archive/drt_cn-llm-infra/topics.md:42,52,62`）。这是内容依赖，不是执行图。
2. **team task 图**：Lead 派工时用 `blocked_by` 表达执行依赖。同一 run 的 critic task-4
   blocked_by task-2/3（`.../journal.md:12,42`）。这是执行图，但只存在于 session log 的任务板，
   不在 bundle 里。
3. **NODES 生命周期**：八节点固定顺序 + 一条审查回边（`research-workspace/NODES.md:22-33,50-56`）。
   这是**交付不变量**，不是研究工作的全部形状。

### 3.2 固定化的地方

- `team-assembly` 矩阵按研究类型给固定编制：quick_factual = subagent + critic ×1；
  exploratory_map = scout ×1 + analyst 1–2 + critic ×1；claim_verification = scout ×1 + analyst ×1
  + critic ×1（`packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md:10-16`）。
- `question-patterns.md` 每条模式的"分派结论"直接给花名册与 topic 骨架
  （`research-workspace/question-patterns.md:24,45,65,84,104,125,146,167`）。
- Lead persona 把"组队"写成一次性动作：拆解完成后加载 team-assembly，名单定下来之前不 spawn
  （`packages/deep-research-pack/presets/lead.patch.yml:27`）；没有"图可重写"的显式步骤。

这些不是错误——它们是经过 run 验证的默认值；问题是它们把"默认"写成了"结论"，没有给"按上下文
设计不同的图"留出位置。

### 3.3 缺口清单

| 缺口 | 现状 | 后果 |
|---|---|---|
| 没有一等 plan 工件 | 图散在 `topics.md`、Lead 的 task 创建、journal 散文里 | 无法审阅、无法机械校验、恢复时靠聊天记忆 |
| 节点类型未显式 | 八节点是生命周期，不是可实例化的研究节点 | 不能表达"同一 wave 里 3 个并行深挖 + 1 个二次侦察" |
| 依赖映射不系统 | topic `depends_on` 与 task `blocked_by` 手工对应 | 容易漏边、画成隐式串行 |
| 多层走不通 | `maxDepth` 默认 1，未开 preset 选择 | teammate 不能再派 worker；第二层只能靠 Lead 亲自派 |
| 角色保真靠 prompt | teammate 继承 Lead 组合，读别人的 SKILL.md | 工具面越权（teammate 也有 ask_user/present/goal） |
| 无 plan 门禁 | 只有 NODES/schema-scan/node-gate | 图漏 RQ、悬空依赖、无人拥有的节点不会被机械发现 |
| workflow 未用 | 未挂载；即使挂载也不能选 preset | 少了一个并行执行面，但避免了一个角色污染面 |

### 3.4 顺带发现：`backgroundMode` 是上一 pin 的残留

三份 preset 的 `tool-subagent` 还带 `backgroundMode: one-shot`
（`packages/deep-research-pack/presets/{lead,scout,analyst}.patch.yml:89/59/59`）。该 pin 的
`tool-subagent` Config 已没有这个字段（`vendor/dsh/packages/subagent/tool-subagent/src/index.ts:90-98`；
upgrade guide `vendor/dsh/docs/upgrade-guide/v0.2.1-alpha.1/subagent-activations/guide.md:12-18`），
运行时不会报错，但也不会产生 one-shot 约束。**影响：** "worker 是 one-shot"目前是组合层
（Team profile 禁 continuable 控制工具）+ 用法约定，不是这行 config 的机械保证。做多层设计时
不要把它当成已生效的护栏。

## 4. 设计选项

### A. Team 任务板 = 动态工作图；`plan.md` = canonical（推荐方向）

**形状：** HITL1 后 Lead 写 `plan.md`：节点表（id / kind / question / owner_role / inputs /
outputs / deps / acceptance / budget / depth），把节点物化为 Team task（`blocked_by` 由 deps
映射）；teammate claim / 执行；Lead 按 readiness 调度、按证据重写图；交付仍走 NODES 的不变量。

**优点：** 全部原生；durable（session log + bundle）；Web 可见；CAS 防覆盖；动态加/改/重派；
与现有 HITL / 文件契约 / critic 兼容；无需新引擎。
**代价：** roster 平面（最多 8 人）；Lead 是唯一 scheduler；图中层节点不能自动唤醒 owner；
任务板与 plan.md 可能漂移，需要同步纪律/门禁；第二层 worker 不在任务板上。

**多层怎么办：** 工作图可以任意深（任务依赖），agent 层级用 subagent 递归。两种"多层"分开：
- 需要**另一个 owner** → Lead 加 teammate（受 maxMembers 限制）；
- 只需要**更多搜索/抽取** → 当前 owner 用 `subagent` 派角色 worker（受 maxDepth 限制）。

### B. workflow 当主编排器

**形状：** Lead 写一段 JS，`agent()` 起 scout/analyst/critic，`parallel` / `pipeline` 表达依赖，
最后返回报告。

**优点：** 任意控制流、并发强、结构化输出、一个脚本看全图。
**代价：** 子代继承 Lead 组合（角色污染）；无 Team 板 / roster / HITL 中途暂停；图不 durable；
失败恢复只能重跑脚本；子代看不到 Team 工具；无 `maxDepth` 护栏。**结论：** 该 pin 不适合当
主编排器；除非上游给 `agent()` 加 preset 选择，或本仓接受"专用 worker preset + 严格 prompt"
的降级形态。

### C. 纯 subagent 递归树

**形状：** Lead 用 `subagent` 派角色 worker；worker 再派自己的 worker；结果逐层回传；文件是
共享记忆。

**优点：** 角色保真（preset）；深度灵活；无 Team roster 上限；实现最小。
**代价：** 无共享任务板；跨分支依赖只能靠父级 await / 文件；并行与重试要父级自己管；不可见
第二层的进度；不适合"多 owner 长期协作"。

### D. 混合（A + C，workflow 仅叶级）

**形状：** 顶层工作图走 Team（多 owner、跨分支依赖、HITL、审计）；每个节点内部用 C 做叶级
fan-out；如果将来要批量同质任务，再在专用 worker preset 内挂 workflow。

**优点：** 控制面与数据面分开；角色保真；可观察；可恢复。
**代价：** 两套协作语义（Team vs subagent）需要明确边界；teammate 的 prompt 要写清"什么时候
自己干、什么时候派 worker、什么时候上报 Lead"。

### 4.1 对照表

| 维度 | A Team 工作图 | B workflow | C subagent 树 | D 混合 |
|---|---|---|---|---|
| 依赖图 | 原生 `blocked_by`，DAG | 脚本内表达，非 durable | 父级手写 | A + C |
| 多 owner | 是（≤8） | 否（脚本一个 parent） | 否（树） | 是 |
| 角色保真 | teammate 继承 Lead；worker 可 preset | 子代继承 Lead | 子代 preset | 是（顶层靠 prompt，叶级靠 preset） |
| 中途 HITL | 是（Lead 层） | 否 | 父级可停 | 是 |
| 恢复 | bundle + session log | 重跑脚本 | 父级重建 | A 的恢复 |
| 可观察 | task board | workflow run card | 弱 | 强 |
| 机械门禁 | 可查 task/plan | 难 | 难 | 可查 plan |
| 实现成本 | 中（plan + 纪律） | 中（脚本） | 低 | 中高 |

### 4.2 同一套角色，三种图（把"按上下文设计"具体化）

**例 1：全景对比（宽 → 深 → 交叉 → 合 → 审）**

```text
HITL1
  ├─ N1 scout：厂商 A 的生态/部署面
  ├─ N2 scout：厂商 B 的生态/部署面
  └─ N3 scout：厂商 C 的生态/部署面
        ↓（全部完成）
  ├─ N4 analyst：A 的吞吐与口径
  ├─ N5 analyst：B 的吞吐与口径
  └─ N6 analyst：C 的吞吐与口径
        ↓
  N7 cross-check：单源/同源/反例
        ↓
  N8 synthesis → N9 critic → HITL2
```

Team 编制可以是 1 scout + 2 analyst + 1 critic：N1–N3 由 scout 一个 task 覆盖三个子域，
或由 scout 派 3 个 one-shot worker；N4–N6 由两个 analyst 分领；N7 由 critic 提前做一轮
"反例/单源"预检，或由第三个 analyst 承担。关键不是人数，而是**边**：N4–N6 都等 N1–N3，
N8 等 N4–N7，N9 等 N8。

**例 2：单点事实（快答，几乎无图）**

```text
HITL1（quick_factual）
  → N1 前提/权威源确认
  → N2 官方页抓取
  → N3 独立佐证（仅当"状态判定"类）
  → N4 critic 轻量
  → HITL2
```

不组 scout/analyst 常设编制；N1–N3 可由 Lead 的 one-shot subagent 完成，N4 是轻量 critic。
同一套角色，图缩到 3–4 个节点。

**例 3：未知子域（第二层 agent）**

```text
N1 analyst：主问题（Team task，owner = analyst-a）
  ├─ worker scout：这个子域有哪些玩家/来源？（agent_preset=scout）
  └─ worker analyst：这条反例的原始出处？（agent_preset=analyst）
        ↓
N2 cross-check → N3 synthesis
```

analyst-a 在 N1 内部派两个 depth-2 worker；结果以 completion notice 回 analyst-a，由它写
evidence/。这两个 worker **不在 Team 板上**；如果 Lead 需要看见，analyst-a 可以把子任务
建到同一块板（任何成员都能 create），但只有 owner 能 complete——这是"可见"而非"自动调度"。

这三张图说明：**动态 DAG 不是换一套角色，而是换节点、边、owner、深度与预算**；四角色的
persona/skill 仍是节点的方法论内核。

## 5. 最小原生版（A0，当前推荐先试）

### 5.0 只加一层，不引任何外部依赖

| 改动 | 内容 | 类型 |
|---|---|---|
| `plan.md` | run bundle 内一张节点表：`id / kind / question / owner_role / deps / output / acceptance / budget / depth / task_id`；图是 DAG，回边用版本化节点 | 新模板 + Lead 纪律 |
| `team-assembly` skill | HITL1 后设计执行图：节点类型（broad-scan / deep-dive / cross-check / synthesis / review）、预算、重写规则、调度循环 | 文本 |
| Lead persona | 一句话：HITL1 后写 plan；每次 `wait_agent` 返回后 `team_task_list({ready:true})` → `reassign`；不自己跑搜索 | 文本 |
| preset config | lead/scout/analyst 的 `tool-subagent` 加 `maxDepth: 2` + `allowedAgentPresets: [scout, analyst, critic]` | 配置 |
| NODES / 手册 | `topics.md` 保留内容图；plan 只承接执行图；"组队"节点多一个 plan 输出；plan 进 run bundle 目录约定 | 文档 |
| 门禁 | **先不加**；现有 `schema-scan` / `node-gate` 不动 | — |

**调度循环（Lead 的原生循环）：**

1. HITL1 拍板后写 `plan.md`，按节点建 Team task（subject 带 `N1 ·` 前缀，`blocked_by` 映射 deps）。
2. 把所有 ready 且无 owner 的 task `reassign` 给对应 owner；owner 不在线就 `send_message` 唤醒。
3. `wait_agent`（60–120s）；返回后 `team_task_list({ready:true})`；有新的 ready 就回到 2。
4. 没有 ready、但有 running 的 teammate → 回到 3；没有 ready、也没有 running → 做 Lead 自己的
   synthesis / 收口。
5. teammate 失败/卡住 → `interrupt_agent` + `reassign`（或 `reopen`），journal 记账。
6. 交付仍走 NODES 的 HITL2 / present；plan 是辅助图，不是交付门。

**`task_id` 是当前 Lead 会话的映射，不是 canonical。** 恢复/换会话时按 plan 的 `N` 节点重建 Team
task，再更新 `task_id` 列；不要把旧的 `task-N` 当持久身份。

**二层 worker：**

- teammate 在节点内部需要另一角色时，调用 `subagent(prompt, agent_preset: "scout"|"analyst")`；
  worker 是 depth 2，不能再派；结果以 completion notice 回 teammate，由 teammate 写 evidence。
- 不把 worker 放到 Team 板上；它的产物是父节点的输入，不是独立交付。
- 派 worker 必须带 `agent_preset`；不带 = 继承父组合（Lead 克隆），纪律禁止。

**为什么这算"利用 DSH"：**

- DAG / readiness / CAS / reassign / wait 全是 Team 原生；角色组合是 subagent 原生；durable 是
  run bundle 原生。
- 没有新 store、没有新引擎、没有 workflow、没有外部插件；只多了一张 Markdown 表和一段调度纪律。
- 代价：Lead 是唯一调度者（无自动派发 daemon）；顶层 teammate 仍继承 Lead 组合（角色靠 prompt +
  skill 文件）；worker 的角色是精确的。

### 5.1 “图很深”指哪种深？

| 维度 | 能多深 | 谁限制 | 建议预算 |
|---|---|---|---|
| **工作图依赖深度** | 可以很深：Team task DAG 只查无环，`maxTasks` 256；N1→N2→…→N20 都合法 | Task 数量、Lead 的调度注意力、成本 | 顶层节点 ≤12，关键路径 ≤6 层；超过就拆给 teammate 的子图 |
| **agent 层级** | Lead(0) → teammate(1) → worker(2)；Team 是平面 roster，subagent `maxDepth: 2` | vendor：无 nested Team；subagent 深度上限；`maxActiveSubagents` 8 | 默认 2 层；不要为了“更深”把 maxDepth 加到 3+，协调成本会超过收益 |
| **逻辑子图** | 一个 teammate 可以在**同一块 Team 板**上建子任务（任何成员都能 `team_task_create`），形成分支自己的子 DAG | 只有 Lead 能 reassign；子任务 owner 仍是该 teammate 或它指定的成员 | 需要更深分支时，用“teammate + 子任务”而不是“嵌套团队” |

```text
工作图（可以深；同一块 Team 板）：
N1 侦察 → N2 深挖 → N2a 反例核查 → N2b 原始出处 → N3 交叉验证 → N4 综合 → N5 审查 → N6 交付
                              ↘ N2c 第二来源（并行）

agent 树（默认浅；DSH 原生）：
Lead (depth 0)
 ├─ teammate scout (depth 1)  ── 拥有 N1
 ├─ teammate analyst (depth 1) ── 拥有 N2/N2a/N2b/N2c（子任务可建在同一块板）
 │    └─ worker scout/analyst (depth 2，不在 Team 板上)
 └─ teammate critic (depth 1)  ── 拥有 N5
```

**结论：** 你要的“深”如果是**研究链条深**（多轮侦察→深挖→反例→交叉→综合→审查），完全可行，
而且不需要嵌套团队；如果是**agent 递归很深**（Lead→sub-lead→sub-sub-lead…），DSH 原生不支持
nested Team，subagent 也只能到 `maxDepth`；默认 2 层是刻意选择，不是能力不足。深度优先放在
**工作图**，不要放在 **agent 树**。

### 5.2 动态编排具体“动态”在哪

不是“HITL1 时画一张图然后照跑”，而是 Lead 在运行中按证据重写：

- **加节点**：发现未知子域 → 加 scout 节点；发现单源/冲突 → 加 cross-check 节点；发现证据缺口
  → 加定向补搜节点。
- **拆节点**：一个 analyst 节点太大（多个独立问题）→ 拆成并行子任务。
- **并节点**：两个节点锚点同源、会重复钻同一批来源 → 合并 owner。
- **改边**：新证据让某节点必须先等另一节点 → `set_dependencies`；某依赖不再需要 → 重写依赖表。
- **重派**：owner 卡住/失败 → `interrupt_agent` + `reassign`；节点完成 → 释放/关单。
- **版本化回边**：critic FAIL → 新增 `repair-r1` / `review-r2` 节点，不画环。
- **记账**：每次重写更新 `plan.md` 的节点表 + journal 一行；Team 板是当前执行镜像。

动态的边界：**scope 变更**（HITL1 已批准的范围）仍回人；图内的重写是自主的，不新增交互点。

### 5.3 如果 A0 不够，再加这些（按需，不是前置）

1. **plan gate（只查结构）**：id 唯一、依赖存在、无环、每个 RQ 至少被一个节点覆盖、终局有
   synthesis + review、owner 合法；不发明质量分数。
2. **NODES 重述**：八节点拆成"生命周期不变量"（HITL1、证据链、综合、critic、HITL2、交付）+
   "可实例化的研究节点类型"；回边仍按版本化节点处理。
3. **cockpit DAG 视图**：从 `plan.md` 的节点表画图（company `dag.ts` 的分层算法可参考），纯观察面。
4. **workflow 叶级批处理**：只在专用 worker preset 里挂，不挂 Lead；或等上游 `agent()` 支持 preset。

## 6. 风险、反证与未决

- **反证 1：也许不需要 plan.md。** 如果真实 run 里 Team task board 已经足够表达图，且 Lead
  每次都能从 bundle 重建，那么新增 plan.md 是重复记账。判据：找 2–3 场 run，看病灶是否真的
  出在"图不可见/不可恢复"，而不是执行质量。当前证据只证明"图存在但隐式"，不足以证明"必须
  新增文件"。
- **反证 2：也许多层 agent 树不必要。** 如果第二层只是"多搜几个源"，一个 analyst 自己多跑
  几轮 web_search 更便宜；subagent 递归的协调成本可能高于收益。判据：统计真实 run 中"一个
  owner 需要另一个角色方法"的频率，以及 worker 结果被父级实际采用的比率。
- **反证 3：workflow 可能被低估。** 如果上游很快给 `agent()` 加 preset，或本仓愿意做专用
  worker preset，脚本化 DAG 的并发/成本优势会超过 Team 板。判据：上游 changelog / 新 pin。
- **风险：** teammate 的工具面越权（ask_user/present/goal）仍是 prompt 纪律；plan 与 task board
  双写漂移；roster 8 人上限；task board 无自动调度导致 Lead 成为瓶颈；动态重写图可能破坏
  HITL1 已批准的 scope（需要"scope 变更才回人"的边界）。
- **未决：** plan 的家（新文件 vs 扩 topics.md）；多层形态（工作图 vs agent 树）；是否现在做
  plan gate；是否向上游提 workflow preset 需求；是否接受 teammate 继续继承 Lead 组合。

## 7. 证据索引（同 pin）

| 主张 | 锚点 |
|---|---|
| Team task 是 DAG，环/缺依赖/重复依赖拒绝 | `vendor/dsh/packages/experimental/agent-team/src/task-graph.ts:26-68` |
| readiness = 所有 blocker completed；pending 才 ready | `.../src/task-view.ts:25-28`；`.../src/task-board.ts:164-170` |
| 任务 CAS 与动作集 | `.../src/task-board.ts:123-235`；`vendor/dsh/docs/tool-catalog.md:2512` 起 |
| readiness 不自动启动 owner | `vendor/dsh/packages/experimental/tool-agent-team/src/index.ts:41` |
| roster 平面、无 nested Team | `vendor/dsh/packages/experimental/agent-team/README.md:205` |
| Team 任务 durable 在 Lead session log | `.../agent-team/README.md:104-107,144-148`；`vendor/dsh/docs/subsystems/agent-team.md:56-121` |
| Team spawn 不传 preset / depth | `vendor/dsh/packages/experimental/agent-team/src/roster.ts:264-274` |
| subagent 可带 preset / maxDepth | `vendor/dsh/packages/subagent/tool-subagent/src/index.ts:90-98`；`tool-subagent/README.md:45-70` |
| 省略 preset = join parent preset | `vendor/dsh/packages/subagent/subagent/src/child-agent.ts:142,191-200` |
| Host 默认 maxDepth = 1 | `vendor/dsh/packages/subagent/subagent/src/index.ts:196` |
| workflow `agent()` 无 preset / depth | `vendor/dsh/packages/workflow/tool-workflow/src/index.ts:161`；`vendor/dsh/packages/workflow/workflow-ptc/src/host.ts:202-219` |
| workflow 子代继承父组合 | `.../workflow-ptc/src/host.ts:202-219` + `child-agent.ts:142`（推断链，已在 §2.3 说明） |
| workflow 无 Team 工具 / 无 durable 图 | `vendor/dsh/packages/experimental/agent-team-profile/README.md:96`；`workflow/tool-workflow/README.md:163-174` |
| base 有 workflow 行，preset 未声明 | `vendor/dsh/packages/bundle/base/cordis.patch.yml:400-406`；`packages/deep-research-pack/presets/lead.patch.yml`（无 `tool-workflow` 行） |
| 本仓 topic DAG 实例 | `research-workspace/archive/drt_cn-llm-infra/topics.md:42,52,62` |
| 本仓 task DAG 实例 | `research-workspace/archive/drt_cn-llm-infra/journal.md:12,42` |
| 八节点生命周期 / 回边 | `research-workspace/NODES.md:22-33,50-56` |
| 固定编制矩阵 | `packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md:10-16` |
| 模式库固定分派结论 | `research-workspace/question-patterns.md:24,45,65,84,104,125,146,167` |
| `backgroundMode` 已移除 | `vendor/dsh/packages/subagent/tool-subagent/src/index.ts:90-98`；`vendor/dsh/docs/upgrade-guide/v0.2.1-alpha.1/subagent-activations/guide.md:12-18` |
