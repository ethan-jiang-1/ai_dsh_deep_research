---
status: 推敲中
opened: 2026-11-11
---

# 推敲：探索性验证策略（exploratory verification）与第 1 轮 charter

> 立卡：2026-11-11 ｜ 状态：推敲中（执行中） ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
>
> **一句话**：把「改完跑回归」升级为「变更面驱动的探索协议」——先问最低可观察层，能用纯函数/门禁/回放
> 回答的不上探针，能用探针回答的不上 E2E；本轮 pilot 已用 0 次模型调用跑出 2 类静默失败（fail-open）。
>
> **下一步**：按 §执行记录 逐轮推进；用户 2026-11-11 答复见 §用户答复——keyless 批已授权，
> 只写 bug 卡不修代码，真模型批待单独批准。

**问题与期望结果：** 最近两周改了 216 个 commit（0.3.1 交接修复、D46 Protocol 表达层、D47 worker
profiles、D48 Strategy 投影 + HITL1 typed inputs、探针迁根、T0 两级预算……）。回归能回答「旧行为被
改坏没有」，回答不了「新东西在没被写进测试的输入上会不会静默放行」。本卡要交付的是**一套可复用的
探索协议**（怎么选面、用什么 oracle、什么时候才值得跑探针/E2E、发现怎么分诊），以及**第 1 轮 charter
图**；本轮结束时给出：探索过哪些面、每条 charter 的判定、真缺陷卡，以及「哪一面仍然空白」的诚实记账。
找真缺陷就开 [bug 卡](../bugs/README.md)，不改产品代码，**不把「没找到」写成「没有 bug」**。

**当前情况（第 0 轮 pilot 已跑，2026-11-11）：**

- 策略已成形（本卡 §策略）；pilot 扫了 5 个面（3 个实跑 + 2 个静态核对），**0 次模型调用、约 15 分钟**，
  产出 2 类 fail-open 候选 + 4 个关闭假设（§第 0 轮）。
- 基线全绿：`pnpm verify`、`pnpm test`（1178 例）当日实跑通过——探索不以「先怀疑基线」开场。
- 两个 fail-open 都在 `checkStrategy`（[protocol-audit-core](../../scripts/lib/protocol-audit-core.mjs)）：
  **通道字段缺席零提示**、**通道=workflow 且无 Wave 拓扑时 worker 对账被静默跳过**。现有契约测试
  （[protocol-core.test](../../tests/run/protocol-core.spec.mjs)）覆盖了非法通道/预算漂移/不可解析预算，
  恰好没有这两个形态——实现者按 happy path 写测试的典型盲区，也是本策略最稳定的收益来源。
- 已关闭的面：canonical hash 稳定性、T0 两级预算计数（实跑）；worker profile 结构与回放角色覆盖
  （静态核对，未重跑 smoke；证据见 §第 0 轮表）。

**未决问题：**

- 第 1 轮跑哪几条 charter（keyless 批默认全跑；真模型 X6 是否批准）。
- 两个 fail-open 的处置：先只开 bug 卡，还是本轮直接补成带先红后绿的机械守卫。
- 这套协议是否毕业成常驻文档（候选 `docs/guides/67-exploratory-test.md` + `implemented` Note）。
- 探索轮与回归/里程碑的关系：探索发现不自动变成回归门；升格需要单独判定（§分诊与毕业）。

**下一步：** 等用户回答文末 Q1–Q4；批准后按 §第 1 轮 charter 图执行 keyless 批，真模型批单独授权。

## 为什么另立探索（而不是再跑一轮回归）

| | 回归 | 探索 |
|---|---|---|
| 回答 | 旧行为被改坏了吗 | 哪些输入会让系统**静默**地做错事 |
| oracle 来源 | 已写下的断言 | 散文合同、双份事实、回放金样、既有现场 |
| 样本 | 固定清单，可枚举 | 变异/边界/矛盾，不可枚举 |
| 停止 | 全绿 | 预算 + 覆盖地图 + 收益递减 |
| 产物 | 绿/红 | bug 卡 / 观察 / 歧义 / 空假设（四态） |

本仓的 bug 气味集中在三类，回归对它们天生不敏感：

1. **静默接受（fail-open）**：散文写着「必须红 / 不得静默跳过」，代码在某个输入上绿了。
   例：audit 在缺字段时零 finding，而它的兄弟字段各有一条 warn。
2. **消费者遗忘**：新实体（新目录/新字段/新投影）出现后，N 个消费者里有一个没学会
   （门禁 glob、roster、`files`、bundle 数组、回放、文档注册表）。这类 bug 的现场在**消费者**，
   不在生产者。
3. **双份事实漂移**：同一事实两处副本，一处改了另一处没改（模板↔解析器、手册源↔dist、overlay↔render）。

## 策略

### E1 变更面盘点（git 驱动，0 模型）

`git diff --stat <上一轮探索锚点>..HEAD` → 按机制（不是按文件）归组 → 每条机制一个候选面。
上一轮锚点 = 最近一张探索/取证卡；没有就取最近一次发布 tag。

**优先级启发式**（不是公式，用来排序，省得平均用力）：

```
探索优先级 ≈ 近期改动量 × 合同/散文密度 × 现有证据薄度 ÷ 证据成本
```

- 改动量：diff 行数与被触及的消费者数；
- 合同密度：该面在 docs/审计里有没有「必须/不得/红/静默」这类可判定的散文；
- 证据薄度：负例数、有无门禁/探针/回放；只有 happy path 测试 = 薄；
- 证据成本：最低可观察层（E2 的表）。

### E2 先问最低可观察层（证据阶梯）

| 问题 | 最低层 | 资产 | 成本 |
|---|---|---|---|
| 纯派生是否一致 / 边界输入会不会放行 | 纯函数 | `node --import tsx/esm` + 合成输入（`scripts/lib/*-core.mjs`） | 秒 |
| 结构/副本是否漂移 | L0 门禁 + 契约测试 | `pnpm verify` / `pnpm test` | 秒 |
| 新 preset/worker 真挂载了吗 | L1 keyless | `preset.e2e`（已含 worker profiles） | 分钟 |
| 装配出的 model-visible 文本变了吗 | 回放（无模型） | `snapshot-replay.entry` | 分钟 |
| 模型遵守散文纪律吗 | 探针 | `probes/behavior/*`（一次 boot 多场景） | 分钟 + 模型 |
| 整条用户链路通不通 | L4 | 完整 run | 30–60 分钟 + 模型 |

**默认往下走，不默认往上走**：能在纯函数层证伪的命题，不许用探针回答；探针档回答不了的，才考虑 L4。
本轮 pilot 的 5 个问题全部停在第 1–2 层。

### E3 四条无规格 oracle

探索的难点是「没有断言可跑」。本仓有四类现成 oracle：

1. **散文合同变异**：把 docs/审计里写死的「必须红」逐字变成输入，喂给被测函数；绿 = 候选 fail-open。
   这是收益最高的一类——测试通常由实现者按同一条 happy path 写。
2. **表示层差分**：列出「同一事实的两份副本」，逐字段/逐字对账；漂移 = 观察或 bug。
3. **回放差分**：不重录金样，直接跑 `snapshot-replay.entry`；diff 告诉我「这次改动进了哪个座位的
   model-visible 文本」，再判应然/实然。零模型、分钟级，是内容/persona 改动的归因器。
4. **后验取证**：既有会话与 run bundle 就是免费样本（`session-events --stuck-after`、
   `stream-diagnostics --recent`、`provider-error-stats`、`run-inventory`、`unconsumed-evidence`）；
   只记计数与分布，不下单场结论。

### E4 探针加速的三条用法

> 回答用户关切：端到端太慢，探针不是「更小的 E2E」，而是三种加速器。

1. **降级**：按 E2 的表，先把命题压到能回答它的最低层。pilot 里 5 个命题全部没进探针，成本从
   「分钟×模型」降到「秒×0」。
2. **放大**：一支探针 = 一次 boot + N 个场景（现存 `discipline-probe` 5 场景、
   `wave-execution-probe` 1 cell 都是这个形状）。探索时把候选变异塞进同一次 boot 的 N 个场景，
   而不是跑 N 次 run。第 1 轮 X6 就是这种用法：1 boot / ≤6 次调用覆盖 3 个 worker 命题。
3. **取证复用**：`llm-stream-tee` / `session-replay` / `scene-capture` 对既有会话做事后归因；
   探索的第一手材料可以零模型获得。证据落 `runtime/`，只有要冻结成金样才进 `snapshots/`。

### E5 charter 纪律

一条 charter = 一条可被证伪的命题，写清七件（缺一不跑）：

```
ID｜假设（要杀死的命题）｜最低可观察层｜oracle 与变异/场景｜预算｜停止条件｜证据落点
```

- 一条 charter 只证一个命题——红了能归因，绿了能说清证了什么。
- **绿灯必须能被证伪**：每轮至少保留一条负对照（已知该红的输入），防止矩阵退化成「永远绿」。
  pilot 的负对照 = 非法通道 / 预算漂移 / 不可解析预算，它们都真的红了。
- 一个 charter 在最低层无发现 → 记「关闭假设」，**不升级到 L4**；升级需要新理由。

### E6 分诊与毕业

| 判定 | 去向 |
|---|---|
| 真缺陷（有红/绿或复现） | [`_backlog/bugs/`](../bugs/README.md) 卡；修复按 [bugs 通道](../README.md) |
| 文档/命名漂移 | 观察 + 指明 owner，不在本卡修 |
| 契约歧义（两种读法都合法） | 提给用户 / 进 D 号决策，不擅自选一边 |
| 空假设（探索过、没发现） | 记「已探索、无发现」+ 日期；**不写「没有 bug」** |
| 可机械化的一类 fail-open | 升格为守卫：先注入回归看红 → 还原 → 绿，再登记台账（[writing-a-gate](../../.agents/skills/writing-a-gate/SKILL.md)） |

## 第 0 轮 pilot（2026-11-11，已跑）

| # | 面 | 方法 | 结果 | 判定 |
|---|---|---|---|---|
| P1 | `checkStrategy` 策略行对账（D48） | 8 个变异输入跑 `evaluateBundle` | 3 个绿（2 类 fail-open）+ 4 个红（负对照）+ 1 个应绿 | 已开 [BUG-050](../_archived/fixed_bugs/BUG-050-strategy-channel-absent-and-workflow-null-workers.md)（P2） |
| P2 | `canonicalize` / `designSha256` | 顶层/嵌套 key 换序、`-0`/`0`、未知键 | hash 全稳定；schema 拒未知键 | 关闭 |
| P3 | T0 两级预算 | 两个消费点的计数口径 | 同一 `manual` 文本、同一 `.length`；CJK 计 1 | 关闭 |
| P4 | worker profiles（D47） | 结构契约 + row-deps（读码核对） | 6 条契约测试把守行形态；`preset.e2e` 已把 workers 纳入真挂载 | 关闭（一处观察） |
| P5 | 回放角色覆盖 | `snapshots/replay/research-face` 声明（读旧样本核对） | 4 个研究角色；workers/method-editor 按角色语义不入研究面 | 不是缺口；worker 行为仍零证据 → X6 |

**成本**：5 个面（3 个实跑 + 2 个静态核对），0 次模型调用，约 15 分钟；证据为一次性脚本
（运行区 `explore-20261111`，gitignored，可清）。**本轮未跑**：`preset.e2e`、任何 smoke、任何探针。

