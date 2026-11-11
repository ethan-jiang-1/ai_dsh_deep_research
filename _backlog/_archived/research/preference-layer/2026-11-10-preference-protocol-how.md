---
topic: 偏好层怎么落：Protocol 的落点、解析、投影、门与迁移（结合 DSH 习惯做法）
intent: 在数据模型之上，深挖最合理的实现路径：Protocol 住哪、Brief→Protocol 怎么确定性解析、HITL1 怎么投影、Plan/Record 怎么保持一致、门与测试怎么分级、旧 bundle 怎么兼容、模型可见文本怎么放；并用 DSH 的既有做法（plan-mode、claims.json、run-gates、session/bundle 纪律）逐条校验，给出 v1/v2/不做的切分与试点判据。
---

# 偏好层怎么落（2026-11-10）

> 性质：实现设计提案；不是决定，未落地。
> **2026-11-11 收口**：v1 实现合同以 [核验与收口](2026-11-11-preference-protocol-verification.md) 为准；本材料保留提案原文，不逐条改写（5 行整卡、lens_plan、plan cell 列、method-library 版本、hash 基线均已修正）。
> 上游：[数据模型](2026-11-10-preference-protocol-data-model.md) · [external-landscape 第三遍](../../../research/external-landscape/2026-11-10-landscape-preference-layer.md)。
> DSH 依据：`vendor/dsh/docs/architecture.md`（插件/事件/效果）、`packages/plan/plan-mode/README.md`（plan-mode + `exit_plan_mode`）、`packages/storage/storage-domain/README.md`（host 侧 typed state）、`packages/settings/README.md`（插件配置）、`AGENTS.md`（pre-stable / released session data / 证据匹配）。
> 结论先行：**v1 不新增 host 工具、不改 session schema**；用 `protocol.json`（canonical）+ `question.md` 5 行投影 + `scripts/lib/protocol-core.mjs` 纯判据 + `scripts/run-gates/protocol-audit.mjs` 门 + skill/template 承载模型面。旧 bundle 按 epoch 豁免；v2 才考虑 `protocol_check` 工具、coverage/output 门与协议库。

## 0. 一句话

**最合理的落法 = DSH 的「typed artifact + 纯判据 gate + 用户问题 seam + 按需加载的 skill/template」，而不是新插件、新工具、新 session 事件。** Protocol 是 run bundle 里的一个 JSON 工件；Lead 写它，gate 验它，HITL1 投影它；没有隐藏状态，没有 loop 改动。

## 1. DSH 习惯做法：哪些直接采用，哪些只借形态

