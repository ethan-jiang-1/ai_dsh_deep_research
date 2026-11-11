---
topic: 外部 landscape 第二遍：框架、视角、验证
intent: 补齐 LangGraph open_deep_research、STORM/Co-STORM、lens 参数化与验证/评测的证据，修正第一遍的三处判断。
---

# 外部 landscape 第二遍：框架、视角、验证（2026-11-10）

> 性质：来源综述 + 推断。覆盖 LangGraph `open_deep_research`、STORM、persona/lens 研究、验证与 citation 评测。
> 失败：Co-STORM 正文未读到（arXiv fetch failed）；LangGraph multi-agent concept 页 404；STORM 正文走 ar5iv 镜像。

## 0. 一句话

第二遍把第一遍的三个模糊处钉死了：**brief 是字符串就不可复核**（LangGraph）、**perspective 的收益是覆盖不是大纲**（STORM 消融）、**同模自我批评会掉点而不是提点**（self-critique 与 judge self-preference）。这三条都直接改我们的设计：brief 要 schema、lens 要按覆盖计、critic 必须证据接地而不是同模自评。

## 1. LangGraph open_deep_research：brief 是字符串，预算声明在 prompt、夹在代码

**骨架**：clarify → brief → supervisor ⇄ supervisor_tools → 并行 researcher 子图 → 最终报告。

- `write_research_brief` 把结构化 `ResearchQuestion.research_brief` 压成**一个字符串**放进 state；supervisor 的 system prompt 就是 `[lead_researcher_prompt(budgets), HumanMessage(brief)]`。
- 预算：`max_concurrent_research_units=5`、`max_researcher_iterations=6`；prompt 里写「Always stop after N tool calls」「Maximum N parallel agents」。
- 但代码在**晚一步**才夹：`research_iterations > max`（`>` 不是 `>=`，实际跑 max+1 轮）；超出的 `ConductResearch` 调用返回一个 error `ToolMessage`——**token 已经花在生成被丢弃的委派上**。
- `compress_research` 的 prompt 明说「repeat verbatim, don't lose any information」——名字叫压缩，语义是去重搬运；fan-in 实际被 `compression_model_max_tokens=8192` 的输出上限卡住；截断只在 API 报 token-limit 之后发生（reactive，不是 planned）。
- 一个子 agent 抛异常，`or True` 会让整个 research phase 直接 END，带着不完整的 notes 收场——**没有 per-child 错误隔离**。

**对我们的含义（推断）**：

- brief 必须是**结构化契约**（objective / output format / tools+sources / boundaries / budget），不能是一段字符串；否则「委派粒度」不可复核、不可回放。
- 预算要在**决策点**执行（调用前拒绝），不是在 prompt 里劝、在生成后丢；配方 args 里写死 `max_children` / `max_calls`，超了 fatal 或明确 gap。
- 每个 child 的错误必须隔离成 `null`/gap，不能让一个 child 杀掉整层。

## 2. STORM：perspective 是覆盖杠杆，不是大纲杠杆

**Perspective 怎么来**：先用 LLM 找相关 Wikipedia 页 → 逐页取 title + TOC → 一个 prompt 让模型「选一组不同的 Wikipedia 编辑」→ 得到 N 个 persona；再加一个固定的 "basic fact writer"；代码默认 `max_num_persona=3`（论文 N=5），**没有去重/聚类**。

**消融（论文 Table 3/5）**：

- 大纲 heading soft recall：STORM 86.26 vs 去掉 perspective 84.49（GPT-3.5）；92.73 vs 92.39（GPT-4）——**几乎不动**。
- 唯一来源数：99.83 vs **54.36**——去掉 perspective，来源池几乎腰斩。
- 注意：论文没有对 perspective 消融做显著性检验；「perspectives 改善大纲」不被它自己的数字支持。

**作者承认的边界**：互联网来源偏差会转移进输出；模型会**过度关联不相关事实**；文章不是 publication-ready。

**对我们的含义（推断）**：

- lens 的收益应按**覆盖**计量（distinct source / entity / claim），不是按大纲漂亮或证据条数；这正好支持 `topic × lens` 覆盖矩阵，而不是「≥N 源」。
- STORM 没有 dedup/clustering，是它的缺陷：我们的 lens 目录要有「近义 lens 合并」与「配对 lens」规则，否则三个 analyst 会用三种说法挖同一批源。
- 「来源偏差转移」与「过度关联」需要**独立机制**（source-bias audit、claim-relation check），不是多加两个 perspective 就能解决。

## 3. 人格/角色 prompt 是弱杠杆（两条独立证据）

- Zheng et al. 2024：162 个角色 × 4 个模型族 × 2,410 道事实题，**persona 相对无 persona 控制组没有增益**；自动为每题挑「最佳 persona」也不比随机好。
- 2025 跟进（9 LLM、27 任务）：专家 persona 正向但不显著；**不相关的 persona 细节可带来约 30pp 的损失**。
- Claude Code 的做法是反过来的：**类型化约束**（tools / model / permissionMode / maxTurns）用 frontmatter 钉死；策略放 prose system prompt，且**懒加载**（子 agent 运行时才载入）；description 是路由索引，合并超过 15k token 会告警。