**两条 shared 前缀**：散文正本 = [D48](../../docs/decisions.md#d48)「plan 头 `- 策略:` 行由
`protocol-audit` 对账通道/worker/预算 cap（预算读不出 = 红）」；下面两个 fail-open 都是这句在
**字段缺席**与**分支不可达**两种情况下的落空。

### P1-a 通道字段缺席零提示（fail-open）

- **输入**：plan 头 `- 策略: worker=research-worker；预算=12 节点/40 cells/L0–L2`（无 `通道=`）。
- **期望**：至少一条 warn——同一行的 worker 缺席、预算缺席各有一条 warn，通道缺席却零 finding；
  且投影仍产出 `channel=spawn`（由正文猜出），审计据此对账而读者不知道通道是猜的。
- **合同依据**：[plan 模板](../../packages/deep-research-pack/content/templates/run/plan.md) 的策略行是
  三字段闭集 `通道=<team|spawn|workflow>；worker=…；门=…；预算=…`；模板要求不等于审计要求，正是缺口所在。
- **实测**：零 `strategy-*` finding；`strategyOf` 投影 `channel=spawn`。
- **位置**：[`protocol-audit-core.mjs`](../../scripts/lib/protocol-audit-core.mjs) 的 `checkStrategy`
  （channel 只有「在场且非法」分支，没有「缺席」分支）。
- **建议判据**：`通道` 缺席 → warn `strategy-channel-missing`（v1 兼容）；v2 再考虑必填转 red。

### P1-b workflow 通道无 Wave 拓扑时 worker 对账被跳过（fail-open）

- **输入**：`通道=workflow；worker=research-worker；预算=…`，plan 无 `## Wave 执行` 节。
- **派生**：`channel=workflow`（声明优先）、`workers.wave=null`（无 wave 节）、`waves=0`。
- **实测**：`expectedWorker = null` → worker 比较被 `!== null` 跳过 → 绿；把 worker 改成
  `research-wave` 也绿。换成「有 Wave 节 + worker=research-worker」才红（负对照，判据有效）。
- **期望**：声明 workflow 但拓扑里没有 wave = 不可执行策略；至少一条 red
  （如 `strategy-workflow-without-wave`），或让声明通道与派生通道必须相等（现在是两套逻辑各判一半）。
- **影响面**：L4 交付审计（`protocol-audit`，`strategyOf` 的唯一消费方）；不影响 run 执行，
  也不进 HITL1 卡文（卡文只投影投入/输出，不投影通道）。

**负对照（证明 oracle 会咬人）**：`通道=Team` → red；`预算=每格看着办` → red；
`预算=4 节点/4 cells` → red；`通道=spawn；worker=research-wave` → red。

**重建方法**：用 `tests/run/protocol-core.spec.mjs` 的 `baseProtocol` 作底，配 `strategyOf` 同形态的
plan 文本，跑 `evaluateBundle`，只看 `strategy-*` code。

**P4 观察（不是 bug）**：`preset-structure` 门禁只 glob `presets/`，`workers/` 的「行形态」由
[tests/pack/workers.spec.mjs](../../tests/pack/workers.spec.mjs) 六条契约把守（`row-deps` 已覆盖 workers）。
契约有家，门禁形状偏窄——owner = `scripts/verify`，本轮不修。

## 第 1 轮 charter 图（待授权）

keyless 批（X1–X5、X7、X8）不调模型、不改产品代码，可自主执行；X6 真模型批单独授权。

| ID | 假设（要杀死的命题） | 最低层 | oracle / 变异 | 预算 | 停止 |
|---|---|---|---|---|---|
| X1 | 投影四处（protocol JSON / §Protocol / 策略行 / 卡文）任一字段漂移都会红或 warn | 纯函数 | 逐字段变异：缺/非法/大小写/单位/边界/自相矛盾 | ~10 min | 变绿 = 候选 fail-open |
| X2 | Protocol 边界输入下 hash/版本/审计解析稳定 | 纯函数 | `auditHashOf` 版本前缀（v1 vs v10）、多 hash 取首、数组顺序敏感性、时区 | ~10 min | 差异 = 候选 |
| X3 | 最近改动没有留下未同步的副本 | 静态 + 逐字 | README.zh↔README、plan 模板策略行↔派生、design/20↔workers、手册源↔`_dist`、overlay↔render | ~10 min | 漂移 → owner/观察 |
| X4 | 内容改动没有意外进入其它座位的 model-visible 文本 | 回放 | 不重录跑 `snapshot-replay.entry`，逐座位读 diff | ~2 min | 差异需判应然/实然 |
| X5 | 既有 run/会话里没有系统性异常 | 既有证据 | `session-events` / `stream-diagnostics` / `provider-error-stats` / `run-inventory` / `unconsumed-evidence` | ~10 min | 只记计数与分布 |
| X6 | worker profile 真按薄工具面与 brief 边界行动 | 探针（1 boot） | subagent 默认落 `research-worker`；child 无 team/goal/ask；被要求组队时不编造工具 | ≤6 次调用 / ≤10 min | 单场不写「稳定」 |
| X7 | symlink checkout 与交接路径没有静默不执行 | keyless | `handoff.e2e`；`isMain` 负例（相对路径/不存在/目录）；`/tmp`→`/private/tmp` | ~5 min | 未跑记未跑 |
| X8 | 新 typed 输入在真浏览器可用 | 已起 GUI | `client-load.entry` + `cdp-probe`；ResearchConfigTab 新字段 | ~5 min | 未起 GUI = 未跑 |

## 预算与授权门

- keyless 批总墙钟 ≤60 分钟；真模型批 ≤1 次 boot / ≤6 次调用 / ≤10 分钟；`SKIP ≠ PASS`，`未跑 ≠ 通过`。
- **不跑 L4 全量**；不重跑 0.3.1 之前的旧矩阵；不把探索结果当回归清单。
- 未获授权不启动 X6；探索卡不授予任何产品代码修改权（守卫/测试的修改按 [bugs 通道](../README.md)
  的 P1/P2 规则或用户指示）。

## 验收标准

1. X1–X5、X7、X8 全跑或逐项写明「未跑 + 原因」；X6 在授权预算内跑完或写明未跑。
2. 每条 charter 有：假设、最低层、实际命令、原始输出/证据路径、判定（发现/关闭/观察/歧义）四态之一。
3. 每条发现已分诊：真缺陷 → `_backlog/bugs/`（含红/绿或复现）；漂移 → owner；歧义 → 提给用户；
   空假设 → 记「已探索、无发现」。
4. 至少一类可机械化的 fail-open 升格为守卫（先注入回归看红 → 还原 → 绿），或写明不升格的理由。
5. 覆盖地图更新：哪一面被证明、哪一面仍空白（含「没人看」与「还没坏过」的区分）；不写「没有 bug」。
6. `pnpm verify` + `pnpm test` 绿；证据落点可复读；本卡不改产品代码。

## 关闭条件

- 上述验收 1–4 满足；覆盖地图与未覆盖面（含 owner）已写进本卡或转成 bug/观察。
- findings 已全部有去向（bug 卡 / 观察 / 歧义 / 空假设），无悬空项。
- 审查记录写 `审查：agent｜用户｜跳过 — 理由`；去向载体成立后与归档同变更。

## 范围与排除项

**范围**：E1–E6 协议；X1–X8 charter；0.3.1 交接修复、D46/D47/D48、T0 两级预算、探针迁根、
client 侧 typed 输入等最近改动触及的面；可复用 `scripts/lib/*-core.mjs`、现有 probes、smoke、回放。

**排除**：无 oracle 的自由点击/漫游；重跑旧矩阵；把探索写成固定回归；L4 全量；改产品代码；
在单场上写「稳定」；用「没找到」回答「有没有 bug」。

## 覆盖地图（滚动）

> 状态：已探（有判定）/ 已关闭（无发现）/ 未跑（写明原因）。空白不等于缺口——先问这个机制会不会坏。

| 面 | 状态 | 判定 / 证据 |
|---|---|---|
| 策略行对账（`checkStrategy`） | 已探 | 2 类静默 → [BUG-050](../_archived/fixed_bugs/BUG-050-strategy-channel-absent-and-workflow-null-workers.md) |
| §Protocol 投影对账（`checkProjectionDetails`） | 已探 | 缺席容忍 + 深度表示不一致 → [BUG-049](../_archived/fixed_bugs/BUG-049-protocol-projection-lines-absent-silent.md)、[BUG-048](../_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md) |
| canonical / design_sha256 | 已关闭 | 第 0 轮 P2（顺序、`-0`、未知键均稳） |
| T0 两级预算计数 | 已关闭 | 第 0 轮 P3（同文本同口径） |
| worker profile 结构 / 挂载 | 已关闭（静态） | 第 0 轮 P4（契约测试 + preset.e2e 覆盖） |
| 回放角色覆盖（角色面） | 已关闭（静态） | 第 0 轮 P5（研究角色 4 席；workers 不入研究面） |
| 回放差分（X4） | 已探 | [BUG-051](../_archived/fixed_bugs/BUG-051-replay-smoke-panerows-undeclared.md)；lead 快照待重录；C2 未归属 |
| 后验扫场（X5） | 已关闭 | 71 场/3742 文件；provider/stream 无系统性异常 |
| 真实 bundle 反向验证 | 已探 | 8/8 `protocol-audit PASS`；2 个单深度 → [BUG-048](../_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md) 生产证据 |
| 入口 / 交接路径（X7） | 已关闭 | `isMain` 五形态无发现；`handoff.e2e` ALL PASS |
| GUI typed 输入（X8） | 未跑 | 需已起 dev GUI |
| worker 行为（X6） | 未跑 | 真模型批未授权 |
| 门禁的缺席语义（node-gate N/A 聚合） | 已探 | 观察：空 bundle 全 N/A、exit 0；acceptance 仍由 evidence-audit 兜底 |
| 已交付 bundle 复核 | 已修（验证） | [BUG-052](../_archived/fixed_bugs/BUG-052-protocol-epoch-day-granularity-retro-red.md)：按回执时间断代，旧交付判「不适用」 |
| plan 头类判据（plan-ref / 策略行） | 已修（验证） | [BUG-053](../_archived/fixed_bugs/BUG-053-plan-header-claims-first-match-anywhere.md)：改用 `headerBlockOf` |
| §Protocol 行「在场但读不出」 | 已修（验证） | [BUG-056](../_archived/fixed_bugs/BUG-056-protocol-projection-unreadable-values-silent.md)：数值解析 + `projection-output-unparseable` |
| 缓存指纹（channel-cache） | 已关闭 | 全目录遍历，新目录自动入键；无「漏键」 |
| 交付回执与 audit 解析 | 已关闭 | 门A 解析紧、receiptProblems 校验哈希 |
| 验收证据载体寿命（acceptance.md） | 已探 | [BUG-062](../_archived/fixed_bugs/BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md)（重跑/repair 抹掉人工走查） |
| 预算上限的输入解析（cells） | 已修（验证） | [BUG-054](../_archived/fixed_bugs/BUG-054-cells-cap-count-only-canonical-bullet.md)：`*`/缩进/大写现计 2，超限红 |
| 裁决冲突（同 claim 相反两条） | 已关闭 | 实际红在 `raw-reparse`；错误码误导，记观察 |
| CLI 前置错误退出码 | 已关闭 | 8 个 run 门/工具在 bundle 缺席时全 exit 2 |
| verdict 契约的机械出口 | 已修（验证） | [BUG-057](../_archived/fixed_bugs/BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md)：FAIL→exit 1 / PASS→0 |
| plan 图结构（无环合同） | 已探 | [BUG-058](../_archived/fixed_bugs/BUG-058-plan-cycle-has-no-mechanical-check.md)（有环全绿 + 提示误导） |

## 已知与未决

- **已知**：策略可用（第 0 轮 15 分钟/0 模型；第 1 轮再出 3 张卡）；基线当日全绿；P4 观察已定 owner；
  3 张 bug 卡均 `等人拍板`（修复触及验收合同，不自授权），修复归另一个 agent。
- **未决**：X1–X8 的实际收益；两个 fail-open 是否同源（都出在 `checkStrategy` 的「声明 vs 派生」
  两套逻辑）；worker 行为证据为零；协议是否值得常驻成 guides/。
- **不证**：单条 charter 的结论不外推到所有输入；X6 单场不证稳定性；探索不证 L4 的语义质量。

## 覆盖与收益（2026-11-11 收口评估）

> 本节的用途：给下一轮（或下一位读者）一个**可复核的收益账**，避免「跑了很久」冒充「探到了东西」。

**产出**：本次探索共开 **16 张缺陷卡**（048/049/050/052/053/054/056/057/058/059/060/061/062/063/064/065）
+ 1 张策略卡（本卡）。其中 **12 张已修复归档**（048/049/050/052/053/054/056/057/058/060/062/063）；
活跃区 4 张：059、061（修复落地，待修复方归档）、064（排查中）、065（修复就绪）。
另有关闭假设 20+ 条（每条都留了对照证据），与 2 条结构性观察（锁无陈旧度 / TOCTOU）未建卡。
**本轮收口**：可达面上的覆盖与收益已耗尽——剩余只有需要真实边界/预算的面（见下表），
按「未跑 ≠ 通过」原样留档，等待用户预算或下一轮 goal。

**已覆盖并有判定**（详见 §覆盖地图）：协议/投影/策略行审计、canonical hash、T0 预算、worker 结构、
回放 A/B/C 三层、后验扫场、真实 bundle 反证、入口/交接、GUI 冒烟（被主机判据挡过）、verdict 契约、
验收证据载体、缓存身份、共享 UI 文案。

**仍然空白 / 被挡**（未跑 ≠ 通过）：

| 面 | 状态 | 阻塞条件 |
|---|---|---|
| X8 浏览器面（client-load 全量） | 未跑 | 并发锁 + 构建过期；等锁后自动跑的后台作业在等 |
| 回放 C 层（061 修复的运行级验证） | 未跑 | 客户端构建/并发窗口；A 层另有 BUG-064 |
| X6 真模型 worker 行为 | 未跑 | 需用户批准预算（≤6 次调用/10 分钟） |
| 回放 B·persona | 红（已知） | D48 后快照未重录，需 with-key 重录 |

**收口条件（建议）**：X8 跑出判定、回放 C 层跑出判定、BUG-064 定性完成；若三者均无新独立缺陷，
本卡可按「覆盖与收益耗尽」收口——`未跑清单` 与 `快照重录` 作为遗留项交给用户决定，不冒充已验。

### 第 22 轮（2026-11-12 02:0x）：第二轮探索——profile 过期 + i18n 面对账

- **进入**：用户反馈「探索有效、继续」；新 goal 优先今日新面。先做 i18n 静态对账，再跑运行级验证。
- **发现**：[BUG-066](../_archived/fixed_bugs/BUG-066-research-profile-team-version-drift-banner-timeout.md) **P2**——
  `research` profile（回放/团队冒烟/录制工具三方依赖）的团队层停在 **rc.2**，runtime 是 **rc.5**：
  `dsh web` 拒绝启动，冒烟以「等待启动横幅超时」收场（原文里才有 incompatible）。三处缺口：
  ① 版本面只修过 `deep-research` 那一份 `profile_ok`（boot-run.sh 注释写着同一事故教训），smoke 的镜像版
  不查版本、replay 完全不查；② 超时归因不识别 `incompatible` 文本；③ 「先跑 boot-run」是死路
  （boot-run 只建 `deep-research`），且 repo 内**无人创建** `research` profile。
- **关闭假设（有证据）**：
  - `locales.ts` 的 zh/en **key 完全对齐**（521 = 521，零缺失）；
  - 占位符 `{...}` 在两种语言里**逐 key 一致**（0 mismatch）；空值 0；
  - 代码里 `t('…')` 用到的 267 个 key **全部存在**（0 missing）；数据面函数的主调用点都显式传了 `props.t`。
- **未跑**：回放运行级（被本条挡住）、X8（另一实例/构建）、X6。
- **下一层**：等 profile 修复（或自建隔离 profile）后跑回放 A/C；继续 i18n 面（折叠文案的 en 断言、
  section-labels 的 zh/en 覆盖）；run 通道 boot 序列。

### 第 23 轮（2026-11-12 02:1x）：X8 首次全绿

- **X8 真跑绿**：`node --import tsx/esm scripts/smoke/client-load.entry.mjs` → **75 PASS / 0 FAIL**
  （`client-load.entry: ALL PASS`）。覆盖：工作区注册/探针会话、插件加载零横幅、seed 数据、方法库
  （列表/详情/开始动作/内置参考）、研究配置页签、终稿页签（读者版/审计版切换、footer 三改法、
  不泄漏中间路径、可滚动）、状态页 ⑤，以及**首屏 Preview Notice 可关闭**（BUG-063 的双语匹配修复在
  真浏览器里成立）。
- **推论**：Client 半（D48 typed 输入与今日 i18n 全量）在真浏览器可用；此前回放 C2 的「研究状态页签
  不在」是回放脚本自身流程/定位问题（059/061 已修），**不是产品缺页签**——X8 的 tabs 清单里
  「对话/方法库/研究状态/研究图谱/研究配置/终稿」全在。
- **i18n 静态面（收口）**：`locales.ts` 521=521、`zh-fold/en-fold` 214=214、占位符逐 key 0 mismatch、
  `t()` 用到的 267 key 全存在；数据面主调用点均显式传 `props.t`。
- **回放仍被 [BUG-066](../_archived/fixed_bugs/BUG-066-research-profile-team-version-drift-banner-timeout.md) 挡**：
  `research` profile 团队层 rc.2 vs runtime rc.5，`dsh web` 拒绝启动（banner 超时）。等该卡修复或
  重建 profile 后再跑 A/C。
- **门禁**：`verify` 1 红、`pnpm test` 1 红——均为另一 agent 在办的
  `tests/run/replay-network-offline.spec.mjs`（缺负例留证块 + import 了 `scripts/smoke/*` 触发 layering）。

### 第 24 轮（2026-11-12 02:2x）：离线闸的边界

- **发现**：[BUG-067](../_archived/fixed_bugs/BUG-067-offline-gate-dns-resolve-bypass.md) **P2**——BUG-064 的修复件
  （在办未提交的 `replay-network-offline.cjs`）在**武装态**（argv 命中 `isDshMain`）下实测：
  `fetch` 外网 → ECONNREFUSED ✓、`dns.lookup` → ENOTFOUND ✓、loopback → 200 ✓，但
  **`dns.promises.resolve4('example.com')` 仍解析成功**（172.66.147.243 / 104.20.23.154）——`resolve*`
  一族与 `Resolver` 未打补丁；且 preload 只在 dsh 主进程安装，**工具 spawn 的子进程**（bash/curl）不受控。
  当前 fixture（web_search/web_fetch 走 fetch）已被覆盖，所以是边界/承诺问题，不是现行故障。
- **方法记录**：探针用 `/tmp/fake/apps/cli/lib/bin.js` 让 argv 尾命中 `isDshMain()` 的形态，从而真正
  安装闸门——比单纯 require 模块更能复现真实武装态。
- **未跑**：回放 A/C（仍被 [BUG-066](../_archived/fixed_bugs/BUG-066-research-profile-team-version-drift-banner-timeout.md)
  的 profile 版本挡住）；X6。
- **下一层**：BUG-066 修复后跑回放；继续 run 通道 boot 序列与 i18n 折叠文案的 en 运行断言。

### 第 25 轮（2026-11-12 02:2x）：回放闭环 + 一次自我修正

- **回放独立复跑（安静窗口，锁空闲）**：`snapshot-replay.entry --face research-face --scenario lead`
  → **A PASS、C0–C5 全 PASS**（C5 逐字命中金标准）。这同时确认了 **BUG-064**（离线闸生效）与
  **BUG-061**（C2 页签 + 渲染金标准）的运行级修复；仍红的三条 B 是 **D48 后快照未重录**（persona/headers/
  runtime-context），属已知的 with-key 项。
- **自我修正（撤回）**：[归档 BUG-066](../_archived/fixed_bugs/BUG-066-research-profile-team-version-drift-banner-timeout.md)
  的机制句「团队层 rc.2 → dsh 拒绝启动」被三组对照实验证伪（research 无闸 / research+闸 /
  deep-research+闸 全部出横幅）。02:0x 那次 banner 超时仍未复现，原因未定。
- **新卡**：[BUG-070](../_archived/fixed_bugs/BUG-070-bug066-mechanism-refuted-and-residual-profile-wiring.md) **P2**——
  记录上述证伪 + 两处残留：① `team-preflight` 仍 `PROFILE='research'` 且未用 `profile-health`
  （归档 066 状态行称「team-preflight 本就用它」与代码不符）；② `profile-health` 的「先跑 boot-run
  重建」对 `research` 是死路（boot-run 只建 deep-research）。
- **顺带观察（不建卡）**：`profile-health.runtimeVersionOf` 读 `vendor/dsh/package.json` 的 version，
  而 boot 实际用的是 `apps/cli` 的构建产物/源码——两者在当前 pin 下同版本；若未来子包版本漂移，
  版本门会看错源。当前无实例。
- **未跑**：X6；快照重录（with-key，需预算）。

### 第 27 轮（2026-11-12 04:0x）：全绿树上的并发锁窗口

- **现场**：对方已提交三个修复（`948a4e74` 双语产品内容/品牌、`e061ccc9` 根角色身份 + 072、`3ead53c3`
  回放自包含/profile 预检/超时归因）；`verify` **0 红**、`pnpm test` **1233 绿**、构建新鲜。
  072 按建议收窄为 `产品内(?!容)` 并留注释。
- **新卡**：[BUG-073](../_archived/fixed_bugs/BUG-073-run-lock-creation-window-race.md) **P2**——共用
  `scripts/lib/run-lock.mjs` 的建锁非原子：`mkdir` 与写 `owner.json` 之间的窗口里，并发者把半成品锁
  当陈旧锁接管；创建者随后写回自己的 pid，覆盖新属主 → 两者都以为持有锁，且文件变成失效 pid 后
  第三方可再接管。已用确定性步骤复现（`B acquired = true` → `owner = null, file pid 99999`）。
- **关闭假设**：`builtin-display` 的显示投影完整性（5 个内置打法的 name/summary/sections/pattern
  在 zh/en 下均非空、zh 逐字等于 canonical、en 已译）；用户条目渲染走 `entry.name` 不经过投影，
  `isBuiltin` 分支守卫正确——无新泄漏点。
- **X8**：在全绿树上重新起跑（结果见下轮/本节更新）。
### 第 28 轮（2026-11-12 04:1x）：解析器变异矩阵抓到 readiness 劫持

- **新卡**：[BUG-074](../_archived/fixed_bugs/BUG-074-readiness-inline-quote-hijack.md) **P1**——readiness 终局解析被
  **行内引用的旧判定**劫持：`旧轮记录：\`readiness: PASS\`；本轮真实终局：readiness: FAIL` → 判 **PASS**
  （fail-open，门A/门②③/run-accept 都吃它）；反向 `- **第 1 轮**：\`readiness: FAIL\` 血统；本轮 readiness: PASS`
  → 判 **FAIL**（误杀）。根因：`stripVerdictDecor` 的「短标签 → 包裹壳 → 行首 readiness」把引用内容
  当成判定行，每行只取第一个 match；源码头注声称「行内引用两条路径都不认」，与实测不符。单测只覆盖
  「引用在独立行」的附录形态，未覆盖同行。
- **关闭假设（契约成立，不建卡）**：verdict raw 的「前导语 + 围栏」「围栏 + 尾注」被判 `raw-reparse` 红——
  与 `claim-verdict` skill 的「唯一产出 = 一段 JSON 数组，放在最终消息里」一致，是纪律信号不是解析 bug；
  仅记录「错误文案可更具体（raw 含围栏外文字）」，不建卡。
- **观察**：D49 默认中文的「用户显式选 English 仍覆盖」目前只有手工验证；`client-load` 已把浏览器钉 zh，
  运行时 en 切换路径没有真浏览器冒烟覆盖，且 Note 自述 L2 安装形态未复跑（bundle patch 改的是安装缺省）。
- **同一轮再抓一条**：[BUG-075](../_archived/fixed_bugs/BUG-075-hitl2-pending-row-counted-as-decision.md) **P1**——
  门③ 把「HITL2 **未拍板**」当拍板行：`isHitl2Row` 只做 `/HITL2/` 词面判断；合成 bundle 实测
  「pending-only 行 + 同 run 旧答复」→ 门③ **PASS**（G8 形态 fail-open：v2 未裁决也能放行）。
  根因 = 行判据无决策/否定语义 + 见证不绑最新 ask/版本。
- **状态纪律**：074/075 都触及门禁与验收合同 → 按 `_backlog/AGENTS` 翻转守卫改为 **等人拍板**（不是修复就绪）。
- **未跑**：X8 seed 模式（主机 load/cpu 2.87 → NOT-RUN）；X6/快照重录（预算）。
### 第 29 轮（2026-11-12 04:3x）：交付链全量扫出假红

- **新卡**：[BUG-076](../_archived/fixed_bugs/BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md) **P2 等人拍板**——
  `schema-scan` 的 D28 顶层白名单漏了今天协议/复核/wave 的 canonical 件：`protocol.json`(8)、`review/`(8)、
  `protocol-audit.md`(5)、`waves/`(4)、`protocol/`(1)；契约期新 run 必红。`run-accept` 不跑该门（不阻塞
  验收），但 L4/发布清单被误判；真违约（`.probe.py` 等）反而被淹没。
- **同轮确认（非新卡）**：`drt_ai-model-regulation-cn-eu-us` 的 `protocol-audit` 红（投入节点 18 > JSON 12）
  是 Note 已登记的既有数据偏差，不重复建卡。
- **门② 观察**：`presentGate` 只要求「有一条 present 指向在场的 final/vN」，不要求是最新版本——v2 在场而
  只 present v1 会 PASS。契约文本写的是「不可变快照 + 事件链」，按现行语义不算违约；记观察不建卡，
  若产品要「交付必须是最新 vN」再另立判据。
- **未跑**：X8 seed（load 高）、X6/快照重录（预算）。
### 第 30 轮（2026-11-12 04:2x）：安装/打包面首次整档跑绿

- **L2/T0 冒烟全绿（本会话首次）**：
  - `pack.e2e`：ALL PASS（174 tarball 条目；导出/入口/凭据边界/两次 npm pack 同 sha）；
  - `lifecycle.entry`：ALL PASS（21 项：market.json 校验 → 装 tarball → 本包行 dump → 真启动 → 五个
    specifier 中英标题/图标 → remove 后 roster 回落）；
  - `profile-concurrency.entry`：ALL PASS（并发 plugin add/remove 后 profile 可解析、无双 bundle）；
  - `release.entry --install-only`：ALL PASS（19 项：真实安装形状 + **端口释放无残留**，进程卫生面成立）；
  - `doctor.e2e`：ALL PASS（半装点名、坏设置 warn、doctor 不写 profile）。
- **观察（不建卡）**：D49「装本包首次启动即中文」的**安装域**仍无判据——上述冒烟只验形状/显示标题，
  不查 `locale.preference`；且 `_dist` tarball 是 16:06 旧产物（D49 之前的包），安装域断言只能等
  重新出包后复跑。Note 已自述 L2 未复跑。
- **交付链门禁全量扫**：path-hygiene/secret-scan 在 3 个样本 bundle 上干净；schema-scan 的假红见 076；
  protocol-audit 的 18>12 是既有数据偏差（Note 已登记）。
- **未跑**：X8 seed（load 高）、X6/快照重录（预算）。
### 第 31 轮（2026-11-12 04:3x）：D49 后 X8 复验 + 四个假设关闭

- **X8（D49 + 品牌改动之后）**：`client-load.entry` → **76 PASS / 0 FAIL，ALL PASS**。默认中文 +
  `Orca 深度搜索` 单行品牌在实际渲染下成立（冒烟钉 zh-CN 浏览器）。
- **关闭假设（均无现场实例，不建卡）**：
  - 门④「提及即记账」：扫全部 final/v2+ 的真实 bundle，**0 例**仅非决策提及（弃用/未执行）——理论
    缺口未落地；
  - 门②「present 旧版本也算」：扫真实 delivered.json，**0 例** delivered < max(final/vN)；
  - `acceptance.md` 人工走查拼接：`manualEvidenceOf` 在下一个 `##` 处截断、`withManualEvidence` 幂等，
    模板不生成同名节——无重复/丢失；
  - evidence-audit 与新契约一致：原 bundle（`drt_llm-inference-cost-routes`）实跑 CRITICAL 0 / MAJOR 4，
    与盘上 audit.md 逐项一致（复制到 /tmp 的副本因会话绑定丢失而全红，是**绑定语义正确**的证据，
    不是 gate bug）。
- **观察**：D49 的**安装域**默认中文仍无判据（`_dist` tarball 为 16:06 旧包）；client-load 钉 zh 后，
  运行时 en 切换路径没有真浏览器覆盖。
- **未跑**：X6/快照重录（预算）。
### 第 32 轮（2026-11-12 04:4x）：run-accept 全链冒烟抓到硬崩溃

- **新卡**：[BUG-077](../_archived/fixed_bugs/BUG-077-protocol-audit-write-reference-error.md) **P1**——
  `protocol-audit --write` 在 `renderReport` 里引用未 import 的 `PROTOCOL_CONTRACT_DATE`
  （`6a463a20` 删了 import 但模板还在用）→ `ReferenceError` exit 1；`run-accept` 预检全绿后
  **写报告阶段必败**，`protocol-audit.md` 永远写不出、验收被卡死。
- **现场**：`node scripts/smoke/run-accept.e2e.mjs` 3 项失败（⑩ run-accept 绿 / protocol-audit.md
  落盘 / ENOENT），可稳定复现；手跑 `--write` 拿到完整 ReferenceError 栈（`--no-write` 正常，所以
  预检与既有测试没咬）。
- **同轮顺带跑绿**：seed 模式 X8 **74 PASS / 0 FAIL**（干净机器首启 + 绑定 run + 侧栏切换）；
  `product-boot.entry` GREEN（16 项）；`run-lock` 8 路并发实测 **1 成功 / 7 busy**（原子锁成立）；
  回放 CLI 未知 face/scenario 正确 exit 2。
- **写路径横扫（补证）**：在真实 bundle 副本上逐个跑 `--write`——`evidence-audit` / `verdict-audit` /
  `node-gate` 的 write 路径均无崩溃（红跑也照写报告）；**只有 `protocol-audit --write` 崩**（077）。
- **观察（不建卡）**：`manifest.json` 的 `FILE_ROLES` 未登记 `protocol.json` / `protocol-audit.md`
  （role=unknown），`review/`·`waves/`·`protocol/` 目录不入清单——与 076 同批「新件未登记」类，
  但 manifest 是 ops 目录说明书、无门禁消费，先记观察。
### 第 33 轮（2026-11-12 04:5x）：门② 的相对逃逸

- **新卡**：[BUG-078](../_archived/fixed_bugs/BUG-078-portable-bundle-path-relative-escape.md) **P2 等人拍板**——
  `portableBundlePath` 对相对路径直接放行（不查 `..`），门② `presentGate` 把
  `../drt_x/final/v1.md`（bundle 外）当可移植标签并 **PASS**；绝对外部路径则正确 RED。
  `repairReceiptPaths` 同病：外部相对指针原样保留、`ok=true`、无 action。
- **可达性**：vendor present 正常写绝对路径（绝对外部已 RED），需相对路径事件才触发；真实日志扫描
  0 例——属包含性/纵深防御缺口，非现行故障。
- **同轮排除**：`repairReceiptPaths` 的绝对路径归一化、broken JSON、manual-only、present=null 四态
  行为均正确（无崩溃/无静默数据丢失）；`run-dashboard` 在新契约 bundle 上正常生成。
- **同轮补跑（全绿）**：`data.entry` **16 PASS**（包目录零写入 / 假 token 不泄漏 / 卸载保留 workspace+session）；
  `install-shape.entry` **9 PASS**（profile init → add pack+team → 真启动出 token、无 did not activate）。
- **死链面收口**：对 299 个 mjs/ts 做相对 import 静态解析扫描——**只有 user-env.entry 一处断链**
  （=079），`dev/` 的 shell 引用也无缺（`ui-sidebar-right` 为 vendor 相对路径，存在）。
- **未跑**：077 仍未修（`run-accept.e2e` 红着）；X6/快照重录（预算）。
### 第 34 轮（2026-11-12 04:5x）：冒烟清单里躺着一具死尸

- **新卡**：[BUG-079](../_archived/fixed_bugs/BUG-079-user-env-smoke-dead-import-seed-core.md) **P2**——
  `user-env.entry.mjs` 仍 import D40 S3（`33eea10b`）已删除的
  `packages/.../scripts/lib/seed-core.mjs` → **启动即 ERR_MODULE_NOT_FOUND**；而 `scripts/README.md`
  仍把它列为 keyless 关键面（「已有用户环境共存」）——自 11-01 起零覆盖，`smoke-contract` 只对账
  成员/档位、不验可启动性，所以一直绿。
- **同轮跑绿**：`workspace-isolation.entry` **ALL PASS**（17 项：两套 home/profile/port/state/workspace
  各自绑定、会话组互斥、marker 互不可见、端口释放）。
- **环境观察（不建卡，但会挡发布）**：本机 `~/.npm/_cacache` 有 root 属主文件 → `npm pack` 报
  EPERM（`sudo chown -R 502:20 ~/.npm` 可修）。`pack.e2e`（dry-run）不受影响；真实 `npm pack` /
  `export-dist` 在本机会失败。另：`npm pack` 会触发 `prepack` 重建 `lib/`，跑之前注意别与在办构建
  撞车（本轮撞到一次 lib 空窗，已自行恢复）。
- **未跑**：077 仍未修（`run-accept.e2e` 红着）；X6/快照重录（预算）。
### 第 35 轮（2026-11-12 04:5x）：D49 的 English 覆盖运行级验证

- **探针（一次性，未入库）**：`bootWeb` 启 `deep-research` profile + `--patch`（`locale.preference: en`），
  playwright `en-US` 打开首屏 → **品牌显示 `Orca Deep Research`**（`Orca 深度搜索` 不出现）。
  即：D49 的「bundle 缺省 zh、profile patch 显式覆盖 en」在运行时成立。
- 局限：探针没有开 session，页签 chrome 未渲染，只验到品牌（同一个 translator 的输出）；要验全部 chrome
  需建会话（client-load 已覆盖 zh 面，en 面可另立探针）。
- **同轮跑绿**：`discipline-probe` **ALL PASS**（5 场景行为标记：b1 差集出题 / 收活缺件打回 /
  UNVERIFIED 第三态 / hitl1 计划卡）。
- **未跑**：077/079 仍未修；X6/快照重录（预算）。
### 第 36 轮（2026-11-12 05:0x）：protocol-audit 变异矩阵——全部与成文契约一致

在真实 bundle（v2 protocol）副本上做 6 组变异：

| 变异 | 结果 | 判定 |
|---|---|---|
| plan.md `protocol: v1` vs JSON v2 | RED `plan-ref` | ✓ |
| 策略行预算 99/99 vs JSON 8/12 | RED `strategy-mismatch` | ✓ |
| 删掉整行 `- 策略:` | warn `strategy-missing` + PASS | ✓（D48 成文：缺字段 = warning） |
| §Protocol `protocol: v1` vs JSON v2 | RED `projection` | ✓ |
| JSON audience 改一字 | RED `protocol-changed` | ✓（v2 设计指纹） |
| 预算写成「八个节点」 | RED `strategy-budget-unparseable` | ✓（fail-loud） |
| 预算= 空值 | warn `strategy-budget-missing` + PASS | ✓（缺字段 = warning） |

结论：protocol-audit 的判据与 D48 笔记逐条吻合，未找到新的假绿/假红；该门唯一缺陷仍是
[BUG-077](../_archived/fixed_bugs/BUG-077-protocol-audit-write-reference-error.md)（`--write` 崩溃）。
- **未跑**：077/079 未修；X6/快照重录（预算）。
## 第三轮 goal 收口（2026-11-12 05:0x，12 轮用满）

### 本轮新发现（6 张卡）

| 卡 | 级别 | 一句话 | 状态 |
|---|---|---|---|
| [BUG-074](../_archived/fixed_bugs/BUG-074-readiness-inline-quote-hijack.md) | P1 | readiness 终局被行内引用劫持：同行旧 PASS + 真实 FAIL 读成 PASS（反向误杀） | 等人拍板 |
| [BUG-075](../_archived/fixed_bugs/BUG-075-hitl2-pending-row-counted-as-decision.md) | P1 | 门③ 把「HITL2 未拍板」当拍板行：同 run 旧答复即可放行（G8 fail-open） | 等人拍板 |
| [BUG-076](../_archived/fixed_bugs/BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md) | P2 | schema-scan 白名单漏 protocol/review/waves/protocol-audit.md → 新契约 run 必红 | 等人拍板 |
| [BUG-077](../_archived/fixed_bugs/BUG-077-protocol-audit-write-reference-error.md) | P1 | `protocol-audit --write` 缺 import 崩溃 → run-accept 写报告阶段必败 | 修复就绪 |
| [BUG-078](../_archived/fixed_bugs/BUG-078-portable-bundle-path-relative-escape.md) | P2 | 相对 `..` present 路径绕过 bundle 外拒收（门② PASS） | 等人拍板 |
| [BUG-079](../_archived/fixed_bugs/BUG-079-user-env-smoke-dead-import-seed-core.md) | P2 | user-env.entry 引用已删除 seed-core → 启动即崩，README 仍宣称覆盖 | 修复就绪 |

### 覆盖增量（本轮跑过的档位/探针）

- **L2/T0 岛首次整档**：pack.e2e ALL PASS、lifecycle.entry ALL PASS（21）、profile-concurrency ALL PASS、
  release.entry `--install-only` ALL PASS（19，含端口释放）、doctor.e2e ALL PASS、data.entry ALL PASS（16）、
  install-shape.entry ALL PASS（9）、workspace-isolation.entry ALL PASS（17）。
- **非默认路径**：`client-load --seed`（干净机器）**74 PASS / 0 FAIL**；`product-boot.entry` GREEN（16）；
  D49 English 覆盖探针（profile patch en）→ 品牌 `Orca Deep Research`（缺省 zh 可被显式覆盖）。
- **并发/进程卫生**：run-lock 8 路并发 1 成功 / 7 busy；release.entry 端口释放无残留。
- **解析器/门禁变异**：readiness（行内引用劫持→074）、planIndex（自环/2-环/重复 id/CRLF 均正确报 issue）、
  protocol-audit（7 组变异全部与 D48 成文一致）、repairReceiptPaths（四态正确）、frontmatter（BOM 理论盲点，
  2795 个真实 evidence 零实例）。
- **死链扫描**：299 个 mjs/ts 相对 import 静态解析 → 仅 079 一处断链。

### 未跑（交给下一轮/预算）

- **X6 真模型 worker 行为**、**回放 B 层快照重录**（均需预算/with-key）；`client-hitl.entry` /
  `team-preflight.e2e` 等真模型档同理。
- 077/079 落地后的复跑（`run-accept.e2e` / `user-env.entry`）。
- 安装域默认中文（需重新出包；本机 npm cache 有 root 属主文件，`npm pack` EPERM，先
  `sudo chown -R 502:20 ~/.npm`）。

### 拍板事项（074/075/076/078）

四条都指向**门禁/验收合同**，按 `_backlog/AGENTS` 需要你或评审放行；修复方落 077/079 即可解除验收阻塞。
### 第 37 轮（2026-11-13 02:4x）：半角括号绕过 BUG-123 的修复

- **新卡**：[BUG-127](../_archived/fixed_bugs/BUG-127-library-halfwidth-parens-provenance-default.md) **P2 修复就绪**——
  `library-fold` 的标题解析只认全角 `（）`：半角 `## 方法(来源〔默认偏好〕)` 里**括号内的标记被算成真默认**
  且 name 变成 `方法(来源)`；交换文档顺序后 `findDefaultMethod` 会把该条选成库默认（注入错误的
  `research:defaults` 方法默认）。BUG-123/124 的修复只覆盖全角。
- **验证方式**：`foldLibrary` + `findDefaultMethod` 矩阵（6 变体 + 默认顺序对照），见卡内复现。
- **下一层**：同族归一助手是否还漏半角（upsert/render 往返）、半角 `〔〕` 与其他全角标点；未跑，记空白。
### 第 38 轮（2026-11-13 02:5x）：全角空格让 upsert 变成 dup

- **新卡**：[BUG-128](../_archived/fixed_bugs/BUG-128-method-heading-ideographic-space-duplicate.md) **P2 修复就绪**——
  `methodHeadingPattern` 只把 `[ \t]` 当空白：标题含 **U+3000 全角空格**（中文输入法常见）时 fold 读得出
  name，upsert 却判 `created` → 编辑一次多出一条同名方法；旧条目后续编辑会改错对象，两条都带默认标记时
  普通保存被「多个默认偏好」拒绝。
- **实测**：`## 方法\u3000（来源）` 与 `## 方法（来源）\u3000〔默认偏好〕` 均 `created` / 2 条。
- **下一层**：把「标题归一（空白+括号宽度）」抽成 fold/write 共用件（与 127 同源）；其他标题标点
  （全角冒号/顿号）未扫，记空白。
### 第 39 轮（2026-11-13 03:0x）：绝对路径的根被丢掉

- **新卡**：[BUG-129](../_archived/fixed_bugs/BUG-129-final-path-drops-absolute-root-alias.md) **P2 修复就绪**——
  `finalPathOf` 对绝对路径只留终稿族后缀：`/tmp/other-workspace/drt_x/final.md` 与
  `/ws/../other/drt_x/final/v2.md` 都返回 `drt_x/...`；两个消费方（delivery-watch / useStatusFeed）
  没有原文可校验 → 跨 workspace 同 slug 的 present 会被别名成当前 cwd 的 bundle（打开错文件或静默失败）。
- **实测**：5 条路径矩阵见卡；本 workspace 根/archive/_abandoned 正确，跨 workspace 与 `..` 均被接受。
- **下一层**：`presentInLogs`（旧场非结构化 present）是否有同类根丢弃；未跑，记空白。
### 第 40 轮（2026-11-13 03:0x）：D50 的未知键静默失效

- **新卡**：[BUG-131](../_archived/fixed_bugs/BUG-131-defaults-unknown-key-warnings-unsurfaced.md) **P2 修复就绪**——
  手写 `research-defaults.json` 打错键（`efort` / `audiance`）时：`show` 无任何提示、面板不渲染
  `store.warnings`、下一次写入把未知键**静默删除**。实测 show 输出 `ok revision=3 effort=deep
  output=full_report`（两个错键零提示），set 后文件里错键消失。
- **根因**：parse 把未知键归 warnings；command 的 code-like 词表没有 warn 通道；store 存了 warnings
  但 DefaultsPanel/Button 零消费。
- **下一层**：warnings 的本地化文案与 problems 的视觉区分；未跑，记空白。
### 第 41 轮（2026-11-13 03:1x）：expectedRevision 不是 CAS

- **新卡**：[BUG-132](../_archived/fixed_bugs/BUG-132-defaults-expected-revision-race-lost-update.md) **P2 修复就绪**——
  8 进程同时 `set`（同一 `expectedRevision=3`），**首轮就有 2 个返回 `ok revision=4`**：乐观并发的
  「stale 拒绝」只覆盖「读完→写前」的串行交错，**同时读**的写者都通过检查，后写覆盖先写，一次更新
  静默丢失（revision 只 +1）。unset/clear 同构。
- **根因**：runSet 读→比→写无跨进程锁，rename 前不复核；writeValue 回读只比对 revision（双方都是 4）。
- **下一层**：clear 与 set 的并发（unlink 竞态）未单独实测；记空白。
### 第 42 轮（2026-11-13 03:1x）：sanitizePatch 的「拒绝」没落地

- **新卡**：[BUG-133](../_archived/fixed_bugs/BUG-133-sanitize-patch-nested-unknown-keys-silent.md) **P2 修复就绪**——
  `sanitizePatch` 头注写「output/source 的未知子键拒绝」，实现却把未知子键塞进 warnings 后传 `[]`
  丢弃：`{"output":{"shape":"full_report","audiance":"CFO"}}` → problems=[]、patch 只剩 shape，
  命令 `ok` 写盘（audience 丢）；`{"source":{"familes":[…]}}` → 整条丢、只报 empty-patch（误导）。
- **对照**：顶层未知键 `efort` 正确拒绝（problems not-allowed）——同一函数两套标准。
- **下一层**：面板 `store.setPatch` 同样放行（未知子键不进 problems）；warnings 词表与 131 统一；记空白。
### 第 43 轮（2026-11-13 03:2x）：门③绑定扫 content

- **新卡**：[BUG-134](../_archived/fixed_bugs/BUG-134-gate-witness-bound-slugs-scans-content.md) **P1 等人拍板**——
  门侧 `boundSlugsOf` 对整段 `arguments` 做 `drt_<slug>/` 子串扫描；合成会话只写过
  `drt_a/notes.md`、但 content 里提到 `drt_b/final/v1.md` → **drt_b 门③ PASS**（借到了 drt_a 的 HITL2 答复）。
  pack 侧 `slugInArgs` 已修过 BUG-090（只认路径字段），门侧没共享该判据（注释声称同源）。
- **对照**：真实写过 drt_b 路径 + HITL2 答复仍应 PASS（修复判据里的绿对照）。
- **下一层**：`presentGate` 的会话范围同样受此绑定污染（路径仍需匹配本 bundle，风险较低）；未跑，记空白。
### 第 46 轮（2026-11-13 03:4x）：D50 真模型探针 C5 红 + 探针失败路径泄漏

- **新卡**：[BUG-137](../_archived/fixed_bugs/BUG-137-defaults-probe-language-merged-into-defaults-option.md) **P2 等人拍板**——
  `defaults-probe` seeded 场景 C5 失败：HITL1 第三问的选项名写成
  「沿用项目默认：近 12 个月 + official/regulatory + **中文**」——语言被并入「项目默认」选项（D50 明令禁止）。
  auto 场景对照 PASS，说明不是探针一律判红。
- **BUG-136 补证（第二例）**：同一探针**失败退出也不清理宿主**（3125 留下 pid 81155）→ 换端口重跑即
  「身份不可读拒绝收割」exit 2；我已清理自己起的 3125 宿主，3124 的陌生宿主（73948）未动。
- **未跑**：C5 的多次稳定性采样（需先修 136，避免继续制造孤儿宿主）；记空白。
### 第 47 轮（2026-11-13 03:5x）：归一化覆盖不到的尾部 = 幽灵条目

- **新卡**：[BUG-138](../_archived/fixed_bugs/BUG-138-method-heading-unrecognized-suffix-ghost-entry.md) **P2 修复就绪**——
  标题带未识别尾部（`[草稿]`、`v2`）时，fold 读得出 name，但 upsert 的白名单正则匹配不到 → **created**
  造出第二条同名；`removeMethodEntry` 只删得掉新的那条，旧条目成**幽灵**（再删返回 false、再编辑又新建）。
  实测：`created [方法, 方法]` → remove `[方法]` → remove again `false`。
- **对照**：`(待审)`（半角括号段）能正常 updated——差别只在尾部段是否在正则白名单里。
- **下一层**：默认标记与幽灵的组合（两同名条目的 default 计数）；`removeMethodEntry` 按 fold 行号定位的
  改法未实现；记空白。
### 第 48 轮（2026-11-13 04:0x）：设置文件的 BOM

- **新卡**：[BUG-139](../_archived/fixed_bugs/BUG-139-defaults-bom-parse-failure.md) **P2 修复就绪**——
  `research-defaults.json` 首字节为 UTF-8 BOM 时 `parseDefaults` 直接 `JSON.parse` → `file=parse`：
  面板 invalid、命令拒绝、`research:defaults` prompt 整段不注入，唯一出路是 clear（丢设置）。
  Windows 记事本/PowerShell 的常规「UTF-8 with BOM」即可触发。
- **对照**：无 BOM 的同一内容 problems=[]、value 正常。
- **下一层**：`frontmatter.mjs` 的 BOM 面（工具写入为主，风险低）未改；记空白。
### 第 49 轮（2026-11-13 04:1x）：两条 P1 的修复只收窄了词表/关键词

- **[BUG-140](../_archived/fixed_bugs/BUG-140-hitl2-vocabulary-two-way-misclassification.md) P1 等人拍板**——075 修复的
  邻接复发：`HITL2 待用户确认（v2）` 不在否定表（表里只有「待确认」）却含决策词「确认」→ 计为拍板行；
  合成 bundle（v1 答复 + v2 pending 行）**门③ PASS**。反向：`无异议/OK/approved/采纳` 不在决策白名单
  → 真拍板被判非行（误杀）。
- **[BUG-141](../_archived/fixed_bugs/BUG-141-readiness-inline-context-keyword-gap.md) P1 等人拍板**——074 修复的邻接复发：
  `旧轮真实记录：\`readiness: PASS\`；现在 readiness: FAIL` → **PASS**（旧引用带「真实」、裸写新判定不带
  关键词）；反向 → **FAIL**；引号 PASS + 裸写 FAIL → **null**。
- **共性**：两处都把语义判断做成了有限词表/上下文窗口；修复方向应是「范围仲裁 + pending 优先/默认」
  而不是继续加词。
- **修复回归（A 的 127–135 批）**：`sanitizePatch` 嵌套未知键现在进 problems（133 ✓）；8 进程同
  expectedRevision 并发写从「2 个成功」变「**恰好 1 个成功**」（132 ✓）；`show` 输出带 `warn=` 且
  set/unset 对未知键 fail-loud（131 ✓）。
- **下一层**：X8（client-load）在 275b8c03 上跑（12 PASS 进行中）；074/075 正向用例回归；记空白。
### 第 50 轮（2026-11-13 04:2x）：X8 红追到「method-editor 会话」

- **X8 现状（275b8c03）**：68 PASS / 4 FAIL（上次绿 620ff4d3），失败项：重入点描边 / rerun 图例 /
  停靠点诚实线（状态页）。
- **追因**：meta.boundSession = `method-coach-0d7456dd…`（title 方法编辑，header preset =
  **method-editor**）；它**写过** `drt_cn-us-ai-perception/run.md`（boundBy=write），事件数 ≥60、标题唯一
  → 被选择器当成「真实 run 的绑定会话」。
- **新卡**：
  - [BUG-142](../_archived/fixed_bugs/BUG-142-client-load-selects-method-editor-session.md) P2 修复就绪——选择器缺
    「lead 根」门；method-editor 富会话被选中 → 状态页按 lead 期望判 → **假红**（不是产品渲染回归）。
  - [BUG-143](../_archived/fixed_bugs/BUG-143-method-editor-root-has-team-lead-tools.md) P2 等人拍板——method-editor
    根会话**仍拿到 Team Lead 全套工具**（实测 spawn_teammate×4 / team_task_create×9 / create_goal×1 /
    写 run.md）；071 的 persona 纠偏没覆盖 method-editor（当时「下一层」原话）。
- **下一层**：若产品希望 method-editor 能看 run 状态，则 142 的修法改为「按 coach 自己的锚点真值判」；
  143 需产品决定 persona 边界还是 vendor 门控；记空白。
### 第 51 轮（2026-11-13 04:3x）：写侧/读侧不成对——代理记账行被打哑

- **新卡**：[BUG-144](../_archived/fixed_bugs/BUG-144-kickoff-provenance-rows-not-counted-as-hitl2.md) **P1 等人拍板**——
  `run-kickoff` 的官方代理记账行（`closingProvenanceRow` 写入 §Decisions）在 075 修复后不再被
  `isHitl2Row` 认：原话是 `OK`/`继续`/`就按这个吧` 时行内含「交付审阅 + 代理模拟」却无决策词 → false。
  实测：`OK` false、`继续` false、`就按这个吧` false、`同意按现稿交付` true。
- **根因**：mention 白名单专门把「交付审阅+代理模拟」当 HITL2 行，decision 白名单又把它一票否决；
  写侧不强制决策词，读侧却要求——**官方写入器不在读侧白名单里**。
- **与 140 的区别**：140 是用户手写行的词表双向误判；本条是写/读不成对（修复点不同）。
- **下一层**：历史 §Decisions 里的代理行统计（真实语料）未扫；记空白。
### 第 52 轮（2026-11-13 04:4x）：人工走查里的二级标题

- **新卡**：[BUG-145](../_archived/fixed_bugs/BUG-145-manual-evidence-subheading-truncation.md) **P2 修复就绪**——
  `manualEvidenceOf` 以任意 `##` 为节尾：人工走查内含 `## 检查记录` → 返回 **null**（整节丢失）；
  `## 附注` → 尾部被截断。重跑验收/`--repair` 静默覆盖，062 的「保留人工证据」承诺在自由书写下失效。
- **对照**：纯文本与 `###` 子标题正常保留。
- **同轮排除**：`projectionOf` ↔ `evaluateBundle` 在 8 个真实 protocol 上 **0 红**（写/读同源）；
  `serializeDefaults` ↔ `parseDefaults` 8960 组矩阵只差 families 的规范化排序（设计行为，不建卡）。
- **下一层**：acceptance 其它保留面（`--repair` 的 acceptance 处置已覆盖）未扫；记空白。
### 第 53 轮（2026-11-13 04:5x）：真挂载档全绿 + 140 证据补强

- **preset.e2e 真挂载**（`DSH_SMOKE_REAL=1`）：**37 PASS / 0 FAIL**——5 角色 + 2 worker profile
  全部真挂载；method-editor 只看见自己的 skills、Lead 看见 lead+角色 skills（D47 协调面）。
  （注意：不带 `DSH_SMOKE_REAL=1` 时它只跑文件预检并 exit 0，输出写「预检绿」——不算 ALL PASS。）
- **140 补证**：拍板行里含跟进词也会被否定表误杀——`HITL2 定稿（附未决项：补研究 W3）` 与
  `HITL2 通过（待补引用 3 处）` 都判 **false**（true 应保留）；已补进 140 的表格。
- **本轮无新卡**：keyless 面的新发现开始变薄；剩余主动面 = 136–145 修复后的回归、真模型探针
  （136 端口自锁未修前不宜再跑，避免继续制造孤儿宿主）。
### 第 54 轮（2026-11-13 05:0x）：双语产品 × 中文 HITL 签名

- **新卡**：[BUG-146](../_archived/fixed_bugs/BUG-146-hitl-signatures-chinese-only-bilingual.md) **P2 等人拍板**——
  HITL 判型只认中文文案（`研究类型` / `定稿（按现稿交付）`），门侧答复要求 label 含「定稿」：
  英文 HITL2 卡 + 英文答复 → **门③ RED**（答复在但不被认）；`deriveAnchors` → anchor-2 **upcoming**
  （开放交付审阅不显示 pending）。
- **关键**：ask 的 id 是语言无关的（`research_type` / `hitl2_delivery`），修法应优先用结构 id，
  文案只作历史兼容；若产品决定「卡文案永远中文」，则 skill/persona 需显式钉住。
- **下一层**：中文旧卡/历史卡回归、英文 idle 卡的 UI 实测；记空白。
### 第 55 轮（2026-11-13 05:1x）：全绿输出里的「0 题」假绿

- **新卡**：[BUG-147](../_archived/fixed_bugs/BUG-147-client-hitl-zero-answers-false-green.md) **P2 修复就绪**——
  `client-hitl.entry` 全绿（12 PASS），但 ⑤b 明细是「共作答 **0** 题 / 卡共 1 题 · Submit 已点击」；
  断言 `/共作答 \d+ 题/` 把 0 也当通过 → 「挂起卡已答」是假绿（选择器未选中任何项，空提交关闭了回合）。
- **同轮**：client-hitl 的其余观察（活标题翻转、横幅、右栏自动展开、二次挂起）**实打实 PASS**；
  真模型调用正常。截图留档 `runtime/smoke-workspace/client-hitl-2026-11-12T19-19-45-025Z.png`。
- **下一层**：`hitl-answer` 为何 0 题（选择器/卡片结构）；空提交是否产品允许；记空白。
### 第 56 轮（2026-11-13 05:2x）：短引文不进审计

- **新卡**：[BUG-148](../_archived/fixed_bugs/BUG-148-evidence-short-quotes-not-audited.md) **P2 修复就绪**——
  evidence-audit 只收集 ≥16 字的 `>` 引文；插入「短句伪造。」（6 字）与一条 23 字伪造，长伪造被
  `[转写不符]` 点名，**短伪造在 audit.md 里 0 次出现**（连 INFO 都没有；`摘录回溯 0/325` 的分母也不含它）。
- **对照**：长伪造 finding 正确；短引文是「静默丢弃」而非「降级报告」。
- **下一层**：真实 bundle 的短 `>` 行统计（避免修完大规模误报）；记空白。
## 第四轮 goal 收口（2026-11-13 05:3x，9 轮；目标 10，实际 22）

### 本轮新发现（127–148，22 张）

- **已修归档（127–135，9 张）**：半角括号默认标记 / U+3000 重复 / 绝对路径根别名 / 锁活 pid 永久阻塞 /
  defaults 未知键静默 / expectedRevision 非原子 CAS / sanitizePatch 嵌套未知键 / 门③绑定扫 content /
  slug 字符集未成文。
- **活跃 13 张（136–148）**：
  - 136 defaults-probe 端口自锁（泄漏宿主 + 身份检查；失败路径也泄漏）
  - 137 D50 探针 C5：语言被并入「沿用项目默认」选项
  - 138 方法标题未识别后缀 → 编辑生成同名幽灵（删不掉/改不动）
  - 139 research-defaults BOM → 整份设置失效
  - 140 isHitl2Row 词表双向误判（pending 词变体仍算拍板；无异议/OK/approved 误杀；含跟进词误杀）
  - 141 readiness 行内引用修复只认上下文关键词（旧引用劫持 / null）
  - 142 client-load 绑定会话未限定 lead（method-editor 富会话 → X8 68/4 假红）
  - 143 method-editor 根会话仍有 Team Lead 工具/身份（实测 spawn_teammate/team_task/写 run.md）
  - 144 run-kickoff 代理记账行不被 isHitl2Row 认（官方恢复路径被打哑）
  - 145 人工走查节含二级标题 → 整节/尾部在重跑验收时静默丢弃（062 复发）
  - 146 HITL 判型/答复识别只认中文文案（英语卡 → 门③必红、UI 锚点误判）
  - 147 client-hitl ⑤b 把「共作答 0 题」当通过（代理一题未答的假绿）
  - 148 evidence-audit 只回溯 ≥16 字引文（短伪造无 finding、分母漏计）

### 覆盖增量（本 goal 新增）

- 真模型：defaults-probe（2 调用，C5 红→137）、client-hitl（2 调用，12 PASS，但暴露 147 的 0 题假绿）。
- 观察面：X8 在 275b8c03 上 68/4（142 选择器假红，非渲染回归）；seed X8 74/0、product-boot 16/0（更早轮）。
- 对账/矩阵：projection↔audit 8/8 绿；defaults serialize↔parse 8960 组仅规范化排序；library render↔fold
  干净；claims/verdicts 模板与解析器字段一致；写/读配对（145/144/146）成高产来源。
- 「门槛/计数静默放行」类：0 题（147）、短引文（148）、未知键（131）、待用户确认（140）。

### 未跑（交给下一轮/修复后）

- 136 修好后的 137 复跑（≥2 次采样）；147 修好后的 client-hitl（须 ≥1 题且 selected 非空）；
- 143 需产品取舍（persona 边界 vs vendor 门控）、146 的中文卡钉死或双语识别；
- X6/team-preflight（真模型大档）未跑；`npm pack`/export-dist 受本机 root-owned npm cache 阻塞
  （`sudo chown -R 502:20 ~/.npm`）。

### 结论

可达面在最后三轮明显见底（3→2→1 张新卡，最后多为「门槛静默放行/写读不成对」的邻接变体）。
目标（≥10）早已达成；剩余价值集中在 **A 修完 136–148 后的逐条回归**与 **136 解除后的真模型复跑**。
## 第五轮 goal 记录（2026-11-13 03:5x 起）

### 第 57 轮（05:0x）：修完即验——140/141 的邻接复发

- **背景**：A 的 `bb0323ac` 修完 136–148 并归档；`verify` 0 红、`test` 1355 绿、构建 03:45 新鲜。
- **新卡**：
  - [BUG-149](../_archived/fixed_bugs/BUG-149-hitl2-pending-vocabulary-holes.md) **P1 等人拍板**——140 修复把判据反成
    「无 pending 即默认拍板」，pending 词表的遗漏被放大：`等回复/未最终裁决/挂起/推迟/待办：等用户/未决/暂不交付/on hold`
    **全部 APPROVE**（仅 `awaiting reply` 命中 await）。
  - [BUG-150](../_archived/fixed_bugs/BUG-150-readiness-keyword-window-still-hijacked.md) **P1 等人拍板**——141 修复只把
    关键词表扩到「现在/新判定」；`随后/复核后/结论/本 run` 的裸写 FAIL 仍被旧 PASS 劫持（实测 4/4 PASS）。
- **修复回归（已验绿）**：145 人工走查含 `##` 完整保留；146 英文 HITL2 门③ PASS；148 短引文产出 finding。
- **共性**：两处都在用**有限词表**做语义判断；修复方向应是「默认 fail-closed / 范围仲裁」，而不是继续加词。
### 第 58 轮（2026-11-13 05:1x）：147 修成了假红

- **新卡**：[BUG-151](../_archived/fixed_bugs/BUG-151-client-hitl-click-count-false-red.md) **P2 修复就绪**——
  147 用「点击计数 ≥1」判已答；但 Recommended 预选卡无需点击，答案批已落地
  （盘侧 `selected:["要 (Recommended)"]`）→ `client-hitl --port 3143` **⑤b FAIL（共作答 0 题）**，
  10 PASS / 2 FAIL。hitl-answer 自己的注释早写明「点击计数不可作判据」——修法选错了判据层。
- **同轮**：140/141 的邻接复发已立 149/150（两条 P1）；145/146/148 修复验证为绿。
- **共性**：代理指标（点击计数/关键词/词表）代替盘侧事实——最近的修复反复在这条线上翻车。
### 第 59 轮（2026-11-13 05:2x）：X8 仍红——是负载假红？

- **新卡**：[BUG-152](../_archived/fixed_bugs/BUG-152-client-load-unhealthy-host-assertion-red.md) **P2 修复就绪**——
  142 的选择器修复已验（本轮 boundSession 是 **lead**，marker「处理已写入文件记录，采用」），但 X8 仍
  **68 PASS / 4 FAIL**；失败现场 `meta.json`：`reason=assertions`、`hostHealth=NO（load 15.45 / load/cpu 1.54）`、
  断连 0 次。收口判据 `isHostUnhealthyVerdict` 只在**连接死亡/pageLost** 时转 NOT-RUN → 负载下的
  渲染断言失败被判成产品红（3 项状态页断言）。
- **修复回归（已验绿）**：136（探针端口回退/清理，3124 占用时自动换临时端口）、137（defaults-probe
  **ALL PASS**，C5 语言并入已修）、139 BOM、142 选择器、143 method-editor persona 明禁组队/写 run、
  144 代理记账行、145 人工走查、146 英文 HITL2（门③ PASS、anchor-2 pending）、148 短引文 finding。
- **下一层**：在健康窗口复跑 X8（若仍红则把 152 升级为产品回归）；149/150/151/152 待 A 修。
### 第 60 轮（2026-11-13 05:3x）：安装/发布面复跑 + 修复回归

- **安装/发布面（bb0323ac 之后）**：`lifecycle.entry` **ALL PASS**（22 项）、
  `release.entry --install-only` **ALL PASS**（57 项）——安装形状/端口释放未受 127–152 修复影响。
- **回归已验绿**（本轮逐条）：136 探针端口回退/清理（3124 被占时自动换临时端口；跑完 3124 无残留）、
  137 defaults-probe **ALL PASS**（C5 语言不再并入）、139 BOM、142 选择器（boundSession 已是 lead）、
  143 method-editor persona 明禁组队/写 run、144 代理记账行、145 人工走查含 `##` 完整保留、
  146 英文 HITL2（门③ PASS / anchor-2 pending）、148 短引文 finding。
- **未跑（主机 load 24 时不做浏览器/真模型）**：X8 健康窗口复跑、team-preflight/X6、151 的 client-hitl 复跑。
### 第 61 轮（2026-11-13 05:4x）：版本快照只查在场

- **新卡**：[BUG-153](../_archived/fixed_bugs/BUG-153-protocol-snapshot-presence-only-not-content.md) **P2 等人拍板**——
  protocol v2 + `protocol/v1.json = {}` → `protocol-audit` **PASS**：历史快照只查文件在场，schema/版本/
  设计指纹全未校验（D46 的「协议版本链」可被占位文件冒充）。
- **对照**：当前版本的设计指纹（`protocol-audit.md` 的 vN design_sha256）已核；历史版本没有任何核对。
- **下一层**：v3 多级链（只查 v{n-1} 是否足够）、真实 bundle 的 v1 快照内容复核；记空白。
### 第 62 轮（2026-11-13 06:0x）：交付清单漏了新证据体

- **新卡**：[BUG-154](../_archived/fixed_bugs/BUG-154-manifest-roles-missing-new-artifacts.md) **P2 修复就绪**——
  `buildManifest` 在新契约 bundle 上：`protocol.json`/`protocol-audit.md` 角色 **unknown**；
  `review/`（claims/verdicts）与 `waves/`、`protocol/vN.json` **完全不在 manifest**（无哈希）——
  D44/D46 的核心证据不在交付可校验清单内。
- **对照**：schema-scan 白名单（076）已修；manifest 的角色表未同步。
- **下一层**：目录清单的数量上限/分节设计、run-accept 的 manifest 生成路径复跑；记空白。
### 第 63 轮（2026-11-13 06:1x）：人工证据的边界又错了

- **新卡**：[BUG-155](../_archived/fixed_bugs/BUG-155-manual-evidence-known-titles-are-table-labels.md) **P2 修复就绪**——
  145 的截断表 `{检查, 回执, 清单, 读者版}` 来自 acceptance **表格行标签**，而生成器根本没有 `##` 节：
  人工在走查里写 `## 检查`/`## 清单` → `manualEvidenceOf` 返回 **null**（整节丢失）。
- **实测**：生成的 acceptance `## ` 标题数 = 0；四个通用标题全部 null；只有 145 的 `## 检查记录` 保留。
- **下一层**：历史 acceptance 的人工节位置分布、`--repair` 后的字节级保留；记空白。
### 第 64 轮（2026-11-13 06:2x）：门③的版本级 fail-open

- **新卡**：[BUG-156](../_archived/fixed_bugs/BUG-156-hitl2-gate-no-version-pairing-pending-filtered.md) **P1 等人拍板**——
  §Decisions 同时有旧拍板行（v1 定稿）与最新 pending 行（v2 待用户确认）时：pending 行被
  `isHitl2Row` 过滤 → 旧行 + 旧答复满足门③ → **PASS**（v2 未拍板仍放行）。把 pending 写成「未决」更糟：
  149 的词表不含它，被当拍板行（同样 PASS）。
- **根因**：075/140/144/149 修的都是**行分类**；门③没有「最新一行/最新版本必须已拍板」的**版本配对**
  （门④有版本记账，门③没有）。`latestAsk` 只保证答复对应最新 ask（v1 的），v2 根本没问。
- **下一层**：行内 `vN` 提取与 final 最高版本的对账设计；真实多版本 run 语料；记空白。
### 第 65 轮（2026-11-13 06:3x）：证据出处/必要输入缺席 = warning

- **新卡**：
  - [BUG-157](../_archived/fixed_bugs/BUG-157-verdicts-missing-session-only-warning.md) **P1 等人拍板**——verdicts 的
    `batch.session` 指向不存在的会话时 `problems=[]`（仅 `session-missing` warning）→ 伪裁决可过 audit；
    原文/身份/深度/父会话四条判据同时失效。
  - [BUG-158](../_archived/fixed_bugs/BUG-158-verdict-audit-review-missing-only-warning.md) **P2 等人拍板**——review.md
    整缺时 critical `unverifiable` 不产生红（`review-missing`/`unverified-critical` 都 warning）；同场景
    有「坏 review」反而红（`review-round-ref`），即「文件越缺越绿」。交付整体由 node-gate 兜底（实测红），
    但 verdict-audit 的独立 PASS 不可信。
- **门④/门②的版本配对**：156 已覆盖门③；present 版本 vs 最新 final 的观察（不算违约）暂不建卡。
- **累计**：本 goal **10 条（149–158）**，目标达成。
### 第 66 轮（2026-11-13 06:4x）：claim 的证据指针没人管

- **新卡**：[BUG-159](../_archived/fixed_bugs/BUG-159-claims-evidence-topics-not-validated.md) **P2 等人拍板**——
  claims 的 `evidence`/`topics` 从不与盘上对账：`evidence/nope.md`、`/Users/...`、`topics:["T9"]`
  全部 `problems=[]`；把 `/Users/...` 写进 `review/claims.json` 后 `schema-scan` 仍 **green**
  （内容扫描只对 `.md` 生效）。与 154（review/ 不入清单）叠加，三层都没拦住。
- **对照**：claims 的 id/text/urls/critical 形状校验严格；坏的是**语义/在场**层。
- **下一层**：verdicts-rN.json 的绝对路径（同样不在 .md 扫描面）、topics.md 的 id 解析；记空白。
## 第五轮 goal 收口（2026-11-13 06:4x，6 轮；目标 10，实际 11）

### 新卡（149–159，共 11 张）

| 卡 | 级别 | 一句话 |
|---|---|---|
| [149](../_archived/fixed_bugs/BUG-149-hitl2-pending-vocabulary-holes.md) | P1 | 140 反成默认拍板：等回复/未最终裁决/挂起/推迟/未决/on hold 全 APPROVE |
| [150](../_archived/fixed_bugs/BUG-150-readiness-keyword-window-still-hijacked.md) | P1 | 141 只扩关键词：随后/复核后/结论/本 run 的裸写 FAIL 仍被旧 PASS 劫持 |
| [151](../_archived/fixed_bugs/BUG-151-client-hitl-click-count-false-red.md) | P2 | 147 用点击计数：Recommended 预选卡答案已落地却判红（client-hitl ⑤b 假红） |
| [152](../_archived/fixed_bugs/BUG-152-client-load-unhealthy-host-assertion-red.md) | P2 | client-load 的 host-health 收口只认连接死亡——负载下断言失败仍判 FAILURE |
| [153](../_archived/fixed_bugs/BUG-153-protocol-snapshot-presence-only-not-content.md) | P2 | protocol 版本快照只查在场：`v1.json = {}` 也 PASS |
| [154](../_archived/fixed_bugs/BUG-154-manifest-roles-missing-new-artifacts.md) | P2 | manifest 角色表未登记 protocol.json/protocol-audit.md；review//waves/ 不入清单 |
| [155](../_archived/fixed_bugs/BUG-155-manual-evidence-known-titles-are-table-labels.md) | P2 | 人工走查的「已知节」来自表格标签——`## 检查/## 清单` 整节丢失 |
| [156](../_archived/fixed_bugs/BUG-156-hitl2-gate-no-version-pairing-pending-filtered.md) | P1 | 门③过滤 pending 后，旧拍板行+旧答复仍放行新版本（无版本配对） |
| [157](../_archived/fixed_bugs/BUG-157-verdicts-missing-session-only-warning.md) | P1 | verdicts 的 batch.session 不存在只 warning——伪造裁决可过 |
| [158](../_archived/fixed_bugs/BUG-158-verdict-audit-review-missing-only-warning.md) | P2 | review.md 整缺时 critical unverifiable 不红（node-gate 兜底） |
| [159](../_archived/fixed_bugs/BUG-159-claims-evidence-topics-not-validated.md) | P2 | claims 的 evidence/topics 未与盘上对账；schema-scan 只扫 .md |

### 已验绿的修复回归（139/136/137/142/143/144/145/146/148/130）

- 136 探针端口回退/清理；137 defaults-probe **ALL PASS**（C5）；139 BOM；142 选择器（boundSession=lead）；
  143 method-editor persona；144 代理记账行；145/146/148 人工走查/英文 HITL2/短引文；
  130 锁恢复入口（错误带锁路径与处置）。
- 安装/发布面：`lifecycle.entry` 22 PASS、`release.entry --install-only` 57 PASS。

### 未跑 / 状态说明

- 主机 load 20+，X8 健康窗口复跑、team-preflight/X6、client-hitl 复跑未跑。
- **A 正在实时修 149–159 的批次**（工作树 12 个源文件修改中，测试从 4 红降到 1 红）；收口时
  `pnpm test` 1 红、`verify` 0 红，均为 in-flight 状态，未建卡。

### 收口时的修复回归（A 的工作树，未提交；verify 0 / test 1361-0）

| 卡 | 回归结果 |
|---|---|
| 149 | 8 个 pending 变体全部 pending ✓ |
| 150 | 4 个裸写 FAIL 全部 FAIL ✓（范围仲裁已落地） |
| 151 | client-hitl 改用 `landedAnswerOf`（盘侧 landed batch）✓ |
| 152 | `isHostUnhealthyVerdict` = 不健康 + 断言失败即 NOT-RUN（不再要求连接死亡）✓ |
| 153 | `protocol/v1.json={}` → RED（缺字段 + version undefined）✓ |
| 154 | manifest 角色：protocol/protocol-audit/review-claims/review-verdicts/protocol-snapshot ✓ |
| 155 | `## 检查`/`## 清单` 的人工走查完整保留 ✓ |
| 156 | 旧拍板 + 最新 pending 仍 **PASS**（未修） |
| 157/158/159 | `problems=[]`（verdict-audit-core 未在修改面，未修） |

### 结论

目标（≥10）达成（11 张）；A 的批次在工作树已让 149–155 转绿（未提交），**156–159 仍开放**。
三条高产线：**有限词表/关键词做语义判断**、**缺席/在场即放行**、**呈现层标签或代理指标当结构/判据**。
剩余价值 = 156–159 的修复 + 安静窗口真模型/观察面复跑（X8/team-preflight/client-hitl）。
## 用户答复（2026-11-11）

- **Q1**：采纳；持续做，不设固定轮数（goal 驱动，剥洋葱式逐层深入）。
- **Q2**：keyless 批授权；**真模型批仍待单独批准**（未获批准不启动 X6）。
- **Q3**：**只写 bug 卡，不修、不补守卫**；修复由另一个 agent 按卡执行。
- **Q4**：暂缓；协议留在本卡，跑几轮再决定是否毕业成 guides/ + Note。

## 执行记录

> 每轮记：进入的面、最低层、命令、发现（bug 卡链）/关闭假设、未跑项、下一层。

### 第 1 轮（2026-11-11）：审计的「在场才查、缺席即过」层

- **进入**：X1 投影四处 + X2 Protocol 边界。方法 = 纯函数矩阵：官方生成器输出 × 逐行删除/变形 × 期望红；
  负对照（已知该红的输入）同场跑。0 模型、秒级、总耗时约 15 分钟。
- **发现（3 张 bug 卡）**：
  - [BUG-048](../_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md) **P1**：深度投影只解析首对 →
    deep 档（`L1,L2,L3`）用官方生成器投影即假红；单深度 `['L3']` 则整段漏检。真 run 交付审计会被误拦。
  - [BUG-049](../_archived/fixed_bugs/BUG-049-protocol-projection-lines-absent-silent.md) **P2**：§Protocol 的
    `来源/投入/输出` 行缺席时零 finding（只对在场行对账）；同节 plan 缺席也只剩 warning。
  - [BUG-050](../_archived/fixed_bugs/BUG-050-strategy-channel-absent-and-workflow-null-workers.md) **P2**：策略行通道缺席
    无提示（worker/预算各有 warn）；`通道=workflow` 且无 Wave 节时期望 worker 为 null，worker 对账被
    静默跳过。
- **关闭假设（有负对照）**：standard 档 + 完整投影绿；端点写法 `L1–L3` 绿；cells 天花板按
  `min(声明, band)` 正确红；非法通道/预算漂移/不可解析预算仍红。
- **剥出的下一层**：① 同族「缺席容忍」的其余检查（`checkAudit` 的 `audit-missing`=warn、
  `checkPlanRef` 空 plan）；② 「生成器 / 检查器 / 模板」三方表示不一致的横切（`join('–')` 后再用正则反解）；
  ③ 未跑的 X4 回放、X5 后验扫场、X7、X8。
- **未跑**：X4–X8（下轮）；真模型 X6 未获授权。

### 第 2 轮（2026-11-11）：回放差分 + 后验扫场 + 生产数据反证

- **X4 回放差分**（keyless，`--face research-face`）：lead 场景 3 条红。
  - [BUG-051](../_archived/fixed_bugs/BUG-051-replay-smoke-panerows-undeclared.md) **P2**（新发现）：`snapshot-replay.entry`
    的 C3/C5 引用 `paneRows`，而该变量与采集块在提交 `1f15379` 被整块删除 → 渲染金标准断言永远抛
    ReferenceError、`--update-expected` 同样不可用。归因到提交级。
  - **快照过期（观察，非 bug）**：lead 的 `B·persona` 红，diff 正是 D48 的「深度与篇幅 + 输出形态」合并
    （expected = 旧两问，actual = 新一问）；快照录制于 16:22、D48 于 22:15 落地。守卫按设计咬人 →
    动作 = with-key 重录 lead（需用户预算），不作为缺陷卡。
  - **C2「研究状态」页签红：未归属**。当前工作树有另一个 agent 在改 client 半（22:36 重建过 `lib/client.js`），
    且 C 层本身被 BUG-051 打断；等 BUG-051 修复后在干净树上复跑再判，不写成结论。
- **X5 后验扫场**（keyless，零新 run）：71 场 bundle / 3742 文件 / 32.1 MiB（最老 48 天）；
  `provider-error-stats` 近 30 天仅 2 次回合终结、23 次重试全部被拦截（无「一次即死」）；
  `stream-diagnostics --recent 8` 最近会话无失败、终态均为 alive-or-idle。**无系统性异常**。
- **生产数据反证**：8 个带 `protocol.json` 的真实 bundle 全部 `protocol-audit PASS`（3 个抽检 + 8 个扫描）；
  其中 2 个单深度（`L0`/`L1`）→ BUG-048 的漏检在生产里成立（已回填该卡生产证据并把 P1 校准为 P2）。
- **本轮观察（暂不建卡，等复现第二次）**：① `lensIdsOf` 不过滤 HTML 注释而 `countCellsOf` 过滤 →
  注释掉的 lens 会进投影的 `knowledge.lenses` 但不计 cell（今日无消费者，影响 = 投影不自洽）；
  ② §Protocol 枚举用子串匹配：来源行写 `unofficial` 可满足 `official`、`risks_ignored` 可满足 `risks`
  （假通过；修法需 token 匹配，代价是可能误红，留待二次复现再定性）。
- **X7 入口（部分）**：`isMain` 五形态实跑——直接/相对路径/符号链接/硬链接均 `true`，目录与不存在路径均
  `false`；`/private/tmp` 归一化按预期生效。**无发现**。`handoff.e2e` 未跑（下轮）。
- **未跑**：X7 的 handoff.e2e（本轮补跑，见下）、X8 GUI typed 输入；X6 真模型未授权。

### 第 3 轮（2026-11-11）：门禁的缺席语义 + 已交付 bundle 复核

- **X7 补跑（闭合）**：`handoff.e2e` **ALL PASS**（HANDOFF 含 git init / gitlink 40 位 SHA /
  submodule update / pnpm install；无运行态、凭据、run 数据）。入口面本轮无发现。
- **发现**：[BUG-052](../_archived/fixed_bugs/BUG-052-protocol-epoch-day-granularity-retro-red.md) **P2**——已交付
  bundle `drt_api-context-caching-ds-openai`（交付 01:10，D46 落地 10:01）今天被 `protocol-audit`
  判红 `[no-protocol] 契约日后缺 protocol.json`（exit 1），与 `delivered.json` 的 `gate PASS` 矛盾；
  根因 = 契约日与 epoch 都只到日粒度，`epoch >= CONTRACT_DATE` 把同日早场追溯成新契约。这与 D46 Note
  「旧 bundle 豁免」的意图冲突。范围 = 同日 6 场中仅此 1 场缺 protocol.json 且已交付。
- **关闭假设（有证据，不是「跑绿了」）**：
  - `node-gate` 对空目录全门 N/A、**exit 0**：CLI 头注明说「N/A = 无对象，不是通过也不是失败」，
    但机器面只有 exit code；`run-accept` 会把它显示成「PASS node-gate 预检」。整条 acceptance 仍被
    evidence-audit 拦住（空 bundle 实测 RED），故不构成放行；记为**观察**（owner = scripts/run-gates），
    不建卡。
  - `verdict-audit` 的会话缺席 → 只 warn `session-missing`、不判红：**设计与测试已在案**
    （verdict-audit-core 头注 + `tests/run/verdict-audit.spec.mjs` 明确「不假装核过原文」），不建卡。
- **未跑**：X8 GUI typed 输入（需已起 dev GUI；且 client 半正被另一个 agent 修改）；X6 真模型未授权。
- **下一层**：其余契约门的同日窗口（`CONTRACT_DATE` 族逐条核）、`run-accept` 的「预检项 PASS/红
  标签」是否会把 N/A 读成绿、以及 BUG-051 修复后的回放复跑（C2/C5 归属）。

### 第 4 轮（2026-11-11）：契约断层扫尾 + plan「头」的语义

- **BUG-052 扩证**：node-gate 的六道门优先用整数 `schema:` 断代，不吃日期（`isPreContract` 见 schema 即
  按现行契约），所以同日窗口只落在 protocol-audit 与同形的 verdict-audit（今天无第二实例）；已回填该卡。
- **发现**：[BUG-053](../_archived/fixed_bugs/BUG-053-plan-header-claims-first-match-anywhere.md) **P2**——plan-ref 与
  策略行两条「头」判据都用全文首匹配：缺 `> protocol: v1` 头但正文一句 `- 修订记录：protocol: v1 仍适用`
  → 绿；策略行写进 `## 备注` 正文（无 `>`）→ 绿（连 `strategy-missing` 都没有）。与 BUG-048/049/050
  同族：散文说「头/必须/在场」，实现用「全文出现过」近似。
- **对照（判据本身有效）**：全文无 `protocol:` → red；策略行完全缺席 → warn；头齐 → 绿。
- **未跑**：X8（client 半仍被另一个 agent 修改）、X6 真模型。BUG-051 仍未修（`paneRows` 四引用零声明）。
- **下一层**：抽「头块」助手的横切收益（plan-ref/策略行/未来头字段）、`run-accept` 预检标签的 N/A 观感、
  以及 BUG-051 修好后的回放复跑。

### 第 5 轮（2026-11-11）：同一函数的更强形态 + 缓存/回执面排除

- **[BUG-049](../_archived/fixed_bugs/BUG-049-protocol-projection-lines-absent-silent.md) 扩证（第二形态）**：行**在场但
  读不出**同样静默——`投入：18 节点 / 18 cells`（无 `≤`，与 JSON 12/8 不符）→ 无 finding；
  `输出：…分节 = decision`（缺 risks、无 `sections =`）→ 无 finding。三处读法都要求额外格式前提，
  前提不满足整段跳过（对照：生成器原样绿）。修法 = 在场 + 可解析都要 fail-loud，与
  `strategy-budget-unparseable` 同档。
- **关闭假设（有证据，不建卡）**：
  - `channel-cache` 的 pack 指纹遍历整个 pack 目录（只跳过 node_modules/.git），`workers/` 等新目录
    自动入指纹——**没有「新目录漏键」**；残留风险只剩「改内容不改 size/mtime」（git checkout 回滚
    时间戳）这类边缘形态，不入卡。
  - `门A` 的 `audit.md` 解析很紧：恰一个标题/概要/发现行/CRITICAL 章节，计数 0 时必须仅含「（无）」，
    >0 时条目数必须等量——**没有「摘要行说谎」的假通过**；且 `receiptProblems` 会核对回执哈希
    （交付后改 final/audit 即红），此前「回执不落地校验」的猜测被证伪。
- **并发上下文**：另一个 agent 正在改 `protocol-audit-core` / `protocol-core` / `snapshot-replay.entry`
  （paneRows 已恢复、protocol 测试在动）——本轮结论以**未改文件**的机制为准；被打补丁的面上不再追新卡。
- **回放复跑（测试已全绿、client 改动仍在工作树）**：lead 仍 4 红，`C2` 稳定复现——右栏可见页签只有
  Agent Team / Chat / Method library，**「研究状态」与「研究配置」两个 pack 页签都不在**；C3/C5 连带。
  当前树含未提交的 client i18n 重构（14 文件，含 ResearchStatusTab/ResearchConfigTab/ResearchGraphTab），
  归属待其提交后复跑；**不先建卡**（未落地的在办改动不算缺陷）。复现命令 =
  `node scripts/smoke/snapshot-replay.entry.mjs --face research-face --scenario lead`。
- **快照（B·persona）**：仍为 D48 后未重录，需 with-key 重录（用户预算）。

### 第 11 轮（2026-11-11）：文案断言的 locale 归属

- **发现**：[BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) **P2**——
  回放冒烟的 guide 胶囊定位器写死中文 `/研究状态/`，而客户端文案已随 locale（同一环境可见页签是
  **英文 `Method library`**，Playwright 默认 en-US）→ C2 必红，C3（0 行）/C5（金标准）连带，
  **渲染金标准守卫在 en-US 环境整片失效**。同仓 `client-load.entry` 已有正确写法（双语正则 + 注释
  「Tab title is locale-owned」），可作修复范本。
- **X8 未跑（honest）**：`client-load.entry` **exit 2 NOT-RUN**——主机不健康（load 7.77 / free 86MB < 512MB）。
  未跑 ≠ 通过；等主机释放后再跑。
- **归属依据**：当前工作树仍含未提交的 client i18n 重构，故 C2 的「成因已证、修复归属待提交后确认」；
  卡里只主张**定位器与 locale 契约**这一层，不主张产品 bug。

### 第 12 轮（2026-11-11）：观察面证据为何长期不可达

- **发现**：[BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) **P2**——`host-health` 的
  free 判据用 `os.freemem()`（macOS 只报 free pages），实测 182MB < 512MB 阈值判「不健康」，而同一时刻
  `vm_stat` 的 inactive+free+speculative ≈ 6.9GB 可回收、load/cpu = 0.88——**误报**。后果：`client-load.entry`
  在开发机上常态 NOT-RUN（X8 长期不可达），且真实产品红可能被 `isHostUnhealthyVerdict` 收口成环境红。
  修复方向 = 平台相关可用量（macOS: free+inactive+speculative；Linux: MemAvailable），阈值语义写清。
- **[BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 扩证到代码层**：
  `launchChromium()` = `chromium.launch()`（无 locale）+ `newPage()`（无 context 选项）= Playwright 默认
  `en-US`；同批脚本的 locale-owned 文案定位器清单已列进卡（client-load-final.support / client-load.entry），
  修一处不必再逐条踩。
- **未跑**：X6 真模型；X8 仍被主机健康判据挡住（本卡）。
### 第 13 轮（2026-11-11）：locale 修好后的残余

- **[BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 修复已验证**：双语定位器 +
  `newPage({ locale })` 钉住，金标准头注写明「locale: zh-CN，本金标准不是 en-US 转录」——本轮复跑页签 chrome
  已是中文（新会话/插件/方法库）。
- **新卡 + 当轮定性**：[BUG-061](../_archived/fixed_bugs/BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md)
  **修复就绪**——locale 修好之后 C2 仍红，根因已证到 vendor 文案键：回放钉了 `zh-CN`，但右栏展开按钮
  仍用英文 `getByRole('button', { name: 'Open right sidebar' })`，而 vendor `chrome.expandAria` 的
  zh 是 **「打开右侧边栏」** → `count() === 0` → 右栏没展开 → guide 胶囊不可见 → C3/C5 连带。
  同批 `client-load.entry` 明确保持 en-US 且注释了理由——两条策略各自自洽，**混用**才出事。
  三条初始假设（流程/注册/场景）已作撤回记录留在卡上。
- **未跑**：X6 真模型；X8 仍被 [BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) 挡住。
### 第 14 轮（2026-11-11）：观察面放行后的第一跑

- **[BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) 修复已验证**：`host-health` 新增
  平台采集——macOS 读 `vm_stat` 的 free+inactive+speculative+purgeable（`availableMemoryMBFromVmStat`），
  Linux 读 `MemAvailable`（回退 MemFree+Buffers+Cached）；本机实测 available = **7616MB** → healthy
  （此前 `os.freemem()` 182MB → unhealthy）。纯函数单测 10 例绿（含「读不出 → null」的 fail-loud 反例）。
- **X8 尝试被并发实例挡住**：`client-load.entry` exit 2「另一个实例在跑（pid 33393；锁
  `runtime/smoke-workspace/client-load.lock/owner.json`）」——锁与 pid 存活检查工作正常，另一 agent
  正在跑同一冒烟；**未跑 ≠ 通过**，等锁释放后再跑。

- **第二条观察（TOCTOU，未证）**：`acquireRunLock` 是「先 `mkdirSync` 后写 `owner.json`」；若并发者在
  写盘前看到锁目录，`lockOwnerPid()` 因 JSON 读失败返回 `null` → 被当成「属主已死」而**接管**（rm 掉
  别人刚建的锁）。窗口在微秒级，但本机多 agent 并发时并非不可能；本次未复现，按「未证不写结论」留观察。

### 第 21 轮（2026-11-11）：验收证据与 UI 常量的修复验证

- **[BUG-062](../_archived/fixed_bugs/BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md)
  修复已验证**：新增 `manualEvidenceOf` / `withManualEvidence`；`--repair` 实测 action =
  「acceptance.md: 保留人工走查节（旧机械回执删除）」，修后文件仍含 ③④ 两条记录；重跑验收的
  splice 路径也保留。L4 人工证据不再被机械重算抹掉。
- **[BUG-063](../_archived/fixed_bugs/BUG-063-web-ui-nav-chrome-copy-english-only.md) 修复已验证**：
  `SHOW_MORE_SESSIONS_PATTERN = 'Show \\d+ more sessions|展开其余 \\d+ 个会话'`；
  `PREVIEW_NOTICE_HEADING = 'Preview Notice|预览版说明'` 且 `continue` 候选补 `继续`；消费方
  `dismissPreviewNotice` 已同步改成 `new RegExp(headingSource)`（只改常量不改匹配会两种语言都失配，
  这里没有踩）。
- **回放本次未跑（honest）**：exit 2「端口 3103 已被 pid 29648 占用」——另一 agent 正在跑回放（很可能在
  验证 061）；不抢端口。X8 的等锁作业仍在等（lock 17210 于 23:47 启动，属正常在跑）。
- **未跑**：X6 真模型。
### 第 20 轮（2026-11-11）：锁的陈旧度（观察，不建卡）

- **观察**：`client-load.lock/owner.json` 写了 `at`，但 `acquireRunLock` 只查 pid 存活，**不读 `at`**，
  也没有 `--force`/陈旧度接管；`client-load.entry` 亦无全局 watchdog。结构上「owner 活着但卡死」会
  永久阻塞后续 run（错误文案只有「等它结束再跑」）。
- **本次不建卡**：实测 lock age = 4 分钟（owner 17210 于 23:47 启动，浏览器子进程在场），是**正常在跑**
  而非卡死——按「未证不写结论」留作观察；若真实卡死实例出现（>30 分钟无产出）再升卡。
- **X8**：又起了一个「等锁释放后自动跑」的后台作业（窗口 30 分钟）；结果留到下轮读。
- **未跑**：X6 真模型。
### 第 19 轮（2026-11-11）：dev 环的缓存身份

- **发现**：[BUG-065](../_archived/fixed_bugs/BUG-065-run-driver-cache-key-omits-dev-overlay.md) **P2**——`run-driver` 的
  GREEN 缓存键只含 pack 指纹 + runtime 构建（纯函数实测 `any@p1@source` 与 overlay 无关），而
  `dev/research.overlay.yml` / `dev/boot-run.sh` 决定被探测页面的内容：只改外壳不改 pack → 键不变 →
  30 分钟内命中旧 GREEN，**dev 环最常用路径上可能看到假绿**。修法 = 键里加 dev 外壳指纹 + payload 写清身份。
- **X8 待跑**：客户端构建已刷新（`lib/client.js` 23:47 且无更新源），但 `client-load.lock` 属主（pid 17210）
  仍活——另一 agent 正在跑同一冒烟；不抢跑。
- **未跑**：X6 真模型。
### 第 18 轮（2026-11-11）：回放 A 层为什么间歇挂

- **发现**：[BUG-064](../_archived/fixed_bugs/BUG-064-replay-a-layer-not-self-contained-tool-stall.md)（排查中，P2）——
  lead 场景 A 层在静默窗口仍 240s 超时；盘上现场显示失败会话**停在第一个 `tool/call web_search`**
  （19 事件，无 tool/result / 无 turn/end），而同日 23:47:26 另一场回放完整成功（67 事件 / 7 步 /
  turn/end completed）。根因方向三条：① `llm-replay` 只回放 LLM chunk、**工具照真执行**，检索 API 一挂
  A 层只能干等；② 回放冒烟**没有并发锁**（client-load 有），多宿主共享 dev home/workspace 且各自打检索；
  ③ fixture first-call 绑定序（可能性低）。修复判据含「A 超时须报出卡住的工具名」与「回放自包含化或
  工具有界超时」。
- **C 层复核仍挂起**：客户端构建过期（`lib/client.js` 早于 src）——不在别人的在办改动上代跑构建。
- **关闭假设**：`replay-request` 的归一化不越权（persona/schema **零归一化**；runtime 只替换三条环境身份行）。
- **未跑**：X6 真模型。
### 第 17 轮（2026-11-11）：同一失败类的共享常量面

- **发现**：[BUG-063](../_archived/fixed_bugs/BUG-063-web-ui-nav-chrome-copy-english-only.md) **P2**——`web-ui-nav` 的
  `TAB_TEXT` 已双语，但 `SHOW_MORE_SESSIONS_PATTERN`（`Show \d+ more sessions`）与
  `PREVIEW_NOTICE_HEADING`（`Preview Notice`）/`PREVIEW_NOTICE_CONTINUE`（缺 `继续`）仍英文单语。
  vendor zh 文案 = 「展开其余 N 个会话」/「预览版说明」/「继续」；zh UI 下 `cdp-probe` 的展开调用
  **静默 no-op**（返回值未断言），预览弹窗不关、点击打在遮罩上。与 BUG-059/061 同一失败类：
  文案断言没有 locale 归属且失配静默。
- **X8 结果（阻塞，非产品红）**：等锁后真跑到自检即 exit 2——「`lib/client.js` 旧于 `src/client|src/lib`，
  先构建」；另一 agent 正在改 client 源码、未重建构建产物。**未跑 ≠ 通过**，不在别人的在办改动上代跑构建。
- **未跑**：X6 真模型。
### 第 16 轮（2026-11-11）：验收证据的载体寿命

- **发现**：[BUG-062](../_archived/fixed_bugs/BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md) **P2**——
  `acceptance.md` 同时是 `run-accept` 的生成物与 L4 人工走查（③④）的**唯一**记录载体：
  `run-accept.mjs:228` 每次绿都整文件覆盖，`--repair` 直接删除它（注释称「可再生产物」）；而生成器
  不产出「人工走查」节 —— 人工证据被抹后**不会回来**。已用 `repairReceiptPaths` 纯函数复现：
  修前文件含人工节 → repair 返回删除 action → 文件不存在。
- **关闭假设（有证据，不建卡）**：`finalVersionOf` / `readableVersionOf` 的版本文件名边界（`v01`/`V1`/
  `v0`/`v1.5`/`readable-v01` 全部拒绝，`vN` 严格）——无洞。
- **并发状态**：锁属主 55073 仍活、3109 仍被 55222 持有；`verify` 红在另一 agent 新文件
  `section-labels.ts` / `i18n.ts` 未登记构成正本；`pnpm test` 4 红（其 client/i18n 半成品）。
  回放复核与 X8 仍留待静默窗口。
- **未跑**：X6 真模型。
### 第 15 轮（2026-11-11）：并发窗口下的诚实记账

- **[BUG-061](../_archived/fixed_bugs/BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md) 代码级已修**
  （`/Open right sidebar|打开右侧边栏/i`），但**运行级未验成**：复跑 lead 场景时 A 层 240s 超时
  （canned 回放未走通），同窗口存在另一 agent 的 client-load 实例与一个**孤儿 host**（pid 55222 仍监听
  3109，其 runner pid 33393 已死）共享同一 dev home——**不把并发环境归因成产品缺陷**，等静默窗口再验。
- **X8 两次未跑**：锁属主从 33393 换到 55073（并发实例接力）；`runtime/smoke-workspace/client-load.lock`
  语义（存活拒跑 / 死亡接管）工作正常。未跑 ≠ 通过。
- **观察（候选，暂不建卡）**：client-load 的 host 子进程在 runner 被外部终止后成为孤儿（占 3109）；
  脚本启动时有 `reclaimPort`、本次 3109 仍未释放——需要静默窗口确认 reclaim 是否覆盖「孤儿 host +
  共享 dev home」这一形态。
- **当前门禁（并发，非本卡引入）**：`verify` 红在 `cockpit-doc-registry`（新文件
  `section-labels.ts` / `i18n.ts` 未登记进构成正本）；`pnpm test` 4 红（client/i18n 半成品）。
- **未跑**：X6 真模型。

### 第 10 轮（2026-11-11）：图结构合同的机械面

- **发现**：[BUG-058](../_archived/fixed_bugs/BUG-058-plan-cycle-has-no-mechanical-check.md) **P2**——plan 模板成文「图必须无环」，
  但**有环 plan 在交付审计里零 finding**：`waveCountOf` 返回 null（唯一检测点），`checkEffortContract` 的
  `waves !== null` 把它当「无需检查」；`planIssuesOf` 没有 cycle kind，还会把环报成「按 deps 重编号」
  （误导方向）。与已修的 BUG-050 同族：**null 哨兵同时表示「无对象」与「无需对账」**。
- **对照**：无环 plan 同输入零 finding（应当如此）；审计的其余判据不受影响。
- **[BUG-057](../_archived/fixed_bugs/BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md) 已被修复并归档
  （验证）**：`FAIL` → exit 1、`PASS` → exit 0（复跑实得）。工具退出码回到 verdict 契约。
- **现场补充**：run-ops 的三个「目标不存在」入口（`run-inventory --workspace`、`watch-run --group`、
  `session-events <不存在>`）均 exit 2 + 明确文案，符合 verdict 契约——无发现。
- **[BUG-058](../_archived/fixed_bugs/BUG-058-plan-cycle-has-no-mechanical-check.md) 已在本轮内被修复并归档
  （验证）**：有环 plan → `red plan-cycle`；`planIssuesOf` 新增 `cycle` kind（文案明确「重编号不能解环」）；
  无环对照仍绿。修复前复现脚本 `runtime/explore-20261111/plan-cycle.mjs` 可继续当回归用例。
- **未跑**：X8（client 半仍被改）、X6 真模型。
### 第 7 轮（2026-11-11）：修复回归验证（另一 agent 的落地）

- **048/049/050 已由另一 agent 修复并归档**。我用本卡自带复现脚本逐条回归（**只验不修**）：
  - [BUG-048](../_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md)：deep 三深度 +
    生成器投影 → 绿（假红消失）；单深度 `L3` 但投影写 `L1–L3` → **red**（漏检消失）；非连续集合由
    新编解码写成 `L1 / L3`、端点区间仍按闭区间读——生成器与检查器共用 `depthsTextOf/depthsOfText`，对称。
  - [BUG-050](../_archived/fixed_bugs/BUG-050-strategy-channel-absent-and-workflow-null-workers.md)：
    通道缺席 → `warn strategy-channel-missing`；`通道=workflow` 无 Wave → `red strategy-workflow-without-wave`
    （worker 不符另红）；负对照仍红。
  - [BUG-049](../_archived/fixed_bugs/BUG-049-protocol-projection-lines-absent-silent.md)：三行缺席 →
    `warn projection-*-missing`（v1 兼容）——**缺席半已修**。
- **新卡**：[BUG-056](../_archived/fixed_bugs/BUG-056-protocol-projection-unreadable-values-silent.md) **P2**——同一函数的
  **解析半**仍未覆盖：`投入：18 节点 / 18 cells`（无 `≤`）与 `输出：…sections: decision`（无 `=`）在修复后
  仍零 finding。按「已修卡不重开、回归 = 新卡」建卡（编号从 055 改为 056：并发 agent 先占了 055）。
- **回放复跑（修复中的 paneRows）**：崩溃消失，C3/C5 变成真断言；仍红 = `B·persona`（D48 后快照待重录）+
  `C2`（「研究状态」页签不在，右栏只见 Agent Team / Chat / Method library）+ C3/C5 连带。C2 归属待干净树。
- **未跑**：X8（client 半仍被改）、X6 真模型。
### 第 8 轮（2026-11-11）：verdict 契约与「未跑 ≠ 通过」的机械出口

- **发现**：[BUG-057](../_archived/fixed_bugs/BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md) **P2**——
  `acceptance-check` 的退出码与全仓 verdict 契约（[scripts/AGENTS](../../scripts/AGENTS.md)）相反：
  `FAIL`、`UNVERIFIED`、`noCriteria` 全部 exit 0（只有文本三态可区分）。该工具的存在理由就是把「收活结论」
  对账成机械事实，而机械事实的通用出口是退出码——agent/CI 一旦用 `$?` 判收活即 false acceptance 主路径。
- **关闭假设（有证据，不建卡）**：
  - **CLI 前置错误退出码**：此前用管道后取 `$?` 误读为 0；逐条直测 node-gate / evidence-audit /
    verdict-audit / protocol-audit / path-hygiene / secret-scan / unconsumed-evidence / run-accept 的
    「bundle 不在场」全部 **exit 2**（符合契约）——是 shell 口味问题，不是缺陷；
  - **`stuckOf` 把长工具误报 STUCK**：输出形如 `NOT-STUCK: …（静默 N 分钟，末事件 <type>）`，末事件类型
    可见（在飞工具 = `tool/call`），人有判别依据；且谓词成文为「开回合 + 静默超阈」——记观察不建卡；
  - **secret-scan 默认不扫 `provenance/`**：默认面成文为「读者会拿到的面」，provenance 归过程件由
    `--all` 覆盖；同时 `path-hygiene` 已扫 provenance——范围差是设计，不建卡；
  - **回执不校验 `manifest.json` 的文件哈希**：`receiptProblems` 只核 final/readable/audit；D47 provenance
    Note 明说「当前没有审计门强制 run 内 hash」——成文限制，不建卡。
- **未跑**：X8（client 半仍被改）、X6 真模型；BUG-054 的修复（`lensScanOf`）尚未落地。
### 第 9 轮（2026-11-11）：052/053/054 修复回归（另一 agent 的落地）

- [BUG-052](../_archived/fixed_bugs/BUG-052-protocol-epoch-day-granularity-retro-red.md) **已验证**：
  `protocol-audit` 对已交付 bundle 输出「不适用（交付回执早于契约落地时刻 acceptedAt=…）」exit 0——
  按回执时间断代，正是卡里的首选修法；同日早场不再追溯判红。
- [BUG-053](../_archived/fixed_bugs/BUG-053-plan-header-claims-first-match-anywhere.md) **已验证**：
  策略行与 plan-ref 都改用 `headerBlockOf`（首个 `##` 之前）；正文 `## 备注` 的同形策略行 → 现在
  `warn strategy-missing`。残余：**无任何 `##` 分节**的 plan 里，首行提及仍在「头块」内被接受——
  与注释成文定义（头 = 首个 `##` 之前）一致，属可接受近似，不另建卡。
- [BUG-054](../_archived/fixed_bugs/BUG-054-cells-cap-count-only-canonical-bullet.md) **已验证**：
  `*` / `+` / 缩进 / 大写 `Lenses:` 均计 2（原为 0）；quick 档 4 lens 星号写法 → 现在 `red effort-contract`。
- [BUG-056](../_archived/fixed_bugs/BUG-056-protocol-projection-unreadable-values-silent.md) **已验证**（同一批修复）：
  `18 节点 / 18 cells`（无 `≤`）→ `red projection-number`（数值被解析并对账）；英文单位数值正确 → 绿；
  `分节 = decision` → `red projection-output-unparseable`；`sections: decision` → `red projection-output`
  （缺 risks）。**解析半已收口**，卡待修复方归档。
- **BUG-051 修复的可观察证据**：回放冒烟 C3 从 ReferenceError 变为真断言（0 行），C5 真比对——
  卡由修复方归档，不代移。
- **仍开放（我的新卡）**：[BUG-057](../_archived/fixed_bugs/BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md)
  复测仍 exit 0（FAIL/UNVERIFIED/noCriteria），待拍板。
- **未跑**：X8（client 半仍被改）、X6 真模型。

- **门禁现状（并发，非本卡引入）**：`md-links` 红在另一 agent 的未跟踪 Note 链接；`backlog-liveness` 红在
  048/049/050 已移入归档池但归档索引行未补；`pnpm test` 2 红（client 视图测试 `t is not a function`、
  `protocol-core.spec.mjs` 报 `lensScanOf` 尚未导出——他们正在加 lenses 解析修复，半成品状态）。以上均属
  另一 agent 的在办改动，本卡不代改，待其收口后复跑。

- **下一层**：§Protocol 之外的「在场 + 可解析」双必要条件族（leads 字段/decisions 行/readiness 装饰）；
  BUG-051 落地后的回放复跑（C2/C5 归属）。

### 第 6 轮（2026-11-11）：预算上限的输入解析

- **发现**：[BUG-054](../_archived/fixed_bugs/BUG-054-cells-cap-count-only-canonical-bullet.md) **P1**——`countCellsOf`
  只认行首 `- lenses:`（小写、无缩进）：`* lenses:` / `+` / 缩进 / `Lenses:` 一律计 0，而
  `checkEffortContract` 只在 `cells > cap` 时红 → **quick 档 4 lens 用星号写 = 零 finding**（模板写法
  同输入正常红，对照有效）。`lensIdsOf` 同盲区（两处各写一份正则）。生产数据：10 个真实 topics 全用
  模板写法，今天无实例 → 潜在缺口。修法 = 共享解析助手 + 「看起来像 lens 行但解析不了 → 红」。
- **关闭假设（有证据，不建卡）**：
  - 「同一 claim 两条相反裁决可静默通过」：实测会红，但红在 `raw-reparse`（比对用
    `find(claim_id)` 取首条，第二条必然不匹配）——**结果对、错误码误导**，记观察不建卡；
  - `finalVersionsIn` 的版本排序是数值升序（v10 > v2），没有字典序坑。
- **X4 回放复跑（BUG-051 修复中的版本，22:5x）**：`paneRows` 已恢复，崩溃消失——C3 现在**真的断言**
  （0 行）、C5 真的比对（首个差异 @350）；但 lead 仍 4 红：`B·persona`（D48 后快照待重录，旧结论）、
  `C2`（右栏只看到 Agent Team / Chat / Method library 三个页签，**「研究状态」页签不在**）、
  C3/C5 由 C2 连带（胶囊未点开 → 0 行）。C2 现在可稳定复现，但当前 `lib/client.js` 是并发 agent
  22:36 从脏树重建的，归属需**干净树复跑**（下一轮，不先建卡）。
- **未跑**：X8（client 半仍被改）、X6 真模型。
- **下一层**：其它「预算/上限类」计数的输入解析（nodes/waves/sources）、`run-accept` 预检标签的
  N/A 观感。


## 第二轮 goal 记录（2026-11-12，轮次按发生顺序补记）

> 说明：上面的轮次小节因多次插入锚点不同而顺序错乱；本节按时间顺序补记第二轮 goal 的关键结论，
> 细节以对应 bug 卡为准。

### N1（02:1x）X8 首次全绿
- `node --import tsx/esm scripts/smoke/client-load.entry.mjs` → **75 PASS / 0 FAIL**；覆盖方法库/研究配置/
  终稿/状态页/Preview Notice 关闭。`client-load-latest.json` 写 ALL PASS。

### N2（02:2x）离线闸边界 → BUG-067
- 武装态探针：fetch 外网 ECONNREFUSED、lookup ENOTFOUND、loopback 200，但 **`dns.resolve4` 仍成功**；
  子进程工具不受控 → [BUG-067](../_archived/fixed_bugs/BUG-067-offline-gate-dns-resolve-bypass.md)。
- 修复方随后补齐 resolve*/Resolver 并归档（已验证）。

### N3（02:2x）回放闭环 + 自我修正 → BUG-070
- 回放 lead：**A PASS，C0–C5 全 PASS**（C5 逐字命中金标准）→ 064/061 运行级确认。
- 三组对照 boot 实验（research 无闸 / research+闸 / deep-research+闸）全部成功出横幅 →
  **BUG-066 的「版本漂移必然拒绝启动」被证伪**，按纪律另开
  [BUG-070](../_archived/fixed_bugs/BUG-070-bug066-mechanism-refuted-and-residual-profile-wiring.md)
  记录撤回 + 残留；修复方随后收口残留（team-preflight 切 deep-research、profile-health 按档给指令）并归档。

### N4（02:3x）scout 场景暴露 Team 身份注入 → BUG-071
- `--scenario scout`：A PASS；B·persona/headers/runtime-context 红。红的内容是 **根 scout 被注入
  `You are the Team Lead named "lead".` + `Agent Teams is available in this session …`**，且
  `request/header.tools` 含 **8 个 Team 工具**（spawn_teammate / wait_agent / interrupt_agent /
  list_agents / team_task_*×4）。
- [BUG-071](../_archived/fixed_bugs/BUG-071-root-scout-injected-team-lead-identity.md) P2 等人拍板：接受并写契约 /
  按根角色门控 / persona 纠偏，三选一。
- 机理：vendor `tool-agent-team` 在 profile 级启用、不按 preset 门控；设计只成文了「worker 看得到 Team
  工具」，未成文「根 scout 被标成 Team Lead」。

### N5（02:3x）analyst/critic 复跑 + run-driver 复用路径
- `--scenario analyst` / `--scenario critic`：**A 均 PASS**；B·persona / runtime-context 与 scout 同形
  （多出 Team policy + `You are the Team Lead named "lead"`）→ BUG-071 波及面确认为**全部非 lead 根角色**。
- `node dev/run-driver.mjs up`（复用已起通道）：**exit 2 漂移红**——镜像与 pack 源差 5 个文件
  （`lib/types/client/**` 等），脚本明确「当前页面不是当前代码；先重建/重启通道再验（未跑，不是通过）」。
  这是**漂移门按设计工作**（另一 agent 改了 client 之后未重建 profile），不是缺陷；但它意味着 3083 上
  在跑的通道现在服务的是旧镜像。
- 观察（不建卡）：漂移门把 `lib/types/**/*.d.ts` 也算进镜像一致性——纯类型改动也会要求重建 profile
  （约 20s）。若嫌严可另议，当前不改。

### N6（02:3x）062 双路径复核 + 两处观察
- **BUG-062 修复完整（静态+行为复核）**：`run-accept` 的绿跑写盘路径也接了
  `withManualEvidence(renderAcceptance(...), previousAcceptance)`——重跑验收不再抹掉「人工走查」节；
  `--repair` 侧此前已验证。两条路径都保留人工证据。
- **观察（不建卡）：path-hygiene 不扫 `drafts/`**。`docs/design/10` 把 `drafts` 列为 bundle 结构的一部分，
  但 `path-hygiene` 的文件清单不含它；历史归档场次里确有 6 个 `drafts/*` 文件带 `/Users/...` 绝对路径
  （新场次如 `drt_eu-cn-gpai-obligations/drafts` 无命中）。当前门禁报「干净（95 个文件）」。若未来要把
  历史 bundle 移交，建议把 drafts 纳入扫描或在交付说明里标「drafts 为工作稿」。
- **观察（不建卡）：`web-harness.bootWeb` 的 banner 超时 timer 在成功后不清理**——各冒烟都在末尾显式
  `process.exit`，所以现在被掩盖；若未来有库式消费者（await 后继续跑），进程会被这个 timer 多留
  120–240s。

### N7（02:3x）071 方案 C 的覆盖缺口（观察）
- **071 已修（方案 C）**：scout / analyst / critic 三份 persona 均加了纠偏句，design/10 §4 + design/20 记录
  vendor 的根会话身份事实；回放基线待重录（B 层仍红属快照项）。
- **观察（不建卡）**：`method-editor` 也是**非 lead 根会话**，机制上同样会拿到 `team:policy` + "You are the
  Team Lead" + 8 个 Team 工具，但方案 C 的三份 persona 里没有它。运行时证据缺席（method-coach 会话日志
  没有 request/header，无法确认工具面）。建议：要么给 method-editor persona 加同一句，要么在 design/20
  明写「方法编辑不在组队面、Team 注入可视而不理」。
- **修复方在办的自伤（只记录，不代改）**：方案 C 在 `tests/pack/presets.spec.mjs` 硬编码
  `['scout','analyst','critic']` → 触发 `role-list-sync` 3 处；改了 presets 未重渲染 overlay →
  `overlay-fresh` 红。等其收口后复跑。

### N8（02:4x）scout 纠偏已验证 + 门禁子串误伤
- **071 的 persona 纠偏已在运行级验证**：scout 场景 A PASS；B·persona 的 actual 已含
  「Team 工具可能在本根会话可见（宿主 Team 机制），但组队不是你的通道：并行只用 subagent；不要调用
  spawn_teammate / team_task_*」——与基线差异正是这段新增（基线待重录）。
- **新卡**：[BUG-072](../_archived/fixed_bugs/BUG-072-release-vocab-substring-false-positive-product-content.md) **P2**——
  `release-vocab` 用裸子串匹配退役词，`产品内` 误伤 `产品内容`（新文案指南第 300 行），verify 红。
  修复二选一：收窄门禁词（带负向断言）或改文档措辞；同表其他词未见实例（terms/evaluation 的枚举行带
  `term-policy: allow`）。
- **未跑**：X8（构建仍过期 11 文件）、快照重录、X6。

### N9（02:4x）候选证伪 + 状态
- **候选证伪（不建卡）**：新技能 `changing-ui-copy` 里裸文件名 `coach-prompts.ts` /
  `operation-prompts.ts` 一度被怀疑「引用不存在的模块」——实查位于
  `packages/deep-research-pack/src/client/method-library/` 下，**文件真实存在**；`cjk-source` 的
  ALLOWED 表还有「键必须在场」的自检（第 174 行），没有死条目。撤回该假设。
- **附带观察**：`doc-paths` 只对以仓根目录名开头的 token 做解析，**裸文件名**（如 `foo.ts`）不检查；
  与其头注「仓根/文档目录/vendor 三处试」的表述有出入。当前无真实漏检实例（本技能里的裸名都在场），
  记观察不建卡；若未来要收口，可作为 `writing-a-gate` 轮。
- **072 未修**（门禁词表与文档措辞都未动）。
- **071 的 persona 纠偏已在运行级验证**（scout B·persona actual 含新纠偏句；基线待重录）。
- **未跑**：X8（`ResearchConfigTab.tsx` 02:42 改动后构建过期）、快照重录、X6。

### N10（02:44）X8 终验被并发编辑挡住
- 构建在 02:43 刚刷新（`lib/client.js` 02:43:04），但 X8 的自检仍判「src 更新到 02:44:15」——
  对方正在写 BUG-069 的 client 代码，文件在两次检查之间变化；不是构建门误报（其判据 = 逐源文件 mtime，
  注释已写明「宁可 exit 2 也不拿旧产物冒充证据」）。
- 因此 **X8 终验未跑**（未跑 ≠ 通过）。等对方停止编辑并重建后，一条命令即可：
  `node --import tsx/esm scripts/smoke/client-load.entry.mjs`。
- `verify` 剩余 7 红：role-list-sync×3 / overlay-fresh / release-vocab（=BUG-072）/ 归档索引×2，均非本卡。

### 当前未跑 / 阻塞
- analyst / critic 场景（推断同根因，未验证）；X6 真模型（未授权）；回放 B 层快照重录（with-key，需预算）。
- 门禁：`pnpm test` 3 红（BuiltinView、scripts/README 资产表对账等，均为另一 agent 在办）；
  `verify` 2 红（cockpit-doc-registry 新文件未登记、070 归档索引未补）。

## 第三轮 goal（2026-11-12 23:xx）：继续探索（只报 bug，不修代码）

### N11：方法库名称语法面 → BUG-081

- **命题**：方法库条目的名称可以自由输入；含全角括号的名称仍能走完 save claim 并写库。
- **最低层**：纯函数（`renderLibraryEntry` / `foldLibrary`）+ `applyMethodLibraryOperationEvent`
  claim 投影；无模型、无浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/name-parenthesis.mjs`
- **证据**：`runtime/explore-20261112/name-parenthesis.mjs` 实测输出——`投研尽调（我的口径）`
  → fold 名 `投研尽调`、provenance `我的口径`、claim 0；ASCII 括号对照 claim 1。
  UI 名称占位符 `src/client/locales/zh.ts:200` 正是 `投研尽调（我的口径）`。
- **判定**：**发现** → [BUG-081](../_archived/fixed_bugs/BUG-081-method-name-parenthesis-provenance-collision.md)（P2，排查中；未改产品代码）。
- **下一层**：同一 claim/写入族的其它语法边界（`〔〕`、零宽字符、旧库 provenance 歧义）；
  以及 `method_library_set_default/remove` 的名称比对；未跑，记空白。

### N12：默认判定与写入口径不一致 → BUG-082

- **命题**：方法库的「默认偏好」只由精确标记 `〔默认偏好〕` 决定，读/写同一口径。
- **最低层**：纯函数（`foldLibrary` + `upsertMethodEntry`）；无模型、无浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/default-marker-substring.mjs`
  +
  `... runtime/explore-20261112/default-marker-write-path.mjs`
- **证据**：无标记但 provenance 含「默认偏好实验」→ `isDefault:true`；写路径
  `textHasMarker:false` / `savedIsDefault:true` / `expectedDefault:false` →
  `wouldFailToolReadback:true`（文件已写、工具报回读失败）。
- **判定**：**发现** → [BUG-082](../_archived/fixed_bugs/BUG-082-default-marker-substring-false-positive.md)（P2，排查中；未改产品代码）。
- **下一层**：旧格式 `- 默认偏好:` 行、marker 重复/全角空白；`findDefaultMethod` 的消费面
  （`research:defaults` 注入）是否把误判放大；未跑，记空白。

### N13：heading 空白口径分叉 → BUG-083

- **命题**：方法库的 heading 读/写使用同一空白谓词；tab heading 的默认操作与 fold 一致。
- **最低层**：纯函数（`foldLibrary` + `clearDefaultMethodEntry` + `setDefaultMethodEntry`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/tab-heading-default.mjs`
- **证据**：`##\t方法甲\t〔默认偏好〕` → fold name/isDefault 正常；clear `changed:false` 且仍默认；
  set 抛「库里没有」；`defaultCount` 漏计。
- **判定**：**发现** → [BUG-083](../_archived/fixed_bugs/BUG-083-tab-heading-default-inconsistency.md)（P2，排查中；未改产品代码）。
- **下一层**：前导空格 heading、`##\r`、全角空格；`matchingHeadingLines` 与 `renderLibraryEntry`
  的规范化是否同源；未跑，记空白。

### N14：run 状态头模板与来源判据分叉 → BUG-084

- **命题**：按 run 模板写出的 `- phase: accepted` 已交付 run，能被方法库来源完成判据识别。
- **最低层**：纯函数（`isCompletedMethodSourceRun`）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/source-phase-bullet.mjs`
- **证据**：模板形态 `- phase: accepted` → `accepted:false`；裸 `phase: accepted` → `true`；
  `- phase: review` → false。另：`- phase: review` + 正文/代码块裸 `phase: accepted` → true
  （`runtime/explore-20261112/source-phase-false-positive.mjs`）——同谓词假阳。模板行 = `content/templates/run/run.md:8`；判据 =
  `method-library-source.ts:32`；fixture 注释明说裸行才能匹配。
- **判定**：**发现** → [BUG-084](../_archived/fixed_bugs/BUG-084-source-phase-bullet-mismatch.md)（P2，排查中；未改产品代码）。
- **下一层**：run.md 其它状态键（`delivered`/`parked`/`next`）的模板↔解析一致性；未跑，记空白。

### N15：heading marker/provenance 顺序读写不对称 → BUG-085

- **命题**：fold 与 upsert 对「name + provenance + 〔默认偏好〕」的任意合法顺序使用同一语法。
- **最低层**：纯函数（`foldLibrary` + `upsertMethodEntry`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/marker-before-provenance.mjs`
- **证据**：反序标题 `## 方法甲〔默认偏好〕（...）` → fold 正常；upsert 返回 `action:"created"`，
  写后同名条目 **2** 条（一默认一非默认）；正序不在同一路径。
- **判定**：**发现** → [BUG-085](../_archived/fixed_bugs/BUG-085-marker-provenance-order-duplicate.md)（P2，排查中；未改产品代码）。
- **下一层**：marker 在 name 前、多个 marker、全角空白；以及 `matchingHeadingLines` 的
  provenance 括号内含 `）` 的切分；未跑，记空白。

### N16：client 异步回写 race → BUG-086

- **命题**：研究配置页签切换会话后，旧会话的异步读不会覆盖新会话的库投影。
- **最低层**：hook 级真跑（happy-dom + react-dom/client；假 `readFile` 控制慢读），无模型。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/config-feed-session-race.mjs`
- **证据**：`reads ["s1","s2"]`；切到 s2 后先 `新会话方法`，旧 s1 的 120ms 慢读 resolve 后
  变成 `旧会话方法`（`bug:true`）。hook 的 effect 无 cleanup，`reload` 在 await 后无条件 setState。
- **判定**：**发现** → [BUG-086](../_archived/fixed_bugs/BUG-086-config-feed-session-race.md)（P2，排查中；未改产品代码）。
- **下一层**：`useStatusFeed`/`useGraphFeed`/`useDraftState` 的同类 epoch/abort 面；真实 workspaceFiles
  延迟分布；未跑，记空白。

### N17：status feed 跨会话 state 残留 → BUG-087

- **命题**：研究状态页签切换会话后，旧会话的 journal 事件/活动行/seen 不进入新会话投影。
- **最低层**：hook 级真跑（happy-dom + react-dom/client；s1 history，s2 follow 挂起）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/status-feed-session-stale.mjs`
- **证据**：s1 后 `events:1/rows:0/seen:true`；切 s2 后仍是 `events:1/rows:0/seen:true`（`stale:true`）。
  effect 只重置 refs，未清 state。
- **判定**：**发现** → [BUG-087](../_archived/fixed_bugs/BUG-087-status-feed-session-stale.md)（P2，排查中；未改产品代码）。
- **下一层**：`face`/`hitl`/`unbound` 的真实时序窗口；上层是否 keyed remount；未跑，记空白。

### N18：配置页签 1000 行库静默截断 → BUG-088

- **命题**：研究配置页签读到的库投影等于工作区完整库；>1000 行时不得静默短读。
- **最低层**：client 适配器（`createWorkspaceFiles.readText` + `libraryReadStateOf`），无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/config-library-truncation.mjs`
- **证据**：1001 行库、remote `eof:false`、`readText(limit=1000)` 返回 1000 行；
  `hasLastLine:false`、`readState:"ok"`、`silentlyTruncated:true`。
- **判定**：**发现** → [BUG-088](../_archived/fixed_bugs/BUG-088-config-library-1000-line-truncation.md)（P2，排查中；未改产品代码）。
- **下一层**：主库 `readLibrary` 20 页上限、其它 `readText` 调用点（question/preview）的截断面；未跑，记空白。

### N19：run 枚举部分 unreadable 静默降级 → BUG-089

- **命题**：`listRuns` 任一桶不可读时，调用方必须能感知缺口，不能把部分清单当完整。
- **最低层**：纯函数 + 假 RunSource；无模型/浏览器。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/list-runs-partial-unreadable.mjs`
- **证据**：root 有 `drt_root-run`，archive 返回 `unreadable/EACCES`；结果仍 `ok:true` 且只含
  root（`silentPartial:true`），无 error/warning。
- **判定**：**发现** → [BUG-089](../_archived/fixed_bugs/BUG-089-list-runs-partial-unreadable.md)（P2，排查中；未改产品代码）。
- **下一层**：三个消费门禁（schema-scan/node-gate/evidence-audit）的 partial 处理；`other`/symlink
  目录的发现语义；未跑，记空白。

### N20：bundle 绑定用全量参数子串 → BUG-090

- **命题**：会话绑定只认工具调用里的**真实路径**；正文/pattern 提到 `drt_<slug>/` 不构成绑定。
- **最低层**：纯函数（`sessionBindingOf`）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/bundle-bind-content-path.mjs`
- **证据**：`write({file_path:'notes.md', content:'compare with drt_other-run/run.md'})` →
  `{slug:'other-run',boundBy:'write'}`；`not_drt_fake/` 也命中；`grep` pattern 产生 read 绑定。
  只有真实 `drt_real-run/run.md` 路径才应命中。
- **判定**：**发现** → [BUG-090](../_archived/fixed_bugs/BUG-090-bundle-bind-content-false-positive.md)（P2，排查中；未改产品代码）。
- **下一层**：`bindingTrust` 的 write 强绑定消费链（状态/配置/终稿）、多工具参数形态；未跑，记空白。

### N21：replay 收尾谓词 any-turn 假绿 → BUG-091

- **命题**：`turnCompleted` 判定的是「最后一个回合以 completed 结束」，不是历史上任一回合一完成。
- **最低层**：纯函数（`scripts/lib/replay-request.mjs`）；无模型/浏览器。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/turn-completed-any-turn.mjs`
- **证据**：单回合 completed → true；completed 后再开新回合（未结束）→ true；completed 后
  新回合 failed → true。后两者当前回合未完成。
- **判定**：**发现** → [BUG-091](../_archived/fixed_bugs/BUG-091-turn-completed-any-turn.md)（P2，排查中；未改产品代码）。
- **下一层**：`snapshot-replay.entry` A 层 + `record-role-fixture` 的真实多 turn 形态；
  `turnOpenOf` 等「计数型」时序谓词；未跑，记空白。

### N22：defaults 双读失败被当 auto → BUG-092

- **命题**：defaultsStore 只有在**确认文件不存在**时才进入 auto；读通道不可达必须显性。
- **最低层**：store 级（fake readText/listDir 全 null）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/defaults-double-read-failure.mjs`
- **证据**：`phase:"ready"`、`value:{schema,revision:0}`、`problems:[]`、`methodRead:"error"`、
  `buttonWouldSayAuto:true`。双失败被渲染成「没有默认」。
- **判定**：**发现** → [BUG-092](../_archived/fixed_bugs/BUG-092-defaults-double-read-failure-auto.md)（P2，排查中；未改产品代码）。
- **下一层**：按钮/面板对 unreadable 的视觉态；`listDir` 失败但文件可读的单失败形态；未跑，记空白。

### N23：方法库四字段 bullet/冒号变体 → BUG-093

- **命题**：Markdown 等价的四字段写法（`*`/`+`/缩进/全角冒号）与 canonical 写法读出同一内容。
- **最低层**：纯函数（`foldLibrary` + `summaryOfEntry`）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/library-section-bullets.mjs`
- **证据**：canonical 四字段有值、summary `a`；`*`/`+`/两格缩进/全角冒号四种变体 sections 全 null、
  summary null。
- **判定**：**发现** → [BUG-093](../_archived/fixed_bugs/BUG-093-library-section-bullet-variants.md)（P2，排查中；未改产品代码）。
- **下一层**：旧格式 `调查要求`/`适用说明` 的兼容、section-like 行的 warning、写回 canonical 的
  round-trip；未跑，记空白。

### N24：交付事实双源（final.md vs present）→ BUG-094

- **命题**：HITL2「交付审阅」passed 与 ⑤ present 交付见证来自同一权威成功点。
- **最低层**：纯函数（`deriveAnchors` + `latestFinalDelivery`）+ 源码路径（useStatusFeed）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/anchor-final-vs-present.mjs`
- **证据**：`deriveAnchors([], {question:true, delivered:true})` → anchor-2 `passed`；
  `latestFinalDelivery([])` → `null`；useStatusFeed 的 `face.delivered = names.has('final.md')`。
- **判定**：**发现** → [BUG-094](../_archived/fixed_bugs/BUG-094-hitl2-anchor-final-vs-present.md)（P2，排查中；未改产品代码）。
- **下一层**：HITL1 的 question.md 是否也有类似的「在场≠拍板」双源；真实 run 时序；未跑，记空白。

### N25：bootWeb 成功路径 timer 未清理 → BUG-095

- **命题**：`bootWeb` 无论成功/失败都释放 banner timeout；库式消费者不因 boot 残留 timer。
- **最低层**：fake CLI + `process.getActiveResourcesInfo()`；无真模型/浏览器。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/boot-web-timer-leak.mjs`
- **证据**：banner 成功 `token:"fake-token"` 后仍有 `activeTimeouts:1`（timeoutMs 5000）。
  成功路径没有 clearTimeout；当前脚本 process.exit 掩盖了它。
- **判定**：**发现** → [BUG-095](../_archived/fixed_bugs/BUG-095-boot-web-timer-leak.md)（P3，排查中；未改产品代码）。
- **下一层**：失败/child-exit 路径的 timer 清理、stdout/stderr listener 回收；未跑，记空白。

### N26：HITL2 被当 kickoff → BUG-096

- **命题**：kickoffSeen 只由 HITL1 / research-brief 立项动作触发；HITL2 交付审阅不是新 run。
- **最低层**：纯函数（`sessionBindingOf` + `bindingTrust`）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/hitl2-counts-as-kickoff.mjs`
- **证据**：read `drt_resumed/run.md` + HITL2 ask（`定稿（按现稿交付）`）+ 已答；
  binding `{slug:'resumed',boundBy:'read',kickoffSeen:true}`；trust `suppressed/kickoff`。
- **判定**：**发现** → [BUG-096](../_archived/fixed_bugs/BUG-096-hitl2-counts-as-kickoff.md)（P2，排查中；未改产品代码）。
- **下一层**：HITL1/HITL2 判型与 binding-trust 的 pending/kickoff 政策交叉；未跑，记空白。

### N27：方法库跨会话 lost update → BUG-097

- **命题**：方法库写工具的 read-modify-write 对并发写者安全（检测/合并冲突，不静默覆盖）。
- **最低层**：纯函数交错模拟 + 源码路径（`method-library-tool.ts` 三个 execute）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/method-library-lost-update.mjs`
- **证据**：A/B 都读 base，A 写 `{方法A}`、B 写 `{方法B}`；最终 entries 只有 `{方法B}`，
  `lostA:true`。工具无锁/无 revision CAS。
- **判定**：**发现** → [BUG-097](../_archived/fixed_bugs/BUG-097-method-library-lost-update.md)（P2，排查中；未改产品代码）。
- **下一层**：真实双标签页并发、set-default/remove 的同类交错、写文件原子性；未跑，记空白。

### N28：方法库写非原子 → BUG-098

- **命题**：方法库三个写工具对用户唯一文件使用原子写（temp+rename/backup），中途失败不截断旧库。
- **最低层**：源码路径 + 写语义（不做破坏性崩溃注入）。
- **实际命令**：
  `grep -n "writeFileSync" packages/deep-research-pack/src/method-library-tool.ts` →
  99/168/226；`grep -n "renameSync\|mkdtemp\|tmp"` → 无输出。
- **证据**：三处直接 `writeFileSync(path, ..., 'utf8')`，无临时文件/rename；对照 defaults
  command 已原子写。
- **判定**：**发现** → [BUG-098](../_archived/fixed_bugs/BUG-098-method-library-non-atomic-write.md)（P2，排查中；未改产品代码）。
- **下一层**：可控失败注入、backup 恢复、文件系统 rename 语义；未跑，记空白。

### N29：run source picker 读失败当空列表 → BUG-099

- **命题**：来源选择器对 `listDir` 的 null（失败）与 []（空目录）分家；失败显示读取错误。
- **最低层**：hook 级真跑（happy-dom + react-dom/client；final 目录 null）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/run-source-list-error-as-empty.mjs`
- **证据**：`{"status":"runNoFinal","eligible":false}`——final 读失败被渲染成「没有 final」。
- **判定**：**发现** → [BUG-099](../_archived/fixed_bugs/BUG-099-run-source-list-error-as-empty.md)（P2，排查中；未改产品代码）。
- **下一层**：根清单 null、`sourceReadFailure` 的 catch 路径、真实 workspaceFiles 分布；未跑，记空白。

### N30：final.md 同名目录被当交付 → BUG-100

- **命题**：final.md 的交付/在场判定要求 `entry.type === 'file'`，不是名字在场。
- **最低层**：纯函数（`openRun` 假 RunSource 返回 directory 项）；无模型/浏览器。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/final-md-directory-as-delivered.mjs`
- **证据**：`names` 含 final.md、`finalEntryType:"directory"`、`consumerNamesHasFinal:true`、
  `read('final.md')` → missing。消费面 `names.has` / `existsSync` 不校验类型。
- **判定**：**发现** → [BUG-100](../_archived/fixed_bugs/BUG-100-final-md-directory-as-delivered.md)（P2，排查中；未改产品代码）。
- **下一层**：question/review/plan 的同类目录/symlink 形态、终稿页签打开行为；未跑，记空白。

### N31：present 非终稿族路径被当交付版本 → BUG-101

- **命题**：交付版本只从 `drt_.../final/vN.md` 终稿族取，且必须与 present 交付事实同源。
- **最低层**：纯函数（`latestFinalDelivery` + `latestPresentedFinalVersion` + `runVersionFaceOf`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/present-version-non-bundle.mjs`
- **证据**：present `notes/final/v9.md` → delivery null、deliveredVersion 9、faceState none、
  faceLabel `v9 已交付`（contradiction true）。
- **判定**：**发现** → [BUG-101](../_archived/fixed_bugs/BUG-101-present-version-non-bundle.md)（P2，排查中；未改产品代码）。
- **下一层**：同事件多文件/真假族混合、readable-vN、present 跨事件 max；未跑，记空白。

### N32：plan 正文版本引用覆盖头部声明 → BUG-102

- **命题**：`planVersionsOf` 的 currentPlanVersion 只取头部/声明块，正文历史引用不覆盖。
- **最低层**：纯函数（`runVersionFaceOf`）；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/plan-version-body-overrides-header.mjs`
- **证据**：头部 `图版本：v2` + 正文「旧版图版本：v1」→ currentPlanVersion 1、
  versionConflicted false。
- **判定**：**发现** → [BUG-102](../_archived/fixed_bugs/BUG-102-plan-version-body-overrides-header.md)（P2，排查中；未改产品代码）。
- **下一层**：头部 Markdown 形态（代码块/引用/无 ##）、recorded 斜杠解析；未跑，记空白。

### N33：present 版本 max vs 最后事件 → BUG-103

- **命题**：交付版本跟随**最后一条** present 事件，与 latestFinalDelivery 同一权威点。
- **最低层**：纯函数（`latestFinalDelivery` + `latestPresentedFinalVersion`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/present-version-max-vs-last.mjs`
- **证据**：present v2（turn2）后 present v1（turn3）；latestFinalDelivery 指 v1，
  latestPresentedFinalVersion=2（contradiction true）。
- **判定**：**发现** → [BUG-103](../_archived/fixed_bugs/BUG-103-present-version-max-vs-last.md)（P2，排查中；未改产品代码）。
- **下一层**：同事件多文件/读者版、turn/callId 缺失、rollback 语义；未跑，记空白。

### N34：port-reclaim 杀任意 listener → BUG-104

- **命题**：reclaimPort 只收割本仓/冒烟自己的遗留进程，不杀端口上的无关服务。
- **最低层**：子进程级（自起 node net listener 占 3127，再 reclaim）；无模型/浏览器。
- **实际命令**：
  `node --import tsx/esm runtime/explore-20261112/port-reclaim-kills-any-listener.mjs`
- **证据**：before pid 65694 → reclaimed null、childExited true、signalCode SIGKILL、
  killedArbitraryListener true。
- **判定**：**发现** → [BUG-104](../_archived/fixed_bugs/BUG-104-port-reclaim-kills-any-listener.md)（P2，排查中；未改产品代码）。
- **下一层**：ps/cmdline 身份校验、pid 锁、端口占用 fail-loud；未跑，记空白。

### N35：rerun kind 边界过宽 → BUG-105

- **命题**：rerun 声明只接受精确 kind；`polish-extra`/`structural-extra` 等非法后缀不解析。
- **最低层**：纯函数（`runVersionFaceOf` 的 `rerun`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/rerun-kind-suffix-match.mjs`
- **证据**：`polish-extra` → rerun.kind `polish`、state rerun-in-progress；
  `structural-extra` → `structural`；合法 `polish` 正常。
- **判定**：**发现** → [BUG-105](../_archived/fixed_bugs/BUG-105-rerun-kind-suffix-match.md)（P2，排查中；未改产品代码）。
- **下一层**：全角分隔/大小写/evidence-expansion 后缀；未跑，记空白。

### N36：早期回合哨兵污染 A 层 → BUG-106

- **命题**：A 层/录制器的收尾哨兵只认当前（最后）回合的 assistant 文本。
- **最低层**：纯函数（`sentinelInAssistantText`）。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/sentinel-any-history.mjs`
- **证据**：currentDone true；oldDoneThenOpen true；oldDoneThenFailed true（后两者当前回合
  无哨兵）。
- **判定**：**发现** → [BUG-106](../_archived/fixed_bugs/BUG-106-sentinel-any-history.md)（P2，排查中；未改产品代码）。
- **下一层**：与 BUG-091 的 turnCompleted 组合、多 turn 回放/录制真实样本；未跑，记空白。

### N37：defaults 写 pending 期间静默丢弃 → BUG-107

- **命题**：defaultsStore 在 pending 期间收到第二次 set/unset/clear 时排队或显式 busy，
  不静默丢写。
- **最低层**：store 级（fake execute 延迟；连续两次 setPatch）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/defaults-pending-drop.mjs`
- **证据**：commandsBeforeRelease 1 / total 1；第二次 output.shape 未应用；outcome 只有第一次的 ok。
- **判定**：**发现** → [BUG-107](../_archived/fixed_bugs/BUG-107-defaults-pending-drop.md)（P2，排查中；未改产品代码）。
- **下一层**：真实面板 blur→select 事件顺序、跨轴合并语义、host revision；未跑，记空白。

### N38：config feed 交互态跨会话残留 → BUG-108

- **命题**：useConfigFeed 切换会话时清空 receipt/detail/menu/confirm/sending 等交互态。
- **最低层**：hook 级真跑（happy-dom + react-dom/client；s1 send 后切 s2）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/config-feed-receipt-stale.mjs`
- **证据**：afterSend 与 afterSwitch 的 receipt 都是 `sent/receiptSent`；staleReceipt true。
- **判定**：**发现** → [BUG-108](../_archived/fixed_bugs/BUG-108-config-feed-interaction-state-stale.md)（P2，排查中；未改产品代码）。
- **下一层**：receiptDiff/replied/轮询晚到、删除确认/菜单的完整 UI 影响；未跑，记空白。

### N39：来源回执目录被当文件 → BUG-109

- **命题**：run source 的交付回执在场判定要求 `type === 'file'`，名字相同目录不算。
- **最低层**：hook 级真跑（happy-dom；drt_x/delivered.json 为 directory）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/run-source-delivered-dir-eligible.mjs`
- **证据**：`{"status":"eligibleRun","eligible":true}`，deliveredRecord 命中目录。
- **判定**：**发现** → [BUG-109](../_archived/fixed_bugs/BUG-109-run-source-delivered-dir-eligible.md)（P2，排查中；未改产品代码）。
- **下一层**：acceptance.md 同类、其它名字在场消费面、真实畸形 bundle；未跑，记空白。

### N40：run source symlink 越界 → BUG-110

- **命题**：Node RunSource 的 run bundle 根必须落在工作区内；symlink 不得引到外部。
- **最低层**：临时目录 symlink + `nodeRunSource`/`openRun`；无模型/浏览器。
- **实际命令**：
  `node --import tsx/esm runtime/explore-20261112/run-source-symlink-escape.mjs`
- **证据**：drt_evil -> outside；list 见 question.md；openRun 读 `OUTSIDE SECRET`；escaped true。
  run-context 只做词法 `..`/绝对路径检查，nodeRunSource 跟随 symlink。
- **判定**：**发现** → [BUG-110](../_archived/fixed_bugs/BUG-110-run-source-symlink-escape.md)（P2，排查中；未改产品代码）。
- **下一层**：symlink 文件（非根）、browserRunSource 语义、写路径 symlink；未跑，记空白。

### N41：方法库写 symlink 越界 → BUG-111

- **命题**：方法库写工具的 read-modify-write 不跟随 symlink，写入必须落在工作区内。
- **最低层**：临时目录 symlink + 工具同款 read/upsert/write；无模型/浏览器。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/method-library-symlink-write-escape.mjs`
- **证据**：method-library.md -> outside-target.md；写入后 outsideChanged true、
  outsideHasEntry true；symlink 仍保留。
- **判定**：**发现** → [BUG-111](../_archived/fixed_bugs/BUG-111-method-library-symlink-write-escape.md)（P2，排查中；未改产品代码）。
- **下一层**：目录 symlink、hardlink、写后回读的边界；未跑，记空白。

### N42：plan recorded 斜杠字段假阳 → BUG-112

- **命题**：recorded 版本只从真正的重写记录取，普通正文 bullet 的 `/ vN /` 不算。
- **最低层**：纯函数（`runVersionFaceOf`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/plan-recorded-slash-false-positive.mjs`
- **证据**：头部 v3 + 正文 `- 参考 / v1 / 旧方案示例` → recorded 1、versionConflicted true、
  label「版本声明不一致」。
- **判定**：**发现** → [BUG-112](../_archived/fixed_bugs/BUG-112-plan-recorded-slash-false-positive.md)（P2，排查中；未改产品代码）。
- **下一层**：记录节上下文、真实重写记录形态；未跑，记空白。

### N43：port-reclaim 身份 overmatch → BUG-113

- **命题**：port-reclaim 只杀真正 DSH web/本仓入口，不杀仓库路径下的无关进程。
- **最低层**：纯函数 `isOwnListener`；无子进程。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/port-own-listener-overmatch.mjs`
- **证据**：`node .../ai_dsh_deep_research/scripts/my-server.mjs` own=true；`tail -f .../ai_dsh_deep_research/...` own=true。
- **判定**：**发现** → [BUG-113](../_archived/fixed_bugs/BUG-113-port-own-listener-overmatch.md)（P2，排查中；未改产品代码）。
- **下一层**：argv 解析/pid 锁身份；未跑，记空白。

### N44：方法库锁释放删新锁 → BUG-114

- **命题**：陈旧锁被接管后，旧 owner 的释放不得删除新 owner 的锁。
- **最低层**：临时目录单进程确定性复现（A 持锁→过期→B 接管→C 建锁→A finally）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/method-lock-release-stale-owner.mjs`
- **证据**：A 返回后 lockStillExists=false（C 锁被删），bug true。
- **判定**：**发现** → [BUG-114](../_archived/fixed_bugs/BUG-114-method-lock-release-stale-owner.md)（P2，排查中；未改产品代码）。
- **下一层**：真实 >30s 写停顿、flock/租约语义；未跑，记空白。

### N45：BUG-081 修复后名称占位符仍非法 → BUG-115

- **命题**：用户可见的名称示例必须通过名称校验；修复后中英提示一致。
- **最低层**：字典 + 纯函数（`zh.namePlaceholder` + `methodNameIssue`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/name-placeholder-invalid-after-fix.mjs`
- **证据**：zh placeholder `投研尽调（我的口径）` 被 `methodNameIssue` 拒绝；
  en placeholder ASCII 括号通过；zhPlaceholderInvalid true。
- **判定**：**发现** → [BUG-115](../_archived/fixed_bugs/BUG-115-name-placeholder-invalid-after-fix.md)（P2，排查中；未改产品代码）。
- **下一层**：其它用户可见示例名（coach prompt/内置内容）的合法性；未跑，记空白。

### N46：最后一条 present 无版本仍报旧版本 → BUG-116

- **命题**：交付版本跟随最后一条 present；最后一条无版本时返回 null，与 latestFinalDelivery 一致。
- **最低层**：纯函数（`latestFinalDelivery` + `latestPresentedFinalVersion`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/present-version-last-unversioned.mjs`
- **证据**：present v2 后 present final.md → latestFinalDelivery final.md（turn3），
  latestPresentedVersion 2；mismatch true。
- **判定**：**发现** → [BUG-116](../_archived/fixed_bugs/BUG-116-present-version-last-unversioned.md)（P2，排查中；未改产品代码）。
- **下一层**：同事件 reader/vN、真实 re-present 形态；未跑，记空白。

### N47：status feed trust/face 跨会话残留 → BUG-117

- **命题**：状态页切会话后 trust/face/unbound 与 journal 一起重置。
- **最低层**：hook 级真跑（happy-dom；s1 write 绑定，s2 follow 无帧）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/status-feed-trust-stale.mjs`
- **证据**：afterS1/afterS2 trust 都是 bound/old；events 0；staleTrust true。
- **判定**：**发现** → [BUG-117](../_archived/fixed_bugs/BUG-117-status-feed-trust-stale.md)（P2，排查中；未改产品代码）。
- **下一层**：face/unbound 的真实时序、member summaries；未跑，记空白。

### N48：status leads/findings 目录被当文件 → BUG-118

- **命题**：步骤条的 leads.md/findings.md 与 question/review/final 一样用 hasFile。
- **最低层**：纯函数/源码（openRun entries 目录 + view.hasFile）。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/status-leads-findings-directory.mjs`
- **证据**：namesHasLeads true / hasFileLeads false；findings 同。
- **判定**：**发现** → [BUG-118](../_archived/fixed_bugs/BUG-118-status-leads-findings-directory.md)（P2，排查中；未改产品代码）。
- **下一层**：其它 names.has 消费面；未跑，记空白。

### N49：config adoption 跨会话残留 → BUG-119

- **命题**：配置页签切会话后 events/adoption 与 receipt 一起复位。
- **最低层**：hook 级真跑（happy-dom；稳定 runSource/readFile；s1 write 绑定）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/config-feed-adoption-stale.mjs`
- **证据**：afterS1/afterS2 adoption 都是 unrecorded；staleAdoption true。
- **判定**：**发现** → [BUG-119](../_archived/fixed_bugs/BUG-119-config-feed-adoption-stale.md)（P2，排查中；未改产品代码）。
- **下一层**：真实首帧延迟、keyed remount；未跑，记空白。

### N50：方法库 hardlink 读越界 → BUG-120

- **命题**：方法库目标必须是工作区独立文件；hardlink 不得读出工作区外内容。
- **最低层**：临时目录 hardlink + `safeMethodLibraryPath`/`readLibraryFile`。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/method-library-hardlink-read-escape.mjs`
- **证据**：hardlink 外部 `OUTSIDE SECRET`；escapedRead true；写 rename 后 outside 仍原样。
- **判定**：**发现** → [BUG-120](../_archived/fixed_bugs/BUG-120-method-library-hardlink-read-escape.md)（P2，排查中；未改产品代码）。
- **下一层**：nlink>1 策略、NFS/跨设备语义；未跑，记空白。

### N51：phase 行尾注释被拒 → BUG-121

- **命题**：run 模板的 `- phase: accepted   # ...` 仍能被完成判据识别。
- **最低层**：纯函数（`isCompletedMethodSourceRun`）。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/source-phase-trailing-comment.mjs`
- **证据**：裸/`- phase:` accepted true；带 `# done` / 模板注释 false。
- **判定**：**发现** → [BUG-121](../_archived/fixed_bugs/BUG-121-source-phase-trailing-comment.md)（P2，排查中；未改产品代码）。
- **下一层**：其它行尾装饰、真实 run.md 注释；未跑，记空白。

### N52：finalPathOf 嵌套非 bundle 后缀 → BUG-122

- **命题**：finalPathOf 只接受工作区根/archive/_abandoned 下的终稿族；notes/drafts 前缀不算。
- **最低层**：纯函数（`finalPathOf`）。
- **实际命令**：`node --import tsx/esm runtime/explore-20261112/final-path-nested-non-bundle.mjs`
- **证据**：notes/drt_x/final.md → drt_x/final.md；drafts/drt_x/final/v2.md → drt_x/final/v2.md。
- **判定**：**发现** → [BUG-122](../_archived/fixed_bugs/BUG-122-final-path-nested-non-bundle.md)（P2，排查中；未改产品代码）。
- **下一层**：绝对路径工作区根校验、真实 present 分布；未跑，记空白。

### N53：默认标记在 provenance 里被误判 → BUG-123

- **命题**：`isDefault` 只认括号外的 `〔默认偏好〕`；provenance 内的同形文字不算。
- **最低层**：纯函数（`foldLibrary` + `renderLibraryEntry`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/library-default-marker-in-provenance.mjs`
- **证据**：`## 方法（〔默认偏好〕）` → provenance 标记、isDefault true；真实标记/无标记对照符合。
- **判定**：**发现** → [BUG-123](../_archived/fixed_bugs/BUG-123-default-marker-in-provenance.md)（P2，排查中；未改产品代码）。
- **下一层**：其他 title 段（多标记/全角空白）、默认消费链；未跑，记空白。

### N54：heading 段间空白被 upsert 漏认 → BUG-124

- **命题**：fold 接受的 name/provenance/标记间空白，写路径也必须匹配为同一条目。
- **最低层**：纯函数（`foldLibrary` + `upsertMethodEntry`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/heading-whitespace-between-segments.mjs`
- **证据**：无空格 updated/1 条；`## 方法（来源） 〔默认偏好〕` 与 `## 方法 （来源）` created/2 条同名。
- **判定**：**发现** → [BUG-124](../_archived/fixed_bugs/BUG-124-heading-whitespace-between-segments.md)（P2，排查中；未改产品代码）。
- **下一层**：全角空白/多空格/换行 heading；未跑，记空白。

### N55：无 `##` plan 版本取 last → BUG-125

- **命题**：无 `##` 的旧 plan 退化到全文**首个**版本声明；正文旧引用不覆盖。
- **最低层**：纯函数（`runVersionFaceOf` + `planIndex`）。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/plan-no-heading-version-last.mjs`
- **证据**：无 `##`、头 v2、正文「旧版图版本：v1」→ runVersionCurrent 1 / planIndexVersion v1；
  expected 2。
- **判定**：**发现** → [BUG-125](../_archived/fixed_bugs/BUG-125-plan-no-heading-version-last.md)（P2，排查中；未改产品代码）。
- **下一层**：共享版本解析/多版本 header；未跑，记空白。

### N56：方法库锁活 pid 被当陈旧 → BUG-126

- **命题**：锁接管前确认持有 pid 已死；活进程的长写不得被抢锁。
- **最低层**：临时目录锁文件（当前 pid + 旧 mtime）+ `withMethodLibraryLock`。
- **实际命令**：
  `TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" node --import tsx/esm runtime/explore-20261112/method-lock-stale-live-pid.mjs`
- **证据**：pidAlive true、oldLockTakenOver true、bug true。
- **判定**：**发现** → [BUG-126](../_archived/fixed_bugs/BUG-126-method-lock-stale-live-pid.md)（P2，排查中；未改产品代码）。
- **下一层**：pid 复用/心跳/flock 语义；未跑，记空白。
