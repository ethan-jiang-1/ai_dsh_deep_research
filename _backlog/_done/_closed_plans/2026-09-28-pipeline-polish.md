# 推敲：全环节打磨与节点质量门（第二阶段收纳面）

> 状态：已毕业·触发达成（计数 3/3——2026-10-04 三场验收 run 连续，见正文第七场样本；2026-10-03"门转健康遥测"建议随触发达成消解：计数完成使命）｜去向 = 本卡迁 `_done/_closed_plans/`；余项 = 门L 分形推敲卡（[2026-10-04-leads-topic-shape](2026-10-04-leads-topic-shape.md)）+ 面⑤ HITL1 侧待 run 采样（不立卡）+ 面⑥ 判据升格随 run（不立卡）+ 效果终验挂起（queue 头注）｜七面收口记录（下方原状态行内容）＝**面⑤首棒已毕业**（2026-10-03，[Note](../../../notes/implemented/2026-09-28-hitl-docking-polish.md)：拍板记账 + 交付四步序列 + 摘要自检落地，L0/L1/L4-lite/快照三层全绿；B2 mcp 在途债随 fixture 换代清偿）；**面②已毕业**（2026-10-03，[Note](../../../notes/implemented/2026-09-28-wave0-leads-polish.md)：skill 三对账 + node-gate v2 门 L〔字段齐 + topic 覆盖〕先红后绿，四档全绿）；**面③已毕业**（2026-10-03，[Note](../../../notes/implemented/2026-09-28-wave1-dig-polish.md)：synthesis「未取得≠没有」+ team-assembly 事中调度〔锚点重叠改派/补搜独立任务〕；补搜轮次 4 场确认不改、spawn 规模无过载不改——证据入卡）；**面④已毕业**（2026-10-03，[Note](../../../notes/implemented/2026-09-28-wave2-synthesis-polish.md)：门④版本记账 + 断代，活体回验修复两处门缺陷，tests 140/0）；**面⑦已毕业**（2026-10-03，[Note](../../../notes/implemented/2026-09-28-node-topology-procedure.md)：changing-node-topology 开发技能 + 三处指针）；**面①已毕业**（2026-10-03，[Note](../../../notes/implemented/2026-09-28-strategy-benchmark.md)：三轴对标——迭代深度收敛维持、地板候选 A/B 入搁置池、OpenAI 非同构不采纳）——**七面全部收口（⑤②③④⑦① 毕业 + ⑥ 随 run）**，HITL1 侧待 run 采样证据、scope-round 待触发；缺陷线索照旧喂「已知与未决」

## 背景 / 触发

用户 2026-09-28 定调**两阶段**（trial run 进行中拍板）：

- **第一阶段 = 跑通跑顺**：端到端顺畅出活。现有质量机器（critic / evidence-audit / 判据节）照常运转，但**不新造、不打磨**质量机制，不在环节合同上花功夫。
- **第二阶段 = 逐环节打磨**：每个环节都要过一遍专业化推敲——"专业的 Deep Research 怎么做、策略怎么弄、wave0 怎么搞、wave1 怎么搞、wave2 怎么搞；保障质量的话，每个节点之间怎么做质量门"。本卡就是这个阶段的**思考收纳面**（不是任务、不调度）。
- **节点拓扑保持可调**：今后可能加节点、调整节点——轨道（两◆ + 七步 + 回边）是当前态不是终态。

触发本卡的体感来源：首场 trial（drt_cn-us-open-source）暴露的环节级问题——轨道可读性、HITL2 范围细节无户口（见 [2026-09-28-hitl2-scope-round](2026-09-28-hitl2-scope-round.md)）、L2 安装域缺口——说明环节间缝隙要在跑顺后系统过一遍。

## 已知与未决

**已有质量资产盘点**（第二阶段不是从零开始）：

- critic 对抗审查：九场无滑坡、两幕真拦截实证（rerun-loop-live FAIL→PASS）；角色会话内无命令执行能力（2026-09-27 实测）。
- evidence-audit 机械审计：URL/摘录/final 链对会话日志机械对账，CRITICAL=0 为交付线。
- 各角色 skill 自带判据节与反模式节（模型可见面）。
- evaluation.md 验收合同 + discipline-map 纪律三态表。
- 搁置池 floor 数值门禁（rejected 带复活条件）——教训：**实测前数值门禁是假牙齿**（margin ≠ threshold）。
- 方法论内核已从 codex DR harness 移植，映射表 = design/30。

**待推敲面**（用户点名 + 走查延伸，七项）：

