---
topic: 偏好层 v1 核验与收口：Protocol 减掉 lens、数字落地、结构选择有结论
intent: 在数据模型与 how 材料之上做一次盘上核验：逐条核对材料对现状的断言、量出方法/深度/lens 的在场率与漂移、把不可证的字段降级、把 v1 收窄到能落地的四件工件与一道门，并给出 issue 的验收面。
---

# 偏好层 v1 核验与收口（2026-11-11）

> 性质：核验与收口；结论供 issue 落地，不是已落地合同。
> 上游：[数据模型](2026-11-10-preference-protocol-data-model.md) · [怎么落](2026-11-10-preference-protocol-how.md) · [external-landscape 第三遍](../external-landscape/2026-11-10-landscape-preference-layer.md) · [第四遍·style](../external-landscape/2026-11-10-landscape-style-space.md)。
> **结论先行**：两份材料的设计方向成立，但 v1 的边界要收——**Protocol 只拥有 method / source_scope / effort / output / gates / deviations 六个 typed 面；lens 留在 `topics.md`（D43 的家），plan 不加 cell 列，method-library 不动 schema，Brief 不独立成对象，style 留 v2。** effort 数字按盘上实测收成 6 / 12 / 12 节点带；5 行投影进 `question.md`，HITL1 卡仍用 3 维度压缩守住 200 字。

## 0. 一句话

**缺的仍然是一个「解析后的研究设计」，但这个设计不必把已经落地的维度再收一遍。** v1 = `protocol.json`（六个 typed 面）+ `question.md` 5 行投影 + 纯判据 gate + `run-accept` 第四道；用 D43 已有的 lens 家、用现有 plan 模板、用方法库四字段快照，不新开第二份真相。

## 1. 这遍做了什么

1. **逐条核对**两份材料对现状的断言（不是重述设计）：数字、路径、门禁、模板、工具面。
2. **量**：63 个 bundle 的字段在场率、跨文件漂移、节点/波次/cells 分布、计划卡长度。
3. **收口**：把 §11 的六项结构选择逐项判成「已由 D43 决定 / v1 做 / v1 不做」，并补上材料里没有的 lens、plan 列、output 模板、hash 基线四项。
4. **落点**：把 v1 收窄到四件工件 + 一道门，给出 issue 的验收面与试点判据。

## 2. 语料与口径

- 盘上 63 个 `drt_*`（11 个活跃 + 52 个 `archive/`）；其中 17 个有 `plan.md`，14 个有 `run.md`；工作区方法库 1 条（「格局调研」，非默认）。
- 外部证据不重做：第三遍已覆盖 11 产品 + 8 开源 + 2024–2026 澄清/个性化 13 篇；第四遍已覆盖 style 空间与 2026 claim-level 证据。本遍只核「这些维度在盘上是否已有家、家是否被用过」。
- 只读：未改 pack、模板、门禁、工作区文件。所有数字可用 `node` 复算；口径写在 §4.5。

## 3. 事实核验

