# cockpit-flow-face：研究流程与参与点在驾驶舱的显性化 + 自跑探索环——已交付

> 状态：implemented

归宿：roadmap §队列「cockpit-flow-face」（2026-09-28 用户直派并当日交付，已离队）。
取代检查：[observability-gui](2026-09-24-observability-gui.md)（留活跃）拥有挂起显性化
机制——本条未改其机制，只扩表达面，不取代。

## 决定

用户定调（2026-09-28）：单线直通诊断——九场 run 全部代理模拟（真人档 0）+ 参与点只在
挂起瞬间可见，界面上看起来"少了 HITL1/2 与 rerun"。修法 = **参与点画成常驻地图而不是
惊喜弹窗** + 自跑探索环（**UX = 全程体验不是 snapshot**；预算 = 首跑 + rerun ≤ 2 固定，
防探索跑飞——用户定）。

1. **探索环首跑**（代理扮演发起人，选题 = 自托管 AI 网关生态全景，exploratory_map 跑满
   七步两锚）：kickoff → HITL1/2 代理代答（逐题选推荐项；provenance 记进 bundle 的
   question.md §Decisions 与 journal.md，显式标注"代理模拟"）→ 交付落位归档
   （`archive/drt_selfhosted-ai-gateway/`：66 份证据、final 55+ 条来源引用、review
   readiness PASS）→ evidence-audit **CRITICAL=0**。三阶段换位走查截图留档
   `dev/smoke-workspace/observations/`（01-silent-start / 02-evidence-phase / 03-delivered）
   + 缺口清单 gap-list.md（G1–G7）。
2. **流程表达四件**（驾驶舱 `src/client/` + `src/lib/`）：
   - **锚点入轨**：「研究状态」页签步骤条升级为流程轨道 = ◆立项确认 + 立项→组队→侦察→
     挖掘→综合→审查 + ◆交付审阅 + 交付，三态 未到/⏳等你/✓已过；挂起横幅点名锚点与参与方式
     （"⏳ 等你拍板——立项确认（N 问）：在会话里的问题卡上点选项即可（推荐项已置首）"）；
     **步序正本 = m2-run-mechanics 运行流程总览**（初版误按七文件清单自造步序——拆解单独
     成步、组队缺席、挖掘误名"取证"，用户指出后同日修正：立项一体、组队归位、挖掘正名；
     组队无独立文件，在场性随立项，cursor 在"立项完成 → 侦察交付"窗口停靠组队）；
   - **决策诚实线**：停靠点已过 N 个 · 决策记录见 question.md §Decisions——谁答的
     （真人/代理）不复制进 UI，家在文件；
   - **↻ rerun 回路**：HITL2 不是终点线而是回路控制器——**回边画进轨道**（grid 第二行：
     U 形虚线从 ◆交付审阅 下探、横行、▲ 上翘回挖掘，重入点即 wave1；HITL2 到达起可见，
     边上标注"补研究（final/ 下一版）· 修订表述原位改"）+ 交付节点带 final/ 版本记账数
     （≥v2 边上点亮"已落 vN"——发生过证据扩张 rerun）；
   - **rerun 三分静线**：已交付时提示（表述修订原位改 / 证据扩张 final/ 下一版 / 另起新
     bundle——向 lead 提出），不交互；
   - 页签五区 → 六区（构成正本 = [design/40](../../docs/design/40-research-cockpit.md) §2，
     同 diff 更新）。
3. **探索环实测发现 → 同 diff 修复**：
   - **G3** markdown 泄漏：问题行与活动行剥 `**`/反引号，截断补省略号；
   - **G4** 错绑缺陷：立项预检 read 旧 bundle（`drt_cn-us-open-source`）把会话绑到别家
     run（HITL1 挂起期间页签会显示别家"✅ 已交付"）——bundle-bind 改**写强读弱**
     （write/edit 定绑，仅读兜底）+ 挂起期抑制仅读绑定的渐进面；
   - **G7 尾窗发现（本条最重要的实测产物）**：journal follow 快照是尾窗（vendor
     history.ts `DEFAULT_MAX_MESSAGES = 50`），长会话里 ask 序数不可见——锚点 passed 态改
     **文件事实承载**（question.md = 立项拍板落盘、final.md = 交付拍板落盘），journal 尾窗
     只承载 pending——`deriveAnchors(events, fileFacts)` 混合折算；
   - **G2 缓解**：activity-fold 增 wait_agent"队员作业中"行（连续折叠）；队员流接入留
     后续（需新数据通道，design/40 §6 已记边界）。
