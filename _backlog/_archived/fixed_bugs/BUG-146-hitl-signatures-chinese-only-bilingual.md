---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-146：HITL 判型/答复识别只认中文文案——英语卡让门③必红、UI 停靠点误判（id 本已语言无关）

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — HITL 判型优先用结构化 id（research_type/hitl2_delivery），门侧答复标签认 finalize/deliver as-is（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`packages/deep-research-pack/src/lib/hitl-fold.ts` 的 `askKindOf`（客户端锚点判型）与
> `scripts/lib/node-gate-session-gates.mjs` 的 `scanWitnessLogs`（ask 过滤 / 答复标签 `定稿` 要求）。

## 症状

HITL 卡片的判型与答复识别都依赖**中文文案签名**：

```js
// client: askKindOf
if (text.includes('定稿（按现稿交付）')) return 'hitl2'
if (text.includes('按现稿定稿')) return 'hitl2'
if (text.includes('研究类型')) return 'hitl1'
// gate: ask 过滤（认 hitl2 token，但答复 label 必须含「定稿」）
if (/交付审阅|hitl2|审阅与拍板|定稿（按现稿交付）/i.test(args)) asks.set(...)
const label = labels.find((l) => /定稿/.test(l))   // ← 英文选项 = 永远不命中
```

一张**英文** HITL2 卡（header `Delivery review (HITL2)`、选项 `Finalize (deliver as-is)`）实测：

| 面 | 结果 |
|---|---|
| **门③**（英文 ask + 英文答复） | **RED**：「会话语料无绑定本 bundle 的 lead 会话里 callId 绑定的答复（**选定定稿**）」——答复其实已答，只是标签不含「定稿」 |
| **UI 停靠点**（`deriveAnchors` 的英文尾部 ask） | `[anchor-1 passed, anchor-2 **upcoming**]`——开放的交付审阅没被判成 pending（应 anchor-2 pending，或至少 anchor-extra） |

即：**英语会话的 HITL2 拍板既不能在门③留证，也不在状态页显示为「等你拍板」**。

## 复现

```sh
node --import tsx/esm -e "
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hitl2RowGate } from './scripts/lib/node-gate-session-gates.mjs';
import { deriveAnchors } from './packages/deep-research-pack/src/lib/hitl-fold.ts';
// A. 门③：English ask + English reply（完整合成日志见 BUG-134 的模板，改 header/options/label 即可）
//    实测 hitl2RowGate(...).gate.status === 'RED'
// B. UI：deriveAnchors([session, english HITL2 ask], { question: true, delivered: false })
//    → [['anchor-1','passed'],['anchor-2','upcoming']]
"
```

（完整合成脚本见本卡附注：ask 的 `questions[0].id` 为 `hitl2_delivery`、options[0].label 为
`Finalize (deliver as-is)`；答复 `answers[0].selected` 同 label。）

## 根因（已证）

1. 判型签名被写成**文案子串**（`研究类型` / `定稿（按现稿交付）` / `按现稿定稿`）；
2. 门侧的答复收集要求 label 含 `定稿`——英语选项名不可能命中；
3. 但 **ask 的结构化 id 是语言无关的**：HITL1 首问 `id: research_type`、HITL2 卡 `id: hitl2_delivery`
   （两处签名早已在卡里）；判型完全可以用 id/结构，而不是文案；
4. 产品默认中文（D49）但**用户可切 English**，且模型在英文会话里会用英文写卡——这是合法输入，
   不是越界输入。

## 影响面

- **英语 run 的交付被门③拦死**（答复在，但不被认）；
- **状态页停靠点/流程锚点误判**（开放的交付审阅显示 upcoming，用户得不到「等你拍板」提示）；
- 与 [BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md) 同族（词汇依赖），但本条是
  **跨语言**（双语产品），且 ask 的 id 已经提供了无歧义判据；
- 客户端的「双语 UI」与「仅中文 HITL 签名」不一致，用户切英文后卡片/状态会混杂。

## 修复判据

1. **判型用结构 id 优先**：
   - HITL1：ask 的 `questions[0].id === 'research_type'`（或 header 命中「研究类型|research type」）；
   - HITL2：存在 `id === 'hitl2_delivery'` 的问题（或选项 label 命中 `定稿|finalize|deliver as-is`）；
   - 文案子串只作**历史兼容**兜底；
2. **门侧答复识别**：以「答的是 HITL2 ask（id）+ 选中项属于该 ask」为准；「定稿」文案改为
   `定稿|finalize|deliver as-is|finalize (deliver as-is)` 的多语正则，或直接按 selected id 判定；
3. 先红后绿：英文 ask+英文答复——当前门③ RED（红）→ 修复后 PASS；`deriveAnchors` 当前 anchor-2
   upcoming（红）→ pending；中文旧卡/历史卡不回归；
4. 若产品决定「HITL 卡文案永远中文」：则 skill/persona 必须显式钉住（英文会话也用中文卡），并在
   UI/文档写明——二选一，不能靠隐含；
5. `pnpm test` + `pnpm verify` 绿；X8/client-hitl 在 zh/en 两种卡下各跑一次。

## 修复关联

[BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md)（词表双向误判）/
[BUG-141](BUG-141-readiness-inline-context-keyword-gap.md)（关键词窗口）同族：**语义判断依赖文案**。
本条的特殊性：ask 的 id 已经语言无关，修法应优先用结构而非扩充词表。发现方式 = 双语产品 × HITL 签名的
语言面实测。

## 已落地（2026-11-13）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-146。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