| # | 材料断言 | 盘上事实 | 判定 / 处置 |
|---|---|---|---|
| 1 | 偏好/搜索配置散在六个家，没有解析结果 | 63 个 `question.md`：22 个有 `- 采用:`，3 个有 `- 本次视角:`，53 个有 `- 深度与篇幅:`，58 个有 HITL1 Snapshot，14 个有 `run.md`；**41/63 既无 `§研究方法 - 采用:` 也无 Snapshot `- 研究方法:` 行** | 成立，且更强：不是「多处重复」，而是**多数 run 从未 typed 记录方法**。v1 的收益是「有家 + 可机检」，不是「修既有矛盾」 |
| 2 | `manual.md` 12,038 / 12,288 字符 | `packages/deep-research-pack/content/manual.md` = 12,038 字符；cap = `scripts/verify/gates/e-workspace.mjs:28` 的 12,288 | 确认；**Protocol 规则不能进 manual**，只能进 skill / 模板 |
| 3 | `research-brief` skill 8,490 字符 | 实际 8,661 字符 | 小漂移；预算仍够（净增 ≤1.5KB 的估计可用） |
| 4 | 本地 0/58「采用库条目」 | 库 1 条；63 个 bundle 中 0 个写「采用库条目」；1 个显式写「未采用库条目」（`drt_gpu-vs-cpu-idc-ops`） | 确认（0/63）。库 v1 **冻结**：`method-library.md` 四字段、`method_library_*` 工具、Method Editor 与驾驶舱都不动 |
| 5 | `cell = topic × lens × depth`，本材料提议改成 `topic × lens` | D43 与 `docs/design/30-methodology-mapping.md:20`、`presets/lead/skills/research-planning/SKILL.md:54,63` 都已写 **cell = topic × lens**；depth 是 node 属性 | **第 1 项已由 D43 决定**，不是未决项。改的是研究题名页 §5 的旧口径（见 §8.1），不是共享合同 |
| 6 | how：`plan.md` 节点表加 `cell` 列 | `research-planning/SKILL.md:54` 明写「lens 是 cell 属性，**不写 plan 列**」；`plan.md` 模板已有 `## lens 与 activation` 节声明 cells；`plan-index.ts` 按表头名读列（加列不会解析崩，但会多一份真相） | **不做**。cells 的唯一家 = `topics.md` 的 `lenses:`；执行侧声明 = `## lens 与 activation`；gate 从 topics 读 cells，不靠 plan 列 |
| 7 | 数据模型：Protocol 含 `lens_plan` | `topics.md` 的 `lenses:` 是 D43 落地的 per-topic 选择面；`question.md - 本次视角:` 是全量投影 | **v1 不做 `lens_plan`**（会造第二个家）。`protocol-audit` 从 topics 读 lens 并汇总 cells，写进审计报告；v2 若 Protocol 证明确实需要拥有 lens，再谈把家搬过来 |
| 8 | how：HITL1 5 行投影 ≤200 字 | 5 行模板本身 138 字；`research-brief/SKILL.md:51` 的卡体还含问题一句话、业务决策简报、topic 骨干、执行图骨干、指针；lens pilot 三张卡 171 / 183 / 200 字 | **5 行不能整张卡**。拆开：`question.md §Protocol` = 5 行投影（审计面）；卡 = 3 个维度（方法/来源/输出，必要时加投入一行）+ 业务简报 + 指针；仍 ≤200 |
| 9 | 数据模型：`OutputTemplate` 枚举含 `comparison_table`，§5.3 示例却写 `template: comparison` | 枚举与示例不一致；包内**没有任何 output template 文件**（只有 `final.md`）；`format` 里的 pdf/docx/pptx 当前无生成工具 | 改成 `output.shape` 闭集（6 值，**不是文件目录**）；v1 `format` 只允许 `md`；`literature_review` 可作形状，但必须显式写「不做系统综述承诺」 |
| 10 | how：effort 数字 quick `nodes_max:4` / deep `16` | 实测 quick 2–6 节点（5 场），standard 8–12（4 场），deep 10–16（5 场）；`research-planning/SKILL.md:63` 顶层节点 ≤12 | quick 4 太紧；deep 16 与现有 ≤12 合同冲突。**v1 用 6 / 12 / 12**（见 §4.3）；不引入 `calls_max`、不写时间估计（盘上无读数） |
| 11 | 第四遍：style = `style_ref` + `gates.profile`；v1 可加 prose `style:` | `style_ref` / profile / style catalog 都不存在；本卡若同时上 style，会多一个用户选择 + 一套验收 | **本卡不做 style**（连 prose 标签也不加）；style 留给 v2 独立卡。第 7 项结论 = 「v2，且不在本卡」 |
| 12 | how：hash 由 gate 算，写进 `protocol-audit.md`；模型不写 hash | Lead 无 bash（`presets/lead.patch.yml` 工具面 = fs / fs-search / web / skill / todo / ask / goal / present / subagent / session-query）；HITL1 时没有 gate 运行点 | **审批证明 = `§Decisions` 行 + 5 行投影，不是 hash**；hash 只做「验收后/重跑前文件没被静默改」的探测器。v2 若要审批时钉 hash，得上 `protocol_check` 窄 host 工具 |
| 13 | 数据模型：`brief_ref` + Brief 版本/hash | `question.md` 没有 Brief 对象；Purpose/Scope/Constraints 是叙事；HITL1 Snapshot 是过程记录 | **v1 不引入 Brief 对象、不写 `brief_ref`**；Brief 继续住 question.md 三节。v2 若要「多个 Brief 版本」，再补 |
| 14 | how：`plan.md` 头部 `protocol: v1`；`review.md` 头部 `protocol: vN` | plan 是 lead 模板；review 是 critic 写的自由文件，无模板 | **plan 头部加一行**（便宜、可检）；review 头 v2 再要求。先不碰 review 形状 |
| 15 | 数据模型：Library v1 加 version/provenance | `method_library_upsert` 的 entry 是完整 Markdown + `operationHash` + `defaultAction`；Method Editor 与驾驶舱都按四字段/`provenance` 解析 | **v1 不改**。Protocol 的 `method.fields` 是四字段快照，`library_name` + `library_fields_sha256` 可选；库后续改了不影响已批准 run |
| 16 | 新增 `content/templates/run/protocol.json` | `tests/pack/content-injection.test.mjs:13` 的 TEMPLATES 是显式清单；`dev/render-overlay.mjs` 管 run 通道镜像 | 加模板 = 同 diff 改 TEMPLATES 测试 + 重渲染 overlay；不是零成本，但很小 |
| 17 | 数据模型 §6 不变量 2 / 9 / 10（Brief 版本、Protocol hash、lens 一致） | 分别依赖 Brief 对象、审批时 hash 基线、Protocol 拥有 lens | **v1 删这三条**；换成「projection 一致 + 版本一致 + effort/output 自洽」（见 §6.8） |

