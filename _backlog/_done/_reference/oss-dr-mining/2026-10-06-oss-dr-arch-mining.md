# 开源 DR 框架架构深挖（web 一手调研）

> 服务卡：[_backlog/_closed_plans/2026-10-06-oss-dr-lessons.md](../../_closed_plans/2026-10-06-oss-dr-lessons.md)。
> 截至：**2026-10-06**（`bash date` 输出 2026-10-06 14:10 CST；本卡所有"当前/截至"类日期与 star 数口径均以此为抓取当刻）。
> 方法声明：只用一手来源——GitHub 仓库元数据（api.github.com）、README/源码原文（raw.githubusercontent.com）、作者博客原文；每条关键判断带完整 https URL；引文只放原文（引文块内），标注在引文块外；数字带口径。抓取通道说明：本会话 `web_fetch` 工具 DNS 层不可用（`resolves to a non-public IP address`），全部抓取经 `curl` 完成，抓取内容与一手来源无差。以下各节凡标"未取得（失败形态）"处均为如实记录，不臆断"官方没有"。
> 对比对象：packages/deep-research-pack（四角色 Lead/Scout/Analyst/Critic 经 DSH Agent Teams 协作；文件契约链 question.md→topics.md→leads.md→evidence/→findings.md→review.md→final.md+journal.md；八节点 I/O 契约含回边；机械门禁 node-gate/schema-scan/evidence-audit；两个人机交互点 HITL1/HITL2；方法论内核移植自 codex DR harness，2026-10-03 已对标 Anthropic multi-agent 工程自述与 OpenAI DR 系统卡）。

---

## 1. assafelovic/gpt-researcher

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/assafelovic/gpt-researcher ）：29,924 stars；`pushed_at: 2026-10-01`；最新 tag `v3.7.0`（https://api.github.com/repos/assafelovic/gpt-researcher/tags ）；默认分支 `main`；`archived: false`。

### a. 编排形态：三段式 pipeline 为默认，LangGraph/AG2 multi-agent 为并列双轨

README 对核心思路的原文：

> The core idea is to utilize 'planner' and 'execution' agents. The planner generates research questions, while the execution agents gather relevant information. The publisher then aggregates all findings into a comprehensive report.

（https://github.com/assafelovic/gpt-researcher/blob/main/README.md ，"Architecture" 节）

默认形态是**单包内的 skills 管道**（`gpt_researcher/skills/`：browser / context_manager / curator / deep_research / researcher / writer），不是 multi-agent：planner-execution-publisher 是"职责描述"而非独立进程，落到 `GPTResearcher` 一个对象上的异步方法链。

**双轨共存方式**：multi-agent 版本不接管默认包，而是仓库里的两个并列入口——`multi_agents/`（LangGraph）与 `multi_agents/ag2/`（AG2/autogen），由独立 README 与 docs 页分述：

> Looking for the AG2 version? See `multi_agents/ag2/` and the AG2 docs page.

（https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/README.md ）

LangGraph 版是 8 角色团队：Human（人）、Chief Editor（"master" agent，用 LangGraph 协调）、Researcher（内嵌整个 gpt-researcher 当子代理）、Editor（出大纲）、Reviewer（按判据验稿）、Revisor（按反馈改稿）、Writer（汇编终稿）、Publisher（多格式发布）；流程五阶段 "Planning / Data collection and analysis / Review and revision / Writing and submission / Publication"（同上 README）。图结构在 https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/agents/orchestrator.py ：`browser→planner→human`，`researcher→writer→fact_checker`，条件边 `{accept→visualizer, revise→writer}`，`visualizer→publisher→END`。**双轨共享同一套配置与检索底座**（multi-agent 版"utilizing the same configuration of models like GPT-Researcher does"），AG2/LangGraph 版只换编排壳。

另有第三形态：`deep_research` skill（`gpt_researcher/skills/deep_research.py`，https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/skills/deep_research.py ）把 dzhng 式 breadth/depth 递归移植成默认包的一个 ReportType（见 f 节），每个查询 spawn 一个嵌套 `GPTResearcher`。

### b. 规划与澄清步

- 默认包：**无用户澄清步**。`ResearchAgent.plan_research` 是给 query 生成子查询的 LLM 调用（https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/skills/researcher.py ），deep_research skill 的 `generate_research_plan` 生成的是研究问题清单（ deep_research.py，`async def generate_research_plan`），都不经过人。
- LangGraph 版：人机交互点是 `HumanAgent.review_plan`——通过 websocket 流式提问并阻塞收答复（https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/agents/human.py ）：

  > "Any feedback on this plan of topics to research? {layout}? If not, please reply with 'no'."

  是否启用由 `task.json` 的 `include_human_feedback` 开关控制；另设 `max_plan_revisions`（默认 3）——"The maximum number of human-requested plan revisions before the workflow exits with a clear error. Set to `null` to rely on LangGraph's recursion limit instead."（https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/README.md ）。

即：**计划审批是可关闭的单一交互点，且带修订次数上限**。

### c. 质量控制：prompt 级自审 + 有界回边，无机械判据门

- LangGraph 版有 **fact_checker 回边**：`FactCheckerAgent` 用 prompt 审稿——"You are a diligent Fact Checker Agent. Your goal is to review a research report draft, identify potential factual inaccuracies, hallucinations, or inconsistencies based on the provided research context... If the draft is factually sound, return exactly the string 'None'."（https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/agents/fact_checker.py ）。路由 `{accept→visualizer, revise→writer}` 由 `max_fact_check_revisions` 有界（https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/agents/fact_review.py ）。**它是纯 prompt 级、基于已有 research context 的复核，没有独立重抓**。
- 回边超界的处置是 fail-open 而非 fail-loud：orchestrator 捕获 `MaxPlanRevisionsExceededError` 后直接 `"accept"`（"the edge treats that as accept so the run proceeds instead of dying at LangGraph's recursion_limit"，orchestrator.py 注释）。
- 机械成分主要是**防自证式修复**而非质量门：retriever 契约的 `requires_scraping`（d 节）与 deep_research 的防空转（"#1579: if every branch at this level failed... stop instead of endlessly generating follow-ups from empty goals / empty learnings"，deep_research.py）。

### d. 引用与溯源：prompt 硬约束 + 声明式检索契约

- 引用规则是 prompt 级硬约束（https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/prompts.py ）：

  > You MUST write all used source urls at the end of the report as references, and make sure to not add duplicated sources, but only one reference for each.

  ```
  Use in-text citation references in {report_format} format and make it with markdown hyperlink placed at the end of the sentence or paragraph that references them like this: ([in-text citation](url)).
  Every substantive claim, figure or quote MUST carry an in-text citation to the source it came from. Do NOT cite sources that do not appear in the provided information.
  ```

