---
topic: 研究方法配置的外部产品先例
intent: 为研究配置（方法库）UX 推敲卡提供外部产品做法与验证边界：谁把"怎么研究"做成可编辑物、做成什么形状、谁明确拒绝做。
---

# 研究方法配置：外部产品先例

> 服务卡 = [研究配置（方法库）UX 推敲](../settled_issues/2026-10-18-research-method-config-ux.md)。
> 抓取日 2026-10-18。**证据分级逐条标注**：**主会话亲读** = 本会话 `web_fetch` 成功并读过正文；
> **代理回报** = 子代理亲读并回报原文，主会话**未复核原文**；**取不到** = 网络边界阻断，不用来
> 支撑任何结论。未标注分级的段落一律视为推断，不是证据。

## 1. 通用深度研究产品：方法基本不可配

### 1.1 Microsoft Copilot Researcher（主会话亲读）

来源：[Researcher FAQ](https://learn.microsoft.com/en-us/microsoft-365/copilot/faq-researcher)（页面自称 Last updated 2026-08-18）。三句决定性原话：

> "Can we restrict which websites or web content the Researcher agent can pull information from (aside from disabling web search entirely)? **No. There isn't a granular setting** to block or allow specific websites. The only admin control over web content is the global web search toggle."

> "Can we customize or extend the Researcher agent's behavior (for example, by using Copilot Studio to add our own prompts or connect it to additional data)? **No - not at this time.** … you can't modify Researcher's predefined logic or content."

> "Can report length or detail be controlled in Researcher-generated reports? **To be released soon.**"

另：memory = "To be released soon"；25 queries/用户/月；模型与模式可挑；检索范围 work / web / both 由用户选。

**读出**：旗舰企业级研究 agent 的方法论旋钮实际只有一个（范围三选一）；它明确拒绝做站点白名单，因为它做不到——**"配置面 ⊆ 执行面"的外部先例**。

### 1.2 Microsoft Learn 上手页（代理回报，未复核原文）

来源：<https://learn.microsoft.com/en-us/microsoft-365/copilot/researcher-agent>。代理回报三个杠杆：prompt 要具体 / 定义检索范围（workplace·web·both）/ **engage with clarifying questions**（原话 "This phase is important to help you steer the research…"）。

**读出**：厂商把"澄清问卡"明说成配置的替代品。

### 1.3 Anthropic Claude Research（主会话亲读）

来源：[Use research on Claude](https://support.claude.com/en/articles/11088861-use-research-on-claude)（页面自称 Updated this week）。

- 配置 = 一个开关：`Click the "+" button … then "Research." A blue indicator will appear`。无计划审批、无方法、无保存的指令。
- 模型不可选：`Research runs on Claude Opus 5.5 and falls back to Claude Opus 4.8 when needed. It uses these models no matter which model you've selected for your chat.`
- **已发布的静默降级**：`When you start research in Claude Mobile, Claude only searches the web and doesn't use your connectors. **You won't see an error or other sign that your connectors were skipped.**`
- 引导用户改用对话绕：`you can steer and prompt Claude to use Research by saying "Claude, please use the research tool to…"`。

**读出**：这是"实际方法与配置方法不一致、且无任何信号"的**已发布反面教材**——面板要做的正是它的反面。

### 1.4 OpenAI / Gemini / Perplexity / Grok / NotebookLM（取不到）

`openai.com`·`help.openai.com` = Cloudflare 403；`support.google.com`·`perplexity.ai`·`x.ai` 连接失败（主会话与子代理两路同结果）；notebooklm / you.com / scite.ai 未取到。**这些产品的当前形态不用于支撑任何结论**——与仓内 [2026-10-11 高管 UX 调研](2026-10-11-executive-research-ux/index.md)的受阻记录一致（那轮三次请求均被网络策略阻断）。子代理另报 OpenAI 近期方向（source controls / live steering / editable deliverables）与 Grok 把深研方法写成可读 workflow 脚本（`deep_research.rhai`）均为二手标题/片段级，**不采信**。

## 2. 垂直产品：配置的单位是"可复用的作业"

### 2.1 Hebbia Projects（主会话亲读）

来源：<https://www.hebbia.com/blog/introducing-projects>（2026-04-21）。

> **Govern projects with instructions.** Define your Project's **scope, terminology, default integrations, and thesis** into instructions that govern the rest of your workflow. Instructions inject context into every Chat automatically, so the analysis starts from the project's baseline, not from a blank prompt.

> Deliver client-ready documents **in your format** … **match your firm's templates**.

**读出**：配置粒度 = 项目/工作区；内容 = 范围 + **术语** + 默认数据源 + 交付模板。逐项对我们四字段：范围→不承诺（有）、默认数据源→找来源（有）、**术语→缺**、**交付模板→缺**（报告骨架唯一）。

### 2.2 AlphaSense SuperAnalyst（主会话亲读）

来源：[Getting Started with SuperAnalyst](https://help.alpha-sense.com/hc/en-us/articles/53909448564243-Getting-Started-with-SuperAnalyst)（2026-09-29 更新）。

- 三构件 **Task / Skill / Artifact**；`**Skill** — A Task you've saved to reuse. **Configure it once, then run it again** on a new company without rewriting the instructions.`
- 自定义 Skill 五入口：从零自然语言 / 上传文档或模板 / **跑完一个 workflow 后自动生成** / Skill Builder 向导 / 基于预置改。
- 判据句：`if what repeats is a **question**, that's a Workflow Agent. If what repeats is an **assignment with a deliverable**, that's a Skill.`
- Artifact 多形态（memo / model / comp table / slide deck / dashboard / watchlist）；可上传自家 deck 当模板。

**读出**：①"定制入口阶梯"已有市场验证，五入口与我们提的三条同构；②"重复的是问题 → 题面库；重复的是带交付物的作业 → 方法库"正好对应本仓 `question-patterns.md` ↔ `method-library.md` 的分工。

### 2.3 Elicit Systematic Review（代理回报，未复核原文）

来源：<https://elicit.com/blog/systematic-review>（2025-02-20）。代理回报要点：AI 建议筛选标准与抽取字段、**任意时刻可编辑/覆盖/手输**、逐篇筛选分歧可人工覆盖、**每条抽取数据强制附支撑引文**，以及一个方法论旋钮——"额外并入至多 500 篇语义检索结果，以确认传统检索没有漏"。

**读出**：最接近本仓"研究偏好"模型的已发布先例；强制支撑引文 = 把证据标准显式化到产出点。

### 2.4 Tavily Research API（代理回报，未复核原文）

来源：<https://docs.tavily.com/documentation/api-reference/endpoint/research>。代理回报 `POST /research` 参数含 `input` / `model` / `stream` / **`output_schema`**（描述结果对象的 JSON Schema），另有异步状态查询与流式。

**读出**：**产出形态与调查方法在 API 面是可分开设定的两个参数**——支持把"报告怎么写"从"找来源/怎么核实"里独立出来。

## 3. 一条用户抱怨（代理回报，搜索索引片段级，未读原文）

Reddit 帖 `1kllqxq` 开头："I got kinda pissed that Deep Research would always ask me clarifying questions no matter what…"。子代理只拿到索引片段，无上下文、无票数，**不足以作为结论**；方向上与本仓 HITL 纪律一致：澄清必须可跳过。**偏好库的一个真实价值 = 让行家预先免掉盘问。**

## 4. 三条结论（供消费卡引用）

1. **配置面 ⊆ 执行面**：Microsoft 拒绝站点白名单（做不到就不做），垂直玩家只开真能执行的项。→ 不提供"来源数下限 / 检索轮数上限"这类无执行面的旋钮。
2. **配置的单位是作业，不是语气**：Hebbia 项目指令 = 范围 + 术语 + 数据源 + 模板；AlphaSense Skill = 可复用作业 + 五条入口。→ 我们缺"术语/口径"与"交付工件"两块内容，以及"跑完自动沉淀"入口。
3. **生效态必须显式**：Claude 手机端静默丢连接器且无信号，是已发布的反面教材。→ 面板需要"已发送 / Lead 已回话 / 已落盘"三态。

## 5. 分行业方法差异草案（**设计材料，非已核实事实**）

> 用途：给消费卡的「领域包」设计当内容参考，让 review 时看得到"不同行业到底哪不一样"。
> **依据分级**：`仓内已复核` = 本仓已归档材料中亲读或 HTTP 取得全文的一手来源；`领域常识（待核）`
> = 先验知识，**本轮与仓内均未核实**。**逐行核实前，本表不进任何模型面文件。**

| 场景 | 一手源（具体） | 口径陷阱 | 检验与冲突裁决 | 工件 | 不承诺 | 依据 |
|---|---|---|---|---|---|---|
| 投研·尽调 | 招股书／年报／交易所公告／监管备案／工商登记（渠道点名与警示见 §7） | 财年 vs 自然年；GAAP vs non-GAAP；一次性项（SBC 单列须软化）；即期汇率与近似汇率 | **交叉印证**（三表勾稽＋第三方函证＋独立来源复核；"三方对账"无权威出处，已改名）＋客户与供应商集中度＋职业怀疑（"证伪优先"降级为本工具纪律） | IC memo（论点／关键假设／反证／敏感性——**本工具模板，无监管文本**） | 不构成投资建议、不给目标价 | **已核实**（2026-10-18 外部核实轮，逐格判决与一手 URL 见 §7） |
| 医药·临床 | PubMed、Cochrane、临床指南、FDA/NMPA/EMA 批件、ClinicalTrials.gov 注册记录 | 适应症／剂量／终点／人群／线数；预印本 vs 已发表 | 研究设计分级；利益冲突；发表偏倚；**质量评价是否适用依研究目的** | PICO 证据表 ＋ 不确定度 | 不做诊疗建议、不替代说明书 | **仓内已复核**：Cochrane Ch.4 检索规划、JBI 问题框定与 critical appraisal（[2026-10-12 研究依据](2026-10-12-research-preferences.md)） |
| 学术·文献综述 | Web of Science／Scopus／arXiv／PubMed ＋ 前后向引文追踪 | 纳入排除标准、时间窗、语言、研究类型 | 检索式留痕（可复现）、去重、筛选记录 | 文献矩阵 ＋ 研究空白 | 不宣称 systematic review | **仓内已复核**：PRISMA-S／PRISMA-ScR 是报告指引与可复核检索材料，不是质量认证（同上） |
| 专利／IP | CNIPA／USPTO／EPO 公开文本、权利要求、同族、法律状态 | 申请日 vs 公开日 vs 优先权日；法律状态；权利要求范围 vs 说明书 | 权利要求逐条比对；FTO 属法律判断，我们只做事实梳理 | 权利要求对比表 ＋ 权利人地图 | 不出具侵权／FTO 法律意见 | 领域常识（待核） |
| 法规·合规 | 法规原文、官方解读、生效日、征求意见稿 | 生效日／过渡期／适用范围（主体·地域·业务）／罚则 | 条款逐条引用；区分「征求意见稿」与「生效」 | 差距分析表（现状／要求／待办） | 不构成法律意见 | 领域常识（待核） |
| 采购·选型 | 官方定价页、文档、状态页、SLA、SOC2／ISO 页 | 计费单位（credits／请求／token）、阶梯价、含税、汇率 | 同维度对照；厂商宣称与实测分开；未公开项显式列「未公开」 | 评分矩阵 ＋ 适用情境 | 不替用户定权重 | 领域常识（待核） |
| 竞争格局 | 官方定价／文档／changelog、招聘、应用商店、财报、专利 | 版本／币种／用量单位、抓取日期 | 每实体一条可核源；同域口径不一致并列 | 分档地图 ＋ 竞争轴 ＋ 计费矩阵 | 不做绝对排名 | **本仓实证**：用户库条目「格局调研」（源自 `drt_cn-ai-coding-assistants`） |
| 事态·时间线 | changelog／release notes／官方公告为骨，媒体为肉 | 起点事件；时间戳；「现状」的截止时刻 | **先列指标与信号，再判趋势**；趋势与事实分句 | 时间线 ＋ 现状截点 ＋ 指标读数 | 不做无时间窗预测 | **仓内已复核**：CIA Tradecraft Primer 的 Indicators or Signposts of Change（[HITL1 调研](../../../research-workspace/drafts/2026-09-29-hitl1-intake-routing-survey.md) §3） |

**共同读出**：行业差异最吃紧的两处是 **时间窗规则**（追新：竞争情报／定价；反追新：专利／法规——早的反而更致命）与 **证据标准**（分级 vs 两源 vs 一手备案 vs 约束力区分）；而 **冲突裁决** 与 **"什么算完成"** 这两处一句话说不清，也最需要落进偏好条目。

## 6. 未复核与未决（不要越用）

- 本文 §1.2、§2.3、§2.4、§3 为**代理回报**，主会话未复核原文；引用前须重新取回原文（产品页面漂移快，Microsoft 页自称 2026-08 更新，Claude 页自称本周更新）。
- 子代理另交一份"分行业方法论表"（含 PRISMA 27 项 / GRADE / Admiralty A–F·1–6 / ICD 203 / FAR Part 15 / ATT&CK 等），其正文**自述全部未经核实**——本文与消费卡**均不采信**。分行业依据以仓内已复核材料为准：[2026-10-12-research-preferences](2026-10-12-research-preferences.md) §外部先例（Cochrane Ch.4 / JBI / PRISMA-S·ScR，前轮研究代理只读 HTTP 取得全文）与 [HITL1 接收·判型·澄清调研](../../../research-workspace/drafts/2026-09-29-hitl1-intake-routing-survey.md)（CIA Tradecraft / ClariQ / Rose & Levinson，亲读一手）。
- **未查**：各产品"保存的指令"之间的优先级语义（账号级 < 项目级 < 本次 < 用户当场明确要求）。这是本设计的核心未决问题之一，**当前零证据**。

## 7. 投研·尽调行的核实记录（2026-10-18 外部核实轮）

**用途**：§5 该行的每一格逐条核实，产出可引用的一手 URL ＋ 逐字引语；核实后的「可发布形态」四字段
已落进 research-brief skill 的「领域示范」节（面板只读示范位的正本）。

**逐格判决**：一手源 = 可核（须点名渠道）；财年/自然年 = 可核；GAAP/non-GAAP = 可核（正确表述 =
"量化调节表 ＋ 与最可比 GAAP 等量或更显著 ＋ 不得误导"）；一次性项 = 可核，**SBC 单列须软化**
（SEC 对 SBC 的专门立场原文取不到，不写"SEC 禁止剔除股权激励"）；汇率 = 可核（规范用语是"交易发生日
／资产负债表日即期汇率 ＋ 近似汇率须披露确定方法"，"取数日"不是规范用语）；**"三方对账" = 需改名**
（无权威出处 → 交叉印证：三表勾稽 ＋ 第三方函证 ＋ 独立来源复核）；集中度 = 可核（披露与尽调必查项）；
**"证伪优先" = 降级为本工具纪律**（权威只支持职业怀疑与"不得只挑有利项"）；**IC memo 四要素 = 降级为
本工具模板**（无任何可引用的监管或准则文本）；不承诺 = 自我边界声明，无需外部核实。

**可引一手来源（逐一实测抓取）**：
- 港股：<https://en-rules.hkex.com.hk/sites/default/files/net_file_store/Guide_for_New_Listing_Applicants_(November_2023)_(clean_version).pdf>（Guide 3.1 合理查询 / 3.7 前五大客户与供应商、集中度与对手方风险 / 3.11 non-GAAP 定义与"不得只挑有利项"）
- 美国规则正文（eCFR 官方 API，versioner 2025-01-01）：<https://www.ecfr.gov/current/title-17/chapter-II/part-244>（Reg G §244.100）、<https://www.ecfr.gov/current/title-17/chapter-II/part-229>（Reg S-K Item 10(e)/101(c)(1)(i)/101(h)(4)(vi)/305(a)(1)(ii)(A)）、<https://www.ecfr.gov/current/title-17/chapter-II/part-240/section-240.13a-10>（改财年过渡期报告）
- 中国：<https://www.gov.cn/gongbao/content/2021/content_5605111.htm>（证券法 2021 施行，第八条/第十二条）、<https://www.csrc.gov.cn/csrc/c101954/c7121950/content.shtml>（格式准则第57号公告）、<https://www.samr.gov.cn:9090/xyjgs/flfg/art/2024/art_be55c2e3a54a43e5ab12794c9dc87600.html>（企业信息公示暂行条例 2024 修订；**第六条＋第九条：资产总额/营业收入等由企业选择是否公示——不能当财务底稿**）、<http://www.npc.gov.cn/zgrdw/npc/flsyywd/flwd/2002-04/16/content_291930.htm>（会计年度＝公历年度）、<http://kjs.mof.gov.cn/zt/kjzzss/kuaijizhunzeshishi/200806/t20080618_46229.htm>（企业会计准则第19号 外币折算 第十至十二条）、<https://www.csrc.gov.cn/csrc/c101802/c1004905/content.shtml>（非经常性损益〔2008〕43号）
- 审计与伦理：<https://www.frc.org.uk/documents/8824/ISA_UK_505_Revised_October_2023_Updated_October_2025.pdf>（外部函证定义与"A15 口头答复不构成外部函证"）、FRC 职业判断指引（2022-06，职业怀疑定义）、CFA Standard V(A)（合理充分的依据）

**未取到（一律未作证据引用）**：sec.gov / investor.gov（403 限流）、pcaobus.org（Cloudflare 403）、
ifrs.org（订阅墙）、iosco.org PDF（403）、web.archive.org（不可达）、csrc.gov.cn 规则正文附件与
沪深交易所公告 PDF（WAF 拦成 HTML）、香港《上市规则》条文原文（en-rules 为 JS 应用）、
《会计法》条文原文（SPA/API 取不到，改用中国人大网释义页）。**处置**：需要这些原文时换环境补测；
在此之前只引上列已实测页面，或引公告号与生效日。
