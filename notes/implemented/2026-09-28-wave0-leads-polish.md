# wave0 侦察打磨——leads 计数对账与交接门升格（pipeline-polish 面②）

> 状态：implemented

出处：[pipeline-polish 卡](../../_backlog/_archived/settled_issues/2026-09-28-pipeline-polish.md) 面②（主序
⑤→②→③→④ 第二棒；面⑤首棒已毕业 2026-10-03）。

## 决定

1. **lead-mapping skill 新增「定稿自检（交稿前三对账）」节**（scout 模型可见面）：
   ① **计数对账**——写进 leads.md 的每个数字必须自己逐条点数过或有证据卡依据，不确定不写数
   （实证 = 样本 3 CRITICAL-2：写了"14 条"，自己证据卡与 findings 均 13，14 是
   servers-archived 另一仓库的数）；② **口径差异回改**——发现来源间口径差异当场回改
   leads.md 对应行，"记在证据卡里但没回改表格等于没改"（同上实证：registry-06 已记差异、
   表格残留错数，而 leads.md 是 analyst 抽数入口，错数传染下游）；③ **覆盖对账**——对照
   topics.md 数一遍，每个 primary/comparison topic 至少一条"建议挖深"lead 指向（与门 L 同
   判据：模型先自检，门禁兜底）。
2. **node-gate v1 → v2：新增门 L（leads 交接门）**（`scripts/node-gate.mjs`）：
   - **L1 字段齐**：每个「## 方向:」节状态行在场且值合法（建议挖深｜已排除）；建议挖深 →
     支持来源（含 A–D 分级）+ 关键线索 + 建议 owner 三行齐；已排除 → 原因非空；
   - **L2 topic 覆盖**：topics.md 的 scope_role ∈ {primary, comparison} 的 T# 须被 ≥1 条
     建议挖深 lead 指向（标题或 owner 行引用都算——mcp-server 生态场实证两处出现）；
     synthesis/supporting 免检（窄带防假牙齿）；
   - **防空语料**：leads.md 在场但 0 个方向节 = RED（空集显式）；leads.md 缺席 = N/A
     （在场级归 schema-scan，不越界双判）；quick_factual 编制豁免 = N/A（条件件，与
     schema-scan 同语义，依据 = question.md 类型自带事实）；
   - **断代**（同 schema-scan 成例）：`LEADS_CONTRACT_DATE = 2026-10-03`，契约前交付违约计
     PRE-CONTRACT 不计红（run bundle 是交付记录不改历史）；无日期可断 = 从严；
   - 失败信息 = 失败对象 + 违反的规则 + 修正入口（templates/run/leads.md）三件齐。
3. **NODES.md 判据级表述升格**（机械把守两层：判据级 = node-gate v2 = 交付两门 + leads 交接门）
   + 双副本同步（sync-pack-workspace 9 文件）。

## 输掉的方案

- **计数一致性机械化**（对账外部来源）：需内容级判断与重抓，机械查不出"口径真实"（floor
  教训：实测前数值门禁是假牙齿）——归 skill 自检 + critic 狩猎；
- **supporting/synthesis topic 纳入覆盖门**：背景/综合 topic 未必需要独立 leads——证据未到
  先不纳入，宁窄勿宽；
- **scout persona 同步加判据**：方法是 skill 的家（一个事实一个家），persona 复述 = 双 home
  漂移源——persona 零改动。

## 验证

- **先红后绿**（writing-a-gate 完成判据）：11 个新形态夹具
  （`tests/fixtures/node-gate/bundles/fixture-leads-*`）先红（实现前 tests 11 失败）后绿；
  红绿记录 = `tests/run/node-gate.test.mjs` 永久反证（健康双绿 / 缺状态 / 状态非法 / 挖深缺
  来源 / 排除无原因 / 覆盖缺口 / 空集 / 豁免 N/A / 缺席 N/A / 断代 PRE-CONTRACT 不计红 /
  隔离性不连坐）。
- **L0**：verify 34 门全绿 + tests 133/0（+11）。
- **L1**：preset-smoke 四角色真挂载 ALL PASS（scout skill 改动真挂载绿）。
- **L4-lite**：四角色真模型 ALL PASS + scout 真调 web_search（模型可见面行为证据）。
- **snapshot-replay 三层 ALL PASS**：scout skill 文本不在 lead 夹具请求面（角色硬隔离的间接
  验证，与 RFC 验收预判一致）。
- 解析器按真 run 形态校准：mcp-server 生态场（模板形态）与 cn-llm-pricing 场（自由体）两头
  实读后定「标题或 owner 行引用都算覆盖」与「0 方向节 = RED」的松紧。

## 环境状态（Consequences）

- **契约前 bundle 不追溯**：cn-llm-pricing（2026-10-03 契约日当天交付、自由体 leads.md）在
  `--latest` 下会如实报告 PRE-CONTRACT 之后的形态违约——这是门在工作，不是误报；下一场 run
  起 leads.md 按 templates/run/leads.md 形态写。
- **覆盖门收紧口**：synthesis/supporting 免检是出生时的窄带；run 实测出现背景 topic 无
  lead 导致的 wave1 返工 → 按证据扩入。
- 次序续接 = pipeline-polish 卡（面③ wave1 挖掘下一棒；面①并行、面⑥随 run 滚动、面⑦收尾）。
