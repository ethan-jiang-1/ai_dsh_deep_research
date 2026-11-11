---
topic: DSH 编排原语与本仓研究编排的原生对齐与 GAP
intent: 用 DSH 委派/编排原语的分层合同校准本仓 Lead/Team/Subagent/Workflow/Goal 用法，找出可证伪的结构性 GAP 与可选修法；不改实现，不重开已定事实。
---

# DSH 编排对齐：本仓研究编排的原生形状与 GAP

> 材料日期：2026-11-11。证据边界：DSH 机制页 + `vendor/dsh/` pinned 源码 + 本仓
> presets/skills/docs/notes + `runtime/harness-home/sessions/` 的本地会话样本。样本是
> 开发机快照（289 个 research-workspace 会话头；20 个 teammate 子会话；53 个角色子会话），
> 不是统计样本，也不是新跑的真模型探针；行为风险是结构推断，不是已观测故障。

## 1. 一句话结论

本仓在**原语选择**上大体是 DSH 原生思路：不造中心调度器；plan 是过程件不是引擎；任务板
只做协调镜像；goal 管跨轮；workflow 只用于同质取证层；深度/容量按绝对值和局部池计算；
workflow 失败不自动重试。这些不是"看起来像"，而是能在组合行、skill 文本和 run 门禁里
找到对应物。

真正的 GAP 不在"选错原语"，而在**主通道的角色组合**：本仓把 Agent Teams 当多角色协作
主通道，但 DSH 的 teammate 只能 composeFrom Lead——teammate 挂的是 **Lead preset**
（Lead persona + Lead 全工具面），scout/analyst/critic 的角色 preset 只在 **spawn 子代**
上生效。角色边界因此从"机器表达的 preset"退化成"派发文本 + 读角色技能文件"。
这不是新发现（`design/20` 与 2026-10-04 Note 已记录并接受），但它的**后果**没有被合同
说透：`design/10 §4` 仍说 critic 的工具面是职责边界的机器表达，而实际 critic teammate
看得到 `ask_user_question` / `create_goal` / `present` / `spawn_teammate` / `subagent`。

第二类 GAP 是**工具面与合同不一致**：Lead 的 `subagent` 工具描述承诺"child 用
`send_message` 回报、可续驶"，但 team 组合把全局控制面换成了 Team-scoped 的
`send_message`（只能发给 Team 成员），角色子代又没有 `send_message`；于是该承诺在
这个组合里是假的。另两个同族问题：`agent_preset` 省略默认继承 Lead（不是安全 worker）；
`workflow` 挂在**所有** analyst 上，而不是只挂 wave executor。

第三类是**合同归属与观察面**：若干 DSH 引擎事实（goal disarm、`timeout:-1`、8 槽、
composeFrom Lead）写在 persona/skill 里，升 pin 时没有单一复核点；驾驶舱画的是
plan × task 图，不是实际委派图（channel/depth/terminal 不可见）。

> Phase 1–3 复核后的严重度改判见 §1.1：当前 **active** 的是 G2（subagent 续驶假承诺）
> 与 G4（workflow 在普通 analyst 上可见 + provenance hash 错配）；G1 降为结构性潜伏。

## 1.1 Phase 1–3 复核后的结论修订（2026-11-11）

本材料 §6 的 G1–G8 是最初的机制推演；Phase 1–3 的证据把其中几条改判了。修订如下
（原始分析保留在后文，避免抹掉推演过程）：

| GAP | 原判 | 复核后 | 关键证据 |
|---|---|---|---|
| G1 角色组合 | P1 设计缺口 | **P2 结构性风险**：压力探针中 critic 零工具调用、明确援引 HITL 纪律，未越界 | [行为证据 §3](2026-11-11-behavior-evidence.md) |
| G2 subagent 续驶 | P1/P2 代码矛盾 | **P1 active**：Lead 按工具描述调 Team `send_message` 到 child id，实际得到 `active teammate "<id>" not found` | [行为证据 §2](2026-11-11-behavior-evidence.md) |
| G3 省略默认 | P2 机制风险 | P2；机制已证可修（默认解析 = worker），剩产品取舍 | [组合证据 §4](2026-11-11-composition-evidence.md) |
| G4 workflow 可见 | P2 潜伏 | **P1/P2 active**：一次 quick_factual analyst 把 workflow 当 SHA-256 计算沙箱（`c91d1525`）；薄 wave executor 工具面可行 | [会话证据 §4](2026-11-11-session-evidence.md)、[组合证据 §1](2026-11-11-composition-evidence.md) |
| G5 角色 skill | P3 已知补偿 | P3；keyless 证明可挂进 `customSkillDirs`，长度 2518–5019 < 8192 | [组合证据 §2–3](2026-11-11-composition-evidence.md) |
| G8 8 槽 | P3 公式缺口 | P3；样本峰值 5，未撞 8 | [会话证据 §5](2026-11-11-session-evidence.md) |

**团队不能整体砍**：20 个 teammate 里 7 个一轮、13 个多轮；critic 复审 3–4 轮是真实
持久协作，一次性 subagent 无法等价替代。正确的转换不是“Team→Subagent”，而是
**协调面/执行面分离**：Team 保留多轮协调，bounded 角色工作走 role-preset subagent。

**真正必须马上修的是 G2 和 G4 的合同面**：

- G2 是假承诺：模型按工具描述行动会真实撞错，不能靠模型自觉。
- G4 是工具/合同错配：analyst 被要求算 sha256（python3 hashlib），却没有 bash/python；
  唯一的 JS 沙箱是 workflow，于是越权。修 workflow 可见性必须同时修 provenance 合同。
- G1/G3/G5/G8 是结构/维护/容量问题，有明确修法，但不构成“今天不改就出事”的硬故障。

据此，Phase 4 已出三张卡并落地归档：①Team/subagent 合同纠偏；②worker/wave executor
preset + 角色 skill 载体；③provenance hash 计算路径合同。详见题名页与 §8。

## 2. 读法与证据边界

### 2.1 DSH 机制页（外部语料，作者本地，不随仓）

读过的承重页（路径相对作者本地的 `deepseek-harness/_digested/delegation-and-orchestration/`，
不随仓）：

