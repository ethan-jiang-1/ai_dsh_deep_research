---
topic: 偏好层的数据结构：Brief / Protocol / Plan / Record / Library
intent: 把「搜索倾向 / 研究偏好」收束成一个可解析、可审、可扩的数据模型；先定底层对象、字段、引用、不变量与扩展点，再谈落卡与实现。设计提案，不是已落地合同。
---

# 偏好层的数据结构（2026-11-10）

> 性质：设计提案 + 数据模型；不是决定，未落地。外部证据只用于验证「这个维度真实存在」，不进入命名或 schema。
> **2026-11-11 收口**：v1 范围与六项结构选择的结论见 [核验与收口](2026-11-11-preference-protocol-verification.md)；本材料保留提案原文，不逐条改写（lens_plan / plan cell 列 / Library 版本 / Brief 对象 / style 已出 v1，output 改 `shape` 闭集）。
> 范围：一次研究 run 的偏好与搜索配置层；不含角色 persona、run 执行细节、报告内容质量。
> 上游：[external-landscape 第三遍](../external-landscape/2026-11-10-landscape-preference-layer.md)；本仓现状 = [共享上下文](../README.md) §5、D43 / D25 / D37。
> **结论先行**：缺的不是更多字段，而是一个「解析后的研究设计」对象（Protocol）。搜索倾向 = 一份命名 Protocol 模板；偏好 = 本次 run 对 Brief/Protocol 的覆盖；执行 = Plan；证据 = Record；新倾向 = 新 catalog/library 条目，不是新字段或新代码。

## 0. 一句话

**核心 schema 稳定，边缘靠 catalog 生长。** Protocol 是唯一「解析后的设计」；Brief 是输入；Plan 是执行；Record 是事实；Library/Catalog 是默认值与零件。同一维度只在它的那一层有一个家。

## 1. 现状：六个家，没有一个「解析结果」

| 现有载体 | 住哪 | 它实际回答什么 | 问题 |
|---|---|---|---|
| question.md 的 Purpose / RQ / Scope / Constraints | run 根 | 为什么研究、范围、口径 | 是 Brief 的影子，但没有 audience / deliverable / source posture 的 typed 字段 |
| question.md §研究方法（采用 / 来源 / 本次视角 / 调查要求 / 不承诺） | run 根 | 方法 + 来源 + 视角 + 报告写法 | 四类东西混在一节；"采用" 常被写成复合方法（本地 20 个方法行里 5 个复合） |
| topics.md 的 `lenses:` | run 根 | per-topic 的证据面 | 与 question.md §本次视角、plan 节点、evidence 卡各有一份，谁是权威不清 |
| plan.md 的 `depth` / `budget` | run 根 | 每个节点多少工 | 与 HITL1 的全局深度、Protocol 的 effort 合同没有 typed 映射 |
| method-library.md | 工作区 | 用户保存的方法 | 只有四字段；无版本/provenance；本地 58 个 bundle 中 0 个「采用库条目」（弱证据） |
| presets / skills / content | pack | 出厂默认（方法、lens、模板） | 与 run 级选择没有「默认 vs 覆盖」的显式记录 |

**读法**：同一维度在多个文件出现，且没有「谁是权威」的规则；Lead 用散文消解冲突。这不是文案问题，是缺一个解析结果对象。

## 2. 目标与原则

三个能力：

1. **适配不同搜索倾向**：官方口径核查 / 学术综述 / 一线实践全景 / 监管对比 / 时间线——同一套引擎，不同 Protocol。
2. **可审**：用户批准的是设计，不是摘要；critic 能对照设计审执行；门禁能对照设计查证据。
3. **可扩**：新 lens / source family / method / output template / effort band 只加 catalog 条目，不改 Protocol schema。

四条原则：

- **每层一个家**：Brief 输入、Protocol 解析、Plan 执行、Record 事实、Library/Catalog 默认。
- **typed core + prose edges**：能机检的 typed；判断留 prose，并标 authority / why。
- **catalog + 引用**：Protocol 主要存 id + version，不复制 catalog 正文；catalog 变了不等于 run 变了。
- **version + hash**：批准的设计不可静默变；计划/记录引用同一 hash。

