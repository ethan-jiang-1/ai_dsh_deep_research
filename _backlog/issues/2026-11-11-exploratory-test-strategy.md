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
  （[protocol-core.test](../../tests/run/protocol-core.test.mjs)）覆盖了非法通道/预算漂移/不可解析预算，
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
| 新 preset/worker 真挂载了吗 | L1 keyless | `preset-smoke`（已含 worker profiles） | 分钟 |
| 装配出的 model-visible 文本变了吗 | 回放（无模型） | `snapshot-replay-smoke` | 分钟 |
| 模型遵守散文纪律吗 | 探针 | `probes/behavior/*`（一次 boot 多场景） | 分钟 + 模型 |
| 整条用户链路通不通 | L4 | 完整 run | 30–60 分钟 + 模型 |

**默认往下走，不默认往上走**：能在纯函数层证伪的命题，不许用探针回答；探针档回答不了的，才考虑 L4。
本轮 pilot 的 5 个问题全部停在第 1–2 层。

### E3 四条无规格 oracle

探索的难点是「没有断言可跑」。本仓有四类现成 oracle：

1. **散文合同变异**：把 docs/审计里写死的「必须红」逐字变成输入，喂给被测函数；绿 = 候选 fail-open。
   这是收益最高的一类——测试通常由实现者按同一条 happy path 写。
2. **表示层差分**：列出「同一事实的两份副本」，逐字段/逐字对账；漂移 = 观察或 bug。
3. **回放差分**：不重录金样，直接跑 `snapshot-replay-smoke`；diff 告诉我「这次改动进了哪个座位的
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
| P4 | worker profiles（D47） | 结构契约 + row-deps（读码核对） | 6 条契约测试把守行形态；`preset-smoke` 已把 workers 纳入真挂载 | 关闭（一处观察） |
| P5 | 回放角色覆盖 | `snapshots/replay/research-face` 声明（读旧样本核对） | 4 个研究角色；workers/method-editor 按角色语义不入研究面 | 不是缺口；worker 行为仍零证据 → X6 |

**成本**：5 个面（3 个实跑 + 2 个静态核对），0 次模型调用，约 15 分钟；证据为一次性脚本
（运行区 `explore-20261111`，gitignored，可清）。**本轮未跑**：`preset-smoke`、任何 smoke、任何探针。

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

**重建方法**：用 `tests/run/protocol-core.test.mjs` 的 `baseProtocol` 作底，配 `strategyOf` 同形态的
plan 文本，跑 `evaluateBundle`，只看 `strategy-*` code。

**P4 观察（不是 bug）**：`preset-structure` 门禁只 glob `presets/`，`workers/` 的「行形态」由
[tests/pack/workers.test.mjs](../../tests/pack/workers.test.mjs) 六条契约把守（`row-deps` 已覆盖 workers）。
契约有家，门禁形状偏窄——owner = `scripts/verify`，本轮不修。

## 第 1 轮 charter 图（待授权）

keyless 批（X1–X5、X7、X8）不调模型、不改产品代码，可自主执行；X6 真模型批单独授权。

| ID | 假设（要杀死的命题） | 最低层 | oracle / 变异 | 预算 | 停止 |
|---|---|---|---|---|---|
| X1 | 投影四处（protocol JSON / §Protocol / 策略行 / 卡文）任一字段漂移都会红或 warn | 纯函数 | 逐字段变异：缺/非法/大小写/单位/边界/自相矛盾 | ~10 min | 变绿 = 候选 fail-open |
| X2 | Protocol 边界输入下 hash/版本/审计解析稳定 | 纯函数 | `auditHashOf` 版本前缀（v1 vs v10）、多 hash 取首、数组顺序敏感性、时区 | ~10 min | 差异 = 候选 |
| X3 | 最近改动没有留下未同步的副本 | 静态 + 逐字 | README.zh↔README、plan 模板策略行↔派生、design/20↔workers、手册源↔`_dist`、overlay↔render | ~10 min | 漂移 → owner/观察 |
| X4 | 内容改动没有意外进入其它座位的 model-visible 文本 | 回放 | 不重录跑 `snapshot-replay-smoke`，逐座位读 diff | ~2 min | 差异需判应然/实然 |
| X5 | 既有 run/会话里没有系统性异常 | 既有证据 | `session-events` / `stream-diagnostics` / `provider-error-stats` / `run-inventory` / `unconsumed-evidence` | ~10 min | 只记计数与分布 |
| X6 | worker profile 真按薄工具面与 brief 边界行动 | 探针（1 boot） | subagent 默认落 `research-worker`；child 无 team/goal/ask；被要求组队时不编造工具 | ≤6 次调用 / ≤10 min | 单场不写「稳定」 |
| X7 | symlink checkout 与交接路径没有静默不执行 | keyless | `handoff-smoke`；`isMain` 负例（相对路径/不存在/目录）；`/tmp`→`/private/tmp` | ~5 min | 未跑记未跑 |
| X8 | 新 typed 输入在真浏览器可用 | 已起 GUI | `client-load-smoke` + `cdp-probe`；ResearchConfigTab 新字段 | ~5 min | 未起 GUI = 未跑 |

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
| worker profile 结构 / 挂载 | 已关闭（静态） | 第 0 轮 P4（契约测试 + preset-smoke 覆盖） |
| 回放角色覆盖（角色面） | 已关闭（静态） | 第 0 轮 P5（研究角色 4 席；workers 不入研究面） |
| 回放差分（X4） | 已探 | [BUG-051](../_archived/fixed_bugs/BUG-051-replay-smoke-panerows-undeclared.md)；lead 快照待重录；C2 未归属 |
| 后验扫场（X5） | 已关闭 | 71 场/3742 文件；provider/stream 无系统性异常 |
| 真实 bundle 反向验证 | 已探 | 8/8 `protocol-audit PASS`；2 个单深度 → [BUG-048](../_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md) 生产证据 |
| 入口 / 交接路径（X7） | 已关闭 | `isMain` 五形态无发现；`handoff-smoke` ALL PASS |
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
  - [BUG-051](../_archived/fixed_bugs/BUG-051-replay-smoke-panerows-undeclared.md) **P2**（新发现）：`snapshot-replay-smoke`
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
  `false`；`/private/tmp` 归一化按预期生效。**无发现**。`handoff-smoke` 未跑（下轮）。