**2026-09-29 两场 run 体感喂进**（model-ecosystem / cn-us-open-source，均 HITL2 定稿归档）：① 质量机器再验证——critic 真拦截 ×2（前者 Round1 FAIL 1 CRITICAL 漏读 excerpts → 修复 → PASS；后者 Round1 FAIL C1/C2+M1–M7 → Round2 PASS 逐项实测复核）、evidence-audit CRITICAL=0 ×2——**反向门未触发**；② **第 5 面（停靠点）新证据**：cn-us-open-source 通道死在门前 → lead 的 present 从未声明 + HITL2 从未被问（**G8 双缺席第二实例**，会话日志全库取证），model-ecosystem 的 HITL2 问询也被通道死孤置（用户经操作侧结构化卡代驱作答）——HITL2 码头对通道死亡脆弱，rerun-loop-live 候选后续①②③加权；③ **第一阶段判据的新取样点**："连续 N 场无操作侧救场"——本次两场均需操作侧收尾（代驱拍板 + present 补齐 + 归档），算不算"救场"？判据定义时必须先给"救场"划界。

**2026-09-29 第三场样本（drt_mcp-server-ecosystem，契约生效后首场）＝样本 1/3，判不过**，卡三条全中：① 通道死救场 ×1（DeepSeek transport 故障把 analyst-1 turn 与 lead turn 2 双双打死，重试 5 次耗尽；操作侧 session/prompt 恢复——lead 据文件事实重建并 spawn analyst-3 无缝接续，恢复路径本身顺畅）；② 两点外卡壳（通道死停摆 ~1.5h）；③ 交付记账返工一处——**门③活体抓红**（G8 第三实例·契约期首例：lead 拍板 HITL2 后落 final/ 并 present，但未回写 §Decisions 拍板行）→ 操作侧显式记账补齐转绿。正面记录：critic 首轮真 FAIL（CRITICAL 2，含抓出 scout 的 leads.md 计数错）→ 修复 → 复评 PASS；evidence-audit 首过 CRITICAL=0；归档即位零搬砖。**新划界题**：用户预先授权的 HITL 代驱（"完全自主弄完"）算不算①的救场？建议判定 = 授权代驱不算、故障代驱算——待用户拍板。

**2026-10-03 第四场样本（drt_cn-llm-pricing-2026-10，mcp-playwright 常驻前 pilot）＝判不过**，记账补录（含欠账声明：token-factory〔2026-10-01 交付〕一场未及记档，无法无损追溯重建——自本条起恢复记档纪律）：① 通道死救场 ×1（会话内代理后台起的通道继承会话沙箱——web_fetch 全域名解析墙 + playwright 浏览器 EPERM，操作侧修复重启；教训已入 guides/61 §0）② HITL 代驱 ×3（HITL1 + 两轮 HITL2，用户预先授权 pilot——**划界题已拍板 2026-10-03：授权代驱不算救场**）③ 交付即落位 ✅（audit CRITICAL=0、两轮 critic PASS、present/记账齐）。**正资产**：mcp-playwright 渲染通道把智谱 Coding Plan 价目（历史"不可判定"缺口）取证关闭——七项推敲面之外的新鲜实证，已回填采纳 Note。**2026-10-04 第五场样本（drt_2026-ai-coding-agent-landscape，验收 run＝判过）**：三判据全过——① 零救场（HITL 全程授权代驱〔划界已钉不算〕、present/记账 lead 本手全落、通道 3083 一 pid 到底未死）② 两点外零卡壳（答案投递机械故障发生在停靠点内，lead 按 timed 语义在等待期持续产出源地图；代答器 bug 属操作侧工具债）③ audit CRITICAL=0 首过（40 卡、final 链 112/112）+ present/拍板记账齐。附注：门L 格式红（leads.md 模板形态违约）= 判据未覆盖的新维度，如实另记不抹。**正面活证据**：交付四步序列〔拍板行→final/→present→goal complete〕按面⑤新 persona 全数执行（G8#3 形态零复发）；goal 护栏 pause/resume/complete 全程合规（插件货架"值级不可证"项的活体补证）；未取得≠有科纪律在证据卡内活体执行；门L 首场活体违约抓捕（面②设计价值实证）；判据④ 新会话只凭文件判明交付态。**系统性新发现**：spawn_teammate 子 composeFrom lead → scout/analyst 的方法论技能从未到达队友（两队友会话零 lead-mapping/evidence-extraction 字样实测）——证据卡守约靠注入手册的契约而非角色技能 → 立卡「角色方法论传递机制」进 queue。**计数：连续无救场 1/3**（划界钉死后首场起算）。**候选 A 标定数据**：primary topic 卡数 T1=18/T2=20（超源仓地板 12/10）、comparison T4=13——本场无地板压力形态，标定继续攒。

