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
  [`../_archive/research/`](../_archive/research/README.md)，文件名与证据正文保留，修复搬迁所需链接；最后一个活跃消费者离开后迁出。已有关联下游消费者的材料继续留在活跃 research，并登记全部消费者。

## 索引

| 文件 | 服务 | 一句话 |
|---|---|---|
| [2026-10-08-notes-stocktake.md](2026-10-08-notes-stocktake.md) | [notes-stocktake implemented Note](../../notes/implemented/2026-10-08-notes-stocktake.md) | 72 篇 implemented 三结局体检：**结论 = 归档判据本身不可靠**——宽口径 72/72 全留、严格口径 23 归档、对抗证伪 8/8 打回；硬数据 = 72 篇 / 61 家族（检索不靠猜）/ archived 自 09-28 后零归档；根因 = 进门条件无可执行面（verify.mjs 里 archived 仅 2 处注释） |
| [strategy-benchmark/2026-10-03-strategy-benchmark-sources.md](strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) | [pipeline-polish issue](../_archive/settled_issues/2026-09-28-pipeline-polish.md) | 专业 DR 三轴对标材料：源仓 research_style_params 全参数化 + Anthropic 工程自述一手 + OpenAI 系统卡物种边界；采纳候选 A/B 带触发条件 |
| [strategy-benchmark/2026-10-06-per-topic-card-distribution.md](strategy-benchmark/2026-10-06-per-topic-card-distribution.md) | [策略对标材料](strategy-benchmark/2026-10-03-strategy-benchmark-sources.md) | 候选 A ①步存量标定：25 场可数 / 68 primary topic，中位 13、p25=6、max=53，低于源仓地板 28/68（双条件未满足不立门）；quick_factual 型 6 场口径不可数（无 primary 标记） |
