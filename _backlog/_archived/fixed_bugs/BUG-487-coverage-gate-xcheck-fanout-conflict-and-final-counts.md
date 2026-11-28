---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-487：`review-contract` 门 A 把跨 topic 对账卡逐行计入 `topic × lens` 格，与 `critic` 注脚记法冲突（伴终交付数字持续漂移）

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **`node-gate` 门 A 在 `critic` 已判 PASS 且终稿交付完成的 `drt_huawei-ascend-dd` 上独立判 RED**：
   - `A T1/official 声明 6 卡，盘上实际 7 卡；T3/official 声明 6 卡，盘上实际 7 卡；T3/official 声明 A4/B1，盘上实际 A4/B2`
   - 原因是 `evidence/xcheck-01-numeric-reconciliation.md` 声明 `supports: T1, T2, T3`、`lens: official`、`quality: B`。`critic-1` 在 `review.md:155-164` 将其放进表下 `**注 1（跨行卡）**` 并写明「不落入任何单行，亦未计入 48 卡」，而 `node-gate` 把该卡重复加进 `T1/official` 与 `T3/official` 两格。
2. **终交付回复与交付物继续沿用错误计数（`BUG-469` 所述算术漂移一直延续至回合结束）**：
   - `review/verdicts-r1.json` + `review/verdicts-r2.json` 实际为 **7 `supported` + 3 `partially_supported`**（共 10 条），Lead 在最终交付消息（`seq 949`）中仍汇报「10 条 critical claim … ——**8 supported、3 partially**」（`8 + 3 = 11`）；盘上共有 **49** 张证据卡，而 `final/v1.md:150` 与终交付消息仍仅写「48 张证据卡」。

## 分诊与授权

- 严重级：P1 — 门禁对跨 topic 对账卡按 `supports` 笛卡尔复计，而 `critic` 技能未规范该写法，致合乎常理的表下注脚记法必然撞红 `node-gate` 门 A。
- 表面 / 边界：`checks/lib/gates/review-contract.mjs`、`packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md` / node-gate + critic skill
- DSH 不变量：verify the world
- 触及面：覆盖表对跨 topic 卡片的统计合同
- 授权：等人拍板
- 批：2026-11-28-run-fidelity-and-gate-accuracy

## 复现

```bash
source tools/env.sh
node checks/run-gates/node-gate.mjs research-workspace/drt_huawei-ascend-dd --no-write
```

观察 `门A 交付完整性 = RED` 输出上述 `T1/official`、`T3/official` 计数不符项。

## 证据链

1. [review-contract.mjs](../../../checks/lib/gates/review-contract.mjs)（`L91-L143`）：`coverageIssues` 对每张证据卡的 `fm.supports` 中**每一个** `T\d+` 命中，都向 `counts.get(T# + '|' + lens)` 累加 1 张（`L98-L105`），遇到列值写 `—`（如 T2 的 `official` 列写了 `— n/a`）则在 `L118-L120` 跳过；因此跨 `T1, T2, T3` 的 `xcheck-01` 在 `T1/T3` 各复计 +1，在 `T2` 静默跳过。
2. `research-workspace/drt_huawei-ascend-dd/review.md`（`L157-L164`）与 [adversarial-review/SKILL.md](../../../packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md)（`L78-L88`, `L162-L171`）：技能未约定多 topic 对账卡应拆行复计还是表下注脚单列。
3. 终交付事件 `seq 949`（`runtime/harness-home/sessions/--Users-bowhead-ai_dsh_deep_research-research-workspace--/session-156a6ddc-5e3d-4fb5-bfff-c33c996b0667/session.v4.jsonl.zstd`）与 `final/v1.md:150` 实测仍包含 `48 张证据卡` 与 `8 supported、3 partially`。

## 建议方向 / 不越界边界

- 统一 `review-contract.mjs` 与 `adversarial-review` 对跨 topic 证据卡（`supports` 含多个 `T#`）的计数口径（要么技能要求每行复计+禁止仅用注脚，要么门禁支持唯一归属/跨行对账卡标注）。
- 在 Lead 交付前汇总前追加一次基于实际 JSON/目录计数的自检动作，杜绝 HITL2 错数带进终交付回应。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/review-contract.mjs",
    "packages/deep-research-pack/presets/critic/skills/adversarial-review/SKILL.md",
    "packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md",
    "tests/run/gates/review-contract.spec.mjs",
    "tests/fixtures/skill-golden/manifest.json",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/run/gates/review-contract.spec.mjs",
    "exit": 1,
    "output": "BUG-487: coverageIssues rejected exclusive per-topic counts when cross-topic xcheck card was declared in table footnote"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/run/gates/review-contract.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/review-contract.spec.mjs"
  }
}
```