- 来源优选判据写在 `curate_sources` prompt 里（relevance/credibility/objectivity/quantitative value 四轴，prompts.py 第 319–345 行附近）。
- **检索契约的机械声明**（本调研最值得记的修复之一）：`retrievers/base.py` 用 `requires_scraping` 类属性声明"该检索器返回的是待抓 URL 还是已取全文"，取代旧"snippet 长度>100 即视为已抓"的启发式。其 docstring 给出完整事故链（#1846, #1892）：

  > That guess is wrong whenever a snippet happens to exceed the threshold: the result is treated as already-fetched, its URL is never scraped, and the report ends up with no verifiable citation for it (#1846, #1892).

  （https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/retrievers/base.py ）

- `visited_urls` 在并发分支间共享去重、刻意不清空（researcher.py 注释："visited_urls is deliberately NOT cleared here... scraped URLs are not fetched again"）。

### e. 成本与终止

- 深度递归参数默认 `DEEP_RESEARCH_BREADTH=3, DEEP_RESEARCH_DEPTH=2`，普通报告 `TOTAL_WORDS=1200, MAX_ITERATIONS=3, MAX_SUBTOPICS=3`（https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/config/variables/default.py ）。
- 递归收窄：`new_breadth = max(2, breadth // 2)`（deep_research.py）；上下文硬顶 `MAX_CONTEXT_WORDS = 25000` 词 + `trim_context_to_word_limit` 截断。
- 终止条件：depth 耗尽 / 查询生成失败（"generated zero search queries; stopping descent"）/ 该层全失败即停（#1579 修复，防"从空 learnings 无限生成 follow-up"）。
- 上下文过滤成本（v3.7 主打）：README 给了同源回放基准（28 个研究任务、只换过滤器）：Jev 保留相关段落 73%、1.7s、$0.115/报告，需 `TYPESAFE_API_KEY`；keyword（BM25）51%、0.02s、零依赖；embeddings 46%；不过滤成本贵 65%。"Without one, or if a Jev call fails, GPT Researcher falls back to keyword (BM25) ranking, which runs locally with no API key, model or embeddings."（https://github.com/assafelovic/gpt-researcher/blob/main/README.md ，"Smart Context Filtering with Jev" 节；实现 https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/context/jev_filter.py ——四档有用性 rubric 逐 chunk 打分——与 https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/context/lexical.py ——零依赖 BM25）。开关单点：`CONTEXT_FILTER=auto|jev|keyword|embeddings|none`（default.py）。

### f. 报告综合与导出

报告类型矩阵（https://github.com/assafelovic/gpt-researcher/blob/main/gpt_researcher/utils/enum.py ，`ReportType`）：`research_report / resource_report / outline_report / custom_report / detailed_report / subtopic_report / deep`。每类对应不同 prompt/流程分支。导出走 Publisher：markdown/PDF/docx（multi_agents 版 "An average run generates a 5-6 page research report in multiple formats such as PDF, Docx and Markdown"，multi_agents/README.md）。可审计性：LangSmith 追踪（README："GPT Researcher supports **LangSmith** for enhanced tracing and observability"；https://github.com/assafelovic/gpt-researcher/blob/main/multi_agents/main.py 按 `LANGCHAIN_API_KEY` 开启 `LANGCHAIN_TRACING_V2`），另有 Monocle 追踪开关且配错 exporter 会 raise ValueError（main.py 头部，fail-loud 风格）。

### g. 对本仓的可借鉴点

1. **声明式检索契约 `requires_scraping` × evidence-audit.mjs / leads.md→evidence 抓取链**：gpt-researcher 的事故（snippet 恰好超过启发式阈值→URL 永不真抓→引用不可回溯）正是本仓 evidence-audit"source_url 必须真抓取过"要防的病。值得借鉴的不是代码而是**事故叙事 + 契约化修法**：凡"是否已抓取"靠推断而非声明的地方，把推断改成显式声明字段（evidence frontmatter 已有七字段，可对照检查有没有隐式推断残留）。
2. **回边有界化 + 超界处置语义显式化 × NODES.md 回边 / review.md 回边**：gpt-researcher 给 plan-revision 与 fact-check 两条回边都配了 `max_plan_revisions/max_fact_check_revisions` 上限。它选了 fail-open（超界强accept），本仓纪律是 fail-loud——值得做的是把"回边上限是多少、超界后是打回还是放行、放行时如何记录降级"写成 NODES.md 的显式契约行，而不是留给 agent 现场判断。
3. **同源回放基准法 × evaluation.md / 门禁反证**：Jev 上下文过滤器基准（28 任务回放同一批已抓源、只换过滤器、报告胜率与成本）是"新门禁带反证"的方法论样板——本仓将来若比较两种检索/过滤策略，可直接套用该实验设计（固定源集、单变量、成本口径）。
4. **curate_sources 四轴判据 × evidence frontmatter 的 quality 字段**：relevance/credibility/objectivity/quantitative value 是现成的 quality 打分判据词表，可充实 quality/source_tier 的判据说明（prompt 级，成本低）。
5. **上下文过滤降级链（外部打分器→本地 BM25→不过滤）+ 单点开关** × 本仓"策略参数 CLI 单点计算权威"：gpt-researcher 的 `CONTEXT_FILTER=auto` 是"有 key 用外部、无 key 回落本地、失败再回落"的单点决策，与本仓策略参数单点权威同构，可对照确认本仓的参数降级路径是否也如此显式。

### h. 不适用的 + 理由

- **LangGraph/AG2 multi-agent 双轨本身**：物种差异——本仓协作通道是 DSH Agent Teams，不需要第二套编排框架；且 gpt-researcher 的 multi-agent 版只是"同一底座换壳"，与本仓"角色即 preset"的形态不同。
- **websocket 前端 + 报告类型矩阵 + PDF/docx 导出**：本仓交付物是 final.md 文件契约，不做多格式发布；报告类型矩阵（7 种）与本仓单一 final.md 契约是两种产品定位。
- **Jev 外部打分服务本身**：引入外部 API 依赖与本仓 keyless 基线冲突；可借鉴的是降级链结构而非该服务。
- **fact_checker 的 prompt 级复核**：本仓 Critic 已是"独立重抓 + 对抗核查"的更强形态，此为弱等价物。

---

## 2. bytedance/deer-flow

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/bytedance/deer-flow ）：83,426 stars；`pushed_at: 2026-10-06`；最新 tag `v2.1.0`（https://api.github.com/repos/bytedance/deer-flow/tags ）。主分支已是 2.0；1.x 生存于 `main-1.x` 分支。

### a. 编排形态

**2.0（当前主线）**：定位从 DR 框架整体改写为"super agent harness"：

> DeerFlow 2.0 is a ground-up rewrite. It shares no code with v1. If you're looking for the original Deep Research framework, it's maintained on the `1.x` branch — contributions there are still welcome. Active development has moved to 2.0.

（https://github.com/bytedance/deer-flow/blob/main/README.md ，开头 NOTE）

分叉理由原文（README "From Deep Research to Super Agent Harness" 节）：

> DeerFlow started as a Deep Research framework — and the community ran with it. Since launch, developers have pushed it far beyond research: building data pipelines, generating slide decks, spinning up dashboards, automating content workflows. Things we never anticipated.
> That told us something important: DeerFlow wasn't just a research tool. It was a **harness** — a runtime that gives agents the infrastructure to actually get work done.
> So we rebuilt it from scratch. ... Built on LangGraph and LangChain, it ships with everything an agent needs out of the box: a filesystem, memory, skills, sandbox-aware execution, and the ability to plan and spawn sub-agents for complex, multi-step tasks.

（https://github.com/bytedance/deer-flow/blob/main/README.md ）

即 2.0 不再是 planner/researcher/reporter 管道，而是带文件系统/记忆（DeerMem）/技能/沙箱/子代理/IM 网关的通用 agent 运行时（README Core Features 节）。

**1.x（DR 框架本体，`main-1.x` 分支）**：LangGraph 图，节点接线（https://github.com/bytedance/deer-flow/blob/main-1.x/src/graph/builder.py ）：

> builder.add_edge(START, "coordinator"); ... builder.add_node("background_investigator", ...); builder.add_node("planner", ...); builder.add_node("reporter", ...); builder.add_node("research_team", ...); ... builder.add_conditional_edges("research_team", continue_to_running_research_team, ["planner", "researcher", "analyst", "coder"])

`continue_to_running_research_team` 按 Plan 的 Step 类型分派：`StepType.RESEARCH→researcher / ANALYSIS→analyst / PROCESSING→coder`，找第一个无 `execution_res` 的 step 执行，全部完成后回 `planner`（同文件）——**执行器循环回 planner、planner 再决定是否够料出报告**的双层循环。README 的角色叙述（https://github.com/bytedance/deer-flow/blob/main-1.x/README.md ，"Architecture" 节）：Coordinator（入口/生命周期）、Planner（分解与"是否够上下文"判断）、Research Team（Researcher 搜索抓取 / Coder 代码执行）、Reporter（汇合成报告）。

### b. 规划与澄清步：1.x 的两个显式人机点

- **计划审批（HITL）**：`human_feedback_node` 用 LangGraph `interrupt` 阻塞（https://github.com/bytedance/deer-flow/blob/main-1.x/src/graph/nodes.py ）：

  > feedback = interrupt("Please Review the Plan.")
  > ... if feedback_normalized.startswith("[EDIT_PLAN]"): ... goto="planner"
  > elif feedback_normalized.startswith("[ACCEPTED]"): logger.info("Plan is accepted by user.")

  未识别反馈/空反馈一律打回 planner；`auto_accepted_plan=True` 可全程跳过人工；`plan_iterations` 计数器随接受递增。**反馈协议是结构化文本标记（[EDIT_PLAN]/[ACCEPTED]），不是自由文本**。
- **多轮澄清**：State 里有一组澄清字段——`enable_clarification`（默认 False）、`clarification_rounds`、`clarification_history`、`max_clarification_rounds=3`、`clarified_research_topic`（https://github.com/bytedance/deer-flow/blob/main-1.x/src/graph/types.py ）；README 卖点原文："Intelligent Clarification Feature — Multi-turn dialogue to clarify vague research topics... Reduce ineffective searches and token usage. Configurable switch"（main-1.x README "Human Collaboration" 节）。即澄清是**可关的、有轮数上限的**独立节点。

### c. 质量控制

1.x 图内没有独立 reviewer/critic 节点与机械门禁——质量控制集中在两处：planner 的 `has_enough_context` 判断（不够料则继续派研究步，prompt 级）与 human_feedback 打回。回边（research_team→planner）由 step 完成状态驱动，属结构性而非判据性。（依据：builder.py 的 `continue_to_running_research_team` 仅按 `execution_res` 是否填满分派；仓库 `main-1.x` 的 `src/graph/` 目录清单 https://api.github.com/repos/bytedance/deer-flow/contents/src/graph?ref=main-1.x 无 reviewer 类节点文件。）

### d. 引用与溯源

State 显式携带 citations（"Citation metadata collected during research. Format: List of citation dictionaries with url, title, description, etc."，types.py）。报告侧防幻觉是 prompt 级硬规则（https://github.com/bytedance/deer-flow/blob/main-1.x/src/prompts/reporter.md ）：

> **Key Citations** ... This section MUST come early to ensure all URLs are accurate and verifiable.
> Only use URLs that appear in the provided source material or 'Available Source References'.
> NEVER fabricate or guess URLs. If a URL is not available, omit it.
> 7. **Key Citations** (repeated at end for completeness)

机制上与 gpt-researcher 同档：prompt 约束 + 来源白名单注入，无机械回溯审计。

### e. 成本与终止

- `plan_iterations` 上限式推进；`max_clarification_rounds=3`；planner `has_enough_context` 为真才进 reporter（types.py / builder.py）。
- 2.0 另提供模型请求准入控制（"Optional per-model request_admission paces requests to help stay within provider request-per-minute limits. It is disabled by default"，main README Configuration 节）。
- 1.x 支持多档 LLM（"Multi-tier LLM system for different task complexities"，main-1.x README）。

### f. 报告综合与导出

1.x README："AI-powered podcast script generation and audio synthesis；Automated creation of simple PowerPoint presentations（marp-cli：'Install marp for ppt generation'）；Report Post-Editing — Notion-like block editing + AI refinements，Powered by tiptap"（https://github.com/bytedance/deer-flow/blob/main-1.x/README.md ）。可观测：LangSmith/Langfuse/Monocle 三套 tracing（main README Advanced 节）。

### g. 对本仓的可借鉴点

1. **结构化 HITL 反馈协议（[ACCEPTED]/[EDIT_PLAN]）× HITL1 立项对齐**：deer-flow 把"批准/修改"编码成可机械识别的标记而非自由文本，未识别输入的默认行为是打回重规划。本仓 question.md 立项对齐目前靠人话对齐，值得在 HITL1 契约里规定显式接受/修改标记与"无效反馈→打回"的默认语义。
2. **背景调查节点（background_investigator 在 planner 之前）× question.md→topics.md 之间**：deer-flow 在规划前先跑一轮轻量搜索给 planner 垫底料（builder.py：`enable_background_investigation: bool = True`）。本仓 topics.md 生成若遇"方向太空"，一个不落 evidence/ 的预研位（或 journal.md 记一行）是低成本补强。
3. **step_type 三类分派（research/analysis/processing）× topics.md 的 must_answer**：deer-flow 的计划步骤自带类型字段并按类型分派给不同执行者。本仓 topics.md 的 must_answer 问项可增加类型维度（检索型/分析型/计算型），为条件分派提供依据。
4. **2.x 分叉叙事本身 × 本仓定位**：一个 DR 框架长成 harness 的真实路径（"wasn't just a research tool. It was a harness"）。对本仓的启示是反向的：本仓是 DSH 之上的插件（借 DSH 的 harness），不需要长出自己的 runtime——deer-flow 恰好演示了不借宿主长 runtime 的代价（ground-up rewrite、双版本维护）。
5. **reporter 防编造 URL 规则**（"NEVER fabricate or guess URLs. If a URL is not available, omit it."）：与本仓 evidence-audit 机械回溯同向，但本仓已有更强等价物——重复，降权，仅可抄其"引用节前置 + 尾部重复"的排版纪律。

### h. 不适用的 + 理由

- **2.0 super harness 全家桶**（沙箱/记忆/技能/IM 网关/定时任务）：物种差异——本仓宿主 DSH 已提供等价机制，自建即与"循 DSH 而不发明"宪章冲突。
- **podcast/PPT 生成链**：超出本仓交付契约（final.md），成本不成比例。
- **1.x 图内无对抗核查**：本仓 Critic 独立重抓已覆盖且更强，无物可借。
- **LangGraph interrupt 具体实现**：机制载体是 LangGraph 的，本仓 HITL 载体是 DSH 活标题机制（client-hitl），只借语义不借实现。

---

## 3. LearningCircuit/local-deep-research（LDR）

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/LearningCircuit/local-deep-research ）：9,156 stars；`pushed_at: 2026-10-06`；`archived: false`。README 性能口径：**"First open-source project — fully-local on a single RTX 3090 (Qwen3.6-27B) — to report ~95% SimpleQA (n=500) and 77% xbench-DeepSearch (n=100) on local hardware"**（https://github.com/LearningCircuit/local-deep-research/blob/main/README.md ；基准数据集 https://huggingface.co/datasets/local-deep-research/ldr-benchmarks ）。

### a. 编排形态：策略即插件，pipeline 与 LangGraph agent 同契约可切换

README 原文：

> Choose the research strategy that fits: quick pipeline modes for fast facts, or fully agentic deep research for complex analysis and academic work.
> **LangGraph Agent Strategy** — An autonomous agentic research mode where the LLM decides what to search, which specialized engines to use (arXiv, PubMed, Semantic Scholar, etc.), and when to synthesize. ... Select `langgraph-agent` in Settings.

（https://github.com/LearningCircuit/local-deep-research/blob/main/README.md ）

切换的实现底座是**同一抽象基类**：`BaseSearchStrategy`（https://github.com/LearningCircuit/local-deep-research/blob/main/src/local_deep_research/advanced_search_system/strategies/base_strategy.py ），子类含 `FocusedIterationStrategy`（固定迭代圈）、`langgraph_agent_strategy`、`source_based_strategy`、`news_strategy`、`topic_organization_strategy` 等（目录 https://github.com/LearningCircuit/local-deep-research/tree/main/src/local_deep_research/advanced_search_system/strategies ）。周边配套成体系：candidate_exploration（adaptive/parallel/progressive/diversity/constraint_guided 五种探索器）、constraints、evidence/evaluator、filters（cross_engine / journal_reputation / followup_relevance）、findings repository（同目录树可见，https://github.com/LearningCircuit/local-deep-research/tree/main/src/local_deep_research/advanced_search_system ）。

### b. 规划与澄清步

迭代式策略内自带问题生成（`questions_by_iteration`、atomic_fact_question 等问题生成器，advanced_search_system/questions/），逐轮细化；无独立"计划审批"HITL 节点（README 未列 plan approval 功能；交互面是设置项与 Web UI 参数）。**未取得**专门的 clarification 机制文档——按 README 功能清单不存在明确澄清步，此处不作"官方没有"以外的断言。

### c. 质量控制：多处机械门禁，本调研最丰富的样本

- **生成退化机械门（HeadingRepetitionGuard）**：`base_citation_handler.py` 内置对"模型反复重发同一标题"的流式检测，docstring 完整记录事故与设计取舍（#6452）：

  > A local model that misses its EOS token can attend back to the start of what it just wrote and reproduce the same section cycle until the context window hard-clips — 30+ iterations of identical subheadings, tables and prose, all of which then land in the report (#6452). Nothing was watching the stream, so the only bound was the context window.
  > The signal is a markdown heading line repeating verbatim. It is chosen over n-gram or block similarity because it is O(1) per line, needs no buffer ... a legitimate subsection does not emit one identical `### Heading` four times.
  > ... the guard is a bound on the reported failure, not a general degeneration detector, and a rule loose enough to catch every loop would truncate real documents.

  （https://github.com/LearningCircuit/local-deep-research/blob/main/src/local_deep_research/citation_handlers/base_citation_handler.py ）

- **终止检查点命名化**：BaseSearchStrategy 把所有 `check_termination()` 调用点用常量标注——`CHECK_CONTEXT_ENTRY / ITERATION_START / POST_SEARCH / PRE_SYNTHESIS / PRE_ANALYSIS / REFINEMENT_LOOP / AGENT_STREAM / FALLBACK_SYNTHESIS`——"Passed as the ``context`` argument and surfaced in the callback metadata; tests import them to cancel at one specific check."（base_strategy.py 头部）。
- **迭代参数实证化**：`FocusedIterationStrategy` 默认 `max_iterations=8, questions_per_iteration=5`，注释直接写明依据（"OPTIMAL FOR SIMPLEQA: 90%+ accuracy achieved"，https://github.com/LearningCircuit/local-deep-research/blob/main/src/local_deep_research/advanced_search_system/strategies/focused_iteration_strategy.py ）。
- **来源质量机械化**：Journal Quality System——"Automatic journal reputation scoring with 212K+ indexed sources, predatory detection... Powered by OpenAlex (CC0), DOAJ (CC0), and Stop Predatory Journals (MIT)"（README Advanced Capabilities 节）。
- **删死代码留痕**：`docs/strategies/deleted/` 目录逐 PR 记录被删策略（如 https://github.com/LearningCircuit/local-deep-research/blob/main/docs/strategies/deleted/pr-3205-entity-aware.md ），是"下放/退役要留档"的范例。

### d. 引用与溯源

引用处理是独立抽象层：`citation_handlers/`（standard / precision_extraction / forced_answer 三种 handler，https://github.com/LearningCircuit/local-deep-research/tree/main/src/local_deep_research/citation_handlers ）。README 定位"with proper citations"；另有测试 `test_citation_handler_failure_keeps_sources.py`（引用失败不得丢源，https://github.com/LearningCircuit/local-deep-research/tree/main/tests/advanced_search_system/strategies ）——用回归测试锁住"失败不毁证据"语义。

### e. 成本与终止

- 策略级终止：上述 `check_termination()` 检查点矩阵（可取消、可测）。
- 成本面板："Analytics Dashboard — Track costs, performance, and usage metrics"（README）；"Adaptive Rate Limiting — Intelligent retry system that learns optimal wait times"（同节）。
- 零 LLM 成本的裸搜索工具："'no LLM processing, no cost, fast. This is especially useful for **monitoring and subscriptions**'"（README MCP 节）。

### f. 报告综合与导出

四档研究模式："Quick Summary（30 秒到 3 分钟带引用）/ Detailed Research / Report Generation / Document Analysis"（README Research Modes 节）；导出 PDF/Markdown；研究历史与订阅式 digest。卖点架构：研究产物可入库复利——"Download them directly into your encrypted library... Your knowledge compounds over time."（README，SQLCipher 加密库）。

### g. 对本仓的可借鉴点

1. **HeadingRepetitionGuard × node-gate.mjs / schema-scan.mjs**：把"final.md 是否出现同一标题行重复≥4 次"加进在场级机械扫描，成本极低、有真实事故背书（#6452）、判据 O(1)。这是本调研**可直接照抄**的一条机械门禁。
2. **终止检查点命名化 × 本仓节点终止/回边语义**：把 run 的每个可终止/可回退位置用常量命名并进回调元数据，测试可精确指向某一检查点取消——对本仓 node-gate 的判据级测试与 watch-run 的盯场面都是直接可用模式。
3. **Journal Quality System × evidence 的 source_tier 字段**：本仓 source_tier 目前是标注字段；LDR 证明"来源声誉可以机械判"（OpenAlex/DOAJ/捕食期刊库）。不必建系统，但 source_tier 的判据说明可挂接这几个公开库的判定口径。
4. **策略同基类可切换 × 策略参数 CLI 单点计算权威**：LDR 的 pipeline/LangGraph 双策略不是两套代码，而是 BaseSearchStrategy 的两个子类 + settings 选择。本仓的 wave 规划/per-topic 地板等策略参数可考虑归拢为"策略 profile"概念（一份契约、多档参数），降低策略实验的分裂成本。
5. **"局限诚实标注"文风 × 本仓门禁与文档**：LDR 对 egress 模式的写法（"That scope is a best-effort guard rail, not an air gap: see ... for a working recipe"，README Security 节）是门禁声明自身局限的范本——本仓机械门禁文档可统一附"本门不防什么"。
6. **失败语义回归测试 × tests/**：`test_citation_handler_failure_keeps_sources.py` 一类"失败路径不得破坏证据"的回归测试，可对照检查本仓 evidence-audit 失败分支是否有对应用例。

### h. 不适用的 + 理由

- **全本地/自托管/加密隐私面**（SQLCipher、egress 模式、SearXNG 部署）：本仓运行在 DSH 托管环境，隐私面由宿主承担；借鉴只到文风层面。
- **知识库复利（研究产物入库再检索）**：与本仓 journal.md/evidence 归档有潜在协同，但需要索引/嵌入基础设施，当前成本不成比例——记为远期方向。
- **五档探索器/过滤器全家桶**：本仓 Scout/Analyst 已按角色分工承担同类职责，引入平行机制会与角色协作模型打架。

---

## 4. dzhng/deep-research（最小实现，反面参照）

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/dzhng/deep-research ）：19,756 stars；`pushed_at: 2026-04-11`（本调研当刻约半年无 push，未归档）；自述体量契约："Goal is to keep the repo size at <500 LoC"（https://github.com/dzhng/deep-research/blob/main/README.md ）；核心文件 `src/deep-research.ts` 10,062 字节（https://api.github.com/repos/dzhng/deep-research/contents/src?ref=main ）。

### a. 编排形态：一个函数的递归循环

全部编排就是 `deepResearch()` 递归（https://github.com/dzhng/deep-research/blob/main/src/deep-research.ts ，下引同源）：

> const serpQueries = await generateSerpQueries({ query, learnings, numQueries: breadth });
> ... const newBreadth = Math.ceil(breadth / 2); const newDepth = depth - 1;
> ... if (newDepth > 0) { ... return deepResearch({ query: nextQuery, breadth: newBreadth, depth: newDepth, learnings: allLearnings, visitedUrls: allUrls, onProgress }); }

结构化输出全靠 zod schema：SERP 查询必带 `researchGoal`（"First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found"），结果处理产出 `learnings + followUpQuestions`（"The learnings should be concise and to the point... include any entities... as well as any exact metrics, numbers, or dates"）。并发 `pLimit(ConcurrencyLimit)`（默认 2），每查询 firecrawl `limit: 5` 抓 5 条。无多角色、无图、无状态机。

### b. 规划与澄清步

唯一人机点是一次性反馈问询（`src/feedback.ts`，889 字节，生成几个 follow-up 问题让用户补充方向；https://github.com/dzhng/deep-research/blob/main/src/feedback.ts ）。之后全程无人介入，无计划审批。

### c. 质量控制

**无任何门禁**。仅有的"质量"手段是 prompt 措辞（"Make sure each query is unique and not similar to each other"）与去重（`[...new Set(results.flatMap(r => r.learnings))]`）。错误处理是静默吞掉：

> catch (e: any) { ... log(`Error running query: ...`); return { learnings: [], visitedUrls: [] }; }

（deep-research.ts）——失败分支返回空集继续递归，与 gpt-researcher #1579 修复的"全失败即停"形成对照：最小实现连"空转保护"都没有。

### d. 引用与溯源：最小实现丢得最狠的地方

learnings 是**纯字符串数组，不携带来源绑定**；报告合成时：

> const urlsSection = `\n\n## Sources\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
> return res.object.reportMarkdown + urlsSection;

（deep-research.ts，`writeFinalReport`）——即终稿只有文末一个"访问过的 URL 平铺列表"，**任何一条结论都无法回溯到具体来源**；报告正文可以引用列表里没有的"来源"，也可以漏引用真实来源，无机制可查。

### e. 成本与终止

终止 = depth 递减到 0；成本控制 = `trimPrompt(content, 25_000)` 截断单页内容 + breadth/depth 两个用户参数；无 token 预算、无步数上限之外的任何保护。`AbortSignal.timeout(60_000)` 单调用超时。

### f. 报告综合与导出

`writeFinalReport`（"aim for 3 or more pages, include ALL the learnings"）与 `writeFinalAnswer`（竞赛式短答案模式）两个合成函数，Markdown 输出，无导出管道。README 流程图（Mermaid）即全部架构文档（https://github.com/dzhng/deep-research/blob/main/README.md ）。

### g. 对本仓的可借鉴点（反面参照的价值）

1. **最小必要集的界定**：dzhng 证明 DR 的最小可工作内核 = *breadth/depth 递归 + 每查询带 researchGoal + learnings 累积回灌 + 结构化输出*。gpt-researcher 的 `deep_research.py`（query/researchGoal/followUpQuestions/learnings 同构，连 `breadth//2` 收窄都同）几乎是它的 Python 移植，说明该内核已是事实标准。**对本仓的用法**：给本仓每个重机制写"相对最小集的增量价值"论证（evidence 一条一档、critic 独立重抓、溯源链审计各自值多少）——这正是"砍掉了什么→丢了什么"清单的正面用法。
2. **learnings 不溯源 = 具体教训**：dzhng 的 `## Sources` 平铺列表示范了"没有逐条溯源链"的最坏形态——本仓 final.md 的 `[来源: evidence/xx.md]` 行 + evidence-audit 摘录回溯恰好是对症下药；这条对照可作为 evidence-audit 门禁存在理由的一句话论据（引 dzhng deep-research.ts 的 urlsSection 实现即可）。
3. **静默吞错 vs fail-loud 的活教材**：dzhng 的 catch-返回空集、gpt-researcher 的全失败即停、LDR 的失败不丢源回归测试，三者构成错误处理光谱——本仓 fail-loud 纪律在这个光谱上的位置有了外部参照系。

### h. 不适用的 + 理由

- 其机制本身（递归/learnings/feedback.ts）**没有可移植物**：本仓 codex 内核已含等价的 wave 型规划与策略参数权威，直接移植反而是降级。
- 半年无 push（pushed_at 2026-04-11）也提示：单文件最小实现是"教学品"定位，不是可依赖的工程底座。

---

## 5. stanford-oval/storm（含 Co-STORM）

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/stanford-oval/storm ）：31,573 stars；`pushed_at: 2025-09-30`、最近 commit 日期同为 2025-09-30（https://api.github.com/repos/stanford-oval/storm/commits?per_page=3 ）——**超过一年无提交、未归档**，与本任务"停更但未归档"的先验一致。

### a. 编排形态：检索-写作两阶段 + 模块化 dspy 管道

README 原文：

> STORM breaks down generating long articles with citations into two steps:
> 1. **Pre-writing stage**: The system conducts Internet-based research to collect references and generates an outline.
> 2. **Writing stage**: The system uses the outline and references to generate the full-length article with citations.

（https://github.com/stanford-oval/storm/blob/main/README.md ）

STORM 对"自动化研究的核心是会提问"的论断与两策略：

> STORM identifies the core of automating the research process as automatically coming up with good questions to ask. Directly prompting the language model to ask questions does not work well. To improve the depth and breadth of the questions, STORM adopts two strategies:
> 1. **Perspective-Guided Question Asking**: Given the input topic, STORM discovers different perspectives by surveying existing articles from similar topics and uses them to control the question-asking process.
> 2. **Simulated Conversation**: STORM simulates a conversation between a Wikipedia writer and a topic expert grounded in Internet sources to enable the language model to update its understanding of the topic and ask follow-up questions.

（同上 README）

源码模块化在 `knowledge_storm/storm_wiki/modules/`：persona_generator / knowledge_curation / outline_generation / article_generation / article_polish / retriever（https://github.com/stanford-oval/storm/tree/main/knowledge_storm/storm_wiki/modules ），基于 dspy（README："Both STORM and Co-STORM are implemented in a highly modular way using dspy"）。管线类 `STORMWikiRunner`，五类 LM 槽位分档：`conv_simulator_lm / question_asker_lm`（便宜快）vs `outline_gen_lm / article_gen_lm / article_polish_lm`（强）——README 明说："choose a cheaper/faster model for `conv_simulator_lm`... Choose a more powerful model for `article_gen_lm` to generate verifiable text with citations."（README STORM 节）。

### b. 规划与澄清步

规划 = outline_generation 模块（由 persona 驱动的对话沉淀 + 大纲生成）；澄清无人机交互点（输入只有 topic，`runner.run(topic=...)`；README 示例代码），Co-STORM 才把人拉进循环（见下）。

### c. 质量控制

无独立 critic 门禁；质量机制嵌在两处——perspective 引导的提问深度（结构保证广度）与 article_polish（成稿润色轮）。知识沉淀以 `StormInformationTable`（对话轮次 + 检索结果）为载体（https://github.com/stanford-oval/storm/blob/main/knowledge_storm/storm_wiki/modules/storm_dataclass.py ），无回边。

### d. 引用与溯源

`Information` 数据类以 URL 为主键（"url (str): The unique URL (serving as UUID) of the information"，附 description/snippets/title/meta；https://github.com/stanford-oval/storm/blob/main/knowledge_storm/interface.py ）。写作时逐条编号注入并要求行内标注（https://github.com/stanford-oval/storm/blob/main/knowledge_storm/storm_wiki/modules/article_generation.py ）：

> info += f"[{idx + 1}]\n" + "\n".join(storm_info.snippets)
> 2. Use [1], [2], ..., [n] in line (for example, "The capital of the United States is Washington, D.C.[1][3]."). You DO NOT need to include a References or Sources section to list the sources at the end.

——**把候选来源连同其原文片段按编号塞进写作上下文、要求逐 claim 行内标号**，是"写作阶段溯源绑定"的教科书做法（snippet 与 claim 在同一段上下文里，模型难以凭空标号到没见过的源）。

### e. 成本与终止

成本控制 = LM 分档（见 a）；Co-STORM 引擎有 `collect_and_reset_lm_usage()`（https://github.com/stanford-oval/storm/blob/main/knowledge_storm/collaborative_storm/engine.py ）；终止由对话轮次/RunnerArgument 控制。无 token 预算硬门。

### f. 报告综合与导出

Wikipedia 式长文（outline → 逐节成文 → polish）；输出为带引用的 markdown 文章。Co-STORM 侧出口是 mind map + 文章生成模块（collaborative_storm/modules/article_generation.py）。

### Co-STORM：多 agent 协作协议

README 原文：

> Co-STORM proposes **a collaborative discourse protocol** which implements a turn management policy to support smooth collaboration among
> - **Co-STORM LLM experts**: This type of agent generates answers grounded on external knowledge sources and/or raises follow-up questions based on the discourse history.
> - **Moderator**: This agent generates thought-provoking questions inspired by information discovered by the retriever but not directly used in previous turns. Question generation can also be grounded!
> - **Human user**: The human user will take the initiative to either (1) observe the discourse to gain deeper understanding of the topic, or (2) actively engage in the conversation by injecting utterances to steer the discussion focus.

> Co-STORM also maintains a dynamic updated **mind map**, which organize collected information into a hierarchical concept structure, aiming to **build a shared conceptual space between the human user and the system**.

（https://github.com/stanford-oval/storm/blob/main/README.md ）

源码侧对应 `DiscourseManager` / `TurnPolicySpec` / `KnowledgeBase`（engine.py 与 dataclass.py，URL 同上），启动用 `warm_start()`（分层聊天热启动建立初始大纲），之后 `step()` 推进话语轮（README Co-STORM 用法节）。论文一手：STORM = https://arxiv.org/abs/2402.14207 ，Co-STORM = https://www.arxiv.org/abs/2408.15232 （本会话未能直接抓取 arXiv 页面核实摘要文本——DNS 失败形态，此两条 URL 取自 storm README 的官方链接区，不引论文内容）。

### g. 对本仓的可借鉴点

1. **Perspective-Guided Question Asking × topics.md 生成 / question-patterns.md**：STORM 的核心洞见是"直接让模型提问问不好，要先扫描同类话题的既有文章提炼视角、再用视角控提问"。本仓 topics.md 的 must_answer 2–5 问与 question-patterns.md 判型库可吸收这一步：出题前先做一轮"视角扫描"（不落 evidence/，进 journal.md），让 must_answer 覆盖多个视角而非单一角度。有 NAACL/EMNLP 论文背书，是调研对象里唯一"设计被学界验证"的机制。
2. **Moderator 的出题策略 × Critic 对抗核查（review.md）**："generates thought-provoking questions inspired by information discovered by the retriever but not directly used in previous turns"——刁钻问题不从零想，而是**用检索到但未被采用的信息**构造。本仓 Critic 独立重抓时可对照 evidence/ 池中"找到但未进 findings.md 的源"来生成核查问题，使对抗核查有据可依而非泛泛怀疑。
3. **写作阶段编号注入绑定引用 × final.md 溯源行**：STORM 的"[idx+1] snippets 注入 + 行内 [n] 标注"与本仓 `[来源: evidence/xx.md]` 行同构且本仓更强（文件级可回溯 + 机械审计）——重复，降权，仅作学术先例引用。
4. **LM 分档 × 角色 preset**：五槽位两档分法（便宜模型跑高频对话/提问，强模型跑大纲与成文）可直接映射为本仓 preset 的模型档建议（Scout 高频低档、Analyst/Critic 高档），一行配置的事。
5. **mind map（层级知识组织）× findings.md**：远期参照——findings.md 若膨胀，可评估按层级概念组织而非平账；当前成本不成比例，暂不采纳。

### h. 不适用的 + 理由

- **dspy 依赖与停更状态**：last commit 2025-09-30，超过一年无维护；dspy 技术栈与本仓 DSH/DSH-preset 生态不合，任何代码级移植都要重写。
- **Co-STORM 的全交互形态**（human 全程在环、话语轮推进）：与本仓"仅两个人机交互点、中间静默自主"的交互纪律正面冲突——只借 Moderator 出题策略，不借 discourse 协议本身。
- **Simulated Conversation 沉淀知识**：多轮模拟对话的成本模型与本仓 per-topic 源数量地板的单轮采集不同，成本不成比例。

---

## 6. Alibaba-NLP/DeepResearch（Tongyi，只记边界）

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/Alibaba-NLP/DeepResearch ）：20,012 stars；`pushed_at: 2026-02-27`；未归档。README 原文（https://github.com/Alibaba-NLP/DeepResearch/blob/main/README.md ）：

> We present **Tongyi DeepResearch**, an agentic large language model featuring 30.5 billion total parameters, with only 3.3 billion activated per token. Developed by Tongyi Lab, the model is specifically designed for **long-horizon, deep information-seeking** tasks.

> At inference, Tongyi DeepResearch is compatible with two inference paradigms: ReAct, for rigorously evaluating the model's core intrinsic abilities, and an IterResearch-based 'Heavy' mode, which uses a test-time scaling strategy to unlock the model's maximum performance ceiling.

权重与上下文：Tongyi-DeepResearch-30B-A3B，30B-A3B / 128K 上下文，HuggingFace https://huggingface.co/Alibaba-NLP/Tongyi-DeepResearch-30B-A3B 与 ModelScope 可下载（README Model Download 表）。训练面（README Features 节）：全自动合成数据管线 + 大规模 agentic 持续预训练 + 严格 on-policy 端到端 RL。

**物种差异判断（边界记录，不深挖）**：它是**权重型 agent——模型本身就是研究者**（ReAct/IterResearch 循环内化在模型行为里），本调研其余各仓与本仓都是**编排型——用 prompt/图/角色组织一个通用 LLM**。两者没有机制层面的可移植面：编排框架不能"借鉴"一个已训练进权重的行为。对本仓唯一的意义是标定生态位：编排型 harness 的价值边界在于"在权重型模型还不够强或不可得时组织通用模型"，且应预期权重型路线会持续吞噬编排层里"纯 prompt 级"的质量手段（机械门禁与证据契约不在被吞噬之列——它们独立于模型能力）。

---

## 7. langchain-ai/open_deep_research（已归档：死因与 legacy 迁移）

仓库事实（截至 2026-10-06 抓取当刻，GitHub API：https://api.github.com/repos/langchain-ai/open_deep_research ）：**`archived: true`**；`pushed_at: 2026-08-10`；12,685 stars。**未取得（失败形态）**：README 及仓库可见面均无官方归档声明/弃用公告（README 全文 grep "archiv/deprecat" 零命中；issue 检索亦未命中归档说明），故"死因"只能从其自述演化史归纳，归档决定本身无一手文字，不作臆断。

### 演化史（一手：作者 Lance Martin 博客，2025-07-30，https://rlancemartin.github.io/2025/07/30/bitter_lesson/ ）

三代形态的自述：

> In late 2024, I released an orchestrator-worker workflow for web research. The orchestrator was an LLM call that took a user's request and returned a list of report sections to write. A set of workers parallelized research and writing all report sections.

> Things began to shift as 2024 came to a close. Tool calling was getting better... But, the structure I imposed prevented me from leveraging these improvements. I did not use tool calling, so I could not take advantage of the growing MCP ecosystem. The workflow always decomposed the request into report sections, a rigid research strategy that was not appropriate for all cases. The reports also were sometimes disjoint because I forced workers to write sections in parallel.

> I moved to a multi-agent system, which allowed me to use tools and let the system flexibly plan the research strategy. But I designed it such that each sub-agent still wrote its own report section. This ran into a problem that Walden Yan of Cognition has called out: multi-agent systems are hard because the sub-agents often don't communicate effectively. Reports were still disjoint because my sub-agents wrote sections in parallel.

> I moved writing to a final step. The system could now flexibly plan the research strategy, use multi-agent context gathering, and write the report in one-shot based on the collected context. It scores a 43.5 on deep research bench (top 10)...

教训三连（同博客）：

> Understand your application structure / Re-evaluate structure as models improve / Make it easy to remove structure

> agent abstractions can pose risk because they can make it harder remove structure. I still use a framework (LangGraph) for its useful general features (e.g., checkpointing), but stick to its low-level building blocks (e.g., nodes and edges) that I can easily (re-)configure.

### legacy/ 与形态

README 现行版对旧实现的定性（https://github.com/langchain-ai/open_deep_research/blob/main/README.md ，"Legacy Implementations" 节）：

> The `src/legacy/` folder contains two earlier implementations that provide alternative approaches to automated research. They are less performant than the current implementation...
> #### 1. Workflow Implementation (`legacy/graph.py`) — **Plan-and-Execute**: Structured workflow with human-in-the-loop planning; **Sequential Processing**...; **Interactive Control**: Allows feedback and approval of report plans; **Quality Focused**...
> #### 2. Multi-Agent Implementation (`legacy/multi_agent.py`) — **Supervisor-Researcher Architecture**...; **Parallel Processing**...; **MCP Support**...

即：早期 multi-agent（supervisor-researcher 并行分节写作）已降格为 legacy 之一；最终形态是**单 LangGraph agent、多轮搜索 + 多代理仅用于收集上下文、报告一次性收口写作**（configuration.py 里 summarization/compression/final_report 三级模型分工，https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/configuration.py ）。

### 对本仓的启示（一句级）

- **"分节并行写作"已被作者本人证伪两次**（workflow 版与 multi-agent 版都因"子代理互不通气→报告拼凑感"被放弃）——本仓 Lead 收口 final.md、Analyst 只供 findings 的分工正好站在被验证幸存的一侧，可作为该分工的存在理由外证。
- **结构要可拆**："Make it easy to remove structure" + "agent abstractions can make it harder to remove structure"——本仓八节点拓扑应定期自问"哪条结构是防 2024 年模型失能的，现在模型变强了是否可拆"；NODES.md 的回边与条件分派恰是"让结构可配置"的正向资产。
- 归档本身（2026-08 前后转为 archived，无官方说明）提示**重 harness 的生命周期风险**：框架型 DR 项目热得快、退场也快，本仓"寄生在 DSH 而非自成框架"的定位在此获得一个外部注脚。生态位承接线索：langchain-ai/deepagents 自述 "The batteries-included agent harness."（29,964 stars，截至 2026-10-06，https://api.github.com/repos/langchain-ai/deepagents ）——**无一手证据**表明 open_deep_research 官方迁移至该仓，仅记录两者同属 langchain-ai 且定位重叠，不作迁移结论。

---

## 跨框架综合：借鉴候选清单

判读基准：本仓已有 codex 内核（wave 型规划、per-topic 源数量地板、策略参数 CLI 单点计算权威）与 2026-10-03 对标的 Anthropic multi-agent 工程自述（lead/subagent 分工、并行工具调用、引用纪律）、OpenAI DR 系统卡。与上述已对标面**重复的候选降权**，只列增量。

| # | 候选机制 | 来源框架 | 本仓落点 | 值得/不值得初判 | 与已对标面重复？ |
|---|---|---|---|---|---|
| 1 | 生成退化机械门（同一标题行重复≥4 次→截断/告警，O(1) 判据，事故背书 #6452） | local-deep-research HeadingRepetitionGuard | node-gate.mjs / schema-scan.mjs 加一条在场级断言 | **值得**（成本最低、有事故叙事、本仓现有门禁无此类） | 否 |
| 2 | 回边有界化 + 超界处置语义显式化（max_plan_revisions / max_fact_check_revisions；fail-open vs fail-loud 的选择要写明） | gpt-researcher plan_review/fact_review | NODES.md 回边行补"上限 + 超界处置 + 降级记录"契约 | **值得**（回边已有，超界语义大概率未显式） | 部分（Anthropic 自述提"bounded iterations"级概念，本条增量在"超界处置三选项"） |
| 3 | Perspective-Guided Question Asking（先扫描同类话题既有文章提炼视角，再控出题） | STORM（arXiv:2402.14207） | topics.md 出题前置"视角扫描"步骤（产出记 journal.md，不落 evidence/）；question-patterns.md 增视角维度 | **值得**（学界验证的出题质量机制，直击 must_answer 覆盖面） | 否 |
| 4 | Moderator 出题策略（用"检索到但未被采用"的信息构造核查问题） | STORM Co-STORM | review.md：Critic 独立重抓前先对照 evidence/ 与 findings.md 的差集出题 | **值得**（给对抗核查一个可操作的选题来源） | 否 |
| 5 | 结构化 HITL 反馈协议（[ACCEPTED]/[EDIT_PLAN] 标记 + 未识别输入默认打回） | deer-flow 1.x human_feedback_node | question.md 立项对齐（HITL1）的反馈语义 | 值得（轻量：规定两类显式标记与默认行为） | 否 |
| 6 | 同源回放基准法（固定源集、单变量换策略、报胜率+成本口径） | gpt-researcher evals/context_filter（README 基准表） | evaluation.md / 新门禁反证实验设计 | **值得**（方法论级，日后策略对比直接套用） | 否（"新门禁带反证"已有，但实验设计范式是增量） |
| 7 | 终止检查点命名化（check_termination(context=常量) 进回调元数据，测试可定点取消） | local-deep-research base_strategy.py | node-gate 判据测试 / watch-run 盯场 | 值得（中） | 否 |
| 8 | 声明式契约替代启发式推断（requires_scraping 取代 snippet 长度猜测；附完整事故链 #1846/#1892） | gpt-researcher retrievers/base.py | evidence-audit.mjs：排查"是否已抓取"类隐式推断 | 值得（作为审查 checklist，不一定加字段） | 否 |
| 9 | 来源质量机械判据外部锚（OpenAlex/DOAJ/捕食期刊库口径） | local-deep-research Journal Quality System | evidence frontmatter 的 source_tier 判据说明 | 值得（中；只挂口径不建系统） | 否 |
| 10 | LM 分档（便宜模型跑高频提问/对话，强模型跑大纲与成文） | STORM 五槽位两档 | preset 模型档建议（Scout 低档高频，Analyst/Critic 高档） | 值得（一行配置级） | 部分（Anthropic 自述有 cost 意识，但五槽位分档是具体增量） |
| 11 | "局限诚实标注"文风（best-effort, not an air gap 式声明） | local-deep-research egress 文档 | 机械门禁文档统一附"本门不防什么" | 值得（纯文风，零成本） | 否 |
| 12 | 最小必要集定位卡（递归+researchGoal+learnings 累积 = 事实标准内核；learnings 不溯源是最坏形态的活教材） | dzhng/deep-research + gpt-researcher deep_research.py 同构佐证 | 本仓每个重机制的"相对最小集增量价值"论证素材 | 值得（写进 docs/design 论证，不产代码） | 部分（codex 对标已含方法论，但"反面参照三例"[dzhng 吞错 / gpt-researcher 全失败即停 / LDR 失败不丢源] 是新素材） |
| 13 | 分节并行写作已被作者本人两次证伪 | open_deep_research 作者博客（bitter_lesson） | Lead 收口 final.md、Analyst 只供 findings 分工的存在理由外证 | 值得（一句话论据级） | 部分（Anthropic 自述倾向 lead 收口，此条提供独立第二来源） |
| 14 | 结构可拆性定期自查（"Make it easy to remove structure"） | open_deep_research 作者博客 | NODES.md 演进审视项：哪条结构在防过时失能 | 值得（战略级提醒，进 design 文档） | 否 |
| 15 | 知识库复利（研究产物入库再检索） | local-deep-research encrypted library | evidence/ 归档的远期再利用 | 暂不值得（需索引/嵌入设施，成本不成比例；记重启条件） | 否 |
| 16 | 全流程静默无人审批的 plan approval 开关（auto_accepted_plan） | deer-flow 1.x | 本仓 HITL1 可否配置跳过 | 不值得（本仓 HITL1 是设计支柱，不提供跳过档） | — |
| 17 | LangGraph/AG2 双轨编排、marp/podcast 导出、dspy 栈、权重型 agent 行为 | 各家 | — | **不值得**（物种差异/宿主已有/成本不成比例，理由见各节 h） | — |

降权说明：#2、#10、#12、#13 与 codex/Anthropic 已对标面存在部分重叠，故列增量理由；#5 与本仓 HITL 纪律无冲突（只是给已有交互点加协议）；#16 与本仓宪章（HITL 阶段边界请人）方向相反，明确不采纳。生命周期注脚：deer-flow 2.0 分叉与 open_deep_research 归档共同提示——**编排型 DR 项目的两极命运（长成 harness / 归档退场）都以"脱离宿主、自成框架"为前提**；本仓插件定位（借 DSH 为宿主）在该样本集里没有反面案例。

（完 · 截至 2026-10-06 抓取当刻 · 全部一手来源，URL 随文）
