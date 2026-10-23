---
status: 推敲中
opened: 2026-10-23
---

# 推敲：可读终稿没有流程位（阶段 / owner / 合同 / 验收）

> 立卡：2026-10-23 ｜ 状态：推敲中 ｜ 类型：Task ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** 可读终稿现在不是一个显性的 run 阶段：`final.md` 完成后直接进 review →
HITL2 → delivery，没有“把它变成人读版本”的步骤、owner、合同和验收。即使临时写一份，下一次
run 也没有机制保证它出现。期望：可读终稿成为**显性的一步**（有 phase/owner/合同/验收），像
`final/vN` 一样可预期，而不是靠 lead 临场发挥。

**当前情况：** [NODES.md](../../research-workspace/NODES.md) 的节点输出只有 `final.md` /
`final/vN`；[guides/61](../../docs/guides/61-run-playbook.md) 的交付路径是 review PASS → HITL2 →
`run-accept`；`node-gate`/`schema-scan` 不检查 reader-facing 产物。现有 `final.md` 的受众问题
见 [可读终稿缺面向人的可读层](2026-10-23-run-final-human-readable.md)。

**未决问题：** 这一步放在 synthesis 之后、review PASS 之后，还是 HITL2 之前？owner 是 lead、
还是独立的 editor/ops 角色？合同是单独文件还是 `final/vN` 的 reader-first 首节？名称与版本关系？
HITL2 呈卡时给用户看哪一份？交付时 reader-facing 是否必须随 `final/vN` 一起在场？旧的已交付
run 是否 epoch 豁免、不回溯？验收是机械门、读者探针，还是两者都要？

**下一步：** 与可读层卡一起推敲；先定“受众合同 + 流程位置”，再决定机械断言。不改 `final.md`。

## 已知与未决

- 已知：run 的生命周期是 `briefing → research → synthesis → review → delivery → accepted`；
  `final/vN` 在 delivery 前落，HITL2 拍板后 present；reader-facing 若存在，应在用户看到 HITL2
  之前就绪，否则用户仍只能读 canonical。
- 已知：`node-gate` 门②/④/门A 只认 `final/vN`、`review`、`audit`；没有 reader 对象。
- 未决：owner（lead 写 vs 独立编辑层）、产物位置（bundle 根 / `final/` / 独立 `readable/`）、
  与 `final/vN` 的版本绑定、旧场策略。

## 方案与取舍

- **A. 作为 synthesis/review 后的 lead 步骤**：lead 从 `final.md` 派生 reader 版，review 顺带
  检查一致性。优点是 owner 明确；缺点是 lead 已很重，可能敷衍。
- **B. 作为独立 editor/ops 步骤**：读者面单独 owner，lead 只交 canonical。优点是受众分离；
  缺点是新增角色/成本，run 通道里不一定有人。
- **C. 作为 HITL2 前的“呈现层”**：由 HITL2 呈卡流程生成/展示，不落第二个文件。优点是用户直接
  看到；缺点是无法审计、无法复用、每次重生成。
- **D. 只做探针，不设阶段**：用读者探针逼 lead 写。缺点是探针不等于产物，仍会回退。

## 验收标准

- 在 NODES/lifecycle 或 guides/61 中有一个显性的 reader 步骤（名称、阶段、owner、输入/输出）。
- reader 产物有合同（结构、必须保留/省略、与 canonical 的关系）和验收（读者探针 + 一致性断言，
  至少一项机械）。
- HITL2 的呈现顺序明确：用户先看 reader，canonical 作为审计源；present 仍指 `final/vN`。
- 旧场不回溯；新 run 才要求；缺失有可见注记，不静默。

## 关闭条件

- 流程位、owner、合同、验收在 NODES/guides/测试中落地，并在一场真实 run 上走通；用户认可。
- 或经用户拍板并入已有节点/合同（关闭时记去向）。
