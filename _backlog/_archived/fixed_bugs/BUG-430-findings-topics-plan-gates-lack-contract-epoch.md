---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-430：findings / topics / plan 三门没有契约纪元豁免，全部历史 bundle 一律判 RED（同族五门都有）

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：三门接入契约纪元（2026-11-18）：历史 bundle 回到 PRE-CONTRACT 不计红，新 bundle 仍按现行判；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`gateBundle` 聚合 11 门，其中 **leads / version / heading / delivery / reader 五门**都实现了「交付日早于契约日 → PRE-CONTRACT 不计红」；而 **findings / topics / plan 三门没有**任何断代逻辑，今天（2026-11-24）的规则被**追溯适用**到全部历史 run：

| 门 | 有无契约纪元 | 仓内 56 个归档 bundle 的裁决 |
|---|---|---|
| leads | ✅ `LEADS_CONTRACT_DATE` | 多数 PASS / PRE-CONTRACT |
| version | ✅ `VERSION_CONTRACT_DATE` | 47 N/A · 8 PASS · 1 PRE-CONTRACT |
| heading | ✅ `HEADING_CONTRACT_DATE` | 56 PASS |
| delivery | ✅ `AUDIT_CONTRACT_DATE` | 35 PASS · 10 PRE-CONTRACT · 11 RED |
| reader | ✅ `READABLE_CONTRACT_DATE` | — |
| **findings** | ❌ 无 | **54 RED / 2 PASS** |
| **topics** | ❌ 无 | **21 RED / 35 PASS** |
| **plan** | ❌ 无 | **11 RED / 45 N/A** |

因为 `gateBundle` 只要任一门 RED 就整体 RED，**对任何历史 bundle 跑 `node-gate` / `run-accept` 必然红**——包括 2026-11-11 交付、当时完全合规的 `drt_anthropic-claude-api-limits`（今判「F# 标题缺冒号」，而该形态要求是 BUG-252…266 之后才立的）。

这与仓内既定纪律直接冲突：那五门的注释都写着「run bundle 是**交付记录**，不改历史；存量由 RFC 对账步处置」——同一条原则在 findings/topics/plan 三门缺席。

## 分诊与授权

- 严重级：P2 — 历史 run 无法再验收（全红），门禁对存量完全失去信号价值（54/56 红 = 无区分度）；不破坏数据。
- 表面 / 边界：run 门禁（[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) `findingsGate`/`topicsGate`、[plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) × [node-gate-contracts.mjs](../../../checks/lib/shared/node-gate-contracts.mjs) 的 `isPreContract`）/ ① 代码（断代缺失）。
- DSH 不变量：**同一类判据同一断代口径**；「未到该段 = N/A」「契约前 = PRE-CONTRACT 不计红」「违约 = RED」三态不得被压成两态。
- 触及面：none — checks 判据 + 单测。
- 授权：排查显式化，待分诊推进。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 对归档目录跑一遍即可看到分布（无需构造）。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findingsGate, topicsGate, leadsGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
import { planGate } from "./checks/lib/gates/plan-gate.mjs";
const ROOT = "research-workspace/archive";
const count = { findings: {}, topics: {}, plan: {}, leads: {} };
for (const name of readdirSync(ROOT)) {
  const dir = join(ROOT, name);
  if (!statSync(dir).isDirectory()) continue;
  for (const [key, fn] of Object.entries({ findings: findingsGate, topics: topicsGate, plan: planGate, leads: (d) => leadsGate(d) })) {
    const s = fn(dir).status;
    count[key][s] = (count[key][s] ?? 0) + 1;
  }
}
console.log(JSON.stringify(count, null, 2));
'
```

实测：`findings: { RED: 54, PASS: 2 }` / `topics: { PASS: 35, RED: 21 }` / `plan: { N/A: 45, RED: 11 }` / `leads` 有 PRE-CONTRACT 分支。

## 根因（已证）

1. [node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) 的 `findingsGate` / `topicsGate` 只是 `findingsContractIssues` / `topicsContractIssues` 的薄壳，无 `isPreContract` 判断；
2. [plan-gate.mjs](../../../checks/lib/gates/plan-gate.mjs) 全文零 `isPreContract` / 零契约日期常量（`grep -c isPreContract` = 0）；
3. 三门都缺「契约日期」常量——`node-gate-contracts.mjs` 已有 `LEADS/VERSION/HITL/HEADING/AUDIT/READABLE_CONTRACT_DATE` 六个，独缺这三门的立约日。

## 牵出的失败类

- 同机制第 1 次（同一纪律只在部分门落地；与 BUG-421/422 的「判据前提」、BUG-414 的「BOM 只在部分入口剥」同族）｜处置：类修——为三门补 `FINDINGS/TOPICS/PLAN_CONTRACT_DATE` 与 `isPreContract` 分支（交付日 < 契约日 → PRE-CONTRACT + 注记），并把「新门必须声明断代」写进门禁模板/自测。

## 修法方向

- `node-gate-contracts.mjs` 增三个契约日期常量（取各自规则的立约日，与 BUG 号对齐）；
- 三门在 RED 前先算 `isPreContract(bundleDir, asOf, date)`：真则状态 `PRE-CONTRACT` + `PRE_CONTRACT_NOTE`；
- 全量自测：`gates.e2e` 增一例「契约前 bundle 在三门上均为 PRE-CONTRACT 而非 RED」。

## 修复判据

- 复现脚本的分布变为：三门在契约前 bundle 上出现 `PRE-CONTRACT` 计数（不再吞进 RED）；
- 契约后 bundle 的真违约仍 RED（负控：构造一个 ≥ 契约日的不合规 bundle）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 findings/topics/plan 三门的 isPreContract 分支 → 契约前 bundle 一律 RED（历史 run 全部无法验收）。

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/node-gate-contracts.mjs",
    "checks/lib/gates/node-gate-run-gates.mjs",
    "checks/lib/gates/plan-gate.mjs",
    "checks/lib/gates/node-gate-core.mjs",
    "tests/run/gates/node-gate-contracts.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-430' tests/run/gates/node-gate-contracts.spec.mjs",
    "exit": 1,
    "output": "契约前 bundle 的 findingsGate expected 'PRE-CONTRACT' / actual 'RED'"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-430' tests/run/gates/node-gate-contracts.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/node-gate-contracts.spec.mjs"
  }
}
```
