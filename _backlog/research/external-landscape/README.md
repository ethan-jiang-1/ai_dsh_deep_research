---
status: 调研中
opened: 2026-11-10
---

# 外部 landscape：别人已经走到哪

> 状态：调研中
> 问题：2025–2026 外部多智能体深度研究系统各自把什么做成了机制；哪些做法已是 table stakes，哪些仍是差异化；我们哪些老思路该停、哪些还站得住。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；产出卡待立。
> 产出的卡：—
> 结论：—

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
- **当前结论**：见两份材料；一句话——角色是包装，typed step/brief/证据工件才是耐久层；lens 按覆盖计；同模 critic 不可当独立验证。
- **口径**：计数单位 = 做法，不是产品；厂商自报数字标「厂商自报」；被挡来源不计入。
- **已覆盖**：Anthropic / OpenAI / Gemini / Elicit / Undermind / GPTR / DeerFlow / LangGraph / STORM / FACT / self-critique / judge preference / persona 研究。
- **未覆盖（第三遍）**：Co-STORM 正文；Perplexity / You.com / Consensus 官方页；中国产品（Kimi / Qwen / 智谱 depth research）；BrowseComp / DeepResearch Bench 全量；LangGraph multi-agent concept 页（404）。
- **材料**：[第一遍](2026-11-10-landscape-first-pass.md)（采纳度矩阵）、[第二遍](2026-11-10-landscape-second-pass.md)（框架/视角/验证）。
- **完成判据**：第三遍补上未覆盖项 + 更新采纳度矩阵 + 「什么会改变结论」；不写泛行业综述。
- **共享底座**：见 [../README.md](../README.md) 的「共享上下文（所有方向必读）」节。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-landscape-first-pass.md](2026-11-10-landscape-first-pass.md) | 第一遍：采纳度矩阵 + 生产/产品/开源的做法与空白 | 2026-11-10 |
| [2026-11-10-landscape-second-pass.md](2026-11-10-landscape-second-pass.md) | 第二遍：LangGraph / STORM / persona / 验证评测，修正第一遍三处 | 2026-11-10 |