| DSH 做法 | 出处 | 对本设计的约束 | 采用方式 |
|---|---|---|---|
| **typed artifact 用 JSON** | `content/templates/run/claims.json` / `verdicts.json`；session 事件 JSON | 嵌套结构（lens_plan/effort/output）不适合塞进散文 | `protocol.json` canonical；`question.md` 只放 5 行投影 |
| **纯判据 + CLI 壳 + `--write`** | `scripts/lib/verdict-audit-core.mjs` + `scripts/run-gates/verdict-audit.mjs` | 判据要能在 tests 直调，不靠模型 | `protocol-core.mjs`（pure）+ `protocol-audit.mjs`（CLI） |
| **稳定错误码 / 0-1-2 退出** | `evidence-audit` / `verdict-audit` | 红项要可定位、可复跑 | 每项一个 code；0 绿 / 1 红 / 2 用法 |
| **epoch 豁免旧 bundle** | `CLAIMS_CONTRACT_DATE` in `verdict-audit-core.mjs` | 存量 bundle 不背新合同 | `PROTOCOL_CONTRACT_DATE`；旧 bundle / quick_factual 豁免 |
| **用户问题 seam** | `ask_user_question`；`plan-mode` 的 `exit_plan_mode` 也走 `user-questions` | HITL1 仍然是一次结构化问卡 | 继续 `ask_user_question`；只换正文投影 |
| **plan-mode 的 review 形态** | `vendor/dsh/packages/plan/plan-mode/README.md` | 「完整 markdown plan + approve/keep planning + log-only state」是先例 | **借形态，不接工具**：`exit_plan_mode` 需 `/plan` 且只有 approve/keep；HITL1 还要三问 + 放弃 + quick 豁免 |
| **session log 是 model 上下文之源** | `docs/architecture.md` Session log | 任何模型可见的设计都要能被日志复算 | Protocol 的读写走 fs；HITL1 走 ask；gate 报告落 bundle |
| **host state 用 storage-domain** | `packages/storage/storage-domain/README.md` | 它是 host-side、schema-validated、**模型不可见** | **不用**：Protocol 是模型可见的 run 设计；用 workspace 文件 |
| **插件配置用 settings** | `packages/settings/README.md` | settings 是插件 config 面，不是用户研究数据 | **不用**：方法库/Protocol 是用户数据，住工作区 |
| **released session data 不轻改** | `vendor/dsh/AGENTS.md` | 加 session 字段/事件 = 持久化类型变更 | **不新增 session 事件**；Protocol 是 bundle 工件，避开 session schema |
| **registrations are effects / 不改 loop** | `vendor/dsh/AGENTS.md` | 不能把 Protocol 做成新的调度器 | v1 没有 host 注册；v2 若加工具，按 effect 注册 |
| **progressive disclosure** | skills / templates 按需读；manual 是常驻面 | manual 近满（12,038 / 12,288 字符，余 250） | Protocol 规则进 `research-brief` skill / `content/templates/run/protocol.json`，**不进 manual** |
| **证据匹配面** | `docs/guides/60` 任务型路由 | 不同改动面证据不同 | gate/纯判据 = L0；skill/persona = L1 + L3；真 run = L4 |

**被认真考虑但否掉的 DSH 原生路径：**

- **接 `exit_plan_mode`**：它是 DSH 的原生计划评审（plan markdown + approve/keep planning + log-only `plan/mode`）。不接的原因：① 要求 plan mode 已激活（用户 `/plan`），研究 Lead 不能自行进入；② 只有 approve/keep，没有「放弃/quick_factual 豁免/三问」；③ 接它会把 HITL1 拆成两个 seam。**形态可借**：完整 plan、单一评审、状态可复算。
- **用 `storage-domain`**：它是 host 侧、schema 校验、**模型不可见**的状态。Protocol 必须模型可见、用户可批，故不用。
- **用 `settings`**：插件配置面，不是用户研究偏好；方法库/Protocol 属工作区数据，故不用。
- **新增 session 事件 `protocol/approved`**：会动 released session data 与 host 代码；bundle 的 `question.md §Decisions` 已是批准记录，故 v1 不加。

## 2. 方案对比：Protocol 住哪

| 方案 | 形状 | 优点 | 代价 | 裁决 |
|---|---|---|---|---|
| **A. 只加路由表** | 散文规则，不引入对象 | 零改动 | 没有单一可审对象；冲突仍靠 Lead 散文 | 否 |
| **B. `question.md §Protocol`（markdown 表 + fenced JSON）** | 单文件 | 少一个文件；人读方便 | 嵌套结构解析难；用户叙事与机器数据混在一起；question.md 变长 | 退路 |
| **C. `protocol.json` + `question.md` 5 行投影（推荐）** | JSON canonical + 投影 | 嵌套结构自然；gate/cockpit 易读；与 `claims.json` 同习惯；投影可机检 | 多一个文件；用户要打开文件看细节 | **v1 推荐** |
| **D. `protocol.md` + `protocol.json` 双文件** | 人类版 + 机器版 | 人读最舒服 | 双写必漂移；需要额外一致性门 | 否（除非只读生成） |
| **E. 完整 run profile（含 model/tools/memory）** | Perplexity profile 式 | 覆盖面最大 | 超出研究偏好层；本地 0 采用；与显式库/DSH settings 边界冲突 | 暂缓 |