| 页 | 取用的结论 |
|---|---|
| `00-map.md` | 六条不变量；原语阶梯；默认挂载状态 |
| `01-one-task-five-ways.md` | 同一任务的五种交付：谁持循环、记忆、结果时机、完成证据 |
| `02-terms-and-planes.md` | 执行面 / 持久面 / 观测面；`completed` ≠ 业务完成 |
| `delegation-primitives/00-map.md` | 三类对象：Agent 编排 / 进程作业 / 计划与账本 |
| `delegation-primitives/01` | workflow 脚本、PTC 进程、fatal vs item-local null、caps、无整体 deadline |
| `delegation-primitives/02` | child = durable Session + 至多一个 Activation；fork 前缀；深度绝对量；控制面半径 |
| `delegation-primitives/06` | Team = 换掉委派工具面的协作模式；readiness 不派工；CAS 任务板 |
| `primitive-selection/02` | 官方升级阶梯；选择面 = 安装面；没有自动升级 |
| `primitive-selection/03` | 官方没说清的空白；explicit-ask 只是 prompt 约束 |
| `composition/01` | 四条通道的能力矩阵；**只有 in-process spawn 能钉独立 preset** |
| `composition/03` | 收窄的唯一杠杆 = spawn + 薄 preset；没有 per-agent toolFilter |
| `composition/04` | 合同四载体；政策 vs 引擎事实；docs 不自动注入；skill 会被 8192 裁剪 |
| `composition/06` | 深度绝对量；容量局部量；没有全局公平调度器 |
| `observation/05` | 委派图是只读投影；持久源；三个缺口词；`parentId` 硬折是反例 |
| `observation/06` | workflow 可复现性、取消、缺失结果；记录不是 checkpoint |
| `observation/07` | 四层证据：声明 / 挂载 / 实际工具面 / 行为；fake 只证明 fake |
| `design-perspectives/03` | 为什么是原语而不是中心调度器；代价与兜底登记 |
| `design-perspectives/04` | 九个陷阱：worker=角色克隆、无执行者声明、抬预算救另一层、续驶代替可读结果等 |

外部叙事的关键纠偏：DSH **没有**按 ready 队列自动派工的中心 executor；真实系统由原语、
workflow 局部控制流、Team 任务图准入、Host schedule、JobRegistry 拼成。不要把本仓的
`plan.md` 误读成 DSH 的执行引擎——它是模型维护的设计图，不是引擎状态。

### 2.2 本仓证据

- 组合面：`packages/deep-research-pack/presets/*.patch.yml`、`cordis.patch.yml`；
- 合同面：`presets/lead/skills/{team-assembly,research-planning,research-brief,question-patterns}/
  SKILL.md`、`content/manual.md`、`docs/design/{10,20,30,40,50}.md`、D2/D16/D17/D28/D40/
  D41/D43/D44/D45；
- 历史决定：`notes/implemented/2026-10-04-teammate-methodology-delivery.md`、
  `notes/archived/2026-09-24-m2-p2-team-preflight.md`、
  `notes/implemented/2026-09-24-m2-p1-run-channel.md`；
- 实际工具面：`runtime/harness-home/sessions/…` 的 `session` / `system/message` /
  `request/header` / `tool/call` 事件（本地样本，不随仓）。

会话样本的取法（可复核，不新增脚本）：

1. `runtime/harness-home/sessions/--Users-bowhead-ai_dsh_deep_research-research-workspace--/*/
   session.v4.jsonl.zstd` 共 289 个 `session` 头；
2. 按 `parentSession` + `delegationDepth` + `agentPreset` 分类：113 个 root lead、20 个
   `agentPreset=lead` 的 depth-1 子会话、23 个 analyst 子会话、30 个 critic 子会话
   （角色子会话合计 53 个：47 个 depth 1、6 个 depth 2）；
3. 20 个 Lead-preset 子会话的 first `user/message` 前 400 字里，5 个自称 scout、
   7 个 analyst、5 个 critic、3 个未出现角色名（20/20 都带 Team 身份 context，
   所以都是本仓说的"teammate"）；
4. 抽读 `0e494cdc-…`（scout teammate）与 `34bbd84a-…`（critic teammate）的
   `system/message`、`request/header.tools`、`tool/call`；
5. 抽读 `session-fec0541d-…`（root lead）的 `subagent` / `send_message` /
   `spawn_teammate` 工具描述与 `spawn` 调用。

## 3. DSH 原生的六条不变量（本材料的判据）

| # | 不变量 | 对本仓的直接含义 |
|---|---|---|
| 1 | **策略随工具走**：使用边界住在工具 description / prompt section，不在部署 persona；docs/README 不自动注入 | 本仓的 Lead persona 是部署政策载体（可），但引擎事实不能只靠它；角色边界若只写在 persona，不是机器边界 |
| 2 | **深度是绝对量**：child = parent + 1；持久 header 是单调 floor；`maxDepth` 是上限，不是预算分配 | Lead/Scout/Analyst 的 `maxDepth: 2` 是绝对上限；workflow 分支也计数；team 成员从 Lead 数 |
| 3 | **只有 in-process spawn 能钉独立 preset**：fork / workflow / team 加入父或 Lead 的组合修订 | 角色 preset 只在 `subagent(agent_preset=…)` 上生效；teammate 不是角色 preset |
| 4 | **委派 / workflow / 作业单元不自动重试**：终态是模型可见结果，重试是父代理的有界策略 | `wave-execution` 的"不重试"是对的；失败要写报告，不能溶成 null |
| 5 | **观测是只读投影**：图不调度、不取消、不写状态；缺数据标 `unavailable`，不伪造 | 本仓 cockpit 只读、不写；但画的是 plan/task，不是实际委派图 |
| 6 | **挂载绿 ≠ 行为绿**：声明 / 挂载 / 实际工具面 / 行为四层各证各的 | 本仓有 snapshot B 与 run 门禁；但"角色工具面"在 team 会话里的实际面没有被四层证据覆盖 |

## 4. 本仓编排的实际形状

### 4.1 原语盘点

| 原语 | 本仓用法 | 与 DSH 原生的关系 |
|---|---|---|
| `todo_write` | 四角色都挂 `tool-todo`，`allowParallelInProgress: true` | 原生；lead 的 plan 不是 todo，二者不混 |
| `subagent` | Lead/Scout/Analyst 挂 `provider: spawn`、`maxDepth: 2`、`allowedAgentPresets: scout/analyst/critic`；critic 故意不挂 | 原生"只有 spawn 能钉 preset"；但 Lead 的组合里 `subagent` 与 Team 的控制面冲突（G2） |
| `workflow` | 只在 analyst preset 挂；`maxConcurrentAgents: 4`、`maxTotalAgents: 8`、`enableRunInBackground: false`；固定配方 `content/waves/lens-fanout.js` | 原生 workflow 的窄用法；但挂在所有 analyst 上而非只挂 executor（G4） |
| `agent-teams` | `agent-team-profile` 层；Lead + 具名 teammate + 任务板 + 邮箱；主通道 | 原生 Team 语义；代价是 teammate 只能 composeFrom Lead（G1） |
| `goal` | 只有 Lead 挂 `tool-goal`；HITL1 后 `create_goal`，HITL2 用 `timeout:-1` 挡轮，交付后 `complete` | 原生跨轮目标；bundle 与 goal 冲突时以 bundle 为准（正确） |
| `plan.md` | Lead 维护 `W<wave>.<index>` 图；`task_id` 映射 Team 任务；`plan/vN` 快照 | 不是原语；是模型维护的设计图，不是 DSH 执行引擎（正确） |
| Team 任务板 | `team_task_*`；readiness 不派工；Lead `wait_agent` + `reassign` | 原生"readiness never starts an owner"（正确） |
| 驾驶舱 | plan/task 投影 + member activity + HITL fold | 原生只读投影；但缺委派图（G7） |