- **未跑**：X7 的 handoff-smoke（本轮补跑，见下）、X8 GUI typed 输入；X6 真模型未授权。

### 第 3 轮（2026-11-11）：门禁的缺席语义 + 已交付 bundle 复核

- **X7 补跑（闭合）**：`handoff-smoke` **ALL PASS**（HANDOFF 含 git init / gitlink 40 位 SHA /
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
    （verdict-audit-core 头注 + `tests/run/verdict-audit.test.mjs` 明确「不假装核过原文」），不建卡。
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
- **并发上下文**：另一个 agent 正在改 `protocol-audit-core` / `protocol-core` / `snapshot-replay-smoke`
  （paneRows 已恢复、protocol 测试在动）——本轮结论以**未改文件**的机制为准；被打补丁的面上不再追新卡。
- **回放复跑（测试已全绿、client 改动仍在工作树）**：lead 仍 4 红，`C2` 稳定复现——右栏可见页签只有
  Agent Team / Chat / Method library，**「研究状态」与「研究配置」两个 pack 页签都不在**；C3/C5 连带。
  当前树含未提交的 client i18n 重构（14 文件，含 ResearchStatusTab/ResearchConfigTab/ResearchGraphTab），
  归属待其提交后复跑；**不先建卡**（未落地的在办改动不算缺陷）。复现命令 =
  `node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario lead`。
- **快照（B·persona）**：仍为 D48 后未重录，需 with-key 重录（用户预算）。

### 第 11 轮（2026-11-11）：文案断言的 locale 归属

- **发现**：[BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) **P2**——
  回放冒烟的 guide 胶囊定位器写死中文 `/研究状态/`，而客户端文案已随 locale（同一环境可见页签是
  **英文 `Method library`**，Playwright 默认 en-US）→ C2 必红，C3（0 行）/C5（金标准）连带，
  **渲染金标准守卫在 en-US 环境整片失效**。同仓 `client-load-smoke` 已有正确写法（双语正则 + 注释
  「Tab title is locale-owned」），可作修复范本。
- **X8 未跑（honest）**：`client-load-smoke` **exit 2 NOT-RUN**——主机不健康（load 7.77 / free 86MB < 512MB）。
  未跑 ≠ 通过；等主机释放后再跑。
- **归属依据**：当前工作树仍含未提交的 client i18n 重构，故 C2 的「成因已证、修复归属待提交后确认」；
  卡里只主张**定位器与 locale 契约**这一层，不主张产品 bug。

### 第 12 轮（2026-11-11）：观察面证据为何长期不可达

- **发现**：[BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) **P2**——`host-health` 的
  free 判据用 `os.freemem()`（macOS 只报 free pages），实测 182MB < 512MB 阈值判「不健康」，而同一时刻
  `vm_stat` 的 inactive+free+speculative ≈ 6.9GB 可回收、load/cpu = 0.88——**误报**。后果：`client-load-smoke`
  在开发机上常态 NOT-RUN（X8 长期不可达），且真实产品红可能被 `isHostUnhealthyVerdict` 收口成环境红。
  修复方向 = 平台相关可用量（macOS: free+inactive+speculative；Linux: MemAvailable），阈值语义写清。
- **[BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 扩证到代码层**：
  `launchChromium()` = `chromium.launch()`（无 locale）+ `newPage()`（无 context 选项）= Playwright 默认
  `en-US`；同批脚本的 locale-owned 文案定位器清单已列进卡（client-load-final / client-load-smoke），
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
  同批 `client-load-smoke` 明确保持 en-US 且注释了理由——两条策略各自自洽，**混用**才出事。
  三条初始假设（流程/注册/场景）已作撤回记录留在卡上。
- **未跑**：X6 真模型；X8 仍被 [BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) 挡住。
### 第 14 轮（2026-11-11）：观察面放行后的第一跑

- **[BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) 修复已验证**：`host-health` 新增
  平台采集——macOS 读 `vm_stat` 的 free+inactive+speculative+purgeable（`availableMemoryMBFromVmStat`），
  Linux 读 `MemAvailable`（回退 MemFree+Buffers+Cached）；本机实测 available = **7616MB** → healthy
  （此前 `os.freemem()` 182MB → unhealthy）。纯函数单测 10 例绿（含「读不出 → null」的 fail-loud 反例）。
- **X8 尝试被并发实例挡住**：`client-load-smoke` exit 2「另一个实例在跑（pid 33393；锁
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
  也没有 `--force`/陈旧度接管；`client-load-smoke` 亦无全局 watchdog。结构上「owner 活着但卡死」会
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

- **发现**：[BUG-064](../bugs/BUG-064-replay-a-layer-not-self-contained-tool-stall.md)（排查中，P2）——
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
  `protocol-core.test.mjs` 报 `lensScanOf` 尚未导出——他们正在加 lenses 解析修复，半成品状态）。以上均属
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
