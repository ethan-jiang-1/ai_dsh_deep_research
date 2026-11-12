---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-158：verdict-audit 在 review.md 整缺时只 warning——「critical unverifiable + 无 readiness」不产生红（最终靠 node-gate 兜底）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — required 下 review.md 缺席/空升 RED（readiness 无法核不能当 PASS）（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/verdict-audit-core.mjs` 的 `review-missing` / `pass-with-unverified` 判据。
> 关联：run-accept 同时跑 node-gate，后者对 review.md 缺席**判红**（实测），本条是 verdict-audit 自身的
> 防空缺口 + 报告口径问题。

## 症状

claims 里有一条 **critical** 且裁决为 `unverifiable`，review.md **整个缺席**：

```
reviewText = ''    → problems=[]  warnings=['unverified-critical','review-missing']
reviewText = null  → problems=[]  warnings=['unverified-critical','review-missing']
reviewText = 'no readiness here' → problems=['review-round-ref']  warnings=['unverified-critical']
```

即：**没有 review.md** 时，`pass-with-unverified` 的红色判据（critical 未决 + readiness PASS 的矛盾）没有
对象，audit 只剩两条 warning → **PASS**。同一场景若 review.md 在场（哪怕只有一句无关文字）反而会红
（`review-round-ref`）。「文件越缺越绿」——audit 的防空方向反了。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { auditClaimVerdicts } from './scripts/lib/verdict-audit-core.mjs';
const claim = { id:'C1', text:'甲', critical:true, urls:['https://e/a'] };
const item = { claim_id:'C1', verdict:'unverifiable', quote:'', reason:'打不开', rechecked_urls:['https://e/a'], batch:0 };
const raw = JSON.stringify([item]);
const claimsText = JSON.stringify({ version:1, finalRef:1, claims:[claim] });
const verdictsText = JSON.stringify({ version:1, round:1, batches:[{ session:'s1', preset:'critic', depth:1, raw }], verdicts:[item] });
const sessions = { s1: { preset:'critic', depth:1, parentSession:'p1', assistantTexts:[raw], toolNames:[] } };
for (const reviewText of ['', null]) {
  const out = auditClaimVerdicts({ required:true, claimsText, rounds:[{round:1,text:verdictsText}], finalVersion:1, finalText:'# F\n\n甲\n', reviewText, sessions });
  console.log(JSON.stringify(reviewText), out.problems.map(p=>p.code), out.warnings.map(w=>w.code));
}
// → '' [] ['unverified-critical','review-missing']；null 同上
"
```

## 交付面兜底（实测）

同一形态的 bundle（删掉 review.md）跑 `node-gate --no-write`：

```
A final/ 版本记账在场而 review.md 缺席（非 quick_factual 豁免形态）——审查前置整缺的交付 ...（红，exit 1）
```

即交付整体**不会**被这条 audit 缺口放行（node-gate 兜底），所以本条是 P2：**verdict-audit 作为独立门
的防空失效**，其报告「PASS」会误导；若未来 run-accept 只跑 verdict-audit（拆门/新增消费者）就会成为
真 bypass。

## 根因（已证）

1. `pass-with-unverified` 的触发条件挂在「review 的 readiness 解析结果」上；review 缺席 →
   `readiness-unparsed`/`review-missing` 都只 warning → 红色判据无从触发；
2. 相反，review 在场但不含版本引用 → `review-round-ref` 红——于是出现「缺文件比有坏文件更安全」的
   反直觉行为；
3. audit 的 header 声称 `unverified-critical` 要「readiness 只能 FAIL，HITL2 必须显形缺口」——但没有把
   「review 缺席 = 无法证明 readiness」升级为红。

## 影响面

- verdict-audit 的独立 PASS 不可信（缺 review 时）；
- 若 review.md 被误删/未落盘，audit 报告全绿，排障者会先怀疑别处；
- 与 [BUG-157](BUG-157-verdicts-missing-session-only-warning.md) 同族：**必要输入缺席 = warning**。

## 修复判据

1. `required` 且 claims 在场时，**review.md 缺席/空** → RED（`review-missing` 升 problem），错误点名
   「交付需要 readiness 裁决」；
2. 保留 legacy/pre-contract 的告警豁免（`legacy` 分支）；
3. 先红后绿：上表两行——当前 problems=[]（红）→ 修复后 RED；review 在场且 readiness PASS + 无 critical
   未决的对照组仍 PASS；`review-round-ref` 行为不回归；
4. `pnpm test` + `pnpm verify` 绿；run-accept-smoke 复跑（其合成 bundle 都有 review）；
5. 与本轮 [BUG-157](BUG-157-verdicts-missing-session-only-warning.md) 一起评审「必要输入缺席」的统一口径。

## 修复关联

[BUG-157](BUG-157-verdicts-missing-session-only-warning.md)（session 缺失）同一类「缺席即放行」；
node-gate 的 review 缺席红判据可作参考实现。发现方式 = verdict-audit 的输入缺席变异（reviewText ''/null）。

## 已落地（2026-11-13）

- 证据 = `tests/run/verdict-audit.test.mjs` BUG-158。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
