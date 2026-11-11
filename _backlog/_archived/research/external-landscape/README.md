---
status: 已定性
opened: 2026-11-10
---

# 外部 landscape：别人已经走到哪

> 状态：已定性
> 问题：2025–2026 外部多智能体深度研究系统各自把什么做成了机制；哪些做法已是 table stakes，哪些仍是差异化；我们哪些老思路该停、哪些还站得住。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；结论并入 [策略投影 + HITL1 typed 输入（O1）](../../settled_issues/2026-11-11-strategy-projection.md)。
> 产出的卡：[策略投影 + HITL1 typed 输入（O1）](../../settled_issues/2026-11-11-strategy-projection.md)
> 结论：三层同构（出厂预设 / 用户保存配置 / per-run 选择 + 计划门）；typed step/brief/证据工件是耐久层；lens 按覆盖计；同模 critic 不可当独立验证；style 是命名 Protocol + 验收合同，不是新轴。详见「本方向上下文」。
> 归档：2026-11-11

## 研究问题

1. 生产系统：Anthropic multi-agent research、OpenAI / Gemini Deep Research、Perplexity Research——orchestrator-worker、planner-executor、clarify→plan→browse→synthesize→cite 的事实形态与代价。
2. 开源框架：LangGraph `open_deep_research`、GPT-Researcher、DeerFlow、STORM / Co-STORM——哪些抽象可移植，哪些绑框架。
3. 视角研究：STORM 的 perspective 如何生成、如何使用、消融说明了什么；persona prompting 的批评与边界。
4. 验证与评估：DeepResearch Bench、BrowseComp、citation accuracy、claim-level factuality；过程评估 vs 终稿评估。
5. 采纳度：哪些想法在多个独立系统里重复出现（= table stakes），哪些只有一家（= 未验证）。
6. 对我们最不客气的结论：wave / DAG、四角色、method-library 各自是领先、持平还是落后。

## 边界

- 每条结论必须带可核 URL；转述标转述，推断标推断。
- 不把厂商营销话术当机制事实；优先工程博客、源码仓库、论文。
- 只收对「presets 编排层」有约束的结论，不做泛 AI 行业综述。

## 本方向上下文

- **问题**：外部系统把什么做成了机制；哪些 table stakes、哪些差异化、哪些空白；我们哪些老思路该停。
- **当前结论**：三层同构（出厂预设 / 用户保存配置 / per-run 选择 + 计划门）；外部真正稀有、我们方向正确
  但未产品化的是**计划门**（消费级只有 Gemini 给一次性研究「revise/approve」；其余多为模式 + fire-and-forget）
  与 **run 配置级保存**（版本化 profile 只有 Perplexity；账户级 free-text 指令/记忆才是 table stakes）；
  真正落后的是 **effort 可读性（档位不解释、无代价、未分离推理档）、typed 来源范围、输出形态/长度的
  可机检**；lens 是 11 产品 + 8 开源项目一致缺席的差异化，不是欠账。一句话仍是：角色是包装，typed
  step/brief/证据工件才是耐久层；lens 按覆盖计；同模 critic 不可当独立验证。
- **第四遍补（style）**：外部把一种研究文化硬编码进产品与评测（这是它们的做法；我们的 lever 只在
  权重之上）；style 不是新轴，是**命名 Protocol + 验收合同**（promise / means / acceptance / not_for）。
  2026 证据把 report quality 与 claim-level factuality 分开：Gemini 报告体裁强、claim-level 中游；更多搜索
  反而降 fact-check；Deep Research Arena 的 jury 与 reach 也分离。对我们的含义 = style catalog +
  `gate_profile`，不是新角色/新轴；六个原型（fact_check / literature_review / landscape /
  regulatory_compare / timeline_watch / decision_memo）见材料。文献综述是 v2 高承诺模式，v1 只能近似并
  如实说明。
- **约束**：权重不动，只用现成模型；本方向只评估 **prompt / skill / preset / plugin / constraint /
  gate / artifact / interaction** 能做的事。
- **口径**：计数单位 = 做法，不是产品；厂商自报数字标「厂商自报」；被挡来源不计入。
- **已覆盖**：Anthropic / OpenAI / Gemini / Elicit / Undermind / GPTR / DeerFlow / LangGraph / STORM /
  FACT / self-critique / judge preference / persona 研究；第三遍补 Perplexity Agent API、Elicit 全 Setup、
  Kimi / Qwen / Metaso / Doubao / MiniMax、Consensus / NotebookLM、ChatGPT / Gemini / Claude / Copilot /
  Grok API、DeerFlow 2.x、dzhng/deep-research、smolagents（负结果）、2024–2026 澄清/个性化/偏好遵循 13 篇；
  第四遍补 2026 claim-level 三篇（Cited but Not Verified / Reference Hallucinations / DeepResearch Bench）、
  Deep Research Arena 7 原型、Kimi/Elicit/Undermind 的 style 边界、IFCN/PRISMA/Verification Handbook
  的研究文化锚点。
- **未覆盖（第四遍剩余）**：消费端帮助页仍被 403/DNS/JS 挡（Perplexity / Gemini / OpenAI）；benchmark
  agent ≠ 消费端产品；没有用户研究；没有测本仓 gate profile；中国产品沿用第三遍未重读；Deep Research
  Arena 非同行评审、样本是消费题；情报/咨询/尽调文化是实践归纳，不是单一标准。
- **材料**：[第一遍](2026-11-10-landscape-first-pass.md)（采纳度矩阵）、[第二遍](2026-11-10-landscape-second-pass.md)（框架/视角/验证）、[第三遍·偏好层](2026-11-10-landscape-preference-layer.md)（同构/稀有/缺口 + 2026 证据）、[第四遍·style 空间](2026-11-10-landscape-style-space.md)（隐含 Protocol / 研究文化 / 六原型 / 验收 profile）。
- **完成判据**：第三遍补上未覆盖项 + 更新采纳度矩阵 + 「什么会改变结论」；第四遍补 style 视角 + 2026
  claim-level 证据 + 对偏好层的增量建议；不写泛行业综述。第三、四遍都已按此完成（仍未覆盖项见上，故题仍
  `调研中`）。
- **共享底座**：见 [../README.md](../README.md) 的「共享上下文（所有方向必读）」节。
- **后续**：偏好层数据模型 = [preference-layer](../preference-layer/README.md)（第三遍的设计推演，不是外部证据）；
  style 空间 = 第四遍，给偏好层的增量是 `style_ref` + `gate_profile`（待拍板）。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-landscape-first-pass.md](2026-11-10-landscape-first-pass.md) | 第一遍：采纳度矩阵 + 生产/产品/开源的做法与空白 | 2026-11-10 |
| [2026-11-10-landscape-second-pass.md](2026-11-10-landscape-second-pass.md) | 第二遍：LangGraph / STORM / persona / 验证评测，修正第一遍三处 | 2026-11-10 |
| [2026-11-10-landscape-preference-layer.md](2026-11-10-landscape-preference-layer.md) | 第三遍·偏好层：11 产品 + 8 开源项目的九意图对照；计划门/run 配置级保存的稀有性；2024–2026 澄清与个性化证据 | 2026-11-10 |
| [2026-11-10-landscape-style-space.md](2026-11-10-landscape-style-space.md) | 第四遍·style 空间：产品隐含 Protocol、研究文化、六 style 原型、2026 claim-level 证据与验收 profile | 2026-11-10 |
