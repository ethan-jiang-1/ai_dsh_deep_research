---
status: 已结
opened: 2026-11-11
---

# 推敲：偏好层落成 Protocol（研究设计）数据层 + 表达层

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [Note](../../../notes/implemented/2026-11-11-preference-protocol-layer.md)；公共行为 + D 号登记 = **D46**
>
> **关闭**：2026-11-11 ｜ 审查：机械门禁全绿（verify/test/L1/L4-lite/snapshot/smoke）+ 语义自审；用户选择 A：接受 Protocol 层残余（D44 claim 层另案）｜ 去向：implemented Note + D46。
>
> **研究依据**：[preference-layer 题名页](../research/preference-layer/README.md) → [v1 核验与收口](../research/preference-layer/2026-11-11-preference-protocol-verification.md)
> （盘上 63 个 bundle 的实测、结构选择收口、v1 合同、三个倾向纸面跑）；设计底稿 = [数据模型](../research/preference-layer/2026-11-10-preference-protocol-data-model.md) / [怎么落](../research/preference-layer/2026-11-10-preference-protocol-how.md)；
> **表达层补篇** = [卡/派发/review/HITL2/final 的缺口与 v1 表达合同](../research/preference-layer/2026-11-11-preference-protocol-expression.md)。
>
> **开工授权**：本卡触及 pack 公共行为（HITL1 卡、question/plan 模板、run-accept、模型可见 skill/persona），
> D46 登记与业务验收归用户。技术项按用户 2026-11-11 指示取推荐值、不逐项拍板；M1–M2（keyless）自主，
> M3（模型可见面）为阶段边界请人。
>
> **卡边界（2026-11-11 定）**：**不新开 issue**——表达层与数据层共用同一 `protocol.json`、同一 gate、
> 同一 3 场 pilot、同一 D46；拆开会造两张必须同时收口的卡。**既有表达面之外不加新视觉面**：驾驶舱/新页签/
> 新交互一律不做，`projectionOf()` 留作以后适配的唯一缝（用户 2026-11-11 定调：数据层柔韧度够即可，
> 视觉表达有多少支持多少，以后有机增长再适配）。

**问题与期望结果：** 现在一次 run 的偏好/搜索配置散在 `question.md §研究方法`、HITL1 Snapshot、
`topics.md lenses:`、`plan.md depth`、`method-library.md` 五处；除深度外多数只以散文存在——
63 个 bundle 里 22 个有 `- 采用:`、3 个有 `- 本次视角:`、**41 个既无方法节也无方法行**。
用户批的是 200 字计划卡，不是一份可复核的设计；Lead 写设计、critic 审执行、门禁查证据时
没有同一份 typed 对象可对照。期望：一次 run 有一份 `protocol.json`（方法 / 来源范围 / 投入 /
输出 / 门 / 偏离），HITL1 卡用 5 个维度展示、question.md 留 5 行投影，gate 机检 schema / effort / output / projection / 版本；
新搜索倾向只换取值，不改 schema。

**当前情况：**

- 研究已 `已定性`（2026-11-11）：两份材料 + 一次盘上核验收口。结论见
  [核验与收口](../research/preference-layer/2026-11-11-preference-protocol-verification.md)。
- **v1 五刀**（核验材料 §5/§10 的推荐）：① Protocol **不含 `lens_plan`**——lens 的家仍是
  `topics.md`（D43，2026-11-10 刚落）；② plan **不加 `cell` 列**——`research-planning/SKILL.md:54`
  明写「lens 是 cell 属性，不写 plan 列」；③ **不改** `method-library.md` / `Method Editor` 的
  四字段与宿主工具（0/63 采用）；④ **不引入 Brief 对象与 `brief_ref`**——Brief 继续住
  `question.md` 三节；⑤ **不加 style**（连 prose 标签也不加）——style 留 v2 独立卡。
  output 终稿门 / coverage 门 = v2 或独立卡。
- **实测支撑**（核验材料 §4）：63 个 bundle；quick 2–6 节点、standard 8–12、deep 10–16；
  `research-planning:63` 顶层 ≤12；cells 仅 1 场声明 = 7；计划卡 6 张 171–206 字（1 张超 200）；
  `manual.md` 12,038 / 12,288（余 250；2026-11-11 07:29 拆出 `content/generic/` 后 = 9,996 / 12,288，余 2,292——本卡仍按「程序住 skill、结构住 template」不加字）；`plan-index.ts:152-167` 按表头读列；
  `method_library_upsert` 收完整 Markdown + `operationHash`（`src/method-library-tool.ts:44-52`）。
- **本卡是 v1 实现合同**；尚未改任何 pack 代码 / 模板 / 门禁。旧 bundle 按 epoch 豁免。
- **表达层补篇（2026-11-11 追加研究）**：数据层只解决「有没有可审对象」；实测发现对象在被批、被派、
  被审、被交四个时刻没有投影——卡上来源类型仅 **1/6**、派发 brief 方法名 **0/53**、HITL2 引用设计
  **0/6**、final 写方法名 **17/59**、写偏离 **0/59**。若只落 JSON + gate，它会变成又一份手写表达，而不是单一真源。
  v1 追加 **5 个派生投影**（卡 / `§Protocol` / 派发切片 / review §4b / HITL2+final 头）+ **4 条规则**
  （批准边界 / 派生不重写 / 一受众一时刻 / 偏离一等）；并反推**两条数据层澄清**：复合方法
  = `id` 主方法 + `adjustments`（不新增 schema；gate 用「包含」而非「相等」）、`approval_basis`
  = `card | revision | auto`（quick 无卡记 `auto`、修订 v2 记 `revision`；`approved` 不再无名）。全部文本 + core 两条判据，
  不新增客户端 / host 工具 / 交互点。详见[表达层补篇](../research/preference-layer/2026-11-11-preference-protocol-expression.md)。

