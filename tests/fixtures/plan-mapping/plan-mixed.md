# Plan — plan-mapping / 四态混合（mapped / stale / plan-only / 墓碑 / id 命中）

> 构造样本：恢复会话后 task_id 失效（task-9 不在 Team 板）+ 显式 plan-only + 退役墓碑 +
> 旧写法里的 task id 恰好等于节点 id。不是真实 run。
> 图版本：v3

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1.1 | — | active | broad-scan | 扫官方源 | scout | — | leads.md | 覆盖齐 | 1 query | L1 | task-1 |
| W2.1 | — | active | deep-dive | 深挖 A | analyst | W1.1 | evidence/a.md | 七字段 | 1 轮 | L1 | task-9 |
| W2.2 | — | active | deep-dive | 深挖 B | analyst | W1.1 | evidence/b.md | 七字段 | 1 轮 | L1 | plan-only |
| W2.3 | — | retired | deep-dive | 已退役的旧节点 | analyst | W1.1 | evidence/c.md | — | — | L1 | task-5 |
| W3.1 | — | active | synthesis | 综合 | lead | W2.1,W2.2 | final.md | 来源链 | — | L1 | |
| W4.1 | — | active | review | 对抗核查 | critic | W3.1 | review.md | 未回填，但 task id 就是节点 id | — | L1 | |
