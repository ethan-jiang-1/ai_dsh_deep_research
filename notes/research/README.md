# research/ — 调研报告（过去时：摸过什么底）

> **时态：过去**（做完了的调研）。与 `implemented/` 的区别：implemented 记**我们的决定**，
> research 记**外部/上游的事实**——上游考古、机制解剖、市场粗扫、观察面琢磨稿。
> 报告本身不是合同：结论一旦被 docs 或决定采用，**落点写进下表并链接到 owner**。

## 主入口

本页的状态表就是本目录的清单（`note-status` 门禁对账：目录里的每个文件必须在此登记）。
想找"某个结论的原始出处"，从被引用的 owner 文档反查回来，或按主题名搜本目录。

## 状态表

| 文件 | 状态 | 日期 | 一句话 | 吸收落点 / 被谁引用 |
|---|---|---|---|---|
| [deep-research-harness-analysis.md](2026-09-24-deep-research-harness-analysis.md) | 已完成 | 2026-09-24 | 方法论源头（`ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/`）的考古报告 | [design/30-methodology-mapping.md](../../docs/design/30-methodology-mapping.md)（生命周期映射/弃用清单/教训落点） |
| [dsh-plugin-repo-anatomy.md](2026-09-24-dsh-plugin-repo-anatomy.md) | 已完成 | 2026-09-24 | 参考插件仓（`ai_dsh_company`）的工程机制解剖 | [design/10-architecture.md](../../docs/design/10-architecture.md)、`scripts/verify.mjs`（门禁移植）、`dev/env.sh`（双 home） |
| [dsh-market-scout.md](2026-09-24-dsh-market-scout.md) | 已完成（粗扫） | 2026-09-24 | DSH 插件市场粗扫（机制真相 + vendor 能力目录差集 + 第三方生态快照的种子） | [dsh-plugin-ecosystem.md](2026-09-25-dsh-plugin-ecosystem.md)（认真版接续）；[00-index 登记](../../docs/00-index.md) |
| [dsh-plugin-ecosystem.md](2026-09-25-dsh-plugin-ecosystem.md) | 已完成 | 2026-09-25 | DSH 插件生态认真研究（456+ 插件 / 8 竞品 / 差异化 = 多角色 + 证据审计 + Teams 空白位） | [00-index 外部研究材料登记](../../docs/00-index.md)；[毕业 Note](../implemented/2026-09-24-dsh-plugin-ecosystem-research.md) |
| [ui-observability-surfaces.md](2026-09-24-ui-observability-surfaces.md) | 已完成（琢磨稿） | 2026-09-24 | 观察面（右栏状态页签等）的手段与取舍琢磨 | [D18](../../docs/00-index.md)（client 面单点例外）+ [observability-gui 毕业 Note](../implemented/2026-09-24-observability-gui.md) |

本目录只放**报告**；对上游研发语料（`deepseek-harness/_agent_ready_development`）的通读与
吸纳是**决定记录**，落在 [implemented/2026-09-25-agent-ready-absorption](../implemented/2026-09-25-agent-ready-absorption.md)。

## 状态行约定

每个报告的文件头第一行是状态行：`> 状态：**已完成** · <日期> · …` 或
`> 状态：**进行中** · <日期> · …`（`note-status` 门禁强制）。**进行中**的报告要写清
"缺什么才能收口"；收口后把落点补进上表。
