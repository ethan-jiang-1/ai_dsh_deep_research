---
topic: 编排原语：谁执行、谁记忆、谁推进
intent: 给出四个研究角色在 subagent / workflow / agent-teams / goal 之间的通道选择表，核对当前 pack 的 persona 说法与机制事实，并给出 workflow 作为同质 wave 执行器的落点、容量合同与试点计划。
---

# 编排原语：谁执行、谁记忆、谁推进（v2）

> 性质：机制事实 + 设计建议。事实段带 vendor 源码/文档锚点；建议段标「建议」。
> 同 pin：`vendor/dsh` = `dsh-v0.2.1-rc.5` @ `b830ec950f`。升 pin 后按
> [discipline-map](../../../../docs/discipline-map.md) 复核。
> **v2 相对 v1 的修正**：① workflow 不是「不能中途停」——可取消，缺的是 pause/resume 与
> HITL；② team profile 的 `tool-subagent` disable **不覆盖** preset 自己的同名行（源码已定，
> 不是未核冲突）；③ `maxActiveSubagents` 不是「continuable 子代理池」——它是**每个 root 的
> 全体活子代共享池**，teammate、worker、workflow child 一起抢 8 槽，超限是硬错而不是排队；
> ④ workflow child 不是天然「Lead 克隆」——它加入**调用者**当前 preset 修订，因此挂点决定
> 角色保真；⑤ 外部证据已逐条核验，v1 的「role prompts / token / tool calls 解释方差」应改为
> 「token / tool calls / **model choice**」。
> 探针原始记录 = [2026-11-10-channel-probes.md](2026-11-10-channel-probes.md)。

## 0. 一句话

四角色不是四条通道。通道由**工作形状**选：单点验证要 preset 保真 → `subagent`（spawn）；
同质扇出要脚本控制 → `workflow`；异质多轮要持久协调 → `agent-teams`；跨轮/中断恢复要续跑许可
→ `goal`。当前 pack 实际是「Lead 会话 + Team 板 + 少量 subagent」，`workflow` 完全没挂，
`goal` 只做记账。**建议**把 workflow 收成「同质 wave 执行器」，由独立薄 preset（`wave-runner`）
承载，而不是挂到 Lead 或四个研究角色身上；容量按 8 槽共享池先算账，再谈扇出。

## 1. 机制事实：三条委派通道 + 一条生命周期

| 通道 | 子代身份 | 上下文 | 协调 / 持久 | 中途 HITL | 失败 / 重试 | 关键上限 | 观察面 |
|---|---|---|---|---|---|---|---|
| `subagent`（spawn） | **唯一能钉独立 `agentPreset`**；省略 = 加入父**当前修订**（同一棵 preset 树，不是复制） | fresh；fork 只取已完成轮前缀 | 子 Session + descriptor + catalog；无父邮箱；continuable 需 `send_message` 行 | 子代不能 ask（`DELEGATED_CALLER`）；父可 | 无自动重试，`stopReason` 结算 | `maxDepth` 默认 1（pack=2）；8 槽共享 | 子会话进 catalog、不在普通侧栏；`subagent/start|end` |
| `workflow` | 加入**调用者**当前修订；`agent()` 不能选 preset | fresh 会话，继承完整组合（persona/skills/工具/注入） | 脚本内；无 durable 图、无 resume；只有 4 类 log-only 事件 | **无**；脚本无 HITL 钩子，child 的 ask 被拒 | item → `null`；fatal 杀脚本；可取消（非 pause） | 1000 agents/run、4096 items/call、并发 `min(16, cores-2)`；8 槽共享 | 一个 tool 结果 + run node；child 进 catalog |
| `agent-teams` | 加入 **Lead** 当前修订；`spawn_teammate` 无 preset 字段 | fresh 或 fork | Lead session log：roster + task board（CAS）+ 双向 mailbox；跨崩溃 | 队友不能 ask；只有 Lead 面向用户 | 无自动重试；CAS stale 即拒 | `maxMembers` bundle=8 / package=16；`maxTasks` 256；单消息 64 KiB；8 槽共享 | Team 面板 + roster/task 投影 |
| `goal` | 不适用（会话级） | 同会话跨轮 | phase 写 session log；activation **进程内**；会话恢复/重开/fork 后 disarmed；模型不能 resume `paused`（只有用户能） | 不适用 | blocked ≥3 轮（仅 goal-round 权威）；round cap 默认 256 | `maxGoalRounds` | GoalBar + goal 投影 |

