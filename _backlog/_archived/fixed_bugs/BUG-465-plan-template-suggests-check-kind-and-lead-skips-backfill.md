---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-465：`plan.md` 模板注释混写 stage 词 `check` 诱导非法 `kind`，且 Lead 未回填 `task_id` 与 `## 剩余工作` 导致门 P 红与图谱全 `unmapped`

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

在 `drt_huawei-ascend-dd` 中：
1. `node-gate` 门 P 报 8 项 RED：`W5.1/W5.2 的 kind「check」不在闭集（broad-scan/deep-dive/cross-check/synthesis/review/gate/fetch）`；`「## 剩余工作」W2.1..W4.1 的 state「待 W1.1」等非法（待派发/进行中/完成/阻塞）`。
2. Lead 在 `step 14–18` 已创建 `task-1`–`task-10` 并在整个 run 中推进到 HITL2，但 `plan.md` 节点表全部 10 行的 `task_id` 仍为 `—`，`## 剩余工作` 也停留在立项初始文本未更新；驾驶舱 `planMappingOf` 计算结果 10 个节点全部 `unmapped`。

## 分诊与授权

- 严重级：P1 — 模板直接诱导模型产出门禁非法 `kind`，且 `task_id` 缺回填导致驾驶舱研究图谱全图显示「未映射」。
- 表面 / 边界：`packages/deep-research-pack/content/templates/run/plan.md` + `presets/lead` 调度执行纪律 / pack content + 跑态轨迹
- DSH 不变量：model-visible ⟺ logged
- 触及面：pack 公共行为 — 模板与 Lead 调度规范
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

复现状态：稳定 — `node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd` 复现门 P 红；`planMappingOf(planIndex(planTxt), [])` 复现 10 节点全 `unmapped`
边界：门禁与驾驶舱图模型 (`plan-gate.mjs` / `graph-model.ts`)

```sh
source tools/env.sh && node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd
# 门P：W5.1 的 kind「check」不在闭集...；「## 剩余工作」W2.1 的 state「待 W1.1」非法...
```

## 根因（假设 → 已证）

1. **模板注释混用 stage 与 kind 词汇**：[templates/run/plan.md](../../../packages/deep-research-pack/content/templates/run/plan.md)（`L15`）写着 `stage 由根节点 kind 派生（scan/dive/check/synthesis/review/gate；未知=unknown）`，括号里列的是 `stage` 名称（含 `check`）而非 `kind` 闭集（`broad-scan/deep-dive/cross-check/synthesis/review/gate/fetch`），导致 Lead 直接按模板抄出 `kind: check`（[plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs)（`L17`）不认 `check`）。
2. **`## 剩余工作` 与 `task_id` 回填缺失**：虽然 [synthesis/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md)（`L25`）和 [research-planning/SKILL.md](../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)（`L97-L100`）要求建 task 后立即回填 `task_id`、更新 `## 剩余工作`，但 Lead 在 `step 14–18` 创建 `task-1..10` 后未回写 `plan.md`，直到 HITL2 也未做呈卡前核对。
- 根因证据：`templates/run/plan.md` 第 15 行原文、`drt_huawei-ascend-dd/plan.md`、`session-156a6ddc` `step 14–18` 与 `node-gate` 实跑结果。
- DSH 不变量：不适用。

## 牵出的失败类

- 同机制第 1 次（相关前例 = BUG-043 曾要求呈卡前核对 `task_id`）｜处置：类修

## 修法

1. 修正 `packages/deep-research-pack/content/templates/run/plan.md` 第 15 行，把 `kind` 合法闭集（`broad-scan / deep-dive / cross-check / synthesis / review / gate / fetch`）与派生 `stage` 映射写法写清，消除 `scan/dive/check` 误导；
2. 强化 `lead.patch.yml` / `research-planning`：创建 Team task 后必须把 `task-N` 回填 `plan.md`，且 `## 剩余工作` `state` 仅用四值闭集（`待派发/进行中/完成/阻塞`）。

## 修复判据

1. `templates/run/plan.md` 注释清晰区分 `kind` 闭集与 `stage` 派生，不再把 `check` 放进无前缀的 `kind` 示例；
2. `pnpm verify` 检验模板与 `plan-gate.mjs` 枚举闭集双向一致（`plan-gate` 对模板自身与规范示例 PASS）。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/content/templates/run/plan.md",
    "packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md",
    "tests/pack/contract/template-contract.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/pack/contract/template-contract.spec.mjs",
    "exit": 1,
    "output": "BUG-465 plan.md template & research-planning: template kind enum contained check, research-planning listed search outside PLAN_KINDS"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/pack/contract/template-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/pack/contract/template-contract.spec.mjs"
  }
}
```
