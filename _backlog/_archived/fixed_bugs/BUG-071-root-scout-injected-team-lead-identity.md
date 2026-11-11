---
status: 等人拍板
severity: P2
opened: 2026-11-12
---

# BUG-071：根 scout 被注入「You are the Team Lead」并获得 8 个 Team 工具——与 persona 的 subagent 通道冲突

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：等人拍板（产品/契约取舍：接受并写进合同，还是按根角色门控）

## 症状

回放 scout 场景的 B 层红给出了直接证据：**根 scout 会话**的 model-visible 文本里出现：

- runtime-context：`You are the Team Lead named "lead".`（`team:identity` 上下文）
- persona：`Agent Teams is available in this session … The Lead must wait for required teammates.`（`team:policy` section）

同一会话的 `request/header.tools` = 22 个，其中 **8 个 Team 工具**：

```
spawn_teammate, wait_agent, interrupt_agent, list_agents,
team_task_create, team_task_get, team_task_list, team_task_update
```

而 scout 的 persona 写的是「需要并行铺开多个方向时用 **subagent** 生 worker」——它没有 Team 通道的
说明，却被系统告知自己是 Team Lead 且拿齐组队工具。对照：`lead` 会话同样有这 8 个工具（预期），
但身份文案对 lead 是正确、对 scout 是**冒名**。

## 复现

```sh
source dev/env.sh
node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario scout
# B·persona / B·runtime-context 红：actual 比基线多出 Team policy / Team Lead 身份行
```

盘上证据（本轮回放产生的 scout 会话）：

```
preset=scout  tools=22
team=interrupt_agent,list_agents,spawn_teammate,team_task_create,
     team_task_get,team_task_list,team_task_update,wait_agent
```

**波及面（已逐个复跑确认）**：

| 场景 | A 层 | B·persona | B·runtime-context |
|---|---|---|---|
| lead | PASS | 红（D48 HITL1 文本，应然） | 红（同左，应然） |
| scout | PASS | 红：多出 `Agent Teams is available…` | 红：多出 `You are the Team Lead named "lead"` |
| analyst | PASS | 红：同上 | 红：同上 |
| critic | PASS | 红：同上 | 红：同上 |

即 **所有非 lead 研究角色的根会话**都被标成 Team Lead。

## 根因（已证到机制层）

1. vendor `tool-agent-team` 插件在 **profile 级**启用（本包 `cordis.patch.yml` 明确不声明团队行，
   组合归 vendor `agent-team-profile` 层——设计上的选择）；
2. 该插件**不按 preset 门控**：只要启用，就给每个会话注册 `team:policy` section + `team:identity`
   context + 8 个工具；`team:identity` 对**根会话**（membership=lead）一律输出
   `You are the Team Lead named "lead".`；
3. 于是 scout / analyst / critic / method-editor 的**根会话**都被标成 Team Lead。

## 与现有成文的张力

- [design/10 §4](../../docs/design/10-architecture.md) 只写了「**worker** 的工具目录里看得到 Team 工具
  但调不通」——没有写「根 scout/analyst/critic 也看得到，且被标成 Team Lead」；
- [design/20](../../docs/design/20-roles.md) 明说「角色边界靠派发合同 + 人工验收，**不是 preset 机器边界**」
  ——即工具可见是被接受的；但**身份冒名**（You are the Team Lead）不在该表述覆盖内；
- scout persona 指定并行走 `subagent`，没有任何「不得组队」的提示（lead teammate 的派发合同里有）。

## 影响面

- 模型行为：scout 可能按「我是 Team Lead、Team 可用」去 `spawn_teammate`，而不是用 persona 指定的
  `subagent`——真实 run 里已见 Lead 才会做的事；也可能把 `wait_agent` 用在子 agent 上；
- 观测面：回放 B 层（persona/runtime-context）对**所有非 lead 角色**都会红，除非把这段注入写进基线
  ——而基线是「人审过的模型可见合同」，等于把冒名文本固化；
- 契约层：`team:identity` 的文案是 vendor 的，本仓无法只改文案；要么接受，要么门控，要么在 persona
  里显式纠偏。

## 拍板选项

| 选项 | 做法 | 代价 |
|---|---|---|
| A 接受并写契约 | 在 design/10 §4 写清「所有根会话 = Team Lead，Team 工具对根角色可见；角色边界由 persona/派发合同约束」，并把该文本纳入回放基线 | 与「scout 用 subagent」的 persona 并存，模型可能两头试 |
| B 根角色门控 | 把 `tool-agent-team` 只挂到 lead 根（按 preset 声明而非 profile 级） | **已核 vendor `Config` 只有 interrupt/freshProvider/forkProvider 三个字段——没有 per-preset 开关**；要做 B 需 vendor 支持或加载层改造（可能要上游/提 D 号），且 team 可视面/任务板对非 lead 会消失 |
| C persona 纠偏 | 在 scout/analyst/critic 的 persona 加一句「Team 工具可见但不是你的通道；并行用 subagent」，接受冒名上下文 | 只治行为，不治身份文案；基线仍会含冒名行 |

## 修复判据（按选定选项，任选其一）

1. （A）design/10 §4 + design/20 补「根会话 = Team Lead / Team 工具可见范围」；回放基线按新合同重录，
   且 B 层绿；
2. （B）根 scout/analyst/critic 的 `request/header.tools` 不含 8 个 Team 工具，`team:identity` 不出现；
   回放 B 层绿；lead 不受影响；
3. （C）三个角色的 persona 含显式纠偏句；`tests/pack/presets.test.mjs` 断言该句；回放基线接受冒名行
   并留注释说明；
4. 无论哪条：`pnpm test` + `pnpm verify` 绿；scout 场景回放能给出确定结论（绿或按新基线绿）。

## 修复关联

发现来自 [BUG-064](../_archived/fixed_bugs/BUG-064-replay-a-layer-not-self-contained-tool-stall.md)
修复后的回放复跑（A 已绿，B 暴露该注入）。与 D47（worker profiles/Team 路由）和 D16 相关；若选 B（门控），
需要 D 号评审。
