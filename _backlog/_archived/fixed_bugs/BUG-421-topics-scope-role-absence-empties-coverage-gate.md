---
status: 已修
severity: P1
opened: 2026-11-24
---

# BUG-421：topics 缺 `scope_role` 时侦察覆盖门变成空门（删一个字段即可让覆盖缺口永不报警）

> 严重级别：P1 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：scope_role 缺失 = RED（判据前提不得为空）；显式 synthesis 仍免覆盖要求；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`leadsGate` 的覆盖判据（每个 `primary`/`comparison` topic 必须被至少一条「建议挖深」方向指向）只在 topic 声明了 `scope_role` 时成立。把 `- scope_role: primary` 这一行**删掉**（或写成拼错的值），判据立刻退化成 `覆盖 0/0`：

| topics | leads（完全没覆盖 T1） | leadsGate |
|---|---|---|
| 有 `- scope_role: primary` | 只有一条「已排除」方向 | **RED**「覆盖缺口：T1」 |
| 删掉 `- scope_role: primary` | 同上 | **PASS**「覆盖 0/0」❌ |

而 `topicsGate` 自身**不要求** `scope_role` 存在（删掉后仍 PASS），`topicsContractIssues` 也返回 `[]`——没有任何一处判据会把「这个字段没了」变成红。于是「结论覆盖缺口」这条门禁可以被一个字段缺失静默关掉，正好是仓规「防空语料 / 扫描到 0 个对象必须判红」禁止的形态。

## 分诊与授权

- 严重级：P1 — 交付前覆盖门静默失效（fail-open），且触发方式极低门槛（字段缺失/typo）。
- 表面 / 边界：run 门禁（[node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) `leadsGate` × [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseTopicsReport`）/ ① 代码（判据前提）。
- DSH 不变量：防空语料——判据的**前提为空**必须红，不得把「没声明」当「无需覆盖」。
- 触及面：none — checks 解析/判据 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 同一份 leads（T1 完全无覆盖）在 topics 有无 `scope_role` 两种形态下裁决相反。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leadsGate, topicsGate } from "./checks/lib/gates/node-gate-run-gates.mjs";
const LEADS = "# Leads\n\n## 方向: 无关方向\n\n- 状态: 已排除（与题无关，30 秒去留判丢弃）\n";
const withRole = "## T1: 通道\n\n- must_answer:\n  - a\n  - b\n- scope_role: primary\n- lenses: official\n";
const noRole = "## T1: 通道\n\n- must_answer:\n  - a\n  - b\n- lenses: official\n";
const gate = (topics) => { const d = mkdtempSync(join(tmpdir(), "bug421-")); try { writeFileSync(join(d, "topics.md"), topics, "utf8"); writeFileSync(join(d, "leads.md"), LEADS, "utf8"); return { leads: leadsGate(d), topics: topicsGate(d) }; } finally { rmSync(d, { recursive: true, force: true }); } };
const a = gate(withRole);
const b = gate(noRole);
console.log("有 scope_role → leaders:", a.leads.status, "|", a.leads.detail);
console.log("无 scope_role → leaders:", b.leads.status, "|", b.leads.detail);
console.log("无 scope_role → topics :", b.topics.status);
assert.equal(b.leads.status, a.leads.status);
'
```

实测：`有 scope_role → RED「覆盖缺口：T1…」` / `无 scope_role → PASS「覆盖 0/0」`；`无 scope_role → topics: PASS`（断言红）。

## 根因（已证）

1. [findings-core.mjs](../../../checks/lib/gates/findings-core.mjs) `parseTopicsReport`：`scope_role` 缺失时 `role` 保持 `''`，不做缺省、也不报问题；
2. [node-gate-run-gates.mjs](../../../checks/lib/gates/node-gate-run-gates.mjs) `leadsGate` 的 `required` 集合 = `role ∈ {primary, comparison}` 的 topic；集合为空时 `covered ⊇ required` 恒真；
3. `topicsGate` / `topicsContractIssues` 均无「每个 topic 必须有 scope_role」的要求（只校验 `must_answer` 数量、`lenses` 合法性、`depends_on` 图）。

## 牵出的失败类

- 同机制第 1 次（判据前提为空当"无需判"）｜处置：类修——`parseTopicsReport` 对缺 `scope_role` 的 topic 记 issue（或按模板默认 `primary` 并显式告警），并给 `leadsGate` 加防空：`required.size === 0 && topics 非空` → RED「无任何 primary/comparison topic，覆盖门无对象」。

## 修法方向

- `topicsGate`：topic 缺 `scope_role` 或值不在合法集 → RED（模板有该行，缺就是形态不全）；
- `leadsGate`：`required` 为空而 topics 在场 → RED（防空），措辞指向「补 scope_role 或确认本 run 无证据 topic」。

## 修复判据

- 复现脚本断言为绿（有/无 `scope_role` 裁决一致，均为 RED「覆盖缺口」或均为「缺字段」红）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：删掉 leadsGate / topicsContractIssues 的 scope_role 必填判据 → requiredCount=0，覆盖门变成空门。

```json fix-evidence
{
  "changes": [
    "checks/lib/gates/node-gate-run-gates.mjs",
    "checks/lib/gates/findings-core.mjs",
    "tests/run/gates/node-gate-leads.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-421：topics' tests/run/gates/node-gate-leads.spec.mjs",
    "exit": 1,
    "output": "缺 scope_role 时门仍 PASS（实际 detail 只报关键线索/owner 缺失，覆盖判据未触发）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-421：topics' tests/run/gates/node-gate-leads.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/gates/node-gate-leads.spec.mjs"
  }
}
```
