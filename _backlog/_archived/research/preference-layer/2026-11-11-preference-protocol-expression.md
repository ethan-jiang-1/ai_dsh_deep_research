---
topic: 偏好层表达层补篇：同一份研究设计在批准、派发、审查、交付四个时刻的投影
intent: 在数据层 v1 合同之外，盘一次 run 里「研究设计」被表达的全部表面与时刻，量出计划卡/派发 brief/review/HITL2/final 头的缺口，给出 v1 必做的表达合同（五个派生投影 + 四条规则）与 v2 延后项；并反推数据层的两个语义澄清（复合方法、批准类型）。
---

# 表达层补篇（2026-11-11）

> 性质：v1 合同修订提案。只读盘上与文本；未改 pack / 模板 / 门禁 / 卡片。
> 上游：[数据模型](2026-11-10-preference-protocol-data-model.md) · [怎么落](2026-11-10-preference-protocol-how.md) ·
> [核验与收口](2026-11-11-preference-protocol-verification.md) ·
> [第三遍·偏好层](../../../research/external-landscape/2026-11-10-landscape-preference-layer.md) ·
> [第四遍·style](../../../research/external-landscape/2026-11-10-landscape-style-space.md)。
> **结论先行：数据层不是不够，而是不够「到人」。** v1 的 `protocol.json` 若只接 gate、不接四个时刻
> （HITL1 卡 / 派发 / critic / HITL2+final），它会变成又一份手写表达，而不是单一真源。表达层缺口 =
> **5 个派生投影 + 4 条规则 + 2 个数据层语义澄清**；全部是 skill / persona / 模板文本 + core 的
> 两条判据——不新增客户端、不新增 host 工具、不新增交互点。

## 0. 一句话

**批准的是卡，不是 JSON。** 用户在 HITL1 看到的那 200 字，是这份设计的唯一用户面；gate 却会检查
一份用户没看过的 JSON。表达层的任务就是让两者对齐：**卡上没出现的字段，只能是出厂策略或由已展示
字段唯一决定；反过来，每个改变「研究什么 / 从哪来 / 做多少 / 交什么」的字段，必须在卡上有一行。**

## 1. 这遍做了什么

1. **盘上量**（63 个 bundle、6 张计划卡、6 张 HITL2 卡、53 份派发 brief、59 份 final 头、1 处驾驶舱读法）。
2. **读模型可见面**：`research-brief`、`lead.patch.yml` persona、`team-assembly`、`adversarial-review`、
   `question/plan/final` 模板、研究手册。
3. **对账 v1 合同**（核验 §6）与 how 材料 §4：how §4.3 写了「HITL2 摘要引用 Protocol」，v1 合同
   没有把它带进 M3——**闭环是在收口时掉的，不是一开始没想到**。
4. **反推**：表达层缺口要求数据层先回答两个语义问题——复合方法怎么落、无卡/修订时「approved」
   到底什么意思。这两条不解决，卡与 gate 会互相打架。

## 2. 现状：设计被表达在哪

一次 run 里，同一份设计有 7 个可能的表达面，但没有任何一处声明「谁在什么时刻读哪几个字段」：

| 时刻 | 受众 | 表面 | 现状（实测） | 缺口 |
|---|---|---|---|---|
| 批准 | 用户 | HITL1 计划卡 | 6 张 171–206 字（1 张超 200）；方法 6/6、输出形态 3/6、档 3/6、**来源类型 1/6**、读者/节 0/6、偏离 0/6 | 字段覆盖无规则；来源最弱；「修订」可改什么没说清 |
| 派发 | scout/analyst/critic | spawn / subagent prompt | 53 份，0.4k–19.5k 字；**方法名 0/53**；动作句 42/53；lens 19/53；来源约束是散文 | 无切片；逐场手打（同一 403 约束在 13 份 brief 里重写） |
| 审查 | critic | `review.md` | §4「方法承诺核查」在；无 output / source / deviation 兑现审计 | 缺「Protocol 兑现」块 |
| 交付（用户） | 用户 | HITL2 卡 | 6 张 137–245 字；**0/6 引用方法/输出/偏离**（1 张只提研究类型）；2 张超 200 | 闭环缺失 |
| 交付（读者） | 报告读者 | `final.md` 头 | 59 份；55 有类型/口径；**17 写方法名**；**0 写偏离** | 无规范 stamp |
| 观察（产品） | 产品用户 | 驾驶舱配置页 | 方法五态；「（来源：推荐接受）」 | 标签语义错位；Protocol 不可见（v2） |
| 审计（操作） | 操作者 | `protocol-audit.md` | v1 计划内 | — |

