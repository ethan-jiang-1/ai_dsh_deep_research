# HITL1 题目接收·判型·澄清 —— 外部一手调研

日期 2026-09-29。全部结论来自亲读一手来源（官方文档 / 论文 / 政府文件），URL 内联。

## 1. 成熟 DR 产品的题目接收与路由

总发现：**五家都没有显式"问题类型分类器"**；路由是两层结构，判型维度是工作量与信息新鲜度，不是领域或题型：

- **入口档位（浅/深）**：Perplexity 由用户在搜索框 mode selector 手选 "Deep Research"，无自动判型；官方定位 = 专家级复杂任务（金融/营销/技术），运行 2–4 分钟，迭代搜索-阅读-推理并"随学习精炼研究计划"（[官方博客](https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research)）。Anthropic 给出唯一公开的量化判据：**事实性问题 1–2 次工具调用可答 → web search；不需新信息的复杂推理 → extended thinking；≥5 次工具调用、1–3 分钟多源综合 → research**（[帮助中心](https://support.claude.com/en/articles/11095361-when-should-i-use-web-search-extended-thinking-and-research)）。
- **深度档位**：Gemini 提供两档 agent（Deep Research 快 vs Max 全面，$1–3 vs $3–7/任务），由调用方选择（[官方文档](https://ai.google.dev/gemini-api/docs/deep-research)）；OpenAI 用 `max_tool_calls` 参数作"控制成本与延迟的主要手段"（[官方文档](https://developers.openai.com/api/docs/guides/deep-research)）。
- **规划前都不判型，但都重写题目**：ChatGPT DR 官方三步 = 中间模型澄清 → 中间模型改写成详细 prompt → 深研模型执行（同 OpenAI 文档）；Gemini `collaborative_planning`：先出研究计划供人审改批，官方建议复杂题开启（同 Gemini 文档）。STORM 无判型/澄清，用**视角发现**替代：从相似条目目录提炼 N 个视角 + 固定"基础事实"视角，并行提问后合并成大纲（[论文](https://arxiv.org/abs/2402.14207)）。

**可抄判型维度清单**：预期工具调用数 / 时长预算、是否需要外部新信息（vs 纯推理）、是否多源综合成报告、输出物形态（短答 / 报告 / 对比表）、深度成本档（工具调用上限）。我们"快速事实核查"对应 Anthropic ≤2 调用档，"全景"对应 Gemini Deep Research 档，"断言验证"无现成产品对应（见 §3 ACH）。

## 2. 澄清问题的触发机制

- **OpenAI（官方公开做法）**：ChatGPT 内置澄清步；API 版明确"模型期望完整 prompt、不会自行补问"，澄清要开发者自建（[文档](https://developers.openai.com/api/docs/guides/deep-research)）。官方澄清 agent prompt 三准则：bullet 结构化一次收集全部必要信息；**不问用户已提供的信息**；**自己绝不执行研究，只收集信息**。触发条件原话："若 prompt 足够详细则无需澄清/改写" = 信息充分性触发。配套改写规则：未提供但必要的维度显式标 open-ended，**不得虚构**（同上）。
- **ClariQ（IR 学术基准，UvA/微软/谷歌/Glasgow）**：把问题拆成两个研究任务——**何时问**与**问什么**；每条请求带 **1–4 分"澄清必要性"分级标注**（非二值）；主题分 ambiguous / faceted / single，facet 再分 informational / navigational；对话系统每步在"直接答 vs 反问"间显式决策，设计目标是平衡"问太多 vs 答不相关"（[arXiv:2009.11352](https://arxiv.org/abs/2009.11352)；其引用的 MIMICS 数据集用真实查询 + 点击行为做困惑信号）。
- **Gemini 形态不同**：不做提问式澄清，做**计划审阅式**澄清——计划 → 人改 → 批准 → 执行（[文档](https://ai.google.dev/gemini-api/docs/deep-research)）。
- **Claude Research**：帮助中心未记载任何前置澄清步，用户开关 Research 后直接跑（[帮助中心](https://support.claude.com/en/articles/11088861-use-research-on-claude)）。

**可抄触发规则**：① 澄清必要性打分 1–4 并设阈值（≥2 才问）；② 已问过 / 已提供的信息不再问；③ 一次问全（bullet + 每问附推荐选项；OpenAI 准则 + ClariQ question bank 思路）；④ 澄清 agent 与执行 agent 分离，澄清者禁做研究；⑤ 改写时未确认维度标 open，禁止脑补；⑥ 或以计划审阅替代提问（更重的 HITL 形态）。

## 3. 研究问题类型学候选

- **搜索目标分类（最贴合我们三分法）**：Broder 2002 三分 navigational / informational / transactional（[ACM](https://dlnext.acm.org/doi/10.1145/792550.792552)）；Rose & Levinson 2004 把 informational 细分为 **simple（单点事实）/ complex（学习型）/ extensive（穷尽研究）**——与我们"快速事实核查 / 探索全景"几乎同构（[WWW'04](https://dl.acm.org/doi/abs/10.1145/988672.988675)）。
- **QA 题型分类**：Li & Roth 2002 层级题型分类，6 粗类（缩写 / 描述 / 实体 / 人物 / 地点 / 数字）+ 50 细类，事实型问答的标准分类法（[ACL](https://aclanthology.org/C02-1150/)）。
- **参考咨询**：Taylor 1968 信息需求四层：visceral → conscious → formalized → compromized；用户一句话通常停在 conscious 层，**参考访谈的目的就是把需求推进到可表达的 formalized 层**——判"含糊度" = 需求落在哪层（[原文 PDF](https://faculty.washington.edu/harryb/courses/INFO310/Taylor1968.pdf)）。
- **情报分析 SAT 分类（补齐"断言验证"）**：CIA《Tradecraft Primer》按目的分三组：Diagnostic（Key Assumptions Check / Quality of Information Check / **Indicators or Signposts of Change** / **ACH**）、Contrarian（Devil's Advocacy / Team A-Team B / What-If）、Imaginative（Red Team / Alternative Futures），并给**全项目时间线**：开工做假设检查与头脑风暴，全程用 ACH + 指标，假设成形期用 contrarian，收尾复核（[CIA 2009，FAS 镜像](https://irp.fas.org/cia/product/tradecraft.pdf)）。映射：断言验证 → ACH（找区分性证据）；趋势 / 变化检测 → Indicators & Signposts；预测 → What-If / Alternative Futures；证据质量评估 → Quality of Information Check。

**类型学建议**：主轴用 Rose & Levinson 同构三分（simple / complex / extensive ↔ 事实 / 全景 / 深研），"断言验证"单列并绑定 ACH 方法论；Taylor 四层作澄清提问的理论框架（问什么 = 把需求从 conscious 推到 formalized）；SAT 时间线映射到 HITL 阶段与组队。
