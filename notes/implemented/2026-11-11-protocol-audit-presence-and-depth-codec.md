# Protocol 审计：输入表示的单一正本 + 出席感知检查

> 状态：implemented
>
> 关联：[BUG-048](../../_backlog/_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md) · [BUG-049](../../_backlog/_archived/fixed_bugs/BUG-049-protocol-projection-lines-absent-silent.md) · [BUG-050](../../_backlog/_archived/fixed_bugs/BUG-050-strategy-channel-absent-and-workflow-null-workers.md) · [BUG-052](../../_backlog/_archived/fixed_bugs/BUG-052-protocol-epoch-day-granularity-retro-red.md) · [BUG-053](../../_backlog/_archived/fixed_bugs/BUG-053-plan-header-claims-first-match-anywhere.md) · [BUG-054](../../_backlog/_archived/fixed_bugs/BUG-054-cells-cap-count-only-canonical-bullet.md) · [BUG-056](../../_backlog/_archived/fixed_bugs/BUG-056-protocol-projection-unreadable-values-silent.md) · [BUG-058](../../_backlog/_archived/fixed_bugs/BUG-058-plan-cycle-has-no-mechanical-check.md) · [Protocol 层（D46）](2026-11-11-preference-protocol-layer.md) · [Strategy 投影（D48）](2026-11-11-strategy-projection.md)

## 决定

- 深度集合只有一份文本编解码（`depthsTextOf` / `depthsOfText`，住 [`scripts/lib/protocol-core.mjs`](../../scripts/lib/protocol-core.mjs)）：连续集合写端点区间 `L1–L3`，非连续写显式集合 `L0 / L2`，单值原样。生成器（`projectionOf`）与检查器（`checkProjectionDetails`）共用同一对函数，不再各自拼串/拆串。
- 解码规则：单 token = 单值；恰两个 token 以 `–`/`-` 连接 = 闭区间（模板端点写法）；三 token 生成器写法 `L1–L2–L3` 与显式集合 `L0 / L2` = token 集合。非连续集合写成区间 `L0–L2` 会按区间读成 `{L0,L1,L2}` → 红：歧义按 fail-loud 处理，不静默猜。
- §Protocol 的「来源 / 投入 / 输出」三行由「行在才对账」改为「缺席 = warning，行在但值漂移 = red」；行存在但为空与行缺席同判。v1 旧 bundle 不因新增缺席检查整片变红。
- 策略行「通道=」缺席 = warning（与 worker/预算缺席对称）；声明 `通道=workflow` 而 plan 无 Wave 拓扑 = red `strategy-workflow-without-wave`。workflow 分支的期望 worker 固定为 `research-wave`，不再拿 `workers.wave === null` 当「跳过对账」的哨兵。
- plan 的「头」只有一份定义（`headerBlockOf` = 首个 `##` 之前）：`checkPlanRef` 的 `protocol: vN` 与 `checkStrategy` 的 `- 策略:` 行都只认头；`strategy-core` 的显式通道解析共用同一范围。正文提及不能冒充头（BUG-053）。
- topics 的 lens 行只有一份解析（`lensScanOf`）：列表符 `-`/`*`/`+`、前导缩进、大小写 `Lenses`、括号列表与无括号简写都接受；`countCellsOf` 与 `strategyOf` 的 `knowledge.lenses` / `topology.cells` 共用同一结果。看起来像声明但读不出（空值、括号不成对）→ `cells-unparseable` 红，不许计 0 静默放行（BUG-054）。
- §Protocol 的「投入」行在场时，节点/cells 单位写法宽容（无 `≤`、`顶层`、`nodes`、`cells`）；读不出上限 → `projection-number-unparseable` 红；数字按**上限**语义比较：投影高于 JSON = 假声明红，低于 = 更紧的承诺允许。「输出」行接受 `sections =` / `sections:`；行在场但读不出 sections → `projection-output-unparseable` 红（BUG-056）。
- plan 图有环 = 交付审计 red `plan-cycle`（`waveCountOf === null` 不再被当「无对象」）；驾驶舱 `planIssuesOf` 增 `cycle` kind，并在有环时抑制误导性的 `wave-prefix`（重编号不能解环）（BUG-058）。
- 契约断代除日期外认交付事实：`PROTOCOL_CONTRACT_AT`（D46 提交时刻 2026-11-11T10:01:02+08:00）+ `delivered.json.acceptedAt`；同日早于落地时刻交付 = legacy（不追溯适用新契约），无回执可依 → 按日期口径从严（BUG-052）。
- `checkPlanRef` 对空 `planText` 仍返回 `[]`，代码注释写明由 schema-scan 的交付件在场门兜底。