### 4.2 一次 run 的编排链（当前形状）

```text
用户 → Lead（HITL1 两段卡）→ question.md/topics.md/plan.md/protocol.json
     → create_goal（跨轮，active）
     → 组队：spawn_teammate ×N（teammate = Lead preset 克隆）
     → 建 Team task（deps→blocked_by），Lead 派 message / reassign
     → 同质取证层：Lead spawn subagent(agent_preset=analyst) 作为 executor
         → executor 调 workflow（lens-fanout）→ 分支 child（analyst 克隆，depth 2）
     → claim 复核：Lead spawn subagent(agent_preset=critic) ×批，等 settlement notice
     → 综合（Lead）→ critic teammate 写 review.md → HITL2 → final/vN + readable-vN
     → present ×2 → update_goal complete
```

这条链的关键不是"谁在跑"，而是**每条通道拿到的组合不同**：

| 通道 | 子代身份 | 组合来源 | 能拿到的角色 preset？ | 控制面 |
|---|---|---|---|---|
| `spawn_teammate` | Lead 的 child | Lead preset（composeFrom） | **否** | `send_message` / `wait_agent` / `interrupt_agent`（Team 成员名） |
| `subagent(agent_preset=…)` | Lead 的 child | 指定角色 preset | **是**（spawn only） | 无全局 `send_message`（Team 层已禁用；Team `send_message` 只发成员） |
| `workflow` 分支 | executor 的 child | executor 的组合修订（analyst） | **否**（`agent()` 只认 label/phase/schema/provider/model） | 只有 run 返回值 / job；无按分支控制 |
| Team 任务板 | 协调数据 | Lead Session 事件日志 + 投影 | — | `team_task_*`；readiness 不派工 |

## 5. 对齐面：哪些做法确实是 DSH 原生思路

先给结论：**本仓不是"自造编排引擎"**。以下六条是有证据的原生对齐，不应在改进时被误伤。

| 做法 | 为什么是原生 | 证据 |
|---|---|---|
| 不造中心调度器；Lead 用对话 + 任务板派工 | DSH 刻意把路由放在原语里，没有 ready 队列自动派工 | `perspectives/03`；`team-assembly` §事中调度；`research-planning` §5 |
| plan 是过程件，不是执行引擎 | DSH 的 workflow 是动态控制流，没有 durable 图；本仓 `plan.md` 不参与交付门，任务板只是镜像 | `nodes-contract` §plan.md 边界；`design/50` §四类状态 |
| 任务板 readiness 不自动开工；Lead 主动 `send_message` / `reassign` | Team 的原生合同：readiness never starts an owner | `delegation-primitives/06`；`research-planning` §4–5 |
| goal 只做跨轮连续性，交付判据在 bundle | DSH goal 的 `complete` 是模型自报；本仓明确"bundle 冲突以文件事实为准" | `design/50`；`presets/lead.patch.yml:35` |
| workflow 只做同质取证层；不重试；fatal vs null 分清 | DSH workflow 的失败分级与 caps 是引擎事实；本仓 `wave-execution` 逐条对齐 | `wave-execution` §失败、边界与不做 |
| 深度/容量按绝对值和局部池算；不假设全局公平 | DSH 没有全局调度器；深度是绝对量，容量各自限制 | `composition/06`；`team-assembly` §有脚本层时先算槽 |

### 5.1 明确"不是 GAP"的几件事

| 你可能怀疑 | 为什么不是 GAP |
|---|---|
| 没用 DSH plan mode | HITL1 用 `ask_user_question`（DSH 的 stop 面）+ `plan.md` 领域工件；plan mode 不支持两段卡、`timeout`、protocol.json 投影。用 ask_user 是原生选择，不是漏用 |
| 没用 `ralph` / `schedule` / `jobs` | 研究 run 是前台、有人工 HITL 的持久 bundle；ralph 的 fresh-agent 轮间有界报告不适合跨文件证据链；没有 wall-clock / 后台作业需求。默认停在最浅一层是 DSH 的升级纪律 |
| 没给 teammate 钉角色 preset | 不是"忘了"：DSH 的 `spawn_teammate` 没有 preset 字段；2026-10-04 Note 已把"等 vendor 加参"列为搁置方案。这是已知限制，不是配置遗漏 |
| Team 任务板不是 canonical | 本仓明确 plan/bundle 是 canonical，任务板是当前会话镜像；`task_id` 是映射，恢复时重建。这与 DSH 的"任务板是协调数据"一致 |
| workflow 分支不能钉 preset | DSH 的 `agent()` 合法选项是闭集；本仓用 analyst executor 让分支继承 analyst 组合，是在既有 seam 内的适配，不是发明 |

## 6. GAP 台账

> 以下 G1–G8 是最初的机制推演；Phase 1–3 证据对 G1/G2/G4/G5/G8 的改判见
> §1.1。读严重度以 §1.1 为准，本节保留推演与备选修法。

严重度是**设计/证据严重度**，不是线上事故等级：P1 = 主通道的合同与实际不一致，可能影响
角色边界与 HITL；P2 = 有明确机制缝隙、当前样本未观测到故障；P3 = 可见性/维护性/容量
余量。每条都给"证据 / 为什么是 GAP / 影响 / 可选修法 / 判据"。

### G1 · 主通道角色组合缺口：teammate 是 Lead 克隆，角色边界不是机器边界

**症状**：本仓说"四角色 + 角色 preset 硬隔离"，但团队主通道的 scout/analyst/critic
teammate 实际挂的是 Lead preset；角色只由 spawn prompt、teammate 身份 context 和
`read` 角色 SKILL.md 表达。

**证据**：

- 机制：`spawn_teammate` 请求字段只有 `name/description/prompt/context/provider/signal`，
  没有 preset；`roster.ts` 调 `startActivation({ request: { prompt, parent: root } })`
  不带 `agentPreset` → child 走 `composeFrom(childCtx, parent.ctx)`，即 Lead 的当前修订。
  源码：`vendor/dsh/packages/experimental/agent-team/src/types.ts:165-172`、
  `.../roster.ts:264-274`、`vendor/dsh/packages/subagent/subagent/src/child-agent.ts:186-202`。
- 样本：20 个 depth-1 子会话的 `session.agentPreset = "lead"`，且 20/20 都带 Team 身份
  context（"You are teammate …"）；0 个 teammate 的 `agentPreset` 是
  scout/analyst/critic。53 个角色子会话（23 analyst / 30 critic；47 depth 1 /
  6 depth 2）中，depth-1 是显式 `subagent(agent_preset=…)` 的直接子代；depth-2 的
  analyst 是 workflow 分支或 analyst 再派，继承 executor 组合。
