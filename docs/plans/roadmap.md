# roadmap — 队列（接下来）+ 搁置池

> 层：计划（接下来）。**纯队列**：条目按主题命名、完成即离队（历史归 notes/ + git，
> 队列里看不见它）；▶ 即当前条目——全仓唯一"当前"指针。条目三型：**feature / 卫生 / 研究**。
> 队列 = 有序索引（本文件，每行 ≤3 行）；条目全文（问题/方案/输掉的方案/验收）住
> `notes/proposed/` 的 RFC（一文件一条目）；生命周期 = 索引行 → RFC → Plan Mode 呈批 →
> 实施（todo 面板）→ 同 diff 收尾（RFC 毕业到 implemented/ + 队列行删除）。

## 队列

1. ▶ **web-tool-rows 实证**（feature，M1 收口件）——bundle/preset 的 web 三行
   （tool-web / web-search / web-fetch）对照 vendor shipped web-app bundle 核对 id/config
   与搜索 provider 是否需 key；验收 = preset-smoke 真跑时 web 工具在四角色会话在场。
   开放问题 Q1（00-index 待定表）随本条目闭。
2. **vendor-submodule-and-pnpm-dsh**（feature）——加 pinned submodule（tag
   `dsh-v0.1.5-rc.2` @ `fb2c4b9e`）+ workspace 五件套 + `pnpm dsh` 从钉住源码起会话；
   verify 加 vendor-pin/clean 门禁；机制权威从"借用 company checkout"切回本仓 vendor。
   D10 偏离随本条目销账。
3. **preset-smoke 真跑**（feature，M1 的 L1 面）——boot 真会话逐角色 session/create，
   断言 persona/skills/工具面挂载（对照 company preset-smoke.mjs 的 boot 流程）；
   验收 = 四角色全绿。开放问题 Q2 随本条目闭。
4. **release-smoke**（feature，M1 的 L2 面）——`npm pack` → 干净 DSH_HOME profile →
   `dsh plugin add` → 会话列出四角色；验收 = 安装零缺失警告 + roster 全。
   开放问题 Q3 随本条目闭。
5. **L4-lite 真模型冒烟**（feature，M1 的 L4-lite 面）——每角色一条消息（presence 档
   ~$1 量级）；验收 = 模型响应 + 工具调用真实发生。
6. **dsh-discipline 全量枚举**（卫生，R2 vendor 落地后）——从 vendor 逐源枚举纪律清单
   （根 AGENTS.md / docs/AGENTS.md / docs/testing.md / .agents/notes/ / postmortem），
   每行 = DSH 做法 → 本仓落点 → 状态（照搬/带证据适配/不适用+理由），替换 AGENTS.md
   的枚举子集表；源头清单照 company 五件套研究 §六之 1。
7. **entry-chain-probe**（卫生）——认证档脚本：全新上下文只读入口链（AGENTS → 00-index →
   队列）答 N 个**时不变问法**的"现在"问题，零过期零自相矛盾；每 feature 条目收尾跑
   （company 探针的已知盲区：问句期望也会过期——问法必须时间不变）。
8. **首个完整研究 run**（feature，M2）——真实问题端到端：HITL1 → 侦察 → 挖掘 → 综合 →
   critic → HITL2 → final.md + present；L4 全量四判据（来源链抽查/两点纪律/静默自主/
   中断恢复）；Q4（synthesizer 拆分）Q5（topic 争用）Q6（floor 是否需要机械化）随实测闭。
9. **升 pin 重校**（⟳ 触发型）——`sync-dsh` 升 pin 时流程合同对 vendor 重校一遍
   （继承跟 pin 走；触发时进队，平时不占位）。

## 搁置池（缺上游 seam 或缺明确需求才进池；被否决的方案不进池；复活条件写进行内）

| 条目 | 进池原因 | 复活条件 |
|---|---|---|
| UI 皮肤（client 面 + slots 品牌） | 核心研究流未稳，皮肤是表现层（company 到 R5 才做皮肤） | 首个完整 run 通过 + 有 demo 需求 |
| 专职 synthesizer 角色 | 缺实测证据（Q4） | 首个 run 实测 lead 综合负载过高 |
| floor 数值门禁机械化 | 缺实测证据（Q6）；keyless 断言有假绿风险 | 首个 run 出现质量滑坡实证 |