## 3. 实体与关系

| 实体 | 回答什么 | 谁拥有 | 寿命 | 关系 |
|---|---|---|---|---|
| **Brief** | 为什么研究、给谁、要什么形态、边界 | 用户 | per-run，版本化 | 1 → 1 Protocol（每个 Brief 版本解析出一版 Protocol） |
| **Protocol** | 这次研究**怎么做**（方法/来源/lens/投入/输出/门） | 系统解析 + 用户批准 | per-run，v1/v2… | 1 → N Cell；1 → 1 Plan；被 Record 引用 |
| **Plan** | 谁在什么时候做什么（可执行 DAG） | Lead | per-run，图版本 | N Node；每个 Node 引用一个 Cell 或 synthesis/review/gate |
| **Record** | 实际做了什么、证据在哪 | append-only | per-run | N Evidence；1 Review；1 Final；1 Journal |
| **Library** | 以后都这样（方法/协议/倾向） | 用户 | 跨 run，版本化 | N Entry；Entry 被 run 钉版本引用 |
| **Catalog** | 可枚举的「零件」 | 出厂 / 内容包 | 跨 run，版本化 | lens / source / method / output / effort / gate |

关系规则：

- Brief 与 Protocol 是 **1:1 per version**；Protocol 的 `brief_ref` 指向具体 Brief 版本 + hash。
- Protocol 与 Plan 是 **1:1 per approved version**；Plan 的 `protocol_ref` 指向协议版本 + hash。
- Protocol 与 Cell 是 1:N；Cell 是覆盖单位，不是执行单位。
- Plan 与 Node 是 1:N；Node 是执行单位，必须引用 Cell 或属于 synthesis/review/gate。
- Record 引用 Protocol 版本 + hash；证据卡带 `cell_ref`。
- Library 条目被 run 钉版本引用；run 中不跟随库的后续修改。

## 4. 分层数据表：同一维度只在一层有家

| 维度 | 用户层（Brief） | 解析层（Protocol） | 执行/事实层（Plan/Record） | 默认/零件层（Catalog/Library） |
|---|---|---|---|---|
| 方法 | `method_hint` | `method`（钉 id + version） | — | method preset / library entry |
| 证据面 | `lens_hint` | `lens_plan` | topics 的投影 + evidence 的 `lens` 事实 | lens catalog |
| 来源 | `source_posture`（偏好） | `source_scope`（解析结果） | evidence 的 `source_url` / `source_tier` 事实 | source catalog / method.source |
| 深度 | `effort`（档） | `effort_contract`（数字合同） | node 的 `depth` / `budget` | effort catalog / method 建议 |
| 输出 | `deliverable`（形态） | `output_contract`（模板/篇幅/格式/读者） | final 产物 | output template catalog / method.report |
| 门 | `hard_constraints` | `gates` | HITL1/HITL2 + review | gate policy preset |

**关键修正：`cell` 与 `node` 拆开。**

- `cell = {topic, lens}` —— 覆盖单位；覆盖表、cells 上限、lens 配对都按它算。
- `node = {cell, depth, ...}` —— 执行单位；同一 cell 可以因深度不同而有不同节点，但覆盖计数不变。

现有共享上下文写「cell = topic × lens × depth」。这会把「同一覆盖换深度」变成新 cell，覆盖计数失真；本材料提议改成上面的拆法，**未改共享上下文**，等 §11 第 1 项拍板。

## 5. 数据字典

### 5.1 枚举（catalog 的可枚举值）

```yaml
EffortBand: [quick, standard, deep]
Depth: [L0, L1, L2, L3]
LensAxis: [source, stance, temporal, structural]
SourceFamily: [web, official, academic, regulatory, work_docs, database, news, social, custom]
OutputTemplate: [quick_answer, full_report, one_page_memo, comparison_table, timeline, literature_review]
Format: [md, pdf, docx, pptx, html]
GateHITL1: [protocol_projection, none]
GateHITL2: [review, none]
EvidenceThreshold: [A, B, C]
CriticMode: [report, claim, both, none]
```

