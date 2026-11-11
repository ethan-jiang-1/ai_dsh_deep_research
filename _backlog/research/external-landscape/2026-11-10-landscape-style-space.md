---
topic: 外部 landscape 第四遍：Deep Research 的 style 空间、研究文化与隐含 Protocol
intent: 不再按产品列功能，而是把外部系统读成一份份「隐含 Protocol」，回答 Deep Research 有哪些 style、各自背后的研究文化/真理等级/验收合同是什么、为什么一种 style 不能通吃，以及这对本仓偏好层（style = 命名 Protocol + 验收合同）的增量含义。
---

# 外部 landscape 第四遍：Deep Research 的 style 空间（2026-11-10）

> 性质：来源综述 + 推断，不是决定。外部事实带 URL；厂商自报标「厂商自报」；本仓事实带文件锚点。
> **约束（用户 2026-11-10 明确）**：权重不动，只用现成模型；本材料只讨论**权重之上**的杠杆——
> prompt / skill / preset / plugin / constraint / gate / artifact / interaction。不训练、不微调、
> 不把换模型当方案。
> 覆盖：第一至第三遍已核的产品/框架只回指，不重复摘录；本遍新增 = style 视角、2026 claim-level
> factuality 证据、研究文化对照、对本仓 Protocol 的增量建议。被挡来源与未覆盖见 §10。
> 口径：计数单位 = **style 原型**，不是产品；「style」= 对一类研究承诺什么、什么算完成、什么不算的
> 稳定选择。产品名只作例子，不进入 schema。

## 0. 一句话

**外部没有把 style 做成对象，而是把一种研究文化硬编码进产品与评测（这是它们的做法，不是我们的
杠杆）；所以一种 style 只能覆盖一类题。**
Style 不是新轴，是一份**命名 Protocol + 验收合同**：`promise`（承诺什么）/ `means`（method、source、
lens、effort、output）/ `acceptance`（什么算完成）/ `not_for`（不承诺什么）。Gemini 的「学术可以、
事实不行」不是模型单点缺陷，是 **report-style 的隐含 Protocol 与 fact-check 题不匹配**；2026 证据显示
report quality 与 claim-level factuality 是两条轴，且更多搜索会降低 fact-check 准确率。对我们的含义：
把 style 做成 Library 的命名 Protocol 模板 + `gate_profile`；Protocol 加 `style_ref`，不加新轴、不加角色；
验收按 style 选，不搞一套报告门通吃。

## 1. 口径：style 是什么，不是什么

### 1.1 定义

本材料把 **style** 定义为四件事的稳定组合：

1. **promise**：这类研究向用户承诺什么（一个可核的数字 / 一张地图 / 一篇综述 / 一条时间线 / 一个决定）。
2. **means**：为兑现承诺选择的 method、source_scope、lens_plan、effort、output。
3. **acceptance**：什么算完成、什么算失败；哪些门必须绿，哪些缺口必须显式。
4. **not_for**：这类 style 明确不接的题；不接时应该换 style，而不是硬跑。

从这个定义看，style 不是「写作风格 / tone」，也不是「人格」；它是**研究承诺 + 验收**。同一个模型、同一套
工具，换 style 就是换一份 Protocol；反过来，同一份 Protocol 只改措辞，不算换 style。

注意：style 是**模板**，不是与题型/lens 并列的维度；它解析后落到现有字段，不产生新的正交轴。同理，
多智能体 / 单智能体、wave / DAG 是**运输方式**，不是 style；它们可以服务任何 style，但不定义承诺。
操作顺序是 **promise → means → acceptance**；先选模板/深度、后想承诺，最容易产生 style mismatch。

**边界**：权重不动；不训练、不微调、不把换模型当方案、不做 per-style 模型。我们能做的是把 style 写成
prompt / skill / preset / catalog / gate / artifact，让现成模型在同一套权重上换承诺与验收。

因此，本材料比较的是**同一权重上换 style/验收**能改变什么；不比较「我们的模型 vs Gemini 的模型」。
外部的报告质量/事实差距只用于说明 style 的价值，不用来论证「换个更强的模型就好了」。

### 1.2 与现有四层的关系

| 层 | 回答什么 | 本仓载体 | 例子 | 与 style 的关系 |
|---|---|---|---|---|
| **题型 P1–P8** | 答案长什么样 | `question-patterns` skill | P2 价目表、P4 断言验证 | 题型决定答案形状；**同一题型可以有两种 style** |
| **研究承诺 profile** | 这类研究承诺什么（粗粒度） | 旧 harness 的 `research_profile`；本仓三研究类型 | quick_factual / exploratory_map / claim_verification | style 的粗粒度前身；旧 harness 还有 `research_style_params` |
| **style（本材料）** | 承诺 + 手段 + 验收的命名 bundle | preference-layer 的「搜索倾向」；本材料提议的 style catalog | 官方口径核查 / 学术综述 / 全景 / 监管对比 / 时间线 / 决策备忘录 | **命名 Protocol 模板 + 验收合同** |
| **method** | 怎么搜、怎么验、怎么写 | 5 个方法预设 / method-library 四字段 | 事实核查、领域地图、方案比较 | style 选 method；同一 method 可服务不同 style |
| **lens** | 从哪些证据面挖 | `content/lenses/` 8 条 | official / academic / adversarial | style 选 lens 集；lens 是 style 的组件，不是 style 本身 |

**关键区分：题型 ≠ style。** P2「价目表」可以是 **fact-check style**（官方价页、逐格日期、可核价），也可以是
**landscape style**（市场价位图、区间、方法说明）。两者都合法，但承诺不同；HITL1 要问的是「你要可核价的
数字，还是要一张市场价位图？」，不是「你要不要 P2」。这是本遍最值得写进偏好层的一句话。

### 1.3 旧 harness 的 `research_style_params`：好的一半，坏的一半

本仓方法论源头（codex harness）在 `rb_profile.yaml` 里同时有 `research_profile` 和
`research_style_params`：各波 floor、`topic_unique_ratio`、反例搜索、交叉验证、quality tier，阈值由
gate 引用 profile，不硬编码（[考古报告](../../../notes/archived/2026-09-24-deep-research-harness-analysis.md)
§3/§5/§7）。本仓重建时**弃用了数值 floor**，把深度参数放回 skill 纪律（[30-methodology-mapping](../../../docs/design/30-methodology-mapping.md)
的 wave1 行）。这个取舍是对的：floor 容易变成形式主义。

