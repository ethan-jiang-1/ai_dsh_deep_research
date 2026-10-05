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

▶ **测试资产组织收拢——词汇对照与落家序**（卫生，可自主，小条目）——
[RFC](../notes/proposed/2026-10-05-test-asset-organization.md)：project-map §测试怎么选 增「测试词汇
对照」（金字塔词汇 ↔ 本仓形态 + 反金字塔理由）与「新检查落家序」（七步修正版，各步挂登记
义务）；成本一句原则成文，覆盖账与经济学判维持判断制；负知识四条进小 Note；姊妹仓三条
证据纪律（互补案例 / 仪器对准目标 / 新形态先入词汇表）借入；契约测试先立红后落绿（D23，
用户 2026-10-05 点名 ongoing goal 全程自主推进）。

> 另有既定效果终验挂起 = 下一场 run 的队友日志 grep 角色技能内容 + 门L 转绿判定
> （[Note](../notes/implemented/2026-10-04-teammate-methodology-delivery.md) 环境状态节）。

## 搁置池（缺上游 seam 或缺明确需求才进池；复活条件写进行内。2026-09-27 用户定调：搁置即"决定不做"——全文住 notes/rejected/ 并带重启条件，proposed/ 只留队列 TODO）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| workflow 工具采纳——[RFC](../notes/rejected/2026-09-30-workflow-adoption.md) | 内核错位（方法论弃管道面）+ 载体倒转（one-shot 裸代理跑主通道倒转 D3/D16——2026-10-02 源码重估：内线形态不构成倒转）+ HITL 停点结构性无落点；run 实证每个高价值行为皆不可预脚本 | 双轨（2026-10-02 重估改写，全文见 RFC）：主通道轨 = 引擎出现 continuable/teammate 或 HITL 感知语义；受控内线轨 = preset 两行声明 + 封闭扇出域 + run 实证扇出段载体疼痛，三者同时满足（✗） |
| browser-use 插件族——[RFC](../notes/rejected/2026-09-30-browser-use-adoption.md) | 缺口真实（15 场 run 中 13 场命中 SPA 证据失败）但 experimental 零出厂采纳信号 + 团队形态错配（每 agent 起 MCP 子进程）；绕行已对冲大半，**2026-10-02 起五绕行含 mcp-playwright 通道**（[采纳 Note](../notes/implemented/2026-10-02-mcp-playwright-adoption.md)） | C1 provider 晋级 stable（pin bump 后 experimental 目录 grep 空）或进可选 bundle；C2 leads 阶段 ≥2 条 A/B 级线索五绕行（含 mcp-playwright）全败 → 单场 scoped pilot；C3 `js-render-blocked-no-workaround` 标签累计 ≥4 例（历史已 3）（✗） |
| UI 皮肤（client 面 + slots 品牌）——[RFC](../notes/rejected/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](../notes/rejected/2026-09-24-synthesizer-role.md) | lead 独任综合无过载：首场 run（[m2-run-mechanics](../notes/implemented/2026-09-24-m2-run-mechanics.md)）+ **2026-09-26 两场 run 重估**（26 / 46 张证据卡、6 topic，无过载迹象） | run 实测综合负载过高（✗；**2026-09-26 已多 run 重估一轮，条件仍未满足**） |
| floor 数值门禁机械化——[RFC](../notes/rejected/2026-09-24-floor-gates.md) | critic 散文审查实证有效（九场无一滑坡）；**可实现核心已被 evidence-audit 吸收**（抓取强度/摘录覆盖率/final 链/日期——数值门禁的灵魂已活在机械审计里） | run 出现质量滑坡实证（✗；重估至第九场，条件仍未满足） |
| 许可证（LICENSE）——[RFC](../notes/rejected/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
| evidence caliber 数值断言——[RFC](../notes/rejected/2026-09-24-frontmatter-caliber-gate.md) | margin ≠ threshold：实测前数值门禁是假牙齿（口径是散文判断，"字段在场"断言查不出"口径真实"；基础整治 §3.4 用户拍板独立成篇） | 首个 run 实测出现口径缺失高频导致 critic 狩猎漏检、或口径标记被滥用逃避纪律，且实测数据能定出判据形状（随 floor 机械化一并重提）（✗） |
| per-topic evidence 数量地板参数化（策略对标候选 A/B）——[对标材料](reference/2026-10-03-strategy-benchmark-sources.md) | 三轴对标判定"地板缺失/数量型终止部分缺失"（源仓 wave0 12/wave1 10 + CLI 单点计算权威可借鉴；Anthropic 用 prompt 区间）；floor 教训 = 数值未标定前是假牙齿，**先标定后立门** | ①存量 19 场标定"每 primary topic 卡数"分布（journal 逐场数，零成本）→ ②下一场 run 起 journal 增记该字段 → ③分布实证"primary 卡数 < 下限且 wave2 返工"场次 → 立门（数值由分布定；候选 B 参数单点计算权威同 diff）（✗） |
| HITL2 条件范围轮（A+D 合流）——[卡](_done/_closed_plans/2026-09-28-hitl2-scope-round.md) | 严格门实证未发生（零 rerun）+ 实施归第二阶段（环节合同）；试点正证留卡〔范围轮试点题两场被认真作答、零过烦〕 | 首场补研究型 HITL2 发生（体感定形 → 立 RFC）或用户点名提前（✗） |