**三个读数，三个不同的缺口**：

- **来源 1/6**：第三遍把「来源范围」判为**落后**、我们最大缺口（`第三遍 §4 #3`），但卡上恰恰是
  它表达得最少——只有 1 张卡写了来源类型（「官方页+账单+撞墙证据」），其余写的是时间/地域/币种口径。
- **派发 0/53 方法名**：派发并不空（42/53 有反例/口径/单源等动作句），但它**不是从同一份设计抄的**；
  A11 要的「切片」现在只有散文近似物，抽样说不出「这条派发用了哪几个 Protocol 值」。同一场 run 里，
  「OpenAI 官方域 403」这条现实约束在 13 份 child brief 里逐份重写（全样本 25 份 brief 提到 403）——
  改一次现实要改 13 处，且没有任何一处是 canonical。
- **偏离 0/59 + 0/6**：`deviations` 是唯一把「批准的设计」和「实际执行」连起来的字段，却没有任何
  用户面。`drt_api-selection-ds-openai` 的 403 降级写进了 final 正文与 review，但不在任何结构化
  表达里——用户批的是「官方域优先」，收到的是「转述」，中间没有一行可复核的偏离记录。

## 3. 五个缺口

### G1 卡没有字段覆盖规则（批准边界缺口）

卡上的 6 个元素（问题 / 业务简报 / 方法 / topic 骨干 / 执行图 / 深度口径）是 persona 与 skill
各自列的；Protocol 的 6 个 typed 面没有对应关系。结果：`output.sections`、`output.audience`、
`source_scope.families/recency/authority`、`effort.cells_max`、`deviations` 都没有用户面（或只有偶然的
散文）。用户批的是一份设计，看到的却是它的一个未定义子集。

**修法**：一条覆盖规则（§5 R1）+ 卡模板（§6.1）。**成本**：skill + persona 文本，无代码。

### G2 派发没有切片（执行面缺口）

`team-assembly` 的派发五件 + 方法论装载 + lens 装载已经很强，但 Protocol 的四个行动字段没有位置：
scout 要的 `source_scope`、analyst 要的 `output.sections` + `effort`、critic 要的全六面 + 偏离。
**修法**：切片表（§7.2），值从 JSON 抄，现实变了先记 deviation 再改派发。**成本**：skill 文本；
证在 pilot 抽样，不进 CI。

### G3 critic 没有兑现审计（审查面缺口）

adversarial-review 的 §4 只审「question.md 方法节的调查要求」，不审 `output.shape/sections`、
`source_scope`、`deviations`。而 v1 的 output 终稿门是 v2——**critic 是 v1 里唯一能拦「输出没兑现」
的人**。**修法**：§4b 一节 + readiness 一行（§7.3）。**成本**：skill 文本；增负约一节。

### G4 偏离没有表达合同（闭环缺口）

`deviations` 有字段、没有写者/时机/读者。什么算偏离（来源不可达、输出形状改、方法步骤跳过、
effort 超带）、什么时候写（发生即写，不等到交付）、写到哪（JSON + journal）、给谁看（critic / HITL2 /
final 头）都没有定义。**修法**：§5 R4 + §6.2/6.3 + §7.3。**成本**：skill/persona 文本 + gate 只查形状。

### G5 HITL2 与 final 不闭环（交付面缺口）

HITL2 的 6 张卡全部只讲证据（PASS/CRITICAL/重抓），没有一张说「你批的设计交付成了什么、偏离几处」；
final 头 55/59 有类型/口径，但只有 17 份写方法名、0 份写偏离。**修法**：HITL2 模板一行 + final 头
两行（§6.2/6.3）。**成本**：persona + final 模板；无 gate（output 机检是 v2）。

### G6 驾驶舱的「来源」是错的（产品面缺口，v2）

配置页「本次研究」显示「（来源：推荐接受）」——`method-of-question.ts` 的 `origin` 是
`- 来源:` 行（选择来源，即「推荐接受/用户指定」），不是研究来源范围
（`ResearchConfigTab.tsx:279`）。用户会把它读成「这次从哪找资料」，而真正的来源面
（families/recency）不在产品里。**修法**：v1 只登记，不改（改 client 要重建 + client smoke，
且与 cockpit 投影同批更合适）；v2 与 Protocol 页签一起，把标签改为「采用方式」并展示 `source_scope`。

