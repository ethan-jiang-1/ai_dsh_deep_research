---
topic: 外部 landscape 第一遍：多智能体深度研究的收敛与空白
intent: 用可核来源盘点 2025–2026 生产系统、研究产品与开源框架的编排/方法/验证做法，回答「哪些已是 table stakes、哪些仍稀缺、我们哪些老思路该停」。
---

# 外部 landscape 第一遍：别人已经走到哪（2026-11-10）

> 性质：来源综述 + 推断，不是决定。每条结论带 URL；厂商自报数字标「厂商自报」。
> 纳入 = 官方工程博客 / 系统卡 / 源码仓库 / 论文；排除 = 营销页、二手解读、搜索摘要；窗口 = 2025-01 至 2026-11-10。
> 覆盖：Anthropic / OpenAI / Gemini、Elicit / Undermind、GPT-Researcher / DeerFlow。
> 未覆盖（第二遍补）：STORM/Co-STORM、LangGraph `open_deep_research`、DeepResearch Bench 等评测。
> 抓取失败：Perplexity、You.com、Consensus 官方页被 403/非公网 IP 挡住；OpenAI 主站 403。
> 这些产品本遍计零条，不用搜索摘要冒充正文。

## 0. 先回答「有多少人借鉴」

把「做法」而不是「产品」当计数单位，第一遍能数出四档：

| 做法 | 见到的独立系统 | 计数 | 判定 |
|---|---|---|---|
| planner/orchestrator → workers → reporter 三段 | Anthropic、Gemini、GPT-Researcher、DeerFlow | 4 | **table stakes** |
| 花钱前有人工确认/可编辑的门 | Gemini、DeerFlow、GPT-Researcher、Elicit（Setup 参数块，不是计划） | 4 | **table stakes** |
| 数值化 effort / depth 档 + 成本可见 | Elicit（5 档滑杆）、Anthropic（3–10/10–15/10+ 调用预算）、Gemini（speed vs depth 两档） | 3 | **table stakes** |
| 按角色/槽位分配模型档 | GPT-Researcher（STRATEGIC/SMART/FAST）、Anthropic（Opus lead + Sonnet workers）、DeerFlow（`AGENT_LLM_MAP`） | 3 | **table stakes** |
| 计划/步骤是**类型化数据**而非散文 | DeerFlow（`step_type`）、Google Interactions API（typed steps 取代 roles）、Gemini（collaborative planning 状态位） | 3 | **正在收敛** |
| 派发 brief 有固定字段（目标/输出格式/工具源/边界/预算） | Anthropic（明文四字段 + 数值预算） | 1 | **差异化** |
| 每个自动决定带原文引文（quote-per-decision） | Elicit（系统综述逐条给 quote + 可覆盖 + 审计） | 1 | **差异化** |
| 逐 claim 的验证工件（claim→source→verdict） | 无一家在生产文档里公开 | 0 | **空白** |
| HITL 决定是类型化对象（accept/edit/reject） | Gemini（显式 flag 的状态迁移）；DeerFlow 反而用字符串前缀匹配失败 | 1 | **空白/早期** |
| 角色 prompt 真的改变结果 | Anthropic 2026 自己的实验：prescriptive roles「没带来多少差别」 | 0（负结果） | **警告** |
| 语义停止条件（新搜索不再命中才停）+ 跑后监控 | Undermind | 1 | **差异化** |
| 中途 steering / 异步 wave | Anthropic 自己列为未解瓶颈 | 0 | **空白** |
| 独立双人复核 + 一致性统计 | Elicit Enterprise（Cohen's kappa、冲突裁决视图） | 1 | **差异化** |

这张表的用法不是「别人有我们也要有」，而是：**前四行没有就不算 2026 年的产品；后四行有才是差异化。四角色本身不在表里——因为它不是机制。**

## 1. Anthropic：orchestrator-worker，数字很硬，角色很软

**事实（工程博客，2025）**

