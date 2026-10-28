# 推敲：计划确认闸门（plan-review gate）——HITL1 三问之后、开工之前，方向契约先呈用户

> 状态：已毕业·该做（2026-10-07 用户点名提前激活——触发②，会话原话「推进落地」；试点正证〔触发③〕作挂账随下一场 run，正本 = 毕业 Note 验证节挂账条）｜去向 = [毕业 Note](../../../notes/implemented/2026-10-07-plan-review-gate.md)（notes/implemented/，2026-10-07 同日交付：九面落地 + 证据梯五档 + run 试点挂账）+ 本卡迁 _done/_closed_plans/

## 背景 / 触发

用户点名（2026-10-07 会话）：读源仓闭卡，想清楚本仓如何借鉴，立卡。源 =
`/Users/bowhead/ai_deerflow_dr_v3/_backlog/_done/_closed_plans/2026-10-07-plan-review-gate.md`
——**已落地归档的机制，不是提案**：plan-review-gate + plan-marker-detection 两 change 均交付，
真梯演示暴露的检测缺陷已修复并固化回归测试。借鉴对象自带"上市后才发现的坑"记录，这是
比提案更值钱的部分。

源仓动机（对标 Gemini Deep Research 后用户拍板）：跑前对齐不能只靠"模型含糊时反问"
（被动触发），要有**计划确认闸门**——agent 先交研究计划，用户审、改、确认后才开跑；
对齐载体是一份具体可读的计划，比抽象问答省用户脑力；用户在烧钱之前手握编辑权。
源仓谱系：闸门与其已落地的反问机制（interactive-clarification）同源于"跑前对齐"方向。

本仓对照面（缺口同形）：HITL1 现状 = 固定三问（研究类型 / 深度篇幅 / 口径语言——
[research-brief](../../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md)
skill），问的全是**抽象参数**；三问答完 lead 即定稿 question.md + topics.md
（[NODES](../../../research-workspace/NODES.md) 行 1）并直接开工。**这两份文件就是具体计划**
（问题定稿 + Purpose + RQ 分解 + Scope/Constraints + topic 图）——但用户开工前从未见过
它们，第一次见到具体化方向 = v1 交付（HITL2）。本仓已记账的有界风险
（[hitl2 范围轮卡](2026-09-28-hitl2-scope-round.md)）："
方向性跑偏要等 v1 交付才被用户看见"。

## 已知与未决

已核实：

- **源机制五决策**（闭卡转述，细节以下钻归档 change 为准）：① 计划轮在 lead agent loop
  内，**不另立 harness planner 角色**（备选被拒：bounded role 重启，代价大且不必要——
  复用 lead 的计划能力即可）；② 与反问自然组合——含糊先问、清楚直接出计划，优先级由
  模型判断不写死规则；③ CLI 三路：回车 = 确认原计划；直接输入 = 修订意见（**附加**进
  计划，不替换——终端里逐行编辑多行文本体验差）；s = 跳过计划注入；q = 放弃；④ 已批准
  计划物化为 `request/plan-gen1.md`——计划是本次运行的范围合同，值得进证据链（journal
  lifecycle 条目有逐出机制，不能当唯一留存）；⑤ headless 行为逐字节一致（无钩子 = 无
  计划轮，CI/smoke 不受影响）。
- **源仓真梯缺陷与修法**（对我们最有价值的一条）：引擎分相靠"第一轮 plain text = 计划"
  的收尾检测 → 真实研究轮以纯文本报告收尾时与计划轮不可区分 → 闸门在结尾把报告当计划
  误触发（journal 末尾出现 plan_proposed/plan_skipped），多烧一整轮研究。修法 = 计划请求
  框架要求 `<research-plan>` 标记包裹，引擎仅标记在场时触发，无标记诚实降级。
