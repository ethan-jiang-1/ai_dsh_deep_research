# queue — 队列（接下来）+ 搁置池（_backlog 规划面的次序半区）

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针；队列空时以 `（队列空——待用户取题）`
> 行标注（parked 态，门禁认可的一等状态——正确动作同样是向用户取题）。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。
> **每行必须标注可执行性**：`等人` = 需真人输入，静默期推不动（入口链第 3 步据此决定"取题还是
> 开工"）；`可自主` = 代理可独立推进。
> **判断材料不住本文件**——半成品思考的家 = [plans/](plans/README.md) 推敲卡（推敲卡不是
> 任务）；本文件只载次序与归宿（规矩手册 = [README.md](README.md)）。

## 队列

▶ **0.2.0 插件货架适配**（feature，可自主；timed ask-user 语义变更与 auto-review 取舍在阶段边界请人）——
[RFC](../notes/proposed/2026-09-30-plugin-shelf-adoption.md)：DSH 0.2.0 出厂插件对 deep-research
场景的分层采纳与逐项收口——session-query 检索 / timed ask-user / compaction 调优（一梯队）、
tool-goal / tool-jobs / auto-review（二梯队）、workflow-vs-Teams / browser-use / 换源引既有定案
（辨析梯队）；每项采纳（落地 + 全档绿）或否决（理由 + 归宿记档）。
用户指令（2026-09-30）：「充分利用 DSH 的新插件……合适我们场景的」（语料 =
`/Users/bowhead/deepseek-harness/_digested/plugin-inventory/`，基线与本仓 pin 一致）。

## 搁置池（缺上游 seam 或缺明确需求才进池；复活条件写进行内。2026-09-27 用户定调：搁置即"决定不做"——全文住 notes/rejected/ 并带重启条件，proposed/ 只留队列 TODO）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌）——[RFC](../notes/rejected/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](../notes/rejected/2026-09-24-synthesizer-role.md) | lead 独任综合无过载：首场 run（[m2-run-mechanics](../notes/implemented/2026-09-24-m2-run-mechanics.md)）+ **2026-09-26 两场 run 重估**（26 / 46 张证据卡、6 topic，无过载迹象） | run 实测综合负载过高（✗；**2026-09-26 已多 run 重估一轮，条件仍未满足**） |
| floor 数值门禁机械化——[RFC](../notes/rejected/2026-09-24-floor-gates.md) | critic 散文审查实证有效（九场无一滑坡）；**可实现核心已被 evidence-audit 吸收**（抓取强度/摘录覆盖率/final 链/日期——数值门禁的灵魂已活在机械审计里） | run 出现质量滑坡实证（✗；重估至第九场，条件仍未满足） |
| 许可证（LICENSE）——[RFC](../notes/rejected/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
| evidence caliber 数值断言——[RFC](../notes/rejected/2026-09-24-frontmatter-caliber-gate.md) | margin ≠ threshold：实测前数值门禁是假牙齿（口径是散文判断，"字段在场"断言查不出"口径真实"；基础整治 §3.4 用户拍板独立成篇） | 首个 run 实测出现口径缺失高频导致 critic 狩猎漏检、或口径标记被滥用逃避纪律，且实测数据能定出判据形状（随 floor 机械化一并重提）（✗） |
| HITL2 条件范围轮（A+D 合流）——[卡](_done/_closed_plans/260928-hitl2-scope-round.md) | 严格门实证未发生（零 rerun）+ 实施归第二阶段（环节合同）；试点正证留卡〔范围轮试点题两场被认真作答、零过烦〕 | 首场补研究型 HITL2 发生（体感定形 → 立 RFC）或用户点名提前（✗） |