口径：channel 指三条**委派**通道；`goal` 是跨轮生命周期原语，不参与委派计数。「角色保真」=
preset 身份（persona + skills + 工具面）；「组合」= child join 调用者的 preset 修订。

**每格的关键锚点**（完整清单见探针材料）：

- spawn 能力位与 preset 拒绝：`vendor/dsh/packages/subagent/subagent-spawn-in-process/src/index.ts:39-44`、
  `packages/subagent/subagent-fork-in-process/src/index.ts:61-66`、
  `packages/subagent/tool-subagent/src/preset-selection.ts:78-82`。
- 省略 preset 走 `composeFrom`（同一棵 generation）：`packages/subagent/subagent/src/child-agent.ts:186-202`、
  `packages/preset/agent-preset-registry/src/index.ts:297-311`。
- workflow 的合法 opts 闭合集：`packages/workflow/workflow-ptc/src/runtime.ts:32-35`；
  child 启动只传 provider/label/delivery/request，无 `agentPreset`/`maxDepth`：
  `packages/workflow/workflow-ptc/src/host.ts:200-228`。
- team 的 spawn 请求无 preset、`composeFrom` Lead：`packages/experimental/agent-team/src/types.ts:165-172`、
  `packages/experimental/agent-team/src/roster.ts:264-274`。
- 8 槽共享池：`packages/subagent/subagent/src/activation.ts:24-35`、
  `packages/subagent/subagent/src/manager.ts:743-744`、`packages/subagent/subagent/README.md:53`。
- 子代不能 ask：`packages/interaction/user-questions/src/index.ts:128-141`。
- goal phase/activation：`packages/goal/goal/README.md:72,99`；blocked 阈值：
  `packages/goal/tool-goal/src/index.ts:305-312`。

### 1.1 三个承重结论（v1 缺失的）

1. **8 槽是全体活子代的共享池，不是 subagent 专属。** 一个 root（Lead）启动一个
   `ActivationPool`，所有 local/external 后代共享；root 自己不占槽。teammate、subagent worker、
   workflow child 都是它的后代。超限抛 `ACTIVATION_LIMIT_REACHED`，**不排队**。
2. **workflow child 不过深度闸，但仍记深度。** `startActivation` 没传 `maxDepth`，服务只把
   `childDepth = parent + 1` 写进 header，不做上限检查；child 后续再派时才由它自己的
   `tool-subagent` 行按当前深度拒绝。于是「workflow 能绕过爸爸的 maxDepth」是真的——它能在
   depth 2 的 agent 下起 depth 3 的 child；但那个 child 不能再派。
3. **workflow 超 8 槽是 fatal，不是 `null`。** `startChild` 抛错 → `agent()` 包成 `AGENT_START`
   → 脚本整体 `stopReason: 'error'`。workflow 自己的并发默认 `min(16, cores-2)` 可能大于剩余槽位，
   所以「团队 + 扇出」最先撞的往往不是 workflow 的 cap，而是 subagent 的 8 槽。

## 2. 当前 pack 的事实态

- **lead / scout / analyst**：`tool-subagent` 带 `maxDepth: 2` + `allowedAgentPresets:
  [scout, analyst, critic]`（`packages/deep-research-pack/presets/lead.patch.yml:90-99`，
  scout/analyst 同形）。这是 2026-10 那轮补的：teammate（depth 1）可派 depth-2 worker，worker
  不能再派。
- **critic**：没有 `tool-subagent`；只有读文件、抓 URL、写 `review.md` 与 `session-query`。
- **lead**：唯一挂 `tool-goal` 的角色；HITL 前 pause、后 resume；`tool-ask-user` 是 timed 600s。
- **workflow**：四个 preset **都没有** `workflow-ptc` / `tool-workflow`。web-app 在 root 层把
  两者都 disable（`vendor/dsh/packages/bundle/web-app/cordis.patch.yml:572-576`），所以**只往
  preset 里插 `tool-workflow` 不够**——探针实测会得到 `waiting for workflowEngine`，preset 被标
  broken。正确形状 = 在 preset 内同时挂 engine + tool，并用 `isolate: workflowEngine: true`
  的 group 隔离（shipped standard preset 同形：
  `vendor/dsh/packages/bundle/web-app/presets/standard.patch.yml:100-110`）。