## 4. 实测

### 4.1 字段在场率（63 个 bundle）

| 字段 | 位置 | 在场 | 读法 |
|---|---|---|---|
| `- 采用:` | `question.md §研究方法` | 22 | 新模板才有；旧 40 个连 §研究方法 节都没有 |
| `- 来源:` | 同上 | 22 | 与「采用」同批 |
| `- 本次视角:` | 同上 | 3 | lens 层 2026-11-10 才落地，不能当采用率证据 |
| `- 深度与篇幅:` | HITL1 Snapshot | 53 | 深度是唯一几乎一直在的偏好字段 |
| `- 研究方法:` | HITL1 Snapshot | 22 | 与 `- 采用:` 同批 |
| `lenses:` | `topics.md` | 6 | 3 个 wave pilot + 3 个近批 lens run；不能当采用率 |
| `run.md` | bundle 根 | 14 | 新契约 run；epoch 断代可用 |

**结论**：现状不是「六个家都写满了、互相打架」，而是**大多数 run 只有深度一个 typed 偏好**。Protocol 的第一价值是「让下一次 run 有可解析的方法/来源/投入/输出」，第二价值才是「对账」。

### 4.2 跨文件漂移（能机检的部分）

- `- 本次视角:` 与 topics `lenses:` 的并集：2/63 有「只在 question、没有 topic 使用」的 lens（`structural`，两场）；这不是错误，是「全量选择」与「per-topic 分配」的关系没有写清。
- 方法：可比的 22 个 bundle 里 0 个「`- 采用:` 与 Snapshot `- 研究方法:` 冲突」。
- 深度：0 个可检冲突；plan 节点 depth 分布在更小的子集里，未见与 HITL1 档位矛盾。
- 因此：**「漂移严重」这个动机不成立**；v1 的 `projection-drift` 门是防未来 + 防手改，不是修历史。这个诚实结论应写进 issue，避免用不存在的痛点论证加门。

### 4.3 effort 实测（17 个有 plan 的 bundle）

| 档 | n | 节点范围 | 波次范围 | topic | cells | 备注 |
|---|---|---|---|---|---|---|
| 快答 | 5（另 3 个 pilot 无档位） | 2–6 | 1–5 | 1 | — | `drt_node24-lts-status` 6 节点 / 5 波 |
| 标准报告 | 4 | 8–12 | 5–6 | 3–4 | 1 场 = 7 | 无超 12 |
| 深度报告 | 5 | 10–16 | 5–7 | 7–11 | — | 16 = `drt_eu-us-cn-ai-stack`；13 = `drt_ai-game-production` |
| 全体 | 17 | 中位 8，p90 13，max 16 | 1–7 | 1–11 | — | 顶层节点合同 = ≤12（`research-planning:63`） |

**v1 band（写死并 pin 版本）**：

| band | nodes_max | cells_max | allowed_depths | waves_max（warning） |
|---|---|---|---|---|
| `quick` | 6 | 2 | L0, L1 | 5 |
| `standard` | 12 | 8 | L1, L2 | 6 |
| `deep` | 12 | 12 | L1, L2, L3 | 7 |

- **deep 用 12 不用 16**：16 是单场观测，现有 skill 写 ≤12；v1 不为一场景改合同。若 pilot 证明 12 压死深挖，再带证据升，不在本卡里先放宽。
- **waves 只 warning**：Wave 由 deps 算出，不是预算输入；卡死会误伤 review/gate 回边。
- **不写 `calls_max` / 时间估计**：盘上没有可靠读数；hack 一个数字会把「可读性」变成「假精确」。

### 4.4 计划卡长度

- lens pilot 三张：171 / 183 / 200 字；上限 200（`scripts/lib/plan-card.mjs:19`），口径 = `ask` 的 `question` 字段全长。
- 5 行投影模板 = 138 字；加上问题一句话、业务简报、指针必超 200。**卡必须压缩**：3 个维度 = 方法 / 来源 / 输出（投入折进方法行或单独半行），topic/执行图骨干删到「W1→W3→W5」级别，或只留 `全文 = …` 指针。
- 这不是文案问题：200 字是 `node-gate` 门① 的 WARN 口径与升硬门前置，不能在本卡里抬。

### 4.5 口径与已知边界

- 17/63 有 plan、14/63 有 run.md：**样本偏新**，老 bundle 的方法字段缺失是模板历史，不是执行质量。
- 没有用户研究：HITL1 是否「够 informed」只有 lens pilot 的 3 张卡与操作者观察，不能当 adoption 证据。
- 没有时长/调用数读数：effort 的「可读性」先给节点/cells/深度，时间与费用等试点采集。
- lens 层只落了 1 天，3 个 run 的 `本次视角:` 不能证明 lens 采用率，也不能证明 Protocol 该不该拥有 lens。

## 5. 结构选择收口

