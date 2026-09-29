# schema 债务清偿（编制条件性入契约 + 分类修复 + 归因勘误）

> 状态：proposed

## 问题

- 用户裁决（2026-09-29，看毕 6/14 违约地图）：「那就修好，ongoing goal 弄好，想好，然后修。」——违约不修不是终态；但修复必须先想清楚每一件的性质，不是无脑回填。
- **二轮材料复核推翻一轮归因**：4 场 pricing run 缺 `leads.md`（deepseek 另缺 `review.md`）**不是角色越轨**——各 bundle `question.md` 记录研究类型 = `quick_factual`（快速事实核查），journal 显式记账编制（"无 scout/analyst 常设编制"/"不组队……无 critic 编制"，deepseek 连"核查强度打折"都写进了 `final/v1.md`）。**真因 = schema 歧义**：NODES.md 八节点表未建模编制条件性（quick_factual 矩阵合法跳过节点 2/3，critic 可不配），"输出件全必备"与 team-assembly 矩阵两条契约互相打架。一轮 Note 的"schema 在场而无机械把守，角色照漂"对这 4 场是**错误归因**，须勘误。
- 真缺陷两件：①agentic-parity `final.md` 位置漂移（2026-09-26 已知缺陷实例，`final/` 里躺着 44927 字节当前版 + v1.md 记账）——机械可归位；②cpu-gap（`exploratory_map`，编制齐全）缺 `findings.md`——综合结论直接写进 `final.md`（350 行），属契约演进债务（当时契约无 findings 硬要求），内容可诚实重建。
- 一轮的"回填修复历史 bundle"列为输掉的方案，拒的是**静默回填/伪造**；本轮用户定向翻案，翻案边界 = 显性化（backfill 标记 + journal 记账）+ 不伪造判断类文件。

## 方案

- **契约修（NODES.md）**：加"编制条件性"节——研究类型 = quick_factual（HITL1 定、question.md 记录）按 team-assembly 矩阵不设 scout/analyst 常设、critic 可轻量或不配；节点 2/3 输出件与节点 6 `review.md` 为**条件件**：缺席合法当且仅当 ①question.md 研究类型字段在场 ②journal 显式记账补偿把关。节点 1/4/5/8 输出件全类型必备。
- **工具修（schema-scan v2 编制感知）**：读 question.md 类型标记（`quick_factual`/快速事实核查）→ 条件件缺席转"编制豁免"注记（不计违约不静默）；journal 无补偿把关记账 → WARN 行；类型标记缺席而条件件缺席 → 维持违约。exploratory 类不豁免。
- **bundle 修（两件，各带 journal 追加记账）**：
  - agentic-parity：`mv final/final.md final.md`（归位，内容零改动，mv 保 mtime 不扰动断代）；
  - cpu-gap：`findings.md` 显性 backfill——头部标注"事后补齐（2026-09-29，操作侧），源材料 = final.md/journal.md"，F# 条目只从 final.md 已有结论与来源链抽取，不发明。
- **不修（显性拒修）**：4 场 pricing 的 `leads.md` 与 deepseek 的 `review.md` **不 backfill**——scout 方向清单与 critic 审查判断是角色判断产物，事后代写 = 伪造编制记录；其合法性由契约条件性 + 原 journal 记账承载。
- **归因勘误**：一轮 Note（2026-09-29-quality-evidence-loop）验证节"角色照漂"句同 diff 更新为三分类（schema 歧义 ×4 / 真缺陷 ×1 / 契约演进债务 ×1），互链本轮 Note。

## 输掉的方案

- **给 6 个 bundle 全部回填缺件**：判断类文件（leads/review）不可事后代写——伪造编制记录比缺件更糟（破坏 G8/门② 的全部信任基础）。
- **维持"契约前不改"零动作**：用户已裁决违约不修不是终态；且 schema 歧义不修契约，同样的假阳性会打到未来 quick_factual run。
- **schema-scan 按目录名单豁免**：硬编码 bundle 名单 = 腐化源；豁免依据必须是 bundle 自带的事实（question.md 类型 + journal 记账）。
- **把条件性写成 per-node 布尔开关进 NODES 表格列**：表格已 8 行宽，再加列伤可读性；条件性语义住独立节，表内只在节点行标"（条件件）"。

## 验收

1. NODES.md 编制条件性节落地 + pack 种子同步（sync-pack-workspace 重跑）。
2. schema-scan v2：新夹具断言——quick_factual 缺 leads/review → 豁免不红；journal 无补偿记账 → WARN；无类型标记缺条件件 → 仍红；exploratory 缺 findings → 仍红（tests/schema-scan.test.mjs 增断言）。
3. bundle 修两件落位：agentic-parity final.md 归位（run 根在场、`final/` 只剩 v1.md、mtime 不变）；cpu-gap findings.md backfill 头部标记 + journal 追加 ×2 在场。
4. 全量复扫收敛：违约地图 0 违约 + 豁免/注记显性列出（4 场 quick_factual 编制豁免〔含 deepseek review 豁免〕+ cpu-gap backfill + agentic-parity 归位注记），exit 0。
5. 门回归：node-gate 夹具 6 形态 exit 矩阵不变（本轮不碰门）；三步证据其余两步（node-gate 真实 bundle ×2、evidence-audit 不涉及——本轮零证据面改动）。
6. L0 全绿（verify + test）；一轮 Note 归因勘误同 diff；本轮 RFC 毕业迁 implemented/。
