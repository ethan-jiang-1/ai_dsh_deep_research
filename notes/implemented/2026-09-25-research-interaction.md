# RFC：研究交互设计（DSH 界面交互 × 研究生命周期）

> 状态：implemented

归宿：roadmap §队列「研究交互设计」（feature；用户 2026-09-25 点名："我们之所以用 DSH，还有
一个优点是它有很好的界面交互，适合我们这个项目的界面交互……我们需要啊"）。

## 问题

DSH 的界面交互能力是选它的核心理由之一，但本项目只用了一小条（「研究状态」观察页签）。
研究生命周期的**交互时刻**——立项问询、中途决策、审阅拍板、交付——从未作为 GUI 体验被
设计过；首场 run 的 HITL1/2 是代理模拟，**问题卡的真实呈现从未被验证**。现状：HITL2 审阅
建议是纯文本消息（用户要读长文才能拍板，无结构化选项）。

## 交互时刻 × DSH 能力映射（契约已核）

| 研究时刻 | DSH 现成能力（vendor 出处） | 现状 → 目标 |
|---|---|---|
| HITL1 三问（类型/深度/口径） | `ask_user_question`：**questions 数组一次多问** + `options`（推荐项 = 首选项 + `"(Recommended)"` 后缀）+ `multiSelect`（packages/interaction/tool-ask-user）；GUI 呈现为会话问题卡 + user-questions 面板 | persona 已要求"带推荐再问"但**未塑形为规范卡**（一次三问、每问选项化）→ S1 |
| 中途决策（run 中需要用户拍板） | 同上 | 未定义 → 随 HITL1 同款 |
| HITL2 审阅（交付 or 补研究） | `ask_user_question` 选项化 + `present` | **纯文本消息** → S1 改为结构化选项卡 |
| 交付 | `present` 工具 → ui-deliverables 官方卡 | 已用（首场 run present 声明当前版 ✓）→ 验证即可 |
| 观察流 | 「研究状态」页签（已交付：journal 流 + 活标题） | ✓ |
| 研究语义工具卡 | `tool.call.toolview` 槽（company TeamToolCard 先例） | 无 → S2 |

## 决定

研究生命周期的交互时刻全部落到 DSH **现成交互面**（零自建面板）：HITL1/2 用
ask_user_question 的结构化选项卡（一次多问 + options + 推荐位），工具卡用 toolview 槽的
研究语义卡，交付用 present 官方卡。

## 实施记录（S0–S3）

- **S0 契约研究**：ask_user_question 全参数契约（questions 数组：id/question/header/
  options{label,description}/multi_select；推荐项 = 首选项 + label 尾 "(Recommended)"）；
  company toolview 范本三要点（一键一 inject——rc.2 旧写法不生效；priority -1 压通用行——
  同键同优先级 throw；展示模型 = call/result 切片的纯函数）。
- **S1 HITL 卡片塑形**：lead persona 的 HITL1 改**一次调用携带三问**（全局硬格式规则行
  置前：推荐选项放首位且 label 逐字以（Recommended）结尾，三问无一例外）；HITL2 改结构化
  选项卡（审阅摘要前置 + 定稿(Recommended)/补研究/修订表述）。真模型实测**三轮迭代**：
  一次多问 + 全 options 化首轮即中；推荐位两轮加强后 PASS。**坑**：persona 指令用全角
  （Recommended），验证正则须宽匹配 [（(]Recommended[)）]——半角正则假阴性。
- **S2 工具卡**：`src/lib/tool-card.ts` 纯函数（company 同款移植）+
  `ResearchToolCard.tsx` 薄渲染（spawn_teammate = 组队成员职责卡 / web_search = 检索词卡）
  + 一键一 inject priority -1。rc.2 argsRaw 契约实证（PreparingToolCall 无 argsRaw 须
  收窄后读）。
- **S3 文档同步**：手册交互纪律节 + guides/61 HITL1 卡片形态。

## 实际跑过的验证

| 面 | 结果 |
|---|---|
| L4-lite（新 persona） | ALL PASS（四角色 + scout web_search） |
| HITL1 卡片真模型实测 | **PASS**：一次调用 3 问、每问 options 化、推荐位齐（盘侧断言 questions 结构） |
| client-load-smoke | ALL PASS（含工具卡注册后页签渲染 326 事件） |
| **HITL2 选项卡实测**（2026-09-25 马拉松三号补验） | **PASS**：审阅摘要前置 + 三选项齐（按现稿定稿（Recommended）/补研究/修订表述）——真模型实测，答题环节代理模拟标注 |
| L0 | 25 门禁 + 43 tests 全绿 |

## 方案（四 Stage，原计划存档）

- **S0 交互面研究留档**：各契约 vendor 出处 + company 先例记进本 RFC 实施记录（研究稿
  `ui-observability-surfaces` 补交互节或独立段落——产出是记录不是新文档层）；
- **S1 HITL 卡片塑形（persona 文本改造，模型可见面）**：
  - lead persona 的 HITL1 指令改为：**一次 `ask_user_question` 调用携带三问**，每问
    `options` 化、推荐项置首并带 `"(Recommended)"`；研究问题本身的澄清允许自由文本；
  - HITL2 审阅改为 `ask_user_question`：选项 = 按现稿定稿（推荐）/ 补研究（指明 gap）/ 修订
    表述；审阅摘要（证据充分性判断）作为问题上下文前置；
  - 模型可见变更纪律：同 diff 跑 L4-lite 全绿取证；
- **S2 研究语义工具卡（client 面，C 选项落地）**：`tool.call.toolview` 注册 2–3 张卡——
  `spawn_teammate`（成员名 + 职责一句话）、`web_search`（query + 命中摘要）、`team_task_*`
  （任务流转）——纯函数展示模型 + 薄渲染（company TeamToolCard 同款），keyless 断言进
  client-load-smoke；
- **S3 验证收口**：真模型档一次 ask 卡实测（脚本代理答题并标注"代理模拟"）；client-hitl-smoke
  的浏览器观察点若随侧栏语义破解则升级为断言；真人 HITL 的最终体验验收归「研究类型覆盖」。

## 输掉的方案

- **自建审批/问询面板**：否决——`user-questions` 面板与问题卡是现成的（plugins not loop
  changes；自建即重复 DSH 载体）；
- **HITL2 维持纯文本消息**：否决——无结构化选项 = 用户要读长文才能拍板，违背"界面交互
  适合本项目"的选型理由；
- **全部工具卡都做**：否决——只做研究语义最有价值的几张（spawn/web_search/task），
  present 已有官方卡；
- **改 ask_user_question 工具本身**：否决——vendor 只读铁律；卡片体验由**调用塑形**
  （options/推荐位）决定，不改机制。

## 验收

- S1：persona 改动后 L4-lite ALL PASS；真模型档实测 HITL1 三问渲染为**一次调用三张选项卡**
  （盘侧日志断言 questions 结构 + options 带推荐位）；
- S2：工具卡在真浏览器渲染（client-load-smoke 扩断言）；
- 文档：研究手册/guides/61 的 HITL 描述与新卡片形态同步；
- 不破坏：L0 门禁/tests 全绿；vendor 零改动。