| # | 选择 | 结论 | 证据 / 理由 | v1 动作 |
|---|---|---|---|---|
| 1 | `cell` 定义 | **已由 D43 决定：`topic × lens`**；depth 是 node 属性 | D43；`design/30:20`；`research-planning:54,63` | 不改合同；只改研究题名页 §5 的旧口径（§8.1） |
| 2 | Protocol 住哪 | `protocol.json` + `question.md` 5 行投影 | 嵌套结构；`claims.json`/`verdicts.json` 先例；gate/cockpit 易读 | 做；`question.md-only` 保留为退路 |
| 3 | Library v1 | **冻结**：不改 `method-library.md` schema / 工具 / UI | 0/63 采用；四字段工具链已定；改版本要动 D25/D37 公共面 | 不做；Protocol 只存四字段快照 |
| 4 | source scope 放哪 | Brief 写「姿态」（`§Constraints - 来源偏好:`），Protocol 写解析后的 typed `source_scope` | 第三遍：来源范围是 8 家 table stakes、我们最大缺口；证据卡只记事实 | 做 |
| 5 | 中途改 Protocol 的阈值 | method / source_scope / effort / output / gates 变更 = Protocol v2 + 快照 + journal；plan-only 变更不升协议；范围/交付形态变更回 HITL | 设计微调不打断；用户批的是设计 | 做（v1 只检版本与快照，不检语义级 deviation） |
| 6 | gates 归属 | 出厂 policy + 题型，不作为用户偏好开放 | 批准门不能被「偏好」关掉 | 做；`gates` 只存枚举，用户不可改 |
| 7 | style 归 Library/Catalog，Protocol 只存 `style_ref` | **v2，不在本卡**；v1 连 prose 标签也不加 | style 需要 acceptance profile；本卡已够大；避免第二个未验证轴 | 不做 |
| 8 | lens 是否进 Protocol（本遍新增） | **v1 不进**；lens 的家仍是 `topics.md` + `question.md - 本次视角:` | D43 刚落地；一卡一面；cells 可从 topics 算；进 Protocol 会造第二份真相 | 不做 |
| 9 | plan 加 cell 列（how 提议） | **不做** | `research-planning:54` 明写不写 plan 列；plan 已有 `## lens 与 activation`；`plan-index` 表头驱动但不需要多一份 | 不做 |
| 10 | effort 数字 | **6 / 12 / 12 节点带；cells 2 / 8 / 12；deep 不超 12**；waves 只 warning | §4.3；现有 ≤12；不发明 calls/time | 做；`band_v` pin 版本 |
| 11 | output 模板/格式 | **`output.shape` 闭集 6 值，不是文件目录；v1 `format: md` only** | 包内无模板文件；pdf/docx/pptx 无生成工具；`comparison` vs `comparison_table` 是材料内部不一致 | 做；`literature_review` 带「非系统综述」caveat |

**第 12 项（本遍补）**：**Brief 不独立成对象**、**hash 不是审批证明**、**review 头 v2**——见 §3 #12/#13/#14。

## 6. v1 合同

### 6.1 落点

```text
drt_<slug>/
  protocol.json              # canonical 当前版（6 个 typed 面 + 版本/状态）
  protocol/v<N>.json         # 旧版快照（每次设计级变更前复制）
  protocol-audit.md          # gate --write 的报告（vN → design_sha256；派生件，模型不写）
  question.md                # §Protocol 5 行投影 + §Decisions 的 HITL1 行（protocol: vN）
  plan.md                    # 头部 protocol: vN（节点表不加 cell 列）
  topics.md                  # lens 的唯一家（cells 由它算）
  review.md / evidence/      # 不变；review 头 v2 再要求
```

### 6.2 `protocol.json`

```yaml
protocol:
  schema: 1
  version: 1
  status: draft | approved | superseded
  created: "2026-11-11T06:30:00+08:00"
  approved_at: null

  method:
    id: 方案比较
    kind: preset | library | custom
    library_name: null            # kind=library 时写
    library_fields_sha256: null   # 可选；只作漂移 warning，不做红
    fields: {source: "...", verify: "...", report: "...", limit: "..."}
    adjustments: ["..."]

  source_scope:
    families: [official, web]     # 枚举并集
    domains: ["aws.amazon.com"]   # 可选；host 形态
    exclude_domains: []
    recency: "12m"                # \d+(d|w|m|y) 或 null
    language: [zh, en]
    authority: primary            # primary | secondary | any

  effort:
    band: standard                # quick | standard | deep
    band_v: 1                     # pin 住 band 表版本
    nodes_max: 12
    cells_max: 8
    waves_max: 6
    allowed_depths: [L1, L2]

  output:
    shape: comparison_table       # quick_answer | full_report | one_page_memo | comparison_table | timeline | literature_review
    sections: [decision, options, criteria, tradeoffs, risks]
    length: {min: 1200, max: 1600, unit: words}   # 或 null
    format: md
    audience: "CTO"

  gates:
    hitl1: protocol_projection    # protocol_projection | none
    hitl2: review                 # review | none
    evidence_threshold: B         # A | B | C
    critic: both                  # report | claim | both | none
    claim_verification: on        # on | off

  deviations:
    - {dimension: source_scope, from: "method default", to: "official+web", why: "价格/容量优先", authority: user}
```

