# research/ · 问题卡的调研依据

为 [issues](../issues/README.md) 与 [bugs](../bugs/README.md) 收集较长的事实阅读、综述、实验和机制依据。短结论写回消费卡，卡链接材料；半成品允许保留在活跃区。总流程见 [_backlog 入口](../README.md)。

## 契约

- **收什么**：服务活跃卡、值得保留的调研材料——推敲时攒的、被卡引用的、喂毕业判断的；
  半成品合法。
- **不收什么**：抛弃型草稿（按 [AGENTS.md](../../AGENTS.md) 留在树外）；价值越过所有卡
  的留存型参考（留存语义归 docs 索引——[00-index §外部研究材料](../../docs/00-index.md)）。
- **命名**：`YYYY-MM-DD-<slug>.md`（与卡同款日期编码），slug 指向它服务的卡或主题；卡链接它。
  **按主题分子目录**：同主题的多份材料放入同一子目录；单份材料可留区根。索引记录含子目录路径。
- **新研究的 frontmatter**：字段顺序为 `topic`、`intent`，不写 `status`。topic 使用简短主题名；intent 用一行说明材料存在的用途，不替代证据正文。既有材料迁移只在需要时补这两项元数据，正文保留。
- 每份研究材料须由本 README 的索引点名，索引记录当前消费者；链接与索引结构按本仓 `pnpm verify` 实际检查范围维护。
- **生命周期——随卡走**：卡毕业时 `git mv` 到
  [`../_archived/research/`](../_archived/research/README.md)，文件名与证据正文保留，修复搬迁所需链接；最后一个活跃消费者离开后迁出。已有关联下游消费者的材料继续留在活跃 research，并登记全部消费者。

## 索引

| 文件 | 服务 | 一句话 |
|---|---|---|
| [2026-10-10-company-drift-review.md](2026-10-10-company-drift-review.md) | [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md) | company 漂移复核（59551f2→b19e9ed，7 提交）：五簇全维持、证据锚零腐烂（run-gates/release.md 区间零 diff）；三条吸收候选登记（事实阻塞闸门 HITL 高价值）；重钉 b19e9ed 落地 |
| [2026-10-10-bare-path-audit.md](2026-10-10-bare-path-audit.md) | [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md) | 裸路径死指针盘点：主范围 30.6% 死中**真断链仅 16 条（2.5%）**、浅引用是风格大头；7 处改写清偿 + 9 处裁定为占位符/假想/自注；**处置 = 不立通用门禁**（无消费者/存量小/重叠），重启条件已登记 |
| [2026-10-10-preset-config-audit.md](2026-10-10-preset-config-audit.md) | [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md) | preset config 面对照盘点（vendor config-catalog 正本）：**零漂移不需要修**——全部硬性必填字段在场、preset 间共享值逐字一致；未声明可用面登记备查 |
| [2026-10-10-external-repin-review.md](2026-10-10-external-repin-review.md) | [company 钉版复核 Note](../../notes/implemented/2026-10-09-company-repin-review.md) | 两笔钉版债复核：二代语料（24 提交六吸收面全维持）+ ai_dsh_assitant（141 提交核心维持、钉版行描述须改述）——重钉 ad6f5319dc / 202a27b 已落地 |
| [2026-10-10-teammate-channel-probe.md](2026-10-10-teammate-channel-probe.md) | [member-activity-stream 卡](../issues/2026-10-09-member-activity-stream.md) | 队员动作流三通道 vendor 同 pin 实测（rc.2 源码锚点）：session.follow = 任意会话可 follow、journal 同词表、无已知并发上限——**唯一动作粒度通道**；agentTeam 投影 = roster+任务板+turn 级 running（无动作级事件），但它是**队员会话 id 唯一发现源**（spawn_teammate 返回已证不带 id）；新 @Remote = typert 生成步硬前置、仓外零先例、当前不采纳 |
| [2026-10-08-notes-stocktake.md](2026-10-08-notes-stocktake.md) | [notes-stocktake implemented Note](../../notes/implemented/2026-10-08-notes-stocktake.md) | 72 篇 implemented 三结局体检：**结论 = 归档判据本身不可靠**——宽口径 72/72 全留、严格口径 23 归档、对抗证伪 8/8 打回；硬数据 = 72 篇 / 61 家族（检索不靠猜）/ archived 自 09-28 后零归档；根因 = 进门条件无可执行面（verify.mjs 里 archived 仅 2 处注释） |
| [strategy-benchmark/2026-10-03-strategy-benchmark-sources.md](strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) | [pipeline-polish issue](../_archived/settled_issues/2026-09-28-pipeline-polish.md) | 专业 DR 三轴对标材料：源仓 research_style_params 全参数化 + Anthropic 工程自述一手 + OpenAI 系统卡物种边界；采纳候选 A/B 带触发条件 |
| [strategy-benchmark/2026-10-06-per-topic-card-distribution.md](strategy-benchmark/2026-10-06-per-topic-card-distribution.md) | [策略对标材料](strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) | 候选 A ①步存量标定：25 场可数 / 68 primary topic，中位 13、p25=6、max=53，低于源仓地板 28/68（双条件未满足不立门）；quick_factual 型 6 场口径不可数（无 primary 标记） |