说明：`LensAxis` 是 catalog 元数据，不是 lens 文件的新字段；`source` 轴 = 来源域/证据类型，`stance` 轴 = 分析立场，`temporal` = 时间，`structural` = 结构。它只用于默认集配平与配对解释。

### 5.2 Brief（用户层）

| 字段 | 类型 | 必需 | 语义 |
|---|---|---|---|
| `version` | int | 是 | Brief 版本；每次 HITL1 定稿/修订递增 |
| `decision` | string | 是 | 为谁的什么决策 |
| `audience` | string | 否 | 读者与专业度；缺省「未指定」 |
| `deliverable.template` | OutputTemplate | 是 | 交付形态；默认 `full_report` |
| `deliverable.length` | `{min,max,unit}` | 否 | 字数/页数 band；缺省由 template 决定 |
| `deliverable.format` | Format | 否 | 默认 `md` |
| `deliverable.deadline` | date\|null | 否 | 期限 |
| `scope.question` | string | 是 | 定稿问题 |
| `scope.in` / `scope.out` | string[] | 否 | 覆盖 / 排除；out 每条带理由 |
| `scope.time_window` | `{from,to}`\|null | 否 | 时间窗 |
| `scope.geography` | string[] | 否 | 地域 |
| `scope.language` | string[] | 否 | 语言 |
| `source_posture.families` | SourceFamily[] | 否 | 偏好来源面（不是解析结果） |
| `source_posture.recency` | duration\|null | 否 | 时效 |
| `source_posture.authority` | `primary\|secondary\|any` | 否 | 权威度偏好 |
| `source_posture.exclusions` | string[] | 否 | 排除域/类型 |
| `effort` | EffortBand | 是 | 投入档 |
| `must_answer` | string[] | 是 | 必答 |
| `must_avoid` | string[] | 否 | 不承诺/不碰 |
| `method_hint` | `{id,version}`\|null | 否 | 点名方法；缺省由 resolver 选 |
| `lens_hint` | `{id,version}[]` | 否 | 点名证据面；缺省由题型/方法默认 |
| `hard_constraints` | string[] | 否 | 用户硬控制；覆盖一切默认 |

Brief 的物理落点：`question.md §Brief`（v1 一节；以后可拆 `brief.md`）。HITL1 第一段三问只填其中 3–5 个字段，其余由默认/解析补。

### 5.3 Protocol（解析层，核心）

```yaml
protocol:
  version: 1
  schema: 1
  brief_ref: {version: 1, hash: "sha256:..."}
  status: draft | approved | superseded
  method:
    id: 方案比较
    source: preset | library
    version: 1
    fields: {source: "...", verify: "...", report: "...", limit: "..."}
    adjustments: ["..."]
  source_scope:
    families: [official, web]
    domains: ["aws.amazon.com", "azure.microsoft.com", "cloud.google.com"]
    exclude_domains: []
    recency: "12m"        # 或 null
    language: [zh, en]
    authority: primary    # primary | secondary | any
  lens_plan:
    - topic: T1
      lenses:
        - {id: quant, version: 1, axis: source}
        - {id: practitioner, version: 1, axis: stance}
      coverage: [pricing, capacity, sla]
      pairs: [[quant, adversarial]]
      gap_policy: must_close | allowed_with_reason
      rationale: "价格与容量是决策关键"
  effort:
    band: standard
    nodes_max: 12
    cells_max: 8
    waves_max: 2
    calls_max: 24
    time_estimate: "20-30m"
    quota_estimate: "1x"
    allowed_depths: [L0, L1, L2]
  output:
    template: comparison
    sections: [decision, options, criteria, tradeoffs, risks]
    length: {min: 1200, max: 1600, unit: words}
    format: md
    audience: CTO
    reader_version: true
  gates:
    hitl1: protocol_projection
    hitl2: review
    evidence_threshold: B
    critic: both
    claim_verification: on
  deviations:
    - {dimension: lens_plan, from: "type default", to: "quant+practitioner", why: "价格/容量优先", authority: user}
  created: "2026-11-10T18:00:00+08:00"
  approved_at: null
  hash: "sha256:..."     # 计算值，不手写
```