- **本仓载体差异——两处结构性不用搬**：① 源仓计划住在 chat 线程，需物化新文件；本仓
  计划**已有家**：question.md = 方向契约 = bundle 身份核心（跨 rerun 持久，模板自带
  [HITL1 Alignment Snapshot](../../../research-workspace/templates/run/question.md) 节）+
  §Decisions append-only 拍板行——不新建文件。② 源仓闸门触发靠引擎检测 plain text 收尾
  （故需标记）；本仓 HITL 载体 = DSH `ask_user_question` 结构化卡，**工具调用即信号**
  （观察面 hitl-fold 既有分类、cockpit 挂起横幅与"等你拍板"活标题零改动）——
  "报告被当计划误触发"这个物种本仓不存在。**教训继承、修法不搬**：闸门触发判据必须
  机械无歧义——本仓形态下天然满足。
- **B3 否决不撞**（[rejected Note](../../../notes/rejected/2026-10-06-hitl-feedback-protocol.md)）：
  B3（deer-flow `[ACCEPTED]`/`[EDIT_PLAN]`）的物种 = 自由文本反馈的**机器路由面**
  （chat interrupt + 未识别输入打回）；本卡物种 = 多一个 ask_user_question 调用点——
  接受/修改语义内嵌选项。B3 的否决理由恰好论证了本卡为什么不需要搬他们的标记协议；
  但两者同属"跑前对齐"邻域，毕业门前须明辨（此处即辨析记录）。
- **两点交互合同与先例**：[研究手册 §交互纪律](../../../research-workspace/AGENTS.md)
  （"整个 run 只有两个人机交互点"）；两段卡在**同一个交互点内**、计数不变的裁定先例 =
  hitl2 范围轮卡 A 形态（"两点合同字面保持"）；D17"HITL1 永不重开"——计划卡在立项窗内
  （两文件落盘后、下游组队前），属扩窗不是 run 启动后重开；判型路径照旧（计划卡在
  判型/三问之后）。
- **既有覆盖直接复用**：timed ask 600s 语义（超时不自动落定、问题保持可答）；用户不在场
  = 代理模拟 + 显式标注（running-a-research-run §2）；三问推荐置首的轻拍形态（计划卡
  同款：按计划开跑置 Recommended）。
- **实证面（反方向证据，如实记账）**：34 场归档 run，"v1 方向非用户所要"级跑偏**零在案**
  （hitl2 卡严格门同口径未触发；rerun 皆走 HITL2 补研究 = 范围扩张非方向纠偏）——
  2026-10-06 定调会话自定的 floor 教训"零实证疼痛不开工"直接适用于本卡。
- **待下钻**（采纳前补材料，oss-dr 四件套同款规矩：现有依据仅闭卡转述不算下钻过）：
  源仓归档 change 两件 `openspec/changes/archive/2026-10-07-plan-review-gate/` 与
  `2026-10-07-plan-marker-detection/`（另有前置 `2026-10-07-interactive-clarification/`）
  ——proposal（含 Node Agent Review / Control Placement Review）与 specs delta
  （entry-surface / deerflow-wiring / run-bundle）细节；下钻材料进
  [research](../research/README.md) 随卡走。

未决（四问）：

- **该不该**：机制成立性已核（载体/家/纪律三件全现成，改动 = 纪律级文本，零引擎零拓扑
  ——vendor 只读铁律下唯一可行形态）；卡在开工证据——源仓外证（Gemini 对标 + 真梯
  验证 + 双 change 交付）vs 本仓零跑偏实证。
- **何时**：触发三选一见毕业门；当前 queue parked、下一场 run 类型已定（标准研究型）=
  天然试点窗。
- **次序**：与搁置池 HITL2 范围轮同属"对齐载体具体化"方向（一管跑前、一管交付后），
  无前置依赖；若激活——纪律级先行，机械化（§Decisions 计划确认行在场断言，node-gate
  门③ 近亲）后置，先标定后立门。
- **放弃**：否定判据形态待定（试点零 engagement = 无增量信号？维持三问现状？）——见
  毕业门。

## 候选与取舍

