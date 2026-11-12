---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-149：isHitl2Row 的 pending 词表仍有洞——「等回复/未最终裁决/挂起/推迟/未决/on hold」都被当拍板（140 修复的默认放行放大）

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — HITL2 行 fail-closed：无明确决策证据即不算拍板；pending 同义词（等回复/挂起/推迟/未决/on hold）不漏（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/node-gate-session-gates.mjs` 的 `isHitl2Row`（140 修复后：无 pending 语义的
> HITL2 提及行**默认算拍板**；pending 由固定词表判定）。**140 已归档为已修——本卡是其邻接变体的复发。**

## 症状

140 的修法把判据反成「pending 优先、否则默认拍板」：

```js
const HITL2_PENDING = /(?:待(?:用户)?确认|待定|等待|尚未|暂缓|未拍板|未定|未答复|pending|await)/i
if (代理行) return !HITL2_PENDING.test(line)
if (HITL2_PENDING.test(line)) return false
return HITL2_DECISION.test(line) || /HITL2/i.test(line)     // ← 任何 HITL2 提及都默认算拍板
```

「默认拍板」把 pending 词表的**任何遗漏**都放大成 fail-open。实测（应 pending 的行）：

| §Decisions 行 | 期望 | 实测 |
|---|---|---|
| `- HITL2 等回复` | pending | **APPROVE** |
| `- HITL2 未最终裁决` | pending | **APPROVE** |
| `- HITL2 挂起` | pending | **APPROVE** |
| `- HITL2 推迟` | pending | **APPROVE** |
| `- HITL2 待办：等用户` | pending | **APPROVE**（`待办` 不匹配 `待(?:用户)?确认`） |
| `- HITL2 未决` | pending | **APPROVE**（词表只有 `未定`） |
| `- HITL2 暂不交付` | pending | **APPROVE**（`暂缓` ≠ `暂不`） |
| `- HITL2 on hold` | pending | **APPROVE** |
| `- HITL2 awaiting reply` | pending | pending（`await` 命中） |

即：一张**明确未决**的交付审阅行，换个自然措辞就会让门③把它当拍板（配合旧答复即可 PASS）。

## 复现

```sh
node --import tsx/esm -e "
import { isHitl2Row } from './scripts/lib/node-gate-session-gates.mjs';
for (const t of ['- HITL2 等回复','- HITL2 未最终裁决','- HITL2 挂起','- HITL2 推迟','- HITL2 待办：等用户','- HITL2 未决','- HITL2 暂不交付','- HITL2 on hold'])
  console.log((isHitl2Row(t) ? 'APPROVE' : 'pending'), t);
"
```

## 根因（已证）

1. 「默认拍板」与「pending 词表」不匹配：默认放行的安全前提是 pending 判定**完备**，而词表永远不完备；
2. 词表遗漏的成因是**同义扩展**（等/挂起/推迟/暂不/未决/待办/hold…），不是随机错误；
3. 140 修好了「无异议/OK/approved」的误杀，却把 fail-open 面从「缺决策词」搬到「缺 pending 词」——
   同一个有限枚举问题换了个方向。

## 修复判据

1. **fail-closed 默认**：含 HITL2 提及、且**没有明确决策证据**（拍板/定稿/批准/通过/同意/无异议/
   OK/approved/…）的行 → 判 **未决（红）** 并提示补明确措辞；不要默认拍板；
2. pending 与决策都不命中时的第三态 = 红（带诊断），不是放行；
3. 先红后绿：上表 9 行——当前 8 行 APPROVE（红）→ 修复后 pending/红；140 的合法拍板行
   （含「无异议/OK/approved」）仍算拍板；144 的代理记账行仍算拍板；
4. 同步把「未决」补进词表只作为过渡，长期以「默认未决」为准；
5. `pnpm test` + `pnpm verify` 绿；真实 §Decisions 语料（中英混排）复查。

## 修复关联

[BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md)
（已修）的复发；与 [BUG-144](BUG-144-kickoff-provenance-rows-not-counted-as-hitl2.md)
（代理行直接算拍板）互补：一个说哪些行该算，一个说**没明确决策证据就不该算**。发现方式 = 140 修复的
pending 邻接措辞矩阵。

## 已落地（2026-11-13）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-149。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