**决定记录（2026-11-11）**：用户指示「技术项按推荐、不必逐项拍板」；下列 1/2/4/5/6 取推荐值，
3 的 D46 与业务验收留交付时由用户签。视觉面（驾驶舱/新页签）不在本轮，留以后按 `projectionOf()` 适配。

**未决问题：**

1. **五刀是否接受**（lens_plan / plan cell 列 / Library 版本 / Brief 对象 / style 均出 v1）：**定：接受**。
   拒绝任一刀 → 本卡回 `推敲中` 或拆独立卡，不在一张卡里同时改 D43 与 Protocol。
2. **深挖档节点上限**：**定：12**（沿用 `research-planning:63`；16 为单场观测）；
   若 pilot 证明 12 压死深挖，再带证据升，不在本卡先放宽。
3. **D46 登记 + 业务验收**：交付时由用户签；实施按 2026-11-11 指示推进（M1–M2 自主，M3 请人）。
4. **表达层五个投影是否进 v1**（卡 / `§Protocol` / 派发切片 / review §4b / HITL2+final 头）：**定：进**（只接既有文本面）。
   不进 → A11「Protocol 切片到达执行面」没有证据面，JSON 只服务 gate；驾驶舱与 output 机检仍留 v2。
5. **复合方法映射**：**定：`method.id` = 主方法（五条之一）+ `adjustments` 写补法**；gate 方法名一致性
   用「`§研究方法 - 采用:` 包含 `id`」。拒绝 → 复合 run 走 `custom`：卡片仍可写「主 + 辅」，但失去
   预设四字段的来源与推荐映射，Lead 要为并集手写四字段，成本落在最复杂的 4/22 场。
6. **`approval_basis`**：**定：加 `card | revision | auto`（draft 时 null）**。拒绝 → quick 的 `approved` 名不副实、
   修订出的 v2 在 JSON 里看不出未再呈卡；gate 仍能过，但「批准」语义不可由 JSON 单独复核。

**下一步：** M4 = 3 场 pilot（官方核查 quick / 学术综述 deep / 监管对比 deep）；pilot 通过 → 同变更写 Note、D46、
`可关闭：是`、归档。任一表达面不可落或 pilot 硬线失败 → 回 `推敲中` 并附读数。

## 已知与未决

### 已知（证据锚点）

- **现状层**：`question.md` 模板（`§研究方法 - 采用/来源/本次视角`、`§Constraints - 来源偏好:`、
  `§HITL1 Snapshot - 深度与篇幅`）；`topics.md` 的 `lenses:`；`plan.md` 的 `depth` 列与
  `## lens 与 activation` 节；`content/manual.md` §研究视角 / §交互纪律 / §事实的 owner。
- **合同层**：D43（lens 九字段、cells = topic × lens ≤12、v1 不加覆盖门）；D44（claims/verdicts，
  epoch 2026-11-11）；D45（wave 执行，plan 不加列）；D33（run schema=2）；D40（内容随包）。
- **门禁层**：`scripts/run-ops/run-accept.mjs:99-105` 预检链 = node-gate → evidence-audit →
  verdict-audit → path-hygiene → secret-scan；`scripts/lib/verdict-audit-core.mjs:25` 的 epoch 形态；
  `scripts/lib/plan-card.mjs:16,19`（标签「按计划开跑」、200 字）；`scripts/verify/gates/e-workspace.mjs:28`
  （manual cap）。
- **解析/内容层**：`packages/deep-research-pack/src/lib/plan-index.ts:152-167`（plan 表头名驱动，
  加列不会解析崩，但会多一份真相）；`tests/pack/template-files.mjs:11-22`（`CORE_TEMPLATES` 10 件）；
  `tests/pack/content-coverage.test.mjs:105-118`（孤儿模板：新模板必须被 manual/persona/skill 点名）；
  `tests/pack/template-contract.test.mjs:11-40`（被解析器/门消费的键）；`dev/render-overlay.mjs`
  （改 pack 后必须重渲染）。
- **表达层**（2026-11-11 补）：`research-brief/SKILL.md:50-57`（卡）、`lead.patch.yml:26`（卡）、
  `:31`（HITL2 ≤200）、`team-assembly/SKILL.md:39-45`（派发五件）、`:47-57`（方法论/lens 装载）、
  `adversarial-review/SKILL.md:43-50`（方法承诺）、`:104-137`（readiness）、`final.md:1-6`（头）、
  `src/lib/method-of-question.ts:5-14,87-109`（五态）、`src/client/ResearchConfigTab.tsx:273-279`
  （「来源」= `origin`，语义错位）；实测 = 卡 6 张 171–206 / 派发 53 份方法名 0 / HITL2 6 张设计引用 0 /
  final 59 份方法名 17、偏离 0（口径 = 表达层补篇 §11）。
