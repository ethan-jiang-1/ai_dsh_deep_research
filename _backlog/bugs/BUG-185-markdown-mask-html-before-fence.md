---
status: 等人拍板
severity: P1
opened: 2026-11-14
---
# BUG-185：共享 Markdown mask 先剥 HTML 注释再剥 fence——围栏里的 `<!--` 会吞掉后面的真实内容

> 严重级别：P1 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及 notes/交付判据，需用户放行
>
> 位置：[scripts/lib/note-scan.mjs](../../scripts/lib/note-scan.mjs) 的 `maskFencedCode` 与
> [review-readiness.ts](../../packages/deep-research-pack/src/lib/review-readiness.ts) 的
> `maskReadinessLines`（两者都由 `tests/contracts/markdown-mask-conformance.spec.mjs` 钉同判）；
> 前科 = BUG-175/179。

## 症状

两个 mask 都先跑 `maskHtmlComments(lines)`，再跑 fence 状态机。**fenced code 里的 `<!--`** 被当成
真实 HTML 注释的开头；若它没有 `-->`，注释状态会一直持续到全文末尾，把 closing fence、后面的
真实证据/判定全部替换为空行。

## 复现（2026-11-14 实测）

```sh
cat > notes/implemented/2026-03-01-probe-html-in-fence.md <<'EOF'
> 状态：implemented

## 决定

探针：围栏里的 HTML 注释示例。

## 输掉的方案

没有。

```html
<!--
```

## 实际跑过的验证

真的跑过。
EOF
node scripts/verify/verify.mjs --only=note-format
# FAIL note-format … 缺"实际跑过的验证"节   ← 应 PASS（真实证据在围栏外）
rm notes/implemented/2026-03-01-probe-html-in-fence.md

TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e '
import { terminalReadiness } from "./packages/deep-research-pack/src/lib/review-readiness.ts";
const F = String.fromCharCode(96).repeat(3);
console.log(terminalReadiness(F + "html\n<!--\n" + F + "\n\nreadiness: PASS\n")); // null
'
```

## 根因（已证）

块级 mask 的顺序错误：HTML 注释是**正文容器**，fence 是**代码容器**；注释不能先于 fence 处理，
否则围栏里的 `<!--` 会开一个跨越围栏的注释。正确顺序是「先 fence（识别 code 范围）→ 再在
非 fence 行剥 HTML 注释」，或让注释扫描忽略 fence 内行。

## 影响面

- 合法的 Note 只要在代码块里展示 `<!--`（HTML 注释教学/示例），后面的证据节被吞 → note-format 假红；
- review.md 同理：围栏里的 HTML 示例可让真实 readiness 行消失 → 门/状态页无判定（假红）；
  反向若有旧判定在前，则会保留旧值（假绿）。
- 这是 175/179 的**顺序回归**：两个 mask 都修了「支持」，但组合顺序没有 conformance 覆盖。

## 牵出的失败类

- **C8/C7**（假红/假绿）+ **C4 块级结构顺序**。
- 同机制第 **3** 次（175 fence、179 HTML comment、本条二者组合）。类修：块级 mask 用单一状态机
  同时识别 fence/comment/indented code，而不是串行两次替换；conformance 加「fence 内 comment」矩阵。

## 修复判据

- `maskFencedCode`/`maskReadinessLines` 先生成 fence 范围，再只对 fence 外的行剥 HTML 注释；
  或合成一个状态机（fence 优先，comment 只在 fence 外）；
- 反证：上面的 Note → PASS；review → PASS；负例（注释在围栏外且未闭合）仍按 fail-closed 掩到末尾；
- `tests/contracts/markdown-mask-conformance.spec.mjs` 增「fence 内 `<!--`」「fence 内闭合注释」
  「fence 内 `-->`」三形态，notes/readiness 同判。

## 修复关联

未修。触面 = notes/交付判据，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