字段说明：

- `method` 是**钉版本的引用 + 解析后的四字段副本**；catalog 里的方法后续改了，不影响已批准的 Protocol。
- `source_scope` 是解析后的来源合同；`families` 是枚举并集，`domains/recency/language/authority` 按 §7 的优先级解析。
- `lens_plan` 是 per-topic 的覆盖计划；`lenses[].axis` 是 catalog 元数据投影，用于配平与解释。
- `effort` 是数字合同；`allowed_depths` 是 band 允许的节点深度，Plan 的 `node.depth` 必须落在其中。
- `output` 是输出合同；`sections` 可与 template 默认不同，但必须显式列出。
- `gates` 是本次 run 的门策略；默认由题型/出厂 policy 决定，不作为用户偏好开放（避免把批准门关掉）。
- `deviations` 记录「解析值 ≠ 默认值」的每一处；`authority` = user / library / method / type_default / system。
- `hash` 是 Protocol 的 canonical JSON 哈希；Plan/Record 引用它，防止静默变更。

### 5.4 Plan（执行层）

| 字段 | 类型 | 语义 |
|---|---|---|
| `graph_version` | int | 图版本；每次重写递增 |
| `protocol_ref` | `{version, hash}` | 引用已批准的 Protocol |
| `nodes[].id` | string | `W<wave>.<index>` |
| `nodes[].cell` | `{topic,lens}`\|null | 覆盖单位；synthesis/review/gate 为 null |
| `nodes[].depth` | Depth | 必须在 `effort.allowed_depths` 内 |
| `nodes[].kind` | enum | broad-scan / deep-dive / cross-check / synthesis / review / gate / search / fetch |
| `nodes[].owner_role` | enum | lead / scout / analyst / critic |
| `nodes[].deps` | string[] | 节点 id；无环 |
| `nodes[].output` | path | bundle 相对路径 |
| `nodes[].acceptance` | string | 可判条件 |
| `nodes[].budget` | `{calls_max,children_max,rounds_max}` | 节点预算 |
| `nodes[].task_id` | string\|null | 当前会话映射；可空但需显式 `plan-only` |

规则：每个 Cell 至少一个 Node；每个 Node 映射 Cell 或属于 synthesis/review/gate；节点总数/波次/calls ≤ Protocol 合同；Plan 重写不改变 Protocol（除非协议级变更）。

### 5.5 Record（事实层）

- **Evidence**：现有八字段不动；`cell_ref = {supports, lens}` 由现有字段推导（不加新字段）；`protocol_version` 在 plan/review 头部，不逐卡重复。
- **Review**：`protocol_version` + `coverage[]`（`cell_ref` / `status: covered|gap|na` / `evidence[]` / `reason`）+ `verdicts[]` + `readiness`。
- **Final**：`protocol_version` + `output`（template/sections/length/format/audience）+ `citations[]`。
- **Journal**：`protocol_versions[]` + `deviations[]` + `decisions[]`。

规则：每个 Cell 有证据或显式 gap；每个 lens 有覆盖或接受的盲区；final 符合输出合同；Record 引用的 Protocol hash 与当前批准版一致。

### 5.6 Library（默认层）

```yaml
library_entry:
  name: "投研尽调"
  kind: method | protocol
  version: 1
  provenance: {created: "2026-10-12", source_run: "drt_xxx", author: "user"}
  default: false
  method: {source: "...", verify: "...", report: "...", limit: "..."}
  # kind=protocol 时：brief_template + protocol_template（v2 再做）
```

v1 只存方法（四字段）+ 版本/provenance；v2 再存「命名 Protocol 模板」（= 搜索倾向）。run 时钉版本，库后续修改不影响已跑的 run。

## 6. 不变量（都能做成 gates）

