# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。

## 队列

> 次序依据（2026-09-25 马拉松三号：UI 优先）：①界面是用户点名"先把界面弄对"——当前
> tab 是工程验证面（原始事件类型名流），人看不懂；②HITL2 实测是交互 RFC 的延期验证项
> （便宜单回合）；③生态研究可自主执行，纳入本马拉松；④需用户带题（真人拍板），
> 兼①②③全部真人档验收。

1. ▶ **HITL2 选项卡实测**（卫生/小；「研究交互设计」的延期验证项）——便宜单回合真模型实测
   （代理答题标注）：盘侧断言选项结构（定稿(Recommended)/补研究/修订表述）。
2. **DSH 插件生态认真研究**（研究；可自主执行，纳入本马拉松）——粗扫后续：生态缺什么、
   deep-research 定位独占性；产出 = 调研报告（钉版引用）。
   RFC = [2026-09-24-dsh-plugin-ecosystem-research](notes/proposed/2026-09-24-dsh-plugin-ecosystem-research.md)。
3. **研究类型覆盖**（研究，**用户带题驱动**：真人 HITL、类型 ≠ 首场）——兼观察面 GUI 化的
   真人档验收 + 证据可靠性面的 run 级验收（bundle 含 audit.md 且佐证结构达标）+ 交互卡片
   真人体验 + 研究状态界面真人目验；顺手取证 synthesizer/floor 重估证据。
   RFC = [2026-09-25-research-type-coverage](notes/proposed/2026-09-25-research-type-coverage.md)。

（已毕业离队 2026-09-25：研究状态界面（人性化活动流+噪音过滤=UI 核心交付[15 行活动/零残留]；bundle 渐进面部分交付如实记档[workspaceFiles 路径未接通]——RFC 迁 implemented/）；
观察面补全（共享折算 run-fold.ts + 渐进面挂载——部分交付如实记档：渲染骨架与折算正本落地，真数据上屏待 workspaceFiles 目录发现——RFC 迁 implemented/）；
研究交互设计（HITL1/2 结构化选项卡[一次三问+推荐位，真模型实测 PASS]+研究语义工具卡[spawn/web_search，toolview priority -1]——RFC 迁 implemented/）；
证据可靠性面（七字段契约+交叉验证纪律+evidence-audit 机械对账——基线审计：首场 run 102/102 URL 全溯源无伪造、31 份全无 frontmatter 如实揭出；RFC 迁 implemented/）；
观察面 GUI 化（D18 单点例外 + 双半构建链 + journal 流页签 + 活标题/HITL 折算 + client-load-smoke 7/7——RFC 迁 implemented/，真人档延期给当前条目互指）；
升 pin 重校（`dsh-v0.1.5-rc.2` → **`dsh-v0.1.7-rc.2`** @ `477b4f4205`，
跨六个 RC；preset 重设计迁移 + 0.1.7 构建产物 + 逐条重审——RFC 迁 implemented/，证据 =
[复核结论](notes/implemented/2026-09-25-vendor-pin-bump-017rc2.md#升-pin-复核结论2026-09-25-毕业)）；
首个完整研究 run（L4 四判据全闭 + Q2/Q4/Q5/Q6 销账，run = drt_cn-us-cpu-gap）与 M2 收口与复盘
（八件清单毕）——六份 RFC 迁 implemented/，证据 = 各 RFC §实施记录；E1 通道回归排查同日毕业。）

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件（现状） |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌）——[RFC](notes/proposed/2026-09-24-ui-skin.md) | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤）；与观察面边界已辨析 | 首个完整 run 通过（✓）+ 有 demo 需求（✗ 等用户点名） |
| 专职 synthesizer 角色——[RFC](notes/proposed/2026-09-24-synthesizer-role.md) | Q4 已销账：单场 run 实测 lead 独任综合无过载 | run 实测综合负载过高（✗；多 run 后重估） |
| floor 数值门禁机械化——[RFC](notes/proposed/2026-09-24-floor-gates.md) | Q6 已销账：critic 散文审查实证有效，数值 floor 有假绿风险 | run 出现质量滑坡实证（✗；多 run 后重估） |
| keyless 录制快照面——[RFC](notes/proposed/2026-09-24-keyless-snapshot-lane.md) | 模型/用户可见输出靠真挂载+真模型档取证，成本较高；E1 教训 = 该二包只可作 devDep | 需要「输出快照」级 keyless 回归时（✗；**0.1.7 `retired-tools` 钉法已降复活成本**；观察面落地后渲染改动频繁则重估） |
| 许可证（LICENSE）——[RFC](notes/proposed/2026-09-24-license.md) | 本仓 `private: true` 未对外分发（**未决非遗漏**） | 对外分发/发布 pack 前（✗ 等用户分发计划） |
