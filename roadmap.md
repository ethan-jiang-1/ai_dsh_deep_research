# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。

## 队列

1. ▶ **观察面 GUI 化**（feature，M3 初排升位——前置"run 实测后立项"已满足；用户验收可调）——
   右栏「研究状态」页签（流程步骤条 + 活标题"⏳ 等你拍板" + journal→矩阵→review 渐进）+
   研究语义工具卡（C）+ D7 修订（限定观察面用途）+ 双半构建链（tsdown 契约照抄 company）+
   client-load-smoke 完成定义。材料 = notes/research/2026-09-24-ui-observability-surfaces.md。
2. **升 pin 重校**（⟳ 触发型）——`sync-dsh` 升 pin 时流程合同对 vendor 重校一遍
   （继承跟 pin 走——含 discipline-map 三态表重校；触发时进队，平时不占位）。

（已毕业离队 2026-09-25：首个完整研究 run（L4 四判据全闭 + Q2/Q4/Q5/Q6 销账，run =
drt_cn-us-cpu-gap）与 M2 收口与复盘（八件清单毕）——六份 RFC 迁 implemented/，证据 =
各 RFC §实施记录；E1 通道回归排查同日毕业。M3 其余顺延项：观察面 GUI 化已升位。）

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件 |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌） | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤） | 首个完整 run 通过 + 有 demo 需求 |
| 专职 synthesizer 角色 | 缺实测证据（Q4） | 首个 run 实测 lead 综合负载过高 |
| floor 数值门禁机械化 | 缺实测证据（Q6）；keyless 断言有假绿风险 | 首个 run 出现质量滑坡实证 |
| 许可证（LICENSE） | 本仓 `private: true` 未对外分发（vendor 是 MIT，我们尚无 license 字段——**未决非遗漏**） | 对外分发/发布 pack 前定许可证并加 `LICENSE` + package.json `license` 字段 |
