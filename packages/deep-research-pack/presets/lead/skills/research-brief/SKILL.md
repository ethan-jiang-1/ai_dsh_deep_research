---
name: research-brief
description: 立项对齐（HITL1）方法论：判型模式库对照、研究类型判定（三分法兜底）、澄清问题清单、question.md 与 topics.md 的定稿格式、计划确认卡（第二段）
---

# research-brief — 立项对齐（HITL1，两段卡）

一次 Deep Research run 的第一动作。目标：把用户的一句话变成**可验收的研究问题**，再拆成可分派的 topic 图；两文件定稿后先呈用户拍板再开工。

## 流程

1. **先查判型模式库**（`question-patterns.md`，会话 cwd 根）：通读各条目"识别特征"，对照
   题面找**命中条目**。命中 → 该条目就是本次立项的操作单：类型问卡选项与推荐、深度、
   topic 骨架、花名册按其"分派结论"填；动笔前过一遍其"陷阱"；其"困惑信号"命中几个，
   就把对应"澄清问法"作为**第四问叠加**。**无论命中与否**，都在 `drt_<slug>/journal.md`
   的立项行落判型痕：命中标 `判型命中=P<#>`；未命中标
   `判型未命中：<题面特征一句话>；兜底=<三分法哪类/怎么派>`（库的增长与效用计数原料，
   见库尾增长协议——不写库本体），未命中时下一步用三分法兜底 + 模型自身能力。
2. **判定研究类型**（给用户推荐，不让用户裸选；未命中模式库时的兜底）：
   - `quick_factual`：单一事实/数字/状态 → 通常 1 个 topic，跳过组队，subagent 直接查；
   - `exploratory_map`：领域全景/现状梳理 → scout+analyst 全流程，topic 按子领域拆；
   - `claim_verification`：验证一个说法/断言 → topic 按主张-反主张拆，反例搜索权重最高。
3. **澄清三件事**（用 ask_user_question，每件带推荐）：
   - 研究类型（类型问卡按第 1 步命中条目或三分法拟定，附你判断的理由）；
   - 深度与篇幅（快答 / 标准报告 / 深度报告——推荐依据 = 预期检索往返：快答 = 1–2 次
     往返可答；标准 = 多源交叉的复杂学习；深度 = 长周期穷尽研究）；
   - 口径（时间范围、语言、地域、排除项）。

   澄清纪律：用户已提供的信息不再问；一次问全（结构化选项卡，不挤牙膏）；定稿进
   question.md 时未确认的维度显式标 open，**禁止脑补补全**。
4. **定稿 question.md**：模板 `templates/run/question.md`。
5. **拆 topics.md**：模板 `templates/run/topics.md`。每个 topic 必须有：
   - `must_answer`：一句话，验收时能判"答了/没答"；
   - `scope_role`：`primary`（报告主体）/ `synthesis`（跨 topic 综合）/ `comparison`（对比）/ `supporting`（背景）。
   - topic 数量 = 研究类型 × 篇幅：quick ≤1，standard 2–4，deep 4–8。
6. **计划确认卡**（HITL1 第二段；**quick_factual 免发**——类型为快速事实核查时跳过本步直接开工）：两文件定稿后、组队/侦察开工前，把计划呈用户拍板——`ask_user_question` 瘦卡：
   - 问题正文 ≤200 字：计划要点（问题定稿一句话 + topic 图骨干 + 深度/口径拍板）+「全文 = question.md / topics.md」指针；
   - options 三路：按计划开跑（Recommended）/ 修订计划（自由文本意见，**附加**进计划不替换）/ 放弃（不开跑，bundle 处置照 sibling 预检规矩）；
   - **一轮制**：修订意见由你逐字落 question.md §Decisions（用户原话 verbatim）后直接开工，不再二次呈卡；意见推翻类型/深度级 → 走放弃重开，不在卡上循环；
   - 拍板（含选择与修订意见）落 question.md §Decisions 第 1 条 + HITL1 Alignment Snapshot 的「计划确认」字段；
   - 用户不在场由代理模拟并显式标注"代理模拟"；跳卡直接开工 = 诚实降级不硬拦，但 journal 立项行记「计划确认卡缺席」。

## 判据

- question.md 写完时，一个不了解上下文的读者能复述"这次研究要回答什么"；
- 每个 topic 的 must_answer 无歧义（没有"大概/相关/等等"）；
- 澄清动作发生过且有记录（写进 question.md 的 HITL1 Alignment Snapshot 节）——没有澄清的立项是返工之源；
- 计划确认卡发生过且拍板落 §Decisions（quick_factual 除外）——开工前用户已见过具体计划；缺席 = journal 立项行记账。

## 反模式

- 不查模式库直接拍类型（库命中时弃用条目 = 丢掉沉淀的思考路径与陷阱清单）；
- 一次问超过三件事（用户疲劳，随便答；困惑问只叠命中信号的，有几问叠几问、没有就不加）；
- topic 拆成关键词而不是问题（"芯片制程" ❌ → "国产 AI 芯片当前制程能力与代差是多少" ✓）；
- 把 scope_role 全标 primary（没有主次的报告没有结构）；
- 定稿即开工、跳过计划确认卡（quick_factual 除外）——用户第一次见到具体方向就变成 v1 交付，跑偏成本在烧掉之后才暴露。
