---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-170：readiness 不认加粗标签 `**readiness**: FAIL`——合法 Markdown 被判「无判定」

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — 标签加粗/反引号归为装饰；用户当轮指示继续推进
>
> 位置：[review-readiness.ts](../../../packages/deep-research-pack/src/lib/review-readiness.ts) 的
> `stripVerdictDecor` / `VERDICT_LINE`；同族 = BUG-169（Markdown 结构未完整建模）。

## 症状

`readiness` 前后的加粗装饰只支持两种位置：整行包裹（`**readiness: PASS**`）和值前包裹
（`readiness: **PASS**`）。**只加粗标签**的常见形态被判为无判定：

```sh
TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { terminalReadiness } from './packages/deep-research-pack/src/lib/review-readiness.ts';
for (const s of ['**readiness**: FAIL', '- **readiness**: FAIL', '### **readiness**: FAIL', '**readiness: FAIL**']) console.log(JSON.stringify(s), terminalReadiness(s));
"
# **readiness**: FAIL       => null
# - **readiness**: FAIL     => null
# ### **readiness**: FAIL   => null
# **readiness: FAIL**       => FAIL（整行包裹才认）
```

`stripVerdictDecor` 去掉行首 `**` 后得到 `readiness**: FAIL`；`VERDICT_LINE` 在 `readiness` 与
`:` 之间不接受 `**`，于是 `null`。

## 根因（已证）

`stripVerdictDecor` 的装饰词表只覆盖「行首整段」与「值前」两种加粗位置；没有把「标签本身加粗」
（`**readiness**`）视为装饰。`VERDICT_LINE` 的 `^readiness(?:\s*（…）)?\s*[:：]` 不允许 `**` 落在
标签与冒号之间。

## 影响面

- 交付 review.md 用 `- **readiness**: FAIL`（列表里加粗标签是常见 Markdown 写法）时，门禁
  `readinessOf` 读到 missing → 红（false red）；状态页显示未判定。
- 与 BUG-169 同批：readiness 的「Markdown 结构」只覆盖了作者恰好会用的几种位置，模型/人手写
  自然变体被误杀；假红会迫使修改格式，而不是修判定。

## 牵出的失败类

- **C8 假红**（结构变体未纳入）+ **C4 文本/结构边界**。
- 同机制第 **2** 次（169 是围栏，本条是标签加粗）。类修：`stripVerdictDecor` 把
  `**label**` / `__label__` / 反引号标签都当装饰，再交给同一 `VERDICT_LINE`。

## 修复判据

- 允许 `**readiness**:` / `__readiness__:` / `` `readiness`: `` / `- **readiness**:` / `### **readiness**:`
  与 `**readiness: PASS**` 同判；PASS/FAIL 值大小写不敏感。
- 负对照：`**结论**：**readiness: FAIL**`（散文标签）仍不得夺权；`## **readiness**：FAIL` 认；
  `**readiness**：PASS | FAIL` 空模板仍按模板处理。
- 反证：上面四种形态旧实现 `null`，修后 FAIL；全量 `tests/contracts/verdict-conformance.spec.mjs`
  与 `tests/run/review-readiness.spec.mjs` 回归。

## 修复关联

未修。触面 = readiness 判据，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`；可与 BUG-169 同批。

## 修复落地（2026-11-14）

- **改动**：`stripVerdictDecor` 增加 `normalizeLabelDecor`：`**readiness**:` / `__readiness__:` / `` `readiness`: `` 在冒号前归为 `readiness:`；`VERDICT_LINE` 与空模板共用同一归一。
- **证据**：`node --test tests/contracts/verdict-conformance.spec.mjs tests/run/review-readiness.spec.mjs` → 27/27 PASS；`pnpm typecheck` 通过。
- **反证**：旧实现下 `**readiness**: FAIL` 等 7 形态读成 null；修后 FAIL；散文标签 `**结论**：...` 仍 null。
