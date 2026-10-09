# fresh agent 清晰度与信噪比审计——修复落地

> 状态：implemented

## 决定

> **部分取代关系**（互链义务，见 [notes/AGENTS.md §取代检查](../../notes/AGENTS.md)）：
> 本条是 fresh-agent 信息架构审计的**次轮**（深水区文档 + 盘面机械对账）；
> 首轮（入口链视角）= [入口链 fresh-agent 审计](2026-09-24-entry-chain-fresh-agent-audit.md)。
> 两轮决定均有效（首轮管入口链四件，本条管深水区与布局补账），故双方保留。

2026-10-04「打扫卫生」审计（主会话通读治理层 + 两个零上下文子代理分别审深水区文档与盘面/布局机械对账，发现逐条盘上复核）后，用户裁定全修，一条卫生条目收口，已全部落地：

- **七红修复**：① 61 §0(b) 判别标签——删「交付线已在盘、该进 `archive/`」措辞，改「已过审查线、未归档」（NODES 证明 `final/` 版本记账自综合阶段就在场，停在 HITL2 等拍板也是此态；交付判别 = §6 的 run 根 `final.md` + present）；② 62 §词汇 profile 行——「源 = overlay」过期结论改「源 = pack（boot-run 重建；overlay 只是源码域冒烟通道的生成物）」；③ plans 卡命名 `YYMMDD`→`YYYY-MM-DD` 残留四处（根 AGENTS.md 布局、evaluation.md plans-liveness 行①、_closed_plans/README 头注、reference/README 命名行——后两处为执行期新抓的同族）；④ notes/README.md 过期 pin 复述删除，改指根 AGENTS §DSH 源码表；⑤ `final/` ≠ `final.md` 混用三处（手册完成判据句、61 §4 拍板句、61 §0(b) 判别器）；⑥ pack README 折算层补 bundle-bind 成五件（清单正本指 design/40）、「14 个 peer」硬编码计数改「全部 + 清单指针」；⑦ 61 §3「进度看三处」→ 四处，补研究驾驶舱主观察面（链 design/40）。
- **布局补账（中道）**：根 AGENTS.md §布局补 pack `src/` 双半源码、research-workspace 的 NODES.md 与判型库、`_dist/`、双 symlink 行、run 门脚本（node-gate/schema-scan/watch-run/cdp-probe/export-dist）与 lib 全模块，外加「骨架图非全量清单」声明行与细构指针；doc-budgets 升顶 132→138（理由登记 `_raises`：重项导航是每轮在场事实，下放无更深的家）。
- **门禁盲区**：`pin-agreement` 扩围——notes/ 历史层豁免不变，活动指令层（notes/README.md、notes/AGENTS.md）捞回受检；扩围依据与反证实录登记 evaluation.md 该行。
- **`notes/intents.md` 退役（用户直派，同日第二轮指令）**：立项宪章冻结存档与 D 号台账双载体、噪声大于信息——剔除；值得留的语义收进 [notes/README §立项来历](../README.md)，立项原话全文在 git 历史；用户定调此后只进 00-index D 号依据列（D13 依据列同 diff 改指）。引用面四处同步（notes/README 时态表「始终」行与布局表行、根 AGENTS 布局 notes/ 条、00-index D13）。
- **卫生**：`.pi/` 空残留（untracked 工具 debris）删除。
- **黄项**：62 两处仓外裸引用补登记指针（真实位置在仓外，登记处 = 00-index §外部研究材料）；62 证据义务表补 `source dev/env.sh` 前置（否则脚本自拒 exit 2）；手册 node-gate「交付判据两门」改实况（门②③ + 门L + 门④，正本指 NODES 头部）；NODES 补门编号图例；手册目录约定 archive/ 段重排（drt_ 子件不再视觉挂在 archive/ 之下）。
- **D18 一号两义**：复核为合规（company D18 带仓前缀，符合 00-index 裁定）——不改文档，残留代价仅 grep 混杂。

## 输掉的方案

- 布局全量枚举补齐 22 条：顶格预算必升顶，且全量清单已两次腐烂（本次对账 + 基础整治 C7 先例）——中道（重项 + 总指针）同收导航收益。
- `gate-ledger-sync` 断言文本抽查机械化：门禁断言是散文，无便宜判据可对账——文本漂移靠「每门禁改动同 diff 改台账」纪律 + 本次 ③ 修复收口。
- D18 消歧改写：带前缀引用合规，改写制造 churn。
- `count-free` 句式扩围（「N 个…包」）：实例已改「全部」；为已消除的句式加规则属过度机械化，复发再升格（「有压力再借」判据）。
- 拆两条目推进：两次收尾开销大于收益，verify 分批守门已隔离风险。
- `intents.md` 迁 `notes/archived/` 而非删除：冻结层语义是「不再指导当前工作的已交付决定」，而立项宪章的活性语义已全数在 D 号台账与 §立项来历——归档只留副本；删除 + git 历史留全文更干净（用户裁定「剔除」）。
- 暂缓项（61 §0 段落墙重排、手册事故叙事迁 notes、evaluation 反证列瘦身）：均改模型可见注入面或大段重写，keyless 只证结构不证行为——与契约句修复混在同一 diff 会放大行为变更面；归宿与触发见环境状态节。

## 实际跑过的验证

- `pnpm verify` 全绿（分批守门：红修复批 / 门禁扩围批 / 收尾批各跑一次）；
- `pnpm test` keyless 回归 154/0；
- `node dev/sync-pack-workspace.mjs` 手册/NODES 改动后同步种子（`pack-workspace-fresh` 绿）；
- `pin-agreement` 扩围反证：notes/README.md 注入旧 tag → 红（逐字命中 `notes/README.md:90 的 tag … ≠ submodule tag`）→ 还原 → 绿；实录登记 evaluation.md 该行反证列；
- `node scripts/entry-chain-probe.mjs` 真模型档 ALL PASS（零上下文会话四问全对，当前条目 bigram 28/34 命中；留档 `dev/smoke-workspace/entry-chain-probe-2026-10-04T12-27-24-900Z.md` 供人工复核）；
- 红项终扫 grep 全空（误导标签 / `final/` 当前版形态 / 「源 = overlay」/ YYMMDD 活动面 / 过期 pin / 硬编码 peer 计数）；
- 未跑面（如实分列）：L1 真挂载 / L2 安装 / L4-lite——本条目零 preset、零 pack 结构改动（纯文档 + verify.mjs 门禁扩围 + 卫生），按 guides/60 §2 任务型路由表不属必跑面。

## 环境状态

- 判断材料与逐条证据（含复核状态标签、卡质量审查轮两处改判实录）= 推敲卡 [2026-10-04-fresh-agent-doc-audit](../../_backlog/_archived/settled_issues/2026-10-04-fresh-agent-doc-audit.md)（已毕业归档，位置即状态）。
- 暂缓项与触发：61 §0 段落墙重排、手册事故叙事迁 notes、evaluation 反证列瘦身——触发条件 = 下一场 run 验收前后或用户点名；届时以推敲卡起步。
- 审计方法可复用（三方交叉 + 复核状态标签 + 「以盘上复核为准，不以审计方转述为准」的否决条款——该条款在卡质量审查轮实际触发过一次并改判两红）；下次打扫的候选面 = design/40 步序三家归属（轨道 9 步 vs NODES 8 节点映射无说明）、「推敲卡不是任务」六家复述的收敛。
- 队列已回 parked 态；效果终验挂起注记随 queue.md 保留。
