---
name: changing-node-topology
description: Use when adding, removing, or rewiring a research pipeline node — changing a node's input/output files, back-edge semantics, or staffing conditionality in NODES.md — covering the six-place sync surface, the think-red-first procedure, and the per-surface verification ladder. Single-row judgment upgrades (wider node-gate/schema-scan assertions without touching node shape) are NOT topology changes; use writing-a-gate instead.
---

# changing-node-topology — 改轨道（节点拓扑演进）

轨道 = NODES.md 的八节点 I/O 契约 + 回边语义 + 编制条件性。**改轨道 ≠ 升格判据**：加/删/
并节点、改某节点的输入输出件、改回边语义（扩张/修订/重构三分）、改编制条件性（quick_factual
豁免面）= 改轨道，走本技能；只把既有节点的判据升格（字段断言/覆盖断言）= writing-a-gate。

## 先想红（程序第一步）

新节点/新件的判据如果只对人有约束力会发生什么——G8 教训：散文判据不拦角色，裸奔代价由下一
场 run 付（拍板行缺席 ×2、present 缺席、leads 计数错、v2 无记账，全是活教材）。想清楚三个
问题再动笔：① 该节点输出的**可机械判定面**是什么（字段在场/交叉引用/计数一致）？② 判据级
门该挂 node-gate 哪一行、**契约日**定在哪天（断代免追溯红）？③ 内容级判据归谁（critic 狩猎
+ skill 自检——机械查不出的别装能查）。

## 六处同步清单（同 diff，缺一处 = 下一场 run 撞上）

| # | 面 | 拥有什么 | 动作 |
|---|---|---|---|
| 1 | [research-workspace/NODES.md](../../../research-workspace/NODES.md) | 契约全表正本（行 + 回边节 + 编制条件性） | 改行/加行；判据级表述同步 |
| 2 | `dev/sync-pack-workspace.mjs` | NODES/手册/模板/patterns 双副本 | 跑同步（`pack-workspace-fresh` 门禁对账）；profile 镜像随下次 boot-run 重建 |
| 3 | `research-workspace/templates/run/` | 字段级契约实例（模板即 schema） | 新输出件 = 新模板；改必备件 = 改对应模板 |
| 4 | [研究手册](../../../research-workspace/AGENTS.md) | 目录约定 + owner 表（一处事实一个家） | 新文件 = 补目录约定与 owner 行（手册有行数预算，挤一补一） |
| 5 | `packages/deep-research-pack/src/lib/run-fold.ts` | `STEP_ORDER`（观察面轨道折算） | 节点序变才动；动了要 `pnpm build`（client 面）+ `client-load-smoke` |
| 6 | `scripts/run-gates/schema-scan.mjs` + `scripts/run-gates/node-gate.mjs` | 在场级全行断言 + CONDITIONAL 条件件 / 判据级逐行 | 新输出件 = schema-scan 行；条件性节点登记 CONDITIONAL；判据级按证据升格（fixtures 先红后绿 + 契约日） |

**附属两处**（按需，非每次）：[步序正本 Note](../../../notes/implemented/2026-09-24-m2-run-mechanics.md)
（轨道全图——加/删/并节点须回写或互链新 Note）；`scripts/run-ops/run-dashboard.mjs`（投影跟随
run-state 谓词，通常自动——改文件名/轨道序才动）。

## 验证档（按改动面选跑，L0 必跑）

- L0：`pnpm verify` + `pnpm test`（新判据的 fixtures 测试在此层）；
- 动了 NODES/手册/模板（工作区种子）→ `sync-pack-workspace` + boot 漂移检测绿；
- 动了 STEP_ORDER/cockpit → `pnpm build` + `client-load-smoke`（改挂起显性化再加
  `client-hitl-smoke`）；
- 动了模型可见文本（手册/模板）→ `preset-smoke`（L1）+ `l4-lite-smoke`（真模型档）；
- 新判据 → 真 bundle 回验至少一场（--latest 或显式指定，核断代行为）。

## 收尾

- Note（同 diff）：决定 + 输掉的方案 + 验证 + 环境状态——新判据的反证记录入登记；
- 推翻既有决定（如节点数、回边三分）→ docs/00-index D 号同变更登记；
- 交付收尾与决定记录由 [reviewing-a-delivery](../reviewing-a-delivery/SKILL.md) 处理。

## 已知坑（实测在案）

- NODES 双副本漂移 = `pack-workspace-fresh` 门禁抓；profile 镜像漂移 = boot-run fail-loud
  抓（处方：删镜像重建）——两道门都别绕；
- 运行区（drt_*、archive/）不进 L0：run bundle 是交付记录不改历史，新判据**必须带契约日**
  断代（mtime 推交付日是同源设计，历史 bundle 全量重审以注入日期为准）；
- 门内文案的样板行会污染朴素字符串匹配（v1.md 脚注含 "vN" 实测误绿）——判定逻辑要区分
  样板行与内容行；
- `doc-now-only` 门禁扫 tracked 夹具——fixture 文案别带"修订 →"类变更史措辞（对齐正牌
  模板，模板本身零此措辞）。
