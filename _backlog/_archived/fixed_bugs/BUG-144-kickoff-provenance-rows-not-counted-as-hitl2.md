---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-144：run-kickoff 的代理记账行被 075 的词表修复打哑——「OK/继续/就按这个吧」的合法代理拍板不再算 HITL2 行

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — 官方代理记账行（交付审阅 + 代理模拟）直接算拍板，原话 OK/继续/就按这个吧 不再被打哑（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`scripts/lib/node-gate-session-gates.mjs` 的 `isHitl2Row`（075 修复后要求命中
> `HITL2_DECISION` 决策词）与 `scripts/lib/hitl-provenance.mjs` 的 `closingProvenanceRow`（写侧，
> 行文固定、**不强制**任何决策词）。

## 症状

`run-kickoff --session … --prompt "<文本>"` 是官方记录的「自由文本关闭挂起」恢复手段；它把用户原话
摘录写进 §Decisions（`closingProvenanceRow`）。075 修复后，`isHitl2Row` 要求 **提及 + 无否定 + 决策词**，
而代理行的决策语义只在**用户原话摘录**里——原话是「OK」「继续」「就按这个吧」时没有任何决策词：

| 代理原话 | 记账行（节选） | isHitl2Row |
|---|---|---|
| `OK` | `…**HITL 交互 = 操作侧代理模拟…**：交付审阅 → 「OK」…` | **false** |
| `继续` | 同上 | **false** |
| `就按这个吧` | 同上 | **false** |
| `同意按现稿交付` | 同上 | true（含「按现稿」） |
| `补研究` | 同上 | true（含「补研究」） |

于是：**官方恢复路径记下的合法代理拍板，在门③眼里不存在** → 门③ RED（无 HITL2 拍板行），
即使 §Decisions 里明明有这一行、且它带着「操作侧代理模拟」的显式标注。

## 复现

```sh
node --import tsx/esm -e "
import { isHitl2Row } from './scripts/lib/node-gate-session-gates.mjs';
import { closingProvenanceRow } from './scripts/lib/hitl-provenance.mjs';
for (const text of ['OK', '继续', '就按这个吧', '同意按现稿交付'])
  console.log(JSON.stringify(text), '→', isHitl2Row(closingProvenanceRow({ cardKey: 'anchor-2', text, date: '2026-11-13' })));
"
# 实测：false / false / false / true（前三应是 true：行已显式标注代理模拟 + 交付审阅）
```

## 根因（已证）

1. **写侧/读侧不成对**：`closingProvenanceRow` 的行文固定为
   `…代理模拟…：交付审阅 → 「<用户原话>」……`，它保证的是「这是代理拍板」的**出处**，不保证原话含决策词；
2. 075 的修复把读侧的「提及即拍板」改成「提及 + 决策词白名单」，但**没有同步写侧的固定行文**，
   也没有为「代理模拟」这种显式出处开一条独立判据；
3. 行本身已经含 `代理模拟` + `交付审阅`（`isHitl2Mention` 的第二个分支就是为它写的），却被后面的
   决策词要求一票否决——自相矛盾：**mention 白名单专门认它，decision 白名单又不认它**。

## 影响面

- **合法交付被拦**：用 run-kickoff 自由文本关闭 HITL2 的 run（官方推荐恢复路径）在门③判红；
- 归因误导：§Decisions 明明有行，门报「无任何 HITL2 拍板行」——用户/A 会去补拍板，而不是发现词表问题；
- 与 [BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md) 同族但**不是同一修复点**：
  140 讲用户手写行的词表双向误判；本条讲**官方写入器**的行与读者不匹配（写侧不改 = 读侧必须认它）。

## 修复判据

1. **代理行独立判据**：`isHitl2Row` 对 `isHitl2Mention` 的第二分支（`交付审阅` + `代理模拟|hitl-answer`）
   直接认作拍板行（这正是该分支的存在理由），不再要求决策词；决策词要求只用于**自由手写**的 HITL2 行；
2. 或写侧加固：`closingProvenanceRow` 在行文里显式写「拍板：<原话>」/「（已拍板）」等决策词——但读侧
   仍应容忍历史行（兼容），故推荐 1；
3. 先红后绿：上表 4 行——当前 3 行 false（红）→ 修复后全 true；同时 140 的 pending 场景
   （`HITL2 待用户确认`）仍须 false（不能为拼词表把 pending 放回来）；
4. `tests/run/node-gate-witness.test.mjs` 补「代理记账行（原话=OK/继续/就按这个吧）计入」用例，
   并保留「pending 不计」；
5. `pnpm test` + `pnpm verify` 绿；真实 run-kickoff 记账行（历史 §Decisions）抽查。

## 修复关联

[BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md)（已修）
的**副作用**：[BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md) 是词表双向误判，
本条是**写侧/读侧不成对**（官方写入器不在读侧白名单里）。发现方式 = 把 `hitl-provenance` 的写侧与
`isHitl2Row` 的读侧做「同源对账」。

## 已落地（2026-11-13）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-144。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
