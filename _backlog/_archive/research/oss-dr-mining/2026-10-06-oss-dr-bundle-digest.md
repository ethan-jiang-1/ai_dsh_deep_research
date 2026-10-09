# 开源 DR 面 bundle 证据 digest（案头）

> **服务卡**：[2026-10-06-oss-dr-lessons](../../settled_issues/2026-10-06-oss-dr-lessons.md) ｜ **截至日期**：2026-10-06（本机 `bash date` = Tue Oct 6 14:10:13 CST 2026，与 run 口径日一致）
> **口径声明**：本文是对已交付 run bundle `research-workspace/archive/drt_dr-product-landscape/` 的**二手消化**——只读本地文件、不联网；原始证据以 bundle 卡为准，本文每条结论带 `[来源: evidence/os-xx.md]` 指针，链接指向 bundle 内对应卡。引文行只放原文（卡片自己的标注不进引文块）。凡卡片没写的，标"未取得"，不臆断。
> **输入面**：evidence/ 实存 `os-*` 卡 **27 张**（ls 逐一核对；final.md §6 头部写"26 张"而其分项 3+6+11+7=27——簿记差 1，见 §三.5）+ final.md §1.5/§3/§5 G6·G7 + leads.md §6/§7 + findings.md F21–F25 + review.md 三轮 os 相关记录。
> **链接基准注记**：本文按"从 `_backlog/reference/oss-dr-mining/` 出发"取**三层**相对前缀 `../../../research-workspace/archive/drt_dr-product-landscape/…`（任务书示例写 `../../`，按该起点实算少一层，这里以可解析为准）。

---

## 一、逐家合并画像

### 1. GPT Researcher（assafelovic/gpt-researcher）

**活跃度口径**：29,922★ / 4,084 forks / **open issues 仅 27**（相对近 3 万 star 体量极低，各卡对比项里最突出的一条）/ `pushed_at` 2026-10-01 / `archived: false` / Apache-2.0 / Python，全部为 2026-10-06（北京）抓取当刻近似读数。[来源: evidence/os-gptr-repo.md]
Release 节奏：v3.7.0（2026-09-26）→ v3.6.1（2026-08-24）→ v3.6.0（2026-07-18），近三个月每月一次有内容 release，判"不属活跃度掉队"。[来源: evidence/os-gptr-releases.md]
**critic 重抓漂移**：star 重抓读 29,923（卡 29,922，+1，判正常漂移，不计差错）。[来源: review.md §一]

**架构形态（卡片原文判据）**：**双轨**——默认是 planner/execution/publisher 三段式 pipeline，另有以 LangGraph / AG2 构建的 multi-agent 助手作并列形态，不能只写"多 agent"：

> The core idea is to utilize 'planner' and 'execution' agents. The planner generates research questions, while the execution agents gather relevant information. The publisher then aggregates all findings into a comprehensive report.

> As AI evolves from prompt engineering and RAG to multi-agent systems, we're excited to introduce multi-agent assistants built with [LangGraph](https://python.langchain.com/v0.1/docs/langgraph/) and [AG2](https://github.com/ag2ai/ag2).

[来源: evidence/os-gptr-arch.md]

**差异化定位**（官方自述）：① Apache-2.0 完全开源；② `OPENAI_BASE_URL` 指向 OpenAI 兼容端点（含本地模型）；③ Docker 自托管（Python `localhost:8000` + React `localhost:3000`）；④ LangSmith 追踪多 agent 工作流；⑤ 成本口径 ~5 分钟 / ~$0.4 每次（模型 `o3-mini`、effort `high`——无日期口径，README 撰写当刻估计值，引用须保留 estimated 性质）。[来源: evidence/os-gptr-arch.md]

**卡片里有、final.md 因形态层红线/篇幅没写进的机制细节（核心增量）**：
- **Jev 上下文过滤器的完整机制**（final 只写了一句"Jev 上下文过滤器成为默认"）：选 context 的判据是**有用性而非相似度**、`TYPESAFE_API_KEY` 在场才用 Jev、无 key 或调用失败回落本地 BM25、**从此不需要 embeddings provider**、且 report chat 用同一过滤器：

> GPT Researcher now picks the context it sends to the LLM by **usefulness, not similarity**.

> **Nothing is required.** With `TYPESAFE_API_KEY` set, Jev is used. Without one, or if a Jev call fails, GPT Researcher falls back to local keyword (BM25) ranking, so you no longer need an embeddings provider for standard research. Report chat uses the same filter.

[来源: evidence/os-gptr-releases.md]
- **两处官方文本自相矛盾，卡已如实记录、final 未收**：release tag `v3.7.0` 与同段 notes 的包版本 `pip install -U gpt-researcher (0.16.0)` 并存；release notes 要求 Python 3.12+ 而 README 仍写 3.11+。[来源: evidence/os-gptr-releases.md]
- **v3.6.1 的 "land 97 queued PRs"** 是维护者一次性清理积压，不代表常态合并速度。[来源: evidence/os-gptr-releases.md]
- **本地文档研究**：支持 PDF / plain text / CSV / Excel / Markdown / PowerPoint / Word 七类格式作研究语料；multi-agent 助手单次产出 5–6 页报告（PDF / Docx / Markdown）。[来源: evidence/os-gptr-arch.md]
- **一处引用归属疑点（web 深挖须核）**：final.md §1.5 写"retriever 插件化"并引 os-gptr-releases.md，但**该卡摘录内并无此条目**；"retriever 插件化（entry points）"原话在 leads.md §6 GPT Researcher 节（scout 笔记，非证据卡）。[来源: evidence/os-gptr-releases.md]（反证面）+ 来源: leads.md §6（`research-workspace/archive/drt_dr-product-landscape/leads.md`）（线索面）

