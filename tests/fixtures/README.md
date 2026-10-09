# tests/fixtures/ · taxonomy（夹具分类与消费对账）

> 放置规则正本 = [tests/AGENTS.md](../AGENTS.md)：构造样本与经整理、人审冻结的录制语料住这里，由测试或独立 smoke 消费，不自动进默认回归 glob。consumer 对账 = [navigability-contract 契约回归](../navigability-contract.test.mjs)（每顶层组 ≥1 真实 consumer，零孤儿）。

| 组 | consumer（真实引用） | 证明什么 | 冻结规则 | 进默认回归 |
|---|---|---|---|---|
| node-gate/ | [node-gate.test.mjs](../node-gate.test.mjs) + [@scripts/run-gates/node-gate.mjs](../../scripts/run-gates/node-gate.mjs) | 判据级门的用例与永久反证记录（门②③④L 形态） | 契约日用例即反证——改夹具应预期变红 | 是 |
| schema-scan/ | [schema-scan.test.mjs](../schema-scan.test.mjs)（[@scripts/run-gates/schema-scan.mjs](../../scripts/run-gates/schema-scan.mjs) 判据同源，夹具路径引用在测试） | 在场级断言用例（八节点输出件，断代定红） | 契约日用例即反证——改夹具应预期变红 | 是 |
| run-state/ | [run-state.test.mjs](../run-state.test.mjs) | run 操作面状态谓词（真实会话日志三时点投影 + 构造 zstd 帧） | 语义由消费测试钉住 | 是 |
| run-dashboard/ | [run-dashboard.test.mjs](../run-dashboard.test.mjs) | 仪表盘折算投影（日志选择、HITL 折算、步骤投影） | 同上 | 是 |
| vendor-artifacts/ | [vendor-artifacts.test.mjs](../vendor-artifacts.test.mjs)（夹具路径经参数喂给 [scripts/lib/vendor-artifacts.mjs](../../scripts/lib/vendor-artifacts.mjs)） | vendor 构建产物自检判据（齐全/缺失两形态） | 纯 fs 静态夹具 | 是 |
| review-aids/ | [unconsumed-evidence.test.mjs](../unconsumed-evidence.test.mjs) + [acceptance-check.test.mjs](../acceptance-check.test.mjs) | 散文纪律的机械基座用例：B1 差集投影 + 收活判据三态求值（先红后绿反证） | 契约日用例即反证——改夹具应预期变红 | 是 |

> 会话回放场景（整组录制资产 + 场景声明）住仓根 [`snapshots/`](../../snapshots/README.md)——它是独立于纯函数夹具的证据层，消费入口与分类边界由该页拥有。