**推荐 C 的理由（按 DSH 习惯）：**

1. **JSON 是 DSH/本包对 typed artifact 的既有形态**（`claims.json`/`verdicts.json`）；Protocol 有嵌套数组与对象，JSON 比 markdown 表更稳。
2. **`question.md` 是用户叙事**；把机器对象塞进去会让「用户读的问题」与「模型读的设计」混在一起。JSON separate 更符合「一处事实一个家」。
3. **gate 与 cockpit 都更容易**：gate 读一个文件；cockpit 未来直接读 `protocol.json`，不用解析 markdown。
4. **HITL1 仍然只需要 5 行**：投影从 JSON 生成，用户可以只看卡；要细节再打开文件。
5. **新增文件成本低**：bundle 已有 `claims.json`/`verdicts.json` 先例；manual 只需在目录约定加一行（或由 skill 指路，避免 manual 预算）。

**按判据看（● 好 / ◐ 中 / ○ 差；判断，不是测量）：**

| 方案 | 一个家 | 用户负担 | 可审/可机检 | 旧 bundle 兼容 | 实现成本 | 可扩（新倾向） | 结论 |
|---|---|---|---|---|---|---|---|
| A 路由表 only | ○ | ● | ○ | ● | ● | ○ | 否 |
| B `question.md` only | ◐ | ● | ◐ | ● | ● | ◐ | 退路 |
| **C `protocol.json` + 投影** | ● | ◐ | ● | ◐ | ◐ | ● | **推荐** |
| D `protocol.md` + JSON | ◐ | ◐ | ● | ◐ | ○ | ◐ | 否（双写漂移） |
| E 完整 run profile | ● | ○ | ● | ○ | ○ | ● | 暂缓 |

C 的唯一明显代价是「多一个文件 + 用户要打开它看细节」；用 5 行投影把这个代价压到可接受。B 的「少一个文件」换来的是嵌套解析与叙事混杂，不划算。

**落点细化：**

```
drt_<slug>/
  protocol.json              # canonical 当前版
  protocol/v1.json           # 旧版快照（每次协议级变更前复制）
  protocol-audit.md          # gate --write 的报告（含 canonical sha256）
  question.md                # §Protocol 5 行投影 + 指针
  plan.md                    # 头部 protocol: v1；节点表带 cell
  review.md                  # protocol: v1 + coverage by cell
  evidence/*.md              # cell_ref + protocol_version
```

- `protocol.json` 是唯一 canonical；`question.md §Protocol` 是投影；投影与 JSON 不一致 = gate 红。
- 协议级变更：先把当前 `protocol.json` 复制到 `protocol/v<旧版本>.json`，再改 `version` 与内容（同 `plan/vN.md` 习惯）。
- `protocol-audit.md` 由 gate 写；模型不手写 hash（Lead 无 bash，且哈希不归模型——同 claim-verdict 的教训）。

## 3. Brief → Protocol：确定性解析

### 3.1 谁解析

- **模型侧**：Lead 按 `research-brief` skill 的规则，把 Brief（question.md 现有节 + 新字段）写成 `protocol.json`；这是模型判断，不是隐藏代码。
- **判据侧**：`scripts/lib/protocol-core.mjs` 提供 `validateProtocol()` / `canonicalize()` / `resolveDefaults()`；gate 与 tests 用它，模型不直接调用。
- **v2 可选**：`protocol_check` host 工具（见 §7），给模型即时校验；v1 不新增工具。
- **机器合同（可选但推荐）**：`content/templates/run/protocol.schema.json`（JSON Schema 2020-12）；
  `protocol.json.schema` 指向它；gate 用手写校验器（不加依赖）；v2 `protocol_check` 的 input schema
  直接复用同一份 schema——这与 DSH 工具 schema / config schema 的「一份合同、多处消费」习惯一致。

