# tests/fixtures/ · taxonomy（夹具分类与消费对账）

> 放置规则正本 = [tests/AGENTS.md](../AGENTS.md)：构造样本与经整理、人审冻结的录制语料住这里，由测试或独立 smoke 消费，不自动进默认回归 glob。consumer 对账 = [navigability-contract 契约回归](../contracts/navigability-contract.test.mjs)（每顶层组 ≥1 真实 consumer，零孤儿）。

| 组 | consumer（真实引用） | 证明什么 | 冻结规则 | 进默认回归 |
|---|---|---|---|---|
| node-gate/ | [node-gate-delivery.test.mjs](../run/node-gate-delivery.test.mjs) 等三件（delivery/leads/session） + [@scripts/run-gates/node-gate.mjs](../../scripts/run-gates/node-gate.mjs) | 判据级门的用例与永久反证记录（门②③④L 形态） | 契约日用例即反证——改夹具应预期变红 | 是 |
| schema-scan/ | [schema-scan.test.mjs](../run/schema-scan.test.mjs)（[@scripts/run-gates/schema-scan.mjs](../../scripts/run-gates/schema-scan.mjs) 判据同源，夹具路径引用在测试） | 在场级断言用例（八节点输出件，断代定红） | 契约日用例即反证——改夹具应预期变红 | 是 |
| run-state/ | [run-state.test.mjs](../run/run-state.test.mjs) | run 操作面状态谓词（真实会话日志三时点投影 + 构造 zstd 帧） | 语义由消费测试钉住 | 是 |
| run-dashboard/ | [run-dashboard.test.mjs](../run/run-dashboard.test.mjs) | 仪表盘折算投影（日志选择、HITL 折算、步骤投影） | 同上 | 是 |
| vendor-artifacts/ | [vendor-artifacts.test.mjs](../run/vendor-artifacts.test.mjs)（夹具路径经参数喂给 [scripts/lib/vendor-artifacts.mjs](../../scripts/lib/vendor-artifacts.mjs)） | vendor 构建产物自检判据（齐全/缺失两形态） | 纯 fs 静态夹具 | 是 |
| plan-wave/ | [plan-graph.test.mjs](../cockpit/plan-graph.test.mjs) | 固定 Wave plan：W1.1/W2.1/W2.2 并行、W3.1 汇合、legacy flat W 反例 | 语义由消费测试钉住 | 是 |
| plan-mapping/ | [graph-model.test.mjs](../cockpit/graph-model.test.mjs) | BUG-043 五态负例：3 节点 / Team 1 任务（未映射），以及 stale / plan-only / 墓碑 / id 命中 / task_id 重复的混合样本 | 语义由消费测试钉住——四态断言即反证，改夹具应预期变红 | 是 |
| run-rerun/ | [run-version.test.mjs](../cockpit/run-version.test.mjs) + [plan-diff.test.mjs](../cockpit/plan-diff.test.mjs) | rerun 版本面夹具：plan v2 + `plan/v1.md` 快照 + `final/v1.md` 版本账 + `final.md` 工作稿 + `> rerun:` 声明 | 语义由消费测试钉住——版本面退回「final.md 在场 = 已交付」即变红 | 是 |
| method-library-tool/ | `scripts/smoke/method-library-tool-smoke.mjs` | Test-only overlay and deterministic LLM adapter for the real Host-tool composition smoke | Generated per Loader-smoke cwd; not a recorded Session fixture | 否
| review-aids/ | [unconsumed-evidence.test.mjs](../run/unconsumed-evidence.test.mjs) + [acceptance-check.test.mjs](../run/acceptance-check.test.mjs) | 散文纪律的机械基座用例：B1 差集投影 + 收活判据三态求值（先红后绿反证） | 契约日用例即反证——改夹具应预期变红 | 是 |
| [events.mjs](events.mjs)（文件级支援件——工厂非语料组；孤儿检查只扫目录组，本行 = 导航登记） | [hitl-fold](../run/hitl-fold.test.mjs) / [hitl-provenance](../run/hitl-provenance.test.mjs) / [bundle-bind](../run/bundle-bind.test.mjs) / [activity-fold](../run/activity-fold.test.mjs) / [member-activity-fold](../run/member-activity-fold.test.mjs) / [evidence-audit](../run/evidence-audit.test.mjs) / [run-dashboard](../run/run-dashboard.test.mjs) / [run-state](../run/run-state.test.mjs) | 会话事件 wire-shape 构造工厂：tool call/result 配对（arguments 为 JSON 字符串的真日志形态）+ zstd 多帧日志文件——这两个形态的单一构造正本 | 支援件非冻结语料——语义由消费测试钉住（改工厂应预期变红） | 否（glob 外，import 不注册测试） |
| client-load-home/ | [@scripts/smoke/client-load-smoke.mjs](../../scripts/smoke/client-load-smoke.mjs)（`--seed tests/fixtures/client-load-home`；materialize = `scripts/smoke/client-load-seed.mjs`） | client-load 真浏览器断言的种子 home：一条绑定已交付 run 的会话 + 一条未绑定负样本 + 工作区树（bundle / 用户方法库 / archive run）——干净机器/CI 不需要预置 dev home | 人审冻结：会话日志只截断 payload、**不改事件条数/顺序/seq**；绝对路径用 `__WORKSPACE__` / `__REPO_ROOT__` 占位；维护 = 组内 README | 否（smoke 现场 materialize 到 gitignored 运行区） |

> 会话回放场景（整组录制资产 + 场景声明）住仓根 [`snapshots/`](../../snapshots/README.md)——它是独立于纯函数夹具的证据层，消费入口与分类边界由该页拥有。
