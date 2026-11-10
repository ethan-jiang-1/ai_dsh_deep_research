---
status: 调研中
opened: 2026-11-10
---

# Wave 执行：把计划图变成可跑的工作流

> 状态：调研中
> 问题：Wave 作为「拓扑层」已经能表达并行与依赖；下一步能否把 `plan.md` 的 wave 子图编译成可执行 workflow（固定配方 + args），同时保住 HITL、动态重写与 bundle 留痕。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；产出卡待立。
> 产出的卡：—
> 结论：—

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
- **当前结论**：扇出层可脚本化（lens×topic、claim 验证），汇聚/拍板层不可；固定配方 + args；workflow 只做 wave 执行器。
- **必读增量**：
  - `packages/deep-research-pack/content/templates/run/plan.md`（节点表/图版本）
  - `content/manual.md`（plan 是过程件、Team 板是镜像、bundle 是 canonical）
  - `presets/lead/skills/research-planning/SKILL.md` §0–§5（Wave/Team 物化/调度循环）
  - `vendor/dsh/packages/workflow/workflow-ptc/src/runtime.ts`、`host.ts`（钩子/无 preset/取消）
- **定义（材料里模糊的）**：
  - `cell` = topic × lens × depth；`brief` = objective / output format / tools+sources / boundaries / budget；
  - `evidence threshold` = A/B 级 + 独立来源；`source tier` 见 manual 信源分级表；
  - `W1.5/W2.5` 只是示意，**小数层未必合法**；验证层用整数 W + `kind=cross-check`。
- **机制锚点**：workflow 政策句 = `vendor/dsh/packages/workflow/tool-workflow/src/index.ts:329`；caps/失败语义 = `workflow-ptc/src/runtime.ts` + 语料 `delegation-primitives/01`；`kind` 合法值 / `lifecycle` / `图版本` 规则 = `research-planning/SKILL.md` §0/§1/§6 + `content/templates/run/plan.md`；lens 目录 = 提议 `content/lenses/<id>.md`（未建）。
- **外部证据**：
  - Anthropic 同步屏障/15×: https://www.anthropic.com/engineering/multi-agent-research-system
  - DeerFlow typed step + router: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/src/graph/nodes.py
  - Gemini 计划批准: https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Get_started_Deep_Research.ipynb
  - LangGraph brief/budget: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/deep_researcher.py
- **未决**：配方住 skill/content；lens 目录建成前 args 内联、建成后传路径；一层混用 workflow/team；plan 是否加 engine 列；脚本 run 如何进 journal。
- **完成判据**：一个配方 spec + 一场真 plan 的 dry-run（不调用模型也能量出 args/上限）+ 失败表 + 「什么会改变结论」。
- **共享底座**：见 [../README.md](../README.md) 的「共享上下文（所有方向必读）」节。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-wave-as-execution.md](2026-11-10-wave-as-execution.md) | 三张图、可脚本化判据、固定配方、HITL/失败/成本边界 | 2026-11-10 |
