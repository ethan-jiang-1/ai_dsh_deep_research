---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-140：isHitl2Row 的词表双向误判——「待用户确认」仍算拍板（门③ fail-open 复发），「无异议/OK/approved/采纳」不算（误杀）

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — HITL2 pending 语义优先（待用户确认/等待/await），无 pending 的提及行默认算拍板；英文/同义决策计入（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`scripts/lib/node-gate-session-gates.mjs` 的 `isHitl2Row`（075 修复引入的
> `HITL2_NEGATIVE` / `HITL2_DECISION` 白名单）。**075 已归档为已修——本卡是其复发的邻接变体**。

## 症状

### A. fail-open 复发：「待用户确认」被当拍板

075 的修复把否定词表设为 `未拍板|未定|待确认|待定|等待|尚未|未决|待补|待审|未答复|pending`，
但 `待用户确认`（中间多了「用户」）不在表内；而决策词表含 `确认` → 该行被判为 **拍板行**：

```js
isHitl2Row('- 2026-11-23 HITL2 待用户确认（v2）')  // → true（应为 false）
```

合成 bundle 实测（v1 已拍板 + v2 是 pending 行 + 会话里只有 v1 的那次交付审阅 ask/reply）：

```
row(待用户确认) = true
gate = PASS | HITL2 事件链在场：最新 ask callId ask1 选定「定稿（按现稿交付）」
```

即 **v2 尚未裁决，门③ 仍 PASS**——075 要堵的 G8 形态在换一种措辞后原样复发。

### B. 误杀：合法决策措辞不在白名单

| §Decisions 行 | 实际含义 | isHitl2Row |
|---|---|---|
| `- HITL2：用户同意按现稿交付` | 拍板 | true（含「按现稿」） |
| `- HITL2：用户无异议` | 拍板 | **false** |
| `- HITL2: user replied OK` | 拍板 | **false** |
| `- HITL2: approved` | 拍板 | **false** |
| `- HITL2：采纳` | 拍板 | **false** |
| `- HITL2：确认交付` | 拍板 | true（含「确认」） |
| `- HITL2 定稿（附未决项：补研究 W3）` | 拍板（附跟进项） | **false**（含「未决」被否定表一票否决） |
| `- HITL2 通过（待补引用 3 处）` | 拍板（附跟进项） | **false**（含「待补」） |

白名单是中文动词的有限枚举：英文（本产品 UI/会话双语）、「无异议」「照办」「同意」的简写形式都不认——
真拍板被门③判红（交付被拦）。

## 复现

```sh
node --import tsx/esm -e "
import { isHitl2Row } from './scripts/lib/node-gate-session-gates.mjs';
for (const row of ['- HITL2 待用户确认（v2）', '- HITL2：用户无异议', '- HITL2: approved', '- HITL2：采纳'])
  console.log(JSON.stringify(row), '→', isHitl2Row(row));
"
# 实测：true / false / false / false（期望：false / true / true / true）
```

fail-open 的全链复现（合成 bundle + 会话日志）见上方「症状 A」；`hitl2RowGate` 返回
`PASS | HITL2 事件链在场…`。

## 根因（已证）

1. 否定判据是**词表枚举**（`待确认`），挡不住「待**用户**确认」「等待**你**拍板」「未**最终**裁决」等同义扩展；
   而决策词表含 `确认`，于是「待用户确认」同时命中「确认」→ 判为拍板；
2. 决策判据同样是**白名单枚举**，英文/同义决策措辞（无异议/OK/approved/采纳）落空；
3. 两个方向靠人工穷举维护，词表永远追不上自然语言——**fail-safe 方向应反过来**：含 pending 语义
   （待/未/等待/尚未/pending/await）即排除；**默认**把「有 HITL2 语义且无 pending」的行视为拍板行，
   而不是要求命中决策动词。

## 修复判据

1. **否定优先且可扩展**：`/(?:^|[\s：:（(])(?:待|未|等待|尚未|暂缓|pending|await)/i` 命中即排除
   （覆盖「待用户确认」「待你拍板」「尚未答复」「暂缓」）；
2. **默认拍板**：无 pending 的 HITL2 提及行按拍板计（含英文/同义），不再依赖决策动词白名单；
   若担心「HITL2 是什么」这类说明行被误计，可改为「提及 + 无 pending + 该行不是问句/说明句」；
3. 先红后绿：A 场景（v1 回复 + `HITL2 待用户确认（v2）`）当前 PASS → 修复后 RED；B 表四行当前
   false → 修复后 true；规范化行（定稿/追认/拍板）不回归；
4. 同步更新 `tests/run/node-gate-witness.test.mjs` 的 pending 用例（含「待用户确认」）；
5. `pnpm test` + `pnpm verify` 绿；真实 §Decisions 语料（含中英混排）复查。

## 修复关联

[BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md)（已修）
的**复发**：那条只枚举了 `待确认`，本卡证明词表路线挡不住同义扩展。与本轮
[BUG-141](BUG-141-readiness-inline-context-keyword-gap.md)（readiness 同类词表修复的残留）同族。

## 已落地（2026-11-13）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-140。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