**2026-10-04 第六场样本（drt_2026-ai-browser-landscape，第二场验收 run＝判过）**：三判据全过（零救场〔3083 全程同 pid + 授权代驱〕/ 两点外零卡壳 / audit CRITICAL=0 首过〔51 卡、final 链 173/173、MAJOR 30〕）→ **计数 2/3**。新质：critic FAIL（2C/8M 记账不实+TL;DR 误引）→静默修复→复核 PASS 带两前置条件（对抗审查全链落地）；scout 推翻题面两前提（Atlas 已关停/Comet 定价作废）；门L RED 第二例（scout 读模板仍按 T0 任务选实体边界组织 + 卡头显式报偏——"leads 形态按 topic 类型分形"议题坐实）；候选 A 标定第二场（primary 23/20）。**spawn prompt 方法装载在 run 内自发出现**（与 queue ▶ 技能传递卡互证）。

**2026-10-04 第七场样本（drt_2026-ai-video-generation-landscape，第三场验收 run＝判过）**：三判据全过（零救场〔token TTL 到期重启属计划性维护，lead 自主恢复〕/ 两点外零卡壳 / audit CRITICAL=0 首过〔55 卡、final 链 163/163、MAJOR 10 三场最干净〕）→ **计数 3/3——第一阶段判据闭环**。新质：critic FAIL→修复→复核 PASS 全链第二场落地（2C/8M 记账不实+TL;DR 误引→零 CRITICAL）；run 期间双 lead 并跑事故（操作侧投递工具误用+误中止有效执行者）如实记账并恢复，产出质量未受损（audit 全量校验 55 卡）。**门L 第三例 RED**：装载到达但实体边界任务仍选清单组织——"leads 形态按 topic 类型分形"议题升级（三例数据），归 teammate-methodology Note + 后续推敲。

**计数**：连续无救场计数 **3/3——第一阶段判据达成**（2026-10-04 三场验收 run 连续）（本场判不过）。

**2026-10-03 基座适配复查**（用户拍板开始推进第二阶段，触发本轮逐面对照）——卡片成文（09-28）后基座动了一轮：vendor pin 仍钉 `dsh-v0.2.0-rc.2`（fetch 全 tag 确认无新 tag），调整 = 0.2.0 适配与其上的采纳面：插件货架三件（timed ask-user 600s + hitl-fold v5／tool-goal 护栏〔pilot 一场真 run 已验〕／session-query 五工具进 lead+critic）、mcp-playwright 常驻（默认挂载）、NODES.md 八节点契约 + schema-scan（在场级全行）+ node-gate v1（交付两门 + PASS-RELAY 操作侧补齐通道）、BUG-001/002 观察面诚实性修复、guides/61 §0 通道纪律（通道必须用户终端起）。逐面判定：

- ① 策略对标——**适应**；喂料更新：模型能力轴已由 [dispatch-distillation 毕业](../../../notes/implemented/2026-09-29-dispatch-distillation.md)占用（任务派发合同四件入 team-assembly），搜索预算变量新增渲染通道成本；
- ② wave0——**适应**；新变量 = 渲染通道改侦察可达面（SPA 线索不再天然排除，样本 4 正证）；
- ③ wave1——**适应**；派发合同已写，spawn 规模／每 lead 挖深／补搜轮次仍开放；
- ④ wave2——**适应**（基座本轮无触点）；
- ⑤ HITL 停靠点——**改口**：原列「挂起显性化与诚实线」已被基座大部分承接（timed pending 语义＋hitl-fold v5＋goal pause/resume 护栏＋BUG-002 锚点判型修复），余下 = HITL1 问项质量与时机、HITL2 人机工学（≤200 字、选项与推荐）、拍板记录纪律、hitl2-scope-round 试点；G8 三实例全落在本面 = 推进证据最密处（**首棒已毕业 2026-10-03**：拍板记账 + 交付四步序列 + 摘要自检——[Note](../../../notes/implemented/2026-09-28-hitl-docking-polish.md)；余 HITL1 侧与 scope-round 待证据/触发）；
- ⑥ 节点间质量门——**适应且更具体**：机械两层已上岗（在场级 schema-scan／判据级 node-gate 交付两门），余 = 八节点判据逐行升格（随 run 证据，防假牙齿）＋对抗/机械/数值配比；
- ⑦ 拓扑演进——**改口**：同步面已从「三处」涨到六处（NODES.md／模板六件／手册／cockpit STEP_ORDER（`run-fold.ts`）／schema-scan／node-gate），改轨道程序仍缺、原文「三处同步」过时。