**字段边界**：

- `method.fields` 是**钉住的四字段副本**，不是库的镜像；库后续修改不改变已批准 Protocol。
- `source_scope` 是解析结果；`families` 至少一个，`domains` 只收 host（不带 scheme/path）。
- `effort` 的四个数字必须与 `band_v` 的 band 表一致（gate 查表）；`band_v` 未知 = 红。这样「数字是 pin、表是版本」两者都在。
- `output.shape` 不是文件模板，「模板」在 v1 只是形状 + sections 约定；`format` 只允许 `md`。
- `gates` 是 policy 快照，不是用户偏好；gate 只检枚举与「批准门没被关掉」。
- `deviations.authority` = `user | library | method | type_default | system`；`style` v2 再加。

### 6.3 不写进 JSON 的东西

- **不写 `hash`**：模型算不出来（Lead 无 bash）；hash 由 gate 写在 `protocol-audit.md`。
- **不写 `brief_ref` / Brief 版本**：v1 没有 Brief 对象；Brief = `question.md` 三节 + `§Protocol` 投影。
- **不写 `lens_plan` / `cells`**：lens 的家在 `topics.md`；cells 由 gate 汇总到审计报告。
- **不写 `style_ref` / `gates.profile`**：v2。
- **不写 `calls_max` / 时间估计**：没有盘上读数。

### 6.4 canonical / hash / 审计

- **canonical JSON**：key 递归排序、2 空格缩进、UTF-8、结尾一个 `\n`、无尾随空白。
- **design body** = `{schema, version, method, source_scope, effort, output, gates, deviations}`（**不含** `status` / `approved_at` / `created`）。`design_sha256 = sha256(canonical(design body))`。
- `protocol-audit.md` 由 gate `--write` 落；含表头 `v<N> design_sha256=<hex>`（每版一行，旧行保留）+ 检查表 + 「不核什么」。
- **gate 的行为**：当前 body 的 hash 与 audit 中同版本行不一致 → `protocol-changed` 红；版本升了但没有 `protocol/v<旧>.json` 快照 → `protocol-snapshot` 红；没有 audit 行 → `audit-missing` warning（首次 `run-accept --write` 可补）。
- **边界（必须写进 issue 与 Note）**：hash 不是审批证明。审批证明 = `§Decisions` 的 HITL1 行（含 `protocol: vN`）+ `§Protocol` 投影 + `status: approved` 三者一致。hash 只防「验收后/重跑前文件被静默改」。要在 HITL1 当时钉 hash，得上 `protocol_check` 窄 host 工具（v2，判据 = 模型自写非法率 >10%）。

### 6.5 投影与卡

**`question.md §Protocol`（审计投影，5 行 + 指针）**：

```markdown
## Protocol（本次研究设计，v1）

<!-- 5 行投影；canonical = protocol.json；本节目检；细节看 JSON。 -->

- 方法：方案比较（官方+实践，3 面）
- 来源：官方+网页，近 12 月，中英，primary
- 投入：标准（≤12 节点 / ≤8 cells / L1–L2）
- 输出：对比表 + 决策摘要（md，CTO）
- 计划：W1 扫描 → W2 深挖 → W3 审查（cells 见 topics.md）
- 全文 = protocol.json / plan.md
```

**HITL1 卡（3 维度压缩，仍 ≤200 字）**：

```text
问题：<定稿一句话>
方法/来源：方案比较；官方+网页，近 12 月，中英
投入/输出：标准（≤12 节点）；对比表 + 决策摘要（CTO）
决定：<业务简报的决定/范围/未知>
全文 = protocol.json / plan.md
```

- 卡上默认不写 lens（D43 现行纪律：偏离才写一个短词）；`投入` 行可并入「方法/来源」行以省字。
- **拍板后**：Lead 把 `status` 改 `approved`、写 `approved_at`，并在 `§Decisions` 首条写 `protocol: vN`；修订一轮制同步改 JSON + 投影，不二次呈卡。
- 超 200：先删「计划」与 topic 骨干，再删括号旁白；**不递超限卡**（`research-brief/SKILL.md:54` 纪律不变）。
- 投影 gate 只查**版本 + 方法名 + band + shape + 指针**（归一化字符串），不查文风；卡的行为由 `node-gate` 门① 与试点观察。

### 6.6 epoch 与适用面