| # | 不变量 | 检查 |
|---|---|---|
| 1 | 所有引用存在：lens / source family / method / template / 版本 | `protocol-schema` |
| 2 | Brief 版本与 Protocol 的 `brief_ref` 一致 | `brief-ref` |
| 3 | Protocol `approved` 之后才有 Plan | `protocol-status` |
| 4 | cells / nodes / waves / calls ≤ 合同上限 | `effort-contract` |
| 5 | 每个 node 的 `depth` ∈ `allowed_depths` | `depth-band` |
| 6 | 每个 cell 至少一个 node；每个 node 映射 cell 或 synthesis/review/gate | `plan-cells` |
| 7 | 每个 cell 有 evidence 或显式 gap；每个 lens 有覆盖或接受盲区 | `coverage` |
| 8 | final 的 sections / length / format 符合 `output_contract` | `output-contract` |
| 9 | Plan/Record 引用的 Protocol hash 与当前批准版一致 | `protocol-hash` |
| 10 | `lens.seek` 与 `source_scope` 一致；冲突有 deviation | `source-consistency` |
| 11 | Library 条目被钉版本，run 中不漂移 | `library-pin` |

这些不是「再加门」，而是把现在靠散文保证的东西变成**数据一致性**。

## 7. 解析与优先级

### 7.1 Brief → Protocol

- **method**：Brief `method_hint` > Library 默认 > 题型 resolver > 出厂默认。
- **source_scope**：硬约束 > Brief `source_posture` > method.source > lens.seek 默认；families 取并集，domains/recency/language 按上述顺序覆盖；lens 需要的 family 不在 scope → 加进去或记 deviation/gap。
- **lens_plan**：Brief `lens_hint` > 题型默认集 > 方法建议；每个证据 topic 至少一个 `source` 轴 + 一个 `stance` 轴；lens 数 ≤4；cells ≤ `cells_max`。
- **effort**：Brief `effort` → band 合同；用户显式预算在 band 内覆盖；要超出 band → Protocol v2 + 换 band。
- **output**：Brief `deliverable` > method.report > template 默认；冲突时用户赢，记 deviation。
- **gates**：出厂 policy + 题型；不作为用户偏好开放。

### 7.2 覆盖顺序（按维度，不按一条线）

| 维度 | 低 → 高 |
|---|---|
| 报告骨架 / run 级承诺 | lens < method < user |
| cell 内证据面 | method < lens < user |
| 来源范围 | method.source < lens.seek < protocol.source_scope < user 硬约束 |
| 深度 | method 建议 < protocol.effort_contract < user |
| 输出 | template 默认 < method.report < protocol.output_contract < user |
| 保存的默认 | library < 题面点名 < 用户本次指令 |

**按维度覆盖**是这套模型和「用户 > 方法 > lens 一条线」的关键差别：lens 在报告骨架上不能压方法，但在自己 cell 的证据面上应压方法的泛化来源策略。共享上下文 §5 仍写线性顺序；本材料提议按维度，**未改共享上下文**，等第 11 节拍板。

### 7.3 Protocol → Plan

- Cell 集合 → 节点集合；每个 Cell 至少一个节点；synthesis/review/gate 是额外节点。
- `node.depth ∈ protocol.effort.allowed_depths`；节点/波次/calls 总数 ≤ 合同。
- Plan 重写（加/删/改边/改 owner）不改变 Protocol；若改到方法/lens/来源/输出/effort → Protocol v2，记录 deviation；scope/输出/来源级变更回 HITL。

### 7.4 Protocol → Record

- Evidence 的 `cell_ref` 必须对应 Protocol 的 cell；`lens` 必须对应 `lens_plan`。
- Review 的 coverage 按 cell 逐格；`gap` 必须带原因/渠道。
- Final 的 output 必须符合 `output_contract`；reader version 与主稿同版。
- Journal 记录 Protocol 版本、deviation、HITL 拍板。

## 8. 搜索倾向 = 命名 Protocol

**倾向不是新代码，是一份命名 Protocol 模板。** 示例：

| 倾向 | method | source_scope | lens_plan | effort | output |
|---|---|---|---|---|---|
| 官方口径核查 | 事实核查 | official, recency 6m, primary | official + adversarial | quick | quick_answer |
| 学术综述 | 领域地图 / 主张核查 | academic, primary | academic + adversarial | deep | literature_review |
| 一线实践全景 | 领域地图 | web + work_docs | practitioner + structural | standard | full_report |
| 监管对比 | 方案比较 | regulatory + official | regulatory + adversarial | deep | comparison_table |
| 事态时间线 | 时间线与信号 | official + news, recency 3m | historical + official | standard | timeline |

