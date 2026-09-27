# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。
> **每行必须标注可执行性**：`等人` = 需真人输入，静默期推不动（入口链第 3 步据此决定"取题还是
> 开工"）；`可自主` = 代理可独立推进。

## 队列

> 次序依据（2026-09-27 更新）：①当前条目 = 「真人档验收」——用户指令"**延迟到最后**，期间由
> 代理模拟代行'看'的职责"（用户暂无空）；条目仍标**等人**（真人变量最终须真人闭合），代理可
> 执行的子项（卡片可用性审计 / 观察面走查 / 深度规模验证 run）由 ongoing goal 推进中；②搁置池
> 五条复活条件均未满足（floor / synthesizer 已重估至第八场，结论不变）。

1. ▶ **真人档验收**（研究/活动，**等人**——必须真人在场）——一次在场会话闭四项：真人 HITL1/HITL2
   （不代答）、卡片可用性结论、观察面活标题/横幅与矩阵目验、run 本体 L4 四判据 + `audit.md` CRITICAL 0。
   （HITL1 三型已全部实战——快速事实核查由第六/八场代理模拟 run 覆盖；真人档剩的变量只有"真人"。）
   RFC = [2026-09-26-human-gate-acceptance](notes/proposed/2026-09-26-human-gate-acceptance.md)。

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌）——[RFC](notes/proposed/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](notes/proposed/2026-09-24-synthesizer-role.md) | lead 独任综合无过载：首场 run（[m2-run-mechanics](notes/implemented/2026-09-24-m2-run-mechanics.md)）+ **2026-09-26 两场 run 重估**（26 / 46 张证据卡、6 topic，无过载迹象） | run 实测综合负载过高（✗；**2026-09-26 已多 run 重估一轮，条件仍未满足**） |
| floor 数值门禁机械化——[RFC](notes/proposed/2026-09-24-floor-gates.md) | critic 散文审查实证有效：首场抓三根钉子，**2026-09-26 两场 run 重估**（首轮各抓 1 / 5 条 CRITICAL，且**全部闭合**、终判 PASS）——即"散文审查够用、无质量滑坡" | run 出现质量滑坡实证（✗；**2026-09-26 已多 run 重估一轮，条件仍未满足**） |
| keyless 录制快照面——[RFC](notes/proposed/2026-09-24-keyless-snapshot-lane.md) | 模型/用户可见输出靠真挂载+真模型档取证，成本较高；E1 教训 = 该二包只可作 devDep | 需要「输出快照」级 keyless 回归时（✗；**0.1.7 `retired-tools` 钉法已降复活成本**；观察面落地后渲染改动频繁则重估） |
| 许可证（LICENSE）——[RFC](notes/proposed/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