### 2. STORM（stanford-oval/storm）

**活跃度口径**：31,573★ / 110 open issues / **`pushed_at` 2025-09-30**（最后一条 commit 内容自述为 `[nit] loose requirements version restriction`，非功能级）/ 最后 release **v1.1.0 = 2025-01-23**（约 20 个月前；性质为 LiteLLM/检索器接口打通型，非架构级）/ `archived: false` / MIT。[来源: evidence/os-storm-repo.md] [来源: evidence/os-storm-maint.md] [来源: evidence/os-storm-releases.md]
**PR 侧**：抓取所见开放 PR（#571 / #568 / #556）`merged_at` 全 null——社区仍在提交（#571 创建于 2026-09-18，作者 `author_association: NONE` 为外部贡献者）但**维护者侧未见合并**；"近 12 个月合并 PR 计数"未取得（无该端点调用）。[来源: evidence/os-storm-prs.md]
**critic 重抓漂移**：无（#22 重抓逐字段一致）。[来源: review.md §一]

**架构形态（卡片原文判据）**：检索-写作 pipeline 两阶段 + 四模块；机构项目页同框架互证（同源，不算独立二源）：

> 1. **Pre-writing stage**: The system conducts Internet-based research to collect references and generates an outline.
> 2. **Writing stage**: The system uses the outline and references to generate the full-length article with citations.

