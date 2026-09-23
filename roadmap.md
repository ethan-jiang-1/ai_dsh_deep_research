# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。

## 队列

1. ▶ **首个完整研究 run**（feature，M2）——真实问题端到端：HITL1 → 侦察 → 挖掘 → 综合 →
   critic → HITL2 → final.md + present；L4 全量四判据（来源链抽查/两点纪律/静默自主/
   中断恢复）；Q2（team 成员 preset 组合）Q4（synthesizer 拆分）Q5（topic 争用）
   Q6（floor 机械化）随实测闭。**开工前置：计划先落 notes/proposed/ RFC（可切多件）→
   用户审阅打磨 → 呈批后才实施**。（2026-09-24 用户定案：实质优先，提前至
   vendor-submodule 之前；元工作顺延待实战证据反哺。）
2. **vendor-submodule-and-pnpm-dsh**（feature）——加 pinned submodule（tag
   `dsh-v0.1.5-rc.2` @ `fb2c4b9e`）+ workspace 五件套 + `pnpm dsh` 从钉住源码起会话；
   verify 加 vendor-pin/clean 门禁；机制权威从"借用 company checkout"切回本仓 vendor
   （preset-smoke/release-smoke 的 DSH_SRC 随之切换）。D10 偏离随本条目销账。
3. **dsh-discipline 全量枚举**（卫生，「vendor-submodule-and-pnpm-dsh」落地后）——从 vendor
   逐源枚举纪律清单（根 AGENTS.md / docs/AGENTS.md / docs/testing.md / .agents/notes/ /
   postmortem），每行 = DSH 做法 → 本仓落点 → 状态（照搬/带证据适配/不适用+理由），替换
   AGENTS.md 的首版枚举子集表；源头清单照 company 五件套研究 §六之 1。
4. **entry-chain-probe**（卫生）——真模型档脚本：全新上下文只读入口链（AGENTS → 00-index →
   队列 → evaluation.md，四文件）答 N 个**时不变问法**的"现在"问题，零过期零自相矛盾；
   每 feature 条目收尾跑（company 探针的已知盲区：问句期望也会过期——问法必须时间不变）。
   语义版已人工执行过两次（2026-09-24 定向 + 定点回归，见 implemented Note），本条目 = 脚本化 + 制度化节奏。
5. **升 pin 重校**（⟳ 触发型）——`sync-dsh` 升 pin 时流程合同对 vendor 重校一遍
   （继承跟 pin 走；触发时进队，平时不占位）。

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件 |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌） | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤） | 首个完整 run 通过 + 有 demo 需求 |
| 专职 synthesizer 角色 | 缺实测证据（Q4） | 首个 run 实测 lead 综合负载过高 |
| floor 数值门禁机械化 | 缺实测证据（Q6）；keyless 断言有假绿风险 | 首个 run 出现质量滑坡实证 |
