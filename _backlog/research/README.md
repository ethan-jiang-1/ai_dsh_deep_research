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

（2026-10-27 数据契约材料已随卡迁入 [_archived/research/data-contract/](../_archived/research/data-contract/2026-10-27-dsh-data-plane-digest.md)。）
（2026-10-25 运行形态合同材料已随消费者迁入 [_archived/research/](../_archived/research/)；三条旧材料同迁：notes-stocktake 体检 + strategy-benchmark 两份。）


- [method-library-cocreation/2026-10-29-method-library-background.md](method-library-cocreation/2026-10-29-method-library-background.md) — 方法库是什么：概念/四字段/内置参考/默认/从 run 沉淀/演进史/术语表（消费者：[issue](../issues/2026-10-29-method-library-workbench-redesign.md)）。
- [method-library-cocreation/2026-10-29-dsh-plugin-borrowing-and-rationale.md](method-library-cocreation/2026-10-29-dsh-plugin-borrowing-and-rationale.md) — 对 DSH 现成机制（preset/skill/tool/client-plugin/slot/conversation/theme）的借用清单、每项理由与否决备选（消费者：[issue](../issues/2026-10-29-method-library-workbench-redesign.md)）。
- [method-library-cocreation/2026-10-29-option-a-scroll-and-intelligence.md](method-library-cocreation/2026-10-29-option-a-scroll-and-intelligence.md) — 方案 A 的滚动规格（17+6 种情形）、对话智力体能力/协议、模式与方案切换的状态对齐矩阵（消费者：[issue](../issues/2026-10-29-method-library-workbench-redesign.md)）。
- [method-library-cocreation/2026-10-29-ux-redesign.md](method-library-cocreation/2026-10-29-ux-redesign.md) — 方法库工作台交互重设计：A（草稿卡在上/对话在下）vs B（表单+抽屉）的 SVG 视觉稿与状态呈现（消费者：[issue](../issues/2026-10-29-method-library-workbench-redesign.md)）。


（2026-10-24 用户判断落地材料不再服务活跃卡：`reader-final/` 两份随可读终稿两卡迁入 [_archived/research/reader-final/](../_archived/research/reader-final/2026-10-23-reader-final-design.md)；`2026-10-21-method-library-main-surface.md` 随已结卡迁入 [_archived/research/](../_archived/research/2026-10-21-method-library-main-surface.md)。）

（2026-10-18 方法配置两份材料已随消费者毕业迁入 [_archived/research/](../_archived/research/)：外部先例与真模型 A/B。）

（2026-10-23 D28 缺口收口卡已结：其 P0 证据 `d28-witness-binding/` 随卡迁入 [_archived/research/](../_archived/research/d28-witness-binding/2026-10-23-p0-witness-receipts.md)。）

（2026-10-23 rerun 不满转接卡已结：其验收证据 `rerun-triage/` 随卡迁入 [_archived/research/](../_archived/research/rerun-triage/2026-10-23-acceptance-evidence.md)。）

（2026-10-29 归档：已结/已交付的调研已迁入 [_archived/research/](../_archived/research/README.md)——dynamic-research-dag、run-bundle-charter、retrieval-backend 与 method-library 的 2026-10-28 会话调研；活跃区只留服务当前 issue 的方法库 2026-10-29 两份与 `ux/` 视觉稿。）
