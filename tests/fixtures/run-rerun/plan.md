# Plan — run-rerun fixture（plan v2 当前版）

> 执行图（lead owner，过程件）。图版本：v2（重写前已落 plan/v1.md 快照）。

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1.1 | — | active | broad-scan | 扫官方源 | scout | — | leads.md | 覆盖齐 | 2 query | L1 | task-1 |
| W2.1 | — | active | deep-dive | 加深模型轴 | analyst | W1.1 | evidence/m1.md | 七字段齐 | 2 轮 | L2 | task-2 |

## 重写记录

- 2026-10-22 / 图版本 v2 / 动作=证据扩张 rerun 加 W2.1 / 原因=模型轴不可判定 / journal 指针=journal.md
- 2026-10-21 / 图版本 v1 / 动作=初建 / 原因=v1 交付后补研究 / journal 指针=journal.md
