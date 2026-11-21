# plan 节点表单次解释：索引保真解码事实，观察与硬门各自裁决

> 状态：implemented

问题卡 = [Pack 生产源头预防](../../_backlog/_archived/settled_issues/2026-11-20-pack-production-prevention.md)（D 切片；P 生产强制转「以后做」）。本 Note 只记已交付的 D 决定与证据。

## 决定

1. **`plan-index` 拥有节点表的解码事实**。`PlanIndex.table` 区分 `source: absent | present` 与 `status: absent | invalid | decoded`；每行保存 12 个语义列的存在性状态（`missing-column` / `missing-cell` / `empty` / `explicit-placeholder` / `value`）、原始值、规范值、源行号与表内列序号；诊断覆盖 `empty-source`、`table-missing`、`empty-table`、`duplicate-column`、`ambiguous-table`、`row-arity`、`unsupported-escaped-pipe`、`missing-id`。节点查询面（`nodes` / `byId` / `topLevel` 等）只从 decoded 表投影，invalid 表保留行事实但不产生权威节点。
2. **一次只认一张节点表**：从首个含 `id` 列的行到首个非表格行；之后再出现候选表即 `ambiguous-table`。重复的**语义**列 → invalid；未知扩展列忽略、不参与重复冲突。注释与围栏由既有 `maskMarkdownLines` 遮罩，示例表不夺权。转义管道 `\|` 不在支持域，直接 invalid；表头/值已有反引号、加粗、大小写、下划线/连字符归一保持原观察语义。
3. **观察与硬门策略分开**。`planIssuesOf` 对 invalid 表输出带行列定位的 `table-invalid` 提示，驾驶舱继续显示 Team 任务回退，不新增 run 全局阻断；`plan-gate` 删除按 raw 表格二次查 budget/task_id 的解释，改用同一 `node.cells`，自己决定 RED/PASS/N/A。门 P 的缺文件 N/A、在场空/畸形 RED、active 字段必填、墓碑豁免、`—` 显式无预算、版本/快照/剩余工作/Wave 性质保持不变。
4. **`task_id = —` 只保真为占位，不新增收紧**。gate 维持既有接受行为；观察映射仍为未映射。planning §4 要求回填后为真实 `task-N` 或 `plan-only`，与此形成既有合同缺口，记录在卡上；把它改成 RED 属另一次公共行为选择。
5. **范围边界**：头部/重写记录版本仍归 `run-version`，不在本次节点表解码承诺内；`strategy-core` / Protocol 审计继续按空索引投影 nodes=0，不把该零值当作表合法的证明；生产发布/派工强制（P）、多文件事务与并发恢复未实施。

## 输掉的方案

- **所有消费者共享同一 PASS/RED 结论**：观察面必须 fail-soft、硬门必须 RED；强求同一 verdict 要么把观察变成阻断，要么把硬门变松。共享的是字段事实与诊断，不是裁决。
- **用 decoder/schema 合法证明研究结论正确**：结构正确不等于领域质量，后者仍需证据与人工判断。
- **新增唯一 publish 写方并禁通用 write/edit**：没有已证原生接缝；改 harness loop 或角色工具面超出本切片。
- **把 `task_id = —` 直接判红**：会改变既有公共门行为；本片保持现状并记录缺口，另立选择。
- **保留 gate 的 raw 表第二读以兼容旧输入**：重复解释正是要消除的成因；兼容改为同一解码事实上的明确支持域。
- **引入完整 Markdown 引擎支持转义管道**：首片成本与收益不成比例，明确拒绝并给诊断。
- **把缺失、空白和 `—` 折成同一 undefined**：会丢掉“显式无预算”与“没写”的区别，legal 控制无法与坏输入分开。

## 实际跑过的验证

- **红→绿（装饰等价缺口）**：改前 `node --import tsx/esm --test tests/run/gates/plan-gate.spec.mjs` exit 1，新增“装饰表头/ID 不改变 active 字段裁决”用例如期 RED（actual RED vs expected PASS；记录 `runtime/smoke-workspace/preventive-quality/plan-gate-decorated.red.out`）。共用解码后两文件 35/35 通过（含缺列、缺 id 与紧邻多表控制）。
- **独立期望**：未参与实现的审阅者按卡上候选合同冻结 literal 输入/预期（缺席 vs 空白、占位、短行、重复语义列、多表、伪表、转义管道、装饰、BOM/CRLF），未由实现生成；用例落在 `tests/cockpit/lib/plan/plan-index.spec.mjs` 的“表事实”块与 `plan-gate.spec.mjs` 的 budget/task 用例。
- **定向**：`node --import tsx/esm --test tests/cockpit/lib/plan/plan-index.spec.mjs tests/run/gates/plan-gate.spec.mjs tests/cockpit/shared/i18n.spec.mjs` → 35 tests / 35 pass / 0 fail（`plan-decoder-obs.green.out`）；`pnpm typecheck` exit 0。
- **负控（逐规则，先改源码后还原）**：把 `—` 折成空值、放开转义管道、取消 Markdown 遮罩、重复语义列静默取首列、紧邻第二张表静默当数据、表行丢失行首管道静默截断——六次变异各 exit 1 且恰有 1 个用例红，源码还原后与备份逐字节相同（`negctl/*.out`）。
- **真实入口**：`node --import tsx/esm checks/run-gates/node-gate.mjs <bundle> --sessions <empty> --no-write --no-review`。合法与装饰表 bundle 门 P = PASS（exit 0）；在场空白、多表 bundle 门 P = RED（exit 1，聚合退出，逐门读 stdout）；缺席 bundle 门 P = N/A（exit 0）。
- **显示**：`react-dom/server` 静态渲染 `GraphNotices`，验证中英诊断文案（`row-arity@3`）且英文零 CJK，3/3 pass（`TSX_TSCONFIG_PATH=packages/deep-research-pack/tsconfig.client.json`）。
- **全量**：`pnpm verify` exit 0；`pnpm test` exit 0（1435 spec + 265 checks，0 fail / 0 skip）。`pnpm build` exit 0。
- **未跑 / NOT-RUN**：真浏览器坏表诊断显示（`client-load.entry --seed` 因主机 load 3.62 > 1.5 自判 NOT-RUN，exit 2；种子 run 也没有坏表）；安装形态、模型、真实派工拒绝、并发/恢复未运行。SSR 只证组件渲染，不证 hook 文件轮询或浏览器装配。

## 残余风险

- `task_id = —` 的 gate 行为与 planning 回填要求仍不一致，可能让“临时未映射”看起来可派工；本片只保真并记录。
- `strategy-core` / Protocol 审计对坏表得到 nodes=0 的现有投影未改；读者必须同时看门 P/诊断，不能把零值当作“合法零投入”。
- `row-arity` 依赖按 `|` 切分；转义管道已显式拒绝，但单元格内的其它 Markdown 复合语法仍不在支持域。
- 通用 write/edit、Task 创建/回填与派工链未受保护；D 不是生产强制，P 仍待裁决。
