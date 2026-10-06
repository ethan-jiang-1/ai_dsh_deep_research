# 计划确认闸门（plan-review gate）——HITL1 两段卡

> 状态：proposed

出处 = 推敲卡 [2026-10-07-plan-review-gate](../../_backlog/_done/_closed_plans/2026-10-07-plan-review-gate.md)
（借鉴 ai_deerflow_dr_v3 已落地机制；2026-10-07 用户点名「推进落地」提前激活——毕业门触发②）。
判断材料全文住卡；本 RFC 只载问题/方案/输掉的方案/验收。

## 问题

HITL1 现状只对齐**抽象参数**（三问：研究类型/深度篇幅/口径语言）；三问答完 lead 即定稿
question.md + topics.md——这两份文件就是**具体研究计划**（问题定稿 + RQ 分解 +
Scope/Constraints + topic 图）——并直接开工。用户开工前从未见过具体化方向，第一次见到 =
v1 交付（HITL2）。已记账有界风险（hitl2 范围轮卡）：方向性跑偏要等 v1 交付才被用户
看见——整场 run 的跑偏成本在烧掉之后才暴露。源仓（ai_deerflow_dr_v3，对标 Gemini
Deep Research）已用计划确认闸门补同形缺口并真梯验证：对齐载体 = 一份具体可读的计划，
比抽象问答省用户脑力；用户在烧钱之前手握编辑权。

## 方案

HITL1 升级为**两段卡**——同一交互点内，两点交互合同字面保持（hitl2 范围轮 A 形态同款
裁定，交互点计数不变）：

1. **第一段（不变）**：三问结构化卡（研究类型/深度篇幅/口径语言，推荐置首）——判型
   模式库对照、澄清纪律照旧；
2. **第二段（新增）**：lead 定稿 question.md + topics.md 后、组队/侦察开工前，发
   **计划确认瘦卡**：
   - 卡面 ≤200 字（HITL2 卡同纪律）：计划要点（问题定稿一句话 + topic 图骨干 +
     深度/口径拍板）+「全文 = question.md / topics.md」指针；
   - options 三路：按计划开跑（Recommended）/ 修订计划（自由文本意见，**附加**进
     计划不替换）/ 放弃（不开跑，bundle 处置照开跑前 sibling 预检规矩）；
   - **一轮制**：修订意见由 lead 落 §Decisions（用户原话 verbatim）后直接开工，
     不再二次确认；意见推翻类型/深度级 → 走放弃重开，不在卡上循环；
   - 拍板落 question.md §Decisions 第 1 条（HITL1 定稿行含计划确认）+ HITL1
     Alignment Snapshot 节增「计划确认」字段；
3. **边界**：quick_factual 豁免（类型字段判——编制条件性同源）；rerun/补研究路径
   不动（范围锁定已有家 = §Decisions 行）；闸门只住节点 1；判型路径不动（确认卡在
   判型/三问之后）；
4. **诚实降级**：lead 跳卡直接开工不硬拦——journal 立项行记账缺席（判型痕同款
   记账位）；机械化（§Decisions 确认拍板行进 node-gate 断言）后置，先看试点场次
   lead 遵守率再定（floor 教训：先标定后立门）；
5. **载体差异（对源仓两处结构性不搬，判断正本 = 推敲卡已知节）**：不新建计划文件
   （question.md 已是方向契约的家）；不需要文本标记触发（ask_user_question 工具
   调用即信号——源仓 `<research-plan>` 标记修的是引擎分相误触发，本仓无此物种；
   继承的教训 = 闸门触发判据须机械无歧义，本仓形态天然满足）。

触面六件（模型可见面 + 操作面）：research-brief skill（确认步）/ 研究手册 §交互纪律 /
templates/run/question.md（Snapshot 增行）/ NODES 行 1 + 两点交互边界节（描述同步，
不动节点 I/O 形状）/ running-a-research-run §2 / guides/61 §2。

## 输掉的方案

- **独立计划文件**（源仓 request/plan-gen1.md 形态）：源仓计划住 chat 线程需物化新
  文件；本仓 question.md = 方向契约 = bundle 身份核心已持久——另立 = 一处事实两个家；
- **第五 planner 角色 / 独立计划节点**：源仓同款否决（bounded role 重启）+
  synthesizer-role 否决先例；research-brief 已是 lead 的立项技能；
- **B3 标记反馈协议**（[rejected Note](../rejected/2026-10-06-hitl-feedback-protocol.md)）：
  物种 = 自由文本反馈的机器路由面；本卡 = 结构化卡调用点，无路由面——B3 否决理由
  恰证本卡不需标记协议；
- **二次确认循环**（修订后再呈再确认）：防交互循环——一轮制，源仓「修订意见附加」
  同款取舍；
- **机械门禁先行**（§Decisions 确认行直接进 node-gate）：未标定先上门 = 假牙齿
  （floor 教训）——纪律级先行，遵守率标定后再议升格（changing-node-topology 程序）。

## 验收判据（每条绑定检查方式）

1. **触面六件文本在场**——对账命令：六面特征短语 grep（research-brief「计划确认」步、
   手册 §交互纪律两段卡语义、模板 Snapshot「计划确认」行、NODES 行 1 与两点交互
   边界节、running-a-research-run、guides/61 §2），收尾实录附命令与输出；
2. **L0 全绿**——机械门禁：`pnpm verify` + `pnpm test`（含 pack-workspace-fresh
   种子同步、overlay-fresh 渲染）；
3. **L1 真挂载绿**——机械：`DSH_SMOKE_REAL=1 node scripts/preset-smoke.mjs`
   （render-overlay 先于 L1）；
4. **模型可见面行为**——机械（真模型档）：`node scripts/l4-lite-smoke.mjs` ALL PASS；
   密钥缺席 = 如实记「未跑」不判失败（guides/60「未运行项如实分开」纪律）；
5. **纪律行为面**——机械（真模型档）：discipline-probe 增第五场景「计划确认」
   （立项定稿后 lead 依 research-brief 发计划确认卡再开工——标记断言），**先红后绿**：
   纪律文本未落时跑 = 红（模型无此纪律可依），落后复跑 = 绿；密钥缺席同上如实挂账；
6. **run 试点正证**——人工/行为判据（**挂账**）：随下一场标准研究型 run——计划确认卡
   真发、真答、§Decisions/journal 记账齐、用户过烦与否（否定判据 = 卡被秒拍且事后
   从不修正 → 维持三问现状，结论回写推敲卡邻域）；未触发 = 休眠如实记录不判失败
   （living-verification 同款）。

## 实施记录

- S1（2026-10-07）：卡毕业（触发②用户点名）+ 本 RFC + queue ▶ 可自主行落位；
  触面实施未动——下一步 = 触面①起逐面落（红→绿循环）。