- **team**：run 通道装 `agent-team-profile`；它在 root 层 disable `tool-subagent` 四行。**preset
  自己的同名行不受影响**——bundle patch 按 entry list/id 作用，preset 的 `config.plugins` 是
  独立 EntryTree；vendor 明说「presets can still mount continuable Subagent controls in their own
  scope」（`packages/experimental/agent-team-profile/README.md:107`）。D16 的差分实验与之一致，
  v1 的「未核冲突点」可以关闭。
- **teammate 的 subagent 实际是一次性**：teammate 继承 Lead 组合，所以看得到 `tool-subagent`；
  但 team profile 把全局 `tool-subagent-control`（含 `send_message`）disable 了，Team 版
  `send_message` 只寻址 roster 成员，subagent child 不是成员。因此「subagent 是 continuable」
  在**原语**上成立，在**这个组合**里退化为 one-shot。这不是 bug，是组合层的取舍。
- **plan / task**：`plan.md` 是 canonical，Team 板是当前会话镜像，bundle 是事实源；plan 节点表
  没有 channel/execution 列。
- **slot 账**：Lead + 4 个 teammate = 4 槽；剩 4 槽给 worker 与 workflow child。当前
  `team-assembly` 的编制（scout 1 + analyst 1–2 + critic 1）已经能占满 4 槽；如果两个 analyst
  再各派 2 个 worker，8 槽正好，任何 workflow 扇出都会撞顶。**这是当前设计的隐性预算，v1 没算。**

## 3. 建议：按工作形状选通道

| 工作形状 | 通道 | 为什么 | 代价 |
|---|---|---|---|
| 单点验证 / 查证，需要 critic 的工具面与 persona | `subagent(agent_preset: "critic")` | 唯一能钉独立 preset 的通道；fresh 上下文适合「换一双眼睛」 | one-shot；父级必须落盘 verdict；本组合无 `send_message` 回头路 |
| 同质扇出：N lens × M topic、批量 claim 验证 | `workflow`（由薄 worker 承载） | 脚本持有循环，父上下文只收结构化结果；`pipeline` 无跨 stage 屏障 | child 是调用者克隆；无 durable 图；不能 pause/HITL；8 槽共享 |
| 异质多轮：scout 铺方向 → analyst 接力 → critic 补证据 → 改派 | `agent-teams` | 持久任务板 + 点名消息 + reassign；跨崩溃 | 角色靠 prompt/读 skill；工具面继承 Lead；Lead 是唯一 scheduler |
| 跨轮 / 中断恢复 / 长跑 | `goal` | Round Driver 在 idle 时续跑；pause/resume 防等拍板空转 | activation 不持久；resume 后要人重新武装；不守 pending 问题 |
| 单轮多步但不扇出 | `todo_write` | 上下文内计划留痕 | 无依赖、无共享 |

**默认路径（建议）**：整场 run 仍以 Team 为主通道（异质、需要人拍板、需要改派）；`subagent`
用于 claim 级验证；`goal` 只做跨轮记账；`workflow` 只在**同质叶层**做执行器。不把 workflow 当
主编排器，也不把 Team 用于同质扇出。

### 3.1 workflow 挂在哪：三个候选，推荐独立 `wave-runner`

| 方案 | 形状 | 优点 | 代价 | 裁决 |
|---|---|---|---|---|
| **A. 独立 `wave-runner` preset**（推荐） | 薄 preset：fs / skill / web（按需）/ time-context / `workflow-ptc` + `tool-workflow`；无 subagent / ask / present / goal | 只有 wave 会话付 workflow schema 成本；child 工具面干净；角色边界明确；不会把 HITL 工具带进脚本 | 多一个 preset（roster/UI/测试）；方法必须由 brief 携带（或等 lens-as-data 目录） | **推荐**；先做试点 |
| **B. 挂 analyst（退路）** | analyst preset 内加 engine + tool | 不新增 preset；child 直接继承 analyst persona + evidence-extraction skill | 每个 analyst 请求都付 workflow schema；child 还带 `tool-subagent`（depth 2 时被机械拒绝）与 `tool-workflow`（递归只能靠合同挡） | 备选；若 A 的 roster 成本不可接受 |
| **C. 挂 Lead（否决）** | Lead preset 内加 engine + tool | 不改 roster | child 是 Lead 克隆：带 ask/present/goal 工具面，丢 analyst/scout 方法；HITL 语义最脏 | **否决** |