### 3.2 输入

- Brief：`question.md` 的 Purpose / Scope / Constraints / 研究方法 / 新增 audience/deliverable/source_posture/effort。
- Catalogs：lens / source family / method / output template / effort band / gate policy。
- Library：被选中的方法条目（钉版本）。
- Type resolver：P1–P8 → 默认 method / lens set / effort（`question-patterns` skill）。

### 3.3 算法（伪代码）

```text
resolveBrief(brief, catalogs, library, type):
  1. method = brief.method_hint
             ?? library.default
             ?? type.method
             ?? factory.default
  2. source_scope = merge(
       hard = brief.hard_constraints,
       posture = brief.source_posture,
       method = method.fields.source,
       lens = defaults of chosen lenses
     )  # families union; domains/recency/language/authority by precedence
  3. lens_plan = per topic:
       brief.lens_hint ?? type.lensDefaults ?? method.lensDefaults
       + axis balance (>=1 source + >=1 stance for evidence topics)
       + cap 4 per topic; cells <= effort.cells_max
  4. effort = bandContract(brief.effort)
              + user budget overrides within band
              + allowed_depths from band
  5. output = brief.deliverable
              ?? method.fields.report
              ?? template.default
  6. gates = type.policy + factory policy   # not user-overridable
  7. deviations = every resolved != default, with authority + why
  8. validate(protocol) -> errors | protocol
  9. canonicalize(protocol) -> stable JSON
```

### 3.4 冲突、未知、缺失

| 情形 | 处理 |
|---|---|
| 用户点名的 method/lens 不存在 | **fail loud**：`unknown-ref`，不静默替换 |
| 默认 method/lens 不存在（catalog 漂移） | fallback + deviation + warning；gate 记 `catalog-fallback` |
| Brief 来源姿态与 method.source 冲突 | 用户赢；deviation 记 `source-posture-overrides-method` |
| lens.seek 需要 source_scope 没有的 family | 加进 scope（若用户未排除）或记 `gap`（`source-scope-gap`） |
| 必填缺失（decision/effort/must_answer） | HITL1 追问或 fail loud；不脑补 |
| 预算超 band | Protocol v2 + 换 band；不静默放大 |
| 输出合同与 method.report 冲突 | 用户赢；deviation 记 `output-overrides-method` |

### 3.5 确定性 / 哈希

- `canonicalize()`：按 key 排序、固定缩进、去尾随空白；同一输入 → 同一字节串。
- gate 计算 `sha256(canonical)`，写进 `protocol-audit.md`；**模型不写 hash**。
- `Plan`/`Record` 只引用 `protocol: vN`；gate 比对当前 `protocol.json` 的 hash 与 audit 的 hash；变了 = `protocol-changed`。
- 批准证据 = `question.md §Decisions` 的 HITL1 行（用户原话 + `protocol: vN`）；HITL1 Snapshot 的「计划确认」写同一个 `protocol: vN`；gate 用 `protocol:\s*v(\d+)` 读取，检查「`protocol.json.status=approved` ↔ Decisions 行 ↔ 当前 hash」三者一致。

## 4. HITL1 投影

### 4.1 5 行模板（≤200 字）

```text
方法：方案比较（官方+实践，3 面）
来源：官方+网页，近 12 月，中英
深度：标准 ≈ 8–12 节点 / 20–30 分钟
输出：对比表 + 1 页摘要（CTO）
计划：W1 扫描 → W2 深挖 → W3 审查
全文 = protocol.json / plan.md
```

- 5 行 + 指针约 110–150 字；上限 200 字（`plan-card.mjs` 口径 = `question` 字段全长）。
- 每行对应 Protocol 的一个维度；不写细节（细节在 JSON/plan）。
- 选项保持三路：`按计划开跑 (Recommended)` / `修订计划（自由文本）` / `放弃`。
  **`按计划开跑` 这个标签必须保留**——`scripts/lib/plan-card.mjs` 靠它识别计划卡；改标签就要同 diff 改 lib + 门禁。