- `PROTOCOL_CONTRACT_DATE = '2026-11-12'`（实现落地日；同 D44 的 2026-11-11 形态）。
- 适用 = 非 legacy 且 `epochDateOf(bundle) >= PROTOCOL_CONTRACT_DATE`；`epochDateOf` 读 `run.md` 的 `created/contract`，回退 mtime（复用 `schema-scan-core` 的既有函数）。
- 旧 bundle：`legacy-not-applicable` warning + exit 0。
- **quick_factual**：仍写 `protocol.json`（方法=事实核查、来源=official、effort=quick、output=quick_answer），但 `gates.hitl1: none`，**不要求 `§Decisions` 行**；gate 只查 schema / effort / output / 投影（若有）。
- 新 run 缺 `protocol.json` → `no-protocol` 红；`--require` 给测试强制。

### 6.7 gate 检查表

| code | 检查 | 级别 |
|---|---|---|
| `protocol-schema` | JSON 可解析、顶层字段闭集、类型、枚举 | 红 |
| `protocol-version` | `schema=1`、`version` 正整数、`status` 枚举 | 红 |
| `unknown-ref` | `method.id` 不在 preset 五条 + custom 许可；`output.shape` 不在 6 值；source family 不在枚举 | 红 |
| `method-fields` | 四字段非空；`kind=preset` 时 id ∈ 五条 | 红 |
| `source-scope` | families 非空；domains/exclude 是 host；recency 匹配；language 非空串；authority 枚举 | 红 |
| `effort-band` | `band_v` 已知；四数字 = band 表；`allowed_depths` 非空且 ⊆ L0–L3 | 红 |
| `effort-contract` | plan 顶层节点数 ≤ `nodes_max`；topics 的 lens 总数 ≤ `cells_max`；plan depth ⊆ `allowed_depths` | 红（waves 超 = warning） |
| `output-shape` | shape 枚举；sections 非空；length `min ≤ max`、unit ∈ words/pages；format = md | 红 |
| `protocol-status` | 非 quick：`status=approved` 且 `approved_at` 非空，`§Decisions` HITL1 行含 `protocol: vN`；quick：`status=approved` 且 `gates.hitl1=none`（无 Decisions 也可） | 红 |
| `projection` | `§Protocol` 含 `protocol: vN`、方法名、band、shape、`protocol.json` 指针；`§研究方法 - 采用:` 的方法名与 `method.id` 一致（`method-of-question.ts` 的五态不破） | 红 |
| `protocol-changed` | 当前 design hash ≠ audit 同版本行 | 红 |
| `protocol-snapshot` | `version > 1` 时 `protocol/v<version-1>.json` 在场 | 红 |
| `plan-ref` | `plan.md` 头部 `protocol: vN` 与 JSON 一致 | 红 |
| `audit-missing` | `protocol-audit.md` 无当前版本行 | warning |
| `legacy-not-applicable` | 契约日前 / 无 protocol.json 的旧 bundle | warning + exit 0 |

### 6.8 v1 不变量（可机检）

| # | 不变量 | 门 |
|---|---|---|
| 1 | Protocol 字段/枚举/引用存在 | `protocol-schema` / `unknown-ref` |
| 2 | 非 quick 的 approved ↔ `§Decisions` 行 ↔ 投影版本 | `protocol-status` / `projection` |
| 3 | 当前 design hash 与 audit 同版本行一致 | `protocol-changed` |
| 4 | 版本 >1 有旧版快照 | `protocol-snapshot` |
| 5 | 顶层节点 ≤ `nodes_max`；cells（topics）≤ `cells_max` | `effort-contract` |
| 6 | plan 每个 node 的 depth ⊆ `allowed_depths` | `effort-contract` |
| 7 | output shape/sections/length/format 自洽 | `output-shape` |
| 8 | `§Protocol` 投影与 JSON 的版本/方法/band/shape 一致 | `projection` |
| 9 | `plan.md` 头 `protocol: vN` 与 JSON 一致 | `plan-ref` |

**删除的旧不变量**：Brief 版本一致（无 Brief 对象）、lens 一致（lens 不在 Protocol）、library-pin（快照即 pin，不连库）、coverage/output 终稿（v2）、source-consistency 语义（v2，归 critic）。

### 6.9 gate 不核什么

- 不核 quote 真伪、claim 完整性、coverage 质量、final 的 sections/length 是否真的兑现（v2 的 output-contract）。
- 不核 source_scope 与 method.source 的语义一致（方法四字段是 prose；冲突只能由 Lead 记 deviation、critic 审）。
- 不核 library 条目是否被后续修改（快照即 pin；只做 `library_fields_sha256` 漂移 warning，需读工作区时可选）。
- 不核 lens 的 per-topic 完整性（D43 的 critic 覆盖表继续负责）。
- 不核 style/acceptance profile（v2）。

## 7. 三个倾向的纸面跑（v1 字段）

