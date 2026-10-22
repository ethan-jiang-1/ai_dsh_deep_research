# Plan — wave-fixture

> 构造样本：Wave 2 两个并行节点（W2.1/W2.2），不是真实 run。

## 节点表

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1.1 | — | active | broad-scan | 扫官方源 | scout | — | leads.md | 覆盖齐 | 2 query | L0 | task-1 |
| W2.1 | — | active | deep-dive | 深挖 A | analyst | W1.1 | evidence/a.md | 七字段 | 1 轮 | L0 | task-2 |
| W2.2 | — | active | deep-dive | 深挖 B | analyst | W1.1 | evidence/b.md | 七字段 | 1 轮 | L0 | task-3 |
| W3.1 | — | active | synthesis | 综合 | lead | W2.1,W2.2 | final.md | 来源链 | — | L0 | task-4 |
| W4.1 | — | active | review | 对抗核查 | critic | W3.1 | review.md | readiness | — | L0 | task-5 |
