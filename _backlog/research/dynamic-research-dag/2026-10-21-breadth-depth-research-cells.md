---
topic: 宽搜/深搜的深度模型与研究单元
intent: 为动态研究 DAG 设计卡提供“宽搜/深搜各自怎么加深、如何映射到 Team 任务与 subagent”的方法与判据。
---

# 宽搜 / 深搜的深度模型：两种“深”，不是一个 DAG 深度（2026-10-21）

> 服务 = [_backlog/issues/2026-10-21-dynamic-research-dag.md](../../_archived/settled_issues/2026-10-21-dynamic-research-dag.md)。
> 方法 = 读本仓四角色 skill（Scout / Analyst / Critic / Synthesis）+ 真实 run 资产 + DSH 原语；
> 只读，不改代码。结论是方法设计，不是已实现合同。

## 0. 一句话结论

- **宽搜的“深” = 覆盖谱系**：query 家族 × 检索器 × 信源 tier × 子域/实体 × 反方与负结果。
  不是“结果条数多”。
- **深搜的“深” = 证据链**：claim → 一手来源 → 独立佐证 → 反例 → 测量口径 → 问题清单闭合。
  不是“抓的网页多”。
- 两者**已经**写在 Scout / Analyst / Critic 的 skill 里；现在缺的不是判据，而是**执行图给够迭代层数**
  并把“这次要多深”显式化。最小实现 = `plan.md` 的 `depth` 列 + 研究单元（scan/dive/check）+
  迭代触发器；**不加门禁、不加外部依赖**。

## 1. 两种“深”不是一种

| 维度 | 宽搜（Scout） | 深搜（Analyst） |
|---|---|---|
| 目标 | 画出“答案可能在哪儿”的地图 | 把方向变成可核查的证据 |
| 深的含义 | 覆盖得更全：同义词/语言/视角三类 query；多个检索器；A–D 质量与 primary–weak 身份；子域/实体边界；反方与“已排除” | 追得更透：问题清单闭合；一手来源；≥2 独立来源；反例；测量条件；版本/日期；矛盾呈现 |
| 伪深度 | 一个关键词搜 10 页；只搜支持方；只看摘要不抓全文；只用一个检索器 | 一个来源抄三遍；二手转述当一手；只找支持证据；数字无口径；问题清单不闭合 |
| 现有 skill 判据 | query 三轮（同义/语言/视角）、30 秒去留判、A–D、检索器对账、覆盖对账 | question-list、frontmatter 七字段、≥2 独立来源、`单源——待破`、反例搜索、`已搜未得`、测量条件 |
| 什么时候算够 | 每个 primary/comparison topic 有“建议挖深”lead；排除有原因；检索器/来源谱系可见 | 关键 claim 有独立佐证或显式单源；反例有记录；口径在场；问题清单状态可见 |

**关键：** 这两种深不能用同一个“DAG 层数”衡量。宽搜加深是**加扫描面**（更多 query/检索器/子域），
深搜加深是**加验证层**（一手、独立、反例、口径）。一个 run 可以宽搜很深但深搜很浅，反之亦然。

## 2. 现有 skill 已经承诺了什么（不要重复发明）

| 角色 | 已经写死的深度纪律 | 还缺什么 |
|---|---|---|
| **Scout** | 三类 query 轮换；30 秒去留判；A–D 质量 + `source_tier`；检索器对账（单一可达标 `单检索器——待破`）；覆盖对账（每个 primary/comparison topic 至少一条“建议挖深”）；排除显式 | “这次宽搜要到什么覆盖级别”没有显式档位；多轮定向重扫没有模板 |
| **Analyst** | question-list 驱动；证据一文件一来源；frontmatter 身份链；≥2 独立来源；单源显式标；反例专搜；`已搜未得`；数字口径 ≥2 项；摘录/解读分离 | “这次深搜要追到一手/反例/口径哪一层”没有显式档位；子域未知时没有“派 scout worker”的模板 |
| **Critic** | 引用链三态狩猎；A/B 级；交叉验证缺失；单源未标；口径缺失；反例覆盖；方法承诺核查；leads 纪律；首屏核查；复审 ≤3 轮 | 没有“深度记录”这个可核对象——现在靠散在证据解读/方法节里 |
| **Synthesis** | 纯综合先行；gap 只补一轮；`insufficient` 如实呈现；来源链；不假装全知 | 没有“按深度级别决定是否补搜”的显式规则（现在靠 Lead 判断） |

**结论：** 深度判据已经很强，缺的是**执行层的深度档位 + 迭代模板 + 可核的深度记录**。不要新造
一套质量评分；把现有判据组织成“这次要走到哪一层”。

## 3. 研究单元（cell）：把宽搜/深搜做成可实例化的模板

不是每次从零画一张任意图，而是用三种小单元拼：