- 实际 persona：`0e494cdc-…`（scout teammate）的 `system/message` 第一行仍是
  "你是这支 Deep Research 团队的主编（Lead）"；真正的"你是 scout-1"出现在
  `user/message` 的 teammate 身份 context 与 spawn prompt 里。`34bbd84a-…`
  （critic teammate）同样。
- 实际工具面：critic teammate 的 `request/header.tools` 含
  `ask_user_question`、`create_goal`/`get_goal`/`update_goal`、`present`、
  `spawn_teammate`、`subagent`、`team_task_*`、`wait_agent`。而
  `presets/critic.patch.yml` 刻意没有 ask-user / subagent。
- 同类现象（host 层工具绕过 preset 声明）：一个 `agentPreset=critic` 的 depth-1 子会话
  `00e94a8c-…` 的实际工具面含 `present`，但 `presets/critic.patch.yml` 没声明
  `tool-present`——它来自 bundle 的 host 行。`design/10 §4` 的"lead 独有 tool-present"
  是语义授权（非 lead 的 present = 过程稿），不是可见性边界。
- 合同矛盾：`docs/design/10-architecture.md §4` 写"critic 刻意无：ask-user（静默审查）、
  subagent（聚焦独行）——工具面即职责边界的机器表达"；这句话对 **root critic preset**
  成立，对 **critic teammate** 不成立。`docs/design/20-roles.md §0` 已记录
  "teammate 会话加载的是 Lead 的组合……名册角色名 ≠ 该会话加载的 preset"，但
  `design/10` 的措辞没有带这个限定。
- 历史决定：`notes/implemented/2026-10-04-teammate-methodology-delivery.md` 决定用
  "派发第五件：开工先 read 角色技能文件"补偿；效果终验 4/4 队友技能内容到达，门L PASS。
  也就是说**方法论到达是有效的**，缺的是工具边界与身份一致性。
- 未观测到故障：在 20 个 teammate 会话里，没有一次 `ask_user_question` /
  `create_goal` / `present` / `spawn_teammate` / `subagent` 调用；它们主要用
  `team_task_*` / `send_message` / `wait_agent` / web / fs。风险是**结构性的、潜伏的**，
  不是已发生的错误。

**为什么是 GAP（而不是"已知限制所以没事"）**：

1. DSH 的承重结论是"只有 spawn 能收窄；team 成员 = Lead 组合"。本仓把 team 当主通道，
   就必须接受"主通道的角色边界是政策，不是组合"；但当前合同同时声称"工具面 = 职责边界
   的机器表达"，两者不能同时为真。
2. 角色边界不是审美问题：critic 能看到 `ask_user_question`，就可能造出第三个 HITL 点；
   能看到 `create_goal`，就可能撞 authority 拒绝；能看到 `present`，就可能把过程稿
   当交付卡。当前样本没发生，不等于组合上不可能。
3. 这不是要推翻 D2"多角色 + agent team"；而是要求**把"角色"与"组合"两个事实分开写**：
   角色是方法论/职责，组合是 Lead 克隆；角色边界靠派发合同 + 人工验收，不靠 preset。

**可选修法**：

- **A（便宜，建议先做）合同纠偏**：在 `team-assembly` 的派发五件里加"角色边界"一条：
  每份 spawn prompt 明确"你是 teammate，不是 Lead；不得调用 `ask_user_question` /
  `create_goal` / `present` / `spawn_teammate`；需要拍板写 gap 给 Lead；`subagent` 只在
  任务明确要求时用"。同步修 `design/10 §4` 的措辞（区分 root preset 与 teammate 会话），
  并在 `design/20` 把"名册角色名 ≠ 会话 preset"提升为显式合同。成本：文本 + 一次
  snapshot B 重录；不改组合。
- **B（中，需产品决定）worker preset 包**：见 §7 Package B。它不解决 teammate 的角色
  preset（vendor 没这字段），但能给"实际干活"的 depth-2 worker 一个薄组合，减少
  teammate 亲自用 Lead 全工具面的必要。
- **C（战略，不建议现在做）通道迁移**：把角色工作改成 `subagent(agent_preset=…)` 为主，
  team 只留 Lead + 协调者。它能让角色边界重新变成机器边界，但会丢掉 team 的持久多轮
  协作与任务板，推翻 D2/design/10 的主通道选择。只有在"角色工具边界"成为硬产品要求时
  才值得。

**判据**：A 的判据 = `team-assembly` 文本 + `design/10` 限定 + spawn prompt 样本；
B/C 的判据 = 一次真 run 的 `request/header.tools` 证明 teammate 或 worker 的实际工具面
符合合同，且 `ask_user_question` / `create_goal` 不再出现在不该出现的会话里。

### G2 · subagent 控制面承诺与 Team 组合不一致（新缝隙，建议尽快修合同）

**症状**：Lead 的 `subagent` 工具描述说：

> "The child reports results with `send_message`; use `send_message` to steer it while
> running or continue its conversation after it finishes."

但在 team 组合里：

- 全局 `send_message` / `interrupt_agent` / `list_agents` 被 `agent-team-profile` 禁用；
- 可用的 `send_message` 是 Team-scoped，target 必须是 `spawn_teammate` / `list_agents`
  返回的 **Team 成员**；subagent child 不是 Team 成员；
- 角色子代（critic/analyst preset）本身没有 `send_message`，无法主动回报；
- 实际到达父级的是 manager 的 settlement notice（"closing message"），不是 child 的
  `send_message`。

**证据**：

- Lead 会话 `session-fec0541d-…` 的 `request/header.tools` 里 `subagent` 描述含上述句子；
  `send_message` 描述是 "Send one message to another Team member… target returned by
  spawn_teammate or list_agents"。
- `vendor/dsh/packages/experimental/agent-team/src/roster.ts:36-53`：
  `sendMessage` 按 Team 成员名解析；找不到抛 `TEAM_MEMBER_NOT_FOUND`。
- `vendor/dsh/packages/experimental/agent-team-profile/cordis.patch.yml:4-14`：禁用
  `tool-subagent-control` / `tool-subagent-list-agents` / `tool-subagent` / `tool-subagent-fork`。
- `presets/critic.patch.yml` 工具面没有 `tool-subagent-control`；critic child 没有
  `send_message`。`presets/analyst.patch.yml` 同样。
- D16 / `design/10 §3` 仍说"subagent 强制 one-shot / 续驶语义归 team"；当前 pin 的
  `backgroundMode` 已不存在（`tests/pack/presets.test.mjs:127-142` 明确断言"无 stale
  backgroundMode"），provider 的 continuable 能力仍在。实际是"provider 可续，但组合层
  不可达"，不是"配置成 one-shot"。

