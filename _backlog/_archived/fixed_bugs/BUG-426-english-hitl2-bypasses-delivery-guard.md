---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-426：英文 HITL2 卡识别不出，交付代答闸对英文交付卡整体失效（默认档可把「定稿」投给未过审报告）

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：交付卡识别走 askKindOf（结构化 id 优先 + 英文兜底）；代答闸在英文面同样自拒；去向：implemented — 批 Note [2026-11-24-single-source-receipt-signature-topics](../../../notes/implemented/2026-11-24-single-source-receipt-signature-topics.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`deliveryAnswerGuard` 是交付前的运行纪律闸：交付审阅卡在场而 `review readiness` 非 PASS 时，**默认推荐档自拒**（否则会把「定稿」投给未过审报告，NODES 第 6 行「PASS = HITL2 前置」被绕过）。该闸的入口判定 `isDeliveryReviewCard` 只认中文：

| HITL2 卡 | `isDeliveryReviewCard` | `deliveryAnswerGuard({readiness:'FAIL', pick:'recommended'})` | `askKindOf` |
|---|---|---|---|
| 中文（`按现稿定稿` / `补研究`） | true | **自拒**（allow=false） | `hitl2` |
| 英文（`Finalize as is` / `More research`） | **false** | **放行**（allow=true）❌ | `hitl2` |
| 英文卡 + `askText='Delivery review'` | **false** | **放行** ❌ | `hitl2` |

即：同一张交付卡，`askKindOf`（判型正本）与 `isDeliveryReviewCard`（代答闸入口）结论相反——英文 run（或选项文案换成英文的 run）上，代答闸形同不存在。

## 分诊与授权

- 严重级：P2 — 交付前置的机械自拒在英文面失效（fail-open）；不会自动发生，需要操作侧用默认档代答才触发，但正是代答驱动（`hitl-answer`）的默认路径。
- 表面 / 边界：run 通道驱动（[ask-drive.mjs](../../../checks/lib/channel/ask-drive.mjs) `isDeliveryReviewCard`/`deliveryAnswerGuard`）vs pack 判型正本（[hitl-fold.ts](../../../packages/deep-research-pack/src/lib/events/hitl-fold.ts) `askKindOf`）/ ① 代码（判据分叉 + 语言面不全）。
- DSH 不变量：同一 wire 签名在两个模块必须同判；**结构化 id 优先**（BUG-146 已确立：`hitl2_delivery`），不得靠中文文案子串。
- 触及面：none — checks 判据 + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = receipt-and-signature-single-source-424-430。
- 批：receipt-and-signature-single-source-424-430。

## 复现

复现状态：稳定 — 英文选项集 + 空 askText，闸门 `allow=true`（应自拒）。

```sh
TSX_TSCONFIG_PATH=$(pwd)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --input-type=module -e '
import assert from "node:assert/strict";
import { isDeliveryReviewCard, deliveryAnswerGuard } from "./checks/lib/channel/ask-drive.mjs";
import { askKindOf } from "./packages/deep-research-pack/src/lib/events/hitl-fold.ts";
const enCard = [{ id: "hitl2_delivery", header: "Delivery review", prompt: "pick", options: [{ label: "Finalize as is" }, { label: "More research" }] }];
const zhCard = [{ id: "hitl2_delivery", header: "交付审阅", prompt: "选", options: [{ label: "按现稿定稿" }, { label: "补研究" }] }];
for (const [label, card, askText] of [["zh", zhCard, "交付审阅"], ["en", enCard, ""]]) {
  const isCard = isDeliveryReviewCard(card, askText);
  const guard = deliveryAnswerGuard({ isDeliveryCard: isCard, readiness: "FAIL", pick: "recommended" });
  console.log(label, "isDeliveryReviewCard=", isCard, "guard.allow=", guard.allow, "askKindOf=", askKindOf({ questions: card }));
}
assert.equal(deliveryAnswerGuard({ isDeliveryCard: isDeliveryReviewCard(enCard, ""), readiness: "FAIL", pick: "recommended" }).allow, false);
'
```

实测：`zh isDeliveryReviewCard= true guard.allow= false askKindOf= hitl2` / `en isDeliveryReviewCard= false guard.allow= true askKindOf= hitl2`（断言红）。

## 根因（已证）

[ask-drive.mjs](../../../checks/lib/channel/ask-drive.mjs) `isDeliveryReviewCard`：

```js
if (labels.some((l) => /定稿/.test(l)) && labels.some((l) => /补研究|修订/.test(l))) return true
return /交付审阅|定稿/.test(String(askText))
```

两条判据都是**中文文案子串**，既不看结构化 id（`hitl2_delivery`），也没有 [hitl-fold.ts](../../../packages/deep-research-pack/src/lib/events/hitl-fold.ts) `askKindOf` 里已有的英文兼容分支（`/定稿（按现稿交付）|按现稿定稿|finalize|deliver as[- ]is/i`）与 id 优先逻辑（`q.id === 'hitl2_delivery'`）。同一签名，两份实现，只有一份跟进了 i18n。

## 牵出的失败类

- 同机制第 2 次（中文子串判据 vs 结构化 id/英文；与 BUG-410 的「按 Error 取 message」同族：假设了一种输入形态）｜处置：类修——`isDeliveryReviewCard` 改为调用 `askKindOf(...) === 'hitl2'`（单点正本），或至少复制 id 优先 + 英文兜底两条；并加中/英/id-only 三形态同判的契约测试。

## 修法方向

- 判型统一走 `askKindOf`（pack 正本），`ask-drive` 不再自写文案正则；
- 若必须保留 askText 兜底，把英文词表与 `askKindOf` 同一份常量；
- 回归：中/英/id-only × readiness PASS/FAIL × pick recommended/显式 六格同判。

## 修复判据

- 复现脚本断言为绿（英文卡也自拒）；
- 中文卡与非交付卡行为不变（负控：普通计划卡 allow=true）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 isDeliveryReviewCard 的中文字面判据改回旧实现（不调 askKindOf、不认英文）→ 英文交付卡判 false。

```json fix-evidence
{
  "changes": [
    "checks/lib/channel/ask-drive.mjs",
    "tests/run/channel/ask-drive.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-426' tests/run/channel/ask-drive.spec.mjs",
    "exit": 1,
    "output": "英文交付卡 expected true / actual false（isDeliveryReviewCard 认不出）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-426' tests/run/channel/ask-drive.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/channel/ask-drive.spec.mjs"
  }
}
```