```text
Scan cell（宽搜）                    Dive cell（深搜）                  Check cell（审查）
S1 query 家族（同义/语言/视角）      D1 question-list（must_answer 拆问）  C1 critic 三线审查
S2 来源矩阵（官方/二手/行业/社区）    D2 evidence（一手、逐字、口径）       C2 readiness 判据
S3 覆盖对账（topic/子域/负结果）      D3 交叉验证（≥2 独立 / 单源标注）     C3 回边：FAIL→修复→复审
                                  D4 反例搜索（query + 结果）
                                  D5 清单闭合（未答/新问题）
```

- **一个 topic 至少一个 Scan cell + 一个 Dive cell + 一个 Check cell**；简单题可以退化。
- **Scan cell 的输出** = `leads.md` 的方向单元；**Dive cell 的输出** = `evidence/*.md`；
  **Check cell 的输出** = `review.md`。
- **Cell 可以嵌套在 Team task 里**：一个 teammate 拥有一个 cell；cell 内的步骤可以由它自己做，
  也可以派 depth-2 worker（Scout/Analyst preset）做。
- **Cell 不是固定流水线**：Lead 可以按 topic 选择只跑 Scan、跑 Scan+Dive、或跑完整 cell；也可以
  在 Dive 后加一个 Targeted Scan（S1'）再 Dive（D2'）。这就是动态编排，但模板稳定、可复用。

## 4. 深度阶梯 L0–L3：把“这次要多深”显式化

| 档 | 图的大致形状 | 适用 | HITL1 深度映射 |
|---|---|---|---|
| **L0 快答** | Scan（轻）→ Dive（单点）→ 轻量 Critic | 单点事实/状态核查；quick_factual | 快答 |
| **L1 标准** | Scan → Dive → Cross-check → Critic | 探索性全景/对比的默认；每条 primary topic 至少一次 dive | 标准报告 |
| **L2 深挖** | Scan → Dive → 反例 → Targeted Scan（补盲）→ 第二次 Dive → Cross-check → Critic | 关键结论会影响决策；有单源/矛盾/未知子域 | 深度报告 |
| **L3 穷尽** | 多波 Scan（按子域/检索器）+ 多 Dive + 对抗审查 + gap 台账 | 高风险尽调/主张验证/争议题；成本高，按需 | 深度报告 + 用户明确要求 |

**默认：** exploratory_map / claim_verification 用 L1–L2；quick_factual 用 L0；只有用户明确要
“穷尽/尽调级”或 critic 发现重大缺口时才上 L3。**不要让所有题都 L2/L3**——成本会失控，而且
“深”不等于“多”。

**L2 的触发条件（任一）：**
- 关键 claim 只有单源，或只有二手；
- 关键数字口径缺失/口径不明；
- 出现矛盾证据；
- 某个 primary topic 只有一条 lead，或某个子域完全空白；
- 关键来源的日期/版本可能已过期；
- critic 的 method commitment 核查发现方法要求未兑现。

## 5. 迭代触发器：什么时候加节点

### 5.1 宽搜加深（加 Scan 节点/波次）

- 覆盖不足：某个 primary/comparison topic 没有“建议挖深”lead；
- 检索器单一：某方向只有 `单检索器——待破`；
- 来源身份单一：全是 secondary/tertiary，没有 primary；
- 反方缺失：只搜到支持方，没有反对/中立观察；
- 子域空白：地图上有一块“没人提”，但题面要求覆盖；
- 负结果不足：没有“已排除/已搜未得”记录（说明没真正扫边界）。

### 5.2 深搜加深（加 Dive/Cross-check 节点）

- 关键 claim 只有单源 → 加 Cross-check（独立域/独立主体）；
- 只有二手 → 加“追一手”Dive（官方 spec/论文/财报/原始数据）；
- 数字无口径 → 加“口径补齐”Dive；
- 有矛盾 → 加“反例/矛盾裁决”Dive；
- question-list 未闭合 → 加“未答问题”Dive；
- 日期/版本过期 → 加“时效复核”Dive。

### 5.3 停止规则（防止无限深）

- 每个 topic 的“加深”最多 **2 轮**（首轮 + 最多 1 次定向重扫/二次 dive）；第三轮必须升级
  HITL2 或标 `insufficient`；
- 审查回边仍按现有上限：复审 ≤3 轮，超界升级 HITL2；
- 预算：plan 里给每个 topic 设 `budget`（最多几个 worker/几轮搜索/多少时间）；预算耗尽 →
  停，标 gap，不静默继续；
- **`insufficient` 是合法结论**：拿不到就是拿不到，写清渠道，不转写成“没有”。

## 6. 怎么落到最小原生层（A0）

