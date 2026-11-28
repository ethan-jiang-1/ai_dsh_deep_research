# tests/fixtures/ · taxonomy（夹具分类与消费对账）

> 放置规则正本 = [tests/AGENTS.md](../AGENTS.md)：构造样本与经整理、人审冻结的录制语料住这里，由测试或独立 smoke 消费，不自动进默认回归 glob。consumer 对账 = [navigability-contract 契约回归](../checks/navigability-contract.test.mjs)（每顶层组 ≥1 真实 consumer，零孤儿）。

| 组 | consumer（真实引用） | 证明什么 | 冻结规则 | 进默认回归 |
|---|---|---|---|---|
| node-gate/ | [node-gate-delivery.spec.mjs](../run/node-gate-delivery.spec.mjs) 等三件（delivery/leads/session） + [@checks/run-gates/node-gate.mjs](../../checks/run-gates/node-gate.mjs) | 判据级门的用例与永久反证记录（门②③④L 形态） | 契约日用例即反证——改夹具应预期变红 | 是 |
| schema-scan/ | [schema-scan.spec.mjs](../run/schema-scan.spec.mjs)（[@checks/run-gates/schema-scan.mjs](../../checks/run-gates/schema-scan.mjs) 判据同源，夹具路径引用在测试） | 在场级断言用例（八节点输出件，断代定红） | 契约日用例即反证——改夹具应预期变红 | 是 |
| run-state/ | [run-state.spec.mjs](../run/run-state.spec.mjs) | run 操作面状态谓词（真实会话日志三时点投影 + 构造 zstd 帧） | 语义由消费测试钉住 | 是 |
| run-dashboard/ | [run-dashboard.spec.mjs](../run/run-dashboard.spec.mjs) | 仪表盘折算投影（日志选择、HITL 折算、步骤投影） | 同上 | 是 |
| vendor-artifacts/ | [vendor-artifacts.spec.mjs](../run/vendor-artifacts.spec.mjs)（夹具路径经参数喂给 [checks/lib/harness/vendor-artifacts.mjs](../../checks/lib/harness/vendor-artifacts.mjs)） | vendor 构建产物自检判据（齐全/缺失两形态） | 纯 fs 静态夹具 | 是 |
| plan-wave/ | [plan-graph.spec.mjs](../cockpit/lib/plan/plan-graph.spec.mjs) | 固定 Wave plan：W1.1/W2.1/W2.2 并行、W3.1 汇合、legacy flat W 反例 | 语义由消费测试钉住 | 是 |
| plan-mapping/ | [graph-model.spec.mjs](../cockpit/lib/plan/graph-model.spec.mjs) | BUG-043 五态负例：3 节点 / Team 1 任务（未映射），以及 stale / plan-only / 墓碑 / id 命中 / task_id 重复的混合样本 | 语义由消费测试钉住——四态断言即反证，改夹具应预期变红 | 是 |
| run-rerun/ | [run-version.spec.mjs](../cockpit/lib/run/run-version.spec.mjs) + [plan-diff.spec.mjs](../cockpit/lib/plan/plan-diff.spec.mjs) | rerun 版本面夹具：plan v2 + `plan/v1.md` 快照 + `final/v1.md` 版本账 + `final.md` 工作稿 + `> rerun:` 声明 | 语义由消费测试钉住——版本面退回「final.md 在场 = 已交付」即变红 | 是 |
| method-library-tool/ | `checks/smoke/method-library-tool.e2e.mjs` | Test-only overlay and deterministic LLM adapter for the real Host-tool composition smoke | Generated per Loader-smoke cwd; not a recorded Session fixture | 否
| model-experience/ | `checks/smoke/model-experience.e2e.mjs` | Test-only headless overlay + deterministic mock LLM capturing the real assembled Lead/Scout first request for token-meter pricing | Generated per Loader-smoke cwd; not a recorded Session fixture | 否
| review-aids/ | [unconsumed-evidence.spec.mjs](../run/unconsumed-evidence.spec.mjs) + [acceptance-check.spec.mjs](../run/acceptance-check.spec.mjs) | 散文纪律的机械基座用例：B1 差集投影 + 收活判据三态求值（先红后绿反证） | 契约日用例即反证——改夹具应预期变红 | 是 |
| verdict-audit/ | [verdict-audit-fixture.spec.mjs](../run/gates/verdict-audit-fixture.spec.mjs) | Pilot A 的真实 critic child 会话线形（header depth/parent、assistant text、tool call）+ 对应 claims/verdicts/final：日志发现/解析与四条会话判据的 keyless 全链 | 人审冻结：事件条数/顺序/seq 不变、assistant text 逐字保留、payload 截断与路径占位；三件真实产物互相钉住；维护 = 组内 README | 是 |
| skill-golden/ | [skill-golden.test.mjs](../checks/shared/skill-golden.test.mjs) | 随包 presets 与 `.agents/skills` 的 SKILL.md sha256 金标准；快照 B 只比 catalog | 生成物，禁手改；重录 = `node tools/record/record-skill-golden.mjs`；正文变更 = 红 | 是 |
| shipped/ | [shipped-surface.test.mjs](../checks/shipped-surface.test.mjs) + [package-contract.spec.mjs](../pack/contract/package-contract.spec.mjs) + [pack.e2e](../../checks/smoke/pack.e2e.mjs) | 公开类型面的可达相对闭包（exports.types 入口 + 相对 import 目标）；`files` 必须逐条列出 | 生成物，禁手改；重跑 = `node tools/record/record-type-closure.mjs`（需先 build）；漂移 = 红 | 是 |
| asset-ledger/ | [asset-ledger.test.mjs](../checks/asset-ledger.test.mjs) + [guard-ledger.test.mjs](../checks/guard-ledger.test.mjs) | spec/check 组合账：lane/class/cost/uniqueClaim/oracleType/sunset；AST 推导 oracleType，self-referential = 迁移面 | 生成物，禁手改；漂移 = 红；重跑 = `node tools/record-asset-ledger.mjs` | 是 |
| ci-oracle/ | [ci-workflow-oracle.test.mjs](../checks/ci-workflow-oracle.test.mjs) | CI 执行面与 `on:` 事件键对真实 `yaml@2` + `bash -eo pipefail`（按目标失败传播）逐例一致 | 录制生成，禁手改；重录 = `node tools/record-ci-oracle.mjs`；改 oracle 应预期测试变红 | 是 |
| guard-ledger/ | [guard-ledger.test.mjs](../checks/guard-ledger.test.mjs) | 已修缺陷卡（D-1 / D-2 / 批次 A–F）的守卫 oracleType/状态/红配方；与 asset-ledger 同源 | 机械对账，缺条目/路径不存在/oracleType 失配 = 红 | 是 |
| [events.mjs](events.mjs)（文件级支援件——工厂非语料组；孤儿检查只扫目录组，本行 = 导航登记） | [hitl-fold](../run/hitl-fold.spec.mjs) / [hitl-provenance](../run/hitl-provenance.spec.mjs) / [bundle-bind](../run/bundle-bind.spec.mjs) / [activity-fold](../run/activity-fold.spec.mjs) / [member-activity-fold](../run/member-activity-fold.spec.mjs) / [evidence-audit](../run/evidence-audit.spec.mjs) / [run-dashboard](../run/run-dashboard.spec.mjs) / [run-state](../run/run-state.spec.mjs) | 会话事件 wire-shape 构造工厂：tool call/result 配对（arguments 为 JSON 字符串的真日志形态）+ zstd 多帧日志文件——这两个形态的单一构造正本 | 支援件非冻结语料——语义由消费测试钉住（改工厂应预期变红） | 否（glob 外，import 不注册测试） |
| client-load-home/ | [@checks/smoke/client-load.entry.mjs](../../checks/smoke/client-load.entry.mjs)（`--seed tests/fixtures/client-load-home`；materialize = `checks/smoke/client-load-seed.support.mjs`） | client-load 真浏览器断言的种子 home：一条绑定已交付 run 的会话 + 一条未绑定负样本 + 工作区树（bundle / 用户方法库 / archive run）——干净机器/CI 不需要预置 dev home | 人审冻结：会话日志只截断 payload、**不改事件条数/顺序/seq**；绝对路径用 `__WORKSPACE__` / `__REPO_ROOT__` 占位；维护 = 组内 README | 否（smoke 现场 materialize 到 gitignored 运行区） |
| showcase-home/ | [showcase-fixture.spec.mjs](../cockpit/lib/run/showcase-fixture.spec.mjs) + `tools/channel/demo-showcase.mjs`（`pnpm demo`） | 3 分钟零 Key 标杆示范夹具：含已交付会话 + HITL1 挂起会话、完整 8 字段证据卡、claims × verdicts 风险样本、读者/审计终稿与无会话只读归档，完整示范 5 个 Signature Moments | 自包含脱敏样板，路径使用 `__WORKSPACE__` / `__REPO_ROOT__` 占位，不进发布 tarball | 是（由 showcase-fixture.spec.mjs 校验结构契约；启动时 materialize 到运行区） |

> **重复边界**：同一组内的最小样板（`question.md` / `final.md` / `review.md` 等）允许逐字重复——
> 每个 fixture bundle 必须**自包含**（可单独复制/注入、不依赖兄弟目录），抽共享文件会制造隐式耦合；
> 重复的是**语料**，不是事实源，语义仍由消费测试钉住。
>
> 会话回放场景（整组录制资产 + 场景声明）住仓根 [`snapshots/`](../../snapshots/README.md)——它是独立于纯函数夹具的证据层，消费入口与分类边界由该页拥有。
