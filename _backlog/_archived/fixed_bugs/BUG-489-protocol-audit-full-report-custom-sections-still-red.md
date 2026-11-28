---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-489：`protocol-audit-core.mjs` 仅扩展了 6 个预设节别名，`full_report` 自定义英文 section slug 仍有 6 项 `[final-sections]` RED

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

在 `BUG-484` 归档后，对 `drt_huawei-ascend-dd` 复跑 `protocol-audit.mjs --no-write` 与 `run-accept.mjs --no-write`，`[final-sections]` 仅从 8 项降为 **6 项 RED**，仍阻断验收：

- `[final-sections] final 缺 protocol.output.sections「product-and-changes」对应的 H2「product-and-changes」`
- `[final-sections] final 缺 protocol.output.sections「landscape」对应的 H2「landscape」`
- `[final-sections] final 缺 protocol.output.sections「business-model」对应的 H2「business-model」`
- `[final-sections] final 缺 protocol.output.sections「dependency-boundaries」对应的 H2「dependency-boundaries」`
- `[final-sections] final 缺 protocol.output.sections「frontline-negative」对应的 H2「frontline-negative」`
- `[final-sections] final 缺 protocol.output.sections「landing-and-risks」对应的 H2「landing-and-risks」`

## 分诊与授权

- 严重级：P1 — 任何中文 `full_report` 只要在 `protocol.json` 的 `output.sections` 中按题目自定义英文 slug（而非局限于 `one_page_memo` 6 键），即使 `final/v1.md` 逐节写齐中文 H2，仍会在 `protocol-audit` 与 `run-accept` 上全红。
- 表面 / 边界：`checks/lib/gates/protocol-audit-core.mjs`、`packages/deep-research-pack/content/templates/run/protocol.json`、`presets/lead` 协议写者契约 / run-gates + preset
- DSH 不变量：fail-loud
- 触及面：门禁与验收合同
- 授权：等人拍板（触及门禁与验收合同）
- 批：2026-11-28-fetch-fallback-timeout-and-protocol-sections

## 复现

```bash
source tools/env.sh
node checks/run-gates/protocol-audit.mjs research-workspace/drt_huawei-ascend-dd --no-write
```

输出上述 6 项 `[final-sections]` RED（`run-accept.mjs --no-write` 亦在 `protocol-audit` 预检报 `landing-and-risks` 缺失并 exit 1）。

## 证据链

1. [`protocol-audit-core.mjs`](../../../checks/lib/gates/protocol-audit-core.mjs)（`L44-L63`, `L428-L440`）：`FINAL_SECTION_OF` 与 `FINAL_SECTION_ALIASES` 仅包含 `decision`、`options`、`criteria`、`tradeoffs`、`risks`、`coverage` 6 个键；其中 `落地条件与风险` 被放进了 `risks` 的别名数组而非 `landing-and-risks`。
2. 对这 6 键以外的任意自定义英文 slug，`checkFinalSections` 回退到字面包含比对 `h.includes(slug)`，而中文报告的 H2 为 `## 2. 产品与近 12 个月变化` … `## 7. 落地条件与风险`，不可能包含英文 slug，必然全部判红。
3. 与此同时，[`protocol.json` 模板](../../../packages/deep-research-pack/content/templates/run/protocol.json) 与写者契约并未约束 `output.sections` 必须使用中文节名或闭集 slug，导致 Lead 合法写出 `full_report` 英文 slug 后与门禁产生结构性冲突。

## 建议方向 / 不越界边界

- 明确单一真实契约（二选一，不要继续靠无限枚举中英字典打补丁）：
  - 方案 A（推荐）：在 `protocol.json` 模板与写者提示中明确中文报告的 `output.sections` 除 6 个内置标准键外直接写交付语言节名（与 `final.md` H2 对齐），并由 `validateProtocol` / 文档把这条写明；
  - 方案 B：若允许自定义英文 slug，则在 `protocol.json` 支持显式 `{ id, title }` 或仅对内置标准键做机械 H2 匹配、自定义自由 slug 交由 `critic` 的 `Protocol 兑现` 语义审查（避免假红）。
- 不修改 `vendor/dsh/` 与已完成历史 run 的 `protocol.json`。

## 修复关联

去向：implemented — [2026-11-28-fetch-fallback-timeout-and-protocol-sections](../../../notes/implemented/2026-11-28-fetch-fallback-timeout-and-protocol-sections.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/protocol-audit-core.mjs",
    "packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md",
    "tests/run/gates/protocol-core.spec.mjs",
    "tests/pack/contract/template-contract.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/protocol-core.spec.mjs tests/pack/contract/template-contract.spec.mjs",
    "exit": 1,
    "output": "BUG-489: 6 custom ASCII slugs produced 6 [final-sections] REDs on Chinese full_report; research-brief lacked output.sections contract"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/protocol-core.spec.mjs tests/pack/contract/template-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/protocol-core.spec.mjs"
  }
}
```
