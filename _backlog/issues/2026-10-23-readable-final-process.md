---
status: 推敲中
opened: 2026-10-23
---

# 推敲：可读终稿没有流程位（阶段 / owner / 合同 / 验收）

> 立卡：2026-10-23 ｜ 状态：推敲中 ｜ 类型：Task ｜ 结论倾向：未定 ｜ 可关闭：否

## 审阅上下文（先看这一节）

- **触发**：可读终稿现在不是一个显性的 run 阶段：`final.md` 完成后直接进 review → HITL2 →
  delivery，没有“把它变成人读版本”的步骤、owner、合同和验收。临时写一份也无法保证下一次出现。
- **现状证据**：[NODES.md](../../research-workspace/NODES.md) 的节点输出只有
  `final.md` / `final/vN`；[guides/61](../../docs/guides/61-run-playbook.md) 的交付路径是
  review PASS → HITL2 → `run-accept`；`node-gate`/`schema-scan` 不检查 reader-facing 产物；
  [ResearchFinalTab](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 只承接
  `final.md`/`final/vN` 与 review 静音条。
- **机制约束（必须一起考虑，否则方案落不了地）**：
  1. `schema-scan.hygieneOf` 的 D28 顶层白名单只允许 `run.md` / `question.md` / `topics.md` /
     `plan.md` / `leads.md` / `findings.md` / `review.md` / `final.md` / `journal.md` / `audit.md` /
     `node-gate.md` / `acceptance.md` / `delivered.json` / `manifest.json`，以及 `plan/`、`leads/`、
     `evidence/`、`provenance/`、`final/`、`journal/`、`drafts/`；**新 run 在 bundle 根放
     `readable-final.md` 会直接核心违约**。
     独立文件只能放 `final/`（`final/` 内额外 `.md` 不受顶层白名单限制）或先改白名单 + 测试。
  2. `node-gate` 门②/④/门A 只认 `final/vN`、review 终局、audit；reader 若成为交付件，要考虑
     门禁是否要检查它，还是只做派生一致性测试。
  3. `run-receipt` 的 `FILE_ROLES`/`manifest.json` 需要 reader 角色（若它随交付走）。
  4. `ResearchFinalTab` 是用户实际看到的“终稿”页签；reader 若独立，产品面要决定：页签只显示
     reader、只显示 canonical、还是双视图。
  5. `present` 的 `files[]` 可以带多个文件；HITL2 呈卡与 present 的关系要明确：用户先看哪份，
     审计源是哪份。
  6. **不要新增 `run.md` phase**：run 生命周期是 `briefing → research → synthesis → review →
     delivery → accepted`；reader 更适合作为 `synthesis`/`review`/`delivery` 内的显性步骤，
     而不是第七个 phase。
  7. 旧场（无 `run.md`/无 reader）按 epoch 不回溯；新 run 才要求，缺失要有可见注记。
- **不在本卡范围**：改研究结论、重做证据、把 reader 做成第二份事实、替换 `final/vN`。

**问题与期望结果：** 可读终稿缺少显性流程位：没有阶段、owner、合同、验收。期望它成为 run 的
一个显性步骤，像 `final/vN` 一样可预期；缺失时可见，而不是靠 lead 临场发挥。

**当前情况：** 上面 7 条机制约束；现有 `final.md` 的受众问题见
[可读终稿缺面向人的可读层](2026-10-23-run-final-human-readable.md)。

**未决问题：** 这一步放在 synthesis 之后、review PASS 之后，还是 HITL2 之前？owner 是 lead、
还是独立的 editor/ops 角色？合同是单独文件还是 `final/vN` 的 reader-first 首节？名称与版本关系？
HITL2 呈卡时给用户看哪一份？交付时 reader-facing 是否必须随 `final/vN` 一起在场？旧的已交付
run 是否 epoch 豁免、不回溯？验收是机械门、读者探针，还是两者都要？

**下一步：** 与可读层卡一起推敲；先定“受众合同 + 流程位置”，再决定机械断言。不改 `final.md`。

## 已知与未决

- 已知：run 的生命周期是 `briefing → research → synthesis → review → delivery → accepted`；
  `final/vN` 在 delivery 前落，HITL2 拍板后 present；reader 若存在，应在用户看到 HITL2 之前就绪，
  否则用户仍只能读 canonical。
- 已知：`node-gate` 门②/④/门A 只认 `final/vN`、`review`、`audit`；没有 reader 对象。
- 已知：`schema-scan` 新 run 顶层白名单会拦 bundle 根的新文件；`final/` 是安全的落点候选。
- 未决：owner（lead 写 vs 独立编辑层）、产物位置（`final/` / 页签内 / 新目录）、与 `final/vN`
  的版本绑定、旧场策略、是否要求机械门。

## 方案与取舍

- **A. 作为 synthesis/review 后的 lead 步骤**：lead 从 `final.md` 派生 reader 版，review 顺带
  检查一致性。优点是 owner 明确；缺点是 lead 已很重，可能敷衍。
- **B. 作为独立 editor/ops 步骤**：读者面单独 owner，lead 只交 canonical。优点是受众分离；
  缺点是新增角色/成本，run 通道里不一定有人。
- **C. 作为 HITL2 前的“呈现层”**：由 HITL2 呈卡流程生成/展示，不落第二个文件。优点是用户直接
  看到；缺点是无法审计、无法复用、每次重生成。
- **D. 只做探针，不设阶段**：用读者探针逼 lead 写。缺点是探针不等于产物，仍会回退。

## 验收标准

- 在 NODES/lifecycle 或 guides/61 中有一个显性的 reader 步骤（名称、阶段、owner、输入/输出），
  且不新增 run phase。
- reader 产物有合同（结构、必须保留/省略、与 canonical 的关系）和验收：读者探针 + 一致性断言，
  至少一项机械。
- 落点通过 `schema-scan`：`final/` 派生或白名单更新，二者选一并加测试；`manifest`/`FILE_ROLES`
  同步（若随交付走）。
- HITL2 的呈现顺序明确：用户先看 reader，canonical 作为审计源；`present` 的 `files[]` 说明
  reader 是否随交付，以及 present 指针仍指 `final/vN`。
- 旧场不回溯；新 run 才要求；缺失有可见注记，不静默。

## 需要你拍板

1. 阶段：synthesis 后 / review PASS 后 / HITL2 前（推荐“review PASS 后、HITL2 前”）。
2. owner：lead / 独立编辑层 / ops（成本与质量取舍）。
3. 落点：`final/readable-vN.md` / 页签内双视图 / 其他。
4. 验收：只做读者探针，还是再加机械一致性门？

## 关闭条件

- 流程位、owner、合同、验收在 NODES/guides/测试中落地，并在一场真实 run 上走通；用户认可。
- 或经用户拍板并入已有节点/合同（关闭时记去向）。
