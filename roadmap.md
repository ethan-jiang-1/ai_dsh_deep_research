# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。

## 队列

1. ▶ **升 pin 重校**（⟳ 触发型 → **2026-09-25 已触发，执行中**）——`dsh-v0.1.5-rc.2` →
   **`dsh-v0.1.7-rc.2`**（`477b4f4205`，跨六个 RC）；含 0.1.7 preset 重设计的形态迁移
   （`@deepseek-ai/dsh-agent-presets` 整包删除 → `dsh-agent-preset` 行内 `config.plugins`）。
   三阶段：① 机械 + 台账（门禁绿，L1/L2/真模型档预期红）② preset 形态迁移（L1/L2 绿）
   ③ 逐条重审 + 真模型档三脚本绿 + 复核结论。
   RFC = [2026-09-25-vendor-pin-bump-017rc2](notes/proposed/2026-09-25-vendor-pin-bump-017rc2.md)。
2. **观察面 GUI 化**（feature，M3 初排升位——前置"run 实测后立项"已满足；用户验收可调）——
   右栏「研究状态」页签（流程步骤条 + 活标题"⏳ 等你拍板" + journal→矩阵→review 渐进）+
   研究语义工具卡（C）+ D7 修订（限定观察面用途）+ 双半构建链（tsdown 契约照抄 company）+
   client-load-smoke 完成定义。材料 = notes/research/2026-09-24-ui-observability-surfaces.md。

（已毕业离队 2026-09-25：首个完整研究 run（L4 四判据全闭 + Q2/Q4/Q5/Q6 销账，run =
drt_cn-us-cpu-gap）与 M2 收口与复盘（八件清单毕）——六份 RFC 迁 implemented/，证据 =
各 RFC §实施记录；E1 通道回归排查同日毕业。M3 其余顺延项：观察面 GUI 化已升位。）

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件 |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌） | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤） | 首个完整 run 通过 + 有 demo 需求 |
| 专职 synthesizer 角色 | 缺实测证据（Q4） | 首个 run 实测 lead 综合负载过高 |
| floor 数值门禁机械化 | 缺实测证据（Q6）；keyless 断言有假绿风险 | 首个 run 出现质量滑坡实证 |
| keyless 录制快照面（session 回放 fixture） | 模型/用户可见输出目前靠真挂载冒烟 + 真模型档取证，成本较高且无快照级回归 | 需要「输出快照」级 keyless 回归时（vendor 的 dsh-session-snapshot / llm-replay 路线；E1 时曾误引入为解析依赖，已核销） |
| 许可证（LICENSE） | 本仓 `private: true` 未对外分发（vendor 是 MIT，我们尚无 license 字段——**未决非遗漏**） | 对外分发/发布 pack 前定许可证并加 `LICENSE` + package.json `license` 字段 |