- **外部**：来源范围是 8 家 table stakes、我们最大缺口（第三遍 §4 #3）；Gemini 是消费级唯一计划门、
  DeerFlow 1.x 是开源唯一 `ACCEPTED/EDIT_PLAN`、Elicit 是最接近的一屏设置（第三遍 §2.1–§2.6）；
  style 需要 acceptance profile，v2 先做 fact_check + literature_review（第四遍 §8.7）。

### 未决（实施期才回答，不阻塞本卡）

- pilot 三场的 HITL1 时长 / 修订次数 / gate 红项 / 用户能否复述；
- gate 误伤率（尤其 `projection` 的字符串归一化 / 复合方法的包含判据）；
- quick_factual 写 `protocol.json` 的实际负担（是否值得全量强制）；
- `protocol-audit` 与 `run-accept` 的 `--write` 顺序（预检只读、落盘后再复检）；
- 来源范围的语义一致（method 四字段是 prose，gate 只能查形状；冲突归 Lead 记 deviation + critic）；
- 卡在 195 边缘时删哪一项（冗长变体实测 195；推荐模板 177；授权行不删，先删决定细节/问题括注）；
- 派发切片的可追溯率（3 份/场抽样；prompt 不落 bundle，无 CI 面）；
- HITL2 设计行与三行数字争 200 字（超时先删数字）；
- 驾驶舱「来源」标签的错位（v1 只登记，v2 与 Protocol 页签同批改）。
- `manual.md` T0 现 9,996 / 10,000（`content-disclosure` cap）：`protocol.json` 未进手册 §目录约定
  （结构由模板 / pack README / skill 拥有）；要进手册须先压缩换字，M4 视需要决定。
- lead snapshot 重录于未提交工作树：`source.note` 已记；M1–M3 提交后把 `codeAnchor`/note 更新为提交态。

## 方案与取舍

### v1 = 四件工件 + 一道门 + 五个投影

1. **`protocol.json`**（bundle 根，canonical）+ `protocol/v<N>.json`（旧版快照）。字段 =
   `schema/version/status/created/approved_at/approval_basis` + `method`（id/kind/四字段快照/adjustments）+
   `source_scope`（families/domains/exclude/recency/language/authority）+
   `effort`（band/band_v/四数字/allowed_depths）+ `output`（shape/sections/length/format/audience）+
   `gates`（五个 policy 枚举）+ `deviations`。**不写 hash、不写 lens、不写 Brief。**
   `approval_basis = card | revision | auto`（quick 无卡、修订 v2 的直接开工各有据）。
2. **`question.md §Protocol`**：5 行投影（方法/来源/投入/输出 + `protocol: vN` + 指针；**不写计划行**，
   计划归 plan.md）；`§Purpose` 加 `- 读者:` / `- 交付形态:` 两行；`§Constraints - 来源偏好:` 继续作 Brief 姿态。
   **HITL1 卡压成 5 维度**（问题 / 方法+来源 / 投入+输出 / 决定 / 授权 + 指针），仍 ≤200 字（实测 159–177）。
3. **`scripts/lib/protocol-core.mjs`**（纯判据：schema/枚举/refs/effort/output/投影/版本/hash +
   复合方法包含判据 + `approval_basis`）
   + **`scripts/run-gates/protocol-audit.mjs`**（CLI，0/1/2，`--no-write` / `--write`）+
   `tests/run/protocol-core.test.mjs`（M1）+ `run-accept-smoke` ⑩（M2 CLI）；接 `run-accept` 第四道预检；epoch = 2026-11-11（落地日；核验材料的 2026-11-12 是计划日）；
   quick_factual 仍写 JSON 但免 `§Decisions` 审批行。
4. **内容面**：`content/templates/run/protocol.json`（写者契约，按需 read）；
   `question.md` / `plan.md` 模板小改；`research-brief` skill 加解析/写 JSON/投影/卡压字；
   `lead.patch.yml` persona 把「计划要点」段改成 5 维度卡 + HITL2 设计行；`critic/adversarial-review`
   加 §4b「Protocol 兑现」；`team-assembly` 加派发切片；`final.md` 头两行。**手册不加字**
   （程序住 skill、结构住 template；注：manual 现 9,996 / cap 12,288，核验 §4.1 的「余 250」已过时）。

### 表达层 = 五个派生投影 + 四条规则（2026-11-11 补）

| 投影 | 受众 | 关键内容 | 预算 |
|---|---|---|---|
| HITL1 卡 | 用户 | 问题 / 方法+来源 / 投入+输出 / 决定 / 授权 / 指针 | ≤200（实测 159–177） |
| `§Protocol` | gate + 后来读者 | 4 字段行 + 版本 + 指针 | 建议 ≤12 行 |
| 派发切片 | scout/analyst/critic | 角色相关字段，值从 JSON 抄 | ≤6 行/份 |
| review §4b | lead / 操作者 | 兑现（shape/source/deviations/版本）+ readiness 行 | 1 节 |
| HITL2 + final 头 | 用户 / 读者 | 按 Protocol vN；偏离 n；final 两行 | HITL2 含在 ≤200；final 2 行 |