## 4. 表达层反推的数据层澄清（两条，必须 M1 前拍板）

### 4.1 复合方法：`id` = 主方法，`adjustments` = 补法（不新增 schema）

实测：22 个记录方法的 bundle 里 **4 个是复合方法**（18%）；6 张计划卡里 **2 张**写复合
（「方案比较+规范全景+三断言核验」「领域地图+选址方案比较+政策时效」）。v1 的 `method.kind`
只有 `preset | library | custom`，`kind=preset` 时 `id` ∈ 五条——复合方法要么被压成一个预设
（丢信息），要么被迫走 `custom`（要求 Lead 为两个预设的并集手写四字段，成本落在最复杂的 run 上）。

**推荐（零 schema 变更）**：`id` = 主方法（五条之一），`adjustments` 写补法 + 角色 + 理由；
`method.fields` = 主方法的四字段；补法的四字段留在 `§研究方法` 散文。gate 的方法名一致性从
「相等」改为 **「`§研究方法 - 采用:` 的原文包含 `method.id`」**——`adoptedNameOf()` 对
「方案比较（P5）为主 + 领域地图铺底」已截出「方案比较」，包含关系天然成立。

边界：包含判据只防格式漂移（方法名前后加括注/补法），不防语义否定（如「不做方案比较」）——
那与现状一致：gate 是机械门，语义归 critic §4。

| bundle | `§研究方法 - 采用:` | v1 映射 |
|---|---|---|
| `drt_cn-us-ai-models-hardware` | 领域地图 + 方案比较（维度化对比）合并 | `id=领域地图`；`adjustments=["方案比较：维度化对比"]` |
| `drt_eu-us-cn-ai-stack` | 方案比较（P5 分派）为主 + 领域地图铺底 | `id=方案比较`；`adjustments=["领域地图：铺底"]` |
| `drt_gpu-vs-cpu-idc-ops` | 方案比较（主）+ 领域地图 + 主张核查 | `id=方案比较`；`adjustments=["领域地图：规范来源全景","主张核查：RQ7 三断言"]` |
| `drt_shanghai-dc-build` | 领域地图（主）+ 方案比较 + 时间线与信号 | `id=领域地图`；`adjustments=["方案比较：选址取舍","时间线与信号：政策时效"]` |

边界：`kind=custom` 仍要求四字段非空；复合不是 `custom`，是「一个主方法 + 有名字的调整」。
**不新增 `parts[]`**——v1 不为一组纸面跑加结构；若 pilot 证明 `adjustments` 不足以表达，v2 再谈。

### 4.2 批准类型：`approval_basis`（别让 `status=approved` 说谎）

两个现成漏洞：

- **quick_factual 无第二卡**，却按 v1 合同要 `status=approved` + `gates.hitl1=none`——用户从未见过
  这份设计，「approved」名不副实；
- **修订路径**：用户选「修订计划」→ Lead 把意见逐字落 §Decisions、改 JSON 到 v2、直接开工，
  **v2 没有再次呈卡**；`approved_at` 仍是卡的时间，JSON 单独看是「已批准」，但批的是 v1。

**推荐**：加 `approval_basis: card | revision | auto`（一个枚举，不改 `status` 语义）：
`card` = 卡上「按计划开跑」；`revision` = 用户修订后直接开工（原文在 §Decisions）；`auto` = quick
自动采用。gate：非 quick 要求 `basis ∈ {card, revision}` + §Decisions 行 `protocol: vN` 与当前版本
一致；quick 要求 `basis=auto` + `hitl1=none`。**成本**：一个字段 + 两条 gate 判据 + 卡/投影模板的
一行说明；换来「JSON 单独可读也不撒谎」。

## 5. v1 表达合同

### 5.1 四条规则