A 的 brief 必须写全：objective、输出文件与 schema、可用工具/来源边界、预算（cell 数、每 cell
搜索/抓取上限）、证据七字段、失败回报格式、**禁止再起 workflow / 禁止 subagent**。child 是
wave-runner 的克隆，所以它**没有** subagent 工具，ask 也会被机械拒绝；这一点比 B 干净。

> **与 lens 方向的对齐**：`../lens-abstraction/2026-11-10-lens-as-data.md` §7 说「workflow 子代
> 是 Lead 克隆，所以 lens 是前置条件」。这句话对 **Lead 挂点**成立，对 A/B 不成立：child 加入
> **调用者**的 preset 修订，analyst 挂点会保留 evidence-extraction skill，wave-runner 挂点至少
> 保留「按 brief 执行」的 worker persona。lens-as-data 仍然是「换视角不换通道」的好抽象，但
> 它不是 workflow 角色保真的硬前置；A 的硬前置只是「brief 能把方法说清」。

### 3.2 容量合同（试点前先算）

```
活子代槽数 = teammate 数 + wave-runner 1 + workflow 并行 child 数 (+ 其他 subagent worker)
必须 ≤ maxActiveSubagents（默认 8；root Lead 不占槽）
workflow 的 maxConcurrentAgents 必须 ≤ 剩余槽数，否则 AGENT_START fatal
```

试点建议：Lead + scout + critic（2 teammate）+ wave-runner（1）+ 4 个 child = 7 槽；留 1 槽余量。
若试点需要更多并行，先讨论是否把 `maxActiveSubagents` 提到 12（host 设置，产品面变更），不要
在没实测的情况下直接调。`team-assembly` 与 `research-planning` 应加一句 slot 预算；plan 的
`budget` 列写「最多几个 child」，不要只写「2 轮」。

### 3.3 HITL 授权：计划卡点名，不新增交互点

workflow 工具的 prompt section 原文是 `Use the ${toolName} tool ONLY when the user explicitly
asks for a workflow or for large multi-agent orchestration`（
`vendor/dsh/packages/workflow/tool-workflow/src/index.ts:326-330`）。这是 prompt 约束，不是机械闸。

**建议**：HITL1 计划确认卡的正文点名「W2 脚本扇出 ×N（workflow）」，用户点「按计划开跑」即构成
explicit ask；不新增第四问、不新增第四个选项。理由：仍是两点交互；计划卡 200 字上限已顶格
（实测 3 张卡 171/183/200 字），加正文会超，加选项不会——但选项会让用户以为整场 run 都脚本化，
而实际只有同质层。若必须加选项，只能写成「按计划开跑（含脚本扇出层）」这种**标签级**改动，且
在 RFC 里单独评审。

### 3.4 证据与失败合同

- **每个 child 自己写文件**：`evidence/<cell>.md`，七字段齐全；脚本只收 `{cell, status,
  path, error}`，不把 child 的自然语言返回当证据。
- **脚本返回结构化账**：`{ ok: [...], failed: [...], missing: [...] }`；`null` 不得静默丢弃，
  必须进 `failed` 或 `missing`。
- **fatal 不重试**：`AGENT_START` / `AGENT_CAP` / `ITEM_CAP` 杀脚本；wave-runner 如实回报，Lead
  把该 wave 标为未执行或退回 Team/subagent，不整脚本重跑碰运气。
- **无 HITL**：child 需要用户拍板时，写进 `missing`/gap，由 Lead 在 wave 结束后统一问；不要在
  脚本里等。

## 4. 五个反直觉结论（v2）

1. **workflow 不是「更高级的 team」**。它买到的是「脚本控制 + 吞吐 + schema 输出」，卖掉的是
   「角色保真（相对调用者之外的角色）+ pause/HITL + durable 图 + 恢复」。把它当主编排器，就得到
   一批调用者克隆 + 一个不能暂停的脚本 + 一个撞 8 槽就整体失败的死法。
