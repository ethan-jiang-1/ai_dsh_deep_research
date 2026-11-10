---
status: 已定性
opened: 2026-11-10
---

# 编排原语：谁执行、谁记忆、谁推进

> 状态：已定性
> 问题：四个研究角色的哪类工作该由哪条 DSH 原语承载——subagent / workflow / agent-teams / goal 各自保证什么、拒绝什么；当前 pack 实际用的是什么；换通道会在哪里坏。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；落地卡 = [workflow wave 执行器](../../settled_issues/2026-11-10-workflow-wave-executor.md)。
> 产出的卡：[2026-11-10-workflow-wave-executor.md](../../settled_issues/2026-11-10-workflow-wave-executor.md)
> 结论：按工作形状选通道——Team 主控、subagent 做角色保真的一次性验证、workflow 只做同质叶层执行器（推荐独立薄 `wave-runner`；必须 engine + tool 同挂；8 槽是全体活子代共享池，teammate 与 workflow child 一起抢）、goal 只做跨轮记账。
> 归档：2026-11-10（channel-policy/探针已被 workflow-wave-executor 卡与 goal-hitl Note 消费）

## 研究问题

1. 三条委派通道（subagent / workflow / team）在「角色保真、上下文隔离、持久协调、中途 HITL、失败重试、可观察」六个维度上的事实边界是什么？
2. 当前 pack 的 lead / scout / analyst / critic 实际走哪条通道？persona 里的说法与机制事实是否一致——尤其「teammate 是 Lead 组合、靠读角色 SKILL.md 补偿」这一条。
3. workflow 的「仅用户显式要求」政策句，对「Lead 自主编排」意味着什么？HITL1 的计划确认能不能构成授权？
4. goal 在 run 里是记账还是驱动？pause / resume 与 team 等待、workflow 前台等待如何不打架？
5. 推荐的通道选择表：按工作形状（同质扇出 / 异质多轮 / 单点验证 / 跨轮恢复）分，而不是按角色分。

## 边界

- 不讨论 vendor 源码要不要改；只讨论 pack 怎么组合现成原语。
- 不把 Teams 当唯一主通道，也不假设 workflow 能替代 Teams。
- 外部产品怎么做归 `../external-landscape/`，这里只收对选型有约束的结论。

## 本方向上下文

- **问题**：四类工作（同质扇出 / 异质多轮 / 单点验证 / 跨轮恢复）该走哪条 DSH 原语；各通道保证什么、拒绝什么。
- **当前结论**：按工作形状选，不按角色选；Team 做异质多轮，subagent 做 claim 级验证，goal 只做跨轮记账；workflow 只做同质叶层执行器，推荐独立薄 `wave-runner`（engine + tool 同挂、group isolate），不挂 Lead。**8 槽是全体活子代共享池**：team + worker + workflow child 一起抢，先算槽再扇出。
- **必读增量**（共享底座之外）：
  - `packages/deep-research-pack/presets/lead.patch.yml`、`scout.patch.yml`、`analyst.patch.yml`、`critic.patch.yml`（工具面/深度/preset 行）
  - `presets/lead/skills/team-assembly/SKILL.md`、`research-planning/SKILL.md`（现行调度与补偿）
  - `vendor/dsh/packages/subagent/tool-subagent/README.md`、`workflow/workflow-ptc/src/host.ts`、`workflow/workflow-ptc/src/runtime.ts`、`experimental/agent-team/src/roster.ts`、`goal/tool-goal/src/index.ts`
- **已定口径**：channel = 3 条委派通道（subagent / workflow / team）+ goal 生命周期；「角色保真」= preset 身份（persona + skills + 工具面）；「组合」= child join 调用者的 preset revision（workflow 是调用者，team 是 Lead）。
- **外部证据**：
  - Anthropic multi-agent: https://www.anthropic.com/engineering/multi-agent-research-system
  - Anthropic 2026 负结果: https://www.anthropic.com/research/multiagent-systems
  - Cognition, Don't Build Multi-Agents: https://cognition.com/blog/dont-build-multi-agents
  - GPT-Researcher deep agents: https://docs.gptr.dev/docs/gpt-researcher/multi_agents/deepagents
  - DeerFlow 2.0: https://raw.githubusercontent.com/bytedance/deer-flow/main/README.md
  - Google roles→steps: https://blog.google/innovation-and-ai/technology/developers-tools/interactions-api-general-availability/（未能取得正文，降级为报道）
- **未决（实施前必探）**：① workflow child 是否继承 `research-content` 注入（源码应继承，待 request header）；② team profile disable 与 preset insert 的 **live** 工具表；③ 真实并发下 8 槽会计时与峰值；④ 模型是否遵守 workflow 的 explicit-ask / 不递归；⑤ 试点本身。①②③的源码答案已写进材料，④只能靠试点观察；剩的是 live 证据。
- **完成判据**：一张 channel 表 + 5 个探针结果 + 一场 run 的试点计划 + 「什么会改变结论」——**已达成**（channel-policy v2）；试点与实施另卡，见产出的卡。
- **共享底座**：见 [../README.md](../README.md) 的「共享上下文（所有方向必读）」节。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-channel-policy.md](2026-11-10-channel-policy.md) | v2：四通道机制事实、按工作形状的选型表、workflow 挂点/容量/HITL/证据合同 | 2026-11-10 |
| [2026-11-10-channel-probes.md](2026-11-10-channel-probes.md) | 五个探针的命令、输出、边界与补证清单 | 2026-11-10 |
