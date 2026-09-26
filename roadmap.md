# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。
> **每行必须标注可执行性**：`等人` = 需真人输入，静默期推不动（入口链第 3 步据此决定"取题还是
> 开工"）；`可自主` = 代理可独立推进。

## 队列

> 次序依据（2026-09-26）：①当前条目 = 「研究类型覆盖」——**等人**（需真人带题，静默期推不动），
> 且兼此前全部真人档验收（观察面/证据契约/交互卡片/研究状态界面）；②搁置池五条复活条件均未满足。

1. ▶ **研究类型覆盖**（研究，**等人**——用户带题驱动：真人 HITL、类型 ≠ 首场）——兼观察面 GUI 化的
   真人档验收 + 证据可靠性面的 run 级验收（bundle 含 audit.md 且佐证结构达标）+ 交互卡片
   真人体验 + 研究状态界面真人目验；顺手取证 synthesizer/floor 重估证据。
   RFC = [2026-09-25-research-type-coverage](notes/proposed/2026-09-25-research-type-coverage.md)。

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌）——[RFC](notes/proposed/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](notes/proposed/2026-09-24-synthesizer-role.md) | 单场 run 实测 lead 独任综合无过载（[m2-run-mechanics](notes/implemented/2026-09-24-m2-run-mechanics.md) §实施记录） | run 实测综合负载过高（✗；多 run 后重估） |
| floor 数值门禁机械化——[RFC](notes/proposed/2026-09-24-floor-gates.md) | critic 散文审查实证有效（抓出三根钉子），数值 floor 有假绿风险 | run 出现质量滑坡实证（✗；多 run 后重估） |
| keyless 录制快照面——[RFC](notes/proposed/2026-09-24-keyless-snapshot-lane.md) | 模型/用户可见输出靠真挂载+真模型档取证，成本较高；E1 教训 = 该二包只可作 devDep | 需要「输出快照」级 keyless 回归时（✗；**0.1.7 `retired-tools` 钉法已降复活成本**；观察面落地后渲染改动频繁则重估） |
| 许可证（LICENSE）——[RFC](notes/proposed/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