- 修订：自由文本逐字落 `question.md §Decisions`；Lead 改 `protocol.json`（协议级变更 → v2 + 快照）；一轮制，不二次呈卡。
- 超 200 字：先删「计划」行，再压「输出」行；**不把超限卡递给用户**（现有纪律）。

### 4.2 quick_factual

- 仍写 `protocol.json`（method=事实核查、source=official、lens=official、effort=quick、output=quick_answer），但不发计划卡。
- gate 对 quick_factual 只查 schema/refs/hash，不查 coverage（或按 quick 的轻量规则）。
- 这与现有「quick_factual 免第二段卡」一致；Protocol 仍留审计痕。

### 4.3 HITL2 摘要

- HITL2 的审阅摘要引用 `protocol: vN`：方法/lens/来源/effort/输出 + 偏离处 + 覆盖 x/y。
- 不新增交互点；仍是一次 `ask_user_question`。

### 4.4 失败模式

| 失败 | 症状 | 处置 |
|---|---|---|
| 卡超 200 字 | `plan-card` WARN / 交付门记账 | 删「计划」行；压括号；不递超限卡 |
| 用户看不懂 5 行 | 修订率上升 / 反复问 | 缩到 3 行（方法/来源/输出）；细节留文件 |
| 把 Protocol 当新问题 | 用户答「这是什么」 | 卡首行加一句「这是本次研究的执行设计」；不新增问题 |
| 模型把投影写成散文 | 超过 5 行 / 无结构 | skill 里给逐字模板；gate 只查 JSON，不查卡文风（卡由 gate/cockpit 后补） |

## 5. Plan / Record 一致性

### 5.0 Brief 的物理落点（v1，不新建 brief.md）

Brief 仍住 `question.md`，不新增文件；只补现有节缺的字段：

| Brief 字段 | 落点 | 备注 |
|---|---|---|
| `decision` | `## Purpose——为谁决策什么` | 已有；补一句「谁拍板」 |
| `audience` | `## Purpose` 下加 `- 读者:` | 新增一行；可缺省「未指定」 |
| `deliverable` | `## Purpose` 下加 `- 交付形态:`（模板/篇幅/格式） | 新增一行；缺省 `full_report/md` |
| `scope` | `## Scope` | 已有；`out` 带理由 |
| `source_posture` | `## Constraints` 下加 `- 来源姿态:` | 偏好；解析结果在 `protocol.json` |
| `effort` | `## HITL1 Alignment Snapshot` 的「深度与篇幅」 | 已有；补数字 band |
| `must_answer` | `## 研究问题分解` / topics `must_answer` | 已有 |
| `method_hint` / `lens_hint` | `## 研究方法` 的「采用 / 本次视角」 | 已有；缺省即「由系统解析」 |
| `hard_constraints` | `## Constraints` | 已有 |

这组改动只动 **模板**（`content/templates/run/question.md`，按需 read），不动 manual 常驻面；`protocol.json` 是解析结果，Brief 是人类记录，两者不互相复制。

### 5.1 Plan 模板

- 头部加 `protocol: v1`（当前版本；不是 hash）。
- 节点表加 `cell` 列：`T1.quant` / `T1.practitioner`；`synthesis/review/gate` 写 `—`。
- `depth` 列必须 ∈ `protocol.effort.allowed_depths`。
- 节点 `budget` 建议 ≤ Protocol 的 calls/nodes 合同；gate 汇总检查。
- `plan/vN.md` 快照习惯不变；协议级变更另存 `protocol/vN.json`。

### 5.2 topics.md

- v1：保留 `lenses:` 作为投影，gate 检查它与 `protocol.lens_plan` 一致；不一致 = `topics-lens-drift`。
- v2：`lenses:` 改为只读投影（生成），单一事实源 = Protocol。