2. **team 不是「更强的 subagent」**。它买到的是「持久协调状态」，代价是队友没有自己的 preset、
   工具面继承 Lead，且与全局 subagent 控制面互斥（preset 自己再挂是另一回事）。它适合「几个人
   持续互相等」，不适合「一次把活交出去」。
3. **goal 不是「自动干活」**。phase 持久、activation 不持久；重开/fork 后一律 disarmed，人说
   「继续」才 rearm。它是跨轮记账 + 续跑许可，不是调度器。**它也不守 pending 问题**：
   goal-round-driver 不查 `userQuestions`，timed ask 超时后 agent idle 仍可能起新一轮；pack 用
   persona「ask 前 pause」补偿，但那是纪律不是机制。
   **而且这条补偿自身有缺陷**：`update_goal action=pause` 把 phase 置 `paused`，模型再
   `resume` 会被 `GOAL_TOOL_RESUME_PAUSED` 拒绝——只有用户能 resume 一个 durable paused goal
   （`vendor/dsh/packages/goal/tool-goal/src/index.ts:278-285`、
   `packages/goal/tool-goal/README.md:55,71`）。pack 的 lead persona 却写「拿到答案后 resume」
   （`packages/deep-research-pack/presets/lead.patch.yml:33`），机制上会失败；后果是 HITL1 之后
   goal 停在 paused、自动续轮失效，直到用户手动 `/goal resume`。这是本卡要求在 RFC 里裁决的
   相关缺陷：要么改 persona（不 pause / 换守卫），要么承认 pause 后由用户恢复（会多一个交互，
   与两点纪律冲突）。见 §7。
4. **本 pack 的 subagent「one-shot」是组合事实，不是原语事实**。原语支持 continuable + cold
   resume；本组合没挂 `send_message`，Team 版又不寻址 subagent child，所以实际退化为一次性。
   设计时不要把「worker 永远 one-shot」写成机制保证。
5. **8 槽不是「subagent 的并发」**。teammate、worker、workflow child 一起抢；团队越大，能给
   wave 的并行越少。先算槽，再写脚本。

## 5. workflow 的正确落点：wave 执行器

**形状（A，推荐）**：

```yaml
# wave-runner preset 的 plugins 片段（与 shipped standard 同形）
- id: wave-delegation
  name: cordis:group
  group: true
  isolate:
    workflowEngine: true
  config:
    - id: workflow-ptc
      name: '@deepseek-ai/dsh-workflow-ptc'
      config:
        provider: spawn
    - id: tool-workflow
      name: '@deepseek-ai/dsh-tool-workflow'
```

**调用链**：Lead 在 plan 里标出同质层 → 用 `subagent(prompt, agent_preset: "wave-runner")` 派
一个 wave-runner（depth 1）→ wave-runner 在脚本里 `pipeline`/`parallel` 起 N 个 child（depth 2）
→ child 各写 evidence 文件 → wave-runner 返回结构化账 → Lead 读文件、更新 plan/Team 板。

**前置条件（缺一不做）**：

1. **用户授权**：计划卡点名该层；「按计划开跑」= explicit ask（§3.3）。
2. **槽位够**：`teammates + 1 + N ≤ 8`；N 写进 plan 的 `budget` 列。
3. **方法可携带**：brief 里有该 cell 的 lens/method、问题清单、来源边界、证据 schema；不能只写
   「去研究 X」。lens 目录建成后可改传路径，v1 先内联。
4. **只跑同质层**：一个 brief 进、一个结构化结果出；有协商、有 HITL、有动态改派的层留在 Team。
5. **产物落 bundle**：child 自己写 `evidence/`；父级只收路径 + 摘要。
6. **前台优先**：试点用 foreground（`enableRunInBackground: false`），避免 Lead 回合结束后
   goal 轮与后台 job 竞态；后台只在 goal 已 paused 或用户明确要异步时用。

