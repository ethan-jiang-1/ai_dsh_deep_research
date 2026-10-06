# 推敲：开源 DR 框架经验挖掘——有什么值得本仓借鉴

> 状态：毕业（2026-10-06 用户呈批裁决）｜毕业门判断 = 该做但不现在（待触发）｜去向 =
> queue.md §搁置池三行（A1 标题重复门禁 / A2 回边超界语义 / 收活 acceptance_criteria 纪律——
> 末条由同日遗留下钻兑现）；B/C 档 = 各归其文件被触碰时顺带采纳，出处指针 = 本卡；随卡
> 材料 = _done/_reference/oss-dr-mining/（digest + arch-mining + followups 下钻）

## 背景 / 触发

用户定调（2026-10-06）：`research-workspace/archive/drt_dr-product-landscape/final.md` §1.5/§3 的
开源 DR 框架生态值得研究——不是再画一张形态地图（那场 run 已交付），而是往下挖一层：
**它们的方法论与工程做法里，有什么是本仓（deep-research-pack：四角色 preset、NODES 八节点
管道、机械门禁、Research Cockpit）可以借鉴的**。

挖掘深度（用户拍板）：**案头 + 补充 web 深挖**——bundle 里的 os-* evidence 卡（盘上实存
27 张；final.md §6 记 26 属簿记差，digest §三.7 有核）是形态层快照（star / 架构一句话 /
维护状态），判断"值得借鉴什么"需对活跃项目下到架构与机制文档层。

**方法论连续性**：本仓方法论内核移植自 codex DR harness（docs/design/30-methodology-mapping.md），
2026-10-03 已做过一轮专业 DR 三轴对标（源仓 + Anthropic 工程自述，材料 =
[reference/strategy-benchmark/](../../reference/README.md)）。本轮是同一类挖掘的第三个对象
面：**开源框架生态**。前一轮的教训直接适用——借鉴候选必须带触发条件，不直接改机制；
物种不同的路线（如 OpenAI 端到端 RL 单模型）记为"不构成可采纳面"。

## 已知与未决

**挖掘对象**（final.md §1.5 名单，按维护状态分诊）：GPT Researcher（活跃）· DeerFlow（活跃，
1.x 才是 DR 框架）· Local Deep Research（活跃）· dzhng（最小实现，反面参照）· STORM/Co-STORM
（停更未归档，论文层遗产）· Tongyi（权重型，只记物种边界）· LangChain ODR（已归档，挖死因）。
khoj / SkyworkAI 不挖（分诊个案）。

**材料**（判断依据，细节不复制进卡）：
- 案头路 = [reference/oss-dr-mining/2026-10-06-oss-dr-bundle-digest.md](../_reference/oss-dr-mining/2026-10-06-oss-dr-bundle-digest.md)：27 张 os-* 卡逐家 digest（卡片里有但 final 未收的机制细节）+ 口径红线 + 18 条下钻点；
- web 路 = [reference/oss-dr-mining/2026-10-06-oss-dr-arch-mining.md](../_reference/oss-dr-mining/2026-10-06-oss-dr-arch-mining.md)：7 家固定问题集深挖（一手 URL 随文）+ 17 条借鉴候选清单。

**六问的答案**（对应立卡时的待答问题）：
1. **分工形态**：各家 plan→collect→write 与本仓八节点同构；"分节并行写作"被 ODR 作者本人两次证伪（workflow 版与 multi-agent 版均因子代理互不通气放弃）→ 本仓"Lead 收口 final.md、Analyst 只供 findings"获**独立第二外证**；最小内核（递归 + researchGoal + learnings 累积）已是事实标准（dzhng 与 gpt-researcher deep_research.py 几乎互为移植）→ 本仓每个重机制可写"相对最小集的增量价值"论证。
2. **质量控制**：本仓机械门禁面在生态里**偏强**（evidence-audit 溯源审计无对应物；dzhng 的平铺 URL 列表 = 无溯源链最坏形态活教材，gpt-researcher #1846/#1892 事故链 = 同病外部佐证）；缺口 = "生成退化"类在场级门（LDR HeadingRepetitionGuard 有事故背书、O(1) 判据）与**回边超界处置语义**（gpt-researcher 有界但 fail-open——本仓 fail-loud 立场下"打回/放行/报错"三选项须显式写进契约，不能留给现场判断）。
3. **规划与澄清**：dzhng/deer-flow 都有澄清步；deer-flow 的结构化 HITL 反馈协议（[ACCEPTED]/[EDIT_PLAN] 标记 + 未识别输入默认打回）可给 HITL1 加机械可判语义；STORM perspective-guided question asking（学界验证，arXiv:2402.14207）直击 must_answer 覆盖面。运行中澄清缺位是本仓交互纪律的设计选择，不动。
4. **引用溯源**：本仓 evidence 契约 + `[来源:]` 行 + audit **全生态最强**（STORM 编号注入是同构先例，DeerFlow/gpt-researcher 仅 prompt 级）——此轴无物可借，只收获论据。
5. **成本预算**：无超出 strategy-benchmark 面①的增量；小项 = STORM 五槽位两档分模 → preset 模型档建议。
6. **迭代回边**：本仓回边有版本语义但超界处置未显式化（同 2）。

