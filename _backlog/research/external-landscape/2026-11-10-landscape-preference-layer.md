---
topic: 外部 landscape 第三遍：研究偏好层——模式 / effort / 来源 / 方法 / 保存配置 / 计划门 与主流对齐
intent: 把「用户如何表达研究偏好」做成可核对照：清点主流产品、中国产品与研究框架的偏好面（模式、effort、来源范围、方法/立场、输出形态、保存配置、计划门、中途 steer、模型档），映射到本仓六件套（研究类型/方法预设/深度/lens/方法库/HITL1），回答哪些同构、哪些落后、哪些只是不同构；不写实施卡。
---

# 外部 landscape 第三遍：研究偏好层（2026-11-10）

> 性质：来源综述 + 映射推断，不是决定。外部事实带 URL；厂商自报标「厂商自报」；本仓事实带文件锚点。
> 覆盖：Perplexity Agent API（effort / profiles / skills）、Elicit（Setup / Skills / Routines）、
> Consensus、NotebookLM、Kimi、Qwen、Zhipu、Metaso、Doubao、MiniMax、ChatGPT、Gemini（第一遍 + 本轮
> 官方博客复核）、Claude（Research / effort / memory）、Microsoft Copilot Researcher、Grok API、
> OpenAI Deep Research system card + API 参数、GPT-Researcher、DeerFlow 1.x/2.x、LangGraph
> `open_deep_research`、STORM、Co-STORM、smolagents、`dzhng/deep-research`、Undermind；
> 另引 2024–2026 年澄清/个性化/偏好遵循研究 13 篇。第一遍/第二遍已核的内容只回指，不重复摘录。
> 被挡（不计入）：Perplexity 消费者帮助中心（DNS 污染，非公网 IP）、OpenAI help / platform（403 /
> Cloudflare）、Google Gemini / Cloud 文档与 support（fetch failed）、Consensus / You.com / Genspark /
> SciSpace / Scite 帮助页（403 / timeout）、Claude styles 正文（404，迁移中）、元宝 / 智谱消费端。
> 口径：计数单位 = 做法，不是产品；「对齐」= 同一用户意图是否被覆盖、是否在同一个决策点、是否同样可审。

## 0. 一句话

**我们的偏好层与主流是三层同构：出厂预设（method / lens / role）↔ effort levels / skills；用户保存
配置（method-library）↔ profile / 账户级指令；per-run 选择 + 计划确认（类型 / 深度 / 口径 / lens 子集 /
HITL1）↔ mode / effort / scope / plan approval。** 但这一遍把两个先入判断推翻了：**计划门与 run 配置级
保存其实很稀有**——消费级只有 Gemini 给一次性研究提供「先看计划、可改可批」的门（"revise or approve"）；
版本化的 run 配置只有 Perplexity Profiles 一家。其余是账户级 free-text 指令/记忆（Claude / Copilot /
Gemini，ChatGPT 未读）或 localStorage（开源），中国七家没有。所以我们的 HITL1 与方法库不是「落后」，
是**方向正确但产品化不足**：门与 Gemini 同级、比多数产品多，缺的是「可编辑/可见」；库是 run 配置级的
显式化，稀有且可审，缺的是「版本与采用」。

真正没对齐的三处是：**effort 的可读性（档位不解释改什么、不给代价；且我们只有 research depth，
没有把 reasoning effort 分开）、来源范围没有 typed 面（研究工具层）、输出形态/长度的可机检
（消费级固定格式是常态；我们没有模板选择，也没有长度/格式门）**。**lens（用户可选证据面）与两点 HITL
不是欠账，是立场**：在 11 个产品 + 8 个开源项目里，没有任何一家把 viewpoint/bias 做成用户控件；2026
证据反而警告「平衡框架会被读成更偏颇」「模型会附和用户立场」。lens 必须继续按**覆盖**计量，不按立场售卖。

## 1. 口径：偏好层的九个意图

把「用户想控制什么」拆成九个意图，逐项找外部载体与本仓载体；不用产品名当坐标，否则会把
「产品没有这个按钮」误读成「这个意图不存在」。

| # | 意图（用户语言） | 外部典型载体 | 本仓载体 |
|---|---|---|---|
| 1 | 这是哪种研究 / 选哪个入口 | 产品模式开关、研究类型选项 | 三研究类型 + P1–P8（内部判型） |
| 2 | 花多少工、多久、多少钱 | effort / depth 档、步数预算、成本倍数、预计时长 | 快答/标准/深度 → L0–L3 + 节点预算 |
| 3 | 从哪里找 | 来源范围（web/工作区/学术库）、域名过滤、权威度 | 口径「来源偏好」（自由文本）+ lens 的 seek + 方法预设的「找来源」 |
| 4 | 用什么方法、信什么、偏向哪面 | 工作流模板、系统综述参数块、perspectives | 5 个方法预设 + 8 个 lens + 方法库 |
| 5 | 写成什么样 | 报告模板、篇幅、格式（PDF/PPT/HTML）、tone、主题 | final 固定八节 + 读者版 1–3 页 + 方法库「报告怎么写」 |
| 6 | 以后都这样 | profile / memory / custom instructions / skills | `method-library.md` 四字段 + 默认偏好 |
| 7 | 开工前先看计划、能改 | 计划确认、可编辑 setup、澄清问题 | HITL1 两段卡（三问 + ≤200 字计划卡） |
| 8 | 跑起来还能改 | 多轮追问、随时插话、Modify Setup、逐工具批准 | 两点交互（HITL2 才可改；中途消息不改方向） |
| 9 | 用哪个模型 / 推理档 | effort 捆绑 model、model 选择器、管理员 effort 设置 | preset 不声明 model；无 per-run 模型档 |

判定词只有五个：**同构**（意图与决策点一致）、**领先**（同构且更细/更可审）、**落后**（同构但用户面
缺证据或不可操作）、**不同构**（覆盖同一意图但机制/立场不同）、**空白**（外部也没有）。

## 2. 外部：主流怎么让用户表达偏好

### 2.1 Perplexity：effort 是「厂商调好的整套」、profile 是「用户自己的整套」

- **effort 六级**：`fast` / `low` / `medium` / `high` / `xhigh` / `ultra`。原文：
  "Set `effort` to `fast`, `low`, `medium`, `high`, `xhigh`, or `ultra` to choose the Agent API’s
  configuration. This is separate from `reasoning.effort`..." 以及
  "Each effort level bundles a model, search config, reasoning steps, system prompt, and available tools."
- 每档声明 **cost band / latency band**，更新只优化 quality：
  "effort level updates target the same cost band... latency band"。