> Both STORM and Co-STORM are implemented in a highly modular way using [dspy](https://github.com/stanfordnlp/dspy).

[来源: evidence/os-storm-arch.md] [来源: evidence/os-storm-lead-domain.md]

**差异化定位**：① 四模块可独立跑（`do_research` / `do_generate_outline` / `do_generate_article` / `do_polish_article` 四开关，中间产物可单独落盘复用）；② LM/embedding 走 litellm 全量、检索器 10 种（`YouRM`/`BingSearch`/`VectorRM`/`SerperRM`/`BraveRM`/`SearXNG`/`DuckDuckGoSearchRM`/`TavilySearchRM`/`GoogleSearch`/`AzureAISearch`）；③ 分层用模降本建议（无数字口径）；④ MIT 自托管；⑤ **官方主动能力边界声明**："cannot produce publication-ready articles"——本题唯一如此明确自我限定的项目。[来源: evidence/os-storm-arch.md]

**卡片里有、final.md 没写进的机制细节（核心增量，本家最厚）**：
- **提问质量的两条机制**——final 的架构行只写了"两阶段+四模块"，这两条全没进：

> STORM identifies the core of automating the research process as automatically coming up with good questions to ask. Directly prompting the language model to ask questions does not work well. To improve the depth and breadth of the questions, STORM adopts two strategies:
> 1. **Perspective-Guided Question Asking**: Given the input topic, STORM discovers different perspectives by surveying existing articles from similar topics and uses them to control the question-asking process.
> 2. **Simulated Conversation**: STORM simulates a conversation between a Wikipedia writer and a topic expert grounded in Internet sources to enable the language model to update its understanding of the topic and ask follow-up questions.

[来源: evidence/os-storm-arch.md]（项目页侧的 acronym 展开 "Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking" 见 [来源: evidence/os-storm-lead-domain.md]）
- **Co-STORM 的 Moderator 取材机制**（问题生成可 grounding 到"retriever 发现但前轮未直接使用"的信息）：

> - **Moderator**: This agent generates thought-provoking questions inspired by information discovered by the retriever but not directly used in previous turns. Question generation can also be grounded!

[来源: evidence/os-storm-arch.md]
- **分层用模的官方建议原文**（便宜模型跑对话模拟、强模型跑成文）：

> # For a good practice, choose a cheaper/faster model for `conv_simulator_lm` which is used to split queries, synthesize answers in the conversation.
> # Choose a more powerful model for `article_gen_lm` to generate verifiable text with citations.

[来源: evidence/os-storm-arch.md]
- **模块落点**：接口定义在 `knowledge_storm/interface.py`，实现在 `knowledge_storm/storm_worm/modules/*`（卡内原文为 `storm_wiki/modules/*`）。[来源: evidence/os-storm-arch.md]
- **未合并的 v1.2 线索**：PR #556 "Version/v1.2 final packaging"（2026-07-28 创建、未合并、releases 端点无 v1.2）——只是打包意图，不得预告发布。[来源: evidence/os-storm-releases.md] [来源: evidence/os-storm-prs.md]

### 3. DeerFlow（bytedance/deer-flow）

**活跃度口径**：**83,412★**（生态内最高，约为 gptr 的 2.8 倍、LDR 的 9.1 倍——倍数仅按同批抓取算）/ 当日 push（2026-10-05T14:34:57Z）/ 901 open issues / v2.1.0 = 2026-09-24 / MIT。引用"最近活动"须写明用 `pushed_at` 还是 `updated_at`（两者语义不同）。[来源: evidence/os-deerflow-repo.md]
**发布规模可量化**：v2.1.0 里程碑 **772 merged PRs / 178 contributors**，v2.0.0 里程碑 182 PRs——本题唯一给"合并 PR 计数"的官方发布记录（口径 = 该里程碑内，非全部历史）。[来源: evidence/os-deerflow-releases.md]
**critic 重抓漂移**：无（#24 重抓一致，"当日 push"成立）。[来源: review.md §一]

**架构形态（卡片原文判据）**：2.x = super agent harness（LangGraph/LangChain 底座）；**1.x 才是 DR 框架**，官方明示不共享代码：

> **DeerFlow 2.0 is a ground-up rewrite.** It shares no code with v1. If you're looking for the original Deep Research framework, it's maintained on the [`1.x` branch](https://github.com/bytedance/deer-flow/tree/main-1.x) — contributions there are still welcome. Active development has moved to 2.0.

[来源: evidence/os-deerflow-arch.md]

**差异化定位**：① 唯一给硬件规格表（4/8/16 vCPU 分档，本地评估 4 vCPU/8 GB 起，"2 vCPU / 4 GB is usually not enough"）；② OpenAI 兼容网关 + **per-model reasoning 映射块**；③ 可验证执行（见下）；④ MIT。[来源: evidence/os-deerflow-arch.md] [来源: evidence/os-deerflow-releases.md]

**卡片里有、final.md 没写进的机制细节（核心增量——本家机制原文最具体，对借鉴最有价值）**：
- **可验证执行四件套**（final 只写了一句"DeerFlow 的可验证执行"）：

> - **Verifiable agent execution** — every tool call carries a tamper-evident,
>   runtime-stamped receipt and a bounded receipt ledger reaches the model
>   context; subagent reports must cite tool receipts with verifiable deliverable
>   handles that the lead agent cross-checks; and `acceptance_criteria` on
>   delegations are checked deterministically parent-side (file existence,
>   recorded test-command exit status), with anything undecidable reported
>   UNVERIFIED. ([#4659], [#5076], [#5090], [#5109], [#4365])

[来源: evidence/os-deerflow-releases.md]
- **v2.1.0 其余机制清单**（release 正文一段带过、final 未收）：durable batch delegation、pluggable memory backends、four new sandbox providers、out-of-tree extension system、enterprise-grade authentication/authorization、projects + conversation branching + referenced conversations。[来源: evidence/os-deerflow-releases.md]
- **默认安全边界**：Docker 入口端口默认绑 `127.0.0.1`（local-trust 部署模型），`BIND_HOST` 显式放开。[来源: evidence/os-deerflow-releases.md]
- **per-model reasoning 映射块**（thinking `unsupported`/`optional`/`required`、effort 值与别名及默认、payload dialect、reasoning-history requirement）；air-gapped 部署可预置 archive（`DEER_FLOW_LARK_CLI_SKILLS_ARCHIVE`）。[来源: evidence/os-deerflow-arch.md]

### 4. Local Deep Research（LearningCircuit/local-deep-research）

**活跃度口径**：9,155★ / `pushed_at` 2026-10-05T20:43:18Z（不足 1 天）/ `archived: false` / MIT / **open issues 1,147**（相对 9,155 star 极高，与 gptr 的 27 成两极——卡只记数不判因）。[来源: evidence/os-ldr-repo.md] [来源: evidence/os-ldr-arch.md]
**critic 重抓漂移**：无（#28 重抓一致，push 2026-10-05T22:32:47Z，不足 1 天）。[来源: review.md §一]

**架构形态（卡片原文判据）**：**pipeline 与 LangGraph agent 双策略由用户选择**，不能单写"多 agent 编排"也不能单写"pipeline"：

> Choose the research strategy that fits: quick pipeline modes for fast facts, or fully agentic deep research for complex analysis and academic work.

[来源: evidence/os-ldr-arch.md]

**差异化定位**：① "Everything Local & Encrypted"、`self-hosted`/`local-llm`/`encryption` topics；② 本地模型三通道（Ollama :11434 / LM Studio :1234 / llama.cpp :8080，均 OpenAI 兼容端点）；③ 成本表（时长区间 + 是否耗 LLM，官方估计值非实测）；④ 数据自持与零遥测（见下）。[来源: evidence/os-ldr-arch.md] [来源: evidence/os-ldr-repo.md]

**卡片里有、final.md 没写进的机制细节（核心增量）**：
- **加密自持的具体机制**：每用户独立 SQLCipher 库（AES-256，密钥由密码派生）；**密码不存储，登录 = 尝试解密**；per-user API key 加密存在同一库而非服务器级共享存储；无 telemetry/analytics/tracking：

> Your password is never stored — login works by attempting to decrypt your database, so the database files on their own are unusable to anyone who obtains them.

> Local Deep Research contains **no telemetry, no analytics, and no tracking**. We do not collect, transmit, or store any data about you or your usage.

[来源: evidence/os-ldr-arch.md]
- **零 LLM 成本的原始结果出口**：成本表 `search` 行 LLM Cost = **None**（5–30s），即不经 LLM 直取某引擎原始结果；这是"可审计中间产物"在本家的具体形态（final 未收）。[来源: evidence/os-ldr-arch.md]
- **Egress control 分档表**（Adaptive 为默认：按 primary engine 是公共引擎还是私有库决定本次 run 的出口档），final 未收。[来源: evidence/os-ldr-arch.md]
- **能力口径隔离**：description 里的 `~95% SimpleQA` 属能力类，run Scope 排除，仅可作"本地硬件可跑"的形态主张（`Qwen3.6-27B on a 3090`）。[来源: evidence/os-ldr-repo.md]

### 5. dzhng/deep-research

**活跃度口径**：19,755★ / MIT / TypeScript / `pushed_at` 2026-04-11（约 6 个月）/ `archived: false` / `size: 74`（KB，同接口可横比但**不得当代码量**）。[来源: evidence/os-dzhng-repo.md]
**critic 重抓漂移**：无（#26 重抓一致，`"size":74` 支持 "~74 KB"）。[来源: review.md §一]

**架构形态（卡片原文判据）**：**单模型递归循环**——无 planner/executor 分工、无独立写作模块：

> 3. **Recursive Exploration**
>    - If depth > 0, takes new research directions and continues exploration
>    - Each iteration builds on previous learnings
>    - Maintains context of research goals and findings

[来源: evidence/os-dzhng-arch.md]

**差异化定位**：① "simplest implementation" + `keep the repo size at <500 LoC`；② `OPENAI_ENDPOINT`/`OPENAI_MODEL` 指本地服务器，另支持 OpenRouter / Gemini 兼容端点；③ Docker；④ 产物落单文件（`report.md` / `answer.md`）；⑤ **成本结构无官方数字**（对照 gptr 的 ~$0.4，卡不代填）。[来源: evidence/os-dzhng-arch.md]

**卡片里有、final.md 没写进的机制细节**：
- **递归前的澄清步**：Initial Setup 会先"Generates follow-up questions to understand research needs better"——与闭源侧"OpenAI API 无澄清步"形成形态对照，final 未收。[来源: evidence/os-dzhng-arch.md]
- **搜索/抓取外依赖**：需 Firecrawl API（web search 与 content extraction）。[来源: evidence/os-dzhng-arch.md]
- **两种产物文件的触发条件口径不明**（README "depending on which modes you selected" 未展开模式清单——卡已标，报告需要须回源补摘）。[来源: evidence/os-dzhng-arch.md]
- 仓库体量对照（最小实现 vs 框架平台型的可观测差异）：gpt-researcher 53,675 / local-deep-research 105,491 / deer-flow 77,779 KB vs dzhng 74 KB。[来源: evidence/os-dzhng-repo.md]

### 6. Tongyi DeepResearch（Alibaba-NLP/DeepResearch）

**活跃度口径**：20,010★ / Apache-2.0 / `pushed_at` 2026-02-27（约 7 个月）/ `archived: false` / **`/releases` 返回 `[]`——从未发布 GitHub Release**（以"权重 + 推理脚本"分发，非版本化 release 分发）。[来源: evidence/os-tongyi-repo.md]
**critic 重抓漂移**：无（#27 重抓一致）。[来源: review.md §一]

**架构形态（卡片原文判据）**：**单模型 agent 循环 + 两种推理范式**（卡明确标注：只摘到范式名称与用途，**循环结构原文未取得**——归类"单模型循环"的直接证据是 ReAct 范式本身，更强结构原文须回 `inference/react_agent.py` 或 arXiv:2510.24701，属卡内 gap）：

> - 🤖 **Agent Inference Paradigm Compatibility**: At inference, Tongyi DeepResearch is compatible with two inference paradigms: ReAct, for rigorously evaluating the model's core intrinsic abilities, and an IterResearch-based 'Heavy' mode, which uses a test-time scaling strategy to unlock the model's maximum performance ceiling.

[来源: evidence/os-tongyi-readme.md]

**差异化定位**：① **开源权重 + 可本地部署**（30B-A3B：30.5B 总参 / 3.3B 激活 per token；128K 上下文）；② OpenRouter 调用可 "without any GPUs"；③ **交付形态 = 权重型，非框架型**——纳入"DR 框架生态"必须标注，否则混淆两种交付形态（repo 卡显式要求）。[来源: evidence/os-tongyi-readme.md] [来源: evidence/os-tongyi-repo.md]

**卡片里有、final.md 没写进的机制细节（核心增量）**：
- **训练侧机制原文**（final 完全未收；属模型层，但卡片已摘）：

> - ⚙️ **Fully automated synthetic data generation pipeline**: We design a highly scalable data synthesis pipeline, which is fully automatic and empowers agentic pre-training, supervised fine-tuning, and reinforcement learning.

> - 🔁 **End-to-end reinforcement learning**: We employ a strictly on-policy RL approach based on a customized Group Relative Policy Optimization framework, with token-level policy gradients, leave-one-out advantage estimation, and selective filtering of negative samples to stabilize training in a non‑stationary environment.

[来源: evidence/os-tongyi-readme.md]
- **外部依赖三件**：`SERPER_KEY_ID`（Serper.dev，web search + Google Scholar）、`JINA_API_KEYS`（网页阅读）、`SANDBOX_FUSION_ENDPOINT`（字节 SandboxFusion Python 沙箱）。[来源: evidence/os-tongyi-readme.md]
- **官方自我设限**：demo 仅限快速探索（延迟波动 / 工具 QPS 限制），稳定体验推荐本地部署、生产走 bailian；推荐 Python 3.10.0。[来源: evidence/os-tongyi-readme.md]
- 基准自述（HLE / BrowseComp 等 "state-of-the-art"）**Scope 排除，不得引用作胜负**。[来源: evidence/os-tongyi-readme.md]

### 7. LangChain Open Deep Research（langchain-ai/open_deep_research）

**活跃度口径**：12,685★ / **`archived: true`**（题面假设 STORM 可能归档，实测归档的是这家）/ MIT / `pushed_at` 2026-08-10 / `description: null` / **`/releases` 返回 `[]`（从未发布 release，须写"无 release 记录"而非"最新 release 未知"）** / **归档时间未取得**（仓库对象无 `archived_at` 字段，须查仓库页横幅——G7 缺口）。[来源: evidence/os-odr-repo.md]
**critic 重抓漂移**：无（#23 重抓一致，含 `"archived":true`）。[来源: review.md §一]

**架构形态（卡片原文判据）**：当前 = LangGraph 图式研究 agent；**关键点：multi-agent 已被移入 `legacy/`**——"multi-agent"标签在同一个项目里会随版本失效：

> #### 2. Multi-Agent Implementation (`legacy/multi_agent.py`)
> - **Supervisor-Researcher Architecture**: Coordinated multi-agent system
> - **Parallel Processing**: Multiple researchers work simultaneously

> The `src/legacy/` folder contains two earlier implementations that provide alternative approaches to automated research. They are less performant than the current implementation, but provide alternative ideas understanding the different approaches to deep research.

[来源: evidence/os-odr-arch.md]

**差异化定位**：① **本题成本口径最强的一家**——README 直接给美元金额与 token 数（按配置分列，见下）；② 四条任务槽分模型；③ 检索默认 Tavily、全 MCP 兼容、支持 Anthropic/OpenAI 原生 web search；④ 部署两条路（本地 LangGraph Studio / 托管 LangGraph Platform）；⑤ MIT。[来源: evidence/os-odr-arch.md]

**卡片里有、final.md 没写进的机制细节（核心增量）**：
- **四条任务槽及默认模型**：Summarization（默认 `openai:gpt-4.1-mini`）/ Research（`openai:gpt-4.1`）/ Compression（`openai:gpt-4.1`）/ Final Report（`openai:gpt-4.1`）。[来源: evidence/os-odr-arch.md]
- **成本表（自测口径，Deep Research Bench 100 例、对应各 commit 固定配置；GPT-5 行 Total Cost 单元格为空，不得推算；RACE Score 属能力口径，Scope 排除）**：Defaults 行 **$45.98 / 58,015,332 tokens**；Claude Sonnet 4 行 **$187.09 / 138,917,050 tokens**；官方警示 "Running across the 100 examples can cost ~$20-$100 depending on the model selection"。final 只写了"成本结构是本题最强的一家"，金额本身未进 final 正文。[来源: evidence/os-odr-arch.md]
- **legacy 路径一的完整形态**：plan-and-execute 结构化工作流 + human-in-the-loop planning + 逐 section 顺序处理带 reflection——这是"被官方判为 less performant 而放弃"的路径存档，对借鉴判断有对照价值。[来源: evidence/os-odr-arch.md]

### 8. 分诊个案（khoj / SkyworkAI / 名录四项 / 检索清单）

**khoj（khoj-ai/khoj）**：37,562★（生态内第二高）但**助手型，非 DR 框架**——README 自述 "a personal AI app"，功能清单无 planner/executor、无研究阶段切分、无报告管线；topics **无 `deep-research`**（对照 deer-flow / Alibaba-NLP 均有）；**AGPL-3.0**（网络服务分发义务，对自建决策有实质影响）；`size` 117,280 KB（本题最大）；push 2026-08-02。[来源: evidence/os-khoj-repo.md] [来源: evidence/os-khoj-readme.md]
**critic 重抓**：#25 一致，并复核 description 含 "do deep research" + "Self-hostable"（分诊有据）。[来源: review.md §一]

**SkyworkAI/DeepResearchAgent**：**自演化 runtime**（非工作流编排型 DR 框架）——RSPL（资源基座协议层：prompts/agents/tools/environments/memory 建模为带 state/lifecycle/versioned 接口的协议注册资源）+ SEPL（自演化协议层：closed-loop 的 propose/assess/commit，带 auditable lineage 与 rollback）+ Act/Observe/Optimize/Remember 循环；DR agent 只是其上的 tool-calling agent。**官方文本矛盾已落卡不调和**：GitHub description 写 hierarchical multi-agent system，README 正文通篇未提（疑似 v2.0.0 "self evoving" 后定位迁移或 description 未同步）；活跃度卡门槛边缘（push 2026-05-04，但 release v2.0.0 = 2026-02-24 且 **body 为空**、最近提交 "update readme" 非实质更新），MIT、3,555★、quality B（判据支撑偏弱打折）。[来源: evidence/os-skywork-readme.md]
**critic 修正**：首轮 §3 表该行只有"门槛内 / —"，critic 判为**有据未引**（MAJOR M4 一部分），final 已补 "3,555★ / push 2026-05-04 / release v2.0.0 body 为空"。[来源: review.md §一 M4]

**名录四项（排除项名册，判据三条：官方自述是否 DR 框架 / 有无 `deep-research` 语义标记 / 是否在活跃度门槛之上）**：[来源: evidence/os-non-framework-roster.md]
1. **virattt/dexter**——金融垂直（"An autonomous agent for deep financial research"），27,638★，topics 空、**`license: null`（未标注许可，报告若提及必须注明）**，push 2026-09-23。
2. **QwenLM/Qwen-Agent**——通用 agent 框架（Function Calling / MCP / Code Interpreter / RAG），17,133★，无 DR 标记，push 2026-03-04；scout 在 leads §6 标"是否算 DR 框架需 analyst 判"，本卡即该判断落卡。
3. **HKUDS/Auto-Deep-Research**——学术原型（homepage = arXiv:2502.05957），1,748★，push 2025-10-16（约 12 个月），`license: null`；**是否有 release 口径不明**（卡未查该端点——G7 关联缺口）。
4. **khoj-ai/khoj**——助手型（见上）。

**检索清单口径卡**：GitHub 官方检索 "deep research" + stars>1000 返回 **total_count = 28**——门槛之上候选池是数十量级，**本 run 是抽样而非穷举**；四条检索限制：① 只覆盖 name/description/readme 含字面 "deep research" 的仓库（**STORM 因此漏网**，其 description 为 "An LLM-powered knowledge curation system…"，必答框架须走定向核验）；② `per_page=20` 只摘了 8 条；③ 分词/相关性排序可能漏高星仓；④ 检索卡与专卡的 star 读数来自不同次抓取，引用以专卡为准。[来源: evidence/os-gh-search-inventory.md]

---

## 二、口径与红线（下一路 web 深挖与借鉴判断必须继承）

1. **star 单源**：开源面的 star/活跃度事实**只有 GitHub 自有接口一个可靠源**——`raw.githubusercontent.com` 与 `api.github.com` 同属 GitHub，同域两卡不构成独立二源；第三方 OSSInsight 读数（gptr 23,323 / storm 25,801 月点）系统偏低约 6–7k 且其 `data_quality` 自述 "counts are lower bounds, not exact values"（`status: degraded`，2025-05-23 起降级、2026-05-01 起严重降级）→ **只作趋势与校准，不得写成"双源交叉验证"，不得取平均**。连带：OSSInsight 侧的事件推导 PR/issue 计数同受下界影响，且 2025-11 起 GitHub 裁剪载荷（PR 增删行数、push 提交计数返回 0 = unknown）——**第三方源的 PR/commit 计数不可用于活跃度判断**。[来源: evidence/os-ossinsight-stars.md] [来源: evidence/os-source-additivity.md]（final §1.5 口径提醒一）
2. **读数时刻**：一切 star/活跃度数字是**抓取当刻近似读数**，须随数带时刻，不对齐成同一个数；活跃度判据一律 `pushed_at` + 最新 release，**不用 `updated_at`**（会被 star/元数据刷新——STORM 的 updated_at 2026-10-05 与 pushed_at 2025-09-30 相差一年即例证）。[来源: evidence/os-source-additivity.md] [来源: evidence/os-gh-search-inventory.md]（final §1.5 口径提醒二 + leads §7.2）
3. **差异化只列形态维度**：自托管 / 可换模型 / 可审计 / 成本可控四条形态轴；**不引任何评测分数、不做能力判决**（`~95% SimpleQA`、`RACE Score`、Tongyi 基准清单等一律 Scope 排除）；"可审计链路"经 critic m8 修正后为**部分家具备（GPT Researcher / DeerFlow），未逐家取证，不作全生态共性**。[来源: evidence/os-gptr-arch.md]（final §1.5 口径提醒三 + review m8）
4. **措辞纪律（archived vs 停更）**：`archived: false` + 长期无 push → 只能写"**近 12 个月无代码推送 / 停更**"，**不能写"已归档"**（STORM）；真正 `archived: true` 的是 LangChain ODR；PR 侧只能说"本次抓取所见的开放 PR 均 merged_at: null"，不能说"所有 PR 都未合并"（未穷举）。[来源: evidence/os-storm-repo.md] [来源: evidence/os-storm-prs.md] [来源: evidence/os-odr-repo.md]
5. **G6/G7 缺口现状（深挖时应顺手破的）**：G6 = 开源 star 的独立第二源（GitHub 自有接口为唯一可靠源，第三方读数自述下界且偏低——若深挖找到新的可信第三方源须先验其口径）；G7 = 三个小缺口：LangChain ODR **归档日期**（须查仓库页横幅，仓库对象无 `archived_at`）、Auto-Deep-Research **是否有 release**（roster 卡未查该端点）、Tongyi **ReAct/Heavy 循环结构原文**（须回 `inference/react_agent.py` 或 arXiv:2510.24701）。均不影响主体结论。[来源: final.md §5 G6/G7] [来源: evidence/os-odr-repo.md] [来源: evidence/os-non-framework-roster.md] [来源: evidence/os-tongyi-readme.md]
6. **版本线纪律**：同仓库多版本线必须分开写——DeerFlow 2.x（harness）≠ 1.x（DR 框架，`main-1.x` 分支）；ODR 当前实现 ≠ `legacy/` 两套存档；Skywork description ≠ README。**"multi-agent"一词在本生态里不能笼统使用**（编排基底、是否已 legacy、版本线各不同）。[来源: evidence/os-deerflow-arch.md] [来源: evidence/os-odr-arch.md]（findings F23 备注）

---

## 三、review.md 修正节（critic 对开源卡的重抓与修正）

1. **重抓面**：三轮累计 36 次 `web_fetch` / 33 成功 / 3 次 403（403 全部在 Perplexity/Google 闭源侧，开源卡零失败）；开源卡相关重抓 #21–#29（gptr/storm/ODR/deer-flow/khoj/dzhng/Tongyi/LDR/检索端点）**全部一致，0 条内容不符**。[来源: review.md §一]
2. **唯一读数漂移**：gptr star 29,922（卡）→ 29,923（critic 重抓），+1，判正常漂移；final §3 表注已主动登记该读数差。[来源: review.md §一]
3. **M4（§3 速查表）**：表头原缺"读数时刻"、表缺单源声明、SkyworkAI 行"有据未引"（卡里有 3,555★ / push 2026-05-04 / release 空 body 而表写"—"）→ 已修：表头补"读数时刻 = 2026-10-06（北京）"、表注补"star 单源——待破 + critic 读数 29,923 登记"、SkyworkAI 行补全数值。[来源: review.md §一 M4 + §二复核表]
4. **m8（可审计链路收敛）**：原稿把"可审计链路"写成开源侧共性 → 收敛为"**部分家（GPT Researcher / DeerFlow）具备——未逐家取证，不作全生态共性**"。[来源: review.md §三 m8]
5. **n2/n5（OSSInsight 卡）**：storm 端点读数与 gptr 同卡承载但 frontmatter `source_url` 只有一条 → 修法 = 正文显式具名 storm 端点并自述 YAML 单值限制；critic 判可接受但**非理想形态**（n5，不阻断的簿记备注，建议下次拆卡或加"附加端点"注记）。连带判定：storm 侧 `2026-01-01` 点位 25,186（卡）vs 25,187（重抓）±1 在该接口自述的"lower bounds"性质之内，**不计差错**。[来源: review.md §二 n2 + §三 n5]
6. **日期口径分歧（os-source-additivity 卡承载）**：leads §0 要求 `retrieved_at` 记 UTC 绝对时刻，作业指令要求记当刻北京口径日（2026-10-06）——同一时刻、不同日历日写法；25 张卡取 2026-10-06 并已上报 lead 在时效声明统一。深挖时如按 leads 的 UTC 口径校验会把这批卡读成"晚一天"。[来源: evidence/os-source-additivity.md]
7. **一条簿记差异（本 digest 直接核对，非卡片记载）**：final.md §6 头部写"共 71 张 / os-* 26 张"，但盘上 `ls evidence/` 实存 **72 个 .md（dr 25 + gap 20 + os 27）**，且 §6 自己的 os 分项 3+6+11+7=27 与"26"自相矛盾——review 第三轮曾核"glob = 71 个"，与本 digest 的 ls 结果差 1，**原因未取得**（可能是 review 核对时点后补卡，也可能是一处计数笔误），建议下一路引用张数时以"27 张 os-*"为准并回源复核。

---

## 四、对借鉴挖掘的输入（web 深挖应下钻点）

> 判据：卡片原文提过一嘴、但 final.md 因形态层红线或篇幅未展开的机制——凡下钻，逐条回源（官方 README/release/源码/论文），并继承 §二的口径与措辞纪律。

| # | 下钻点 | 出自 | 为什么值得下钻 |
|---|---|---|---|
| 1 | **DeerFlow 可验证执行四件套**：tamper-evident receipt per tool call → bounded receipt ledger 进模型上下文 → subagent 报告须引用带 verifiable deliverable handles 的 receipts → `acceptance_criteria` 父侧确定性核查（文件存在性 / 记录的 test-command exit status），判定不了标 `UNVERIFIED` | evidence/os-deerflow-releases.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-deerflow-releases.md`） | 本题对"可审计中间产物"最具体的官方机制描述；final 只留了一句。对应 PR #4659/#5076/#5090/#5109/#4365 可逐个读实现 |
| 2 | **DeerFlow per-model reasoning 映射块**（thinking 三态 / effort 别名与默认 / payload dialect / reasoning-history requirement）+ pluggable memory backends + out-of-tree extension system | evidence/os-deerflow-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-deerflow-arch.md`） evidence/os-deerflow-releases.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-deerflow-releases.md`） | "异构模型契约适配"的成熟做法；与 DSJ 式多 provider 配置问题同构 |
| 3 | **gptr Jev 上下文过滤器**：usefulness-not-similarity、`TYPESAFE_API_KEY`、失败回落 BM25、report chat 同一过滤器 | evidence/os-gptr-releases.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-gptr-releases.md`） | "无 embeddings 也可做上下文筛选"的降本路径，release notes 原文可回源核对实现 |
| 4 | **gptr retriever 插件化（entry points）** | 线索面：leads.md §6（**证据卡摘录未见此条**，final 引卡与卡内容存在归属疑点） | 下钻时先回源确认该机制是否真在 v3.7.0/0.16.0 落地，再谈借鉴 |
| 5 | **STORM Perspective-Guided Question Asking + Simulated Conversation**（survey 同类文章发现 perspective 控制提问；writer×topic expert 模拟对话产生 follow-up） | evidence/os-storm-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-storm-arch.md`） evidence/os-storm-lead-domain.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-storm-lead-domain.md`） | STORM 论文核心机制，卡片只有一段摘要；arXiv:2402.14207 / NAACL 2024 可下钻 |
| 6 | **STORM 分层用模降本**（`conv_simulator_lm` 便宜模型 / `article_gen_lm` 强模型）+ 四模块独立运行开关（`do_research` 等四函数）+ 10 种 retriever 插件面 | evidence/os-storm-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-storm-arch.md`） | 成本-质量分工与"中间产物可单独落盘"的 pipeline 组件化范式 |
| 7 | **STORM 未合并的 v1.2 与 #571 "[New RM] Add keyless Parallel Search and CLI defaults"** | evidence/os-storm-prs.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-storm-prs.md`） | 停更项目的社区活跃方向（keyless 检索器）可作"项目死后社区去哪"的观察样本 |
| 8 | **Co-STORM Moderator 机制**：问题生成 grounding 到"retriever 发现但前轮未直接使用"的信息 | evidence/os-storm-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-storm-arch.md`） | 协作式探索里"未消费信息再利用"的具体做法 |
| 9 | **LDR egress control**（Adaptive 模式：按 primary engine 属性分档强制本地/公共出口） | evidence/os-ldr-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-ldr-arch.md`） | 隐私-功能权衡的可配置出口控制，卡片只摘了表格未展开实现 |
| 10 | **LDR 零 LLM 成本原始结果出口**（`search` 工具 LLM Cost = None）+ SQLCipher 每用户加密（密码不存储、解密即登录） | evidence/os-ldr-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-ldr-arch.md`） | 自托管 DR 的数据自持基线做法 |
| 11 | **dzhng 递归循环 + 澄清步 + breadth/depth 参数化**（含 <500 LoC 目标） | evidence/os-dzhng-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-dzhng-arch.md`） | 最小可读实现样本：递归方向精炼如何用极少代码表达 |
| 12 | **Tongyi IterResearch "Heavy" test-time scaling 循环结构**（卡内 gap：react_agent.py / arXiv:2510.24701 未取） | evidence/os-tongyi-readme.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-tongyi-readme.md`） | G7 缺口之一；Heavy 模式 = test-time scaling 在 DR agent 上的实例 |
| 13 | **Tongyi 训练管线**：全自动合成数据（agentic pre-training/SFT/RL）+ on-policy GRPO 变体（token-level PG、leave-one-out advantage、negative sample 选择性过滤） | evidence/os-tongyi-readme.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-tongyi-readme.md`） | 权重型的 DR 训练配方，final 因形态红线完全未收 |
| 14 | **ODR 成本表全量 + GPT-5 行金额空缺原因**；**legacy 两套被弃路径**（plan-and-execute + HITL planning + reflection；supervisor-researcher 并行） | evidence/os-odr-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-odr-arch.md`） | "官方自测成本口径"的呈现方式 + 被官方判为 less performant 的路径存档（借鉴时的反例清单） |
| 15 | **ODR 四任务槽分模型**（Summarization/Research/Compression/Final Report 各配各的模型） | evidence/os-odr-arch.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-odr-arch.md`） | 流水线内"按任务粒度换模型"的最细粒度官方实例 |
| 16 | **Skywork RSPL/SEPL**（what evolves ≠ how evolution；propose/assess/commit + lineage + rollback） | evidence/os-skywork-readme.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-skywork-readme.md`） | "自演化 agent runtime"的协议化表达；注意其 description 与 README 矛盾，下钻以 README 原文为准并核 v2.0.0 前后叙事变迁 |
| 17 | **名录分诊三判据**（官方自述 / deep-research 语义标记 / 活跃度门槛）+ dexter、Auto-Deep-Research 的 `license: null` 风险 | evidence/os-non-framework-roster.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-non-framework-roster.md`） | 借鉴候选筛选时防"star 高 ≠ 框架"误判的可复用判据 |
| 18 | **检索口径边界**：字面 "deep research" 检索会漏 STORM 类项目——深挖时换语义检索/定向核验补池 | evidence/os-gh-search-inventory.md（`research-workspace/archive/drt_dr-product-landscape/evidence/os-gh-search-inventory.md`） | total_count=28 是字面检索上限，真实池更大 |

---

*digest 完。原始证据一切以 bundle 卡为准；本文不修改任何输入文件。*
