---
status: 已修
severity: P1
opened: 2026-11-14
---

# BUG-169：readiness 终局把代码围栏里的判定当事——示例块可翻转 PASS/FAIL

> 严重级别：P1 ｜ 发现：2026-11-14 ｜ 状态：已修 — fenced code 在候选前 mask；用户当轮指示继续推进
>
> 位置：[review-readiness.ts](../../../packages/deep-research-pack/src/lib/review-readiness.ts) 的
> `verdictAnalysisOf` / `lastInlineVerdict`；消费 = node-gate 门、状态页、client-load、run-dashboard。
> 同族前科 = BUG-074/141/150（readiness 的行内引用/关键词窗口）。

## 症状

`lastInlineVerdict` 会跳过反引号、加粗、括号内的内容，但**不跳过 fenced code block**。围栏里的
`readiness: PASS|FAIL` 被当成行首裸写判定；当它与真实判定先后出现时，末位/候选仲裁会把示例块当终局：

```sh
TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { terminalReadiness } from './packages/deep-research-pack/src/lib/review-readiness.ts';
const a = 'readiness: PASS\n\n\`\`\`\nreadiness: FAIL\n\`\`\`\n';
const b = 'readiness: FAIL\n\n\`\`\`\nreadiness: PASS\n\`\`\`\n';
console.log(terminalReadiness(a)); // FAIL ← 真实终局是 PASS，围栏示例把它翻红
console.log(terminalReadiness(b)); // PASS ← 反向：真实 FAIL 被围栏示例放行
"
```

实测输出 `FAIL` / `PASS`；同一文件去掉围栏后分别返回 `PASS` / `FAIL`（对照）。

## 根因（已证）

判据只做**行级**装饰剥离（`stripVerdictDecor`：空白/引用/列表符/标题/加粗/反引号），没有
**块级**状态（fenced code 的 ```/~~~）。围栏内的 `readiness: FAIL` 行与正文行同形，直接进入
候选集；`verdictAnalysisOf` 的「无轮次者取最后一条」/范围仲裁因此把示例当真实终局。

## 影响面

- review.md 里只要有一段示例/模板/旧轮引文（fenced），就可能翻转终局；门②/③的前置 readiness、
  状态页、client-load 与 run-dashboard 全部吃这个值。
- 真实 FAIL + 围栏 PASS = **假绿**（交付门放行）；真实 PASS + 围栏 FAIL = 假红。
- 这是 readiness 范围的又一个「引文夺权」形态；与 BUG-150 的散文前缀不同，围栏是 Markdown 结构，
  不能靠「作者应写规范行」豁免。

## 牵出的失败类

- **C8 假红 / C7 假绿**（同一机制双向）+ **C4 文本/结构边界**（fenced block 未建模）。
- 同机制第 **4** 次（074 行内引用 → 141 上下文关键词 → 150 散文前缀 → 本条围栏）。类修：解析器
  先做块级剥离（fence/inline code），再逐行判候选；这条对 notes/readiness/verdict 三个读者都适用。

## 修复判据

- `verdictAnalysisOf` 在任何行匹配前维护 fence 状态（```/~~~，允许语言后缀），围栏内行一律不进入
  候选（保持空行/行号或显式跳过）。
- 矩阵：真实 PASS + 围栏 FAIL（前/后）、真实 FAIL + 围栏 PASS（前/后）、围栏内无语言/有语言、
  `~~~` 围栏、未闭合围栏（未闭合按剩余全文围栏处理或 fail-loud）。
- 反证：上面两例先红后绿；正对照（真实行在围栏外）值不变；`tests/contracts/verdict-conformance.spec.mjs`
  增这些形态。

## 修复关联

未修。触面 = 交付 readiness 判据，按 [_backlog/AGENTS](../../AGENTS.md) 转 `等人拍板`；
可与 BUG-150 的 range 仲裁同批。

## 修复落地（2026-11-14）

- **改动**：`review-readiness.ts` 新增 `maskFencedLines`（```/~~~、语言后缀、3 空格缩进、未闭合 → 剩余全文围栏），`verdictAnalysisOf` 先 mask 再逐行判候选；围栏里的示例/旧轮引文不再夺权。
- **证据**：`node --test tests/contracts/verdict-conformance.spec.mjs tests/run/review-readiness.spec.mjs` → 27/27 PASS；`pnpm typecheck` 通过。
- **反证**：旧实现下新矩阵 1 红（`readiness: PASS` + 围栏 FAIL 读成 FAIL）；修后绿。
