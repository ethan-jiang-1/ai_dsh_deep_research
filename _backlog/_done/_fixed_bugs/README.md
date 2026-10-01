# _fixed_bugs/ · 已修复缺陷卡

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入；文件名不变、内容不重写。
> **Next BUG ID = 已分配最大号 + 1（本目录 ∪ 活跃 bugs/ 一起算）**——权威值看
> [`../README.md`](../README.md)，本表逐行登记。

| Bug | 标题 | 修复 commit | 日期 |
|---|---|---|---|
| [BUG-001](BUG-001-new-session-stale-run-face.md) | 新会话立项窗口期，「研究状态」页签错呈上一次 run 的渐进面 | （kickoffSeen 立项轨道信号 + 抑制条件扩展 + 🌱 状态行） | 2026-09-30 |
| [BUG-002](BUG-002-pending-ask-anchor-misattribution.md) | 立项后未答的 ask 被锚点折算误标为「交付审阅 ⏳」 | （deriveAnchors 按 ask 内容判型：HITL1/HITL2 签名 + 契约外第三锚扩窗） | 2026-09-30 |