**计数**：连续无救场计数 **3/3——第一阶段判据达成**（2026-10-04 三场验收 run 连续）（划界题已拍板 2026-10-03，见毕业门①：授权代驱不算、故障代驱算——追溯适用，样本 3/4 的判定不变）；样本 4（pilot bundle）已交付**已归档**（2026-10-03 用户确认，D17 位置=状态）。

1. **专业 DR 方法论对标**：策略层深化——移植只解决了"内核在场"，与专业 DR（OpenAI DR 等）的策略取舍（搜索预算分配、迭代深度、终止条件）尚未逐项对过（**已收口 2026-10-03**：迭代深度收敛〔源仓 emergent_rounds=1 = 本仓 4 场实证只补一轮〕、地板缺失与数量型终止部分缺失 = 候选 A/B 入搁置池；OpenAI = end-to-end RL 非同构不采纳——[Note](../../../notes/implemented/2026-09-28-strategy-benchmark.md)）。
2. **wave0 机制（侦察，scout）**：leads 映射波次——搜索面怎么铺、主题怎么拆、leads 的覆盖判据（侦察产出质量直接决定 wave1 的天花板）。
3. **wave1 机制（挖掘，analyst）**：证据采集波次——spawn 规模、任务板粒度、每 lead 挖多深、补搜轮次（synthesis 现行"只补一轮"是否最优）。
4. **wave2 机制（综合，synthesis）**：纯综合先行与定向补搜的写作纪律、final/ 版本演进语义（扩张 +1、polish 原位）。
5. **HITL1/HITL2 停靠点打磨**：用户唯二伸手的地方，优先级天然靠前——HITL1 三问的问项质量与时机（发生在用户最没 context 处：怎么问得省力、推荐项怎么拟才准）；HITL2 卡的人机工学（≤200 字纪律的遵守、选项与推荐、范围轮形态 = 关联卡 [2026-09-28-hitl2-scope-round](2026-09-28-hitl2-scope-round.md)）、拍板记录（question.md §Decisions）、挂起显性化与诚实线的体验（**2026-10-03 复查改口：此小项基座已大部分承接**——timed pending＋hitl-fold v5＋goal 护栏＋BUG-002，余项见上方复查块⑤）。
6. **节点间质量门**：每个节点之间怎么做质量门——进出门条件、谁把守（critic 对抗 / 机械审计 / 数值断言）、防假牙齿（floor 教训：先实测定口径再机械化）。
7. **节点拓扑演进**：加节点/调节点的程序——改轨道的同步面已扩到六处（2026-10-03 复查改口，原文「三处同步」过时：NODES.md／模板六件／手册／cockpit STEP_ORDER／schema-scan／node-gate），目前无专门程序。

**未决**：质量门形态（对抗/机械/数值怎么配比）；"跑通跑顺"的第一阶段判据本身还没定义（见毕业门）；六项是拆六卡还是合并推进。

## 候选与取舍

本卡是收纳面不选型；质量门的三个已知选项先记录在案：

- **对抗审查**（critic）——已实证有效，成本 = 真模型档轮次；
- **机械审计**（evidence-audit）——已实证有效（内容级重抓比对 > 脚本存在性检查）；
- **数值门禁**——搁置池有明确的复活条件（run 实测出现滑坡 + 数据能定判据形状），不预启。

## 毕业门

- **触发条件 = 第一阶段判据达成。判据已钉（2026-09-29 用户拍板，N=3 起步）**：连续 **3** 场 run 同时满足三条——① **全程零操作侧救场**（救场 = 规划会话代驱 HITL 拍板 / 补 present / 补记账；操作侧例行收尾〔归档、审计跑批〕不算；**通道死导致的代驱算救场**——2026-09-29 两场即样本；**划界题已拍板 2026-10-03：用户预先授权的代驱〔pilot 授权等〕不算救场，故障代驱〔通道死/补 present/补记账〕算**）② HITL 两点之外零卡壳 ③ 交付即落位无返工（audit CRITICAL=0 首过、present/HITL2 记账齐）。计数自钉死日起算，此前 run 不追溯。
- 达成后：本卡**拆分**——六项各自立卡（或按亲疏合并），进队列取题逐项推敲；本卡 `git mv` 归档。
- 反向门：第一阶段若出现**质量塌方实证**（滑坡、假交付、审计红线），单项质量议题可**提前**拆卡插队，不等阶段切换——阶段纪律不变成鸵鸟纪律。