- **步数预算是公开的**：文档给出 fast 1 步、low 5 步、medium 15 步、high 40 步、xhigh 300 步；
  ultra 不给 frozen 配置。可 pin 到版本（`fast@2026-10-16.0`），或复制成 frozen configuration；
  也可按请求覆盖单项（`model` / `max_steps` / `reasoning.effort` / 域名过滤）。
  （[Effort](https://perplexity.mintlify.app/docs/agent-api/effort.md)）
- **profile = 用户所有、可版本化的整套**：
  "a reusable, versioned configuration that you save and manage. It bundles ... model or model
  fallback chain, system instructions, reasoning effort, tools, Skills, managed connectors, and the
  agent loop step budget, under a single ID."
  "A profile is the counterpart to an effort level that you control."；"A request cannot set both
  `effort` and `profile`."；版本不可变、admit 时解析、可 pin；请求按字段覆盖，`tools` 按单个工具合并。
  （[Profiles](https://perplexity.mintlify.app/docs/agent-api/profiles.md)）
- **skills = 按需加载的可复用专长**：模型只先看 name + description，命中才 load 全文；内置 / 内联 / 自定义，
  自定义是版本化 bundle（`SKILL.md` + scripts + references）。
  "The model sees each skill by name and description, and loads the full instructions only when it
  decides they are needed"（[Skills](https://perplexity.mintlify.app/docs/agent-api/skills.md)）
- **计划门只有两种**：`require_approval` 闸的是**单个 MCP 工具调用**，不是一次性研究计划；
  消费端 Research/Labs/Focus/Spaces 帮助页被 DNS 污染挡住，未读。

**含义（推断）**：主流把「偏好」拆成三个寿命层——厂商维护的 effort（会随 evals 更新）、用户拥有的
profile（版本化、可 pin）、请求级覆盖（单项）。这与我们的「出厂方法预设 / 用户方法库 / run 级修订」
是同一骨架；差别是他们的 effort 明确带代价与步数映射，profile 能装模型、工具、系统提示与步数预算。

### 2.2 Elicit：一屏 Setup 是「跑前协议」的最完整形态

- **Setup 页把所有设置放在一个地方**：
  "This page shows every step and setting in one place, so everything is configured before anything
  runs."（[Systematic Reviews](https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit)）
- **自由文本参数块承载真正的规格**：
  "Use this free-text field to describe your eligibility criteria, PICO framework, or other setup
  parameters."——不是「问题框」，是 PICO/纳入排除/study design 的结构化规格入口。
- **深度分阶段、可独立设**：
  "Each screening stage runs at a depth you choose, Fast or Thorough."；
  "Abstract screening and full-text screening are set independently, so abstracts can run Fast while
  full texts run Thorough."（同上；[Full-Text Screening](https://support.elicit.com/en/articles/14759157-full-text-screening-in-elicit-systematic-reviews)）
- **来源范围 = 策略枚举 + 语料库**：Semantic search vs Keyword/Boolean；语料 = 内部 138M 论文 + PubMed +
  ClinicalTrials.gov（厂商自报）。
- **输出模板是跑前一等选择**：General Review / 1-Page Overview / Research Gap Analysis；
  报告深度 fast / balanced / comprehensive（按 plan）。
  （[Research Report](https://support.elicit.com/en/articles/14756862-get-a-research-report-to-generate-in-depth-answers-automatically-in-elicit)）
- **中途可改 Setup**：
  "You are not locked into your initial settings. Click the dropdown menu at the top of the page and
  choose Modify Setup to make changes at any time."；跑后还有 screening threshold 滑杆与逐篇
  Include/Exclude、历史版本选择器。
- **保存配置是内容对象，不是 run 配置**：Skills = "a set of instructions you hand to Elicit's agent so
  it approaches a task a particular way"；Routines = "Tell the Agent what you need, review its proposed
  instructions and schedule, and activate the Routine when you're ready."——批准的是**周期任务的
  指令与排期**，不是一次性研究计划。
- **没有 bias/perspective 控件**；自由文本只 steers eligibility（PICO/纳入排除），不是立场。

**含义（推断）**：Elicit 是外部最接近我们 HITL1 + 方法 + 计划门的形态：一屏、全部设置、分阶段深度、
跑中可改、跑后可调阈值。差别是它把「可编辑」做成产品（Modify Setup），我们把「可批准」做成纪律
（200 字卡 + 一轮自由文本）。

### 2.3 中国产品：一次性异步作业，档位是「工作方式」

- **Kimi**：跑前唯一交互是一轮意图澄清，可点「做个全面的研究」（Include everything）跳过；官方称
  "正式检索前绘制出完整的研究计划"，但**计划不可见/不可批**；**无深度档**，固定 10–25 分钟；
  一次约耗 5–10% 月额度且**跑前不预告**；停止照扣额度；跑后多轮追问；输出 Markdown + HTML，
  PDF/Word/PPT/Excel 需索要。（[帮助中心](https://www.kimi.ai/zh-hant/help/deep-research/deep-research-overview)；
  [功能页](https://www.kimi.com/features/deep-research)）
- **Qwen**：两步 API 协议（反问确认 → 执行）；计划以 `phase: ResearchPlanning` 流式出现但**无批准位**；
  深度用模型变体表达（`qwen-deep-research-2025-12-15`「研究深度和报告质量更优」）；来源范围唯一
  typed 入口是 `research_tools`（MCP 私有源）；输出只有 `output_format` 两值
  （`model_detailed_report` 约 6000 Token / `model_summary_report` 约 1500–2000 Token）。
  （[阿里云 API](https://www.alibabacloud.com/help/zh/model-studio/qwen-deep-research-api)）
- **Metaso 秘塔**：消费端真枚举最多——模式四档「简洁 / 深入 / 研究·先想后搜 / 深度研究」
  （`concise`/`detail`/`strong-research`/`think-research`，默认 `detail`）；范围七项
  （全网/学术/文库/我的知识/播客/图片/视频，学术另带语言+域名）；语言风格默认「正常」；
  输出主题 `default`/`win95`/`neo`；「常用提示词建立模板保存」是唯一跨会话资产；终止后不可继续。
- **豆包**：消费端只取到 `skill_type:10`「学术搜索」；检索 API 侧有全场唯一**权威度枚举**
  `Filter.AuthInfoLevel`（0 不限制 / 1 仅「非常权威」）+ `IcpHostOnly` + `Industry`
  （finance/game/health/gov）+ 站点黑白名单 + TimeRange。
- **MiniMax**：官方明说"本页只准备文字提示词"，研究偏好 = 提示词；**元宝 / 智谱消费端未取得**。
- **七家里没有一家提供保存的研究偏好**；中途不可 steer，终止=废弃。

**含义（推断）**：中国区把深度研究做成「一次性异步作业」：澄清一次 → 固定时长/流式 phase → 跑后追问；
档位是工作方式，不解释改变什么，也没有成本预览。来源治理的强枚举在开发者 API 侧（豆包权威度），
消费端退化为「频道」（Metaso）或措辞（Kimi）。

### 2.4 西方助手：研究是「模式」，不是设置；计划门只有 Gemini

- **横切**：五家都把研究做成 composer/入口上的**模式**（ChatGPT "select 'deep research' in the message
  composer"；Gemini "Deep Research" in the Tools menu；Claude "+ → Research"；Copilot 选 Researcher agent），
  不是设置页；模式 per-run、不持久。
- **Gemini：唯一消费级计划门。** "After you enter your question, it creates a multi-step research plan for
  you to either revise or approve."（2024-12-11）；2026 API 仍保留为 "Collaborative planning: Review, guide
  and refine the research plan generated by the agent before it begins execution"。来源可按 run 选
  （Gmail/Drive/Chat + web）；没有 effort/depth 选择器，强度只有 agent 档（Deep Research vs Deep Research Max）。
- **Claude：研究覆盖模型选择器。** "+ → Research" 开关；"It uses these models no matter which model you've
  selected for your chat"（Opus 5.5 / 4.8）→ 研究没有自己的 depth 旋钮；chat 的 Effort
  （Low/Medium/High/xhigh/Max + per-model Default）是**另一个**设置，不能当研究深度用。无计划批准。
  保存偏好三层 free text：Instructions for Claude（账户）、project instructions（项目）、Skills；
  memory 可编辑 topic、per-chat 开关在首条消息后锁死。
- **Copilot：Researcher 取代 Deep Research。** 消费者 Deep Research 2026-08-18 退役；Researcher 先澄清
  （"You can answer the questions or just say 'Go ahead.'"），无计划批准；报告长度/细节 "To be released
  soon"；来源范围对用户不可选（admin tenant toggle）；模型/模式 picker 值未文档化。
- **ChatGPT：模式 + 附件 + 侧栏，无计划门。** composer 选 deep research、可附件、跑时侧栏显示步骤/来源，
  5–30 分钟；可读来源里没有计划批准、也没有 depth/effort/source 的 UI 控件（custom instructions /
  memory / projects 等 403 页面未读，**不写成「产品没有」**）。
- **OpenAI API：细粒度在参数层，不在 UI。** `reasoning.effort` none/minimal/low/medium/high/xhigh/max
  （默认 medium）、`text.verbosity` low/medium/high、`search_context_size` low/medium/high、
  `WebSearchMode` disabled/cached/live、`allowed_domains`；Deep Research = 研究模型
  （`o3-deep-research` / `o4-mini-deep-research`）+ 必需 `web_search_preview` + `background: true`。
- **xAI / Grok：API 没有 research mode。** 只有 search 参数（`mode` OFF/ON/AUTO、`sources` web/news/X/RSS、
  from/to date、`max_search_results` 1–30 默认 15、`return_citations`）+ `ReasoningEffort` NONE..XHIGH；
  Grok UI 的 DeepSearch/Research 标签不可读，不猜。
- **NotebookLM**：Fast Research / Deep Research 两值；"With your guidance, Deep Research takes your
  question, creates a research plan and browses hundreds of websites..."；计划被宣告，但没有批准步骤的
  文档。**Consensus**：Deep 模式 + 语料限制（Medical Mode）；**Undermind**：语义停止，无 effort 档。

**含义（推断）**：西方助手分成两种哲学——**「模式 + 计划共创」**（Gemini；计划是唯一花钱前的门）与
**「模式 + 已保存人格 + fire-and-forget」**（ChatGPT / Claude / Copilot；pre-run 只有模式、来源、账户
已知信息）。depth/effort 在消费级 UI 基本被藏起来，只有 API（OpenAI/xAI）或 agent 档（Gemini Max）才是
一等控件。

**含义（推断）**：消费级主流的偏好面是「模式开关 + 澄清 + 账户记忆/指令 + 来源范围」，
不是「先选方法/视角/深度」。越大的产品越倾向**减少前置选择**，把定制放进澄清、计划与记忆。

### 2.5 开源：typed 参数在开发者面，enforced 的只有计数

- **GPT-Researcher**：`report_type` 7 值、`report_source` 7 值、`tone` 17 值（值是 prose）、
  `custom_prompt`；config 里 `DEEP_RESEARCH_BREADTH` 3 / `DEEP_RESEARCH_DEPTH` 2 /
  `DEEP_RESEARCH_CONCURRENCY` 4 / `REASONING_EFFORT` medium / `REPORT_FORMAT` APA /
  `TOTAL_WORDS` 1200 / `LANGUAGE` / `REPORT_SOURCE` / `RETRIEVER` / `MAX_ITERATIONS` 3。
  UI 的 Brief 是**一句话**（"Report type … from Sources … in Tone tone"），带 2/5/7 分钟成本提示；
  `tone` 实际只渲染成一句 prompt（"Write the report in a {tone.value} tone."），**零强制**；
  唯一持久化是 localStorage `gptr-brief`。
  （[配置页](https://docs.gptr.dev/docs/gpt-researcher/gptr/config)；源码锚点 =
  [enum.py](https://github.com/assafelovic/gpt-researcher/blob/v3.8.0/gpt_researcher/utils/enum.py#L27)
  与 [prompts.py](https://github.com/assafelovic/gpt-researcher/blob/v3.8.0/gpt_researcher/prompts.py)，
  按 tag v3.8.0 读）
- **DeerFlow 2.x**：产品模式是一个词 → 三布尔：`flash|thinking|pro|ultra` ⇒
  `(thinking, is_plan_mode, subagent)`；**本遍 8 个开源项目里唯一在决策点强制花费**的：
  "When `hard_stop_threshold` is crossed, tool_calls are stripped and the agent is forced to produce a
  final answer immediately."；`max_recursion_limit: 1000` 是网关拒绝客户端越界的上限；
  `max_total_per_run: 6` 是硬委派计数。"plan mode" 只是 todo-list middleware，**不是人审门**。
- **DeerFlow 1.x**：本遍开源项目里唯一真正的计划批准协议：`interrupt("Please Review the Plan.")` +
  `[ACCEPTED]` / `[EDIT_PLAN]` 前缀；`auto_accepted_plan: bool = False` 可跳过；
  `enforce_web_search` 在 plan validation 点**改写**计划（不是劝）；`report_style` 5 值
  （academic/popular_science/news/social_media/strategic_investment）只进 prompt；
  持久化是 localStorage `deerflow.settings`。
- **LangGraph `open_deep_research`**：config 字段同时是 UI schema（`x_oap_ui_config` slider/select）；
  `allow_clarification=True`（布尔，不是策略）；`max_concurrent_research_units=5`（1–20）、
  `max_researcher_iterations=6`、`max_react_tool_calls=10`；brief 被生成、**从未被批准**；
  迭代上限有 off-by-one（`research_iterations > max`），超出的委派返回 error ToolMessage。
- **STORM**：`max_perspective=3`（→ `max_num_persona`）、`max_conv_turn=3`、`search_top_k=3`；
  **没有 `retrieve_lens`**（v1.1.0 与 v0.2.4 均零命中）——任何引用「STORM 有 retrieve_lens」的说法
  是错的。
- **smolagents `open_deep_research`**：只有 `--model-id`；`max_steps` 硬编码 20/12，`planning_interval=4`；
  **没有 depth/breadth/planner**——depth/breadth 属于 `dzhng/deep-research`（CLI 4/2、API 3/3，
  report 模式强制 3 个 follow-up 问题）。
- **Co-STORM**：conversation 预算块（`total_conv_turn=20`、`max_num_round_table_experts=2`、
  `node_expansion_trigger_count=10` 等）+ 用户随时插话；专家自动生成，不是用户选。

**含义（推断）**：开源把偏好做成「配置文件里的 typed 参数」，但没有产品化成用户可理解的意图层；
且**计数被强制、语义只被提示**——tone、genre、word count、citation style 没有一家在决策点执行
（GPTR 的 `tone` 是一句 prompt；DeerFlow 的 `report_style` 只进 prompt）。唯一例外是 DeerFlow 2.x 的
token 硬停。

### 2.6 跨产品模式（这遍最值钱的三条）

1. **表赌：命名深度枚举 + 来源范围开关 + 自由文本规格框。** 几乎每家都有；枚举是粗旋钮，prose 才是
   研究设计真正住的地方。
2. **稀有：保存配置与计划门。** 版本化保存配置只有 Perplexity Profiles；Elicit 的 Skills/Routines
   是内容对象/周期任务，不是 run 配置；开源全是 localStorage；中国七家没有。一次性研究的
   「批准计划再花钱」门，消费级只有 Elicit Routines（周期任务）与 Perplexity 的逐工具批准；
   **没有一家给一次性研究计划提供批准门**。
3. **缺席：bias/perspective 控件。** Perplexity API、Elicit、Consensus、NotebookLM、Kimi、Qwen、
   Metaso、豆包、MiniMax、Claude、Copilot 全部没有；最接近的是 Elicit 的纳入排除、Consensus
   Medical Mode（语料限制）、Consensus Meter（被报告的分布）、Perplexity `instructions`（未标为 bias
   的自由文本）。**这是 11 个产品 + 本遍 8 个开源项目的一致缺席。**

## 3. 我们的偏好层：六件套与决策点

| 载体 | 住层 | 谁定 | 落在哪 | 用户何时可见/可改 |
|---|---|---|---|---|
| 研究类型（3 类）+ P1–P8 | lead skill | Lead 判型，HITL1 问卡确认 | question.md §HITL1 Snapshot | HITL1 第一问 |
| 方法预设（5 个） | lead skill（出厂） | HITL1 推荐 + 用户可换 | question.md §研究方法 | HITL1 第一问 / 计划卡方法行 |
| 深度（快答/标准/深度） | lead skill + HITL1 | 用户选，映射 L0–L3 | question.md + plan 节点 `depth` | HITL1 第一问；计划卡写骨干 |
| lens（8 个） | pack `content/lenses/` + skill 索引 | 按题型默认集，per-topic 子集 | question.md §本次视角 + topics.md `lenses:` | 计划卡默认不写，偏离才写 |
| 方法库（四字段） | workspace `method-library.md` | 用户显式保存；Method Editor 访谈 | 库条目 + 默认标记 | 方法库 tab / 对话显式指令 |
| HITL1 计划门 | lead persona + research-brief | 用户拍板或修订 | question.md §Decisions（逐字） | 一次；修订一轮制，不二次呈卡 |

两个设计事实（不是价值判断）：

1. **方法库是「用户所有」的唯一长期偏好载体**；lens 与方法预设是出厂只读；run 级调整只进
   question.md，不回写库（显式保存除外）。
2. **深度是全局单值 + plan 内部 per-node**；用户在 HITL1 只能选一个总档，单节点深度要等 plan 写出来
   才能看到，且计划卡不展开节点表。

### 3.1 本地使用证据（弱证据，但方向清楚）

- dev workspace 58 个 bundle 有 `question.md`，其中 20 个有 `- 采用:` 行：9 个「自动采用（quick_factual）
  ＝事实核查」，5 个复合方法（例："方案比较（主）+ 领域地图（规范来源全景）+ 主张核查（RQ7 三条断言判定）
  ——用户明确「三个都要」"），3 个方案比较，1 个主张核查，1 个领域地图，1 个时间线与信号。
  → **方法字段是单值 schema，真实用法有 25% 复合**。
- 方法库：库内 1 条（「格局调研」）；58 个 bundle 中 **0 个**「采用库条目」，1 个显式写「未采用库条目」
  （`drt_gpu-vs-cpu-idc-ops`）。→ **保存偏好层存在，但当前没有被消费**。
- lens：仅 1 个 bundle（`drt_ds-vs-bailian-longctx`，2026-11-10）有「本次视角」行；lens 层当天刚落地，
  不能当采用率证据。

## 4. 对齐矩阵

| # | 意图 | 外部做法（代表） | 我们的做法 | 判定 | 差在哪 |
|---|---|---|---|---|---|
| 1 | 哪种研究 | 模式开关（Claude/Kimi/Copilot/Consensus/NotebookLM）；Elicit workflow | 3 类型 + P1–P8 + 5 方法 | **同构** | 用户面是 3 类 + 方法行；P1–P8 内部化，选择成本不高于外部 |
| 2 | 花多少工 | **研究深度**：Perplexity 6 档 + 步数映射 + cost/latency band；Elicit 5 档滑杆（Research Agent）+ per-stage Fast/Thorough（SR）；GPTR breadth/depth/concurrency；**消费级助手多数只有模式/agent 档**（Gemini DR vs Max；Claude research 无 depth）；**推理档**：OpenAI API 7 值、Claude UI 5 档、Grok API 5 值 | 3 档 research depth + L0–L3 + 节点预算；无 reasoning effort 面 | **同构/领先（研究深度比消费级细）；落后（不可读、无代价、未分离推理档）** | 档位不解释改什么；无步数/时长/用量映射；分阶段深度只在 plan；research depth 与 reasoning effort 混为一个「深度」 |
| 3 | 从哪里找 | Copilot work/web/both；Perplexity 域名过滤；Elicit 语料+布尔；Metaso 7 范围；豆包权威度/ICP/行业；Consensus Medical Mode | 口径「来源偏好」自由文本 + lens seek + 方法「找来源」 | **落后** | 没有 typed 来源范围；三处分散；没有权威度/语料/时效的统一面 |
| 4 | 方法/立场 | Elicit Setup 参数块 + 模板；STORM/Co-STORM 自动 perspective；Claude 自动多角度 | 5 方法 + 8 lens + 方法库 | **领先（未被外部验证）** | 外部没有用户选 bias；typed 证据面是设计赌注；但「方法」本身是外部没有的产品层 |
| 5 | 写成什么样 | **消费级固定格式是常态**（ChatGPT/Claude/Copilot 报告 + 引用 + 导出；无长度滑杆）；研究工具才给模板/格式（Elicit 3 模板、Qwen detailed/summary、Kimi 多格式、GPTR format/words/tone、DeerFlow report_style、Metaso 主题） | 固定八节 + 读者版 1–3 页 + 方法「报告怎么写」 | **同构（消费级）/ 落后（研究工具层）/ 领先（可审）** | 没有模板选择与长度/格式门；读者版是差异化但不可选；外部枚举多数只进 prompt、零强制——**可机检是我们能领先的地方** |
| 6 | 以后都这样 | **账户级 free-text 指令/记忆**（Claude Instructions/project/Skills/memory；Copilot custom instructions/memory；Gemini Gems/Personal context；ChatGPT 未读）；**run 配置级**只有 Perplexity profile（版本化、安装全套）；Elicit Skills/Routines 是内容/周期任务；开源 localStorage；中国 0 | method-library 四字段 + 默认（run 配置级、显式、可审） | **不同构/部分领先** | 账户级通用指令（「总是写给高管看」）我们没有；我们有的是研究级显式库。库缺版本与采用；不补 memory，补 standing instructions 与版本 |
| 7 | 计划门 | **Gemini 是消费级唯一一次性计划门**（revise/approve + 2026 collaborative planning）；DeerFlow 1.x 两动词（开源）；Elicit Routines 批准周期任务；Perplexity 逐工具批准；Claude/ChatGPT/Copilot/Kimi/Qwen 无计划门（Copilot 只澄清） | HITL1 两段卡（≤200 字 + 3 选项 + 一轮自由文本） | **同构（与 Gemini 同级）/ 落后（可见与可编辑）** | 门本身不落后；落后在计划不可编辑、节点表不可见；Gemini 可改 plan、Elicit 可 Modify Setup |
| 8 | 中途 steer | Elicit Modify Setup + 阈值滑杆；Co-STORM 随时插话；Kimi 跑后多轮；Perplexity 逐工具批准；中国区基本不可 steer | 两点交互；中途消息不改方向 | **不同构** | 我们以审计/自主换 steer；需声明，不模仿 |
| 9 | 模型/推理档 | Perplexity effort 捆绑 model；GPTR 三档 model；Claude 管理员管 effort；DeerFlow 2.x per-thread model | preset 不声明 model；无 per-run 档 | **落后** | 用户不能「同深度换更强模型」；也可能是有意约束 |

**冲突/合并语义**：Perplexity 明写「请求覆盖 profile、tools 按工具合并、effort 与 profile 互斥」；
DeerFlow 2.x 客户端可覆盖 recursion_limit 但网关拒绝超过 1000；我们的优先级「用户 > 方法预设 > lens」
只写在研究口径里，靠 Lead 模型执行，没有 typed 合并或机械检查。这是对齐矩阵之外的**口径差**。

## 5. 采纳度矩阵更新（偏好层）

| 做法 | 独立系统（可核） | 计数 | 判定 |
|---|---|---|---|
| 命名 research depth / mode 枚举 | Perplexity、Elicit、GPTR、NotebookLM、Consensus、Metaso、DeerFlow 2.x、Kimi（固定时长）；消费级助手多为 mode/agent 档 | 8 | **table stakes** |
| 推理 effort 枚举 | OpenAI API（7 值）、Claude UI（5 档）、Grok API（5 值）、Perplexity `reasoning.effort` | 4 | API/设置层 table stakes；**与 research depth 分离** |
| effort 代价/步数可读 | Perplexity（步数 1/5/15/40/300 + cost/latency band）、Elicit（用量倍数 + per-stage） | 2 | 稀缺但关键；**「可读性」是差异化** |
| 来源范围开关 | Perplexity、Elicit、Consensus、NotebookLM、Gemini、Metaso、豆包、GPTR；Copilot 仅 admin；Kimi 仅提示词 | 8 | **table stakes**（altitude 不同） |
| 输出格式/模板 | Elicit、Kimi、Qwen、GPTR、DeerFlow 1.x、Metaso；消费级助手固定格式 | 6 | **table stakes**（研究工具层；多数 prompt-only） |
| 账户级保存指令/记忆 | Claude（Instructions/project/Skills/memory）、Copilot（custom instructions/memory）、Gemini（Gems/Personal context）、ChatGPT（未读，功能存在） | 3 可核 + 1 未读 | **table stakes**；但都是 free-text/不可审 |
| run 配置版本化 | Perplexity Profiles（唯一） | 1 | **稀有**；我们显式库是差异化方向 |
| 研究计划/动作批准 | Gemini（一次性，消费级）、DeerFlow 1.x（一次性，开源）、Elicit Routines（周期任务）、Perplexity（逐工具） | 4（一次性 = 2） | **稀有**；我们 HITL1 与 Gemini 同构、比多数产品多 |
| 中途 steer / 可编辑 setup | Elicit Modify Setup、Co-STORM、Kimi 多轮、Perplexity 工具批准 | 4 | 研究产品 table stakes；与审计立场冲突 |
| 预算/花费在决策点强制 | DeerFlow 2.x（token hard stop + recursion clamp）、LangGraph（并发截断 + 迭代上限） | 2 | 正在收敛；**修正第一遍「0 家」** |
| 用户可选证据面/立场 | 0（11 产品 + 8 开源项目一致缺席） | 0 | **差异化（我们）** |
| 可审计的方法四字段 + 覆盖表 | Elicit（pre-run 参数 + quote） | 1 | **差异化** |

补一条**负结果**：STORM 的 perspective 消融支持「覆盖」而非「大纲」（第二遍）；本遍补读的 STORM 论文
给出对 outline-driven RAG 基线组织 +25%、覆盖 +10%（论文自报；与消融不是同一个对照）；但没有任何研究
支持「用户亲手选更多视角」有增益——只有成本证据（cells 上限 12 是我们自己的防线）。

## 6. 2026 年的证据：什么被证明、什么没有

这节回答「偏好层该不该存在、在哪里问、问多少」；它比产品功能表更能约束设计。

### 6.1 澄清：要早，要少，要值

- **《Ask Early, Ask Late, Ask Right》（2026）**：84 个欠指定任务、3 个基准、4 个模型、6,000+ runs。
  目标澄清在 10% 执行后几乎失效（pass@3 0.78 → baseline）；输入澄清可撑到约 50%；任何澄清拖过中段
  都比不问更差；300 场自然会话里没有模型在最优窗口发问，策略从过度提问（GPT-5.2 52% 会话）到从不
  提问（Gemini 3 Flash 0%）。（[ar5iv](https://ar5iv.labs.arxiv.org/html/2605.07937)）
- **《Learning to Clarify Underspecified Intents Under Limited Interaction》（2026）**：预注册 76 人
  /456 会话；更好的结果只需 **2.81 个问题**（对照 4.90）；**0–1 个回答没有显著收益**；中位数 3 个
  回答。（[arXiv](https://arxiv.org/abs/2610.04719)）
- **AgentAsk（2025）**：定向澄清最高 +4.69% 准确率，延迟/额外成本 <10%。
  （[arXiv](https://arxiv.org/abs/2510.07593)）

**对我们的含义（推断）**：HITL1 放在任何检索之前是对的；三问 + 计划卡已接近「早期目标/约束澄清」的
上限，**再加前置问题会踩 over-asking**。计划卡的 200 字不是纯 UX，它是「高信息量澄清」的纪律；
但卡里必须真的包含目标与约束，不能只有流程骨架。

### 6.2 个性化：收益真实，但会和事实准确率打架；真实用户不可替代

- **Personalized Deep Research Bench（2025/ICLR 2026）**：50 任务 × 25 画像 = 250 query；
  P-score 从 task-only 6.17 → context 6.53 → persona 6.78；但**最个性化的 agent 事实准确率 3.77/10**，
  而商业化、较低个性化的 Gemini-2.5-Pro DR 是 6.58 / 8.40。
  （[arXiv](https://arxiv.org/abs/2509.25106)）
- **MyScholarQA（ACL 2026）**：21 名用户、90 分钟访谈；推断画像 → 提议动作 → 用户批准 → 报告遵循；
  73% 满意；真实用户发现 **9 类 LLM judge 看不见的个性化错误**；judges "never beat majority class
  baselines"；画像还会高估用户专业度、动作漂移。
  （[ACL Anthology](https://aclanthology.org/2026.acl-long.723/)）
- **Memory ≠ preference**：P-score No Memory 3.69、Mem0 3.55、Memory OS 3.88、O-Mem 4.26、
  explicit persona 4.58——**记忆层可能比没有记忆更差**。
- **Preference adherence collapses**：PrefEval 在 10 轮 / 约 3k token 就低于 10%；IFScale 最好模型在
  500 条指令时 68%；Mr-Dre（ACL 2026）应用反馈的 incorporation >90%，但 **内容反馈平均破坏 31%、
  格式反馈 21%** 的既有覆盖/引用质量。
  （[PrefEval](https://arxiv.org/abs/2502.09597)；[IFScale](https://arxiv.org/abs/2507.11538)；
  [Mr-Dre](https://aclanthology.org/2026.acl-long.609/)）
- **Benchmark 不量偏好**：RACE 的 "instruction-following" 只表示「文章贴题、直接回答问题」，
  不是 style/tone/format；且它是四个 DR agent 的**最低维度**（Gemini-2.5-Pro DR 48.50 vs readability
  49.18；OpenAI DR 45.25 vs 49.27）。DeepResearch Bench II 作者明说 presentation "does not yet account
  for how the model can personalize the presentation based on the user's knowledge background and
  preferences"。（[RACE](https://arxiv.org/abs/2506.11763)；[DRB II](https://arxiv.org/abs/2601.08536)）

**对我们的含义（推断）**：
- 我们的「用户显式四字段 + HITL1 批准计划」比「模型自动推断偏好」更符合 MyScholarQA 的教训；
- 但方法库同样是未经真实用户验证的 prompt 文本，且**偏好越多不一定越好**——个性化会换事实准确率；
- 用 LLM judge 评「偏好是否被遵循」会漏错；偏好层的验收必须有人；
- **长度/格式/结构必须机检**：外部证据说这些约束在长文里会崩，且格式反馈的破坏率只比内容低 10pp。

### 6.3 视角：覆盖有证据，立场有反证

- **STORM**：perspective-guided asking 组织 +25%、覆盖 +10%（论文自报）；第二遍的消融则显示
  大纲几乎不动、唯一来源 99.83 → 54.36——收益在覆盖，不在大纲。
- **CHI 2026**：平衡框架 + 极端情绪的文章被读成**更**偏颇（hostile media effect，约 180 人）；
  极端情绪降低信任，披露 LLM 参与反而略升信任。
  （[DOI](https://doi.org/10.1145/3772318.3791527)）
- **ELEPHANT（2025）**：模型在 48% 的案例里对双方都附和；保全面子比人类多 45pp。
  （[arXiv](https://arxiv.org/abs/2505.13995)）

**对我们的含义（推断）**：lens 必须继续做成**覆盖要求**（「这个面挖没挖」），不是**立场选择**
（「你站哪边」）。我们现在的 lens 是证据面（official/quant/practitioner/adversarial/structural/
historical/regulatory/academic），不是政治立场；但用户可能把它读成「让报告更批判/更中立」。
`adversarial` 的命名与 `bias` 字段需要在使用说明里框成「找反证」，不是「选边」。平衡不是默认正确：
对极端情绪主题，「各打五十大板」可能被读成更偏颇。

### 6.4 本遍修正前两遍的四处

1. **「预算在决策点执行 = 空白」→ 不空，但只在计数层。** DeerFlow 2.x 在 `hard_stop_threshold`
   处剥掉 tool calls、强制收尾；LangGraph 把并发调用截到 N、超出的委派返回 error ToolMessage。
   第一遍说「0 家做到调用前拒绝」过强；准确说法是「没有语义预算（覆盖/质量）的决策点强制，
   只有 token/并发/迭代计数」。
2. **「花钱前人工确认/可编辑的门 = table stakes」→ 把「参数块/澄清」误算成「计划批准」。**
   真正的一次性研究计划批准：Gemini collaborative planning（本轮找到的消费级唯一例子）；
   DeerFlow 1.x `interrupt("Please Review the Plan.")`（开源）；Elicit Routines 批准的是**周期任务**的
   指令与排期，不是一次性计划。我们的 HITL1 在种类上不落后，落后的是可编辑性。
3. **「保存配置 = table stakes」→ run 配置层只有 Perplexity Profiles。** 其余是账户记忆（Claude）、
   内容对象（Elicit Skills）、localStorage（GPTR / DeerFlow）、或没有（中国 7 家）。我们的显式四字段库
   是差异化方向，不是补课；但缺版本与采用。
4. **两个具体事实纠正**：STORM 没有 `retrieve_lens`（v1.1.0 / v0.2.4 均零命中；真实旋钮是
   `max_perspective` → `max_num_persona`、`search_top_k`、`max_conv_turn`）；smolagents 的
   `open_deep_research` 没有 depth/breadth/planner（只有 `--model-id`，max_steps 硬编码 20/12），
   depth/breadth 属于 `dzhng/deep-research`。引用这两条的地方需要改。

## 7. 判定（不客气版）

1. **结构同构，不是缺块。** 我们的「出厂预设 / 用户库 / per-run + 计划门」与 Perplexity 的
   「effort / profile / request override」是同一骨架；外部只是把它叫 effort + skills + instructions。
2. **计划门与保存配置是「领先但未产品化」，不是落后。** 外部一次性研究除 Gemini 外几乎没有批准门；
   run 配置层的版本化 profile 只有 Perplexity。我们的 HITL1 与方法库在**种类**上领先，在**可编辑/版本/采用**上落后。
   不要因为外部有 Modify Setup 就否定 200 字卡；也不要因为外部没有就以为库不需要版本。
3. **effort 落后的核心是「不可读 + 没把推理档分开」，不是「档位少」。** 消费级助手多数根本没有
   research depth（Claude research 固定模型、Gemini 只有 agent 档、ChatGPT 无 UI 控件）；我们三档其实
   比消费级细。落后在：不解释改什么、不给步数/时长/额度、把 research depth 与 reasoning effort 混成
   一个「深度」。正确动作不是加档，是把 3 档的映射写清，并承认推理档由模型/角色固定。
4. **来源范围是最大的 typed 缺口。** 8 家产品把来源范围做成开关/枚举（工作区/网页、语料、频道、
   权威度、域名、时效）；我们把它拆成自由文本 + lens + 方法三处，用户不知道该改哪。补一个
   「来源范围」typed 面，比再加一个前置问题更对齐。
5. **输出形态：消费级固定格式是常态，我们不算落后；研究工具层才给模板/格式。** Elicit 模板、Kimi
   格式、Qwen 两档、DeerFlow report_style 都只是 prompt；我们的固定八节 + 读者版是结构约束。缺的是
   模板选择与长度/格式门，不是 tone 枚举。正确方向不是加风格枚举，而是**让选中的形态可机检**——
   这是外部没人做的空白。
6. **保存配置：账户级 free-text 是 table stakes；我们的 run-config 级库稀有且可审。** 缺的是通用
   standing instructions（「总是写给高管看」）与版本，不是补 memory；本地 0/58 采用，先证采用再加
   版本/provenance，扩库（run profile）会让「偏好越多、准确率越差」的风险成真。
7. **lens 是差异化，不是欠账。** 11 产品 + 8 开源项目没有用户可选视角；不要按「主流没有」删，也不要把它
   当 source scope 或 political stance 卖。按覆盖计、默认不展开、偏离才写，是正确姿态。
8. **两点 HITL 是立场，有证据支持「早问少问」，不支持「随时 steer」。** 保留，声明；不把
   「不能中途改方向」写成缺陷，也不把「两点」写成行业标准。
9. **方法字段单值与真实复合用法有缝。** 本地 20 个有方法行的 bundle 里 5 个复合；单值 schema 让
   Lead 用自由文本吸收复合。要么承认「主方法 + 附加方法」是合法形态，要么在问题卡上只承诺主方法。
10. **预算只在计划里声明，没有在决策点强制。** DeerFlow 2.x 的 token hard stop 与 LangGraph 的并发/迭代
    截断是外部唯一把「预算」变成机制的做法；我们的 `max_calls`/`max_children` 仍是合同/散文。
    这条与 workflow 卡重叠，记在这里供跨卡裁决。

## 8. 候选动作（不立卡；按证据强弱排序）

| 代号 | 动作 | 改动面 | 证据 | 风险/代价 | 建议 |
|---|---|---|---|---|---|
| **A** | 深度选项加「改什么 + 预计规模/时长/额度」一句；计划卡展示每层节点数与最深深度 | lead skill + persona + 计划卡字数 | Perplexity 步数映射 + cost band；Elicit 倍数；Kimi 跑前不预告成本（反例） | 卡 200 字预算；信息过载 | **先做**（最小、可回滚） |
| **B** | 来源范围做成 typed 选项（web / 学术 / 官方 / 工作区文件 / 混合）+ 时效/语言/域名（可空） | question.md §Constraints + HITL1 + 方法 skill | 8 家 table stakes；豆包权威度、Metaso 7 范围、Elicit 语料 | 与「来源偏好」自由文本重复；需定默认 | **先做**（补最大缺口） |
| **C** | 输出形态选择（完整报告 / 1 页 / 对比表）+ 长度/格式可机检 + 修改后回归检查 | templates + 门禁 + HITL1/rerun | Elicit 3 模板、Qwen 两档、Kimi 格式；WritingBench 长度最难；Mr-Dre 破坏率 31%/21% | 动 pack 公共行为；门禁扩展 | **先做设计，试点后落地** |
| **D** | 计划门从「200 字卡」升级为「可编辑 setup」：节点表可见 + 结构化 patch（加/删节点、改 depth、换 lens）+ 一轮修订 | HITL1 合同 + plan 模板 + ask 选项 + 测试 | Elicit Modify Setup、Gemini collaborative plan；MyScholarQA 用户批准动作 | 动 pack 公共行为；200 字纪律要重定 | 试点后做（1–2 场真实 HITL1） |
| **E** | 方法库加版本/provenance（`updated`、来源 run、`version`） | 库 schema + cockpit + 测试 | Perplexity profile 版本语义；本地 0 采用 | 小；但可能过度设计 | **低成本可做**；run-profile 扩展暂缓 |
| **F** | 预算在决策点强制（`max_children`/`max_calls` 超限拒绝或降级） | workflow/recipe 层；与 workflow 卡重叠 | DeerFlow 2.x hard stop；LangGraph 截断 | 动编排层 | 交 workflow 卡裁决 |
| **G** | 不做：bias 立场旋钮、tone 枚举、6 档 effort、账户级 memory、用户选模型 | — | 0 产品有 bias 控件；tone 全程 prompt-only；记忆≠偏好；6 档过细 | 少即是多 | **不做**（写进「不做」） |

**顺序建议（推断）**：A + B 是「对齐主流且不动大合同」的两片；C 是证据最强、但需要门禁扩展的一片；
D 在 1–2 场真实 HITL1 观察后做；E 只做版本元数据；F 交 workflow 卡；G 明确不做。

### 8.1 备选与否决（不是所有能做的都该做）

| 备选 | 为什么不选/暂缓 | 重议条件 |
|---|---|---|
| 复制 Perplexity 6 档 effort | 3 档已比消费级细；加档不解决「不可读」 | 实测 3 档不够，或用户要求更细 |
| 加 tone/style 枚举 | 外部 tone 只进 prompt、零强制；风格伤事实；无收益证据 | 用户明确要求写作风格，且能机检 |
| 加 bias/立场旋钮 | 11 产品 + 8 开源项目无；CHI/ELEPHANT 反证 | 外部出现用户可选视角并证明收益 |
| 加账户级 memory | Mem0 3.55 < 无记忆 3.69；显式库更可审 | 用户要跨 run 通用指令并接受可审成本 |
| 立即做 run profile | 本地 0 采用；偏好越多准确率越差 | 方法库有真实采用（≥2 条/月） |
| 计划卡升级为完整可编辑 plan | 需要真实 HITL1 观察；200 字纪律与全 plan 不同 | 5–10 场观察显示卡不够 |
| 用户面加 per-stage depth | plan 已有 per-node；用户面加会超 200 字 | 用户要求单节点调深度 |
| 复制 DeerFlow hard stop | 与 workflow 卡重叠；需 recipe 层 | workflow 卡裁决后 |

### 8.2 决策表（若现在拍板）

| 选项 | 内容 | 证据强度 | 代价 | 建议 |
|---|---|---|---|---|
| **O0 不动作** | 继续观察 | 中（缺口持续） | 低 | 不推荐；effort/source 是 table stakes 缺口 |
| **O1 最小对齐** | A（effort 可读）+ B（typed 来源范围） | **强**（8 家 source scope；2 家 cost/step legibility） | 低（skill/persona/模板） | **推荐先做** |
| **O2 对齐 + 计划门** | A+B+D（可编辑 setup + 节点表） | 中（Gemini/Elicit 先例；缺本地用户证据） | 中（动 HITL1 合同） | 试点后做 |
| **O3 run profile** | A+B+E/D（库版本 + 全套配置） | 弱（0 采用 + 准确率 trade-off） | 高（D25/D37/schema） | 暂缓 |
| **O4 输出机检** | C（模板 + 长度/格式门） | 中（WritingBench/Mr-Dre） | 中（门禁扩展） | 可与 O1 并行 |

**如果只做一件事 = B（typed 来源范围）；做两件 = A+B。** 这两片不动大合同、直接补 table stakes；
C 是证据第二强但需要门禁扩展；D 需要真实 HITL1 观察；E 只做版本元数据。

### 8.3 试点配方（若要验证，不立卡）

- **P1 HITL1 观察**：5–10 场真实 run，记录用户是否打开 plan/question、是否用修订、卡是否够；
  判据 = 用户不打开文件也能说清「这次怎么跑」。
- **P2 来源范围 A/B**：同一题 2 场，一场现状自由文本、一场 typed scope；判据 = 覆盖/来源 tier 分布/
  用户改口径次数。
- **P3 方法库采用**：2–4 周内是否出现第 2 条被采用的库条目；判据 = ≥1 场「采用库条目」；否则 D 不立项。
- **P4 输出机检**：对 2 份报告加长度/格式断言，看是否误伤；判据 = 0 误伤 + 抓到 1 个真实缺口。

## 9. 什么会改变结论

1. **真实用户观察**：如果 5–10 次 HITL1 里用户从不打开 question.md/plan.md，只在 200 字卡上点「按计划
   开跑」，那么 D（可编辑 setup）优先级上升；如果用户根本不看深度，A 的「代价一句」也可能多余。
2. **方法库采用率**：如果 A/B 落地后仍 0 采用，E 不成立；如果用户开始存「来源偏好/输出形态」类条目，
   E 的方向被证实（但应扩字段而非加条目）。
3. **lens 覆盖证据**：如果真实 run 的 `topic × lens` 覆盖表长期靠「gap：时间不够」填满，或用户从不改
   默认集，lens 应退回内部方法（不进用户面）；如果用户主动加/换 lens，则「可选」设计成立。
4. **外部变化**：Perplexity Profiles 进消费者端、Elicit Modify Setup 成为一次性研究默认、Gemini plan
   editing 成常态、Claude styles→skills 完成——任一发生，D 从「试点后」变「必须」；反之，如果消费级
   继续「无计划门」，我们的 HITL1 仍是差异化。
5. **第二模型 provider**：critic 独立性升级；模型档可能从 G（不做）变成可选项。
6. **如果外部出现「用户可选视角/立场」且证明收益**：lens 从差异化变 table stakes，我们的默认集/上限
   需要重新对标。
7. **如果偏好准确率 trade-off 在我们的试点里出现**（例如选更多 lens 后事实准确率下降），则「少即是多」
   从推断变结论，A/B/C 的默认值要收窄。

## 10. 未覆盖（第三遍遗留，不假装已定性）

- **Perplexity 消费者端**：Research / Spaces / Focus / Labs 官方说明（帮助中心 DNS 污染）；本文只用
  Agent API 的 effort/profile/skills，未把 API 机制等同消费者 UI。
- **OpenAI**：ChatGPT 的 custom instructions / memory / projects / styles / connectors 页面（403 /
  Cloudflare）；ChatGPT UI 是否有 depth/plan 控件未验证，**不写成「没有」**。system card 与 API 参数已读。
- **Google**：Gemini API 的 thinking-budget 数值、support 中心细节（fetch failed）；计划批准与来源选择
  已用 blog.google 复核，speed/depth 仍沿用第一遍证据。
- **Claude Styles→Skills**：只有官方韩文标题线索，正文 404。
- **Grok UI**：DeepSearch / Research 标签不可读（x.ai / docs.x.ai / grok.com 不可达）；API proto 已读。
- **中国产品**：Zhipu 消费端、豆包深度研究消费端、元宝、Genspark / You.com / SciSpace / Scite 未读到；
  Kimi/Qwen/Metaso/MiniMax 只覆盖已读页。
- **评测**：BrowseComp 全量、DeepResearch Arena 全量未读；本轮用了 RACE / DRB II / FACT（第二遍）/
  个性化 DR / 偏好遵循 / 澄清时序等 13 篇。
- **真实用户**：没有做用户研究；§9 的「真实用户观察」是待执行，不是已完成证据。

## 11. 来源

**产品/API（本轮新读）**

- Perplexity Effort: https://perplexity.mintlify.app/docs/agent-api/effort.md
- Perplexity Profiles: https://perplexity.mintlify.app/docs/agent-api/profiles.md
- Perplexity Skills: https://perplexity.mintlify.app/docs/agent-api/skills.md
- Elicit Systematic Reviews: https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit
- Elicit Full-Text Screening: https://support.elicit.com/en/articles/14759157-full-text-screening-in-elicit-systematic-reviews
- Elicit Research Report: https://support.elicit.com/en/articles/14756862-get-a-research-report-to-generate-in-depth-answers-automatically-in-elicit
- Elicit Skills: https://support.elicit.com/en/articles/16647708-skills-in-elicit
- Elicit Changelog: https://support.elicit.com/en/articles/14823097-changelog
- Kimi Deep Research: https://www.kimi.ai/zh-hant/help/deep-research/deep-research-overview
- Kimi 功能页: https://www.kimi.com/features/deep-research
- Qwen-Deep-Research API: https://www.alibabacloud.com/help/zh/model-studio/qwen-deep-research-api
- Microsoft Copilot Researcher: https://learn.microsoft.com/en-us/copilot/manage/researcher-agent
- Claude Research: https://claude.com/resources/articles/research
- Claude release notes: https://support.claude.com/en/articles/12138966-release-notes
- OpenAI Deep Research system card: https://deploymentsafety.openai.com/deep-research
- GPT-Researcher config: https://docs.gptr.dev/docs/gpt-researcher/gptr/config
- Consensus Deep Search: https://consensus.app/home/blog/deep-search/
- NotebookLM Deep Research: https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-deep-research-file-types/
- Undermind MCP: https://www.undermind.ai/mcp

**西方助手（本轮新读）**

- Claude Research: https://support.claude.com/en/articles/11088861-use-research-on-claude
- Claude Effort / model / thinking: https://support.claude.com/en/articles/8664678-change-the-model-effort-and-thinking-settings
- Claude personalization: https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features
- Claude memory: https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context
- Gemini Deep Research（计划批准）: https://blog.google/products-and-platforms/products/gemini/google-gemini-deep-research/
- Gemini 2026 collaborative planning: https://blog.google/innovation-and-ai/models-and-research/gemini-models/next-generation-gemini-deep-research/
- Gemini Workspace 来源: https://blog.google/products-and-platforms/products/gemini/deep-research-workspace-app-integration/
- Gemini Gems: https://blog.google/products-and-platforms/products/gemini/google-gems-tips/
- Gemini Personal context: https://blog.google/intl/en-ca/feed/use-past-chats-to-get-more-personalized-responses/
- Copilot Researcher（澄清）: https://support.microsoft.com/en-us/microsoft-365-copilot/get-started-with-researcher-in-microsoft-365-copilot
- Copilot Deep Research 退役: https://support.microsoft.com/en-us/microsoft-copilot/deep-research-in-microsoft-copilot
- OpenAI 官方 deep research 发布文（cookbook PDF 副本）: https://github.com/openai/openai-cookbook/blob/main/examples/data/openai_blog_pdfs/Introducing%20deep%20research%20_%20OpenAI.pdf
- OpenAI OpenAPI spec: https://github.com/openai/openai-openapi
- xAI proto（SearchParameters / ReasoningEffort）: https://github.com/xai-org/xai-proto

**论文（本轮新读）**

- RACE / DeepResearch Bench: https://arxiv.org/abs/2506.11763
- DeepResearch Bench II: https://arxiv.org/abs/2601.08536
- Personalized Deep Research Bench: https://arxiv.org/abs/2509.25106
- MyScholarQA: https://aclanthology.org/2026.acl-long.723/ · https://arxiv.org/abs/2603.16120
- Ask Early, Ask Late, Ask Right: https://ar5iv.labs.arxiv.org/html/2605.07937
- Clarification under limited interaction: https://arxiv.org/abs/2610.04719
- AgentAsk: https://arxiv.org/abs/2510.07593
- PrefEval: https://arxiv.org/abs/2502.09597
- IFScale: https://arxiv.org/abs/2507.11538
- Mr-Dre: https://aclanthology.org/2026.acl-long.609/
- ELEPHANT: https://arxiv.org/abs/2505.13995
- CHI 2026 framing: https://doi.org/10.1145/3772318.3791527
- Co-STORM: https://ar5iv.labs.arxiv.org/html/2408.15232

**回指（第一遍/第二遍已核，本轮不重复摘录）**

- STORM / LangGraph / Gemini / FACT / GPTR enums / DeerFlow:
  [第一遍](2026-11-10-landscape-first-pass.md) · [第二遍](2026-11-10-landscape-second-pass.md)
