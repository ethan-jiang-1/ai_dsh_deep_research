# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。
> **每行必须标注可执行性**：`等人` = 需真人输入，静默期推不动（入口链第 3 步据此决定"取题还是
> 开工"）；`可自主` = 代理可独立推进。

## 队列

> 次序依据（2026-09-27）：唯一剩余条目 = 真人档验收（等人——用户在场时一次闭四项，期间代理
> 模拟代行"看"）；机械可自主的两条（keyless 快照面、毕业正文改写门禁）均已交付离队。搁置池
> 四条维持 rejected/（floor 的可实现核心已被 evidence-audit 吸收，synthesizer 大概率永不
> 触发，license/ui-skin 等用户触发），复活条件见行内。

1. ▶ **真人档验收**（研究/活动，**等人**——用户指令延后到最后；期间代理模拟代行"看"）——一次在场
   会话闭四项：真人 HITL1/HITL2（不代答）、卡片可用性结论、观察面目验、run 本体 L4 四判据 +
   `audit.md` CRITICAL 0。RFC = [2026-09-26-human-gate-acceptance](notes/proposed/2026-09-26-human-gate-acceptance.md)。

## 搁置池（缺上游 seam 或缺明确需求才进池；复活条件写进行内。2026-09-27 用户定调：搁置即"决定不做"——全文住 notes/rejected/ 并带重启条件，proposed/ 只留队列 TODO）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌）——[RFC](notes/rejected/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](notes/rejected/2026-09-24-synthesizer-role.md) | lead 独任综合无过载：首场 run（[m2-run-mechanics](notes/implemented/2026-09-24-m2-run-mechanics.md)）+ **2026-09-26 两场 run 重估**（26 / 46 张证据卡、6 topic，无过载迹象） | run 实测综合负载过高（✗；**2026-09-26 已多 run 重估一轮，条件仍未满足**） |
| floor 数值门禁机械化——[RFC](notes/rejected/2026-09-24-floor-gates.md) | critic 散文审查实证有效（九场无一滑坡）；**可实现核心已被 evidence-audit 吸收**（抓取强度/摘录覆盖率/final 链/日期——数值门禁的灵魂已活在机械审计里） | run 出现质量滑坡实证（✗；重估至第九场，条件仍未满足） |
| 许可证（LICENSE）——[RFC](notes/rejected/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
| evidence caliber 数值断言——[RFC](notes/rejected/2026-09-24-frontmatter-caliber-gate.md) | margin ≠ threshold：实测前数值门禁是假牙齿（口径是散文判断，"字段在场"断言查不出"口径真实"；基础整治 §3.4 用户拍板独立成篇） | 首个 run 实测出现口径缺失高频导致 critic 狩猎漏检、或口径标记被滥用逃避纪律，且实测数据能定出判据形状（随 floor 机械化一并重提）（✗） |
