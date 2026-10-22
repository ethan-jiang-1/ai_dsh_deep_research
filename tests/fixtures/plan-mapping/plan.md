# Plan — plan-mapping / 未映射负例（3 节点，Team 只建 1 个任务）

> 构造样本：BUG-043 的负例现场——plan 节点表已写、Team 映射只回填了一行。不是真实 run。
> 图版本：v1

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1.1 | — | active | broad-scan | 官方源在哪儿 | scout | — | leads.md §T1 | 覆盖记录齐 | 2 query 家族 | L1 | task-1 |
| W2.1 | — | active | deep-dive | 深挖主 claim | analyst | W1.1 | evidence/t1.md | 七字段齐 | 1 轮 | L1 | |
| W2.2 | — | active | deep-dive | 并行的第二条深挖 | analyst | W1.1 | evidence/t2.md | 七字段齐 | 1 轮 | L1 | |