**为什么是 GAP**：这是 DSH 原生工具描述与本地组合叠加后的**假承诺**。模型按工具描述
行事，可能：等一个不会来的 `send_message`；对 subagent child 调 Team `send_message`
得到 `TEAM_MEMBER_NOT_FOUND`；或者误以为 child 还能续驶，继续派活。它不是"模型不按纪律"，
而是合同本身在误导。

**可选修法**：

- **A（建议）合同纠偏**：在 `team-assembly`（或 Lead persona 的近邻段）加一句：
  "本组合下 subagent child 不是 Team 成员；Team `send_message` 不能寻址它；把 subagent
  当 one-shot，以 settlement notice 为准；不要对它调 `send_message`/`interrupt_agent`。"
  同时把 D16/`design/10 §3` 的"强制 one-shot"改成"provider 可续但控制面不可达 →
  实际 one-shot"，避免升 pin 时继续误读。
- **B（证据）**：加一个 keyless 的会话扫描/门禁，检查 Lead 的 subagent child 是否有
  `send_message` 调用、是否有 `TEAM_MEMBER_NOT_FOUND`；作为 run 级审计，不阻断。
- **C（上游）**：向 DSH 提"tool-subagent 的 description 应按 provider/组合是否可达
  send_message 分叉"；本仓不能改 vendor。
- **D（不推荐）**：从 Lead preset 移除 `tool-subagent`。它会解决假承诺，但会让
  `subagent(agent_preset=critic)` 的 claim 复核（D44）失去唯一通道；除非同时改 claim
  复核到 Team，代价更大。

**判据**：Lead 的 prompt/skill 里出现上述 one-shot 合同；一次真 run 里 Lead 不再对
subagent child 调 Team `send_message`；会话扫描零 `TEAM_MEMBER_NOT_FOUND`。

### G3 · `agent_preset` 省略默认继承 Lead（角色克隆的默认入口）

**症状**：`subagent` 的 `agent_preset` 是可选参数；省略时 child 加入 **父当前 preset**
（Lead）。本仓合同说"worker 必须带 agent_preset"，但这是文本，不是默认值。

**证据**：

- `vendor/dsh/packages/subagent/tool-subagent/src/preset-selection.ts:18-24`：
  `agentPreset` 是部署默认；省略时继承父。
- 同文件 `:46-49` 的模型可见措辞：没有部署默认时 "Omit to inherit the parent agent's
  current preset."；`:85-95` 的 `resolve` 在未传时返回 `config.agentPreset`（undefined
  = 继承）。
- `presets/lead.patch.yml:93-102` 只配了 `allowedAgentPresets`，没有 `agentPreset`；
  `request/header` 的 `agent_preset` schema 的 `required` 只有 `description`/`prompt`。
- 样本里 47 个 depth-1 角色子会话全部显式带了 preset（23 analyst / 30 critic 中的
  depth-1 部分；6 个 depth-2 是继承 executor 组合），所以当前**没有
  观测到**省略导致的 Lead 克隆；但这是纪律的功劳，不是组合的保证。

**为什么是 GAP**：这是 DSH 文档自己点名的第一陷阱（"worker = 角色克隆"）。本仓的主通道
已经是 Lead 克隆，如果 subagent 再省略 preset，就会在 depth-2 再造一个 Lead 克隆，
带 team/goal/ask 工具面，违反角色边界与深度预算。风险是潜伏的，但修复成本低。

**可选修法**：

- **A（便宜）默认 worker**：设 `agentPreset` 指向一个薄 worker preset（见 Package B）。
  省略时至少不是 Lead 克隆；角色任务显式传 scout/analyst/critic。需要新 preset。
- **B（更便宜）证据门**：在 `verdict-audit` 同族加一个 `delegation-audit`，扫
  `subagent/catalog` / descriptor，凡 Lead 派出的 subagent child 没有
  `agent_preset` 就记 WARN/FAIL（按 run 契约日断代）。这是事后证据，不是运行时拦截。
- **C（最便宜）合同加强**：`team-assembly` 已写"worker 必须带 agent_preset"；再加
  一句"省略 = Lead 克隆（不是安全默认）"，并给一个反例。成本最低，但仍靠模型。
- **D（不推荐）设默认 critic/analyst**：会让省略在 scout 任务上选错角色；不如薄 worker。

**判据**：`request/header` 的 `agent_preset` 描述不再出现 "Omit to inherit the parent"
（如果设了默认）；或 `delegation-audit` 对省略零命中；或真 run 样本里 100% 显式。

### G4 · `workflow` 挂在所有 analyst 上，而不是只挂 wave executor

**症状**：`workflow` 与 `tool-workflow` 在 `presets/analyst.patch.yml` 里，所有 analyst
会话（包括普通 analyst worker 与 workflow child）都能看到 `workflow`。但本仓的合同是
"只有 Lead 的 brief 点名 `W<n> 脚本扇出`、计划卡已授权时才用"。

**证据**：

- `presets/analyst.patch.yml:59-77`：workflow engine + tool 在 analyst preset 内；
  `maxConcurrentAgents: 4`、`maxTotalAgents: 8`、`enableRunInBackground: false`。
- `wave-execution` §开头：只有 Lead 的 brief 明确说"plan 的 `W<n>` 是脚本扇出、计划卡
  已点名"时才执行；没有点名就回"未授权，停在计划层"。
- `research-brief` §计划确认卡：授权行 `W<n> 扇出 ×N` 是 workflow explicit-ask 的
  唯一授权点。
- 样本：23 个 analyst 子会话里 3 个调用过 `workflow`（`6b5bd556-…`、`c91d1525-…`、
  `ff73f513-…`），其余 20 个没有。没有证据表明这 3 个越权；它们很可能是被点名的
  executor。**未观测到未授权使用**，但工具面是全局可见的。

**为什么是 GAP**：DSH 的 explicit-ask 是 prompt 约束，不是机械闸；本仓把它落成"run 级
授权 + 角色级合同"，但工具面没有按执行器收窄。一个普通 analyst worker 在长任务里看到
`workflow`，理论上可以自行发起；depth 上限会挡住它再扇出（child depth 3 > 2），但
它仍可以跑一个同层 workflow，造成"未经计划卡授权的脚本层"。这不是当前故障，是
**授权面大于使用面**的结构缝隙。

**可选修法**：

- **A（原生收窄）专用 executor preset**：见 Package B。把 workflow 只挂在
  `analyst-wave`（或 `research-worker`）上；Lead 只在授权时 spawn 它；普通 analyst
  没有 workflow。workflow child 继承 executor 的薄组合，也不会再看到 subagent/goal/team。
- **B（合同）**：在 `team-assembly`/`research-planning` 明确"workflow 只允许 executor
  调用；普通 analyst 看到也不得调用"；这是现有文本的加强版，成本低，但仍是文本。
- **C（证据）**：在 `delegation-audit` 里核"workflow 调用者的 agentPreset / 会话角色
  是否是 executor"；未授权调用记 WARN。
- **D（不推荐）移除 workflow**：会丢掉 D45 的脚本层；除非产品决定不做同质扇出。

