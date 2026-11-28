---
status: 已修
severity: P0
opened: 2026-11-28
---

# BUG-463：claims-verdicts 仅读最高轮 `verdicts-r<N>.json`，多批拆文件时前批裁决在驾驶舱变 `UNVERIFIED`

> 严重级别：P0｜发现：2026-11-28｜状态：已修 — `claims-verdicts.ts` 按轮次升序合并多文件裁决（高轮覆盖同 ID、坏文件 fail-loud）、`verdicts.json` 模板改双批单轮、`verdict-audit-core.mjs` 补批/轮歧义诊断，去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)，审查：agent（2026-11-28）

## 症状

在 `drt_huawei-ascend-dd`（会话 `session-156a6ddc-5e3d-4fb5-bfff-c33c996b0667`）中，Lead 将 10 条 critical claims 分两批派发给 `critic` subagent 复核（`W5.1` 批 1 与 `W5.2` 批 2），分别写入 `review/verdicts-r1.json`（`C1`–`C5`）与 `review/verdicts-r2.json`（`C6`–`C10`）。
实际上 10 条 claim 全部完成复核（7 `supported` + 3 `partially_supported`），但使用驾驶舱 `readClaimsAndVerdicts` + `joinClaimsVerdicts` 投影该 bundle 时，`C1`–`C5` 全部显示为 `UNVERIFIED`（5/10 未核查），仅 `C6`–`C10` 有裁决状态。

## 分诊与授权

- 严重级：P0 — 终稿「核查清单」把已复核的关键 claim 大面积误报为 `UNVERIFIED`，直接误导 HITL2 人工裁决。
- 表面 / 边界：`packages/deep-research-pack/src/lib/run/claims-verdicts.ts`、`packages/deep-research-pack/presets/lead.patch.yml`、`packages/deep-research-pack/content/templates/run/verdicts.json` / pack lib + preset prompt
- DSH 不变量：fail-loud
- 触及面：pack 公共行为 — 影响所有多批 claim 复核的运行态 bundle 投影
- 授权：等人拍板（用户 2026-11-28 直派放行）
- 批：2026-11-28-run-fidelity-batch — 同批卡：[BUG-464](./BUG-464-review-contract-false-red-on-table-major-and-bold-waiver.md)、[BUG-465](./BUG-465-plan-template-suggests-check-kind-and-lead-skips-backfill.md)、[BUG-466](./BUG-466-evidence-audit-misses-web-fetch-spills-and-inline-noise.md)、[BUG-467](./BUG-467-leads-gate-single-line-only-and-findings-contract-bypass.md)、[BUG-468](./BUG-468-reader-final-reintroduces-critic-rejected-claim.md)、[BUG-469](./BUG-469-long-run-compliance-drift-math-sections-and-batch-fetch.md)；批 Note：[2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)

## 复现

复现状态：稳定 — `source tools/env.sh && node --import tsx/esm` 调用 `readClaimsAndVerdicts` + `joinClaimsVerdicts` 读取 `research-workspace/drt_huawei-ascend-dd`
边界：pack lib (`claims-verdicts.ts`) — 对存在 `review/verdicts-r1.json`（C1–C5）与 `review/verdicts-r2.json`（C6–C10）的 bundle 执行投影

```sh
source tools/env.sh && node --import tsx/esm -e '
import path from "node:path";
import { openRun } from "./packages/deep-research-pack/src/lib/run/run-context.ts";
import { nodeRunSource } from "./checks/lib/gates/run-source-node.mjs";
import { readClaimsAndVerdicts, joinClaimsVerdicts } from "./packages/deep-research-pack/src/lib/run/claims-verdicts.ts";
const opened = await openRun(nodeRunSource(path.resolve("research-workspace")), "drt_huawei-ascend-dd");
const cv = await readClaimsAndVerdicts(opened.value);
console.log(joinClaimsVerdicts(cv.claims, cv.verdicts).rows.map(r => r.status));
'
# 输出前 5 项全为 "UNVERIFIED"，后 5 项为 supported / partial
```

## 根因（假设 → 已证）