**四条规则**：R1 批准边界（卡上出现所有改变研究/来源/投入/交付的字段；策略与派生字段除外）；
R2 派生不重写（所有表面从 JSON 抄，§研究方法 是唯一散文展开）；R3 一受众一时刻（不新增交互点）；
R4 偏离一等（发生即写 JSON + journal，review/HITL2/final 各一行）。
驾驶舱投影、卡-vs-JSON 门、output 终稿机检 = **v2**（现有 output 机检仍不做）。

### 范围

| 做 | 不做（本卡外） |
|---|---|
| protocol 工件、canonical/hash、快照、版本 | `lens_plan` / cells 进 Protocol（D43 的家） |
| source_scope typed + Brief 姿态行 | plan `cell` 列（D43 明写不写） |
| effort band 6/12/12 作上限（可更紧）+ depth 子集校验 | `calls_max` / 时间估计（无读数） |
| output shape/sections/format（md only） | output 终稿机检 / 模板文件目录 |
| 5 维度卡 + §Protocol + 派发切片 + review §4b + HITL2/final 头（**只接既有文本面**） | 新视觉面 / 第四问 / 新交互点 / 卡上限抬升 |
| 偏离写者/时机/三处表达 + 复合方法 + `approval_basis` | 卡-vs-JSON 门（v2；pilot 漂移才做） |
| protocol-audit + run-accept 第四道 + epoch | coverage 门 / source 语义门 |
| quick_factual 写 JSON、免审批行（`basis=auto`） | Library 版本 / 倾向模板 / style_ref |
| 3 场 pilot + Note + D46 | 驾驶舱 / 新页签 / host 工具 / session 事件（视觉留以后按 `projectionOf()` 适配） |

### 输掉的方案

| 方案 | 否决理由 |
|---|---|
| `question.md` 单文件（markdown 表 + fenced JSON） | 嵌套结构解析难；叙事与机器数据混在一起；后续 gate/cockpit 更贵 |
| 只加路由表、不加对象 | 没有单一可审对象；冲突仍靠 Lead 散文（现状） |
| 现在上 `protocol_check` host 工具 | 新增公共 host 面 + D 号 + 审阅；v1 gate 能兜底；模型非法率 >10% 再上 |
| Protocol 拥有 `lens_plan` | 与 D43 的 `topics.md` 家冲突；cells 已在 skill/模板算；会造第二份真相 |
| plan 加 `cell` 列 | `research-planning:54` 明写不写；`plan-index` 虽表头驱动，但没必要多一份 |
| Library 加 version/provenance | 动 `method_library_*` 工具 schema + Method Editor + 驾驶舱；0/63 采用 |
| style `style_ref` + `gates.profile` 进 v1 | 需要 acceptance profile 与试点；本卡已够大；v2 独立卡 |
| 5 行投影当整张卡 | 5 行本身 138 字；加问题/业务简报/指针必超 200；卡改 5 维度（实测 159–177） |
| **只落 JSON + gate、不接表达面** | JSON 只在交付时被 gate 读；卡/派发/review/HITL2/final 仍手写；A11 没有证据面；deviations 无用户面；等于第五份表达（表达层补篇 §2/§3） |
| **为复合方法新增 `parts[]`** | v1 不为一组纸面跑加结构；`id` 主方法 + `adjustments` 已能表达 4/4 实测；pilot 不够再谈 |
| **`status` 再分 active/approved/superseded** | 语义会与 `approval_basis` 重叠；一个枚举解决 quick/修订两种情况，不动 D33/D46 词汇 |
| hash 当审批证明 | Lead 无 bash；HITL1 无 gate 运行点；v2 host 工具才能钉当时 hash |
| 为 pdf/docx/pptx 加 format | 包内无生成工具；承诺即假 |

### 同步面（漏一处就漂移）

- `dev/research.overlay.yml`：改 pack 后 `node dev/render-overlay.mjs`；`overlay-fresh` 门禁。
- 模型可见面：`research-brief` skill（卡模板 / 5 行投影 / `approval_basis`）、`team-assembly`（Protocol slice：method/source/effort/output 随派发 brief）、`scout/lead-mapping`（按 source_scope 找源）、`lead.patch.yml` persona（卡 + HITL2 设计行）、`critic/adversarial-review`（§4b + readiness 行）、`content/templates/run/{question,plan,final,protocol.json}` → L1 `preset-smoke` + L3 snapshot B + L4-lite。
- 包形状：`tests/pack/template-files.mjs` 的 `CORE_TEMPLATES` 加 `protocol.json`（10 → 11）；
  `tests/pack/content-coverage.test.mjs:105-118` 的孤儿模板断言要求新模板被 manual/persona/skill 点名；
  `tests/pack/template-contract.test.mjs` 若 protocol 键被解析器消费则登记；`package.json files`
  已含 `content/**`，无需改。
- 评估账：`docs/evaluation.md` L4 加 ⑥（机器判据）+ `tests/contracts/evaluation-contract.test.mjs`；
  `scripts/README.md` 两表加 `protocol-audit` / `protocol-core`。
- 文档 = 当前合同：`docs/design/30` 方法层加 Protocol 指针；pack README 模板清单加一行；
  `docs/decisions.md` D46；研究题名页 `产出的卡` 与 issue README 活跃清单同变更；本卡「表达层补篇」
  节与表达层材料同变更。
- 不变量：四角色 / 两 HITL 点 / D43 lens / D44 claim verdict / D45 wave / D25/D37 方法库 /
  D33 run schema / 200 字卡 / manual cap——全部不动；新增的是投影与文本，不是新轴。