- 生产 Research 功能 = lead agent（Opus 4）+ 并行 subagents（Sonnet 4）；内部 research eval 比单 agent Opus 4 高 **90.2%**。
- 代价：multi-agent 约 **15×** chat token；BrowseComp 上 token 使用量单独解释 **80%** 的方差（三个因子合计 95%）。原话：multi-agent 起作用「mainly because they help spend enough tokens」。
- lead 把 plan 写进 Memory，因为上下文超过 **200k** 会被截断；最后有一个 **CitationAgent** 专门做引用定位。
- 并行把复杂查询时间最多砍 **90%**；但 lead 是**同步**等每一批 subagent，官方把它列为架构主要瓶颈：lead 不能中途 steer、subagent 之间不能协调、一个慢 worker 卡住整层。
- 派发 brief 的四件：objective、output format、tools/sources、task boundaries；再加数值预算（简单 1 agent/3–10 calls；对比 2–4 agents/10–15 calls；复杂 10+ agents）。短 brief「研究半导体短缺」实测导致两个 agent 重复 2025 供应链、一个跑去做 2021 汽车芯片。
- 评测：约 **20 条**真实 query；rubric 含 factual accuracy / citation accuracy / completeness / source quality / tool efficiency；单个 LLM judge 比多 judge 稳；人工发现早期 agent 偏爱 SEO 内容农场，才补上 source-quality 维度。

**2026 的反转（Anthropic 自己的多智能体研究）**

- 在 12 小时造游戏的 swarm 里，baseline / prescriptive roles / CEO hierarchy 三种 prompt「没有带来多少差别」。
- hidden-profile 任务（私有信息必须战胜表面共识）上，群体准确率远低于单 agent 上限；原因是 agent「低方差」——一个做错，很多个会同样做错；还出现三个 agent 拿到互相矛盾的迁移目标后的地盘战。
- 另一篇 2026 文章明确说：harness 编码的是「模型现在做不到什么」的假设，会过期；Sonnet 4.5 的 context anxiety 让他们加了 context reset，Opus 4.5 上这个 reset 又变成死重。方向是「fold subagents into your main agent loop」、更少 subagent + 渐进披露。

**对我们的含义（推断）**

- 角色分工的收益主要是 **token 预算 + 并行**，不是「名字分工」。我们的四角色如果只是 persona 形容词不同，按 Anthropic 的负结果，收益接近零。
- 真正该抄的是 **brief 四字段 + 数值预算**，以及 **plan 落文件**（我们已经有 `plan.md`，这是对的）。
- 同步 wave 屏障不是缺陷，Anthropic 也这么 ship；但必须**声明**（慢节点卡住哪一层要看得见），不要把它宣传成异步编排。

## 2. OpenAI 与 Gemini：一个说「不要 pipeline」，一个说「不要 roles」

**OpenAI（系统卡）**

- Deep Research 不是手写 stage/role pipeline，而是**一个 RL 训练过的浏览模型**（o3 早期版）：搜索、点击、滚动、读文件、Python 沙箱、综合，全在模型里学。
- 2025-07 的 ChatGPT agent 把 deep research 与 Operator 合成**一个** agentic model：浏览器 + 终端 + connectors。
- HITL 被当成**可测门**：确认动作 recall 91.0%，关键动作 100/99.9/100%；敏感场景 Watch Mode 在用户不活跃时自动暂停。
- 引用只在红队文字里做**比较级**描述（「比前代更准」），公开材料没有逐引用验证评测。

**Gemini（官方博客 + 2026 cookbook）**

- 文档化循环：question → **multi-step plan（可改/可批）** → 批准后迭代搜索（「找到有意思的信息，再基于它发起新搜索」，多轮）→ 带链接的报告。
- 2026 API 把批准做成**显式状态位**：`collaborative_planning=True` 返回计划；最终必须显式翻成 `False`，只说「go ahead」不会触发报告。
- 2026 Interactions API 明确「**From Roles to Steps**」：每个动作（user_input / thought / function_call / model_output）是 typed step，取代旧 role 结构；Deep Research 暴露 speed vs depth 两个版本、单任务可查 100+ 来源。

**对我们的含义（推断）**

- 基线不是「没有我们所以不行」，而是**一个工具齐全的 agent + 浏览器 + shell**。多角色/wave 必须证明自己在这个基线之上多买到「广度或抓错率 / 每 token」。
- 计划门要建模成**状态**（proposed → approved），不是 Lead 从自由文本里猜「用户是不是同意了」。
- 观察面/回放/gate 应 key 在 **step 与 artifact**，不要 key 在角色身份上——Google 已经把 roles 从 schema 里删了。