**对我们的含义（推断）**：

- 把「机器要校验/执行」的东西类型化（工具面、模型档、预算、输出 schema），把「需要模型临场判断」的放 prose 并懒加载；不要把策略塞进 persona 形容词。
- 我们的四角色如果要产生真实差异，必须落在**不同的输入（lens）、不同的工具面、不同的模型档**上；只改 persona 文案，按两条独立证据，收益接近零。

## 4. 验证：同模自我批评会掉点，judge 偏爱自己

- **同模 self-critique 无外部 verifier**（GPT-4，100 例/域）：Graph Coloring 16%→**2%**，Game of 24 5%→**3%**，Mystery Blocksworld 4%→**0%**；换成 sound verifier 才回到 38% / 36% / 10%。论文报告 false-negative rate 95.8%（graph coloring）——**同模 critic 主要在注入拒绝噪声**。
- **LLM judge 偏爱自己**：GPT-4 在 pairwise 里选自己摘要的比例 59.3%，选别人 18%；自识别率 73.5%，且自识别与自偏爱线性相关。
- **DeepResearch Bench FACT**：按 statement-URL 对打分；被测 agent 的 citation accuracy 78.0–90.2%——**即便头部也留下 10–22% 不被支持的引用**；judge 与人类在 100 对上的一致率 96%（support）/ 92%（not-support）；但 judge 是 Gemini-2.5-Flash，同时也在给 Gemini agent 打分。

**对我们的含义（推断）**：

- 「critic 是同一模型」不是独立验证；如果它只是读草稿给意见，按上述证据可能**降低**准确率。它能站住的前提是**证据接地**：逐条重抓 URL、比对原文、要求 quote、claim-first。
- 如果部署里有第二个模型族，claim 验证应换模型；没有的话，必须在报告里写明「同模异上下文，独立性有限」，并用机械重抓 + quote 匹配补硬。
- 10–22% 不支持引用是**行业现状**，不是我们的羞耻；把它显性化成 `UNVERIFIED` 与覆盖缺口，比假装 100% 更可信。
- judge-human agreement 应该被记录（哪怕只有几十对），否则「PASS」只是模型自嗨。

## 5. 对第一遍采纳度矩阵的增补

| 做法 | 新证据 | 计数变化 | 判定 |
|---|---|---|---|
| brief 有固定字段 | LangGraph 的 brief 是**字符串**（反例）；Anthropic 四字段 | 仍 1 | **差异化**（且更容易做错） |
| 预算在决策点执行 | LangGraph prompt 声明、代码晚夹 + max+1；Anthropic 数值预算 | 0 家做到「调用前拒绝」 | **空白** |
| perspective/lens 提升覆盖 | STORM 唯一来源 99.83→54.36；大纲几乎不动 | +1 | **差异化，但按覆盖计** |
| persona 本身改变结果 | Zheng 2024 空结果；2025 不相关细节 -30pp | 负结果 +1 | **警告** |
| 同模 critic 提升质量 | self-critique 16%→2%；judge 自偏爱 59.3% | 负结果 +1 | **警告** |
| 逐 claim citation 验证 | FACT 有基准；头部 78–90%，10–22% 不支持 | +1（评测） | **空白（生产）** |
| judge-human agreement | FACT 96/92（100 对） | 1 | **差异化** |
| per-child 错误隔离 | LangGraph `or True` 整层 abort | 0 | **空白** |

## 6. 修正第一遍的三处

1. **「引用精度」不是产品文案**：FACT 量到 78–90%，10–22% 不支持；这应该是我们的基线假设，不是「别人都做对了」。
2. **「perspectives 有用」要限定**：STORM 的增益在来源覆盖，不在大纲；persona 本身是弱杠杆。lens 设计必须按覆盖计量，并做去重/配对。
3. **「角色分工」的负结果现在有两条独立证据**：Anthropic 2026 的 prescriptive roles 无差别 + Zheng 2024 的 persona 无增益。四角色必须靠输入/工具/模型差异站住，不能靠文案。

## 7. 来源

- LangGraph open_deep_research deep_researcher: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/deep_researcher.py
- LangGraph prompts: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/prompts.py
- STORM paper: https://ar5iv.labs.arxiv.org/html/2402.14207 ；https://arxiv.org/abs/2402.14207
- STORM repo: https://raw.githubusercontent.com/stanford-oval/storm/main/README.md
- STORM persona generator: https://raw.githubusercontent.com/stanford-oval/storm/main/knowledge_storm/storm_wiki/modules/persona_generator.py
- Persona null result: https://aclanthology.org/2024.findings-emnlp.888/
- Persona follow-up: https://aclanthology.org/2025.emnlp-main.1364/
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Self-critique collapse: https://arxiv.org/html/2402.08115v2
- Judge self-preference: https://arxiv.org/html/2404.13076v1
- DeepResearch Bench FACT: https://arxiv.org/html/2506.11763v1
