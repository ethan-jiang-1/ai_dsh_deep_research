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

（2026-10-25 运行形态合同材料已随消费者迁入 [_archived/research/](../_archived/research/)；三条旧材料同迁：notes-stocktake 体检 + strategy-benchmark 两份。）

- [dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md](dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md) — 动态研究 DAG 与多层 subagent 编排（消费者：[_archived/settled_issues/2026-10-21-dynamic-research-dag.md](../_archived/settled_issues/2026-10-21-dynamic-research-dag.md)）。
- [dynamic-research-dag/2026-10-21-dsh-plugin-dag-practices.md](dynamic-research-dag/2026-10-21-dsh-plugin-dag-practices.md) — DSH 插件生态与外部的动态 DAG 实践（同一消费者：已结宪章卡 + implemented RFC）。
- [dynamic-research-dag/2026-10-21-breadth-depth-research-cells.md](dynamic-research-dag/2026-10-21-breadth-depth-research-cells.md) — 宽搜/深搜的深度模型与研究单元（同一消费者：已结宪章卡 + implemented RFC）。
- [dynamic-research-dag/2026-10-21-deepseek-search-fetch-api.md](dynamic-research-dag/2026-10-21-deepseek-search-fetch-api.md) — DeepSeek Search/Fetch API 与 DSH provider（同一消费者：已结宪章卡 + implemented RFC）。
- [dynamic-research-dag/2026-10-21-search-provider-ab.md](dynamic-research-dag/2026-10-21-search-provider-ab.md) — Messages vs Search API 的 5-query A/B（同一消费者：已结宪章卡 + implemented RFC）。
- [retrieval-backend/2026-10-27-provider-audit.md](retrieval-backend/2026-10-27-provider-audit.md) — 检索底座落地证据（D30/D31）：工具级真模型 A/B、1,995 会话自然实验、5 非品牌 query 盲评、Fetch 抽样与回退价值（§9）；续写上面两份 2026-10-21 材料（消费者：D30 + pack 默认）。
- [dynamic-research-dag/2026-10-21-cockpit-plan-graph.md](dynamic-research-dag/2026-10-21-cockpit-plan-graph.md) — 侧栏「研究图谱」页签的数据源、布局与交互设计（同一消费者：已结宪章卡 + implemented RFC）。
- [dynamic-research-dag/2026-10-21-combination-review.md](dynamic-research-dag/2026-10-21-combination-review.md) — A0 组合的决策级 review：一致性矩阵、三处修正、改动面与验收（同一消费者：已结宪章卡 + implemented RFC）。
- [dynamic-research-dag/2026-10-22-w-work-package-identity-review.md](dynamic-research-dag/2026-10-22-w-work-package-identity-review.md) — 旧版 W=工作包身份卡的历史评审（已被 Wave 语义取代）：§1 事实核对全属实 + B1–B4 定稿前修正 + S1–S7 建议 + 八问结论（消费者：[issue](../_archived/settled_issues/2026-10-22-w-wave-node-identity.md)）。

- [run-bundle-charter/2026-10-23-history-decisions.md](run-bundle-charter/2026-10-23-history-decisions.md) — run bundle 宪章的历史决定时间线与七类「可能做错」判断（消费者：已结宪章卡 + [implemented RFC](../../notes/implemented/2026-10-23-run-bundle-charter.md)）。
- [run-bundle-charter/2026-10-23-practice-vs-contract.md](run-bundle-charter/2026-10-23-practice-vs-contract.md) — 53 个 bundle 的实际形态、位置矛盾、交付链断点与 readiness 可读性（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-resume-behavior.md](run-bundle-charter/2026-10-23-resume-behavior.md) — 32 个恢复/状态探针的读序、重做与写盘行为；删除/停放/退役面的实测缺口（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-red-team.md](run-bundle-charter/2026-10-23-red-team.md) — 红队：批准/present 可伪造、审计依赖 session corpus、执行现场含恢复必需状态、next 无字段（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-issue-review-verification.md](run-bundle-charter/2026-10-23-issue-review-verification.md) — 宪章卡复核：逐条复算数字、三条会改变判断的事实（跨 bundle 证据依赖 / readiness 终局与升级权 / 手册录制基线）与未复算边界（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p0-baseline.md](run-bundle-charter/2026-10-23-p0-baseline.md) — P0 历史基线：53 个旧 bundle 的只读冻结表、旧场 grandfather 规则、4 样本盲测 ground truth 哈希（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p1-position-neutral.md](run-bundle-charter/2026-10-23-p1-position-neutral.md) — P1 位置语义收口：D28（位置=操作桶）+ 四份人类文档落点、残留检查与验收（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p2-run-contract.md](run-bundle-charter/2026-10-23-p2-run-contract.md) — P2 新 run 契约：run.md 状态头、contract epoch、模板/创建程序/门禁与反证（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p3-delivery-witness.md](run-bundle-charter/2026-10-23-p3-delivery-witness.md) — P3 交付见证：presented / user-question-reply 事件链、UNATTESTED 三态、run-accept 红不写/绿回执与反证（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p4-observer-neutrality.md](run-bundle-charter/2026-10-23-p4-observer-neutrality.md) — P4 观察面/位置中立：三操作桶、run-state 跨桶落定、门禁默认只读、run-accept 显式写盘（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p5-provenance-manifest.md](run-bundle-charter/2026-10-23-p5-provenance-manifest.md) — P5 溯源/可移植：provenance 离线证明、local-file 哈希、manifest、新 run 卫生扫描（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p7-blind-baseline.md](run-bundle-charter/2026-10-23-p7-blind-baseline.md) — P7 盲测 baseline：4 样本在手册改动前 4/4 命中 ground truth；记录 lead 通道 max-tokens 偏差与 P8 的验收调整依据（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p7-manual-batch.md](run-bundle-charter/2026-10-23-p7-manual-batch.md) — P7 手册文本批：D28 读序/交付终局/来源证明、行预算升顶、四角色快照重录与 snapshot/preset 验收（同一消费者：已结宪章卡 + implemented RFC）。
- [run-bundle-charter/2026-10-23-p8-final.md](run-bundle-charter/2026-10-23-p8-final.md) — P8 盲续跑收口：手册后 4/4、非回归矩阵、P6 延后、RFC 毕业与卡归档（同一消费者：已结宪章卡 + implemented RFC）。

（2026-10-24 用户判断落地材料不再服务活跃卡：`reader-final/` 两份随可读终稿两卡迁入 [_archived/research/reader-final/](../_archived/research/reader-final/2026-10-23-reader-final-design.md)；`2026-10-21-method-library-main-surface.md` 随已结卡迁入 [_archived/research/](../_archived/research/2026-10-21-method-library-main-surface.md)。）

（2026-10-18 方法配置两份材料已随消费者毕业迁入 [_archived/research/](../_archived/research/)：外部先例与真模型 A/B。）

（2026-10-23 D28 缺口收口卡已结：其 P0 证据 `d28-witness-binding/` 随卡迁入 [_archived/research/](../_archived/research/d28-witness-binding/2026-10-23-p0-witness-receipts.md)。）

（2026-10-23 rerun 不满转接卡已结：其验收证据 `rerun-triage/` 随卡迁入 [_archived/research/](../_archived/research/rerun-triage/2026-10-23-acceptance-evidence.md)。）
