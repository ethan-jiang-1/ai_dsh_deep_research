# 偏好层：Protocol 数据层 + 既有文本面投影

> 状态：implemented
>
> 关联：[issue 卡](../../_backlog/_archived/settled_issues/2026-11-11-preference-protocol-layer.md) · [D46](../../docs/decisions.md#d46) · [核验材料](../../_backlog/research/preference-layer/2026-11-11-preference-protocol-verification.md) · [表达层补篇](../../_backlog/research/preference-layer/2026-11-11-preference-protocol-expression.md)

## 决定

一次 run 的研究设计收束为 bundle 根 **`protocol.json`（canonical）**：`schema/version/status/created/approved_at/approval_basis` + `method`（id/kind/四字段快照/adjustments）+ `source_scope` + `effort` + `output` + `gates` + `deviations`。`question.md §Protocol`、HITL1 卡、派发 brief、review §4b、HITL2、final 设计头都是它的**派生投影**，不另写第二份设计。

- **判据与门**：`scripts/lib/protocol-core.mjs`（schema 半：枚举/canonical/hash/validate/解析）+ `scripts/lib/protocol-audit-core.mjs`（bundle 审计半：effort 合同/投影/批准链/plan-ref/audit/版本）+ `scripts/run-gates/protocol-audit.mjs`（CLI 0/1/2，`--write` 落 `protocol-audit.md` 版本指纹）；接 `run-accept` 第四道预检；epoch = 2026-11-11，旧 bundle 豁免。
- **内容面**：`content/templates/run/protocol.json` 写者契约；question/plan/final 模板小改；`research-brief`（5 维卡/投影/approval_basis/复合方法）、`lead.patch.yml`（卡 + HITL2 设计行）、`team-assembly`（派发切片）、`adversarial-review`（§4b）、`scout/lead-mapping`（source_scope）接线；`docs/design/30`、pack README、`docs/evaluation.md` L4 ⑥ 同步。
- **表达层只接既有文本面**：不新增视觉/客户端/交互点；`projectionOf()` 是以后驾驶舱/导出的唯一缝。
- **复合方法与批准类型**：`method.id` = 主方法 + `adjustments` 写补法（gate 用「包含」而非「相等」）；`approval_basis = card | revision | auto`（draft 为 null）。
- **pilot 驱动的值级放宽（不升 schema）**：effort 的 `nodes/cells` 声明 cap 可高于 band（warning；实际 `plan` 顶层 / `topics` cells 仍按 `min(cap, band)` 卡）；`allowed_depths` 非空 ⊆ L0–L3；`recency` 接受 `as-of-capture` / duration / `YYYY-MM/YYYY-MM`；`source_scope.families` 接受 slug（推荐集外 warning）；`output.shape` 增 `landscape_map`；`adjustments` 接受字符串或 `{what, owner?, role?, lens?}`；`deviations.dimension` 接受子路径、`authority` 增 `lead`；`gates.critic` 增 `light`。

## 输掉的方案

- **只落 JSON + gate、不接表达面**：JSON 只在交付时被 gate 读；卡/派发/review/HITL2/final 仍手写——等于又一份表达，A11/A12 没有证据面。
- **5 行投影当整张卡**：5 行本身 138 字，加问题/业务简报/指针必超 200；改 5 维度卡（实测 159–177）。
- **为复合方法加 `parts[]`**：`id` 主方法 + `adjustments` 已覆盖 4/4 真实复合方法；v1 不为一组纸面跑加结构。
- **卡-vs-JSON 门 / 驾驶舱投影 / output 终稿机检**：v2；v1 由 projection gate、critic §4b 与人审兜底。
- **放宽 D44 claim 层来换 pilot 全绿**：D44 是既有层；pilot 2/3 的 `verdict-audit` 红如实记残余，不在本卡改 D44。

## 实际跑过的验证

- **L0**：`pnpm verify` 全绿；`pnpm test` **1152 全绿**（protocol-core 20 例 + run-accept smoke protocol ⑩）。
- **L1/L3**：`preset-smoke` ALL PASS；`l4-lite-smoke` ALL PASS（真模型五角色 + scout 工具调用）；`snapshot-replay-smoke` 全场景 PASS（lead persona 重录，`source.note` 记未提交工作树）。
- **M2**：`run-accept-smoke` ALL PASS（protocol 绿 / 缺工件 `no-protocol` 红 / 改字节 `protocol-changed` 红 / `--write` 落版本指纹）。
- **M4 pilot（3 场）**：
  - Pilot 1 `drt_openai-api-pricing-context`（quick）：`run-accept` **绿**；protocol 首版 6 红（5 schema 过紧 + cells）→ 修订后 0；HITL2 218/221/235 字（>200）；final 设计头缺失；`deviations` 未记 403 偏离。
  - Pilot 2 `drt_llm-memory-landscape`（deep）：`protocol-audit` PASS；node/evidence/path/secret/date PASS；review §4b 抓到 `deviations` 缺口（A12 行为证据）；`run-accept` 仅 D44 `verdict-audit` 红（最新 r2 覆盖/raw）。
  - Pilot 3 `drt_ai-model-regulation-cn-eu-us`（deep）：`protocol-audit` PASS；node/evidence/path/secret/date PASS；A11 派发切片 3/3（`Protocol v1：方法/来源/投入/输出` 一行）；`run-accept` 仅 D44 `verdict-audit` 红（batch raw 逐字）。
  - 读数：计划卡 187 / 188 字；HITL2 218/221/235 字；A11 抽 6/6 带切片；review §4b 在 pilot 2 咬住。
- **审查**：机械门禁全跑；语义自审按 `reviewing-a-delivery` 走查；用户 2026-11-11 选择「接受 Protocol 层残余收口（D44 另案）」。

## 残余风险

- **D44 claim-verdict 在 deep run 不稳**：raw 逐字、四值、最新一轮覆盖在 pilot 2/3 各红一次；属既有 claim 层，另案。
- **HITL2 实测 218–235 字 >200**：persona 纪律未达（Protocol 行都在）。
- **pilot 1 final 设计头缺失、`deviations` 未记**：模型行为；pilot 2 已由 §4b 咬住。
- **`manual.md` T0 9,996/10,000**：`protocol.json` 未进手册 §目录约定（结构由模板/pack README/skill 拥有）。
- **lead snapshot**：重录于未提交工作树（`source.note` 已记；提交后更新 `codeAnchor`）。
- **v2 延后**：驾驶舱投影、output 终稿机检、卡-vs-JSON 门、`protocol_check` host 工具。