## 3. 研究产品：mode、effort、pre-run 参数块

**Elicit（官方帮助中心，2026-11 抓取）**

- 三个入口 + 写明「什么时候用哪个」：Research Agent / Research Report / Systematic Review；2026-09-30 把 Find Papers、Extract Data、Chat with Papers 收成**一个 agent 的 skills**——「每个任务一个工具入口」没活下来。
- 深度是 **5 档滑杆**（Fastest/Fast/Balanced/Smart/Smartest），明确说每档改变「读多少源、跟多深的线索、自检多少」，并在 popover 显示相对 Balanced 的用量倍数；每个新会话回到计划默认档。
- Systematic Review 把方法做成 **pre-run 参数块**：语义 vs 布尔检索（PRISMA/HTA 用布尔）、摘要筛选与全文筛选可各自 Fast/Thorough、纳入阈值可后调；**每个自动决定带原文 quote**；企业版有冲突裁决视图 + 审计轨迹 + 一致性统计（Cohen's kappa）。
- 报告模式仍有模板（General Review / 1-Page / Gap Analysis）× 深度两轴；所有中间步骤可编辑、有版本选择器、可导出 CSV（含筛选理由与 quote）。

**Undermind（官方 MCP 文档 + 首页，厂商自报）**

- deep search 的停止条件是**语义的**：「新搜索不再找到相关论文才停」；跑完还继续监控新论文（`list_deep_search_updates`）。
- 自报 benchmark：23 个 research goal、10 分钟 recall 73% vs 通用 agent 29–39%（厂商自跑、未同行评审）。

**对我们的含义（推断）**

- **模板（输出形状）与深度（花多少工）是两根轴**，不要熔成一个「模式」。我们的题型 P1–P8 更像模板轴，缺的是可声明的 effort 轴。
- 方法应该落成**跑前参数块**，让 critic 跑完能逐项回读；这比「persona 里写一段方法」可审计得多。
- quote-per-decision 是最低证据单位；我们 evidence 卡的「原文摘录/解读分开」已经是这个方向，但还没做到「每个决定都能指回一句原文」。

## 4. 开源：角色是槽位，计划是类型

**GPT-Researcher**

- 默认是 planner → execution agents（并行）→ publisher 三段；「角色」是**能力槽位**（STRATEGIC/SMART/FAST 三个模型档），不是独立进程。
- `report_type` 7 值、`report_source` 7 值、`tone` 17 值（每个带描述），加一个自由文本 `custom_prompt` 逃生口——**类型化枚举 + 散文覆盖**两层。
- 多智能体版是 8 个角色的 LangGraph：Chief Editor / Researcher / Editor / Reviewer / Revisor / Writer / Publisher + Human；Reviewer→Revisor 是**按 section 的有界内环**；HITL 是 `include_human_feedback` 一个布尔。
- 2026 官方文档自己把这张图改成 **deep agents harness + 一个 Researcher subagent**，并说「harness 提供了 LangGraph 示例手工实现的编排」；自报 DeepResearch Bench（10 题、gpt-5.4、只换 research tool）：RACE 0.503→0.512、每报告可验证引用 18.6→35.2（+89%）、引用精度 53.9%→56.0%、零可验证引用报告 2/10→0/10。归因是**被委派的工具真的抓取并验证**，不是拓扑。

**DeerFlow 1.x**

- 计划是 schema：`steps[].step_type`（RESEARCH/ANALYSIS/PROCESSING）、`need_search`、`has_enough_context`；router 是**故意很笨**的「找第一个未执行 step → 派给 researcher/analyst/coder → 回 router」，**一次只跑一个 step**（没有并行）。
- HITL 用 LangGraph `interrupt()`，但判定是 `startswith("[ACCEPTED]")` / `startswith("[EDIT_PLAN]")`；README 教用户写 `[EDIT PLAN]`（空格），代码要下划线——**类型化意图退化成字符串前缀匹配，失败还会被静默当成 edit 重规划**。
- 角色是 `AGENT_LLM_MAP` 的 key + prompt：能换模型档，不能换工具面或 wave；podcast/PPT/prose writer 也是角色（输出形态 = 多一个 agent）。
- 2026-02 直接 2.0 重写，「shares no code with v1」，改成 sub-agent/skills harness。

