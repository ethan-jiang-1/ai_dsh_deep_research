---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-467：`leadsGate` 只看单行 `- 支持来源:` 对多行列表误判 RED；`findings.md` 写法脱离契约导致门 F 与未消费检查全红

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

在 `drt_huawei-ascend-dd` 中：
1. `leads.md` 的 `0.2 主体状态` 与 `1.4 规格数字` 两节在 `- 支持来源:` 下方以缩进子列表列出多条带 `(A)/(B)/(C)/(D)` 分级的来源，但 `node-gate` 门 L 报「建议挖深但支持来源缺席或无 A–D 分级」。
2. Lead 产出的 `findings.md` 写成 `- **F0 主体口径**：…` + `- 来源：t1-a、t1-b`（简写前缀），导致 `node-gate` 门 F 报 `findings.md 无 F# 块`，`probes/analyze/unconsumed-evidence.mjs` 报 `已引用 0 · 未消费 49`。

## 分诊与授权

- 严重级：P1 — 合法多行 `leads` 来源被门 L 假红；同时 Lead 写出的 `findings.md` 绕开了整个 `findings` 结构契约与证据消费跟踪。
- 表面 / 边界：`checks/lib/gates/node-gate-run-gates.mjs` (`leadsGate`) + `presets/lead` 综合写作规范 / 门禁核 + preset
- DSH 不变量：fail-loud
- 触及面：门禁与验收合同 / pack 公共行为
- 授权：等人拍板（触及门禁与验收合同）
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

复现状态：稳定 — `node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd` 与 `node probes/analyze/unconsumed-evidence.mjs research-workspace/drt_huawei-ascend-dd`
边界：门 L (`node-gate-run-gates.mjs`) 与 `findings` 消费面 (`findings-core.mjs` / `unconsumed-evidence.mjs`)

```sh
source tools/env.sh && node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd
# 门L 报 0.2 与 1.4 缺支持来源或无 A–D 分级；门F 报 findings.md 无 F# 块
node probes/analyze/unconsumed-evidence.mjs research-workspace/drt_huawei-ascend-dd
# 输出：findings.md 在场 · 证据 49 张 · 已引用 0 · 未消费 49
```

## 根因（假设 → 已证）

1. **`leadsGate` 只读单行**：[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs)（`L79-L86`）使用 `body.match(/^\s*-\s*支持来源[:：].*$/m)`，当来源过多时 Scout 自然换行写成缩进子列表（`leads.md:21-24`、`65-68`），冒号同行 `srcM[0]` 为空，后面的 `(B)`/`(A)` 完全未被扫到。
2. **Lead 未按 `synthesis` skill 格式写 `findings.md`**：[synthesis/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md)（`L12`）与 [templates/run/findings.md](../../../packages/deep-research-pack/content/templates/run/findings.md) 明确规定 `## F<n>：<结论>` 块与 `- 支撑证据：evidence/<file>.md`、`lenses`、`lens_gaps`、`gap` 四个机器字段，但 Lead 未加载 `synthesis` skill（日志显示 Lead 在 `step 59` 未调 `skill("synthesis")` 即直接写 `findings.md`），自行写成了自由列表与简写卡号 `t1-a`。
- 根因证据：`node-gate-run-gates.mjs:79`、`drt_huawei-ascend-dd/leads.md:21-24,65-68`、`drt_huawei-ascend-dd/findings.md` 与 `session-156a6ddc` `step 58–60`。
- DSH 不变量：不适用。

## 牵出的失败类

- 同机制第 2 次（前例 = BUG-038 修复 `leadsGate` 对加粗分级的漏判；本次同函数未覆盖多行子列表）｜处置：类修

## 修法

1. `leadsGate` 支持收集 `- 支持来源:` 行及其后紧邻缩进子列表行（直到下一个顶级字段 `- <key>:` 或节边界）再判 A–D 分级；
2. 督促/自检：Lead 在 `synthesis` 阶段开工前必加载 `synthesis` skill 核对 `## F#：` 块与完整 `evidence/<file>.md` 路径；同时可考虑在 `critic` 审查清单或 `lead.patch.yml` 综合步明示 `findings` 块格式校验。

## 修复判据

1. `leadsGate` 对单行及缩进多行 `- 支持来源:`（含 A–D 分级）均判 `PASS`，对确实无 A–D 分级的多行列表仍判 `RED`；
2. 规范说明更新后，Lead 按 `## F#：` + `evidence/<file>.md` 写出 `findings.md` 并通过门 F 与 `unconsumed-evidence`。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/node-gate-run-gates.mjs",
    "packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md",
    "packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md",
    "tests/run/gates/node-gate-leads.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/node-gate-leads.spec.mjs",
    "exit": 1,
    "output": "BUG-467 leadsGate: multi-line indented - 支持来源: failed grade scan with status=FAIL"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/node-gate-leads.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/node-gate-leads.spec.mjs"
  }
}
```
