# 执行计划（plan.md）

version: v1

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 | | active | scan | 盘点 Cordis/DSH 插件组合层与宿主扩展点白名单 | scout-1 | | leads.md | >= 3 条一手架构源 | 5m | L1 | task-w1 |
| W2.1 | | active | dive | 深挖 Host sessionProjections 与双半插件隔离机制 | analyst-1 | W1 | evidence/e2-session-projection-wire.md | 完整代码契约与实测延迟 | 8m | L2 | task-w2-1 |
| W2.2 | | active | dive | 对抗检索：私有 DOM CSS hack 与前端 N+1 订阅反模式 | scout-2 | W1 | evidence/e3-adversarial-dom-hacks.md | >= 2 条具体脆性故障复盘 | 8m | L2 | task-w2-2 |
| W3 | | active | synthesis | 综合对比架构取舍、量化延迟与生态可组合性 | lead | W2.1,W2.2 | findings.md, final.md | 每条核心主张可追至 evidence/*.md | 10m | L2 | task-w3 |
| W4 | | active | review | 独立 Critic 逐条核查 claims.json 并签发 readiness | critic-1 | W3 | review.md, verdicts.json | Critical=0, Major=0 | 6m | L2 | task-w4 |
