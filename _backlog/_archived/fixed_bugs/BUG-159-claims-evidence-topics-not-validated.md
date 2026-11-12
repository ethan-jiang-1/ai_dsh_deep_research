---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-159：claims 的 evidence/topics 从未与盘上对账——可引用不存在的证据文件或绝对路径，audit 无红；schema-scan 又只扫 .md

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — claims 的 evidence 校验安全相对路径/盘上存在，topics 与 topics.md 对账（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/verdict-audit-core.mjs`（`parseClaims` 只做形状校验）与
> `scripts/lib/schema-scan-core.mjs`（内容扫描只对 `.md` 文件）。

## 症状

claims 的 `evidence` / `topics` 字段**完全没有语义/在场校验**：

```
claims[0].evidence = ["evidence/nope.md"]        → problems=[]（不存在也通过）
claims[0].evidence = ["/Users/bowhead/secret.md"] → problems=[]（绝对路径也通过）
claims[0].topics   = ["T9"]                       → problems=[]（不存在的 topic 也通过）
```

而 `schema-scan` 的绝对路径扫描只针对 **`.md`** 文件（`if (!ent.name.endsWith('.md') || OPS_ARTIFACTS...) continue`），
所以把 `review/claims.json` 里的 evidence 改成 `/Users/bowhead/secret.md` 后：

```
node scripts/run-gates/schema-scan.mjs <bundle-copy>
→ ✓ 核心 schema 全齐（green）
```

即：claim 的**证据指针**可以指向不存在的文件或本机绝对路径，没有任何门会红。

## 复现

```sh
# 1) audit 不校验 evidence/topics（合成输入）
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { auditClaimVerdicts } from './scripts/lib/verdict-audit-core.mjs';
const make = (claim) => {
  const item = { claim_id:'C1', verdict:'supported', quote:'甲', reason:'', rechecked_urls:['https://e/a'], batch:0 };
  const raw = JSON.stringify([item]);
  return { required:true,
    claimsText: JSON.stringify({ version:1, finalRef:1, claims:[claim] }),
    rounds:[{ round:1, text: JSON.stringify({ version:1, round:1, batches:[{ session:'s1', preset:'critic', depth:1, raw }], verdicts:[item] }) }],
    finalVersion:1, finalText:'# F\n\n甲\n', reviewText:'readiness: PASS\n当前裁决 = verdicts-r1.json\n',
    sessions:{ s1:{ preset:'critic', depth:1, parentSession:'p1', assistantTexts:[raw], toolNames:[] } } };
};
for (const claim of [
  { id:'C1', text:'甲', critical:true, urls:['https://e/a'], evidence:['evidence/nope.md'] },
  { id:'C1', text:'甲', critical:true, urls:['https://e/a'], evidence:['/Users/bowhead/secret.md'] },
  { id:'C1', text:'甲', critical:true, urls:['https://e/a'], topics:['T9'] },
]) console.log(auditClaimVerdicts(make(claim)).problems.map(p=>p.code));
"
# 实测：[] [] []

# 2) schema-scan 不扫 review JSON 的绝对路径
cp -R research-workspace/drt_llm-inference-cost-routes /tmp/hyg-claims
node -e 'const fs=require("node:fs");const p="/tmp/hyg-claims/review/claims.json";const j=JSON.parse(fs.readFileSync(p,"utf8"));j.claims[0].evidence=["/Users/bowhead/secret.md"];fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")'
node scripts/run-gates/schema-scan.mjs /tmp/hyg-claims   # → 核心 schema 全齐（green）
```

## 根因（已证）

1. `parseClaims` 只检查 `evidence`/`topics` 是**字符串数组**，不检查路径形态（相对/`..`/绝对）与在场；
2. `verdict-audit` 的 claim 校验集中在 text/quote/verdict/batch，**从未打开 evidence 指向的文件**；
3. `topics` 没有任何地方与 `topics.md` 的 topic id 对账；
4. `schema-scan` 的绝对路径/跨 bundle 扫描只对 `.md` 内容生效（`review/*.json` 不在内），所以这类路径
   可以随交付清单外泄；
5. 交付清单（manifest）也不含 review/ 内容（[BUG-154](BUG-154-manifest-roles-missing-new-artifacts.md)），
   三层都没拦住。

## 影响面

- **证据指针可造假/失效**：claim 的 `evidence` 可以指向不存在的文件；验收者按清单去查会扑空；
- **本机路径外泄**：`/Users/...` 出现在交付 bundle 的 review JSON 里，路径卫生门看不见；
- 与 154（清单不含 review/）叠加：这些字段既不校内容、也不进清单哈希。

## 修复判据

1. `parseClaims`/audit：`evidence` 逐项校验——相对路径、无 `..`、`.md` 结尾、**文件在 bundle 内存在**，
   否则 RED（`claim-evidence`）；`topics` 可解析时与 topics.md 的 id 对账（解析不可用则 warning）；
2. `schema-scan`（或 path-hygiene）把**交付面全部文本文件**纳入绝对路径扫描（至少
   `review/claims.json`、`review/verdicts-r*.json`、`protocol.json`），或对 JSON 内容递归查绝对路径族；
3. 先红后绿：上表三行——当前 problems=[]（红）→ 修复后 RED/明确的 warning；真实 bundle（claims 合法）
   不回归；
4. `pnpm test` + `pnpm verify` 绿；run-accept-smoke 的 claim 用例扩展。

## 修复关联

[BUG-154](BUG-154-manifest-roles-missing-new-artifacts.md)（review/ 不入清单）/ [BUG-157](BUG-157-verdicts-missing-session-only-warning.md)
（session 缺失）/ [BUG-076](BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md)
同族：**新证据体/字段没有进入「存在性 + 可移植性」判据**。发现方式 = claims 字段的盘上对账 + schema-scan 内容面核对。

## 已落地（2026-11-13）

- 证据 = `tests/run/verdict-audit.test.mjs` BUG-159。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
