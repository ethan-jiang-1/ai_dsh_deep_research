---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-157：verdicts 的 batch.session 缺失只 warning——伪造裁决可引用不存在的 child 会话通过（身份/原文未核）

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — required 下 batch.session 缺失从 warning 升 RED（交付期裁决出处必须可核）（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/verdict-audit-core.mjs` 的 `session-missing` 分支（warning）。

## 症状

构造一份 claim 表 + 裁决文件，`batch.session = 'fake-session-id'`（**不存在的会话**），其余字段自洽：

```
problems = []        ← 没有任何红
warnings = [session-missing] "只核到文件自洽，原文与身份未核"
```

即：**裁决可以引用一个根本不存在的 child 会话**，verdict-audit 仍 PASS。D44 的核心合同（critic child
逐字复核、原文落盘、身份可核）在这条路径上完全未执行。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { auditClaimVerdicts } from './scripts/lib/verdict-audit-core.mjs';
const claim = { id:'C1', text:'甲', critical:true, urls:['https://e/a'] };
const item = { claim_id:'C1', verdict:'supported', quote:'甲', reason:'', rechecked_urls:['https://e/a'], batch:0 };
const raw = JSON.stringify([item]);
const claimsText = JSON.stringify({ version:1, finalRef:1, claims:[claim] });
const verdictsText = JSON.stringify({ version:1, round:1, batches:[{ session:'fake-session-id', preset:'critic', depth:1, raw }], verdicts:[item] });
const out = auditClaimVerdicts({ required:true, claimsText, rounds:[{round:1,text:verdictsText}], finalVersion:1, finalText:'# F\n\n甲\n', reviewText:'readiness: PASS\n当前裁决 = verdicts-r1.json\n', sessions:{} });
console.log(out.problems.map(p=>p.code), out.warnings.map(w=>w.code));
"
# 实测：[] [ 'session-missing' ]（应为 RED：裁决来源不可核）
```

## 根因（已证）

1. `session-missing` 被设计为 **warning**（「只核到文件自洽」）——对**存档后日志被清理**的旧 bundle 合理，
   但**交付时**（run-accept 运行的时刻）child 会话必然存在；
2. verdict-audit 是 D44 的唯一机械门；node-gate/evidence-audit 不检查 verdicts 的 child 身份；
3. 于是「裁决是谁做的、原文是否逐字」在 session 缺失时全部跳过，且不阻断交付。

## 影响面

- **伪造裁决可交付**：不存在的 child 会话 + 自洽的 claim/quote 即可过门；
- 「原文逐字」「身份/深度/父会话」四条判据（session-preset / session-depth / not-verbatim / raw-reparse）
  在 session 缺失时同时失效；
- 与「只查在场不查内容」（153/154）同族：**证据出处未核**。

## 修复判据

1. **交付期 fail-closed**：`required`（run-accept 预检）且 claims 在场时，任一 `batch.session` 不存在 →
   **RED**（`session-missing` 从 warning 升为 problem）；错误点名 batch/session 与「先补语料或走存档豁免」；
2. **存档豁免**：对「日志已清理的旧 bundle」（例如交付日 + 宽限期后，或显式 `--allow-missing-sessions`）
   保留 warning；豁免需在报告里显式登记（不静默）；
3. 先红后绿：上例——当前 problems=[]（红）→ 修复后 RED；sessions 在场的正常裁决仍 PASS；
   真实 bundle（8 个带 claims 的）回归；
4. `pnpm test` + `pnpm verify` 绿；run-accept-smoke 的 claim 用例复跑。

## 修复关联

D44（claim 级复核）；与 [BUG-148](BUG-148-evidence-short-quotes-not-audited.md)（门槛放行）/
[BUG-153](BUG-153-protocol-snapshot-presence-only-not-content.md)（在场即通过）/
[BUG-154](BUG-154-manifest-roles-missing-new-artifacts.md)（清单缺内容）同族：**证据本体/出处未进入判据**。
发现方式 = verdicts 的 batch.session 变异（不存在的 id）。

## 已落地（2026-11-13）

- 证据 = `tests/run/verdict-audit.test.mjs` BUG-157。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
