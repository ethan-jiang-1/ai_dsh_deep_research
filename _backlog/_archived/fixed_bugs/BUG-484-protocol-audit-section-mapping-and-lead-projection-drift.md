---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-484：`protocol-audit` `FINAL_SECTION_OF` 仅认 5 个预设 slug 且精确匹配 H2，致自定义 `full_report` 16 项结构红

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

对已交付的 `drt_huawei-ascend-dd` 运行 `protocol-audit.mjs --no-write`，共报 **18 项 RED**（另 `audit-missing` 1 条 warn）：

1. **8 项 `[projection-output]`**：`§Protocol 输出缺 section decision / product-and-changes / landscape / business-model / dependency-boundaries / frontline-negative / landing-and-risks / coverage`。
2. **8 项 `[final-sections]`**：`final 缺 protocol.output.sections「decision」对应的 H2「决策摘要」`，其余 7 个自定义 slug 直接报 `对应的 H2「<english-slug>」` 缺失。
3. **`[evidence-threshold]`**：`evidence/t3-d-china-mobile-procurement.md 的 quality=C 低于 protocol.gates.evidence_threshold=B（BUG-271）`。
4. **`[output-length]`**：`final 长度 3470 words < min 3500（BUG-272）`。

## 分诊与授权

- 严重级：P1 — `full_report` 只要按题定制了中文/编号 H2 与自定义 `sections` slug，交付前 `protocol-audit` 必然报满 `[final-sections]` 红项；同时暴露 Lead 在投影、`deviations` 记账与字数兜底上的配合缺口。
- 表面 / 边界：`checks/lib/gates/protocol-audit-core.mjs`、`research-workspace/drt_huawei-ascend-dd`（`protocol.json`, `question.md`, `final/v1.md`） / protocol-audit gate + preset prompt
- DSH 不变量：fail-loud
- 触及面：协议审计门禁与 Lead 投影/偏差记账规范
- 授权：等人拍板
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

```bash
source tools/env.sh
node checks/run-gates/protocol-audit.mjs research-workspace/drt_huawei-ascend-dd --no-write
```

## 证据链

1. [protocol-audit-core.mjs](../../../checks/lib/gates/protocol-audit-core.mjs)（`L44-L50`, `L415-L424`）：`FINAL_SECTION_OF` 仅包含 `{ decision: '决策摘要', options: '备选与取舍', criteria: '关键依据', tradeoffs: '备选与取舍', risks: '目前不能判断' }` 5 键；`checkFinalSections` 要求 `final/v1.md` 的 H2 集合 `headings.has(expected)` 严格字面命中。本例 `final/v1.md`（`L6-L144`）为中文编号标题（`## 1. 判决（首屏）` … `## 8. 覆盖与不可判`），而 [adversarial-review/SKILL.md](../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md)（`L55`）承诺「节标题可不同，内容语义要对」——门禁与评审技能规则直接打架。
2. [lead.patch.yml](../../../packages/deep-research-pack/presets/lead.patch.yml)（`L25`）要求「卡与 §Protocol 从 JSON 抄，不重写」，Lead 却在 `question.md:52` 把 `sections` 自行译成中文，触发 8 项 `[projection-output]`。
3. HITL2 与 `review.md` 已拍板接受 C9 唯一源 `t3-d`（`quality: C`）低于 `evidence_threshold=B` 的例外，但 `protocol.json:54` 的 `"deviations": []` 未追补记录；且 `countLength`（`protocol-audit-core.mjs` `L452-L458`）剔除表格/代码/URL 后 `final/v1.md` 实为 `3470 words`（< `min: 3500`）。

## 建议方向 / 不越界边界

- 明确 `protocol.output.sections` 与 `final` H2 的单一真实口径（写中文节名或定义可扩展的编号/别名对齐规则，不再把 `full_report` 锁死在 5 个旧模板 slug 字面匹配）。
- 补强 Lead 在接受 C 级关键证据时同步更新 `protocol.json.deviations` 与自检去表格 word 数的契约。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "tests/run/gates/protocol-core.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 1,
    "output": "BUG-484: checkFinalSections rejected numbered/aliased H2 headings; checkEvidenceThreshold red-flagged deviations-waived cards"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/protocol-core.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