**试点配方（建议）**：选一个 `broad-scan` 或 `claim_verification` 的同质层，N=4（lens×topic
各不同），team = scout + critic（2 人），wave-runner 1 个；总 7 槽。成功判据：4 个 evidence 文件
在场且七字段齐全；wave-runner 返回 `ok=4, failed=0, missing=0`；Lead 不用重跑脚本；node-gate /
evidence-audit 绿；与 team-only 基线比 token/墙钟/覆盖。失败判据：任何 `AGENT_START`、任一 child
静默丢结果、或 evidence 文件缺失——按失败记账，不粉饰。

## 6. 与外部证据对齐（已逐条核验）

| 说法 | 裁决 | 证据 / 边界 |
|---|---|---|
| Anthropic 2025：多 agent 比单 agent 高 90.2%，约 15× token | **verified（厂商自测）** | `https://www.anthropic.com/engineering/multi-agent-research-system`；内部 eval ~20 题，Opus 4 lead + Sonnet 4 subagents |
| 「role prompts / token / tool calls 解释 95% 方差」 | **contradicted** | 原文三因子 = **token usage（80%）/ tool calls / model choice**；role prompts 不在方差分析里 |
| Anthropic 2026：prescriptive roles「没带来多少差别」 | **verified，但范围窄** | `https://www.anthropic.com/research/multiagent-systems`；仅 12h「造游戏」10–80 agent swarm，不覆盖 research pipeline |
| 同步 wave 屏障是瓶颈 | **verified** | 同 2025 文：lead 同步等每批 subagent，不能 steer、subagent 之间不能协调、一个慢拖死整批 |
| GPTR 2026 重写掉角色图 | **partial** | Deep Agents 是**新增**示例；8-agent LangGraph 页仍在；「+89%」= FACT 可验证引用数，厂商自报，RACE 只 0.503→0.512 |
| DeerFlow 2.0 = sub-agent/skills harness | **verified（自述）** | README 自述；v2 是 ground-up rewrite |
| Google 2026 roles→typed steps | **unverifiable** | 博客正文 JS shell，ai.google.dev 不可达；只有二手转述 |
| LangGraph brief 是字符串、预算在 prompt 里 | **verified（源码）** | `research_brief` 被 `HumanMessage` 化；`research_iterations > max` 的 `>` 真产生 max+1 轮；超并发先裁后丢 |
| STORM 99.83→54.36；self-critique 16→2；FACT 78–90% | **verified / partial** | STORM 表 5 与 2402.08115 表 1 可核；judge 59.3/18 与 FACT 四家 DRA 行未取到全文，降级标注 |

**新增约束**（对设计有直接影响）：

- **Cognition, "Don't Build Multi-Agents"**：并行 child 若要做**决定**，必须共享完整 trace，否则
  冲突决定会互相覆盖；建议决策单线程，subagent 只回答被界定的问题。→ 支持「workflow 只做取证，
  综合/裁决留在 Lead」。
- **Anthropic 2026**：一个 agent 做坏决定时，多个克隆很可能一起做坏；N 个克隆 ≠ N 个独立样本。
  → 扇出必须**变输入**（lens/topic/source），不能只重复同一 prompt；这与 lens 方向一致。
- **Anthropic artifact handoff**：专门 agent 产出可独立持久化的工件，再回传轻引用。→ 支持
  「child 写 evidence 文件，父级只收路径」。
- **LangGraph 预算 bug**：预算在生成后裁剪，`>` 还 off-by-one。→ 我们的 `budget` 必须在 spawn
  前拒绝，且能被门禁/探针检查。

## 7. 失败形态

| 形态 | 表现 | 机制原因 | 护栏 |
|---|---|---|---|
| 只插 `tool-workflow` | preset 标 broken：`waiting for workflowEngine`；`session/create` 失败 | web-app root 把 `workflow-ptc` 也 disable 了 | 同时挂 engine + tool，group 内 `isolate.workflowEngine` |
| 团队 + 扇出撞 8 槽 | workflow 整体 `AGENT_START` / 脚本 error | 所有活子代共享 root pool；超限不排队 | 先算槽；`maxConcurrentAgents ≤ 剩余槽`；试点 team 缩到 2 |
| Lead 挂 workflow | child 带 ask/present/goal；方法丢失 | child 加入调用者修订 | 不挂 Lead；用 A/B |
| workflow 里再起 workflow | 递归、槽位雪崩 | child 继承 `tool-workflow`；无深度闸 | brief 禁止 + 试点观察；必要时收窄到只读脚本 |
| child `null` 被当成功 | 报告缺证据 | `agent()` 失败返回 `null`，脚本可静默过滤 | 结构化 `failed/missing`；Lead 只认文件事实 |
| ask 前 pause → 模型 resume 被拒 | HITL1 后 goal 停在 paused；自动续轮失效 | `GOAL_TOOL_RESUME_PAUSED`：模型不能 resume durable paused goal，只有用户能 | RFC 裁决：改 persona/换守卫，或承认要用户 `/goal resume`（后者多一个交互，与两点纪律冲突） |
| 等拍板时 goal 空转 | 新 round 在 pending 问题后起来 | goal driver 不查 userQuestions | ask 前 pause；wave 不同时跑 |
| 把 lens 当第五角色 | 角色膨胀、工具面不变 | 角色不是方法层 | lens 留数据层；wave-runner 只做执行器 |

