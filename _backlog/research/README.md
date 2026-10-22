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

（三条已随消费者毕业迁入 [_archived/research/](../_archived/research/)：notes-stocktake 体检 + strategy-benchmark 两份。）

- [2026-10-21-method-library-main-surface.md](2026-10-21-method-library-main-surface.md) — 方法库管理迁到主界面：conversation.view seam、UX 分工、W1 保存（消费者：[issue](../_archived/settled_issues/2026-10-21-method-library-main-surface.md)）。

- [dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md](dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md) — 动态研究 DAG 与多层 subagent 编排（消费者：[_archived/settled_issues/2026-10-21-dynamic-research-dag.md](../_archived/settled_issues/2026-10-21-dynamic-research-dag.md)）。
- [dynamic-research-dag/2026-10-21-dsh-plugin-dag-practices.md](dynamic-research-dag/2026-10-21-dsh-plugin-dag-practices.md) — DSH 插件生态与外部的动态 DAG 实践（同一消费者）。
- [dynamic-research-dag/2026-10-21-breadth-depth-research-cells.md](dynamic-research-dag/2026-10-21-breadth-depth-research-cells.md) — 宽搜/深搜的深度模型与研究单元（同一消费者）。
- [dynamic-research-dag/2026-10-21-deepseek-search-fetch-api.md](dynamic-research-dag/2026-10-21-deepseek-search-fetch-api.md) — DeepSeek Search/Fetch API 与 DSH provider（同一消费者）。
- [dynamic-research-dag/2026-10-21-search-provider-ab.md](dynamic-research-dag/2026-10-21-search-provider-ab.md) — Messages vs Search API 的 5-query A/B（同一消费者）。
- [dynamic-research-dag/2026-10-21-cockpit-plan-graph.md](dynamic-research-dag/2026-10-21-cockpit-plan-graph.md) — 侧栏「研究图谱」页签的数据源、布局与交互设计（同一消费者）。
- [dynamic-research-dag/2026-10-21-combination-review.md](dynamic-research-dag/2026-10-21-combination-review.md) — A0 组合的决策级 review：一致性矩阵、三处修正、改动面与验收（同一消费者）。
- [dynamic-research-dag/2026-10-22-w-work-package-identity-review.md](dynamic-research-dag/2026-10-22-w-work-package-identity-review.md) — W 工作包身份卡的第二个 reviewer 评审：§1 事实核对全属实 + B1–B4 定稿前修正 + S1–S7 建议 + 八问结论（消费者：[issue](../issues/2026-10-22-w-work-package-identity.md)）。

（2026-10-18 方法配置两份材料已随消费者毕业迁入 [_archived/research/](../_archived/research/)：外部先例与真模型 A/B。）