| # | 规则 | 判据（可写进 skill 的话） |
|---|---|---|
| **R1** | **批准边界**：卡上出现所有改变「研究什么/从哪来/做多少/交什么」的字段；不出现的只能是出厂策略或由已展示字段唯一决定 | 卡的字段表（§5.3）；gate 只红「卡可见字段与 JSON 不一致」，不红「策略字段未展示」 |
| **R2** | **派生不重写**：卡 / §Protocol / 派发 / review / HITL2 / final 头都从 `protocol.json` 抄；`§研究方法` 是唯一的散文展开 | 任何表面需要新事实 → 先加进 JSON 或 §研究方法，不在表面临时发明 |
| **R3** | **一个受众一个时刻**：用户只在 HITL1（批）与 HITL2（收）看设计；worker 在派发时看自己那片；critic 在审查时看全六面；读者只看 final 头 | 没有哪个表面承载整个对象；不新增第三交互点 |
| **R4** | **偏离一等**：偏离发生即写 `deviations` + journal；review/HITL2/final 各有一行；不静默吸收进正文 | `deviations` 形状 gate；语义由 critic 审 |

### 5.2 字段 × 表面（R1 的落地表）

| Protocol 字段 | 卡 | §Protocol | 派发 | review | HITL2 | final 头 |
|---|---|---|---|---|---|---|
| `schema/version/status/approved_at/approval_basis` | 指针 | 版本行 | `vN` | `vN` | `vN` | `vN` |
| `method.id/kind` | ✓ | ✓ | scout/analyst | ✓ | — | ✓ |
| `method.fields` | —（§研究方法） | 指针 | analyst（verify） | ✓ | — | — |
| `method.adjustments` | 短标签 | ✓ | 按角色 | ✓ | — | ✓（短） |
| `source_scope.families` | ✓ | ✓ | scout | ✓ | — | ✓ |
| `source_scope.domains/exclude` | 有才写 | ✓ | scout | ✓ | — | — |
| `source_scope.recency/language` | ✓ | ✓ | scout/analyst | ✓ | — | ✓ |
| `source_scope.authority` | 派生，不写 | ✓ | scout | ✓ | — | — |
| `effort.band` | ✓ | ✓ | — | ✓ | — | ✓ |
| `effort.nodes_max/cells_max/waves_max` | 只写节点 | ✓ | — | ✓ | — | — |
| `effort.allowed_depths` | — | ✓ | analyst | ✓ | — | — |
| `output.shape` | ✓ | ✓ | analyst/critic | ✓ | ✓ | ✓ |
| `output.sections` | 短摘要 | ✓ | analyst/critic | ✓ | — | — |
| `output.length` | — | ✓ | — | ✓ | — | — |
| `output.format` | —（v1 只有 md） | ✓ | — | ✓ | — | —（md，不写） |
| `output.audience` | ✓ | ✓ | — | ✓ | — | ✓ |
| `gates.*` | —（出厂策略） | — | critic | 知悉，不审 | — | — |
| `deviations` | 有才写 | ✓ | critic | ✓ | ✓ | ✓ |

**读法**：卡只承载 R1 的「变更类字段」；`§Protocol` 是审计面，承载全部；派发只带该角色会**改变
动作**的字段；review 是唯一「全六面 + 偏离」的审查面；HITL2 / final 只承载闭环（vN / shape / 偏离）。
表内 ✓ = 该表面读取/承载该字段，**不表示都机检**；语义审计只在 review §4/§4b/§7。
`gates` 永远不进卡：批准门不能被偏好关掉（核验 §5 #6）。

### 5.3 五个投影（v1 做）与两个延后（v2）

| 投影 | 受众 | 内容 | 预算 | 校验 |
|---|---|---|---|---|
| 计划卡 | 用户（HITL1） | 问题 / 方法·来源 / 投入·输出 / 决定 / 授权 / 指针 | ≤200（推荐模板 159–177） | 试点 + `plan-card` WARN |
| `§Protocol` | gate + 后来读者 | 4 字段行 + 版本 + 指针 | 建议 ≤12 行 | `projection` 红 |
| 派发切片 | scout/analyst/critic | 角色相关字段（§7.2） | 每份 ≤6 行 | 试点抽样 |
| review 块 | lead / 操作者 | 兑现 + 偏离 + readiness 行 | 1 节 | critic 判据 |
| 交付闭环 | 用户 / 报告读者 | HITL2 一行（按 Protocol vN；偏离 n）+ final 头两行（设计 + 偏离） | HITL2 含在 ≤200；final 2 行 | 试点 + critic MINOR |
| ~~驾驶舱~~ | 产品用户 | 本次研究 + 来源 + 设计 | — | v2 |
| ~~卡-vs-JSON 门~~ | gate | 卡字段与 JSON 对账 | — | v2（若 pilot 漂移） |