## 输掉的方案

- **只改生成器写端点**（`depths[0]–depths.at(-1)`）：非连续深度无法表达；单深度仍落在旧正则之外，根因不除。
- **缺席直接 red**：契约日前 / 手写不全的 v1 bundle 会整片变红，超出本次授权；v1 走 warning，收紧留到 v2。
- **策略行通道缺席按派生值静默对账**：派生通道来自 plan 文本关键词，是猜测；猜对也不可复核。改为 warning + 显式声明优先。
- **workflow 无 Wave 时跳过 worker 对账**：`null` 同时表示「没有拓扑」与「无需检查」两种语义，正是漏检来源；改为先判拓扑红、再按 `research-wave` 比 worker。
- **把契约日改成完整时刻但仍用 `run.md` 的 `created:` 断代**：旧 bundle 的 created 只有日期，同日早场仍分不出；交付回执时间是交付时事实，语义更准。
- **同日全豁免**：会连契约落地后的晚场一起放过；只豁免「回执早于落地时刻」的交付。
- **只放宽 lens 行正则、不对读不出的行判红**：读不出仍会变成 0，0 永远不大于 cap，预算闸门继续失效。
- **把 `waveCountOf` 的 `null` 当「无对象」跳过**：null 是有环的唯一信号，跳过等于不可执行图免检；与 BUG-050 的 null 哨兵同源。
- **把 §Protocol 投入数字要求为严格相等**：会把「投影写得更紧」（生产 `drt_cn-us-ai-perception` ≤10/8 vs JSON 14/12）判红；上限语义只拦「投影高于设计」的假声明。
- **给 `lenses` 变体统一成模板写法再跑**：修夹具不修判据，模型下次漂移仍静默。

## 实际跑过的验证

- 先红：`tests/run/protocol-core.spec.mjs` 新增 BUG-048/049/050/052/053/054 六例；修复前该文件 3 fail（048/049/050）+ 新用例断言级红；修复后 30/30 pass（含 BUG-056/058）。`tests/cockpit/plan-index.spec.mjs` 增 cycle 用例（`cycle` 在、`wave-prefix` 不在）。`tests/run/strategy-core.spec.mjs` 新增 BUG-054 变体例，6/6 pass。
- 全量：`pnpm test` 1184 pass / 0 fail（新增用例后总数以最终跑为准）；`pnpm verify` 全绿。
- 生产 bundle 回归：8 个带 `protocol.json` 的 bundle 逐个跑 `protocol-audit`；修复前后唯一红仍是既有的 `drt_ai-model-regulation-cn-eu-us` 投入节点漂移（18 > JSON 12），其余 7 个 PASS 不变（含 `drt_cn-us-ai-perception` 的 ≤10/8 ≤ JSON 14/12）；`drt_api-context-caching-ds-openai` 因交付回执早于契约时刻转 legacy（exit 0），其晚场回执 / 无回执副本仍红 `no-protocol`。单深度形状回归：把 `drt_anthropic-claude-api-limits` 副本的投影 L0 改成 L1 → 新判红（旧实现零 finding）。
- 审查：agent 自审 + 机械门禁（`docs/evaluation.md` 同 diff 更新；`guard-red-record` 留证块随测试同 diff）。

## 残余风险

- 数字文法仍是窄带：只认「数字 + 可选 ≤/顶层 + 节点/nodes」与「数字 + cells/格」；更自由的散文（如「大约十二个节点」）会落 `projection-number-unparseable` 红而不是被解析。