### 5.3 review / evidence

- `review.md` 头部加 `protocol: vN`；coverage 表按 `cell` 逐格，`gap` 带原因。
- evidence **不加新字段**：`cell_ref` 由现有 `supports`（topic）+ `lens` 推导；`protocol_version` 写在 `plan.md`/`review.md` 头部，不逐卡重复。现有八字段不动——这是「derive, don't duplicate」。
- critic skill 增加「按 Protocol 审」一行：方法/lens/来源/输出合同是否兑现；偏离是否记录。

### 5.4 门的分级

| 级别 | 检查 | 何时 |
|---|---|---|
| **v1** | `protocol-schema`（字段/枚举/引用）、`protocol-status`（approved ↔ Decisions）、`effort-contract`（cells/nodes/waves/calls + depth band）、`plan-cells`（每 cell 有节点/每节点映射 cell）、`protocol-hash`（当前 JSON ↔ audit） | M1–M2 |
| **v2** | `coverage`（每 cell 有证据/gap）、`output-contract`（sections/length/format）、`source-consistency`（lens.seek ↔ source_scope）、`library-pin` | M3–M4 |
| **不做** | 语义判断（quote 真伪、coverage 质量、claim 完整性） | 仍归 critic / 人 |

**接入点**：`scripts/run-ops/run-accept.mjs` 在 verdict-audit 之后加第四道预检 `protocol-audit`；`--no-write` 预检，`--write` 落 `protocol-audit.md`。旧 bundle（无 `run.md` 或契约日前）与 quick_factual 豁免。

**反证配方（先红后绿）**：

1. 删 `protocol.json` 的 `output` → schema 红；
2. 把 `lens_plan` 的 lens 改成不存在的 id → `unknown-ref` 红；
3. 删一个 cell 的节点 → `plan-cells` 红；
4. 把 node.depth 改成 band 外 → `depth-band` 红；
5. 改 `protocol.json` 一个字节但不升 version → `protocol-changed` 红；
6. topics.lenses 与 Protocol 不一致 → `topics-lens-drift` 红；
7. 旧 bundle（无 protocol）→ exit 0 + `legacy-not-applicable` 注记。

## 6. 模型可见文本怎么放（预算）

| 面 | 现在 | 改动 | 预算/证据 |
|---|---|---|---|
| `content/manual.md` | 12,038 / 12,288 字符（余 250） | **不加** Protocol 规则；最多在目录约定加一行「protocol.json」 | 超预算 = `content-shape` 红 |
| `presets/lead/skills/research-brief/SKILL.md` | 8,490 字符 | 加「解析 + 写 protocol.json + 5 行投影」一节；**替换**现有计划卡散文，净增 ≤1.5KB | L1 preset-smoke + L3 snapshot B |
| `presets/lead.patch.yml`（persona） | 长 HITL1 段 | 把「计划要点 … ≤200 字」改成「5 行投影 ≤200 字」；不加新问 | L1 + L3 |
| `content/templates/run/protocol.json` | 无 | 新增模板（写者契约，按需 read） | L0 + `presets.test` 键集合 |
| `content/templates/run/question.md` | 现有节 | 加 `## Protocol` 5 行投影 + 指针；按 §5.0 补 Brief 的 3 行；不复制 JSON 全文 | L0 + L2（内容模板） |
| `content/templates/run/plan.md` | 13 列 | 头部 `protocol:`；表加 `cell` 列 | L0 + schema-scan |
| `presets/critic/skills/adversarial-review/SKILL.md` | 现有 | 加「按 Protocol 审」一段 | L1 + L3 |
| `presets/lead/skills/team-assembly/SKILL.md` | 5 件派发 | 加「Protocol slice」：method/source/lens/effort 的 cell 切片 | L1 + L3 |
| `content/manual.md` §交互纪律 | 200 字卡 | 不改（预算）；以 skill 为准 | 若必须改，先下放别处腾字 |