## 6. 模板与实测

### 6.1 计划卡（5 维度，6 行；实测 159–177 字）

```text
问题：DeepSeek vs OpenAI API 选型：上下文窗口、价格、限流
方法/来源：方案比较；官方+实践，近 12 月，中英
投入/输出：标准 ≤12 节点；对比表+决策摘要（CTO）
决定：主调用供应商；预算未定
授权：W2 扇出 ×4            ← 仅 plan 有 `## Wave 执行` 时；是脚本层唯一授权点
全文=protocol.json/plan.md（改哪项在修订里说）
```

- **删减序**（超 200 时）：决定细节 → 问题括注 → 指针括注；**授权行不删**（删了该层不得跑脚本）。
- 不写 topic 骨干、不写逐 Wave、不写默认 lens（D43 现行纪律）；`按计划开跑` 标签不动
  （`scripts/lib/plan-card.mjs:16`）。
- 「修订」范围写清：方法 / 来源 / 投入 / 输出 / 计划都能改——今天的卡只写「调整走修订」，
  用户不知道设计级也能改。
- 冗长变体（长问题 + 长决定 + 完整修订句）实测 195 字，仍 ≤200 但只剩 5 字余量；**推荐模板 177**，
  卡在 195 时按删减序先压问题/决定，不压授权与来源。

### 6.2 HITL2（4 行；实测 146 字）

```text
按 Protocol v2 交付：对比表（CTO）；偏离 1：OpenAI 官方域 403，数字均为转述
证据：PASS（0C/0M）；critical 8/8；UNVERIFIED 0；重抓 8 URL
残留：922K 语义与 V4-Pro 路由未闭
（可回：太浅 / 方向不对 / 太长）
```

- **Protocol 行优先于三行数字**：超 200 时先删数字（`review.md` 有），不删设计闭环。
- 没有偏离时写「偏离 0」——显式零，比省略可核。

### 6.3 final 头（2 行）

```text
> 设计：方案比较（主）+ 领域地图（铺底）；official+web，近 12 月，中英；standard；对比表（CTO）｜Protocol v2
> 偏离：1（OpenAI 官方域 403 → 转述）
```

- 55/59 的 final 已经有「研究类型/口径」头，这两行是把已有习惯**接上唯一真源**；不新增节、不改
  报告骨架、不做机检（output 终稿门 v2）。
- quick_factual 压成一行：「设计：事实核查；official，中文；quick；快答（md）｜Protocol v1」。

### 6.4 `§Protocol` 投影（question.md）

```markdown
## Protocol（本次研究设计，v2）

