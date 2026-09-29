# schema 债务清偿（编制条件性入契约 + 分类修复 + 归因勘误）

> 状态：implemented

## 决定

- **编制条件性入契约（NODES.md 新节）**：研究类型 = quick_factual（快速事实核查；HITL1 定、记 question.md）按 team-assembly 矩阵**不设 scout/analyst 常设编制，critic 可轻量或不配**——节点 2/3 输出与节点 6 `review.md` 为**条件件**：缺席合法当且仅当 ①question.md 研究类型字段在场 ②journal 显式记账补偿把关。节点 1/4/5/8 输出件全类型必备。pack 种子随 sync-pack-workspace 同步（编制条件性随部署面走）。
- **schema-scan v2 编制感知**：条件件缺席时读 question.md 类型标记（`quick_factual`/快速事实核查）——类型在场 → 豁免注记（不计违约不静默）；journal 无补偿把关记账（`无 scout`/`不配 critic` 类字样）→ WARN；类型不在场 → 维持违约。**豁免依据 = bundle 自带事实，不硬编码 bundle 名单**（名单是腐蚀源）。
- **bundle 修两件（各带 journal 追加记账，操作侧显式）**：①agentic-parity `final.md` 机械归位（`mv final/final.md final.md`，内容零改动，mv 保 mtime 2026-09-27——断代不受扰动；`final/` 只余 v1.md）；②cpu-gap `findings.md` 显性 backfill（档头标"事后补齐 2026-09-29 操作侧 + 源材料"；F1–F8 + G1–G12 只从 final.md TL;DR/§1–§7/§六 抽取重建，零发明）。
- **判断类文件显性拒修**：4 场 pricing run 的 `leads.md` 与 deepseek 的 `review.md` **不 backfill**——scout 方向清单与 critic 审查判断是角色判断产物，事后代写 = 伪造编制记录，比缺件更糟（破坏 G8/门②③ 的信任基础）；其合法性由契约条件性 + 原 journal 记账承载（deepseek 连"核查强度打折"都写进了 final/v1.md）。
- **一轮归因勘误**：一轮 Note 验证节"schema 在场而无机械把守，角色照漂"对 4 场 pricing 是错误归因——同 diff 更正为三分类（schema 歧义 ×4〔quick_factual 编制跳过，类型/记账俱在〕/ 真缺陷 ×1〔位置漂移，已归位〕/ 契约演进债务 ×1〔findings，已 backfill〕），与本 Note 互链。

## 输掉的方案

- **给 6 个 bundle 全部回填缺件**：判断类文件不可事后代写——伪造编制记录比缺件更糟。
- **维持"契约前不改"零动作**：用户裁决（2026-09-29「那就修好……想好，然后修」）违约不修不是终态；且 schema 歧义不修契约，同样的假阳性会打到未来 quick_factual run。
- **schema-scan 按目录名单豁免**：硬编码 bundle 名单 = 腐蚀源；豁免依据必须是 bundle 自带的事实。
- **条件性写成 per-node 布尔开关进 NODES 表格列**：表格已宽，伤可读性；条件性语义住独立节，表内不重复。

## 验证

（2026-09-29 实跑）

- **全量复扫收敛**：`node scripts/schema-scan.mjs` → 违约地图 **契约前 0/14**（修前 6/14）｜契约期 0/0（无对象，不宣称）｜**编制豁免 5 件显性列出**（kimi/qwen/zhipu/deepseek 的 leads.md + deepseek 的 review.md，全部"类型见 question.md"）｜**WARN 0**（5 本 journal 补偿记账全部在场）；exit 0。
- **归位实证**：agentic-parity `final/` 只余 v1.md；run 根 `final.md` mtime 保持 2026-09-27（`stat` 核对——断代不受扰动）；scan 判定从"缺席 + 位置漂移"转"全齐"。
- **backfill 实证**：cpu-gap findings.md 档头 backfill 标记在场；F1–F8 支撑证据文件名全部实指 evidence/ 真档（与 final.md 引用同源）；G1–G12 与 final.md §六 12 项一一对应。
- **编制条件性反证**：`node --test tests/schema-scan.test.mjs` **9 断言全过**（原 6 + 新 3：quick_factual 缺 leads/review → 豁免不红且无 WARN / journal 无记账 → WARN 不静默不红 / 无类型标记缺条件件 → 维持红）。夹具 = `tests/fixtures/schema-scan/` 8 mini bundle（+drt-quickfactual / drt-quickfactual-silent / drt-notyped-missing-leads）。
- **门回归**：node-gate 夹具 6 形态 CLI exit 矩阵不变（3 红 3 绿——本轮零门改动）。
- **L0**：`pnpm verify` 全绿；`pnpm test` 全绿（schema-scan 9 断言在内）。

## Consequences

- quick_factual 编制的合法性边界 = 类型字段 + journal 记账——未来 run 缺其一即 WARN 或违约，豁免不是免检。
- 判断类文件（leads/review/audit 结论）**永不事后代写**——操作侧补齐只做事实性/机械性修复（本仓从此有成文先例：归位与 backfill 合法、代写判断不合法）。
- 「契约期零违约」仍无对象——第一份可验证对象 = 下一场契约期交付 run（与 pipeline-polish 计数同窗）。
- journal 未来日期旗继续 INFO（7 本在册，最远 2026-10-20）；契约期后 run 仍出现则升格为机械门候选（先证据后门）。