**判据**：普通 analyst 的 `request/header.tools` 不含 `workflow`；或审计对未授权
workflow 调用零命中；或真 run 里所有 workflow 调用都来自计划卡点名的 executor。

### G5 · 角色 skill 未进 teammate 的技能目录（已知补偿，路径/裁剪风险）

**症状**：teammate 的 `available_skills` 只有 Lead 的技能（nodes-contract /
question-patterns / reader-final / research-brief / research-planning / synthesis /
team-assembly / rerun-triage）；scout/analyst/critic 的技能不在目录里。派发 prompt 用
绝对路径让 teammate `read` 角色 SKILL.md。

**证据**：

- `0e494cdc-…` 的 `user/message` 里 `<available_skills>` 只列 Lead 技能；spawn prompt
  第一段要求 `read .../presets/scout/skills/lead-mapping/SKILL.md`。
- `team-assembly` §方法论装载：明确"spawn_teammate 子一律 composeFrom Lead……必须显式
  指路"；路径找不到就 glob；读不到如实回报，不静默。
- `notes/implemented/2026-10-04-teammate-methodology-delivery.md`：效果终验 4/4 队友
  技能内容到达，门L PASS；决定是 prompt 级装载，零 vendor 依赖。
- DSH 的 skill 是工具结果，会被 base 的 `tool-result-pruner` 按 8192 字符裁剪
  （`composition/04`）；当前 raw `read` 反而绕过了裁剪，但也不是 skill 载体的正式语义。

**为什么是 GAP（但优先级低）**：这不是"角色技能没送达"——Note 已证明送达。残留是：
（a）角色技能不在技能目录里，模型不能通过 `skill` 发现/加载，只能靠派发 prompt 的
绝对路径；（b）路径依赖安装位，升级/搬家可能漂移；（c）raw read 不受 skill 裁剪/格式
约束，长技能可能一次性灌入上下文。它属于**载体的健壮性**，不是角色语义的硬缺口。

**可选修法**：

- **A（原生载体）把角色 skill 目录加入 Lead 的 `customSkillDirs`**：teammate 继承 Lead
  的技能目录后，`skill` 目录里就有 lead-mapping / evidence-extraction /
  adversarial-review；spawn prompt 改成"load skill <name>"。代价：Lead 也看到这些
  技能；技能目录变长；技能结果受 8192 裁剪，可能截断长技能（需实测）。
- **B（稳定路径）用 `{{research_pack_root}}` 或运行时变量**：不改目录，只把 spawn
  prompt 的绝对路径换成安装位稳定变量；减少漂移。
- **C（保持现状）**：Note 的 4/4 证据说明它工作；在升 pin/搬包时加一条路径检查即可。

**判据**：若走 A，teammate 的 `available_skills` 含角色技能，且一次真 run 的
`skill` 调用能加载到完整方法论（注意 8192 裁剪）；若走 C，路径检查在 CI/冒烟里绿。

### G6 · 引擎事实写在 persona/skill，升 pin 时没有单一复核点

**症状**：Lead persona 与 `team-assembly` 里混入了多条**DSH 引擎事实**，它们会随 vendor
pin 漂移：

- goal：`create_goal` 后 active、resume/fork 后 disarm、`GOAL_TOOL_RESUME_PAUSED`、
  HITL2 用 `timeout:-1` 挡轮；
- 工具 schema：参数名是 `timeout`、`wait:-1` 不存在；
- 容量：teammate + executor + workflow child 共享 8 槽；
- 组合：teammate composeFrom Lead、workflow child 没有 preset；
- 失败：workflow 不自动重试、`AGENT_CAP`/`ITEM_CAP` fatal。

**证据**：

- `presets/lead.patch.yml:32-35` 的 goal 语义与 `timeout` 约束；
- `team-assembly:35-37` 的 8 槽公式；`:31-34` 的 "teammate composeFrom Lead" 与
  "subagent 不在 Team 轮询面"；
- `research-planning:103-105` 的 "executor = analyst、不是 Team 成员"；
- DSH 机制页 `composition/04`：政策与引擎事实生命周期不同，不能塞进同一载体；
  `perspectives/04` 陷阱 2：修一个 bug 加一句，合同越写越长。

**为什么是 GAP**：本仓不是没有升 pin 流程（`.agents/skills/bumping-vendor-pin`），但
模型可见的引擎事实没有一张"pin 时要复核的清单"；它们散在 persona、skill、design、
notes 里。升 pin 时可能只改代码/组合，漏掉 persona 里的 `GOAL_TOOL_RESUME_PAUSED` 或
8 槽数字。这是维护性 GAP，不是当前行为错误。

**可选修法**：

- **A（建议）pin-bump 清单**：在 `bumping-vendor-pin` 技能里加"模型可见引擎事实"复核项：
  grep `GOAL_TOOL_RESUME_PAUSED`、`timeout`、`8 槽`、`composeFrom`、
  `maxConcurrentAgents`、`AGENT_CAP`、`ITEM_CAP`，逐条对 vendor 源。
- **B（中期）运行时事实 skill/section**：把最易漂的引擎事实收进一个短 skill 或
  `content/` 段，persona/skill 只链接，不复制。代价：模型要加载才看见；常驻 section
  有 token 成本。
- **C（不推荐）全部搬进 docs**：docs 不自动注入，模型不会遵守；等于把约束删掉。

**判据**：pin-bump 技能有该清单；下一次升 pin 的 diff 里能看到逐条复核记录；persona/
skill 的引擎事实与 vendor pin 一致。

### G7 · 驾驶舱是 plan/task 图，不是实际委派图（可见性缺口）

**症状**：`ResearchGraphTab` 画的是 `plan.md` 节点 + Team task 映射（mapped / unmapped /
stale / plan-only）；它不读 subagent catalog/descriptor、workflow run 事件、Team 成员
会话的终态。用户能看到"计划节点是否映射到任务"，看不到"这个节点实际由哪个 teammate /
subagent / workflow 分支执行、深度多少、终态是什么"。

**证据**：

- `docs/design/40-research-cockpit.md` §2 的 `graph-model`：输入 = `plan.md` 节点表 +
  Team 任务；四态映射；明确"没有 mapped task 的节点显示状态未知"。
- `src/lib/plan-graph.ts`：Team 任务板 + 队员状态 → 分层/波次/attention；不读
  `subagent/catalog`。
- DSH `observation/05`：DSH **没有**跨通道统一委派视图；但可以从 subagent catalog/
  descriptor、workflow 记录、team 投影、job 事件折叠出只读图；缺数据标
  `unavailable`/`missing`/`lost`。

**为什么是 GAP（但可能是有意选择）**：研究产品的用户心智是"计划节点 → 任务 → 交付"，
plan 图比委派图更贴近这个心智；DSH 的委派图是开发者/运维视角。当前驾驶舱的
`member-activity` 已经显示队员动作，能部分补偿。真正的缺口是：当同一节点由 workflow
分支执行、或一个 teammate 派了 depth-2 worker 时，图上没有 channel/depth/terminal，
排障时要回到 session log。它是可见性缺口，不是正确性缺口。