| 倾向 | Brief | Protocol | Plan（示意） | gate 预期 |
|---|---|---|---|---|
| **官方口径核查** | 决策=采购前核价；读者=采购；来源姿态=official / 6m / primary；深度=快答；输出=quick_answer | method=事实核查（preset）；source_scope={official, 6m, primary, zh+en}；effort=quick（6 / 2 / L0–L1）；output={quick_answer, sections:[answer, basis, limits], 300–600 words, md}；gates 出厂 | 2–3 节点：scan → dive → check | schema/effort/output/投影过；无 lens in JSON；`§Protocol` 5 行；卡 3 维度 |
| **学术综述** | 决策=研究立项；读者=研究者；来源姿态=academic / 5y / primary；深度=深度；输出=literature_review | method=领域地图（preset）；source_scope={academic, 5y, primary}；effort=deep（12 / 12 / L1–L3）；output={literature_review, sections:[scope, corpus, threads, gaps, refs], 6000–12000 words, md} | 8–10 节点：scan → dive ×4–6 → cross → synthesis → review | effort 顶层 ≤12；cells 从 topics 算 ≤12；`literature_review` 允许，但 final 必须写「非系统综述、未做 inclusion 统计」 |
| **监管对比** | 决策=合规选型；读者=合规/法务；来源姿态=regulatory+official / 18m / primary；深度=深度；输出=comparison_table | method=方案比较（preset）；source_scope={regulatory, official, 18m, primary}；effort=deep（12 / 12 / L1–L3）；output={comparison_table, sections:[jurisdictions, obligations, effective_dates, penalties, gaps], 3000–6000 words, md} | 9–12 节点：每法域 dive + cross + synthesis + review | `sections` 必须含「每法域一行」的约定；gate 只查 shape，不查矩阵语义（critic） |

**跑下来的观察**：

- 三个倾向都能落到同一组字段；差异只在 method/source/effort/output 的取值——**不需要新 schema**。
- 最需要补的不是字段，而是 **output.sections 的约定**（`literature_review` 的 corpus/inclusion、`comparison_table` 的每法域一行）；v1 把它写进 skill 的 shape 说明，不建模板目录。
- `quick` 的 6 节点上限对「官方核查」够用；`deep` 的 12 节点对「学术综述 / 监管对比」够用，但 12 cells 的分配要靠 topics（lens），不在 Protocol 里。

## 8. 与现有合同的边界

### 8.1 要改的研究题名页旧口径

- `_backlog/research/README.md` §5 的 `cell = topic × lens × depth` 改为 `cell = topic × lens`（depth = node 属性，D43）；这是研究共享上下文的陈旧句，不是 pack 合同。
- 同一节「lens 目录（提议，未建）」已过时（D43 已建 `content/lenses/` 8 条）；顺手校正，避免下一位 agent 又被误导。
- 偏好层题名页不再保留「六项待拍板」口径；数据模型与 how 材料顶部加「2026-11-11 收口」指针，指向本材料，不改写提案原文。

### 8.2 不改的合同

| 合同 | 为什么不改 |
|---|---|
| D43 lens（topics 选择、八字段证据、覆盖表） | v1 的 Protocol 不拥有 lens；gate 只读 topics 算 cells |
| D44 claim verdict（claims/verdicts、epoch 2026-11-11） | 独立门；Protocol gate 接在它后面，不重叠 |
| D45 wave 执行（`## Wave 执行`、`task_id=plan-only`） | 不改 plan 形状；cells 仍由 topics 算 |
| D25/D37 方法库 / Method Editor / 驾驶舱 | 不改四字段、不改工具 schema、不改 UI |
| D33 run schema=2 | 不加 `run.md` 字段；epoch 沿用现有 `epochDateOf` |
| D40 内容随包 / 模板清单 | 加 `protocol.json` 模板 = 改 `content-injection` TEMPLATES + 重渲染 overlay；manual 不加字 |
| 200 字计划卡 | 不抬上限；卡改 3 维度压缩，投影住 question.md |
| `method-of-question.ts` 五态 | `§研究方法 - 采用:` / `- 来源:` 保持可读；Protocol 只加审计投影，不改解析器；gate 查两边方法名一致 |
| 两点交互 | 不加第三问；source/output 在既有三问 + 计划卡里解决 |

### 8.3 同步面（漏一处就漂移）

- `dev/research.overlay.yml`：改 pack 后 `node dev/render-overlay.mjs`；`overlay-fresh` 门禁。
- 模型可见面：`presets/lead/skills/research-brief/SKILL.md`、`presets/lead/skills/team-assembly/SKILL.md`（Protocol slice：method/source/effort/output 随派发 brief）、`presets/scout/skills/lead-mapping`（或同族 skill，按 source_scope 找源）、`presets/lead.patch.yml`（persona 计划卡段）、`presets/critic/skills/adversarial-review/SKILL.md`（按 Protocol 审一句）、`content/templates/run/{question,plan,protocol.json}` → L1 `preset-smoke` + L3 snapshot B + L4-lite。
- 包形状：`tests/pack/content-injection.test.mjs` 的 TEMPLATES 加 `protocol.json`；`package.json files` 已含 `content/**`，无需改。
- 评估账：`docs/evaluation.md` L4 加第 ⑥ 行（机器判据）+ `tests/contracts/evaluation-contract.test.mjs` 断言；`scripts/README.md` 的 run-gates / lib 两表加 `protocol-audit` / `protocol-core`。
- 决策账：`docs/decisions.md` 加 **D46**（≤800 字，用户签）；`docs/design/30` 的 setup 行或方法层加一句 Protocol 指针；pack README 的模板清单若逐件列出则加一行。
- 卡与 Note：issue 关闭同变更写 `notes/implemented/2026-11-11-preference-protocol-layer.md`；研究题名页 `产出的卡` 指 issue。