**为什么不上 manual**：manual 是每个 agent 的常驻 runtime context，预算已近满；Protocol 规则是 HITL1/planning 时才需要的，放 skill 是 DSH 的 progressive disclosure 习惯。**为什么不上 host 工具**：v1 没有模型需要的「不可替代能力」；模型能写 JSON、能读模板，gate 能验。v2 若模型在 HITL1 反复写出非法 Protocol，再加 `protocol_check`。

## 7. v2 可选项：`protocol_check` 工具（现在不做）

如果试点显示「模型自写 Protocol 的非法率 >10%」或「HITL1 前需要 canonical hash」，再加一个窄 host 工具，形态照 DSH：

- 插件行：`dsh-deep-research-pack/protocol-tool`（同 `method-library-tool` 的窄 host 工具先例）。
- 工具 schema：

```json
{
  "type": "object",
  "properties": {
    "protocol": { "type": "object", "description": "待校验的 protocol 对象" },
    "write": { "type": "boolean", "description": "true = 校验通过后写 protocol.json + audit" }
  },
  "required": ["protocol"]
}
```

- 行为：schema/refs/effort/plan-cells 校验；返回 `{ok, errors[], warnings[], hash}`；`write=true` 时写文件 + audit；错误码稳定；工具调用进 session log。
- 约束：注册为 effect；不改 loop；失败 fail-loud；`write` 走一次性 claim（同 method-library-tool 的 owner/callId 纪律）。
- 证据：keyless 工具测试 + L4-lite；不加新 Remote。

**为什么现在不做**：新增 host 面需要 D 号/Note/审阅；v1 的 gate 已能兜底；先看试点数据。

## 8. 迁移与试点

| 段 | 内容 | 证据 | 回滚 |
|---|---|---|---|
| **M1 纯判据** | `protocol-core.mjs` + `protocol-audit.mjs` + 模板 + tests；不碰模型可见文本 | L0 `pnpm verify` + `pnpm test`；先红后绿 7 条 | 删新文件；无行为变化 |
| **M2 内容面** | `protocol.json` 模板、question/plan 模板、research-brief skill、persona 5 行；critic/team-assembly 一句 | L1 preset-smoke + L3 snapshot B（先红）+ L4-lite | 还原 skill/persona/模板；gate 可暂时 warn |
| **M3 试点** | 3 个倾向各 1 场：官方核查 / 学术综述 / 监管对比；记录 HITL1 时长、修订、Protocol 变更、gate 红项、coverage | L4（真 run）；证据进 Note，不进 CI | 试点 bundle 标 experimental；不归档 |
| **M4 扩展** | coverage/output/source/library 门；cockpit 只读投影；协议库 v2 | L0 + 客户端 smoke + L4 | 门可分级关；cockpit 只读 |

**试点判据（建议）**：

- HITL1 时长不高于现状 +20%；用户能在不打开文件的情况下复述「方法/来源/输出」；
- Protocol 非法率 ≤10%（gate 红项 / 3 场）；
- 协议级变更 ≤1 次/场；每次都有 deviation + 快照；
- coverage ≥90% cells（有证据或显式 gap）；
- 旧 bundle 仍全绿（epoch 豁免）；
- 用户至少一次说「改来源/改输出」而不是「重跑」——说明投影可操作。

**失败判据**：卡超 200 字频繁；用户要求「别给我看这个」；gate 红项 >3/场；协议变更 >2 次/场；critic 说 coverage 没法按 cell 填。

## 9. 风险与反模式