**可选修法**：

- **A（小）节点 → 会话链接**：在 plan 节点详情里加"实际执行会话"（从 journal 的
  `spawn_teammate` / `subagent` / `workflow` 调用折叠），点击打开对应会话；不画全图。
- **B（大）委派投影**：按 `observation/05` 的持久源做只读 delegation graph，作为
  第二视图；注意三个缺口词，不硬折 `parentId`。
- **C（保持）**：把 plan 图定位为"研究计划视图"，不承诺委派可见性；排障走 session
  log / `team-preflight` / `run-dashboard`。

**判据**：若做 A/B，图上每个节点/边都有持久来源，缺失标缺口词；若保持 C，文档明确
"图是计划视图，不是执行图"，避免用户误读。

### G8 · 普通 worker 的 8 槽预算没有公式（容量缝隙）

**症状**：`team-assembly` 只在"有脚本层时"算槽：`team + 1 executor + N child ≤ 8`。
普通 team + subagent worker 的组合没有同样的公式；teammate 可以派 depth-2 worker，
多个 teammate 同时派工就可能超过 `maxActiveSubagents` 默认 8。

**证据**：

- `team-assembly:35-37`：公式只覆盖"有脚本层"；`subagent` 工人是"前台等结果，不进
  任务板"，没有槽预算。
- DSH `composition/06`：continuable capacity 默认 8，共享于不间断 continuable 链；
  team 成员、subagent child 都是 Activation；没有全局公平调度器，最先触发的层赢。
- 样本里没有观测到 `ACTIVATION_LIMIT_REACHED` 实际错误（会话里出现的匹配是
  `team-assembly` 文本本身，不是 tool result）；这是**潜伏余量**，不是已发生故障。

**为什么是 GAP**：本仓的计划有 `budget` 列（每节点最多 worker/搜索轮次），但没有把
"全 run 同时在活的 Activation 数"作为派工约束。team 主通道 + 普通 worker + 可能的
executor 三层叠加时，Lead 需要一个总数上限；否则会在最不该失败的时候撞
`ACTIVATION_LIMIT_REACHED`。

**可选修法**：

- **A（便宜）加一条派工预算**：`team-assembly` 的派发纪律加"全 run 活跃
  Activation ≤ 8（team 成员 + 所有 subagent worker + executor + workflow child）；
  每次派工前更新一个 `plan.md` 的 budget 注记"。
- **B（证据）**：在 run 收尾审计里统计最大并发 Activation；超 8 记 WARN。
- **C（组合）**：把 `maxActiveSubagents` 调大；但它是 Host volatile 配置，不是
  preset 能定的；调大也会掩盖预算问题，不推荐先做。

**判据**：`team-assembly` 有全 run 槽公式；一次有 team + worker 的真 run 里最大并发
≤ 8；或审计能报出峰值。

## 7. 三个方案包（不是立即实施）

### Package A · 合同纠偏（便宜，建议先做）

**覆盖**：G1 的文本面、G2、G5 的路径、G8 的预算行。

**动作**：

1. `team-assembly` 派发五件加"角色边界"一条（teammate 不是 Lead；禁用
   `ask_user_question` / `create_goal` / `present` / `spawn_teammate`；`subagent` 只在
   任务明确要求时用；需要拍板写 gap 给 Lead）。
2. `team-assembly` / Lead persona 加 subagent one-shot 合同（Team `send_message`
   不能寻址 subagent child；以 settlement notice 为准）。
3. `design/10 §4` 区分 root preset 与 teammate 会话；`design/20` 把"角色名 ≠ 会话 preset"
   写成显式合同；D16/design/10 §3 把"强制 one-shot"改成"provider 可续但控制面不可达"。
4. `team-assembly` 加全 run 槽公式（G8）。
5. 重录 snapshot B（persona/skill 变更），跑 L1/L4-lite；文本变更不改变组合。

**成本/风险**：低；主要是文本 + 证据重录。风险是 persona/skill 继续变长（G6 的陷阱），
所以每条只加一句，链接到已有章节，不复制。

### Package B · worker preset 包（中，需 D 号）

**覆盖**：G3、G4、G8 的一部分；不解决 teammate 的角色 preset（vendor 无字段）。

**动作**：

1. 新增一个**非研究角色**的 worker preset（名字待定，如 `research-worker` 或
   `analyst-wave`）：工具面 = fs / fs-search / skill / todo / web /（可选 workflow）/
   session-query?；**不含** ask-user / goal / present / team / spawn_teammate；
   `maxDepth: 0`（如果作为叶子）或由 spawn 行控制；skills = evidence-extraction +
   wave-execution（如果是 executor）。
2. Lead 的 `subagent` 行设 `agentPreset: <worker>`，让省略默认落在薄 worker，而不是
   Lead 克隆；角色任务显式传 scout/analyst/critic。
3. Wave executor 改为 spawn `<worker>`，不再用 analyst；workflow child 继承薄 worker，
   不会看到 subagent/goal/team。
4. 更新 roster/UI/测试/文档：DSH 没有 hidden preset 标志，worker 会出现在选择器里；
   需要命名与描述把它标成"内部 worker，不是研究角色"；D2"角色 = 5"需要区分
   "研究角色"与"worker profile"。

**成本/风险**：中高；新增 preset 会触发 `role-list-sync`/哨兵/README/roster/UI，
需要 D 号。收益是 G3/G4 变成组合层保证，而不是文本；workflow child 也变薄。
如果产品不接受第六个 preset 出现在 UI，这个包就不成立——这是关键的产品取舍。

### Package C · 通道迁移（战略，不建议现在做）

**覆盖**：G1 的机器边界；不覆盖 G2/G4 的工具面细节。

**动作**：把 scout/analyst/critic 的实际工作改为 `subagent(agent_preset=…)` 为主；
team 只留 Lead + 一个协调者（或 critic）；用 task board 做任务登记，但角色执行走
spawn。这样角色 preset 真正生效，critic 没有 ask/subagent，scout 没有写权等。

**成本/风险**：高；推翻 D2/design/10 的"团队主通道"，失去持久多轮角色会话、任务板
协作、teammate 记忆；研究流程要重写。只有在"角色工具边界"成为硬产品要求（例如
critic 绝不能问用户、scout 绝不能写报告）时才考虑。

## 8. 已立卡 / 未立卡

Phase 4 已把三条最有证据、最可执行的结论转成卡；G6/G7 留在材料里，暂不立卡。

