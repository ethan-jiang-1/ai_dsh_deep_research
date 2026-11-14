---
status: 等人拍板
severity: P1
opened: 2026-11-14
---

# BUG-179：HTML 注释不剥——notes 证据可从注释里「长出来」，readiness 可被注释翻转

> 严重级别：P1 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 notes/交付判据，需用户放行
>
> 位置：[scripts/lib/note-scan.mjs](../../scripts/lib/note-scan.mjs) 的 `maskFencedCode` 与
> [review-readiness.ts](../../packages/deep-research-pack/src/lib/review-readiness.ts) 的
> `maskFencedLines`；前科 = BUG-175（围栏/隐藏 md）、BUG-169（围栏）。

## 症状

两个 mask 只处理 fenced code，不处理 **HTML 注释**（`<!-- … -->`，可跨行）。注释里的行仍被当成正文：

- `note-format`：只有注释里的 `## 实际跑过的验证`、没有真实证据节 → **PASS**（假绿）；
- `readiness`：真实 `readiness: PASS` + 注释里的 `readiness: FAIL` → **FAIL**；反向 → **PASS**
  （假红/假绿）。

## 复现（2026-11-14 实测）

```sh
cat > notes/implemented/2026-02-01-probe-html-comment.md <<'EOF'
> 状态：implemented

## 决定

探针：HTML 注释里的证据标题。

## 输掉的方案

没有。

<!--
## 实际跑过的验证
这只是注释示例。
-->
EOF
node scripts/verify/verify.mjs --only=note-format
# PASS note-format        ← 应红：没有真证据节
rm notes/implemented/2026-02-01-probe-html-comment.md

TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e '
import { terminalReadiness } from "./packages/deep-research-pack/src/lib/review-readiness.ts";
console.log(terminalReadiness("readiness: PASS\n\n<!--\nreadiness: FAIL\n-->\n")); // FAIL
console.log(terminalReadiness("readiness: FAIL\n\n<!--\nreadiness: PASS\n-->\n")); // PASS
'
```

## 根因（已证）

`maskFencedCode` / `maskFencedLines` 都只维护 fence 状态；HTML 注释的 `<!--` … `-->` 没有进入
块级 mask。注释里的行保持原样，`h2Titles` / `statusLines` / `readiness` 行扫描照常命中。

## 影响面

- notes 门禁：一条没有真实证据的 Note 可以在 HTML 注释里放一个示例标题通过；相反，注释里的
  状态行/否定标题会误杀合法 Note。
- readiness：交付 review.md 里 HTML 注释的示例（模板/旧文）可以翻转终局；P1 级交付判据。
- 与 BUG-175/169 同族：Markdown 块级结构只覆盖了 fence，HTML 注释是下一个容器形态。

## 牵出的失败类

- **C7 假绿 / C8 假红**（同一容器）+ **C4 文本/结构边界**。
- 同机制第 **2** 次（175 fence/隐藏 md → 本条 HTML 注释）。类修：块级 mask 支持
  fenced code + HTML 注释 + indented code + 容器前缀，notes/readiness 共用。

## 修复判据

- `note-scan.maskFencedCode` 与 readiness 的 mask 都支持跨行 `<!-- … -->`（未闭合按剩余全文
  注释处理，fail-closed）；注释内行替换为空行、行号保持。
- 反证：上面的 Note 必须红；readiness 两例分别回到 PASS/FAIL；正对照（注释外真实行）不变。
- 同时检查 `note-graduation-rewrite` 等复用 `note-scan` 的读者：注释里的计划体标记不再误报。

## 修复关联

未修。触面 = notes/交付判据，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；
可与 BUG-178 的 Markdown 容器 mask 同批。