1. **代码侧单文件假定**：[claims-verdicts.ts](../../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts)（`L177-L207`）的 `readLatestVerdicts()` 列出 `review/verdicts-r<N>.json` 后按 `b.round - a.round` 排序只读取 `rounds[0]`（本例中仅读 `verdicts-r2.json`），未合并同次或前置批次文件中未覆盖的 `claim_id`，也未检测 `round` 与文件编号混用问题。
2. **提示/模板诱导分文件**：[lead.patch.yml](../../../packages/deep-research-pack/presets/lead.patch.yml)（`L28`）写「按 3–5 条一批派 subagent…把每批 child 正文原文抄进 `review/verdicts-r<N>.json`（形状 = `templates/run/verdicts.json`）」，但 [verdicts.json](../../../packages/deep-research-pack/content/templates/run/verdicts.json) 只有一个单批示例，未显式说明「`<N>` 指审查轮次而非批号；同一轮多批应合写进同一个 `verdicts-r1.json` 的 `batches[]` 与 `verdicts[]`」。此外 Lead 在 `step 64` 同时并发起 `9dd8cb31` 与 `b38b64ae` 两批，也违反了 `lead.patch.yml:28`「等 completion notice 回来再派下一批」的串行约定。
- 根因证据：实跑 `readClaimsAndVerdicts` 输出 + `session-156a6ddc` `step 64/74–76` + `drt_huawei-ascend-dd/review/verdicts-r1.json` 与 `verdicts-r2.json` 原文。
- DSH 不变量：fail-loud — 同属第 1 轮复核却出现两个 `verdicts-r*.json` 分片时静默丢弃前片，既未报错也未合并。

## 牵出的失败类

- 同机制第 2 次（前例 = [BUG-437](./BUG-437-claims-verdicts-wrong-paths-and-verdict-enum-mismatch.md) 仅解决路径与四值枚举，未覆盖多批合并与轮/批歧义）｜处置：类修

## 修法

1. 在 `templates/run/verdicts.json` 示范双批单轮（`round: 1` + `batches[0..1]`），并在 `synthesis/SKILL.md` 明示 `<N>` 为审查轮次、同轮多批合写进同一文件 `batches[]`（保留 `lead.patch.yml` 不触碰 snapshot-replay B 金标准）；
2. 在 `claims-verdicts.ts` 按轮次由低到高以 `claim_id` 合并全部 `review/verdicts-r<N>.json`（高轮次覆盖同 ID，不丢弃前批；任一文件损坏/不可读均 fail-loud）；在 `verdict-audit-core.mjs` 对 r1/r2 不相交拆批补充明确批/轮歧义诊断。

## 修复判据

1. 当存在 `verdicts-r1.json`（C1–C5）与 `verdicts-r2.json`（C6–C10）时，`joinClaimsVerdicts` 返回全部 10 条真实裁决，不再出现假 `UNVERIFIED`；当高轮次重审覆盖同一 `claim_id` 时，高轮次胜出；
2. 单文件多 `batches[]` 形态继续全部通过；缺 `verdicts` 或声明无效时保持现有错误态，不退回静默。

## 修复关联

去向：implemented — [2026-11-28-run-fidelity-and-gate-accuracy-fixes](../../../notes/implemented/2026-11-28-run-fidelity-and-gate-accuracy-fixes.md)

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/claims-verdicts.ts",
    "packages/deep-research-pack/content/templates/run/verdicts.json",
    "checks/lib/gates/verdict-audit-core.mjs",
    "packages/deep-research-pack/presets/lead/skills/synthesis/SKILL.md",
    "tests/cockpit/lib/run/claims-verdicts.spec.mjs",
    "tests/run/gates/verdict-audit.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/cockpit/lib/run/claims-verdicts.spec.mjs tests/run/gates/verdict-audit.spec.mjs",
    "exit": 1,
    "output": "BUG-463 readClaimsAndVerdicts: actual [['C1','UNVERIFIED',null],...] !== expected [['C1','supported','q1'],...]; 模板必须示范同一轮多批合写进 batches[]"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/lib/run/claims-verdicts.spec.mjs tests/run/gates/verdict-audit.spec.mjs",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/lib/run/claims-verdicts.spec.mjs" }
}
```