## 9. 试点与判据

**试点 = 3 场**（1 快答 + 2 深度；都用真实用户题）：

1. 官方口径核查（P1/P2，quick）——验 quick 免第二段计划卡（第一段三问照旧）+ `protocol.json` 仍写 + source/official typed。
2. 学术综述（P3，deep）——验 `literature_review` 形状 + 12 cells 上限 + 非系统综述 caveat。
3. 监管对比（P5/P6，deep）——验 `comparison_table` sections + 每法域 + source regulatory。

**记录**（进 Note，不进 CI）：

- HITL1 卡长（≤200）、HITL1 时长（相对现状，目标 ≤+20%）、修订次数；
- Protocol 非法率（gate 红项 / 3 场，目标 ≤10%）；协议级变更次数（目标 ≤1/场）；
- 用户能否在不开文件的情况下复述「方法 / 来源 / 输出」；
- 是否出现「改来源/改输出」而不是「重跑」；
- 旧 bundle 仍全绿（epoch 豁免）。

**失败判据（触发回 `推敲中`）**：

- 卡频繁超 200；用户说「别给我看这个」；
- gate 红项 >3/场；协议变更 >2 次/场；
- critic 说 coverage 没法按 cell 填（说明 cells 的算法或家不清楚）；
- quick_factual 写 `protocol.json` 明显拖慢（操作者主观 + 时长读数）。

## 10. 未决（用户拍板）

| # | 问题 | 推荐 | 影响 |
|---|---|---|---|
| 1 | v1 是否接受「Protocol 减掉 lens_plan / plan cell 列 / Library 版本 / Brief 对象 / style」这五刀 | 接受 | 决定本卡范围；拒绝任一刀则回到 `推敲中` 或拆卡 |
| 2 | 深挖档节点上限 = 12（沿用）还是 16（观测） | 12 | 决定 `deep` band 与是否改 `research-planning` 的 ≤12 |
| 3 | 是否授权落地 + 登记 D46 | 授权 | `待落地` 不是授权；公共行为 + D 号归用户 |

**不在本卡拍板**：style 的 v2 形态、Library 版本化、output 终稿机检、coverage 门、cockpit 投影——各自试点/独立卡。

## 11. 来源 / 锚点

- 设计与 how：[数据模型](2026-11-10-preference-protocol-data-model.md) / [怎么落](2026-11-10-preference-protocol-how.md)。
- 外部维度：[第三遍·偏好层](../external-landscape/2026-11-10-landscape-preference-layer.md) §3–§5、§8.2；[第四遍·style](../external-landscape/2026-11-10-landscape-style-space.md) §8.7–§8.8。
- 盘上事实：
  - `packages/deep-research-pack/content/manual.md`（12,038 字符；§研究视角、§交互纪律、§事实的 owner）；
  - `packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md:50-57,84-85,116-117`（HITL1 卡、200 字、lens 落格）；
  - `packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md:54,63`（cell 不写 plan 列、≤12）；
  - `packages/deep-research-pack/content/templates/run/{question,topics,plan}.md`；
  - `scripts/lib/plan-card.mjs:16,19`（标签、200）；`scripts/lib/verdict-audit-core.mjs:25`（epoch 形态）；
  - `scripts/run-ops/run-accept.mjs:99-105`（预检链）；`scripts/verify/gates/e-workspace.mjs:28-30`（manual cap）；
  - `packages/deep-research-pack/src/method-library-tool.ts:44-52`（四字段 + operationHash）；
  - `packages/deep-research-pack/src/lib/plan-index.ts:152-167`（表头驱动读列）；
  - `tests/pack/content-injection.test.mjs:13`（TEMPLATES 清单）。
- 决策：D43（lens）、D44（claim verdict）、D45（wave）、D25/D37（方法库/Method Editor）、D33（run schema）、D40（内容随包）。
- 实测脚本口径：`node` 扫 63 个 `drt_*` 的 `question.md` / `topics.md` / `plan.md`；节点 = plan 表中非 retired/merged/superseded 的 `W<n>.<i>` 行；cells = `## lens 与 activation` 的 `= N` 或 topics `lenses:` 并集；档位读 `- 深度与篇幅:` 前缀（快答/标准/深度）。
