# B3：HITL1 结构化反馈协议（deer-flow [ACCEPTED]/[EDIT_PLAN]）——不采纳

> 状态：rejected

> **重启条件**：DSH 的 HITL 面出现机械路由/脚本化答案处理（需要程序判读用户反馈、而非 LLM
> 阅读理解）时重提；此前本条为**不做的决定**，不是待办。

出处 = oss-dr 已结卡 B 档 B3（[2026-10-06-oss-dr-lessons](../../_backlog/_archived/settled_issues/2026-10-06-oss-dr-lessons.md)）；
2026-10-06 定调会话用户委托判断（原话要点："你对我们项目很熟悉，你帮着判断判断"），判定依据 =
载体差异分析，非用户逐条拍板。

## 原方案

借 deer-flow 1.x `human_feedback_node` 协议给 HITL1 加结构化反馈语义：显式接受/修改标记
（`[ACCEPTED]` / `[EDIT_PLAN]`）+ 未识别输入默认打回重规划——防自由文本反馈被误读或静默吞掉。

## 否决理由

**物种不存在**：deer-flow 的标记协议解决的是"自由文本反馈的机器识别"——它的 HITL 是 chat
interrupt，用户输入任意文本，路由逻辑需要可靠地把反馈分到 accept/revise 分支。本仓 HITL 走
DSH `ask_user_question`——**结构化选项卡**（推荐项置首带 Recommended、点选提交、自由文本仅作
补充），接受/修改语义内嵌在选项本身；自由文本部分（如 custom 答案）由 lead 作为 LLM 阅读理解，
**没有机械路由面，也就没有"未识别输入"这个物种**。辅证两条：HITL1 永不重开（D17）已封死
修订循环的上限语义；答案不可解时重问 = 既有"澄清只三问"纪律覆盖（30-mapping §5 retry 上限族）。

## 复活条件

见头部引言块——无当前触发迹象（DSH ask_user_question 形态稳定）。
