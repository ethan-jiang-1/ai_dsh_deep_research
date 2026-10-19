# triggers.md · 活触发条件索引

> 这是可选的短索引，不是计划池、授权来源或额外检查门。只登记工作中自然可见、容易遗漏且一旦出现会改变既有决定的具体观察；触发条件的完整理由仍留在其 owner 卡片或 Note。
>
> 收割、走查或阶段收口时，按需扫本表。触发后先依据原记录重开判断，再更新或移除本行；不得把“以后”“用户点名”等泛化愿望写成触发器。空表是合法状态。

| 对象 | 当前决定 | 具体观察（出现位置） | owner |
|---|---|---|---|
| Cockpit 与 Dashboard 合并 | 暂不合并；当前互跳足够，产品级整合证据不足 | 任一场 run 记录到“必须在 Web 外查看进度”这一具体观察，或用户明确要求产品级整合；run 证据写入对应交付记录 | [settled issue](./_archived/settled_issues/2026-10-07-cockpit-dashboard-merge.md) |
| 外部参考仓钉版漂移 | 00-index §外部研究材料的钉版 = 复核时点 HEAD；比对不一致 = 「上游已前进、结论待复核」态 | 升 pin 或引用外部材料复核时，`git -C <参考仓> log -1 --format=%h` 与 00-index 钉版比对不一致 | [00-index §外部研究材料](../docs/00-index.md) + [discipline-map §重审触发路径](../docs/discipline-map.md) |
| 文档承诺的动作缺工具 | 遇到即按同一形状补工具（已落一件：续跑唤醒 = `run-kickoff --session`，自带送达对账）；判据 = 该动作能被仓库里的命令复跑，而不是只能当场写脚本 | 手册/指南里出现「发一句即…」「点一下即…」「按…即…」式承诺动作，而 `scripts/`、`dev/` 下搜不到对应命令入口 | [settled issue](./_archived/settled_issues/2026-10-11-recovery-action-instrument-gap.md) |
| 上游流畸形复现（直连路径） | 直连路径已实证复发（2026-10-13 根因 = 边缘对长命复用连接的相位性故障，[postmortem](../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md)）；**已落地 socket 隔离**（`dev/llm-socket-isolation.cjs`：LLM 流每请求一次性连接、永不复用——重试升级无益、专池复用无样本，均不采纳） | 若隔离下再现 `event precedes message_start` 风暴：先重启通道，再核隔离预载在场（web.log 检索 `llm-socket-isolation`），然后挂取证工具抓字节——勿以错误字符串推断归因 | [postmortem](../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md) |
| 网络零干预边界 | 本仓不探测网络形态、不设代理 env、不起代理进程、不给浏览器传代理参数（2026-10-13 全拆） | TUN/fake-IP 态再现 `web_fetch` 全域被 SSRF 拒（按环境问题处理：换网络/等直连）；或有人提议恢复出口代理/自旋代理——重议先读重启条件，不得擅自回补 | [网络零干预 Note](../notes/rejected/2026-10-13-network-vanilla-restore.md) |
| verify.mjs 文件级/域级拆分 | **不拆**（2026-10-13 裁决：域重组落地、文件级拆分输掉） | 门禁继续增长使**同一轮反复改同一文件多处门禁**成为实测痛点，或单文件规模/审查成本出现可举证的退化（核 verify.mjs 的 gates 追加块数与单次改动的编辑摩擦） | [verify-domain-regroup Note](../notes/implemented/2026-10-13-verify-domain-regroup.md) |
| tests/ 分域 | **不分域**（单目录平铺；2026-10-05 裁决） | 找测试开始靠猜（要翻目录才知道某断言住哪），或 `tests/*.test.mjs` 文件数显著上升（出现时以实测数字与检索耗时为准） | [test-asset-organization Note](../notes/implemented/2026-10-05-test-asset-organization.md) |
| 交付工件形态（非六段/非缩略首屏） | 暂不扩：只补「表格档」到重议（P2 需要）；首屏骨架仍两种 | 出现第二个需要非六段/非缩略形态的题型（时间线／矩阵），或 P2 类题占比明显上升 | [研究配置总卡 §未决与重议条件](_archived/settled_issues/2026-10-18-research-method-config-ux.md) |
| 领域包升格为字段（四 → 六） | 不改字段：领域差异先落在四处内容（一手源／口径／冲突裁决／工件与免责） | 出现「用户手写的领域包与实际执行明显不符」的真实 run，或同一行业重复 ≥2 次被要求同一套口径 | [研究配置总卡 §未决与重议条件](_archived/settled_issues/2026-10-18-research-method-config-ux.md) |
| 方法库增长纪律（命中计数／休眠） | 暂不做：仿判型库增长协议，等库里出现第一条「再也没用过」的条目 | 库条目 >5 且无任何命中记账 | [研究配置总卡 §未决与重议条件](_archived/settled_issues/2026-10-18-research-method-config-ux.md) |
| 方法库规模能力（分组／搜索／导入导出／跨工作区） | 暂不做 | 单库条目 >12（与判型库的拆分阈值同款） | [研究配置总卡 §未决与重议条件](_archived/settled_issues/2026-10-18-research-method-config-ux.md) |
| 保存指令优先级（账号级 < 工作区级 < 本次 < 当场明确） | 不定义：HITL1 用户原话优先已写在 research-brief skill，其余零证据 | 出现同一用户在不同层级给了冲突指令、且 Lead 的取舍被质疑的真实 run | [研究配置总卡 §未决与重议条件](_archived/settled_issues/2026-10-18-research-method-config-ux.md) |
| 语料基线漂移（`_digested/` 落后 pin） | 2026-10-19 pin bump 到 `687f282e86`（0.2.1-rc.2）时**未重跑** `_digested/`，语料仍自报 `639ed01539`（v0.2.0-rc.2）。已如实登记「待更新」，不假装已对齐（裁决见 [语义漂移卡 §裁决 4](_archived/settled_issues/2026-10-19-discipline-map-semantic-drift.md)） | ① **下次 pin bump 时必须重跑** `_digested/`；② 出现「语料结论与本仓现状冲突」的实例时立即重跑 | [00-index §外部研究材料](../docs/00-index.md) |
| 台账 `owns` 截断（139–140 字） | 46/108 条被硬截断，完整原文仓内无第二份、**不可补回**；已加 `ownsTruncated: true` 标记 + `_ownsTruncation` 说明，措辞一律以 `vendor/dsh/<source>` 原文为准（裁决见 [语义漂移卡 §裁决 3](_archived/settled_issues/2026-10-19-discipline-map-semantic-drift.md)） | 需要按 `owns` 做语义复核时（而非仅存在性对账），必须先读原文——若出现「直接依据 `owns` 下结论导致误判」的实例，改存结构化锚点（源文件 + 节/行） | [docs/alignment-ledger.json](../docs/alignment-ledger.json) |