## 实施步骤

| 段 | 内容 | 红先 / 必跑 | done |
|---|---|---|---|
| **M1 纯判据 + 工件**（keyless） | `protocol-core.mjs`（含 `projectionOf()` 与复合方法包含判据、`approval_basis`）；`content/templates/run/protocol.json`；question/plan 模板小改；`tests/run/protocol-core.test.mjs`（core 直调）；卡模板字数夹具（真实三例 ≤200）；`tests/pack/template-files` 的 `CORE_TEMPLATES`；`scripts/README` 两表 | 红配方先红（§6.7 的 schema / unknown-ref / effort / depth / cells / output / status / projection / changed / snapshot / plan-ref + composite / approval_basis）；`pnpm verify` + `pnpm test` | core 在合成 bundle 上证明 schema/effort/output/projection/版本；复合 4 例通过；卡投影 ≤200；旧 bundle 不判 |
| **M2 CLI + 接门** | `protocol-audit.mjs`（0/1/2、`--no-write`/`--write`、epoch、quick 豁免）；`run-accept` 第四道预检；`docs/evaluation.md` L4 ⑥ + 契约测试；`run-accept-smoke` 合成两例 | 红配方经 CLI 各红一次；`node scripts/smoke/run-accept-smoke.mjs`；`pnpm verify` | 门在合成 bundle 上红/绿可复跑；`--write` 落 `protocol-audit.md` |
| **M3 内容面**（阶段边界请人） | `research-brief` skill（解析/写 JSON/5 行投影/**5 维度卡**；HITL1 拍板后把 `status/approved_at/approval_basis` 更新并在 `§Decisions` 首条写 `protocol: vN`；修订一轮制同步改 JSON + 投影 + `basis=revision`）；persona（卡 + **HITL2 设计行**）；`team-assembly` **派发切片**；`scout/lead-mapping` 按 source_scope；critic **§4b**；`question.md` 模板 §Protocol + 2 行；`plan.md` 头 `protocol:`；`final.md` 头 2 行；`method-of-question.ts` 五态兼容（不改解析器；gate 用「`§研究方法 - 采用:` 包含 `method.id`」）；`tests/pack/presets.test.mjs` 的既有钉句保持（同 diff 更新，不弱化） | `render-overlay` → `preset-smoke`（L1）→ snapshot B 先红 → `--update-expected` 人审 → L4-lite | L1 绿 + snapshot B 绿 + 新钉测试绿 + 文档同步 |
| **M4 pilot + 收尾** | 3 场：官方核查（quick）/ 学术综述（deep）/ 监管对比（deep）；记录卡长/时长/修订/红项/变更/复述/派发抽样/偏离数 | L4 真 run；`run-accept` 绿；证据进 Note，不进 CI | 验收 A9 + A12/A13 全绿或残余如实列；Note + D46 + 归档同变更 |

**M1 已落（2026-11-11）**：`scripts/lib/protocol-core.mjs`（schema/枚举/canonical/hash/effort/output/投影/
版本/`approval_basis`/复合包含判据）+ `content/templates/run/protocol.json` + question/plan 模板的
`§Protocol` / `protocol:` 头 + `tests/run/protocol-core.test.mjs`（19 例）+ `CORE_TEMPLATES` +
`scripts/README` 行。`pnpm test` 1150 全绿 / `pnpm verify` 全绿；红先证明 = 关掉 `nodes_max` 判据 →
effort-contract 用例红，还原后绿。M2 未接 gate，现有 run 行为零变化。

**M2 已落（2026-11-11）**：`scripts/run-gates/protocol-audit.mjs`（0/1/2、`--write`/`--no-write`、
epoch、`--require`、版本指纹行、旧行保留）+ `run-accept` 第四道预检与落盘（`--no-write` 真只读）；
`docs/evaluation.md` L4 ⑥ + `evaluation-contract` 断言；`run-accept-smoke` ⑩（契约日后有效 protocol 绿 +
`protocol-audit.md` 指纹 + 改字节 `protocol-changed` 红 + 缺工件 `no-protocol` 红）。`pnpm test` 1150 /
`pnpm verify` 全绿；`run-accept-smoke` ALL PASS。现有旧 run 仍 epoch 豁免、行为零变化（新契约 run 才有 gate）。

**M3 已落（2026-11-11）**：`research-brief`（5 维卡/投影/`approval_basis`/复合方法）、persona（卡 +
HITL2 设计行）、`team-assembly`（派发切片）、`adversarial-review`（§4b + readiness 行）、
`scout/lead-mapping`（source_scope 动作）、`final.md` 头两行；`docs/design/30` 与 pack README 指针。
证据：`preset-smoke` ALL PASS（L1 真挂载）、`l4-lite-smoke` ALL PASS（真模型五角色 + scout 工具调用）、
`snapshot-replay-smoke` 全场景 PASS（lead persona 已重录；`source.note` 记录录制时工作树含未提交 M3
改动）；`pnpm test` 1150 / `pnpm verify` 全绿。**M4 未做**（3 场 pilot）。


**pilot 首场修订（2026-11-11）**：第 1 场 quick 的 lead 写出 6 条 schema 红——`adjustments` 用了
`{what, owner}` 对象、`recency: as-of-capture`、`nodes_max` 3（<6）、`waves_max` 2（<5）、
`allowed_depths` L1–L2（quick 表是 L0–L1）、`critic: light`。判定：**前五条是 schema 过紧，不是
模型错**（字段名 `*_max` 本义是上限；depth 是设计轴；as-of-capture 是合法取数姿态；adjustments
带 owner 更有用；quick 的轻量 critic 是既有编制）——v1 改为：`nodes/cells/waves ≤ band`（可更紧）、
`allowed_depths` 非空 ⊆ L0–L3（band 表为默认）、`recency` 接受 `as-of-capture`、`adjustments`
接受字符串或 `{what, owner?}`、`gates.critic` 增 `light`；不升 schema。改后该 bundle 只剩 1 条
真红：topics 3 lens > `cells_max` 2（quick 设计超预算，plan 级修，不升协议）。


**M4 pilot 1（已验收，2026-11-11）**：`drt_openai-api-pricing-context`（quick 官方核查）。
HITL1 三问卡（quick 免计划卡）；protocol v1 auto；首版 6 红（5 schema + cells）→ 修订后 0；
review R1 PASS / R3 FAIL / R4 FAIL（4 CRITICAL）→ lead 按 R4 逐条修、R5 terminal PASS（承接 R4，
非独立复审）；HITL2 3 轮（改说法×2 / 定稿）；`run-accept` PASS（evidence CRITICAL 0 / MAJOR 38；
`protocol-audit` PASS；path-hygiene 2 轮修 home 路径）。**A12 gap**：`protocol.deviations=[]`，
但实际 403 source 偏离只写在卡/journal/final，没进 JSON——下一场必须在协议里记 deviation。
**A12 final 头**：本场 final 只有「口径/用途」，没有 `设计：… ｜ Protocol v1` 两行（HITL2 卡有 Protocol 行）——
模型漏跟；pilot 2 已按模板带上 `设计：…｜ Protocol v1`。
**卡长读数**：HITL1 首卡 3 问（38/16/11 字；quick 无计划卡）；HITL2 三张 **218 / 221 / 235 字**
——全部 >200（persona 的 HITL2 摘要 ≤200 纪律 3/3 未达），但 Protocol 首行与偏离都在。


**M4 pilot 2（进行中，2026-11-11）**：`drt_llm-memory-landscape`（deep 学术综述）。计划卡 **187 字**
（≤200）；protocol 首版 8 条红——学术 source families（paper/conference/benchmark-official/web-secondary）、
recency 日期区间、shape `landscape_map`、nodes_max 16 > deep 12、waves 8 > 7（其中 waves 是判据实现
误把 warning 当红，已修正）。判定：family/recency/shape/waves 是 schema 过窄，已按 pilot 修订
（families = slug + 推荐集外 warning；recency 接受 `YYYY-MM/YYYY-MM`；shape + `landscape_map`；
waves 超 band = warning）；nodes 16 是**声明上限高于 band**（plan 实际 12，正好 ≤12），已要求 lead
声明 16 只是 headroom（实际 plan 12）；已按 pilot 放宽为「cap 可高于 band（warning）+ 实际 plan/topics 按 band 卡」，无需改 16。**deep 12 不变**：本场 plan 12，未证明 12 压死深挖。**A11 派发抽样**：scout-1 /
analyst-a / analyst-b 3/3 的 spawn brief 都带 method / source families / recency / language / authority
（新 team-assembly 切片首次行为证据）。**A12 行为证据**：R1 review 的 §4b 明确抓到 `deviations` 空
而 `source.families` 有未兑现项（M6），readiness FAIL 并要求补两条 deviations——critic 的 Protocol
兑现审计在 pilot 2 真的咬住了（pilot 1 漏过的同一缺口）。
**run-accept 首轮红**：`review/claims.json` 顶层多了 `note` → verdict-audit `claims-invalid`（D44 形状
只允许 version/finalRef/claims）；lead 已改。
**第二红（D44）**：`review/verdicts-r1.json` 的 batches 多了 `claims` 字段、`raw` 只有 63 字
（不是 child 最终正文逐字 copy）→ verdict-audit `verdicts-invalid`；lead 修中。


**M4 pilot 3（早读，2026-11-11）**：`drt_ai-model-regulation-cn-eu-us`（deep 监管对比）。计划卡 **188 字**
（≤200）；protocol 首版 3 红——`method.adjustments` 的 `{what, role, lens}` 对象（role/lens 是
有用结构）。判定：schema 过窄，已放宽为 `{what, owner?, role?, lens?}`；改后 `protocol-audit` PASS
（v1 b41f01eb…）。source_scope official+web、recency 24m、deep 12/12/6、shape full_report 均直接过。**A11 派发切片**：
scout-1 / analyst-1 / analyst-2 3/3 brief 都带一行 `Protocol v1：方法=…；来源=…；投入=…；输出=…`
+ 角色切片（pilot 3 是切片形态最正的一次）。

**M4 pilot 结论（2026-11-11，用户选 A）**

3 场全部交付；**Protocol 层 3/3 全绿**：`protocol-audit`（schema/effort/output/投影/版本/approval_basis/
deviations）PASS；卡 187/188 字、派发切片 3/3、review §4b 抓到 deviations 缺口、final 设计头在 pilot 2
成立。Pilot 1 `run-accept` 绿；Pilot 2/3 的 `run-accept` **仅剩 D44 `verdict-audit` 红**
（raw 逐字 / 四值 / 最新一轮 critical 覆盖），属 D44 既有 claim 层，不是本轮 Protocol 层。
A9 的「gate 红项 >3/场」在 2/3 场触发，触发面均为 D44。

- 时长（会话墙钟，近似）：P1 08:26→~08:47（~21 min）；P2 08:48→09:30 交付（~42 min）；P3 ~09:09→09:40 交付（~31 min）。
- 复述：**代理模拟，未做真实用户复述**（A9 该项未取证）；卡/派发/偏离读数已记。

- **决定：A**——接受 Protocol 层残余（D44 另案），写 Note / D46 / 归档，pilot 收口。
- 选 B：继续修 D44（重裁/逐字 raw，预计 10–15 分钟，可能再出 r2/r3）。


## 验收标准

> 判据按 [validation-design](../../methods/validation-design.md) 分三类：确定性 / 模型行为 / 编排。
> 每行「通过」是下游判定口径；「人」列只有用户能判。详细 gate 代码 = 核验材料 §6.7。

| # | 行为 | 类 | 输入/状态 | 通过信号 | 负例/恢复 | 证据 owner | 人 |
|---|---|---|---|---|---|---|---|
| A1 | `protocol.json` 工件与 schema | 确定性 | 新 bundle + 模板 | `protocol-core` 校验：六面字段/枚举/类型齐；`method.fields` 四字段非空；`output.shape` ∈ 7 值（含 `landscape_map`）；`format=md`；`source_scope.families` = slug（推荐集外 warning）；`recency` 接受 `as-of-capture` / duration / `YYYY-MM/YYYY-MM`；未知字段红；先写红（删 output / 坏 shape / 空 method）再绿 | 缺字段/超集/未知引用 → test 红；不许用「额外键忽略」绕过 | `tests/run/protocol-core.test.mjs` + 模板 | 无 |
| A2 | canonical / hash / 版本 / 快照 | 确定性 | 同 A1 | 同一 body → 同一 canonical 字节串与 sha256；audit 同版本行匹配；改一个字节不升版 → `protocol-changed` 红；升版无 `protocol/v<旧>.json` → `protocol-snapshot` 红 | 模型不得手写 hash；`--write` 不得静默覆盖不同 hash | core 测试 + CLI 红配方 | 无 |
| A3 | effort 合同 | 确定性 | plan + topics + protocol | 顶层节点 ≤ min(`nodes_max`, band)；topics lens ≤ min(`cells_max`, band)；plan depth ⊆ `allowed_depths`；`nodes/cells` 声明可高于 band（warning，headroom）；实际执行面仍按 band 6/12/12 卡；`allowed_depths` 非空 ⊆ L0–L3（band 表为默认）；waves 超 = warning | 节点超限/深度越带/cells 超限 → 红；**不要求 plan 加 cell 列** | core + 合成 bundle | **用户**：接受 deep=12 |
| A4 | output 形状与格式 | 确定性 | protocol | shape ∈ 7（含 `landscape_map`）；sections 非空；length `min ≤ max` 且 unit ∈ words/pages；format = md；`literature_review` 允许但 skill 必须写「非系统综述」caveat | 未知 shape / pdf/docx/pptx / 长度倒挂 → 红 | core 测试 + skill 文本 | 无 |
| A5 | 5 行投影 + 5 维度卡 | 模型行为 + 编排 | 一场新 run 的 HITL1 | `question.md §Protocol` 有 4 字段行 + `protocol: vN` + 指针（不写计划行）；`§研究方法 - 采用:` 的原文**包含** `method.id` 且 `method-of-question.ts` 五态不破；卡含 方法/来源 / 投入/输出 / 决定 / 授权（脚本层时）/ 指针，≤200（`plan-card` 口径）；卡上默认不写 lens，偏离才一个短词；用户不打开文件能复述方法/来源/输出/**有无偏离** | 卡超 200 → node-gate 门① WARN；投影缺版本/band/shape → `projection` 红；卡缺来源类型或读者 → pilot 记不合格 | `plan-card-stats` + snapshot B + pilot | **用户**：卡是否可读 |
| A6 | 审批链、批准类型与 quick 豁免 | 确定性 | `status`/`approval_basis` + `§Decisions` | 非 quick：`status=approved` + `approved_at` 非空 + `approval_basis ∈ {card, revision}` ↔ `§Decisions` HITL1 行 `protocol: vN` ↔ 投影版本一致；修订后 JSON 与投影同步且 `basis=revision`；quick：`gates.hitl1=none`、`approval_basis=auto`，不要求 Decisions 行 | approved 无 Decisions / 修订后版本漂移 / quick 无 basis 或 basis≠auto → 红；quick 被强塞审批行 → 红/回退 | core + 合成 bundle | 无 |
| A7 | 接门与 epoch | 确定性 | `run-accept` | 第四道预检 `protocol-audit --no-write`；`--write` 落 `protocol-audit.md`；旧 bundle → `legacy-not-applicable` exit 0；契约日后缺 protocol → `no-protocol` 红；`--require` 给测试 | 旧 bundle 红 / 新 bundle 静默放过 → smoke 红 | `run-accept-smoke` + fixture | 无 |
| A8 | 不造 lens 第二份真相 | 确定性 + 编排 | topics + plan + protocol | `topics.md lenses:` 仍是唯一家；plan 仍只有 `## lens 与 activation`、无 cell 列；audit 的 cells 由 topics 算；D43 三处文档不改 | gate 要求 JSON 里有 lens / plan 多一列 → 红 | 代码审 + `plan-index` 回归 | 无 |
| A9 | 3 场 pilot | 模型行为 + 编排 | quick / deep / deep | 卡 ≤200；Protocol 非法率 ≤10%（3 场）；协议级变更 ≤1 次/场；用户能复述「方法/来源/输出 + 有无偏离」；至少一次「改来源/改输出」而非「重跑」；旧 bundle 全绿；**派发抽样 3 份/场能指回 JSON；HITL2 有 Protocol 行；final 头两行；偏离记录数如实** | 卡频繁超限 / 红项 >3/场 / 变更 >2 次/场 / critic 无法按 cell 填覆盖 / 有降级但 deviations=0 → 停，回 `推敲中` | pilot bundle + 本卡记录 | **用户**：接受 pilot 结论 |
| A10 | 回归、文档与账 | 确定性 + 人 | 全树 | `pnpm verify`、`pnpm test` 绿；`render-overlay` 后 `overlay-fresh` 绿；snapshot B / L4-lite 绿；`docs/evaluation.md` ⑥ + 契约测试；`scripts/README` 两表；`design/30`、pack README 同步；`research-planning` 的 ≤12/深度档与 band 表同 diff 对齐（测试钉 band 常量）；卡/HITL2/final 头/persona 钉句同 diff；`content-coverage` 孤儿模板断言绿；D46 + Note + 归档同变更 | 任一红 → 不交付；keyless 绿不替代 L1/L4 | guides/60 任务型路由 | **用户**：D46 + 公共行为 |
| A11 | Protocol 切片到达执行面 | 模型行为 + 编排 | team-assembly / scout / critic | 派发含 `Protocol vN：方法=…；来源=…；投入=…；输出=…` 一行 + 角色相关字段；scout 的来源动作按 `source_scope`；critic §4b 按 Protocol 审兑现与偏离；pilot 抽 3 份 brief 能指出「这条派发用了哪几个值」 | 只有 JSON 没有行为 / 派发 brief 仍只写散文 → pilot 失败 | pilot + skill 审 | 无 |
| A12 | 表达闭环：HITL2 + final 头 + 偏离 | 确定性 + 模型行为 | 一场新 run 的交付 | HITL2 卡含「按 Protocol vN 交付：<shape>（<audience>）；偏离 n」；final 头两行（设计 + 偏离）；`deviations` 有写者/时机/三处表达（review/HITL2/final）；有 403/降级类现实时 JSON 有记录且 review §4b 点名 | 偏离只写进正文、JSON 无记录 → MAJOR；HITL2/final 缺设计行 → pilot 不合格 | pilot + critic 审 | **用户**：HITL2 摘要是否够 |
| A13 | 复合方法与批准类型 | 确定性 | 4 个真实复合 bundle + quick/revision 合成例 | `id` 主方法 + `adjustments` 补法；gate 用「`§研究方法 - 采用:` 包含 `id`」通过；4 例过；quick `basis=auto` 无 Decisions 行也绿；修订例 `basis=revision` + v2 快照 + Decisions `protocol: v2` 绿 | 复合被 gate 误红 / quick 无 basis / 修订后 basis 仍 card → 红 | core + 合成 bundle | 无 |

## Out of scope（本卡不做）

`lens_plan` / cells 进 Protocol；plan `cell` 列；`method-library.md` 版本/provenance + 工具/UI 改动；
Brief 独立对象 / `brief_ref`；`style_ref` / `gates.profile` / style catalog；output 终稿机检；
coverage / source 语义门；`protocol_check` host 工具；session 事件 / storage-domain / settings；
cockpit 只读投影；Library「倾向模板」；新交互点 / 第四问；卡上限抬升；pdf/docx/pptx；
用户可选模型 / 推理档；跨 run 账户级 memory。

**后续（不属于本卡）**：v2 的 `style_ref` + 两个 acceptance profile；Library 版本化（若采用率起）；
coverage/output 门；cockpit 投影；`protocol_check`（若 pilot 非法率 >10%）。

## 关闭条件

- A1–A8、A10–A13 过；A9 pilot 通过（或残余如实记录且用户接受）。
- `notes/implemented/2026-11-11-preference-protocol-layer.md` 同变更写就（交接期用代码路径，载体成立再换 live link）：决定、
  输掉的方案、实际跑过的验证（命令与结果）、残余风险（hash 边界 / quick 负担 / gate 误伤 /
  source 语义不核 / 卡 195 边缘 / 驾驶舱「来源」标签仍错位）。
- `docs/decisions.md` D46 登记（用户签）；`docs/evaluation.md` L4 ⑥；`scripts/README` 两表；
  研究题名页 `产出的卡` 与 issue README 活跃清单同变更；表达层补篇与本卡同变更；本卡 `git mv` 归档 + `status: 已结` +
  `可关闭：是` + 审查记录。
- 业务验收（用户）：接受 5 维度卡的 HITL1 形态、HITL2/final 的设计闭环、Protocol 公共契约、D46。
