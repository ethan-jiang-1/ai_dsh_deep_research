---
status: 已修
severity: P2
opened: 2026-10-18
---

# BUG-039：门③ 不认代理代答 provenance 行；门A 的「未决项升级到用户裁决」只写在提示里、代码不认

> 状态：**已修**（门③ 判据已放宽并实测 RED→PASS；门A 判据已机械认升级路径，**同时澄清**：
> 本场那处门A 红**是对的**——它是运行纪律问题，不是门的问题）。

## 症状与根因（两条同族，都出自端到端真 run 的 node-gate.md）

1. **门③ RED**：§Decisions 里明明有 HITL2 的裁决记录（`hitl-answer` 按代驱记账纪律落的
   `**HITL 交互 = 操作侧代理模拟（hitl-answer 驱动…）**：Q1「交付审阅」→「按现稿定稿」`），
   但门③只认字面 `HITL2` → 判"无 HITL2 拍板行"。
2. **门A RED**：`final/` 记账在场 × readiness 非 PASS → 判"交付越过审查前置"。门的**修正提示**里
   写着"或按处置流程显式记账"（即 brief-fold 那条「审查未决项已按上限升级到本次审阅——由你裁决」），
   但**代码不认**这条路径——按处置流程走的 run 反而红。

## 修法（判据单一正本）

- 抽 `isHitl2Row(line)`（`scripts/lib/node-gate-session-gates.mjs`）并导出：① 字面 `HITL2`；
  ② **代理代答 provenance 行**（`交付审阅` + `代理模拟|hitl-answer`）；门③ 与门A 共用同一判据；
  门③ detail 如实标注"其中 N 条为代理代答"。
- 门A：readiness 非 PASS 时，**同时**满足「review.md 有升级/未决项记账」与「§Decisions 有 HITL2
  拍板行」→ 不判越过前置。**收窄有意**：只认 HITL2 行会打掉 4 条既有 A1 反证（blanket 豁免）。

## 澄清（本轮实测的新事实，写进卡以免误导后来者）

本场 bundle 的 `review.md` **0 处**升级/未决项字样，R1 结论是"三处 MAJOR 小改后可复审放行"——
即 critic 要的是**修复轮**，不是升级裁决。因此：

- **门A 这处红是对的**：该交付确实越过了"PASS = HITL2 前置"；
- 造因是**运行纪律**：**代理代答在 review FAIL 态选了「定稿」**（`hitl-answer` 默认取推荐档，
  而 Lead 在 FAIL 态仍呈了 HITL2 卡）。→ 归入"代答驱动用法"的注意事项，不是门禁缺陷；
- 我上一轮"门A 未覆盖升级路径"的说法据此**部分收回**：未覆盖是真的（仅存于提示文本），
  但**本场不适用**该路径。

## 实际跑过的验证

- 同场重跑 node-gate：**门③ RED→PASS**；门A 保持 RED（如上，正确）；
- 契约测试：`isHitl2Row` 形态用例（字面 / 代理 / 无标记提及 / 无关行）、门A 升级路径夹具
  `tests/fixtures/node-gate/bundles/fixture-escalation-adjudicated`（FAIL + 升级记账 + 拍板行 →
  不判越过前置）；同一文件带**负例留证**块（红配方 = 删分支/复原旧判据）；
- `pnpm test` 524/524（既有 4 条 A1 反证未改动仍绿）、`pnpm verify` 全绿。
