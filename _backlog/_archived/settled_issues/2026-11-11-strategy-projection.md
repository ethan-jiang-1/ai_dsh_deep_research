---
status: 已结
opened: 2026-11-11
---

# 推敲：Strategy 投影 + HITL1 typed 输入（O1）

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 研究依据：[strategy-abstraction](../research/strategy-abstraction/README.md)（材料 §6.5/§8/§9/§13）
> 结论：Strategy 投影（K/O/G/B 派生）+ HITL1 typed source/output + `protocol-audit` 投影门落地；M4 三场 pilot 记录在案（quick×2 `run-accept` PASS；deep×2 `protocol-audit` 绿、`run-accept` 被 D44 形状红阻断，已记残余）。
> 去向：implemented — [Note](../../../notes/implemented/2026-11-11-strategy-projection.md) + [D48](../../../docs/decisions.md#d48)
> 审查：语义自审按 `reviewing-a-delivery` 走查（跨面 diff）；机械门禁全跑；用户 2026-11-11 签收。
> 业务验收：用户已签（2026-11-11，HITL1 合同 / 用户面变更）。

**问题与期望结果：** 用户的一次研究意图主要通过 HITL1 三问和一段自由文本表达；UI 层
「研究配置」只管理 method prose，Protocol 是设计记录，行动层的 channel/roles/topology
散在 `team-assembly` / `research-planning` / `plan.md` 里。结果是：UI 输入无法可靠地
转换成不同的 Deep Research 策略；`protocol-audit` 只咬形状与三个计数，改 source/gates/
method 字段也能 PASS；库采用 0/63。期望：把「用户意图 → Protocol → Strategy → DSH 原语」
这条转换显式化一层，先证明它可读、可机检、可试点，再决定是否做策略优先 UI（O2）或
Package C（O3）。

**当前情况：**

- 研究已定性到可讨论：三层抽象成立；缺的是 Strategy 层（K/O/G/B），不是又一层 UI。
  （[材料](../research/strategy-abstraction/2026-11-11-strategy-abstraction.md) §0/§13）
- Protocol 的机器面只咬自洽性 + 三个计数（nodes/cells/waves）；`source_scope.*`、
  `output.sections/length`、四个 gates 字段语义零消费；红队 A–G 见材料 §4。
- shipped「研究配置」页签静态读源码只剩「换一条」，且只在 run 已记录后出现；卡片/⋯/
  新建/编辑/删除是 `!COMPACT` 死分支；「起草/沉淀」是死 UI（材料 §7.2 U1/U2）。
- 方法库四字段多行输入会丢续行、改名会另存为新条目（材料 §7.2 U3；static，待 GUI 复核）。
- D47 已落 `research-worker` / `research-wave`：默认 spawn 不再落 Lead 克隆；workflow 只在
  `research-wave`；team 主通道的角色边界仍是政策（G1）。
- UI 全树 grep `protocol` = 0：协议在用户面完全不可见。

**未决问题：**

- Strategy 投影放哪、是否另立文件：本卡取「派生视图，不新增 canonical 文件」。
- 3 个 typed 输入是否塞得进 ≤200 字卡：本卡取「折进现有三问，不新增第四问；超限按
  删减序压」。
- U1/U3 是否同卡修：本卡取「同卡 M0 前置小修」，否则 pilot 读到的是坏 UI。
- D 号编号：交付时按台账空位登记，不预先占用。

**下一步：** M0–M4 已完成（3 场 pilot 记录见 §实施记录；quick A/B `run-accept` PASS，deep 两场 `protocol-audit` 绿、`run-accept` 被 D44 形状红阻断已如实记录）。余：**用户业务验收**（HITL1 合同 / 用户面变更）→ 写 implemented Note、登记 D 号、卡转 `已结` 并归档；机械收尾 `pnpm verify` / `pnpm test` 同变更。

## 方案与取舍

### 决策：O1，不是 O0/O2/O3

- **O0（只测量）不够**：0/63 采用和投影漂移是真问题，但只记账不解决转换。
- **O1 是唯一能证明「转换」的最小片**：派生 Strategy 投影 + 3 个 typed 输入 + 投影门 +
  3 场 pilot；不动大合同、不加 host 工具、不新增 canonical 文件。
- **O2（策略优先 UI / 命名策略目录）暂不做**：库采用 0/63；先证明用户会用 source/output/
  effort 这三个输入，再决定是否把库变成策略目录。过早做会把「偏好越多越伤事实」的风险
  做成现实。
- **O3（Package C / spawn-first）暂不做**：D47 已落 worker/wave（Package B）；team 主通道
  的角色边界仍是政策（G1），但当前证据是「潜伏，不是已发生」；只有真 run 出现越界
  （critic 调 ask/goal/present）才升级。
- **U1/U3 作为 M0 前置**：U1 让唯一的 method 切换在 run 前不可达；U3 让库长文本丢续行、
  改名变另存。pilot 之前修，否则试点数据不可信。

### Strategy 投影（K/O/G/B）

v1 = **派生视图**，不是新 canonical：

```text
S = (K, O, G, B)
K  knowledge    method.fields / source_scope / output.shape+sections / lens 集 / 手册
O  orchestration channel（team / spawn / workflow）+ worker 路由
                （research-worker / scout / analyst / critic / research-wave）
                + team 成员 + topology（nodes/cells/waves/depths）+ 重写策略
G  gates        hitl1 / hitl2 / critic / claim / coverage
B  budget       nodes_max / cells_max / waves_max / allowed_depths / 8 槽
```

- 投影由 `strategyOf(protocol, plan, presets)` 纯函数算；卡/计划头只渲染，不手写第二份。
- 值只从 `protocol.json` + `plan.md` + `presets/*.patch.yml` / `workers/*.patch.yml` 读；
  不读会话记忆，不读驾驶舱。
- v1 不落 `strategy.json`；若 pilot 证明投影需要独立审阅，v2 再讨论 canonical 化。

### 编译器规则（v1）

| Protocol | Strategy | 规则 |
|---|---|---|
| method.id/fields | K + O 默认拓扑 | method 决定四字段与默认 lens；不决定 channel |
| source_scope | K（worker 检索面）+ G（v2 source-tier） | typed 输入优先；缺省按 method/lens |
| effort | B + O 拓扑上限 | nodes/cells/depths 硬；waves 只 warning |
| output.shape/sections | K（综合模板）+ G（v2 output 门） | shape 进卡/投影；sections 是 prose |
| gates | G | 出厂 policy；用户不可关 |
| D47 路由 | O | 一次性→`research-worker`；角色→scout/analyst/critic；wave→`research-wave`；多轮→Team |

**可行性检查**（不满足就在卡/投影里明说，不假装）：

1. 策略是否要换**当前会话 preset/工具面**？是 → 只能新 run 首回合前；run 中拒绝。
2. 是否要**角色级工具边界**？team 只能政策；要机器 → spawn/role preset 或 O3。
3. 是否要**同质扇出**？→ `research-wave` + 计划卡授权 + 8 槽。
4. 是否要**多轮协作/任务板**？→ Team；subagent 在 Team 组合是 one-shot（G2 合同）。
5. 是否要**中途 steer**？当前只有两点 HITL；不承诺。
6. 是否要**输出/来源语义门**？v1 没有；v2 再加。

### UI 输入：3 个 typed，折进 HITL1

不新增第四问；把现有三问扩成「推荐 + 选项」：

| 现有问 | 加什么 | 落到 |
|---|---|---|
| Q1 研究类型/方法 | 承诺/策略族一句话（6 原型） | method + 初始 Strategy |
| Q2 深度/篇幅 | output.shape（快答/完整报告/1 页/对比表/时间线/地图） | `output.shape` |
| Q3 口径 | source families（official/academic/regulatory/practitioner/web/local）+ authority/recency | `source_scope` |

- 每问推荐项首位 + 「(Recommended)」；选项带一句 description；用户可自填。
- 卡仍 5 维（问题/方法+来源/投入+输出/决定/授权），≤200 字；source/output 用短标签，
  不新增维度；超限先删决定细节/问题括注，不删授权行。
- 方法库继续做 prose 方法库，不做策略目录；「用于本次研究」只作推荐默认，不承诺换策略。

### 门与证据

- **M1**：`strategyOf()` 纯函数（`scripts/lib/`）+ 3 个 bundle 的单测；不接交付门。
- **M3**：扩 `protocol-audit` 的 `strategy` 检查（投影在场、channel/roles/worker 合法、
  8 槽、source/output 与 Protocol 一致）；先写红：改 source/output 或 worker 路由 → RED；
  3 个 bundle 0 误伤。若 M3 超 150 行，再拆 `strategy-audit`。
- **M0 红**：先证明 U1（run 前不可达）/ U3（续行/改名）在测试或 GUI 上可复现，再修。

### 实施步骤

| M | 内容 | 证据 |
|---|---|---|
| **M0** | 修 U1（run 前 method 选择入口或删死文案）+ U3（多行保真/改名语义）；client 测试 + GUI 复核 | 红→绿；`pnpm test` |
| **M1** | `strategyOf()` + 3 个 bundle 投影示例（quick/landscape/regulatory）；不接门 | 3/3 字段可读、与 plan/预设一致 |
| **M2** | HITL1 三问加 source/output/effort 选项；`research-brief` skill + lead persona + question 模板；卡 ≤200 | 真模型 L4-lite / snapshot；卡 3 张样本 |
| **M3** | `protocol-audit` 扩 strategy 检查 + source/output 数字投影检查；红队 | 红→绿；3 bundle 0 误伤 |
| **M4** | 3 场 pilot（quick/landscape/regulatory）；记录采用、修订、投影可读性 | pilot 记录；Note + D 号 |

### M1 预跑（纸面，3 个现有 bundle）

| 策略 | K | O | G | B |
|---|---|---|---|---|
| `quick_fact_check` | 事实核查四字段；official+web 4 域；quick_answer 300–700；official lens | 不组队；`research-worker`（取数）+ `critic`（复核）；无 wave；3 节点/2 Wave | hitl1 none；critic light；claim off | 3/2/L1–L2 |
| `landscape_deep` | 领域地图；paper/conference/benchmark + web-secondary；landscape_map 3500–6000；academic/structural/practitioner/adversarial | team：scout + analyst-a/b + critic；一次性取证可落 `research-worker`；无 wave；12 节点/6 Wave/9 cells | protocol；critic both；claim on | 12/9/L1–L3 |
| `regulatory_compare` | 方案比较；official+web 11 域；full_report 8 sections 3500–6000；regulatory/official/historical/adversarial | team：scout + analyst + critic；图 v2 回边；12 节点/5 Wave/11 cells | protocol；both；on | 12/11/L1–L3 |

**读法**：3/3 能从 `protocol.json` + `plan.md` + presets 拼出 K/O/G/B，不需要新对象；
唯一不确定是 quick 的 worker 名（旧 run 用 `analyst`，D47 后省略默认 `research-worker`）。
这证明 M1 是「派生」，不是「再写一份」；M3 的 gate 只需对账，不需新存储。

### 不做（本卡外）

- O2 策略优先 UI / 命名策略目录 / style catalog；O3 Package C / spawn-first。
- worker selector 过滤（U9；接受命名，产品决定后续）。
- output length 机检、cockpit 委派图、库 schema 版本、`strategy.json` canonical。
- 新增 host 工具 / 新调度器 / 新角色。

## 验收标准

1. **M0**：U1 在 run 前有一个可用的 method 选择入口（或死文案删除），U3 多行/改名有
   keyless 测试；GUI 复核记录。
2. **M1**：`strategyOf()` 对 3 个现有 bundle 输出 K/O/G/B；与 plan 节点/预设一致；
   不新增 canonical 文件。
3. **M2**：HITL1 卡包含 source/output/effort 选项，≤200 字，不新增第四问；3 场 pilot 的
   Protocol 字段与用户选择一致；用户能复述「这次策略是什么」。
4. **M3**：红队改 source/output/worker 路由 → `protocol-audit` RED；3 个 bundle 0 误伤；
   投影漂移（§Protocol ≤18 vs JSON 12）被抓。
5. **M4**：3 场 pilot 记录；`pnpm verify` / `pnpm test` 全绿；Note + D 号；研究题名页
   `产出的卡` 与本卡互链。

## 实施记录（滚动）

- **2026-11-11 M0**：
  - `renderLibraryEntry` 多行压单行（`flattenSectionValue`）；`tests/cockpit/library-fold.test.mjs`
    新增多行 round-trip 例。红证 = 回退 `value.trim()` → 该例红；恢复绿。
  - `EditorView` 编辑态名称只读；`tests/cockpit/method-library-views.test.mjs` 断言 input
    的 `readonly`。红证 = 删 `readOnly` → 红；恢复绿。
  - U1 增加 run 前「选方法（发给 Lead）」入口；`tests/cockpit/research-config-source.test.mjs`
    钉源面。红证 = 改回死文案 → 红；恢复绿。
  - `pnpm test` **1172 pass / 0 fail**；`pnpm verify` 全绿；`pnpm typecheck` 通过。
- **2026-11-11 M1**：
  - `scripts/lib/strategy-core.mjs` + `tests/run/strategy-core.test.mjs`（6 例：null /
    quick spawn / team / back-edge / wave / lenses）。
  - 红证 = `channelOf` 永远 `spawn` → Team 例红；恢复绿。
  - `scripts/README.md` 加 lib 行；`navigability` 消费列对账绿。
- **2026-11-11 M3a/M3b**：
  - `protocol-audit-core.mjs` 增 `projection-number/source/output` 与 `strategy` 检查；
    `tests/run/protocol-core.test.mjs` 增相应用例（现 24 例，全绿）。
  - 真 bundle 红证：`drt_ai-model-regulation-cn-eu-us` → `[projection-number] §Protocol
    投入节点 ≤18 ≠ JSON nodes_max 12`。
  - 红证 = 翻转 nodes 比较 → 单例红；删 `checkStrategy` 调用 → strategy 例红；均恢复绿。
  - 三场 bundle 复核：quick / landscape **PASS**（`strategy-missing` 只 warning）；
    regulatory **RED** `projection-number`（真漂移，不是误伤）。
  - `strategy-core` 被 `protocol-audit-core` 消费；`scripts/README` 消费列对账绿。
- **2026-11-11 M2/M3b**：
  - `research-brief` 三问加 output/source typed 落格（不新增第四问）；`plan.md` 模板加
    `> - 策略:` 派生行；`node dev/render-overlay.mjs` 已重生成。
  - `tests/pack/research-brief-contract.test.mjs` 2 例绿；`tests/pack/content-coverage.test.mjs`
    把 output shape 的 `*_map`（`landscape_map`，D46）从研究类型近形扫描中排除（红证 = 未排除
    时该例红，已实跑）；`tests/fixtures/hitl1-intake-samples.md` A 类补 output/source 走查项
    （shape 契约 5 pass）；`pnpm test` **1178 pass / 0 fail**（含 persona/strategy 新例）；
    `pnpm verify` 全绿；persona 修复后 L1 `preset-smoke` **ALL PASS**。
  - L1 `preset-smoke` **ALL PASS**（5 角色 + 2 worker profile）。
  - `snapshot-replay-smoke`：lead C2（右栏 guide 不可见）与 `paneRows is not defined` 2 红；
    `paneRows` 是脚本未定义变量、C2 是既有 UI fixture 漂移（脚本未改），不是本卡文本引起；
    已记录，不在本卡修 UI fixture。
  - L4-lite **ALL PASS**（5 角色 + method-editor 响应 + scout `web_search` 工具调用）。
  - `client-load-smoke` 首跑前置红（`lib/client.js` 旧于 src）→ `packages/deep-research-pack`
    `pnpm build` 后重跑 **NOT-RUN**（主机 load 30.6 / free 118MB）；后以
    `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 强制实跑：配置页签/方法库/状态页大部分 PASS；
    **2 FAILURE** = 未绑定会话泄漏「已交付」、状态页正文出现 `assistant/message` 原始事件名
    （均不是本卡改动面；研究状态/未绑定会话，未修）；强制跑不能当清洁验收。
  - `snapshot-replay-smoke` 的 2 红已在上一节记录（C2 UI fixture + `paneRows` 脚本变量）；
    强制 client-load 证明「研究状态」页签本身可用，C2 是 fixture 配方问题。
  - `pnpm typecheck` 通过；`packages/deep-research-pack` `pnpm build` 后 `lib/client.js` 已刷新。
- **M4 历史阻塞（20:35 授权前）**：quick / landscape / regulatory 三场 pilot。当时主机 load 15–20 / free ≈61MB /
  swap 18.5GB used，`client-load-smoke` 已因主机不健康 NOT-RUN；不在这种主机上起三场真 run
  假装绿。等主机恢复或用户允许后，按 `running-a-research-run` 起 run 通道，先 quick 再
  landscape/regulatory。
- **run 通道检查**：3083 存活但镜像漂移 5 文件（`plan.md` / `lib/client.js` /
  `lib/method-library-tool.js` 等），`run-driver up` exit 2 **NOT-RUN**——当前页面不是当前
  代码；需停 3083 + 删 `profiles/deep-research` 重建。根目录有在飞/异常 bundle
  （`drt_cn-us-developer-population`、`drt_ds-vs-bailian-longctx`、`drt_wave-pilot*` 等无
  final/PASS），重建会中断在飞会话；未确认安全，**未动**。
- **历史阻塞（20:35 授权前）**：不是代码/门禁，是主机健康；M0–M3 的 keyless + L1 + L4-lite
  证据已绿，M4 需要一次健康主机/run 通道；client-load 已强制跑到 2 个非本卡 UI 红，仍欠一次
  干净主机验收。**20:35 授权后通道已重建 GREEN，M4 实测见下节。**
- **2026-11-11 第 3 轮检查**：load 13.4 / free ≈58MB / swap 18.4GB；3083 仍 401 存活但镜像
  漂移；在飞/异常 bundle = `drt_cn-us-developer-population`、`drt_ds-vs-bailian-longctx`、
  `drt_claim-pilot`、`drt_wave-pilot*`；重建通道会中断在飞会话，用户未授权重启 → M4 无法
  执行，目标按 blocked 收口（不是交付完成）。

### 2026-11-11 20:35 授权后 M4 实测（quick ×2）

- **通道重建**：按用户授权停 3083 + 删 `profiles/deep-research` → `run-driver up` **GREEN**（镜像一致、host mounted、右栏状态页、console 0）。
- **Pilot A `drt_deepseek-chat-context-limits`（quick）**：
  - HITL1 卡 3 问只含 type/depth/scope；**output/source 未上卡**——M2 gap 实测。
  - plan 策略行 `通道=spawn；worker=analyst/critic one-shot`；`protocol-audit` 先红
    `deviation-shape`（`authority` 写成自由文本）；改 bundle `authority=lead` 后 **PASS**。
  - review R1 **FAIL**（C1 数字口径 + M1 篇幅偏离）→ R2 **PASS**；`final/v1.md` 在场；
    `delivered.json` 缺（present 回执未落）。
- **修复**：`lead.patch.yml` HITL1 三问卡改为「深度与篇幅 + 输出形态」「时间口径与语言 + 来源
  范围」，quick 也照发；`research-brief` 加 source/output 例外；`render-overlay` 重生成；
  通道再重建 GREEN；L1 `preset-smoke` **ALL PASS**。
- **Pilot B `drt_anthropic-claude-api-limits`（quick）**：
  - HITL1 卡 Q2 = 「深度与篇幅 + 输出形态」（选项含 `quick_answer`）；Q3 = 「时间口径与语言 +
    来源范围」；澄清记录确认。
  - `protocol.json`：`source_scope.families=[official]`、`output.shape=quick_answer`；策略行
    `通道=spawn；worker=analyst×2 + critic×1`；`protocol-audit` **PASS**。
  - 收口：review R1 FAIL（C1/C2/M1/M2）→ 修稿 → R2 **PASS**；`final/v1.md` +
    `final/readable-v1.md` 在场；HITL2 代理答并写盘。
  - `protocol-audit` 先红 `deviations[0].dimension = source`（应为 `source_scope`）→ 改后
    **PASS**；运行完成。
- **quick 两场已交付**：Pilot A / B 均 `run-accept` **PASS**（node-gate 交付件齐、audit CRITICAL=0），
  `delivered.json` / `acceptance.md` 已写；Pilot A 的 evidence-audit 有 12 条 MAJOR（不阻塞
  node-gate，已如实记录）。
- **M4 quick 已覆盖（A + B）**；landscape / regulatory 两场待跑。

### 2026-11-11 M4 实测（landscape + regulatory）

- **Landscape `drt_llm-inference-cost-routes`**（team：scout×1 + analyst×2 + critic×1，6 顶层节点）：
  - HITL1 三问卡：Q2 =「深度与篇幅 + 输出形态」（含 `landscape_map`）、Q3 =「时间口径与语言 + 来源范围」（official+academic / 24m / zh+en）；计划确认卡 **195 字**（≤200）。
  - `protocol.json`：`source_scope.families=[official,academic]`、`output.shape=landscape_map`；plan `- 策略:` 行 `通道=team+spawn；worker=research-worker；预算=8/12/L1–L2`。
  - **M3 gate 抓到两类真红**：① `effort-contract`：topics 12 cells > 标准档 8（HITL1「标准档·领域地图」推荐项与实际四条路线 × 三 lens 的证据面不符）；② `strategy-budget-unparseable`：预算写成「6 节点 / 11 cells」时旧正则静默跳过（fail-open）。处置：协议 v2 修订（band=deep、cells_max 12、`protocol/v1.json` 快照、§Decisions 记账、approval_basis=revision）；gate 改 fail-loud + 宽容单位解析。
  - 交付：HITL2「定稿」代理；`review.md` 终局 **PASS**（覆盖表填满，claim 6/6 supported）；`protocol-audit` v2 **PASS**；`evidence-audit` **CRITICAL 0 / MAJOR 4**；`node-gate` A/C PASS；`verdict-audit` **RED**（claims/verdicts 形状偏离 D44：version=2、`supersedes_batches`/`final_batch` 等未知字段）→ `run-accept` 阻断（D44 既有层，不在本卡修）。
- **Regulatory `drt_eu-cn-gpai-obligations`**（双法域义务对比，deep 12 节点/12 cells，team）：
  - HITL1 三问卡：Q2 =「深度与篇幅 + 输出形态」（`full_report`）、Q3 =「时间口径与语言 + 来源范围」（official+regulatory / as-of-capture / zh+en）；计划确认卡 **190 字**；另发 Q4 归档安置（sibling 预检，非研究第四问）。
  - `protocol.json`：`families=[official,regulatory]`、`output.shape=full_report`、`effort.band=deep`；plan `- 策略:` 行 `通道=team；worker=research-worker；预算=12/12/L1–L3`。
  - 交付：HITL2「定稿」代理；终局 **PASS**（82 卡 A71/B11；claim 8/8）；`protocol-audit` **PASS**；`evidence-audit` **CRITICAL 2**（final 两处 `[来源: evidence/t2-eu-art54-representative.md]` 指向不存在的卡；实为 `t1-…` 笔误）+ MAJOR 8；`verdict-audit` RED（claims 形状 `claim_id`/`supports_topic`、顶层 `run`/`final`/`compiled_at`，偏离 D44）→ `run-accept` 阻断。
- **门禁加固（同卡 M3 收尾）**：`checkStrategy` 预算解析改 fail-loud（读不出 → `strategy-budget-unparseable` 红），并宽容模型常见单位写法（`≤4 节点 / ≤2 cells`、`nodes 12/cells 12`）；模板/`research-brief` 明确「预算是上限（从 protocol.json 抄），不是实际节点数」。红证：散文预算单例红 → 修复后绿；新增测试 2 例。四个 bundle 复核：quick A/B **PASS**、landscape/regulatory 协议收口后 **PASS**（0 误伤）。
- **M4 结论**：3 场 pilot 均跑完并记录；quick A/B `run-accept` PASS；landscape/regulatory 交付稿与 protocol-audit 绿，`run-accept` 仅被 D44 形状红（regulatory 另有一条引用笔误 CRITICAL）阻断——均为既有层/内容问题，已如实记录，不在本卡修。**待用户业务验收后写 Note / 登记 D 号 / 归档。**

### M4 配方（主机恢复后照此跑）

1. `node dev/run-driver.mjs up` → 呈交 URL；新会话，三题分别起 run：
   - quick：一个官方价目/状态单点，验 quick_factual 免第二卡 + typed source/output；
   - landscape：一个中小范围全景，验 team + research-worker + 反例面；
   - regulatory：一个双法域义务对比，验 deep + 回边 + strategy 行。
2. 每场记录：HITL1 卡原文与字数（≤200）、选项（type/depth/output/source）、`protocol.json`
   的 `source_scope`/`output.shape`、plan 的 `- 策略:` 行、`protocol-audit` 结果、journal。
3. 判据：卡 ≤200 且不新增第四问；source/output 与用户选择一致；策略行与 `strategyOf`
   一致；`protocol-audit` 无红（除已知 deviation）；无静默 gap。

## 关闭条件

- M0–M4 全绿；业务验收由用户签；Note 与 D 号同变更；卡 `可关闭：是` 并归档。
- 若 M2 的卡超 200 无法压：先回讨论「是否新增第四问」；不硬塞。
- 若 M1 投影在 3 个 bundle 上不可读：O1 缩到「只做 source/output 输入 + 投影门」，
  把 Strategy 投影降为 v2。
- 若 pilot 显示用户不改 source/output：不做 O2；O1 收口为「只修 UI + 只读投影」。

## 已知与未决

- 已知：Protocol 机器面只咬三个计数（材料 §4）；D47 worker/wave 已落；team G1 仍是政策。
- 已知：U1/U2/U3 是静态源码推断，M0 先起 GUI/测试复核；不把推断当已观测。
- 未决：M2 卡 200 字预算（source/output 短标签要实测）；M3 是否拆独立 `strategy-audit`；
  D 号编号。
- 触发条件：真 run 出现 critic 越界（ask/goal/present）→ O3 升级；库采用 ≥1 场 → O2 评估。