但旧 harness 有**好的一半**：它把「这类研究的验收阈值」写成 profile 数据，而不是散文。我们丢掉了 floor，
也丢掉了「style 自带验收」这层。外部 2026 证据（§3）说的正是这件事：**报告体裁的评测函数和生产函数的
错配，不能靠再加一个「深度」档解决，要靠换验收。** 本遍的建议不是把旧 floor 全搬回来，而是把
**验收 profile** 搬回来——只保留少量与承诺直接相关的检查，不做「每波 ≥N 源」的机械 floor。

## 2. 外部事实 A：产品自己承认的 style 边界

### 2.1 报告型：把「全面报告」当承诺

- **Kimi Deep Research**：官方帮助页把承诺写得很直白——平均 **10,000+ 字**、约 **26 个可追溯来源**、
  **10–25 分钟**；「最適合：投資分析、產業研究、學術主題、策略規劃、法規審查、知識整合」；
  「不適合：創意寫作（小說、劇本）、算命、履歷撰寫、固定格式範本、可編輯簡報」。流程是意图澄清 →
  23 个推理步骤 → 约 74 个关键词 / 206 个 URL / 筛出前 3.2% → 长报告 + HTML 可视化。
  （[Kimi 帮助](https://www.kimi.ai/zh-hant/help/deep-research/deep-research-overview)）
- **OpenAI Deep Research**：系统卡说它由早期 o3 驱动、**为网页浏览优化**；能力描述是「搜索、点击、
  滚动、读文件、用 Python、综合大量网站以找具体信息或写 comprehensive reports」。
  （外部产品事实，只解释它为什么是 report style；不是我们的做法。）
  （[System Card](https://deploymentsafety.openai.com/deep-research)）
- **Anthropic Research**：官方工程博客明确说多智能体「尤其擅长 **breadth-first queries**」，策略是
  「start wide, then narrow down」，最后有 CitationAgent 做引用定位；代价是约 **15×** chat token。
  （[Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)）
- **Gemini Deep Research**：第一遍已核的形态是 question → **multi-step plan（可 revise/approve）** →
  批准后迭代搜索 → 带链接报告；2026 API 把批准做成显式状态位，来源可选 Workspace + web，消费端没有
  depth 选择器（[第一遍](2026-11-10-landscape-first-pass.md) §2；[第三遍](2026-11-10-landscape-preference-layer.md)
  §2.4）。

**含义（推断）**：这四家共享一个 promise——「给你一份全面、可读、带引用的报告」。它们的差异主要在
source（web / Workspace / 多智能体广度）和 interaction（计划门 / fire-and-forget），不在验收：都主要
按报告质量、引用可点、覆盖全面来评价。**这是 report style，不是 fact-check style。**

### 2.2 综述型：把「文献覆盖」当承诺

- **Elicit Systematic Reviews**：Setup 页「把每一步和每个设置放在一个地方，跑之前全部配好」；检索可
  语义 / 布尔（PRISMA/HTA 用布尔）；摘要筛选与全文筛选可各自 Fast/Thorough；每个筛选决定都附论文
  原文 quote；报告模板是跑前一等选择；跑中可以 Modify Setup；企业版有 dual review、冲突裁决、
  Cohen's kappa、审计轨迹。
  （[Elicit SR](https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit)）
- **Undermind**：`launch_deep_search`「从开放研究目标跑 deep literature review，产出排序论文列表 +
  书面综合；自己规划检索、追引用和关键作者，**只有当新检索不再找到相关论文时才停**」；跑完还持续监控
  新论文（`list_deep_search_updates`）。厂商自报 23 个 research goal、10 分钟 recall 73%，对比通用
  agent 29–39%（厂商自跑，未同行评审）。
  （[Undermind MCP](https://www.undermind.ai/mcp)）
- **STORM**：先找 Wikipedia 相关页 → 生成不同编辑 persona → 用 perspective 引导提问；消融显示
  outline 几乎不动，但唯一来源 99.83 → 54.36（[第二遍](2026-11-10-landscape-second-pass.md) §2）。
  STORM 的 promise 是「百科全书式条目 + 多视角覆盖」，不是「可核事实」。

**含义（推断）**：综述型的验收是 **corpus coverage + 筛选可复现 + quote 可回读**；它的 truth source 是
学术语料，不是全网。它跑「当前价格 / 某公司是否发布」会系统性偏慢、偏旧、偏论文；这不是模型笨，是
style 不接这类题。

### 2.3 决策/消费型：把「可执行答案」当承诺

- **Deep Research Arena** 的 100 题由 7 种真实提问原型构成：buying dilemma、use-case fit、claim check、
  community vs ratings、value question、durability、evolution/explainer；评分把 **引用可达率** 和
  **陪审团有用性** 分开，arena = reach^1.5 × jury win rate。
  （[Tasks](https://deepresearcharena.com/tasks/)；[Methodology](https://deepresearcharena.com/methodology/)）
- **Perplexity**：第三遍已核的 effort 六级把 model / search config / reasoning steps / system prompt /
  tools 捆成一套，profile 是用户可版本化的整套；它的 promise 更接近「快、广、带引用」，不是「逐 claim
  判定」（[第三遍](2026-11-10-landscape-preference-layer.md) §2.1）。
- **GPT-Researcher / DeerFlow**：`report_type`、`report_source`、`tone`、`report_style` 等枚举，多数只进
  prompt、零强制；它们的 promise 是「可配置」，验收仍靠使用者（[第三遍](2026-11-10-landscape-preference-layer.md)
  §2.5）。

**含义（推断）**：决策/消费型的验收是 **答案直接性、可操作性、time-to-insight、可核验性**（Arena 的
jury rubric），而不是「报告有多全面」。它需要的是取舍、推荐和场景，不是文献综述。

### 2.4 可配置型：把「参数」当承诺，但只强制计数

开源框架把偏好做成 typed 参数（`report_type` / `report_source` / `tone` / `max_iterations` /
`max_concurrent_research_units` / `hard_stop_threshold`），但第三遍的判定仍然成立：**计数被强制，语义
只被提示**；tone、genre、word count、citation style 没有一家在决策点执行，唯一例外是 DeerFlow 2.x 的
token hard stop（[第三遍](2026-11-10-landscape-preference-layer.md) §2.5）。这说明「把 style 做成参数」
本身不够；**没有 acceptance，参数只是愿望**。

### 2.5 跨产品模式（这节最值钱的三条）

1. **产品用「适用/不适用」承认 style 边界**：Kimi 的 not-for 列表、Elicit 的 workflow 选择、Undermind 的
   literature-only，都是明示的 style 合同；西方助手多用「模式」暗示，不写边界。
2. **越大的产品越把 style 藏进产品，而不是设置**：Gemini 的 plan、ChatGPT 的 composer 模式、Claude 的
   Research 开关，都是 per-run 模式，不是可保存的 style 配置。用户能选「研究」，不能选「哪种研究」。
3. **没有一家把 acceptance 做成跨 style 的显式合同**：最多给模板、深度、来源；Elicit 最接近（纳入/
   排除标准、筛选阈值、报告模板），但那是方法参数，不是「这次按什么验收」的开关。这是我们的空白，也是
   我们的风险——如果我们也不写 acceptance，style 就退化成措辞。

## 3. 外部事实 B：评测把 style 写进了目标函数

### 3.1 DeepResearch Bench：报告体裁的主场

- 100 个 PhD 级任务、22 个领域、50 中 50 英；RACE 评 **Comprehensiveness / Insight-Depth /
  Instruction-Following / Readability**；FACT 评 **Citation Accuracy / Effective Citations**。
  （[arXiv 2506.11763](https://arxiv.org/abs/2506.11763)）
- 论文明确说 RACE 的 reference reports 取自 **Gemini-2.5-pro-based Deep Research**（2025-04 收集）。
  （同上 §4.1）
- 这并不等于「Gemini 在所有维度第一」；它说明**这个基准的高质量参照本身就是报告体裁**，而 Gemini DR
  是这种体裁的强样本。学术题（综述、领域地图、方法比较）与这个体裁高度同构；事实题（价格、状态、
  生效日、单点 claim）不同构。

**含义（推断）**：report style 的「学术可以」不是偶然——它的评测函数奖励 comprehensiveness、depth、
readability、citation count；这些正是学术综述的美德。换到事实题，这些美德会变成噪声：覆盖越多，
claim 越容易被稀释。

### 3.2 Deep Research Arena：决策体裁的主场

- 100 题、13 个三源簇（商店 + 论坛 + 冻结百科）、7 种提问原型；truth = reachability^1.5 ×
  (0.35 fact-support + 0.25 proof-of-fetch + 0.30 completeness + 0.10 spec)；Arena 主分 =
  reach^1.5 × Bradley-Terry jury win rate。
  （[Methodology](https://deepresearcharena.com/methodology/)）
- 结果分叉很硬：`ii-researcher` jury Elo 1405（最高一档），但引用可达率只有 16%，Arena 分塌缩；
  `local-deep-research` 可达率 97%，但 jury Elo 815；`smolagents` 可达率 69%、胜率 59.3%。
  （[Insights](https://deepresearcharena.com/insights/)）
- 7 种原型不是学术题，是消费决策题；它奖励的是「答案直接、可操作、可核验」，不是「文献覆盖」。

**含义（推断）**：**jury taste 与 grounding 是两条轴**；流畅的报告可以赢 jury，但输 reach。一个系统如果
用「报告好看」当唯一验收，就会系统性高估 report style；决策题需要另一套 acceptance。

### 3.3 2026 claim-level 证据：report quality ≠ factual support

**《Cited but Not Verified》**（PwC，2026-05）用 Markdown AST 抽 citation-claim 对，重抓每个 URL，
按 Link Works / Relevant Content / Fact Check 三维评 14 个模型、130 个 query（DeepResearch Bench +
BrowseComp）：

| 模型 | Link Works | Relevant | Fact Check |
|---|---:|---:|---:|
| Claude Opus 4.5 | 98.7% | 95.7% | **76.8%** |
| GPT-5.4 | 100.0% | 93.7% | 47.7% |
| Gemini 3.1 Pro | 94.1% | 80.7% | 48.5% |
| Gemini 3 Flash | 94.7% | 82.9% | 45.2% |

- 所有 frontier 模型 Link Works >94%、Relevant >80%，但 Fact Check 只有 **39–77%**；**工作链接 + 相关
  内容** 可以掩盖 **具体 claim 不被支持**。
- 搜索深度消融：tool calls 从 2 → 150，Fact Check 平均降约 **42%**；GPT-5.4 从 78.6% → 16.7%，
  Claude Opus 4.6 从 80.0% → 57.9%；Link Works / Relevant 仍在 92% 以上。
- 引用数量与事实准确率**反向**：OpenAI 模型引用最多，Fact Check 只有 39–59%；Claude Opus 4.5 的
  Fact Check 最高，论文推测「选择性引用」可能比「穷举引用」更有效。
  （[arXiv 2605.06635](https://arxiv.org/abs/2605.06635)）

**《Detecting and Correcting Reference Hallucinations》**（UPenn，2026-04）用 DRBench 53,090 URLs +
ExpertQA 168,021 URLs：

- URL 幻觉率 3–13%，不解析率 5–18%；Deep Research agents 的幻觉率（pooled 10.7%）高于 search-augmented
  LLM（4.8%），尽管前者引用多得多。
- Gemini-2.5-pro-deepresearch：**113.1 URLs/query**、18.5% 不解析、**13.3% 幻觉**；它的 DRBench 报告
  质量分很高。OpenAI deepresearch：41.2 URLs/query、10.1% 不解析、3.5% 幻觉。
- 引用更多不等于每引用更可靠；两者甚至反向。
  （[arXiv 2604.03173](https://arxiv.org/abs/2604.03173)）

**含义（推断）**：
1. **报告体裁的「更多搜索 / 更多引用」不是单调收益**；对 fact-check，搜索越多越容易稀释 claim-level
   准确率。
2. **URL 可点 ≠ claim 被支持**；只做 link-check 的验收会系统性放行错误。
3. **Gemini 的体感有 2026 证据支撑**：报告质量强、claim-level fact-check 中游；这不是「Gemini 不行」，
   是 report style 的隐含验收不测 claim-level support。
4. **连最好的模型也只到 76.8%**：claim-level 正确性不能外包给模型；必须由 acceptance（verdict、quote、
   re-fetch）兜底。这也是为什么本材料把力气放在 gate/profile，而不是「换个模型」。

### 3.4 三条判定

- **判定 1**：外部产品的 style 差异，本质是**评测函数差异**；产品优化什么，就长成什么 style。报告基准
  长报告，消费基准长决策答案，文献基准长综述。
- **判定 2**：**没有一种 style 能同时赢 report quality、claim-level factuality、decision usefulness**；
  2026 数据里这三条轴已经分离，甚至互相拉扯。
- **判定 3**：**style 的验收必须与 promise 对齐**；用报告门验收 fact-check，等于用作文分数录取会计。

## 4. 为什么：研究文化 → 真理等级 → 验收仪式

外部产品的 style 不是凭空设计的；每一种都能在专业研究文化里找到原型。差别不在「用不用 LLM」，在
**真理等级、证据单位、验证仪式、产出体裁**。

| 文化 | 真理在哪 | 证据单位 | 验证仪式 | 产出体裁 | 典型失败 | 外部载体 |
|---|---|---|---|---|---|---|
| **情报分析 / 调查报道** | 一手文件 + 多源互证 + 竞争假设 | claim / event / document | 重抓、source grading、反例、交叉验证 | memo / timeline / investigation | 单源、无置信度、把传闻当事实 | Verification Handbook；调查报道实践 |
| **系统综述 / 循证** | 同行评议语料 | study / paper | PRISMA、纳入排除、偏倚评估、效应量 | review / evidence table | 用全网共识代替文献；漏掉反例 | Elicit、Undermind、Consensus、STORM |
| **咨询 / 投研 / 尽调** | 官方 + 一线 + 数字，三角互证 | company / segment / metric | 单位/日期对齐、红队、反例、敏感性 | report / map / model | 叙事没有数字；地图没有边界 | Kimi、Perplexity、Deep Research Arena |
| **事实核查 / 监管合规** | 一手法律 / 官方记录 / 可复现证据 | article / claim / date | quote、生效日、法域、草案 vs 现行法、双源 | verdict / table | 摘要的摘要；没有生效日；把草案当法律 | IFCN、监管 lens |
| **百科 / 解释** | 二手综合 + 多视角 | concept / perspective | 覆盖、平衡、perspective 生成 | article / explainer | perspective 坍缩；SEO 源；过度关联 | STORM、Wikipedia 式写作 |

**标准锚点（只列读过的）**：

- **IFCN Code of Principles**：同一标准对待每个 fact check；用**最好的 primary source**，没有 primary 才
  用 secondary 并解释；关键 claim 的每个要素要由**多于一个 named source** 核验（除非只有一个相关源）；
  公开方法、资金、更正政策。（[IFCN](https://ifcncodeofprinciples.poynter.org/the-commitments)）
- **PRISMA 2020**：把系统综述的检索、筛选、纳入、偏倚与报告写成可核对的条目，让读者能核对/复算；
  Elicit 的布尔检索与 PRISMA/HTA 对齐就是这个文化的产品化。（[PRISMA](https://www.prisma-statement.org/prisma-2020)；
  [Elicit SR](https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit)）
- **Verification Handbook**：数字内容验证的工作流（来源、时间、地点、人物、动机）；调查报道的
  「verify, don't trust」。（[Verification Handbook](https://datajournalism.com/read/handbook/verification-1)）

**含义（推断）**：产品是这些文化的**融合体**，但融合通常是无意识的：
- Gemini / OpenAI / Anthropic = 「分析报告文化」+「网页搜索」，缺 fact-checker 的 primary-source rule
  和系统综述的 inclusion criteria。
- Elicit / Undermind = 「系统综述文化」+「学术语料」，缺 web/current facts 的时效与官方源。
- Perplexity = 「搜索-引用文化」，缺系统覆盖与 claim 判定。
- STORM = 「百科文化」，缺 verification。
**style mismatch 不是模型能力问题，是文化混用。** 你把 report 文化的 Protocol 拿去跑 fact-check 题，
它就会用「全面、可读、引用多」来交差；这不是它不努力，是它的验收在别处。

## 5. style 空间：三层十四维

把外部产品逐项拆开，可以得到一个 style 空间。不是所有维度都该 typed；但一个 style 卡至少要能说清
这些维度里它选了什么、哪些留给 prose。

| # | 维度 | 两极 / 取值 | 外部例子 | 本仓落点 | 现状 |
|---|---|---|---|---|---|
| 1 | **问题形状** | 事实 / 对比 / 解释 / 评估 / 方案 / 跟踪 | P1–P8；Arena 7 原型 | `question-patterns` | typed（题型） |
| 2 | **真理来源** | web / official / academic / regulatory / practitioner / data / social / user corpus | Elicit 学术；Gemini Workspace+web；Grok X/News | `source_scope` + `method.source` | typed + prose |
| 3 | **证据单位** | URL / quote / claim / paper / dataset / event / article | FACT statement-URL；Elicit quote-per-decision | evidence 八字段 + verdict | 部分 typed |
| 4 | **置信策略** | 二值 / 分级 / 允许 unknown / 展示分歧 | verdict 四态；IFCN 更正 | `verdict` + review | 部分 typed |
| 5 | **时效** | evergreen / current-as-of / live | Undermind 监控；Grok 实时；Elicit 学术 | `source_scope.recency` | typed |
| 6 | **搜索形状** | breadth-first / depth-first / citation chasing / corpus query / monitoring | Anthropic 广后窄；Undermind 追引用 | `method.fields.source` / `lens.seek` | prose |
| 7 | **停止规则** | 预算 / 饱和 / claim-settled / 覆盖完成 / 时间盒 | Undermind 语义停止；LangGraph 迭代上限 | `effort` + skill 散文 | 多为 prose |
| 8 | **来源组合** | 单一 / 混合；权威度；语言/地域 | Gemini Workspace；豆包权威度；Elicit 语料 | `source_scope.families` | typed |
| 9 | **lens 集** | 单面 / 多面配对；覆盖 vs 立场 | STORM perspective；本仓 8 lens | `lens_plan` | typed |
| 10 | **综合形状** | report / answer / table / memo / timeline / map | Kimi 长报告；Elicit review；Arena 决策 | `output.template/sections` | typed |
| 11 | **验证模式** | none / link / quote / claim verdict / re-fetch / human | FACT；IFCN；Elicit quote | `gates` + evidence-audit | 部分 typed |
| 12 | **计划门 / steering** | none / approve / editable；fire-and-forget / mid-run / post-hoc | Gemini 计划门；Elicit Modify Setup | HITL1/HITL2 | 交互 typed，非 per-style |
| 13 | **投入 / 成本** | quick / standard / deep；时间/额度 | Perplexity effort；Elicit 5 档；Kimi 固定 10–25 分 | `effort` | typed |
| 14 | **验收合同** | 报告质量 / claim 判定 / 覆盖 / 决策 / 日期 / 法域 | RACE/FACT；Arena truth；IFCN | `gates`（全局） | **缺 per-style** |

**读法**：

- 前 5 维（1–5）是**认识论合同**：什么算真、什么算证据、允许多大的不确定、要多新。
- 中 6 维（6–11）是**搜索与综合策略**：怎么找、什么时候停、从哪些面找、写成什么、怎么验。
- 后 3 维（12–14）是**交互与验收**：什么时候让人拍板、花多少、按什么判完成。
- 我们 typed 得最好的是 source / lens / effort / output；最弱的是 **6 搜索形状、7 停止规则、3 证据单位、
  4 置信策略、14 验收合同**。这五个不必都做成字段；但 style 卡必须把它们写成可执行的默认与检查，否则
  「style」只剩输出模板。

## 6. 六个 style 原型

下面是六个**可命名、可复用、可验收**的 style。不是穷举；它们是 preference-layer §8 五个倾向的扩展，
每个都能落到现有字段，不需要新轴。新增 style = 新 catalog 条目；只有出现**新的 warrant**（现有验收
profile 覆盖不了）才需要新 gate，不是新 schema。

| style | promise | not_for | method | source | lens | effort | output | acceptance |
|---|---|---|---|---|---|---|---|---|
| **fact_check** | 每个关键 claim 有 primary source + verdict；不知道写不知道 | 探索、预测、方案 | 事实核查 | official / academic，primary，12m | official + adversarial（价目加 quant） | quick/standard | claim table / quick_answer | claim-verdict、quote、re-fetch、no-unverified-pass、source-tier |
| **literature_review** | 覆盖证据谱系、方法/局限/共识/争议 | 当前价格/状态、突发、产品可用性 | 领域地图 / 主张核查 | academic，primary，5y | academic + adversarial | deep | literature_review | inclusion、seminal/recent 覆盖、study quality、citation accuracy |
| **landscape** | 谁在哪、关系如何、边界在哪、截至何时 | 单点事实、无场景选型、因果断言 | 领域地图 | web + official + practitioner | structural + practitioner + historical | standard/deep | full_report | boundary/recency、source diversity、player coverage、explicit gaps |
| **regulatory_compare** | 法域 × 义务主体 × 条文/生效/执法 | 法律意见、非监管题 | 方案比较 | regulatory + official，primary | regulatory + official + adversarial | deep | comparison_table | jurisdiction matrix、article-level、effective date、draft/law/enforcement |
| **timeline_watch** | 事件线 + 当前截点 + 可观察指标 | 静态事实、无时间窗预测 | 时间线与信号 | official + news + archive，3m | historical + official | standard | timeline | date+source、status cutoff、update delta、no prediction-as-fact |
| **decision_memo** | decision + options + criteria + tradeoffs + recommendation | 穷举文献、无场景、纯描述 | 方案比较 | mix（official/practitioner/quant） | quant + practitioner + adversarial | standard | one_page_memo | criteria/alternatives/tradeoffs/recommendation trace/uncertainty |

**v1 的现实边界**：`literature_review` 是**高承诺模式**；现行 `research-brief` 明确「研究证据综合/系统综述
类高承诺模式不在首版，用户提出时如实说明并按普通方法推进」。所以 v1 若用户要学术综述，只能用
`academic` lens + `领域地图` 做「近似综述」，并在承诺里写清「不是 PRISMA 级系统综述、没有双人筛选 /
偏倚评估」。不要用 style 卡把首版说成能做到；style 卡可以写目标态，但 HITL1 的承诺必须与当前能力一致。
其余五个（fact_check / landscape / decision_memo / regulatory_compare / timeline_watch）都可以 v1 用
现有 method + lens + 模板近似，验收先按 prose；`literature_review` 是唯一的高承诺例外。

**一个 style 卡的纸面形态（fact_check）**：

```yaml
style:
  id: fact_check
  version: 1
  promise: "每个关键 claim 有 primary source + verdict；不知道写不知道"
  not_for: [exploratory_landscape, prediction, method_guidance]
  defaults:
    method: 事实核查
    source_scope:
      families: [official, academic]
      authority: primary
      recency: "12m"
    lens_plan: [official, adversarial]
    effort: quick
    output: {template: claim_table, length: {min: 300, max: 900, unit: words}}
    gates: {profile: fact_check, evidence_threshold: A, claim_verification: on}
  acceptance:
    - id: claim-verdict
      check: "每个 critical claim 有 supported/partially/unsupported/unverifiable"
    - id: quote
      check: "每个 verdict 附原文摘录"
    - id: refetch
      check: "source_url 可重抓，且摘录在页面中"
    - id: no-unverified-pass
      check: "仍有 unverifiable → readiness FAIL，不写 PASS"
  failure_modes:
    - "用 report 模板吸收未支持 claim"
    - "用 coverage 数量代替 claim 判定"
    - "搜索越多，fact-check 越差（2026 证据）"
```

注意：`claim_table` 不在现有 `OutputTemplate` 枚举里；这是**新增模板**（catalog 条目），不是新 schema。
如果不想加模板，v1 可用 `comparison_table` + 固定列（claim / verdict / source / quote / date），但别把
「表格」当验收；验收在 `acceptance`。

**纸面跑同一道 P2 题**：

> 「A 云厂商的 G 实例在某区域的当前按需单价是多少？和 B 的同档实例比贵多少？」

| | fact_check style | landscape style |
|---|---|---|
| promise | 可核价的数字 | 市场价位图 |
| source | 官方定价页 + 官方规格页，primary，近 12 月 | web + official + practitioner，近 12 月 |
| lens | official + quant + adversarial | structural + quant + practitioner |
| output | 表：实例 / 区域 / 单价 / 单位 / 日期 / 来源 | 报告：玩家、价位带、标价 vs 实付、口径差异、边界 |
| acceptance | 每格有 URL + 抓取日；无第三方转述；不可比写不可比 | 边界/时效；来源多样性；价位带方法；未覆盖 |
| 失败 | 用「市场均价」填单点；用第三方汇总页 | 用单点官方价代替市场结构；无边界 |
| HITL1 问法 | 「你要一个可核价的数字，还是一张市场价位图？」 | 同左 |

**与题型 / 倾向的映射**（不是替代）：

| style | 主要题型 | 对应 preference-layer 五倾向 |
|---|---|---|
| fact_check | P1 / P2 / P4 | 官方口径核查 |
| literature_review | P3 / P7（学术） | 学术综述 |
| landscape | P3 / P5 | 一线实践全景 |
| regulatory_compare | P5 / P6 | 监管对比 |
| timeline_watch | P8 | 事态时间线 |
| decision_memo | P5 / P6 / P7 | 新增（没有对应倾向） |

**判定**：五个旧倾向不是拍脑袋，它们对应五种真实的 warrant；`decision_memo` 是第六种，外部消费型
benchmark 和「怎么选」题都在要它。**新 style 的扩展点 = style catalog 条目 + 现有 acceptance profile；
只有新 warrant 才加 profile/gate。** 这比「每来一种倾向就加字段」稳，也比「只加输出模板」硬。

**一句话选型（HITL1 用）**：能不能信 → `fact_check`；全不全 / 谁在哪 → `landscape`；学术证据谱系 →
`literature_review`；怎么选 → `decision_memo`；什么时候变的 → `timeline_watch`；合不合法 →
`regulatory_compare`。这是推荐语，不是菜单；用户可以用自己的话改。

## 7. Gemini case：为什么学术可以、事实不行

### 7.1 证据

| 证据 | 数字 / 事实 | 说明 |
|---|---|---|
| DeepResearch Bench | reference reports 取自 Gemini-2.5-pro DR；RACE 奖励 comprehensiveness/depth/instruction-following/readability | 报告体裁的主场；学术题同构 |
| Cited but Not Verified | Gemini 3.1 Pro：Link 94.1 / Relevant 80.7 / **Fact 48.5**；Claude Opus 4.5：98.7 / 95.7 / **76.8** | 链接与相关都高，claim-level support 中游 |
| Reference Hallucinations | Gemini 2.5 Pro DR：113.1 URLs/query、18.5% 不解析、13.3% 幻觉；OpenAI DR：41.2 / 10.1 / 3.5 | 广度/引用量高，per-citation 可靠性低 |
| 搜索深度消融 | 2 → 150 calls，Fact Check 平均 -42%；GPT-5.4 79→17；Claude Opus 4.6 80→58 | 更多搜索不单调；可能信息过载 |
| Deep Research Arena | ii-researcher jury 高/ reach 16%；local-deep-research reach 97%/jury 低 | jury taste ≠ grounding |

> 口径：这些是 **benchmark agent** 的数字，不是 Gemini 消费端产品的直接 A/B；Gemini 3.1 Pro 也不是
> 「Gemini Deep Research 产品」的同义词。方向性证据，不是产品定论。

### 7.2 反推 Gemini 的隐含 Protocol

```yaml
style: report
promise: "全面、可读、带引用的报告"
source: web + Workspace；广
lens: 广度；默认没有 adversarial / claim-level 面
effort: agent 档（Deep Research vs Max）；没有 per-run depth
output: 长报告；URL 级引用
gates: 计划批准；没有 claim-level verification
stopping: 覆盖/迭代，而不是 claim-settled
```

### 7.3 为什么学术可以（推断）

- 学术题常问「已知什么、有哪些争论、用什么方法」；**全面综述 + 多引用**就是合法答案。
- 报告基准奖励 comprehensiveness / depth / instruction-following / readability；Gemini DR 的报告被该
  基准选作 reference，至少说明它被作者视为可用的高质量样本（不等于所有维度第一）。
- 学术 claim 的支持单位常是 paper/abstract，URL 级引用更容易「看起来对」；claim-level 的数字/日期错误
  不会在报告体裁里被抓住。

### 7.4 为什么事实不行（推断）

- 事实题要的是**claim 分解 + primary source + 精确日期/版本 + verdict**；报告体裁倾向于聚合、转述、
  补全，正好增加 misattribution。
- URL 相关 ≠ claim 被支持：2026 数据显示 Link 94 / Relevant 81 / Fact 48.5 的剪刀差。
- 更多搜索 = 更多源、更多转述、更多机会把 A 页的数字安到 B 页；fact-check 准确率随深度下降。
- 没有「unverifiable」纪律：报告可以写得很确定，但关键 claim 没有 verdict。

### 7.5 换 fact_check Protocol 会改什么

- source：official / academic，primary，近 12 月；不用「全网均价」。
- lens：official + adversarial（价目加 quant）；每条关键 claim 专搜反例。
- effort：quick/standard（P1 用 quick，P2 用 standard）；不为了「全面」加节点。
- output：claim table / quick answer；不做长报告。
- gates：claim-verdict、quote、re-fetch、no-unverified-pass、source-tier；没有 verdict 不算 PASS。
- stopping：claim-settled；不是 coverage-complete。
- 结果：同样的模型可能仍不如 Claude 的 fact-check 分，但**style/gate 会把「链接相关但 claim 不支持」
  这种错误显性化**；这比等外部能力升级更可控，也更可审——而且不碰权重。

**判定**：Gemini 的「学术好、事实差」是 **style-task mismatch** 的教科书案例；不是「Gemini 只能做学术」。
换 style 不等于换模型；但换 style 必须换验收，否则只是把报告写短。

**边界（权重不动）**：我们不动 Gemini 的权重，只反制它的 **Protocol 形状**。fact_check style 的收益
来自 source / lens / effort / output / gates，不来自模型；如果试点里收益主要来自「换了一个更强模型」，
那这条线就该停，不该把它包装成 style 的功劳。

## 8. 对偏好层数据模型的含义

### 8.1 style = 命名 Protocol + 验收合同，不是新轴

preference-layer 的结论「搜索倾向 = 命名 Protocol」是对的；本遍补的是 **acceptance**。一个 style 不是
「method + source + lens + effort + output」的随机组合，而是：

```
style = promise + means + acceptance + not_for
```

其中 `means` 解析进现有 Protocol 字段，`acceptance` 解析进 `gates.profile` + style-specific checks，
`promise/not_for` 留在 catalog。**不新增轴，不新增角色，不新增 per-style schema。**

**载体表（全部在权重之上）**：

| style 元素 | 载体 | 本仓落点 |
|---|---|---|
| promise / not_for | catalog prose + HITL1 推荐语 | `content/styles/<id>.md`（v2）/ `research-brief` skill |
| method / source / lens / effort | prompt + catalog 引用 | `protocol.json` / `question-patterns` / `content/lenses/` |
| output | 模板 | `content/templates/run/` |
| acceptance | gate + review | `scripts/run-gates/` + `review.md` 表 |
| interaction | `ask_user_question` + persona | HITL1 / HITL2 |

这张表也是边界：**没有一项需要改权重、训练、换模型或新增 host 插件。**

### 8.2 Catalog 增量（数据，不是 schema）

建议在 v2 的 Library/Catalog 里加一类 `style` 条目（不是 method 条目）：

```yaml
style:
  id: fact_check
  version: 1
  promise: "..."
  not_for: [...]
  defaults: {method, source_scope, lens_plan, effort, output, gates}
  acceptance_profile: fact_check
  search_policy: "breadth-first | depth-first | citation-chasing | ..."
  evidence_policy: "claim unit / primary-source rule / quote / triangulation / disagreement"
  synthesis_policy: "report | answer | table | memo | timeline | map; recommendation allowed?"
  failure_modes: [...]
```

- `defaults` 是 typed 引用，解析进 Protocol；`defaults.gates` 只放 profile 选择与阈值，真正的验收检查在
  `acceptance`/profile。
- `acceptance_profile` 是 gate profile id；v2 先做 2 个（fact_check、literature_review），其余复用或后补。
- `search_policy` / `evidence_policy` / `synthesis_policy` 是 **prose**，给 Lead 和 critic 读；不要为了
  「全 typed」把它们拆成字段。它们是判断，不是计数。
- `promise/not_for/failure_modes` 是用户可读的合同；HITL1 可以用一句话说清「这次承诺什么、不承诺什么」。

### 8.3 Protocol 增量（v2，最小）

```yaml
protocol:
  style_ref: {id: fact_check, version: 1}   # 可选；v1 用 question.md 的 prose 标签
  gates:
    profile: fact_check                     # 出厂 policy 选；用户不能关
```

- `style_ref` 是**指针**，不是新轴；Protocol 仍然存解析后的 method/source/lens/effort/output/gates。
- `gates.profile` 选择验收套件；`gates` 的其余字段保留，作为 profile 的覆盖/细化。
- `deviations` 增加 `authority: style`，记录「style 默认 vs 本次覆盖」。
- v1 不改 schema：style 只作为 `question.md` 的一句标签 + skill 的选择依据；等试点后再上 `style_ref`。

### 8.4 与题型 / lens / method 的关系

- **题型**决定答案形状（P1 一个值、P2 一张表、P3 一张地图、P8 一条时间线）；**style** 决定 warrant 和
  验收；**lens** 决定覆盖面；**method** 决定 procedure。
- style 选默认；题型/lens/用户可以在 style 内覆盖；每次覆盖记 deviation。
- **同一题型可以有两种 style**（P2 价目：fact_check vs landscape）；**同一 style 可以服务多个题型**
  （fact_check 服务 P1/P2/P4）。这是 style 不是题型的证据。
- style 不替代 P1–P8；P1–P8 是「答案长什么样」，style 是「凭什么算答案」。

### 8.5 Gate profiles：验收按 style 选

| profile | 检查 | 复用 | 新增 |
|---|---|---|---|
| **fact_check** | 每个 critical claim 有 verdict；quote；re-fetch；source-tier；no-unverified-pass | evidence-audit、verdict-audit、review coverage | claim coverage（critical claim 清单） |
| **literature_review** | inclusion criteria；seminal/recent 覆盖；study quality；citation accuracy | coverage、evidence-audit | study-quality rubric、citation accuracy |
| **landscape** | boundary/recency；source diversity；player coverage；explicit gaps | coverage、source_scope 字段 | boundary check、source-diversity check |
| **regulatory_compare** | jurisdiction matrix；article-level；effective date；draft/law/enforcement | coverage、source_scope 字段 | jurisdiction/date checks |
| **timeline_watch** | date+source per node；status cutoff；update delta；no prediction-as-fact | coverage、historical lens 模板 | date/source check |
| **decision_memo** | criteria/alternatives/tradeoffs/recommendation trace/uncertainty | output-contract（v2） | decision rubric |

**判定**：不要一次上六个 profile。v2 先做 **fact_check + literature_review** 两个，因为它们与 2026 证据
最贴、与现有 evidence/verdict 门最近；landscape/regulatory/timeline/decision 先用 prose + 现有 coverage，
试点后再加。**gate profile 是「验收合同」，不是「更多门」；每个 profile 只加 1–3 个与 promise 直接相关
的检查。**

### 8.6 不要做什么

- **不要加第五个角色**：style 是数据，不是人；不需要 Style Editor。
- **不要新增 host 插件/工具**：style catalog 是 content/workspace 数据；gate profile 是 run-gate 脚本；
  HITL1 仍是 `ask_user_question`。没有 loop 改动。
- **不要加新轴**：style 是命名 Protocol 模板，不是与题型/lens 并列的第五轴。
- **不要 per-style schema**：同一个 Protocol schema，不同 profile；否则每来一种 style 就改合同。
- **不要加更多前置问题**：HITL1 已经三问；style 选择应该用「推荐 + 一句确认」，叠在第一问里，**不新增
  交互点**，不是菜单。
- **不要把 style 做成 tone/persona**：tone 只进 prompt，零强制；style 必须带 acceptance。
- **不要用一套报告门验收所有 style**：这是 Gemini case 的根因。
- **不要让用户关掉批准门**：style 可以选验收强度，不能关 HITL/批准门。
- **不要搬回旧 harness 的全部数值 floor**：只搬「与 promise 直接相关的验收」，不搬「每波 ≥N 源」。

### 8.7 v1 / v2 / 不做

**v1（现在，零 schema 改动）**：

1. 把六个 style 卡写进研究材料 + 工作区说明层（不进 pack 合同）；HITL1 用「你要哪种承诺」一句话选择，
   **叠在第一问里，不新增交互点**。
2. `question.md` 加一行 `style:`（prose 标签），不进 Protocol schema；Lead 按 style 选 method/source/lens/
   effort/output。
3. critic 按 style 的 `acceptance` 做语义审查（不新增 gate）。
4. 3 场试点：同一题跑 fact_check vs landscape；记录用户是否能复述承诺、修订次数、critic 是否能按
   acceptance 判。

**v2（试点后）**：

1. `content/styles/<id>.md` catalog + `style_ref` + `gates.profile`。
2. `protocol-audit` 增加 profile 选择与 2 个 profile（fact_check、literature_review）。
3. 3–5 场试点：P1/P2 fact_check、P3 academic、P5 landscape；记录 gate 红项、误伤、HITL1 时长。
4. 若 profile 误伤高：先 warning，不 hard fail（同 output-contract 的教训）。

**不做**：

- style 选择 UI / 完整 run profile；
- per-style 模型；
- 自动 style 推断模型（先用题型 + 用户一句话）；
- 旧 harness 的数值 floor 全量回搬；
- 把 style 做成第五个角色或第五个轴。

### 8.8 候选第 7 个结构选择

preference-layer §11 有六个结构选择；本遍建议加一个候选（不替它拍板）：

> **style 归 Library/Catalog，Protocol 只存 `style_ref` + 解析值；验收 profile 由出厂 policy 选，用户不能关。**
> 推荐理由：style 是跨 run 可复用的承诺，不是 per-run 的临时字段；acceptance 是出厂质量合同，不能作为
> 用户偏好关掉。代价：多一个 catalog 对象 + 一个 gate profile 选择点；v1 可以先 prose，v2 再落。

## 9. 什么会改变结论

1. **外部产品开始暴露 style 选择 + 验收**（例如「fact check mode」带 claim verdict）：style 从差异化变成
   table stakes，我们的优势转到执行/审计。
2. **评测从报告质量转向 claim-level truth**：report style 的评测补贴消失，Gemini 类产品会被迫换验收；
   我们的 fact_check profile 从「可选」变「必须」。
3. **模型在 claim-level 上不再需要选择性引用**（更多搜索不再降低 fact-check）：§3.3 的「少即是多」推论
   减弱，fact_check style 的 effort 可以放大。
4. **用户研究显示 style 标签增加 HITL1 负担**：退回 3 个 style（fact_check / literature_review /
   landscape），decision/timeline/regulatory 作为 output 变体。
5. **试点显示 gate profile 误伤高**：先 warning；只保留 claim-verdict 与 coverage 两条，其余归 critic。
6. **旧 harness 的 floor 在试点中证明必要**：按 style 加回少量 floor（例如 fact_check 的 primary-source
   比例），但不恢复「每波 ≥N 源」。
7. **外部模型能力提升（不由我们控制）抹平事实差距**：style 仍然影响输出/交互，但「换 style 提事实」的
   收益变小；我们的卖点转向可审与覆盖，而不是赌模型升级。

## 10. 未覆盖

- **消费端帮助页**：Perplexity / Gemini / OpenAI 的消费者文档仍有 403/DNS/JS 挡；本遍用 API 文档、
  system card、benchmark agent 作代理，**不把 benchmark agent 等同产品**。
- **Gemini 3.1 Pro / Claude Opus 4.5 等数字**：来自 2026 论文的 benchmark 配置，不是消费端 A/B；只能
  当方向性证据。
- **没有用户研究**：六个 style 是本材料的构造，不是用户验证过的分类；HITL1 的「一句话选择」需要试点。
- **没有测我们的 gate profile**：§8.5 是纸面设计；误伤率、红项噪声、HITL1 时长都待试点。
- **中国产品**：Kimi 本遍新读；Qwen/Metaso/豆包/元宝/智谱沿用第三遍，未重读。
- **Deep Research Arena**：独立 benchmark，非同行评审；方法透明但样本是消费题，外推到学术/监管要谨慎。
- **研究文化**：IFCN/PRISMA/Verification Handbook 是读过的标准；情报/咨询/尽调是实践归纳，不是单一
  标准，不能写成「行业标准要求」。
- **「学术好、事实差」**：用户体感 + benchmark 代理 + 2026 论文，三者方向一致；但没有对 Gemini 产品做
  同题换 style 的对照实验。

## 11. 来源

**本遍新读（外部）**

- DeepResearch Bench: https://arxiv.org/abs/2506.11763
- Cited but Not Verified: https://arxiv.org/abs/2605.06635
- Detecting and Correcting Reference Hallucinations: https://arxiv.org/abs/2604.03173
- Deep Research Arena: https://deepresearcharena.com/ · https://deepresearcharena.com/methodology/ ·
  https://deepresearcharena.com/insights/ · https://deepresearcharena.com/tasks/
- Kimi Deep Research: https://www.kimi.ai/zh-hant/help/deep-research/deep-research-overview
- Elicit Systematic Reviews: https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit
- Undermind MCP: https://www.undermind.ai/mcp
- Anthropic multi-agent research: https://www.anthropic.com/engineering/multi-agent-research-system
- OpenAI Deep Research System Card: https://deploymentsafety.openai.com/deep-research
- IFCN Code of Principles: https://ifcncodeofprinciples.poynter.org/the-commitments
- PRISMA 2020: https://www.prisma-statement.org/prisma-2020
- Verification Handbook: https://datajournalism.com/read/handbook/verification-1

**回指（第一至第三遍已核，本遍不重复摘录）**

- 产品/偏好：[第一遍](2026-11-10-landscape-first-pass.md) · [第二遍](2026-11-10-landscape-second-pass.md) ·
  [第三遍·偏好层](2026-11-10-landscape-preference-layer.md)
- Gemini 计划门 / Workspace 来源 / 2026 collaborative planning：第三遍 §2.4；第一遍 §2
- Perplexity effort/profile/skills：第三遍 §2.1
- STORM perspective 消融：第二遍 §2
- GPT-Researcher / DeerFlow / LangGraph 参数与强制：第三遍 §2.5
- 本仓偏好层：[preference-layer](../../_archived/research/preference-layer/README.md) 与
  [数据模型](../../_archived/research/preference-layer/2026-11-10-preference-protocol-data-model.md)
- 旧 harness 的 `research_profile` / `research_style_params`：
  [考古报告](../../../notes/archived/2026-09-24-deep-research-harness-analysis.md)；
  弃用数值 floor 的映射：[30-methodology-mapping](../../../docs/design/30-methodology-mapping.md)
