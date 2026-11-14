# markdown-oracle/ · 真实 CommonMark 的 mask 外部 oracle

> 组宪章：本组不是手写语料，而是**录制的外部 oracle**——用 cockpit 同源的
> `mdast-util-from-markdown`（CommonMark，带 source position）把每个 fixture 的
> “代码块/HTML 注释剥掉后的行”算出来，冻结成 `oracle.json`。消费 =
> [markdown-mask-conformance.spec.mjs](../../contracts/markdown-mask-conformance.spec.mjs)。

## 为什么

`note-scan` 与 `readiness` 各有一份行级 mask（跨树不能直接 import）。此前 conformance 只断言
“两份实现一致”——两份共享同一个错误子集时照样绿。本组把 oracle 换成真实解析器，测试改为
**对 oracle 逐行一致**；两实现互证降为附加断言。

## 冻结规则

- **禁手改** `oracle.json`；改语料或 mask 语义 → 重录：
  `node dev/record-markdown-oracle.mjs`（`--check` 只比对不写，non-zero = 有分歧）。
- 录制器是 dev-only：它解析 `@deepseek-ai/dsh-client-ui-primitives` 的 devDependency
  `mdast-util-from-markdown`；**测试与 CI 不 import 解析器**，只读 JSON。
- 改 oracle 应预期 conformance 测试变红（先红后绿）；不许为了让测试绿而放宽 oracle。

## 覆盖

fence（顶格/blockquote/list/嵌套/未闭合/info 含反引号）、HTML 注释（行首/行内/跨行/未闭合/
注释后同行 fence）、indented code（段落续行 vs 空行后 vs 注释/heading/fence 后）、tab、CRLF、
0–3 空格容器。新增边界先加进 `dev/record-markdown-oracle.mjs` 的 `CORPUS` 再重录。