```yaml
tendency:
  name: 官方口径核查
  method: 事实核查
  source_scope: {families: [official], recency: "6m", language: [zh, en], authority: primary}
  lens_plan:
    - {topic: "*", lenses: [official, adversarial], coverage: [status, price, effective_date]}
  effort: quick
  output: {template: quick_answer, length: {min: 300, max: 600, unit: words}}
```

- 用户选一个 tendency，系统把它复制进 Protocol，再用 Brief 覆盖。
- 新 tendency = 新 Library 条目；**不改 Protocol schema，不改代码**。
- 新 lens = lens catalog 条目（带 `axis`）；新 source family = source catalog 加值；新模板 = template catalog 条目；新 method = method/library 条目。

> 第四遍补：tendency 还缺 **acceptance**。不是所有新 tendency 都能「只加条目」——如果它带来新的 warrant
> （例如 claim-level fact-check、法域矩阵），就需要一个 acceptance profile / gate；如果只是换
> method/source/lens/output 的组合，才是纯数据。见 [第四遍 §8](../external-landscape/2026-11-10-landscape-style-space.md#8-对偏好层数据模型的含义)。

### 8.1 纸面跑三个倾向（验证 schema 够不够）

| 倾向 | Brief（用户层） | Protocol（解析层） | Plan（执行层，示意） |
|---|---|---|---|
| 官方口径核查 | decision=采购前核价；audience=采购；deliverable=quick_answer；source_posture=official/6m/primary；effort=quick | method=事实核查；source_scope={official, 6m, primary}；lens_plan={official+adversarial}；effort={nodes_max:4, cells_max:2, calls_max:8, allowed_depths:[L0]}; output=quick_answer | cells=2；nodes=3（scan ×1、dive ×1、check ×1） |
| 学术综述 | decision=研究立项；audience=研究者；deliverable=literature_review；source_posture=academic/primary；effort=deep | method=领域地图；source_scope={academic, 5y, primary}；lens_plan={academic+adversarial}；effort={nodes_max:16, cells_max:10, allowed_depths:[L1,L2,L3]}; output=literature_review | cells=6–8；nodes=12–16（scan/dive/check/synthesis/review） |
| 监管对比 | decision=合规选型；audience=合规/法务；deliverable=comparison_table；source_posture=regulatory+official；effort=deep | method=方案比较；source_scope={regulatory, official, 18m, primary}；lens_plan={regulatory+adversarial+quant}；effort={nodes_max:14, cells_max:9, allowed_depths:[L1,L2]}; output=comparison_table | cells=6–9；nodes=10–14（每法域 dive + cross-check + synthesis） |

跑下来的观察：

- **schema 够用**：三个倾向都能落到同一组字段；差异只在 method/source/lens/effort/output 的取值。
- **两个需要补的细节**：① `source_scope.authority` 对不同 family 可能要分档（official 默认 primary，practitioner 允许 tertiary）；② `comparison_table` 模板需要「每个法域/选项一行」的 sections 约定，否则模板只是名字。两者都是 catalog/模板层的事，不改 Protocol schema。

## 9. 与现有文件的映射

| 数据 | 现在住哪 | 建议落点 | 备注 |
|---|---|---|---|
| Brief | `question.md` Purpose/RQ/Scope/Constraints | `question.md §Brief` | v1 一节；HITL1 三问只填部分 |
| Protocol | 散在 §研究方法 / §本次视角 / depth / 模板 | `question.md §Protocol`（v1）或 `protocol.md` | HITL1 卡是它的投影 |
| Plan | `plan.md` | `plan.md` + `protocol_ref` | 节点补 `cell` / `depth` 校验 |
| Record | `evidence/` `review.md` `final/` `journal.md` | 同左 + `cell_ref` / `protocol_version` | 现有八字段保留 |
| Library | `method-library.md` | 同左 + version/provenance | v1 只存方法 |
| Catalog | `content/lenses/`、`content/templates/run/`、`question-patterns`、`research-brief` | 同左 | 只加条目，不改 schema |

HITL1 的 200 字卡 → **Protocol 5 行投影**（方法 / lens / 来源 / 投入 / 输出），每行可「改这一行」；比散文摘要更有信息量，也仍然一眼能看完。

## 10. 迁移路径（增量，不搞大重构）

- **M0（本轮）**：数据模型 + 六个结构选择拍板；不改代码。
- **M1**：`question.md` 加 `## Protocol`（只读解析结果）；HITL1 卡改为 5 行投影；不破坏现有字段。
- **M2**：把 lens_plan / source_scope / effort / output 从散落字段迁进 Protocol；topics/plan 只引用；加 §6 的一致性门。
- **M3**：Library 加 version/provenance；v2 再谈「保存整份 Protocol（倾向）」。
- **M4**：输出模板/长度机检；计划卡可编辑（结构化 patch）。

每一 M 可独立交付；M1 之前不需要动 pack 公共行为。

## 11. 未决的结构选择（需要拍板）

| # | 选择 | 推荐 | 理由 |
|---|---|---|---|
| 1 | **cell 定义** | `topic × lens` | 覆盖单位与执行单位分离；深度变化不污染覆盖 |
| 2 | **Protocol 住哪** | v1 = `protocol.json` + `question.md` 5 行投影（how 材料重估；`question.md-only` 为备选） | JSON 适合嵌套；gate/cockpit 易读；投影可机检 |
| 3 | **Library v1** | 只存方法（四字段） | 本地 0/58 采用；先证需求，协议库 v2 |
| 4 | **source scope 放哪** | Brief 写「姿态」，Protocol 写解析结果 | 用户说偏好，系统说合同；证据卡记事实 |
| 5 | **中途改 Protocol 的阈值** | method/lens = Protocol v2 + journal；scope/输出/来源 = 回 HITL | 设计微调不打断；范围/交付变更要人 |
| 6 | **gates 归属** | 出厂 policy + 题型 | 批准门不能被「偏好」关掉 |

**候选第 7 项（第四遍提议，未拍板）**：style 归 Library/Catalog，Protocol 只存 `style_ref` + 解析值；
验收 profile 由出厂 policy 选，用户不能关。理由/代价见
[external-landscape 第四遍](../external-landscape/2026-11-10-landscape-style-space.md) §8.8；它不改上面六项，
只补「style 自带验收」这层。

## 12. 什么会改变这个设计

- **用户拒绝新增 Protocol 对象**：退化为 `question.md` 的一节 + 5 行投影；数据字段不变，只是不独立成文件。
- **method/lens 中途频繁变**：Protocol v2 可能太重；考虑 Plan 级 override + deviation，而不是每次升协议。
- **Library 采用仍为 0**：v2「协议库」不立项；只保留方法库 + 版本元数据。
- **HITL1 用户不看 Protocol**：投影缩到 3 行（方法 / 来源 / 输出），细节留在文件。
- **输出合同机检误伤多**：先做 warning，不做 hard fail；证据是 Mr-Dre 的 21% 破坏率，不是「必须全机检」。
- **外部出现用户可选视角并证明收益**：lens_plan 的「覆盖」定位需要重估；但在那之前不改成「立场选择」。

## 13. 来源

- 外部维度验证：[external-landscape 第三遍](../external-landscape/2026-11-10-landscape-preference-layer.md)（11 产品 + 8 开源 + 2026 澄清/个性化证据；产品名不进入本 schema）。
- 本仓现状：`packages/deep-research-pack/content/manual.md` §研究视角 / §证据契约 / §交互纪律；
  `presets/lead/skills/research-brief/SKILL.md`；`presets/lead/skills/research-planning/SKILL.md`；
  `content/templates/run/{question,topics,plan}.md`；`research-workspace/method-library.md`；
  `docs/decisions.md` D43 / D25 / D37。
- 共享口径：[research/README](../README.md) §5（cell/lens/verdict/两轴等）；本材料对 `cell` 的拆法是**提议**，未改共享上下文。
