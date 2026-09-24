# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。

## 队列

1. ▶ **首个完整研究 run**（feature，M2）——端到端最薄直跑（HITL1→侦察→挖掘→综合→critic→HITL2→final+present；L4 全量四判据随 run 闭）。
   四份 RFC 全 approved（已落地，记录见各 RFC 文末）：[2026-09-24-m2-plan-shape](notes/proposed/2026-09-24-m2-plan-shape.md) / [2026-09-24-m2-data-caliber](notes/proposed/2026-09-24-m2-data-caliber.md) / [2026-09-24-m2-run-dashboard](notes/proposed/2026-09-24-m2-run-dashboard.md)；
   活跃 RFC = [2026-09-24-m2-run-mechanics](notes/proposed/2026-09-24-m2-run-mechanics.md)——起跑至 HITL1 挂起（快照与重启配方 = 该 RFC §暂停点记录）。
2. **M2 收口与复盘**（卫生，run 完成后同 diff 收尾）——L4 四判据证据落 Note；Q2/Q4/
   Q5/Q6 销账（答案+证据进 00-index 待定表）；company D18 复核结论；搁置池三条复活条件到期
   复审（专职 synthesizer=Q4 / floor 机械化=Q6 / UI 皮肤=run 通过+demo 需求）；实测新
   发现 → 队列新条目（skill/persona/模板修订类）；打扫（dev home 磁盘残留、runs 证据
   留存策略执行——runtime truth 不进 git、Note 记路径与抽查结果）；M3 重排（顺延元
   工作的复活顺序按实测证据定）；docs 面改动 → 入口链探针必跑。
3. **debug-dashboard-plus**（feature 小件，零 client 代码）——仪表盘多 run 场扫描
   （research-workspace/runs + dev/harness-home/runs，ad-hoc 场不再裸奔）+ 流程步骤条
   （文件推导+当前步高亮）+ **HITL 等待横幅**（读 lead 会话日志检测 open ask_user_question
   →"⏳ 等你拍板" + 静默期反向提示）+ deep-link。设计依据 = notes/research/
   2026-09-24-ui-observability-surfaces.md §3.1/§7（2026-09-24 用户定：入队不做，run 收口后实施）。
4. **观察面 GUI 化**（feature，run 实测后立项）——右栏「研究状态」页签（流程步骤条 +
   活标题"⏳ 等你拍板" + journal→矩阵→review 渐进）+ 研究语义工具卡（C）+ D7 修订
   （限定观察面用途）+ 双半构建链（tsdown 契约照抄 company）+ client-load-smoke 完成
   定义。时机 = 2026-09-24 用户定：run 后（D 接住 run 期间观察需求，构建链成本让 run
   实测说话）；材料同上 note。
5. **vendor-submodule-and-pnpm-dsh**（feature）——加 pinned submodule（tag
   `dsh-v0.1.5-rc.2` @ `fb2c4b9e`）+ workspace 五件套 + `pnpm dsh` 从钉住源码起会话；
   verify 加 vendor-pin/clean 门禁；机制权威从"借用 company checkout"切回本仓 vendor
   （preset-smoke/release-smoke 的 DSH_SRC 随之切换）。D10 偏离随本条目销账。
6. **dsh-discipline 全量枚举**（卫生，「vendor-submodule-and-pnpm-dsh」落地后）——从 vendor
   逐源枚举纪律清单（根 AGENTS.md / docs/AGENTS.md / docs/testing.md / .agents/notes/ /
   postmortem），每行 = DSH 做法 → 本仓落点 → 状态（照搬/带证据适配/不适用+理由），替换
   AGENTS.md 的首版枚举子集表；源头清单照 company 五件套研究 §六之 1。
7. **entry-chain-probe**（卫生）——真模型档脚本：全新上下文只读入口链（唯一正本 = 根
   AGENTS.md §入口链，5 步）答 N 个**时不变问法**的"现在"问题，零过期零自相矛盾；
   每 feature 条目收尾跑（company 探针的已知盲区：问句期望也会过期——问法必须时间不变）。
   语义版已人工执行过两次（2026-09-24 定向 + 定点回归，见 implemented Note），本条目 = 脚本化 + 制度化节奏。
8. **升 pin 重校**（⟳ 触发型）——`sync-dsh` 升 pin 时流程合同对 vendor 重校一遍
   （继承跟 pin 走；触发时进队，平时不占位）。

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件 |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌） | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤） | 首个完整 run 通过 + 有 demo 需求 |
| 专职 synthesizer 角色 | 缺实测证据（Q4） | 首个 run 实测 lead 综合负载过高 |
| floor 数值门禁机械化 | 缺实测证据（Q6）；keyless 断言有假绿风险 | 首个 run 出现质量滑坡实证 |