- 方法：方案比较（主）+ 领域地图（铺底）；四字段见 §研究方法
- 来源：official + web；近 12 月；zh/en；primary
- 投入：standard（≤12 节点 / ≤8 cells / L1–L2）
- 输出：comparison_table；sections = decision / options / criteria / tradeoffs / risks；audience = CTO；md
- 版本：protocol: v2（approved 2026-11-11T07:00+08:00）；全文 = protocol.json / plan.md
```

与核验 §6.5 的差异：**去掉「计划：W1→W2→W3」行**。它不承载 Protocol 字段，且 plan 每次重写都会
漂移；`plan.md` 就在旁边，`plan-ref` gate 已钉头部版本。其余字段与核验一致。

## 7. 派发 / 审查的具体切片

### 7.1 卡（见 §6.1）

### 7.2 派发切片（team-assembly 增一节）

| 角色 | 带什么（值从 `protocol.json` 抄） |
|---|---|
| scout | `method` 的信息源策略 + `source_scope`（families/recency/language/domains/authority） |
| analyst | `method` 的检验策略 + `output.sections`（本 cell 支撑哪节）+ `effort.allowed_depths` + lens |
| critic | 六面全量 + `deviations` + `output.shape/sections`（审兑现） |

写法：派发里一行 `Protocol vN：方法=<id>；来源=<families>/<recency>/<language>；投入=<band>；输出=<shape>/<audience>`
+ 角色相关的两句。**现实变了先记 deviation，再改派发**（不改 Protocol 假装修好）。证在 pilot
抽样（每场 3 份 brief，指得回 JSON），不进 CI——prompt 不落 bundle，没有可机检的家。

### 7.3 review 块（adversarial-review 增 §4b）

```markdown
### 4b. Protocol 兑现（有 protocol.json 时；MAJOR 级）
- 读 protocol.json、§Protocol、plan.md 头。
- output：final 是否兑现 shape / sections / audience（节标题可不同，内容语义要对；缺 = MAJOR）。
- source：families / recency / language 是否兑现；未兑现是否有 deviations 记录（无记录 = MAJOR）。
- deviations：对照 plan 节点、派发切片、journal，缺记 = MAJOR。
- 版本：status/version ↔ §Decisions `protocol: vN` ↔ plan 头（不一致 = MAJOR，交 lead）。
- readiness 加一行：`Protocol 兑现：shape ✓ / source ✓ / deviations n 条已记`。
```

不替代 adversarial-review 的 §4（方法承诺）与 §7（lens 覆盖）：§4 审「方法做没做」，§4b 审
「设计交没交」；两者都缺才是 FAIL。

## 8. 与现有合同的边界

**视觉面（2026-11-11 用户定调）**：v1 **不新增任何视觉面**——驾驶舱页签、面板、Dashboard 投影一律不做；
只接既有文本面（卡 / question.md / 派发 / review / HITL2 / final 头）。`projectionOf()` 是以后适配视觉的
唯一缝：视觉层只消费它，不反推数据模型。这样数据层的柔韧度先做够，视觉可以按需有机增长。

| 合同 | 为什么不动 |
|---|---|
| 五刀（lens_plan / plan cell 列 / Library 版本 / Brief 对象 / style） | 表达层不碰数据归属；style v2 若来，只在方法行加一个短标签，不新开一行（预算已预留） |
| D43 lens（topics 家、覆盖表） | 派发切片的 lens 行沿用现有装载；§4b 不重做覆盖表 |
| D44 claim verdict / D45 wave | 不改；HITL2 的 Protocol 行与三行数字并存 |
| D33 run schema=2 | 不加 `run.md` 字段；版本只进 plan 头与 JSON |
| 两点交互 / 200 字卡 | 不加第三问、不抬 200；卡是重排不是加长（实测 159–177） |
| manual（模型常驻面） | **不靠 manual**：规则进 skill、模板进 `content/templates`。注：manual 现为 **9,996 字符**（HEAD `d082c65` 拆出 generic 后），cap 12,288 余 2,292——核验 §4.1 的 12,038 / 余 250 已过时，但「程序住 skill、结构住 template」的准入规则不变 |
| output 终稿机检 / coverage 门 | v2；v1 的兑现由 critic §4b 人审（唯一执行点） |
| 驾驶舱投影 | v2；v1 只在 Note 登记「来源标签语义错位」 |

**外部对照**（第三遍，不重做）：Gemini 是消费级唯一「review, guide and refine the research plan
before it begins execution」的计划门；DeerFlow 1.x 是开源唯一 `[ACCEPTED]` / `[EDIT_PLAN]` 协议；
Elicit 是「一屏、全部设置」最接近我们 HITL1 的形态（`第三遍 §2.1–§2.4`）。**计划作为批准单位是
同构的，我们领先的是两点交互与 200 字纪律；落后的是「计划可复核的完整度」**——卡太短不是问题，
卡上缺来源/读者才是。

## 9. 对 issue 的修订（delta，不重写卡）

**结论：不新开卡。** 本卡即 v1 合同；表达层与数据层共用 canonical / gate / pilot / D46，拆开会造两张
必须同时收口的卡。v2 项（驾驶舱、output 机检）不建卡，留「后续」与 triggers。

| 卡内位置 | 增补 |
|---|---|
| 研究依据 | 链接本篇（表达层补篇） |
| 未决问题 | +4 五个投影是否进 v1（推荐：进）；+5 复合方法映射（推荐：`id` 主方法 + `adjustments`，gate 用包含）；+6 `approval_basis`（推荐：加） |
| 范围·做 | +卡覆盖规则与模板；+派发切片；+critic §4b；+HITL2 一行；+final 头两行；+偏离写者/时机 |
| 范围·不做 | +驾驶舱投影；+卡-vs-JSON 门；+output 机检（维持 v2） |
| M1 | `protocol-core` 增 `projectionOf()`（纯函数：4 字段行 + 版本 + 指针）；卡模板字数夹具（真实三例 ≤200）；composite 包含判据；`approval_basis` 两条判据 |
| M3 | 卡模板（skill + persona）；`team-assembly` 切片；`adversarial-review` §4b + readiness 行；HITL2 行；`final.md` 头两行；`§Protocol` 去计划行 |
| M4 | pilot 读数加：卡长、用户复述四要素、派发抽样可追溯率、HITL2 闭环行、偏离记录数 |
| 同步面 | +`tests/pack/content-coverage` 的孤儿模板断言（新模板必须被 manual/persona/skill 点名）；+`tests/pack/template-contract`（若 protocol.json 的键被解析器消费）；+`tests/pack/presets.test` 的 persona/skill 钉句；+snapshot B 重录 |
| 验收 | +**A12 表达闭环**（HITL2 与 final 头各有一行设计/偏离；0/59 现状 → pilot 全绿）；+**A13 复合与批准**（4 个真实复合 bundle 在 core 上过；quick=auto；修订=v2 且 basis=revision）；A5/A6/A11 按本节强化；A12/A13 为新增 |

## 10. 风险与试点读数

| 风险 | 处置 |
|---|---|
| 卡在 195 边缘（冗长变体） | 删减序（§6.1）；授权行不删；推荐模板 177；pilot 连续 6 场 ≤200 才算过 |
| 来源行密度高，模型漏 `authority` | `authority` 是派生，卡上不写；§Protocol 写全 |
| composite gate 误伤（包含判据） | `kind=custom` 四字段仍严；pilot 统计 4 个复合 bundle + 2 张复合卡的 gate 结果 |
| critic 增负 | §4b 只加一节 + 一行 readiness；不替代现有 7 节 |
| HITL2 超 200 | 模板 146；超时先删数字不删 Protocol 行 |
| snapshot B / L1 重录 | persona/skill/template 同批改，按 M3 的 L1 → snapshot B → L4-lite 阶梯 |
| 驾驶舱「来源」仍误导 | v1 登记；v2 与 Protocol 页签同批改 |
| 旧 bundle | epoch 豁免；59 份 final 头不追补 |

**pilot 新增读数**（并入 A9）：卡长（连续 6 场）、用户能否复述「方法/来源/输出 + 有无偏离」、
派发抽样 3 份/场能否指回 JSON、HITL2 是否有 Protocol 行、final 头是否两行、`deviations` 记录数
（若某场确有 403/降级而记录为 0，按漏记处理）。

## 11. 锚点

- **模型可见面**：`packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md:50-57`（卡）、
  `presets/lead.patch.yml:26`（计划卡）、`:31`（HITL2 ≤200）、
  `presets/lead/skills/team-assembly/SKILL.md:39-45`（派发五件）、`:47-57`（方法论/lens 装载）、
  `presets/critic/skills/adversarial-review/SKILL.md:43-50`（方法承诺）、`:104-137`（格式/readiness）、
  `content/templates/run/question.md:36-45`（方法节）、`content/templates/run/final.md:1-6`（头）、
  `content/manual.md:178-185`（两点交互）。
- **门/工具**：`scripts/lib/plan-card.mjs:16,19`（标签、200）、
  `scripts/run-ops/run-accept.mjs:99-105`（预检链）、
  `scripts/run-ops/plan-card-stats.mjs`（卡长投影）、
  `tests/pack/template-files.mjs:11-22`（`CORE_TEMPLATES` 10 件）、
  `tests/pack/content-coverage.test.mjs:105-118`（孤儿模板断言）、
  `tests/pack/template-contract.test.mjs:11-40`（被消费的键）。
- **产品面**：`packages/deep-research-pack/src/lib/method-of-question.ts:5-14,87-109`（五态）、
  `src/client/ResearchConfigTab.tsx:273-279`（「来源」= origin）、
  `docs/design/40-research-cockpit.md` §2.6（配置页签）。
- **外部**：`_backlog/research/external-landscape/2026-11-10-landscape-preference-layer.md`
  §2.1（Elicit）、§2.4（Gemini 计划门）、§2.6（DeerFlow）、§4 #3（来源范围 = 落后）。
- **实测口径**：计划卡 = `ask_user_question` 中 options 含「按计划开跑」的 question 字段全长；
  HITL2 = options 含「定稿/补研究」的 question 全长；派发 = `spawn_teammate` / `subagent` 的
  `prompt` 全长；final 头 = `final.md` 前 10 行。会话样本 = `runtime/harness-home/sessions` 的
  `research-workspace` 组（近 60 天，249 场，其中 53 份派发、6 张计划卡、6 张 HITL2）。
