---
status: 等人拍板
severity: P1
opened: 2026-11-14
---

# BUG-178：readiness 的 Markdown 容器仍有漏面——blockquote/缩进代码翻转终局，带括号的加粗标签假红

> 严重级别：P1 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及交付 readiness 判据，需用户放行
>
> 位置：[review-readiness.ts](../../packages/deep-research-pack/src/lib/review-readiness.ts) 的
> `maskFencedLines` / `normalizeLabelDecor`；前科 = BUG-169（围栏）/BUG-170（标签加粗）。

## 症状

BUG-169 的围栏剥离只处理**0–3 空格缩进的顶层 fenced block**；BUG-170 的标签归一只处理
`readiness` 后紧跟 `**` 再冒号。以下三种合法 Markdown 仍误判：

1. **blockquote 里的 fenced 示例**：`> ``` ` 不是顶层 fence；示例里的 `> readiness: FAIL` 被
   `stripVerdictDecor` 去掉 `>` 后当成真实判定；
2. **4 空格缩进代码块**（CommonMark indented code）未被 mask，`    readiness: FAIL` 被当成判定；
3. **`**readiness**（终局）：FAIL`**：标签加粗 + 判定词后的短括号；`normalizeLabelDecor` 只接受
   `**` 后直接冒号，于是 `null`。

## 复现（2026-11-14 实测）

```sh
TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e '
import { terminalReadiness } from "./packages/deep-research-pack/src/lib/review-readiness.ts";
const F = String.fromCharCode(96).repeat(3);
const cases = {
  "blockquote fence after PASS": "readiness: PASS\n\n> " + F + "\n> readiness: FAIL\n> " + F + "\n",
  "blockquote fence before PASS": "> " + F + "\n> readiness: FAIL\n> " + F + "\n\nreadiness: PASS\n",
  "indented code after PASS": "readiness: PASS\n\n    readiness: FAIL\n",
  "bold label + parenthetical": "**readiness**（终局）：FAIL\n",
};
for (const [k,v] of Object.entries(cases)) console.log(k, "=>", terminalReadiness(v));
'
```

实测：

```text
blockquote fence after PASS => FAIL   ← 真实 PASS 被示例翻红
blockquote fence before PASS => PASS  ← 反向：真实 FAIL + 示例 PASS 会被放行
indented code after PASS => FAIL
bold label + parenthetical => null    ← 应 FAIL
```

## 根因（已证）

- `maskFencedLines` 的 FENCE 只锚 `^ {0,3}`，没有容器前缀（`> `、列表缩进）与 indented code 的概念；
- `normalizeLabelDecor` 的 lookahead 只接受 `\s*[:：]`，不接受 `（终局）` 这类判定词后的短括号；
- `stripVerdictDecor` 会把 `> ` 当 blockquote 装饰剥掉，于是 blockquote 里的判定恢复成行首判定。

## 影响面

- review.md 的示例块（blockquote/缩进代码）可翻转终局：真实 FAIL + 示例 PASS = **假绿**；
  真实 PASS + 示例 FAIL = 假红；node-gate、状态页、client-load、run-dashboard 全部消费。
- 带括号的加粗标签是手册 `readiness（终局）:` 形态的自然加粗变体，当前直接判无判定（假红）。
- 与 169/170 同族：Markdown 结构建模只覆盖了「作者恰好会用的」几种容器，模型的自然写法仍漏。

## 牵出的失败类

- **C8/C7**（false red/green 双向）+ **C4 文本/结构边界**。
- 同机制第 **5** 次（074/141/150/169/170 → 本条容器/括号）。类修：readiness 也使用共享的
  Markdown 块 mask（支持容器前缀 + indented code + HTML 注释），标签 decor 在**短括号之前**归一；
  不要在每个消费者里各写一份。

## 修复判据

- 块 mask 支持：顶层 fence、blockquote（`> ` 前缀可 0-3 空格）、list item 内 fence、4 空格
  indented code、未闭合围栏；blockquote 内的 `readiness:` 不进入候选。
- 标签 decor：`**readiness**（终局）：FAIL` 与 `**readiness（终局）**：FAIL` 都判 FAIL；
  `**结论**：readiness: FAIL` 仍不夺权。
- 反证：上表四例先红后绿；`tests/run/review-readiness.spec.mjs` 与 `verdict-conformance` 增矩阵；
  正对照不变。

## 修复关联

未修。触面 = 交付 readiness 判据，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；
可与 169/170 的 Markdown 容器类修同批。