**DeerFlow 可验证执行四件套**（案头路头号发现）值得单列：tamper-evident receipt → bounded ledger 进上下文 → subagent 报告须引用 receipts → `acceptance_criteria` 父侧确定性核查 + `UNVERIFIED` 标注——正对本仓诚实取舍账"提交前验证降格为 critic 狩猎（critic 也是 LLM，可能漏）"那条（30-methodology-mapping §4.2）。**材料缺口**：web 路未下钻 PR #4659/#5076/#5090/#5109/#4365 实现，现有依据仅 release notes 原文（evidence/os-deerflow-releases.md 摘录）——采纳前须补下钻。

**未决**：gptr"retriever 插件化"引用归属疑点部分收敛——retrievers/ 目录 + base 契约实存（web 路一手核实），但"v3.7.0 release notes 条目"归属未核（原话只在 leads.md scout 笔记）；bundle 口径簿记差（盘上 27 张 os-* 卡 vs final §6 写 26）——引用以 27 为准，交付记录不回填。

## 候选与取舍

> 逐条机制 × 来源 × 落点 × 初判的完整表 = arch-mining 收尾节（17 条）；此处只载分档判断。
> 总原则（继承 strategy-benchmark 轮）：借鉴候选带触发条件，不直接改机制；与 codex 源仓 /
> Anthropic 自述已对标面重复的降权。

**A 档——机械/契约小条目（低成本、判据明确，走 writing-a-gate / NODES 同 diff 程序）**
- A1 **生成退化在场级门禁**：LDR HeadingRepetitionGuard（事故 #6452 背书、O(1) 判据）→
  schema-scan/node-gate 加"final.md 同一标题行重复 ≥4 次"断言。反证注入 = 造一份重复标题的
  假 final 看门红。
- A2 **回边超界处置显式化**：NODES.md 回边行补"上限 + 超界处置（打回/放行/报错三选一）+
  降级记录"契约——gpt-researcher 的 fail-open 是反面参照，本仓 fail-loud 立场须落成文字，
  不能留给 agent 现场判断。

**B 档——skill/prompt 级纪律（零机械成本，等对应文件被触碰时顺带采纳，不单独立项）**
- B1 Critic 出题用"evidence/ 有、findings.md 未用"差集（Co-STORM Moderator 策略）→ critic
  adversarial-review skill；
- B2 topics 出题前置"视角扫描"（STORM perspective-guided asking，学界验证）→ lead 的
  research-brief/lead-mapping skill + question-patterns.md 视角维度；
- B3 HITL1 结构化反馈语义（显式接受/修改标记 + 未识别输入打回，deer-flow 协议）→ 涉交互
  契约，**需用户定调**才动；
- B4 门禁文档统一附"本门不防什么"（LDR 局限诚实文风）；
- B5 source_tier 判据说明挂 OpenAlex/DOAJ/捕食期刊库公开口径（LDR Journal Quality System，
  只挂口径不建系统）。

**C 档——方法论/论证素材（写进 design/evaluation 论证面，不产代码）**
- C1 同源回放基准法（固定源集、单变量、报胜率+成本）→ evaluation.md 新门禁反证实验设计；
- C2 "相对最小集增量价值"论证素材（dzhng 最小内核 = 事实标准；反面三例：dzhng 静默吞错 /
  gpt-researcher 全失败即停 / LDR 失败不丢源回归测试——fail-loud 的外部参照系）→ design 论证；
- C3 "Make it easy to remove structure" → NODES.md 演进审视项（哪条结构在防过时失能）；
- C4 requires_scraping 事故链（#1846/#1892）→ evidence-audit 存在理由论据 + "是否已抓取"
  类隐式推断排查 checklist。

**待下钻后才能判的（不进档）**
- DeerFlow 可验证执行四件套（acceptance_criteria 父侧确定性核查 + UNVERIFIED）——正对本仓
  "提交前验证降格"诚实取舍；PR #4659 等 5 个 PR 实现未下钻，采纳前补材料。

**明确不采纳**（防复犯）：auto_accepted_plan 式 HITL 跳过档（与宪章"阶段边界请人"相反）；
LangGraph/AG2 双轨编排、marp/podcast 导出、dspy 栈（物种/栈不合）；知识库复利（成本不成比例，
记远期）；Tongyi 权重型路线（物种不同——但记一条边界判断：权重型会持续吞噬"纯 prompt 级"
质量手段，机械门禁与证据契约不在被吞噬之列，恰是本仓投入方向的反证）。

**定位注脚**：deer-flow 2.0 分叉与 ODR 归档两极命运都以"脱离宿主、自成框架"为前提——本仓
"借 DSH 为宿主"的插件定位在该样本集里没有反面案例。

## 毕业门

**判断：该做但不现在（待触发）**——候选成立（A 档两条判据明确、B/C 档零风险成熟），但无当前
实证缺口驱动开工（queue 停着、无 run 疼痛指向这些候选），按 floor 教训与"无 RFC 不行为"
规矩不自行开工。

- **出路（呈批后执行）**：A1/A2 落 queue §搁置池行（复活条件 = 下一场 run 出现对应疼痛，
  如 final 标题重复实滑 / 回边超界实发；或用户点名提前）——对标 strategy-benchmark 候选 A/B
  的进池形态；B/C 档不进池，各归其文件被触碰时顺带采纳（本卡即其出处指针）；
- **消化落点**：本卡与两份 reference 材料即"开源 DR 面已挖过"的检索锚——后续任何
  "借鉴开源 DR"想法先查这里（取代检查），重复提出前先读「明确不采纳」表；
- **重启条件**：用户点名开工 A 档；或 run 实证命中 A1/A2 对应疼痛；或 DeerFlow 四件套
  下钻材料补齐后单独立卡。