- **甲（主候选）HITL1 两段卡**（镜像 hitl2 卡 A 形态）：三问答完 → lead 定稿
  question.md + topics.md → **计划确认瘦卡**（≤200 字同纪律：计划要点 + "全文 =
  question.md/topics.md"指针；options = 按计划开跑〔Recommended〕/ 修订计划〔自由文本
  意见附加〕/ 放弃〔不开跑，bundle 处置照开跑前预检规矩〕）→ 拍板行落 §Decisions 后
  开工。**一轮制**：修订意见附加进计划、lead 落稿后直接开工，不再二次确认（防交互循环；
  意见推翻类型/深度级 → 走放弃重开，不在卡上循环）。quick_factual 豁免（编制条件性
  同源：类型字段判）；rerun/补研究路径不动（范围锁定已有家 = §Decisions 行 + HITL2
  范围轮邻域）。代价：每场交互档 run 多一张卡 + 一次等待（timed 600s 覆盖）。收益：
  跑偏窗口从"v1 交付"前移到"开工前"；**增量成本近零**——源仓为计划加了一整轮模型
  往返，本仓立项本来就产出这两份文件，增量 ≈ 一张卡 + 答复处理。
- **乙 独立计划文件**（源仓 plan-gen1.md 形态）：输——本仓计划已有家（question.md），
  另立 = 一处事实两个家。
- **丙 第五 planner 角色 / 独立计划节点**：输——源仓同款否决（bounded role 重启）+
  本仓 [synthesizer-role 否决](../../../notes/rejected/2026-09-24-synthesizer-role.md)
  先例（lead 独任无过载实证）；research-brief 已是 lead 的立项技能。
- **丁 现状不动**：真候选非稻草人——34 场零跑偏是它的证据；输在有界风险已记账 +
  成本不对称（一张瘦卡 vs 整场跑偏 run）。留作毕业门"放弃"出路。

用户负担辨析（预答必然追问）：2026-09-28 会话"交互集中在 HITL2（用户信息最全时刻）"
初步裁决针对**补研究细节住哪**，不否定跑前范围合同；且计划卡让用户**审**具体物
（认知负担低于三问时的**答**抽象题——正是 Gemini 论点），推荐置首可轻拍，quick_factual
豁免兜住最轻场景。

边界（随形态锁定）：闸门只住节点 1（新开 bundle）；诚实降级——lead 跳卡直接开工不硬拦
（源仓"模型不理会先给计划"同款风险、同款处置），journal 记账缺席（判型痕同款记账位）；
机械化与否看试点场次 lead 遵守率再定。

## 毕业门

**判断：该做但不现在（待触发）**——机制成立（载体/家/纪律三件全现成，零引擎零拓扑），
但本仓零跑偏实证，"零实证疼痛不开工"不自行开工（对标
[oss-dr 卡](2026-10-06-oss-dr-lessons.md) A 档进池形态）。

- **触发三选一**（任一满足 → 立 RFC + 队列行）：① 一场 run 的 v1 方向/范围被用户大改
  （本可由计划卡拦下的实证——门悖论如实登记：等实证 = 等一次本可避免的跑偏，hitl2
  卡同款）；② 用户点名要 Gemini 式跑前计划确认；③ 用户点头**试点**：下一场标准研究型
  run 带计划确认卡试跑，试点正证记账进本卡（hitl2 卡同款：试点题被认真作答、零过烦
  = 激活证据）。
- **试点否定判据**（放弃出路）：卡被秒拍且用户事后从不修正 = 无增量信号 → 维持三问
  现状，结论消化进 hitl2 卡邻域（跑前对齐就该薄的正面证据——与 2026-09-28"集中在
  HITL2"裁决同向）。
- **实施面（激活时）**：触面六件 = research-brief skill（三问后加确认步）+ 研究手册
  §交互纪律（HITL1 两段卡语义）+ templates/run/question.md（Snapshot 节增确认行）+
  NODES 行 1 描述同步 + running-a-research-run §2 + guides/61——初步判 = 文本级
  （不动节点 I/O 形状；若后续把确认行升进下游开工判据 = changing-node-topology 程序）。
  种子重同步（sync-pack-workspace）+ 模型可见面 → l4-lite 真模型档
  （[guides/60 §2](../../../docs/guides/60-dev-loop.md) 任务型路由）；行为面 →
  discipline-probe 候选场景"立项跳卡"；证据面 = 试点场 run 通道全链
  （boot-run → HITL1 两段 → journal/§Decisions 记账 → 交付）。