- **Protocol 变成第二份散文**：必须 JSON + schema；gate 只认字段，不认文风。
- **双写漂移**：`question.md` 投影 / `topics.lenses` / `plan.cell` 都是投影；gate 对账，v2 再收单一源。
- **模型手写 hash**：禁止；hash 归 gate。Lead 无 bash，写不出可靠 hash。
- **把 `exit_plan_mode` 硬接进来**：它需要 `/plan` 且只有 approve/keep；会把 HITL1 拆成两个 seam。借形态，不接工具。
- **把 Protocol 放进 session event**：动 released session data + host 代码；bundle 已是 canonical（D17）。
- **把方法库扩成 run profile**：本地 0/58 采用；先证采用。
- **gate 一次上全量**：先 v1 五查；coverage/output 等 v2；否则噪声淹没信号。
- **manual 加 Protocol**：预算 250 字，必超；用 skill/template。
- **cockpit 先做**：客户端只读投影是 M4；不要用 UI 反推数据模型。
- **把 Protocol 当新交互点**：仍是 HITL1/HITL2 两点；Protocol 只是卡的内容。

## 10. 建议（v1 / v2 / 不做）

**v1（推荐先做）**：

1. `protocol.json` canonical + `question.md` 5 行投影 + `protocol/vN.json` 快照；
2. `scripts/lib/protocol-core.mjs`（schema/refs/effort/plan-cells/hash 纯判据）+ `scripts/run-gates/protocol-audit.mjs`（CLI，0/1/2，`--write`）；
3. `content/templates/run/protocol.json` + question/plan 模板小改；
4. `research-brief` skill 加解析/写 JSON/5 行投影；persona 替换计划卡散文；
5. `run-accept` 第四道预检；epoch 豁免；
6. 3 场试点。

**v2（试点后）**：coverage/output/source/library 门；`protocol_check` 工具（若非法率高）；cockpit 只读；协议库（倾向模板）。

**不做**：`exit_plan_mode` 接入；session 事件；storage-domain；settings；完整 run profile；给用户新增前置问题；把 lens 变立场旋钮。

## 11. 什么会改变这个建议

- **模型自写合法率低**（<90%）：提前做 `protocol_check` 工具，而不是只靠 gate。
- **用户看不懂 5 行**：缩到 3 行；或把投影放进 plan 全文（但仍只批一次）。
- **协议变更频繁**（>2 次/场）：说明 Brief 没问清或 band 太窄；回到 HITL1 问题设计，不是加版本。
- **gate 红项噪声大**：v1 只保留 schema/plan-cells/hash；effort 先 warning。
- **旧 bundle 兼容成本高**：epoch 日后移；或只对新 profile 强制。
- **cockpit 需求强**：M4 提前；但只读，不反推数据模型。
- **方法库开始有采用**：v2 协议库/倾向模板才立项。

## 12. 来源 / 锚点

- 数据模型：[2026-11-10-preference-protocol-data-model.md](2026-11-10-preference-protocol-data-model.md)
- 外部维度验证：[external-landscape 第三遍](../../../research/external-landscape/2026-11-10-landscape-preference-layer.md)
- DSH：`vendor/dsh/docs/architecture.md`（plugins/events/effects、session log）；`vendor/dsh/packages/plan/plan-mode/README.md`（plan mode、`exit_plan_mode`、log-only state）；`vendor/dsh/docs/subsystems/plan.md`；`vendor/dsh/packages/storage/storage-domain/README.md`；`vendor/dsh/packages/settings/README.md`；`vendor/dsh/AGENTS.md`（released session data / 证据匹配）。
- 本包先例：`scripts/lib/verdict-audit-core.mjs` + `scripts/run-gates/verdict-audit.mjs`（epoch/0-1-2/`--write`）；`scripts/lib/plan-card.mjs`（200 字 + 标签）；`scripts/run-ops/run-accept.mjs`（预检链）；`content/templates/run/claims.json` / `verdicts.json`（JSON 工件）；`presets/lead/skills/research-brief/SKILL.md`；`content/templates/run/{question,plan}.md`；`content/manual.md` 预算（12,038 / 12,288）。
- 证据阶梯：`docs/guides/60-dev-loop.md` §2 任务型路由；`docs/evaluation.md`。
