# 计划确认闸门（plan-review gate）——HITL1 两段卡

> 状态：implemented

出处 = 推敲卡 [2026-10-07-plan-review-gate](../../_backlog/_archived/settled_issues/2026-10-07-plan-review-gate.md)
（借鉴 ai_deerflow_dr_v3 已落地机制——对标 Gemini Deep Research 的跑前计划确认，双 change
真梯验证在案；2026-10-07 用户点名「推进落地」提前激活毕业门触发②，判断材料全文住卡）。

## 决定

HITL1 从固定三问升级为**两段卡**——两点交互合同字面保持（两段卡在同一个交互点内，计数
不变；hitl2 范围轮卡 A 形态同款裁定；与 2026-09-28「交互集中在 HITL2」初步裁决不冲突——
该裁决针对补研究细节住哪，本机制是跑前范围合同，辨析正本住卡）：

1. 第一段不变：三问结构化卡（研究类型/深度篇幅/口径语言，推荐置首）；
2. 第二段**计划确认卡**：question.md + topics.md 定稿后、组队/侦察开工前发——≤200 字
   计划要点瘦卡（问题定稿一句话 + topic 图骨干 + 深度/口径拍板）+「全文 = question.md /
   topics.md」指针；options = 按计划开跑（Recommended）/ 修订计划（自由文本意见**附加**
   不替换）/ 放弃（不开跑，bundle 处置照 sibling 预检规矩）；
3. **一轮制**：修订意见逐字落 §Decisions 后直接开工，不再二次呈卡；意见推翻类型/深度级
   → 走放弃重开，不在卡上循环；
4. 拍板落 question.md §Decisions 第 1 条 + HITL1 Alignment Snapshot「计划确认」行；
5. **quick_factual 豁免**（类型字段判——编制条件性同源）；rerun/补研究路径不动（范围锁定
   已有家 = §Decisions 行）；闸门只住节点 1；判型路径不动（确认卡在判型/三问之后）；
6. **诚实降级**：lead 跳卡直接开工不硬拦，journal 立项行记「计划确认卡缺席」（判型痕同款
   记账位）；机械化（§Decisions 确认行进 node-gate 断言）后置——先标定后立门，试点场次
   lead 遵守率决定是否升格（升格走 changing-node-topology 程序）；
7. 对源仓两处结构性不搬：不新建计划文件（question.md 已是方向契约的家，源仓计划住 chat
   线程才需物化 plan-gen1.md）；不需要文本标记触发（ask_user_question 工具调用即信号
   ——源仓 `<research-plan>` 标记修的是引擎分相误触发，本仓无此物种；继承的教训 =
   闸门触发判据须机械无歧义，本仓形态天然满足）。

落面九件（RFC 预登记六件 + 实施期扩面三件，如实记账）：lead persona 立项段（行为最强钉
——persona 持有 HITL1 硬格式规则，BUG-006 跳卡修复同款钉法；ask 硬约束改「HITL1 三问与
计划确认卡、HITL2 通用」）· research-brief skill 第 6 步（操作面正本：瘦卡规格/一轮制/
豁免/降级记账 + 判据 + 反模式「定稿即开工」）· 研究手册 §交互纪律（跨角色合同句，细则
下放 skill）· 模板 question.md Snapshot「计划确认」行 · NODES 行 1 与两点交互边界节 ·
running-a-research-run §2 · guides/61 §2 · pack README「研究怎么跑」· design/30 HITL1
映射行。种子同步（sync-pack-workspace）与 overlay 重渲染随同 diff。

## 输掉的方案

- **独立计划文件**（源仓 request/plan-gen1.md 形态）：本仓计划已有家（question.md = 方向
  契约 = bundle 身份核心，跨 rerun 持久）——另立 = 一处事实两个家；
- **第五 planner 角色 / 独立计划节点**：源仓同款否决（bounded role 重启代价大）+
  [synthesizer-role 否决](../rejected/2026-09-24-synthesizer-role.md) 先例（lead 独任无
  过载实证）；research-brief 已是 lead 的立项技能；
- **B3 标记反馈协议**（[rejected Note](../rejected/2026-10-06-hitl-feedback-protocol.md)）：
  物种 = 自由文本反馈的机器路由面（chat interrupt + 未识别输入打回）；本机制 = 结构化卡
  调用点，接受/修改语义内嵌选项，无路由面——B3 否决理由恰证本机制不需标记协议；
- **二次确认循环**（修订后再呈再确认）：防交互循环——一轮制，源仓「修订意见附加」
  同款取舍；编辑器级修订不在 v1 讨论；
- **机械门禁先行**（§Decisions 确认行直接进 node-gate）：未标定先上门 = 假牙齿（floor
  教训）——纪律级先行，遵守率标定后再议升格。

## 验证

- L0：verify 全绿 + tests 234/234（净 +1：契约测试「HITL1 两段卡四面在场」——stash 四
  源文件红 → 还原绿反证实录；BUG-005 ask 硬约束断言随合同措辞真实变化同 diff 改）；
- L1：preset-smoke 真挂载四 preset ALL PASS（skills 硬隔离断言含）；
- 回放面：snapshot-replay 4 场景 ALL PASS——lead fixture 真模型重录（BUG-013 程序：
  git rm 旧语料 + record-role-fixture；B1 全文一致 9888 字，persona 合同在场含计划确认卡
  ×3/quick_factual 免发/推荐项形态/ask 硬约束新措辞）+ C 渲染金标准重写人审（窄带：
  检索卡标题钉住、仅收尾活动行随新录制如实重写、比较器未动）；
- 行为面：discipline-probe 5/5 ALL PASS——第五场景 hitl1-plan-card（双 run 互补对：
  标准型发卡 × quick_factual 免发，条件命题两分支同场覆盖）先红后绿：stash 两纪律文本 +
  overlay 重渲染（防 persona 污染）→ 旧文本下模型答无行为标记（exit 1 实录）；新文本下
  A = 发计划确认卡（≤200 字三路选项）/ B = 免发直接开工（人审留档）；探针同 diff 加
  --scenario 定向旗标（防空语料 exit 2 守卫）；
- 真模型档：l4-lite 四角色 assistant 响应 + scout web_search 工具调用 ALL PASS；
- 对账命令：九面「计划确认」grep 17 处全在场（persona 2 / skill 6 / 手册 1 / 模板 2 /
  NODES 2 / running-a-research-run 1 / guides/61 1 / pack README 1 / design/30 1）；
- 未跑（如实分开）：entry-chain-probe——改动面不含 docs/AGENTS，收尾门「按节奏」豁免；
- **挂账（run 试点正证）**：随下一场标准研究型 run 核验——计划确认卡真发、真答、
  §Decisions/journal 记账齐、用户过烦与否（否定判据 = 卡被秒拍且事后从不修正 → 维持
  三问现状，结论回写推敲卡邻域）；未触发 = 休眠如实记录不判失败（living-verification
  同款）。

## 环境状态

观察面零改动（ask 调用既有渲染 + hitl-fold 分类 + 挂起横幅/活标题复用——ask_user_question
即信号，与源仓引擎分相检测的物种差异在此兑现）；运行中 web 进程缓存 boot 时文本——下次
boot run 通道时新 persona 自然生效；lead 回放 fixture 已换代（persona 含计划确认卡合同）；
quick_factual 场景 HITL1 维持单段（豁免语义在 persona/skill/手册三处同构）。