**对我们的含义（推断）**

- 角色名是最不稳定的层：GPT-Researcher 从 8 角色改成 2 agent + subagent；DeerFlow 从 9 角色改成 harness。**我们的 lead/scout/analyst/critic 也会被重写**；能活下来的是 typed step、brief 契约、证据工件、模型/effort 映射。
- typed plan step 是 wave 最好的朋友：`kind` 已经在 plan 里，下一步是让它**驱动执行**（像 DeerFlow 的 router），而不是只做展示。
- HITL 决定必须是 typed object（accept / edit-with-patch / reject），不能靠字符串。

## 5. 最不客气的五条

1. **四角色不是护城河。** Anthropic 2026 的负结果 + 两家开源的重写都指向：role prompt 本身几乎不产生差异；差异来自上下文、工具、模型、以及被明确分配的**不同输入/视角**。
2. **Wave 的同步屏障是已命名瓶颈**，不是我们的独家缺陷；保留它、声明它，别把它包装成异步能力。
3. **我们的 method-library 四字段 ≈ Elicit 的 pre-run 参数块，但还不是类型化数据**；真正的差异化在「每决定一句原文 + 逐 claim verdict」。
4. **workflow vs team 是运输方式，不是研究方法。** Anthropic 2026 说「fold subagents into main loop」、GPT-Researcher 说「harness + subagent + 一个真干活的 research tool」——拓扑的重要性低于「跨委派边界交回来的东西是否可验证」。
5. **critic 是我们唯一可能真正差异化的位置**：claim→source 验证工件、typed HITL、独立上下文。但前提是它产出**可复核的 verdict**，不是又一篇 prose。

## 6. 第二遍已补

STORM/Co-STORM、LangGraph `open_deep_research`、lens 参数化、self-critique 与 citation 评测已落
[2026-11-10-landscape-second-pass.md](2026-11-10-landscape-second-pass.md)；本遍的三处判断在其中被修正（引用精度、perspective、
角色 prompt 负结果）。Perplexity / You.com / Consensus 仍被挡，未计。

## 7. 来源

- Anthropic multi-agent research: https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic 2026 multiagent systems: https://www.anthropic.com/research/multiagent-systems
- Anthropic managed agents / harness assumptions: https://www.anthropic.com/engineering/managed-agents
- OpenAI Deep Research system card: https://deploymentsafety.openai.com/deep-research
- ChatGPT agent system card: https://deploymentsafety.openai.com/chatgpt-agent/introduction
- ChatGPT agent risk mitigations: https://deploymentsafety.openai.com/chatgpt-agent/agent-makes-a-mistake
- Gemini Deep Research (blog): https://blog.google/products-and-platforms/products/gemini/google-gemini-deep-research/
- Gemini Deep Research cookbook: https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Get_started_Deep_Research.ipynb
- Google Interactions API GA: https://blog.google/innovation-and-ai/technology/developers-tools/interactions-api-general-availability/
- Elicit getting started: https://support.elicit.com/en/articles/14757543-getting-started-with-elicit-which-workflow-should-i-use
- Elicit systematic reviews: https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit
- Elicit research report: https://support.elicit.com/en/articles/14756862-get-a-research-report-to-generate-in-depth-answers-automatically-in-elicit
- Undermind MCP: https://www.undermind.ai/mcp
- GPT-Researcher README: https://raw.githubusercontent.com/assafelovic/gpt-researcher/master/README.md
- GPT-Researcher config: https://docs.gptr.dev/docs/gpt-researcher/gptr/config
- GPT-Researcher enums: https://raw.githubusercontent.com/assafelovic/gpt-researcher/master/gpt_researcher/utils/enum.py
- GPT-Researcher LangGraph: https://docs.gptr.dev/docs/gpt-researcher/multi_agents/langgraph
- GPT-Researcher deep agents: https://docs.gptr.dev/docs/gpt-researcher/multi_agents/deepagents
- DeerFlow builder: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/src/graph/builder.py
- DeerFlow nodes: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/src/graph/nodes.py
- DeerFlow config: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/docs/configuration_guide.md
- DeerFlow 2.0 README: https://raw.githubusercontent.com/bytedance/deer-flow/main/README.md
