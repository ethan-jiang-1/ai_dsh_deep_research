# Strategy 投影 + HITL1 typed 输入（O1）

> 状态：implemented
>
> 关联：[issue 卡](../../_backlog/_archived/settled_issues/2026-11-11-strategy-projection.md) · [D48](../../docs/decisions.md#d48) · [研究题](../../_backlog/_archived/research/strategy-abstraction/README.md) · [Protocol 层（D46）](2026-11-11-preference-protocol-layer.md)

## 决定

- 三层转换显式化：用户意图 → Protocol（canonical，D46）→ Strategy（派生 K/O/G/B）→ DSH 原语。Strategy 是**派生视图**，不新增 canonical 文件（不落 `strategy.json`）；出现独立审阅需求再讨论 canonical 化。
- `strategyOf({protocol, planText, topicsText})`（[`scripts/lib/strategy-core.mjs`](../../scripts/lib/strategy-core.mjs)）：K = method id/kind/source/output/lenses；O = channel（team/spawn/workflow）+ worker（research-worker/research-wave/角色）+ roles + topology（nodes/cells/waves/depths）+ replan（plan 版本 >1 = back-edge）；G = protocol.gates；B = nodes_max/cells_max/waves_max/allowed_depths。只读这三件 canonical 文件，不读会话/驾驶舱，不调模型。
- plan 头派生行 `- 策略: 通道=…；worker=…；门=…；预算=<nodes_max>/<cells_max>/<depths>`（预算 = protocol 上限，不是实际节点数；模板与 `research-brief` 明写）。`protocol-audit` 的 `checkStrategy` 对账通道枚举、worker profile（角色名视为显式选择）与预算 cap；**预算读不出 = `strategy-budget-unparseable` 红**（fail-loud），缺字段 = warning；通道缺席 = warning、声明 workflow 无 Wave 拓扑 = 红（[出席感知审计与深度编解码](2026-11-11-protocol-audit-presence-and-depth-codec.md)）。
- `protocol-audit` 增投影检查：`projection-number`（§Protocol 的节点/cells/depth 与 JSON）、`projection-source`（families）、`projection-output`（sections）、`strategy`（投影在场/合法）；随既有 protocol-audit 接 `run-accept` 第四道。
- HITL1 三问扩成 typed：Q2 = 深度与篇幅 + output shape（quick_answer/full_report/one_page_memo/comparison_table/timeline/landscape_map）；Q3 = 时间口径与语言 + source families（official/academic/regulatory/practitioner/web/local）+ authority/recency。**不新增第四问**；卡仍 5 维 ≤200 字；`research-brief` 明写「题面暗示也发选项让用户点一次」。
- M0 前置：run 前「选方法（发给 Lead）」入口（U1）；库多行压单行保真（`flattenSectionValue`）+ 编辑态名称只读、改名 = 另存（U3）。

## 输掉的方案

- **O0（只测量）**：0/63 采用与投影漂移是真问题，但只记账不解决转换。
- **O2（策略优先 UI / 命名策略目录）**：先证明用户会用 source/output/effort，再决定是否把库变成策略目录；过早做会把「偏好越多越伤事实」做成现实。
- **O3（Package C / spawn-first）**：D47 已落 worker/wave；team 主通道角色边界仍是政策，证据是潜伏不是已发生；真 run 出现 critic 越界才升级。
- **`strategy.json` canonical**：pilot 证明 K/O/G/B 可从 protocol/plan/topics 拼出，gate 只需对账；v1 不落第二份真相。
- **新增第四问**：卡 ≤200 字预算装不下；折进现有三问，source/output 用短标签。
- **独立 `strategy-audit`**：M3 增量约 30 行，留在 protocol-audit；超 150 行再拆。
- **预算自由文本**：pilot 实测「6 节点 / 11 cells」被旧正则静默跳过（fail-open）→ 改 fail-loud；宽容模型常见单位写法后仍对账 cap。

## 实际跑过的验证

- **L0**：`pnpm verify` 全绿；`pnpm test` **1178 pass / 0 fail**；`pnpm typecheck` 通过（M0–M3 记录）。
- **M1**：`tests/run/strategy-core.test.mjs` 6 例（null / quick spawn / team / back-edge / wave / lenses）；红证 = `channelOf` 永远返回 `spawn` → Team 例红，恢复绿。
- **M3**：`tests/run/protocol-core.test.mjs` 24 例 + 预算 2 例（带单位散文对账、读不出必红）；红证 = 翻转 nodes 比较 → 单例红；删 `checkStrategy` 调用 → strategy 例红；散文预算旧实现绿 / 新实现红。四个真实 bundle 复核：quick A/B PASS；landscape/regulatory 协议收口后 PASS（0 误伤）。
- **M0**：`tests/cockpit/library-fold.test.mjs` 多行 round-trip（红证 = 回退 `value.trim()` → 红）；`tests/cockpit/method-library-views.test.mjs` 编辑态名称 readonly（红证 = 删 `readOnly` → 红）；`tests/cockpit/research-config-source.test.mjs` 钉 run 前入口（红证 = 改回死文案 → 红）。GUI：`client-load-smoke` 强制档 **ALL PASS**（主机 free < 512MB 自拒，用 `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1` 实跑；非清洁档）。
- **M2**：`tests/pack/research-brief-contract.test.mjs` 2 例；`tests/pack/content-coverage.test.mjs` 排除 `*_map` 近形扫描（红证实跑）；L1 `preset-smoke` ALL PASS（5 角色 + 2 worker）；L4-lite ALL PASS（5 角色 + method-editor + scout 工具调用）。
- **M4 pilot（3 场，dev 通道；HITL 均为操作侧代理模拟并逐条记入 bundle §Decisions/journal）**：
  - quick A `drt_deepseek-chat-context-limits`：HITL1 卡 output/source 未上卡（M2 gap 实测）；修 persona 后 quick B 上卡。`protocol-audit` deviation-shape → 修 authority → PASS；`run-accept` PASS。
  - quick B `drt_anthropic-claude-api-limits`：HITL1 Q2/Q3 typed（`quick_answer` / official）；`protocol-audit` PASS；`run-accept` PASS。
  - landscape `drt_llm-inference-cost-routes`：HITL1 typed（`landscape_map` / official+academic / 24m）；计划确认卡 195 字；`protocol-audit` 抓到真红 `effort-contract`（12 cells > 标准档 8）与 `strategy-budget-unparseable` → 协议 v2 修订（deep / cells 12 / `protocol/v1.json` 快照 / §Decisions），`protocol-audit` v2 PASS；`evidence-audit` CRITICAL 0 / MAJOR 4；`node-gate` A/C PASS；`verdict-audit` RED（D44 claims/verdicts 形状：version=2、未知字段）→ `run-accept` 阻断（既有层，不在本卡修）。
  - regulatory `drt_eu-cn-gpai-obligations`：HITL1 typed（`full_report` / official+regulatory / as-of-capture）；计划确认卡 190 字；deep 12/12；plan `- 策略:` 行 team/research-worker/12/12；`protocol-audit` PASS；`evidence-audit` CRITICAL 2（final 两处 `t2-eu-art54-representative.md` 笔误，实为 `t1-…`）+ MAJOR 8；`verdict-audit` RED（claims 形状 `claim_id`/`supports_topic`、顶层非契约）→ `run-accept` 阻断。
- **审查**：机械门禁全跑；语义自审按 `reviewing-a-delivery` 走查（意图对齐、docs 同 diff、断言反证、四分离、Note 触发）；用户 2026-11-11 签收「按落地流程推进并归档」。

## 残余风险

- **HITL1 的 band 推荐与证据面可能不符**：landscape 实测「标准档」推荐下规划了 12 cells（标准档上限 8），靠 `effort-contract` 抓红后 v2 修订。推荐项的 cells 预算未上卡（卡只写 ≤N 节点），后续是否把 cells 写进卡/推荐算法另案。
- **D44 claims/verdicts 形状仍不稳**：两场 deep pilot 都因 claims/verdicts 未知字段/形状偏离被 `verdict-audit` 阻断（D46 已记的残余）；本卡不改，deep pilot 的 `run-accept` 不绿如实记录。
- **regulatory 交付稿有 1 条引用笔误**（`t2-…` 应为 `t1-…`），被 `evidence-audit` 抓到但未在交付后改稿；属报告内容问题，不在本卡修。
- **策略行仍由模型手写**：gate 对账 prose，worker 角色名自由文本只做存在性判断；`strategyOf` 的 channel 推断依赖 plan 文本关键词，策略行缺失时退化为关键词推断（warning 而非硬拦）。
- **StartCard 文案**（`startStep1`）仍写三问短名，未点出 output/source；非阻塞。
- **3 场 pilot 均为 dev 通道 + 代理 HITL**，用户面行为（真人点卡）未由真用户走一遍。
