---
status: 已定性
opened: 2026-11-10
---

# Wave 执行：把计划图变成可跑的工作流

> 状态：已定性
> 问题：Wave 作为「拓扑层」已经能表达并行与依赖；下一步能否把 `plan.md` 的 wave 子图编译成可执行 workflow（固定配方 + args），同时保住 HITL、动态重写与 bundle 留痕。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；落地卡 = [wave-execution-lens-fanout](../../issues/2026-11-10-wave-execution-lens-fanout.md)。
> 产出的卡：[2026-11-10-wave-execution-lens-fanout.md](../../issues/2026-11-10-wave-execution-lens-fanout.md)
> 结论：只脚本化 deep-dive 的 lens×topic 取证层（固定配方 `lens-fanout`）；挂点由 A（独立 `wave-runner`）改判 **B（analyst 承载、spawn executor）**，不新增 preset、不改 D2/plan schema；child 写八字段证据卡 + typed 回执，executor 对账后写 `waves/<wave>.json`；claim 验证仍走 critic subagent。
> 证据评审：2026-11-10 自审 — 机制事实逐条核 vendor rc.5（锚点见 v2 §1）；P1 真挂载复用既有探针；P2–P4 仍为源码级/pilot 待证；外部证据边界见 channel-policy §6。业务验收归用户。

## 研究问题

1. Wave 现在控制的是什么（deps 计算 / ID 前缀 / stage 派生），没有控制什么（谁执行、何时停、失败怎么办）？
2. 哪些 wave 是同质的（lens×topic 扇出、claim 验证），哪些必须留在对话里（HITL、跨节点协商、综合）？
3. 「固定配方 + args」与「模型每次现写脚本」各自的成本、可审计性、失败面？
4. workflow 没有 durable 图、没有中途 HITL、子代是 Lead 克隆——这三条如何被配方设计吸收，而不是硬拗？
5. 失败与恢复：某个 branch 返回 `null`、cap 触顶、父 step 取消，bundle 应留下什么？
6. 成本模型：N 个 workflow child 与 N 个 teammate 的 token / 墙钟 / 协调开销差在哪？

## 边界

- 不改 `W<wave>.<index>` 的身份语义；本方向只讨论「执行层」。
- 不发明新调度器；只用 workflow / team / subagent 现成原语。
- HITL 仍只两点（HITL1 / HITL2）；不因为脚本化新增交互点。

## 本方向上下文

- **问题**：wave 子图能否编译成可执行 workflow；哪些层脚本化、哪些留在对话。
- **当前结论（v2）**：只脚本化 **deep-dive 的 lens×topic 取证层**；scan 不做、claim 验证仍走 critic
  subagent、综合/审查/交付留在 Lead/critic。挂点 **B = analyst 承载**（Lead spawn
  `agent_preset=analyst` 作 executor），不新增 preset、不改 D2/plan schema；固定配方
  `content/waves/lens-fanout.js` + args；child 写八字段证据卡并回 typed receipt，executor 对账后写
  `waves/<wave>.json`；计划面用 `## Wave 执行` 节，`task_id=plan-only`；HITL 只在计划卡点名。
- **必读增量**：
  - [v2 合同](2026-11-10-wave-execution-contract.md)（新机制事实、A/B 重估、执行/失败/HITL/容量/报告合同、试点）
  - `packages/deep-research-pack/content/templates/run/plan.md`（节点表/图版本；v2 要加 `## Wave 执行`）
  - `content/manual.md`（plan 是过程件、Team 板是镜像、bundle 是 canonical；证据八字段）
  - `presets/lead/skills/research-planning/SKILL.md` §0–§5（Wave/Team 物化/调度循环）
  - `presets/lead/skills/research-brief/SKILL.md`（计划卡 200 字口径）
  - `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts`、`host.ts`（钩子/无 preset/结构化输出/caps）
  - `vendor/dsh/packages/subagent/subagent/src/structured.ts`（typed 回执）
- **定义（材料里模糊的）**：
  - `cell` = topic × lens × depth；`brief` = objective / output format / tools+sources / boundaries / budget；
  - `evidence threshold` = A/B 级 + 独立来源；`source tier` 见 manual 信源分级表；
  - `W1.5/W2.5` 只是示意，**小数层未必合法**；验证层用整数 W + `kind=cross-check`。
- **机制锚点**：workflow 政策句 = `vendor/dsh/packages/workflow/tool-workflow/src/index.ts:326-330`；
  caps/失败语义 = `workflow-ptc/src/runtime.ts` + `workflow-ptc/src/index.ts`；结构化输出 =
  `workflow-ptc/src/runtime.ts:207-220` + `subagent/src/structured.ts`；child 不入 catalog/不发 notice =
  `workflow-ptc/README.md` §Results and failures；team 队友 composeFrom Lead =
  `experimental/agent-team/src/roster.ts:264-274`；lens 目录 = `content/lenses/<id>.md`（**已建**，D43）。
- **外部证据**：
  - Anthropic 同步屏障/15×: https://www.anthropic.com/engineering/multi-agent-research-system
  - Cognition, Don't Build Multi-Agents: https://cognition.com/blog/dont-build-multi-agents
  - DeerFlow typed step + router: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/src/graph/nodes.py
  - Gemini 计划批准: https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Get_started_Deep_Research.ipynb
  - LangGraph brief/budget: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/deep_researcher.py
- **未决（实施前探针，不是设计未决）**：① child 是否继承 host 级 manual/`research_pack_root`（源码
  应继承，pilot 抓 header）；② B 的 schema 税实测；③ 真实并发槽位会计时；④ 模型是否遵守
  structured_output/不递归 workflow；⑤ 计划卡 200 字实测。
- **完成判据**：v2 五件（结论+锚点 / 备选与否决 / decision table / pilot plan / 什么会改变结论）**已达成**；
  试点与实施 = [落地卡](../../issues/2026-11-10-wave-execution-lens-fanout.md)。
- **共享底座**：见 [../README.md](../README.md) 的「共享上下文（所有方向必读）」节。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-wave-as-execution.md](2026-11-10-wave-as-execution.md) | v1 推演：三张图、可脚本化判据、固定配方、HITL/失败/成本边界（§3/§4/§10 已被 v2 收窄） | 2026-11-10 |
| [2026-11-10-wave-execution-contract.md](2026-11-10-wave-execution-contract.md) | v2 深挖：新机制事实、A→B 重估、单配方 `lens-fanout`、执行/报告/失败/HITL/容量合同、试点与重议条件 | 2026-11-10 |
