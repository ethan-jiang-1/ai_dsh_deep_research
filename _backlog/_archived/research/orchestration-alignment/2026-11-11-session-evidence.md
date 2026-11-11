---
topic: 编排对齐 · Phase 1 会话考古证据
intent: 用本机 research-workspace 真会话回答三个问题：Team 是否真被用于多轮协作、角色边界是否发生过越界、workflow 授权是否被绕过；并量出峰值并发，判断 8 槽缺口是潜伏还是已发生。
---

# Phase 1 · 会话考古证据

> 证据生成器 = [scan-sessions.mjs](scan-sessions.mjs)；原始输出 =
> [evidence/session-scan.json](evidence/session-scan.json)。只读
> `runtime/harness-home/sessions/`，所有产物住 `_backlog/`。
> 样本 = 2026-11-11 本机 research-workspace 的 289 个 `session` 头（216 root / 73 child）；
> 不是统计样本，不证明总体分布；行为风险仍以组合与日志事实为准。
> 原始 JSON 中的一个 40-hex commit id 已替换为 `<commit-redacted>`，避免
> `pin-agreement` 门禁把会话语料误判为钉身份断言；不影响编排结论。

## 1. 样本总览

| 项 | 数 |
|---|---|
| session 头 | 289 |
| root | 216（lead 113 / analyst 36 / critic 34 / scout 31 / method-editor 2） |
| child | 73：`agentPreset=lead` 20、`analyst` 23、`critic` 30、`scout` 0 |
| workflow 调用会话 | 6（3 个 wave pilot root + 2 个授权 executor child + 1 个 quick_factual 误用） |
| 峰值并发 child Activation | **5**（见 §4） |

73 个 child 的 preset 分布本身就是第一个事实：**teammate 全部是 `lead` 组合；角色 preset
只出现在 `subagent` 子代**。这与 `design/20` 的记录一致，不是本轮新发现；本轮新增的是
“这些角色子代与 teammate 各自承担了什么工作”。

## 2. teammate：20 个，7 个一轮、13 个多轮

`agentPreset=lead` 的 20 个 depth-1 子会话，全部带 Team 身份 context
（"You are teammate …"）；按 `turn/end` 计：

| turns | 个数 | 含义 |
|---|---|---|
| 1 | 7 | 派发即完成；理论上可由 `subagent(agent_preset=…)` 承担 |
| 2 | 6 | 一次 Lead 追加消息（复审/补搜/收口） |
| 3 | 4 | 两到三次 Lead 追加消息 |
| 4 | 3 | 典型 critic 复审循环（R1→R2→R3→终局更新） |

按 first prompt 的角色词粗分（不精确到每个 name）：scout 8、analyst 7、critic 4、未标 1。
观察到的分形：

- **scout 偏一轮**：5 个 scout 里 4 个 1–2 轮；宽搜是一次性交付，适合 role-preset subagent。
- **critic 偏多轮**：4 个 critic 全部 3–4 轮；R2/R3 复审带上下文，Team 的持久会话有真实价值。
- **analyst 混合**：1–4 轮都有；deep-dive 需要多轮补搜，单点取证是一轮。

代表证据：`34bbd84a-…`（critic）有 4 个 `turn/end`，Lead 发过 "R2 复审请求"、"R3 请求"、
"更新 review.md 终局块" 三条 `agent-message`；这不是可以用一次性 subagent 等价替代的会话。

### 2.1 角色边界：零实际越界

20 个 teammate 对 `ask_user_question` / `create_goal` / `get_goal` / `update_goal` /
`present` / `spawn_teammate` / `subagent` 的调用数全部为 **0**。它们实际使用的是
`team_task_*` / `send_message` / `wait_agent` / `list_agents` + web / fs。

结论：**G1 是结构性的，不是已发生的越界**。当前派发文本 + 手册 + Team 身份 context
足以让模型守边界；但工具面仍然可见，压力场景未证。

## 3. 角色 child：53 个，全部一轮

23 个 analyst + 30 个 critic，全部 `turns=1`。任务类型（按 first prompt）：

- workflow evidence worker（`You are a Deep Research evidence worker inside one workflow wave`）
  / W2 executor；
- claim 级 critic（"claim 复核 child"/"claim 级独立复核 critic"）；
- quick_factual 取数与轻量 critic；
- gap 定向补搜、机械转写/复制 worker；
- quick capability probe。

这说明：**一次性角色工作已经主要由 `subagent(agent_preset=…)` 承担**。本仓不是“只用
Team”，而是“Team 做多轮、subagent 做一次性”的混合；缺口在于这个混合没有写成路由矩阵，
而是靠 Lead 的临场判断。