| 卡 | 覆盖 | 状态 | 备注 |
|---|---|---|---|
| [team-subagent-contract](../../settled_issues/2026-11-11-team-subagent-contract.md) | G1/G2/G8 文本面 | 已结 | 合同纠偏；不改组合 |
| [worker-profiles-and-routing](../../settled_issues/2026-11-11-worker-profiles-and-routing.md) | G3/G4/G5 | 已结 | 薄 worker/wave preset + 路由矩阵；D47 |
| [provenance-hash-contract](../../settled_issues/2026-11-11-provenance-hash-contract.md) | G4 根因 | 已结 | analyst 无 bash 却要算 sha256；hash 改 ops/Lead |
| `runtime-facts-placement` | G6 | 未立卡 | 建议并入 `bumping-vendor-pin` 的模型可见事实复核清单 |
| `delegation-graph-visibility` | G7 | 未立卡 | 产品价值判断；节点→会话链接优先，全图次之 |

## 9. 什么会改变结论

1. **DSH 给 `spawn_teammate` 加 `agentPreset` / per-teammate 组合**：G1 的 A/C 方案
   可以降级为"等上游"；2026-10-04 Note 的复活条件就是这个。
2. **真 run 里 teammate 调用了 `ask_user_question` / `create_goal` / `present` /
   `spawn_teammate`，造成第三 HITL、authority 拒绝或交付卡混淆**：G1 从"潜伏"升级为
   "已发生"，Package A 不够，需 B/C。
3. **真 run 里 Lead 对 subagent child 调 Team `send_message` 得到
   `TEAM_MEMBER_NOT_FOUND`，或等不到 `send_message`**：G2 证据从"结构性"变"已发生"，
   优先级升到 P1。
4. **真 run 撞 `ACTIVATION_LIMIT_REACHED`**：G8 从"余量"变"已发生"，Package A 的槽
   公式必须落地。
5. **真模型行为探针显示 teammate 更服从 Lead persona 而不是 spawn prompt / 角色
   skill**：G1 的"方法论到达"证据不再足够，需要更强的身份/合同设计。
6. **产品明确"角色工具边界是硬要求"**（例如 critic 绝不能问用户）：Package C 成为
   唯一正解，D2 需要重开。
7. **产品接受"角色边界是政策，不是组合"**：G1 可降为"已接受的限制"，只做 Package A
   的文档纠偏；这也是当前最省力的路径。

## 10. 证据附录

### 10.1 会话样本（本地，不随仓）

| 会话 | 角色 | 关键事实 |
|---|---|---|
| `session-fec0541d-…` | root lead | `subagent` 工具描述含 "child reports results with `send_message`"；`send_message` 是 Team-scoped |
| `0e494cdc-…` | scout teammate（`agentPreset=lead`，depth 1） | `system/message` 首行是 Lead persona；`user/message` 有 "You are teammate \"scout-1\""；`available_skills` 只有 Lead 技能；spawn prompt 让 raw read `presets/scout/skills/lead-mapping/SKILL.md` |
| `34bbd84a-…` | critic teammate（`agentPreset=lead`，depth 1） | 工具面含 `ask_user_question` / `create_goal` / `present` / `spawn_teammate` / `subagent`；实际调用以 read/web/edit/team_task/send_message 为主 |
| `6b5bd556-…` / `c91d1525-…` / `ff73f513-…` | analyst 子会话 | 调用过 `workflow`；其余 20 个 analyst 子会话未调用 |

计数：289 个 `session` 头；20 个 `agentPreset=lead` 的 depth-1 子会话（20/20 带 Team
身份 context）；23 个 analyst 子会话、30 个 critic 子会话（47 depth 1 / 6 depth 2）。
样本是快照，不证明总体分布。

### 10.2 关键源码/文档锚点

| 断言 | 锚点 |
|---|---|
| spawn_teammate 无 preset 字段 | `vendor/dsh/packages/experimental/agent-team/src/types.ts:165-172` |
| teammate 创建不带 agentPreset | `vendor/dsh/packages/experimental/agent-team/src/roster.ts:264-274` |
| 省略 preset 时 composeFrom 父 | `vendor/dsh/packages/subagent/subagent/src/child-agent.ts:186-202` |
| `agent_preset` 省略继承父 | `vendor/dsh/packages/subagent/tool-subagent/src/preset-selection.ts:18-24`、`:46-49`、`:85-95` |
| workflow `agent()` 无 preset | `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts:33` |
| Team 控制面被禁用 | `vendor/dsh/packages/experimental/agent-team-profile/cordis.patch.yml:4-14` |
| Team send_message 按成员名解析 | `vendor/dsh/packages/experimental/agent-team/src/roster.ts:36-53` |
| 只有 spawn 能钉 preset | `_digested/delegation-and-orchestration/preset-composition-and-contract-placement/01` |
| 收窄唯一杠杆 | `_digested/.../composition/03` |
| 政策 vs 引擎事实 | `_digested/.../composition/04` |
| 四层证据 | `_digested/.../observation/07` |
| 委派图三个缺口词 | `_digested/.../observation/05` |
| 本仓 teammate 组合继承 | `docs/design/20-roles.md §0` |
| critic 工具面声明 | `docs/design/10-architecture.md §4` |
| 角色技能补偿决定 | `notes/implemented/2026-10-04-teammate-methodology-delivery.md` |
| Team 预检"成员 = lead preset" | `notes/archived/2026-09-24-m2-p2-team-preflight.md` |
| workflow 只挂 analyst | `packages/deep-research-pack/presets/analyst.patch.yml:59-77` |
| Lead 的 subagent 配置 | `packages/deep-research-pack/presets/lead.patch.yml:93-102` |
| 8 槽公式（仅脚本层） | `packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md:35-37` |
| 计划卡授权行 | `packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md:58-64` |
| 驾驶舱 graph-model | `docs/design/40-research-cockpit.md` §2 |

### 10.3 未取用的证据 / 待证

- 没有跑新的真模型探针；没有测"teammate 在自然任务里是否会更服从 Lead persona"。
- 没有逐场核对 3 个 analyst `workflow` 调用是否都被计划卡点名；只确认调用存在。
- 没有统计所有 289 个会话的完整工具调用；只对 20 个 teammate 与 23 个 analyst 子会话
  做了工具调用汇总。
- 没有验证 `skill` 载体下角色技能 8192 裁剪的实际影响；若走 Package A 的 skill 目录
  方案，需要一次真挂载 + 真模型证据。
- 没有检查 `interrupt_agent` 对 subagent child 的行为；Team `interrupt_agent` 同样只
  面向成员，G2 的结论对它同样适用，但未单独跑。

## 11. 一句话给决策者

**先不要改组合。** 先把"team 主通道 = Lead 克隆、角色边界是政策不是 preset、subagent
在 team 组合里是 one-shot"这三句话写进模型可见合同，修掉 `design/10` 的过度声明和
`subagent` 的假承诺；然后用一次真 run 的 `request/header` + 工具调用证据决定要不要
上 worker preset 包。只有"角色工具边界"被提升为硬产品要求时，才值得动 D2 的主通道。