| 落点 | 做法 | 依赖 |
|---|---|---|
| `plan.md` | 每个节点加 `depth: L0/L1/L2/L3`（或 `scan/dive/check` + `round`）；节点表有 `kind` / `owner_role` / `deps` / `acceptance` / `budget` | 新模板（Markdown） |
| Team task | 每个节点一个 task；description 写清“深度档 + 必须留下的深度记录 + 验收判据” | Team 原生 |
| Lead | 完成后读输出：深度记录齐不齐？触发器有没有命中？命中就加 S2/D2/Cross-check 节点 | Lead 纪律 |
| Scout | Scan cell 的输出里带“覆盖记录”：query 家族、检索器、tier 分布、负结果、未覆盖子域 | Scout skill 增一段 |
| Analyst | Dive cell 的输出 `解读` 节里带“深度记录”：claim → 一手链、独立来源、反例 query/结果、口径、清单状态 | Analyst skill 增一段 |
| Critic | 在 method commitment / 证据质量审查里读“深度记录”；缺记录 = MAJOR（不是新门禁） | Critic skill 增一句 |
| Worker | Analyst 可派 `agent_preset=scout` 做未知子域的 Targeted Scan；Scout 可派 `agent_preset=analyst` 核实一条 lead；depth 2，结果回父级 | subagent 原生 |
| 门禁 | **不加**新门禁；现有 evidence-audit / node-gate / critic 判据不变 | — |

**不引入：** 新文件格式、数值 floor、外部 store、workflow、额外插件。深度记录放现有 `解读` 节，
不新增 evidence 字段，避免动 evidence-audit 契约。

## 7. 三个例子

**例 1：领域全景（exploratory_map，L2）**

```text
Scan S1：按子域拆 3 个 scan 节点（训练/推理/芯片）→ leads.md
Dive D1：每个 primary topic 一个 analyst dive → evidence/
Cross-check C1：critic 预检单源/同源/反例
Targeted Scan S2：某子域只有一条 lead → scout 定向补扫
Dive D2：补扫后的二次 dive
Synthesis → Critic → HITL2
```

**例 2：主张验证（claim_verification，L2/L3）**

```text
Scan S1：断言原始出处 + 反方措辞
Dive D1：一手来源 + 支持证据
Dive D2（反例）：专搜“它不成立”的证据
Cross-check C1：独立来源/独立主体
Adjudication：成立/部分成立/不成立/证据不足
Critic → HITL2
```

**例 3：单点事实（quick_factual，L0）**

```text
Scan（轻）→ Dive（官方页）→ 轻量 Critic（数字转写 + 出处链）
单源合法，但必须标 `单源——待破`；不强行加反例/交叉。
```

## 8. 风险与反证

- **“多搜”≠“更深”**：宽搜加深靠 query/检索器/来源谱系，不靠翻页；深搜加深靠一手/独立/反例/
  口径，不靠抓页数。否则只是更贵的浅。
- **深度记录会仪式化**：critic 必须读内容，不能只看“有记录”；记录里要有一手链、反例 query、
  口径原文，不是一句“已核查”。
- **成本失控**：L2/L3 的 worker 调用会显著增加；必须有 budget 和 2 轮上限。quick/标准题不要
  默认 L2。
- **数值 floor 是假深度**：本仓已否决 floor 门禁；不要用“≥N 源”当唯一判据。用结构化证据 +
  critic 语义审查。
- **顶层 teammate 仍继承 Lead 组合**：它可能越权用 ask_user/present；靠 prompt 纪律；worker 的
  角色是精确的。
- **agent 树不要深**：工作图可以深（多轮/多 cell），agent 树默认 2 层；不要用嵌套 agent 假装
  “深度”。

## 9. 最小改动清单（如果采纳）

1. `plan.md` 模板：节点表加 `depth` / `kind` / `budget`；Lead 写。
2. `team-assembly` skill：加“深度阶梯 + cell + 触发器 + 停止规则”；这是方法论的家。
3. Lead persona：一句话“完成后读深度记录；触发器命中就加节点；预算耗尽标 gap”。
4. Scout skill：加“覆盖记录”一段（query 家族/检索器/tier/负结果/未覆盖）。
5. Analyst skill：加“深度记录”一段（一手链/独立来源/反例/口径/清单）。
6. Critic skill：method commitment 里加“读深度记录；缺 = MAJOR”。
7. **不加**：新门禁、新 evidence 字段、外部插件、workflow、数值 floor。

## 10. 与动态 DAG 的关系

- **图是容器，深度是参数**：同一张 scan/dive/check cell，`depth` 决定跑几轮、加哪些节点。
- **动态重写**：触发器命中 → Lead 加 S2/D2/Cross-check 节点；版本化节点，不画环。
- **图可以深**：工作图依赖可以 6–10 层；agent 树仍是 2 层。深度主要来自 cell 的迭代与验证层，
  不是 agent 嵌套。
- **可恢复**：plan.md 记录 depth/round/节点；新 Lead 会话按 N 重建 Team task，不依赖旧 task id。