## 4. workflow：6 次调用，1 次是绕过授权的“计算沙箱”

| 会话 | preset/depth | 性质 | 判定 |
|---|---|---|---|
| `session-418e46b5-…` | analyst / root | "wave 机制试点" | 显式授权（机制试点） |
| `session-4d60a8ca-…` | analyst / root | "wave 机制试点" | 显式授权 |
| `session-ccd969bb-…` | analyst / root | "wave 4-cell 容量试点" | 显式授权 |
| `6b5bd556-…` | analyst / depth 1 | `meta.name=wave-W2`，W2 lens-fanout ×4 | 显式 executor，授权 |
| `ff73f513-…` | analyst / depth 1 | `meta.name=wave-W2`，W2 lens-fanout | 显式 executor，授权 |
| `c91d1525-…` | analyst / depth 1 | `meta.name=sha256-slice`，"no agents spawned; pure JS hashing" | **未授权**；不是 wave |

`c91d1525` 的 first prompt 是 quick_factual 取数 analyst（第二轮收口版），任务板 task-2，
没有 `## Wave 执行`、没有计划卡授权。它却在 seq 106 调了 `workflow`，脚本是纯 JS
SHA-256，`args` 是三段证据摘录；结果 `sandbox-unavailable` 失败。

**为什么它要这么做**：同一份 prompt 第 26 行要求
`provenance/<同名>.json` 的 `sha256` 用 "python3 hashlib" 计算；而 analyst 的工具面
没有 bash / python，只有 `workflow` 这个 JS/PTC 沙箱。模型于是把 workflow 当通用计算
runtime 用。这不是“模型不守 explicit-ask”，而是**合同要求了一个角色没有的能力，唯一的
替代工具恰好是越权的那一个**。

结论：

- G4 从“潜伏”升级为“已发生一次未授权使用”；虽然未 spawn agent、未产生研究副作用，
  但它证明 `workflow` 在普通 analyst 上可见会被拿来当计算器。
- 修复不能只写“workflow 仅 executor 可用”；还要处理 **provenance sha256 的计算路径**：
  要么把 hash 计算移出 analyst 合同（ops/Lead 侧），要么给一个明确的窄计算工具；
  否则下一个 analyst 还会找 workflow。
- 5 次授权调用（3 pilot + 2 executor）都带显式 wave/brief，说明授权文本本身是有效的；
  问题在“未授权时工具仍可见”。

## 5. 峰值并发：5，未撞 8 槽

按每个 root 的子会话 `[firstTime, lastTime]` 区间折叠，最大重叠：

| root | child 数 | preset 分布 | 峰值 |
|---|---|---|---|
| `ac7baa4b-…` | 19 | analyst 11 / critic 6 / lead 2 | **5** |
| `cf03a459-…` | 16 | critic 9 / analyst 2 / lead 5 | **5** |
| `e077e6d5-…` | 10 | critic 6 / lead 4 | **5** |
| `fec0541d-…` | 8 | lead 4 / critic 4 | **5** |

全样本峰值 **5**，没有观测到 `ACTIVATION_LIMIT_REACHED`。G8 是**容量余量**，不是已发生
故障；但 8 槽公式只覆盖“有脚本层”的文本缺口仍然存在（`team-assembly:35-37`）。

## 6. 对目标架构的含义（供 Phase 2/3 使用）

1. **Team 不能整体砍**：critic 的 3–4 轮复审是真实多轮；一次性 subagent 无法等价保留
   上下文。目标应是“Team 保留给多轮协调，role-preset subagent 承担一次性角色工作”。
2. **scout 是最明显的迁移候选**：8 个 scout 里多数 1–2 轮；宽搜天然一次性。
3. **workflow 误用暴露了工具/合同错配**：不是“模型不听话”，而是 analyst 被要求算
   sha256 却没有计算工具。修 workflow 可见性必须同时修 provenance 合同。
4. **角色边界零越界**：G1 的合同纠偏可以低风险先做；不需要为了“防越界”立即改主通道。
5. **峰值 5**：G8 可以降级为“公式补全 + 监控”，不必阻断。

## 7. 待 Phase 2/3 验证

- 薄 worker preset 能否 mount，且实际工具面不含 ask/goal/present/team/spawn/subagent。
- 角色 skill 挂进 `customSkillDirs` 后，`skills/list` 是否可见；8192 裁剪是否截断长技能。
- `agentPreset` 默认值是否能把“省略”从 Lead 克隆改成 worker（代码层已明确，需产品取舍）。
- critic teammate 在“被要求问用户/再派子代理”的压力下是否仍守边界。
- Lead 对 subagent child 调 Team `send_message` 时是否真的撞 `TEAM_MEMBER_NOT_FOUND`。