4. 文档同 diff：design/40（构成表六区/折算表/分层纪律/验证面/边界）+ pack README
   （套件自述/观察面用法/已知限制）。

## 输掉的方案

- **只加横幅文字不动轨道**：参与点仍是惊喜弹窗，地图缺失——拒；
- **UI 显示"谁答的（真人/代理）"**：journal 无法区分答题人，question.md §Decisions 才是
  正本——复制 = 第二个家必漂移，改为指路——拒；
- **rerun 做成界面按钮**：D18 用途限定 = 观察/调试，且 rerun 是发起人向 lead 的对话动作
  （guides/61 §5）；观察面不构成第三个交互点——拒；
- **探索不设预算**：用户明令防跑飞（首跑 + rerun ≤ 2 固定）——拒；
- **锚点 passed 态用 journal 序数判定（本条初版方案）**：实测被尾窗击穿（619 事件长会话
  快照只给末 50 条，ask#1 不可见，诚实线显示 1/2、对账红）——改为混合折算后对账全绿；
- **未绑定负样本的泄漏检查沿用步骤名清单**：占位步骤条（挂起期锚点在场）是有意行为，
  旧断言误报——改为盯别家面数据（已交付/证据计数）；
- **自造七文件步序（拆解独立成步、组队缺席、挖掘误名"取证"）**：轨道必须镜像定义流程
  （m2-run-mechanics 运行流程总览），不是文件清单——用户指出"不遵循我们定义的流程"后
  同日修正，步序断言（单测 + load-smoke）随同改写。

## 验证

- **单测**：hitl-fold（混合折算：文件事实 passed / 尾窗 pending / 契约外第三锚）、
  bundle-bind（写强读弱 + boundBy 暴露）、activity-fold（wait_agent 行 + markdown 剥除）
  ——`pnpm test` 94/94 全绿；
- **client-load-smoke**（keyless 真浏览器）：ALL PASS——含新断言「流程轨道渲染」+
  「停靠点诚实线 = 盘侧真值」（对真实交付 run `drt_selfhosted-ai-gateway`：66 份证据、
  双 passed、问题行剥 markdown 同口径）；
- **client-hitl-smoke**（真模型档）：ALL PASS——真模型 ask 挂起 → 活标题翻转 + 新横幅
  （点名锚点 + 参与指引）+ 折叠态自动展开（⑤a–⑤f 全链）；
- **run 端到端**：kickoff → HITL1/2 代理代答（provenance 记账）→ 静默自主 → final +
  present → 归档 → evidence-audit CRITICAL=0（MAJOR 35 / INFO 150 记账 audit.md）；
- **L0**：`pnpm verify` 全绿（role-list-sync 咬掉测试文案里的角色名三连——照改）。

## Consequences

- run 通道 mirror 在本条交付后处于漂移态（pack lib/ 已重建）——下次 boot-run 按
  fail-loud 提示 `rm -rf profile` 重建；
- 探索环预算：**首跑已消耗，rerun ≤ 2 未动用**——新 UI 的挂起态/交付态已由两场真浏览器
  冒烟覆盖（含真模型档端到端），是否再花一场完整 run 由发起人定；
- G6（GUI 编辑卡片跨会话串联——操作侧改动混进 run 会话视图；lead journal 核实无
  harness 写入）登记 gap-list，属 vendor UI 归属问题待查；
- 走查件 `dev/smoke-workspace/observe-cockpit.mjs`（抛弃型）与三阶段截图留档于
  observations/，供后续探索环复用。