## 8. 探针结果（详见 [探针记录](2026-11-10-channel-probes.md)）

1. **workflow 挂载形状**：`preset-smoke` 真挂载 —— baseline 5 preset 全绿；analyst + engine +
   tool 全绿；analyst 只加 tool → `waiting for workflowEngine` 红。**结论：必须 engine + tool
   同挂，且 isolate。**
2. **content 注入是否到 workflow child**：`research-content` 是 **host 级** `systemPrompt.context`
   （`packages/deep-research-pack/cordis.patch.yml:103-104`、`src/content/index.ts:65-72`），child
   在 host scope 下，按机制应继承；**未做真模型请求级确认**，试点第一件要验。
3. **team disable 与 preset insert**：源码定案「不覆盖」；D16 有差分实验；**未做 live tool-list**，
   RFC 可要求一次 `request/header.tools` 探针。
4. **workflow child 与 8 槽**：源码算术已定（共享池、超限 fatal、depth 不设闸）；**未做真实
   并发压力测试**，试点量实际槽数。
5. **HITL 卡预算**：`plan-card-stats` 实测 3 张计划卡 171/183/200 字，阈值 200；**加正文必超，
   加选项不超**。建议正文点名、选项不动。

## 9. 什么会改变结论

- 若 **child 看不到研究手册**（探针 2 红）：brief 必须内联手册的目录/证据 schema，wave-runner
  的 brief 成本上升；A 仍可行，但 pilot 前要补。
- 若 **8 槽在真实 team 下无法容纳 N≥3**（探针 4）：要么提 `maxActiveSubagents`（产品面变更），
  要么改成「wave 期间 team 缩到 1–2 人」，要么退回 team-only。
- 若 **模型不遵守 workflow 的 explicit-ask 政策**：把 tool 从所有常驻角色移走，只留 wave-runner；
  若仍误用，考虑不挂 workflow。
- 若 **lens-as-data 目录落地**：wave-runner 的 brief 可从内联改传路径，A 的成本下降，推荐更稳。
- 若 **vendor 给 `agent()` 加 `agentPreset`**（升 pin）：B 的「角色保真」不再需要独立 preset，
  方案可简化为「Lead 直接选 analyst」；本结论随之重审。
- 若 **Anthropic 2026 的负结果在 research pipeline 上被复现**（角色 prompt 真的无效）：角色差异
  必须继续落在工具面/证据面，而不是 persona 文案；本仓四角色设计不变，但文案权重下降。

## 10. 来源

- Anthropic multi-agent research: https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic 2026 multiagent systems: https://www.anthropic.com/research/multiagent-systems
- Cognition, Don't Build Multi-Agents: https://cognition.com/blog/dont-build-multi-agents
- Anthropic context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- GPT-Researcher deep agents: https://docs.gptr.dev/docs/gpt-researcher/multi_agents/deepagents
- DeerFlow 2.0: https://raw.githubusercontent.com/bytedance/deer-flow/main/README.md
- Google interactions API: https://blog.google/innovation-and-ai/technology/developers-tools/interactions-api-general-availability/
- LangGraph open_deep_research: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/deep_researcher.py
- STORM: https://arxiv.org/abs/2402.14207
- Self-verification: https://arxiv.org/html/2402.08115v2
- Judge self-preference: https://arxiv.org/html/2404.13076v1
- FACT: https://arxiv.org/html/2506.11763v1
