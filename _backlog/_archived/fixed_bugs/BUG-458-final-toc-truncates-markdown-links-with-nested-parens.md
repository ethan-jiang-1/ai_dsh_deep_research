---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-458：FinalToc 对含嵌套括号 URL 的 Markdown 链接剥离不完整导致目录残留 URL 闭括号碎片

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（改用平衡括号扫描 `stripMarkdownLinks` 完整剥离嵌套括号链接） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-round3-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-round3-fixes.md)

## 症状

当终稿 `final/readable-v1.md`（或 `final/v1.md`）的一至三级标题中存在 URL 自带成对小括号的 Markdown 链接时（例如百科类常见链接 `## 参考 [United Nations](https://en.wikipedia.org/wiki/United_Nations_(disambiguation)) 说明`），正文 Markdown 渲染器可以正确解析显示为「参考 United Nations 说明」，但右栏「研究报告」→「章节目录」里抽取出的目录按钮文案会变成 **`参考 United Nations) 说明`**，多出一枚孤立右括号 `)`。

- 真实浏览器日志与截图实证：`runtime/smoke-workspace/ux-audit-r3-2026-11-27/screenshots/r3-s0-finaltoc-parens-edge.png` 与 `runtime/smoke-workspace/ux-audit-r3-2026-11-27/batch1.log`（`S0.2a tocItems=["边界目录测试","参考 United Nations) 说明","真实尾节 Conclusion",...]`）。

## 根因与边界

- 源码定位：[FinalToc.tsx](../../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx) 内 `stripMarkdownInline` 函数（针对 `BUG-453` 新加的剥离逻辑）。
- `stripMarkdownInline` 使用正则 `/\[([^\]]+)\]\([^)]*\)/g`（以及图片正则 `/!\[([^\]]*)\]\([^)]*\)/g`）按“遇到第一个 `)` 即止”匹配链接目标，遇到 Wikipedia / MSDN / Javadoc 等常见含平衡括号 `(...)` 的 URL 时过早截断在内层 `)`，导致外层 `)` 被当成标题正文残留在章节目录中（同时与正文 `h1/h2/h3.textContent` 不一致）。
- 边界说明：同样出现在引用块伪标题或其它复杂行内括号 URL 场景中；不影响正文渲染，只影响目录抽取文本与基于文本的匹配直观性。

## 复现

```sh
# 1. 在任意绑定 run 的 final/readable-v1.md 中写入标题：
#    ## 参考 [United Nations](https://en.wikipedia.org/wiki/United_Nations_(disambiguation)) 说明
# 2. 启动 DSH Web 打开该会话右栏「终稿」→ 展开「章节目录」
# 3. 观察目录项文案渲染为「参考 United Nations) 说明」，而正文标题渲染为「参考 United Nations 说明」
```

## 修复判据

1. `stripMarkdownInline`（或基于 AST / `mdast` / 平衡括号扫描替代非嵌套 `[^)]*` 正则）能够完整剥离含平衡小括号的 Markdown 链接/图片 URL，使 `## 参考 [United Nations](https://en.wikipedia.org/wiki/United_Nations_(disambiguation)) 说明` 抽取为与正文 `h2.textContent` 一致的 `参考 United Nations 说明`（无多余 `)`）；
2. 在单测（`FinalToc` 相关 `.spec.mjs`）补入含嵌套括号 URL 标题的回归用例并附红→绿复现证据，同步跑过 `pnpm verify && pnpm test`。

## 分诊与授权

- 严重级：P2 — 真实百科/文档类来源标题进入终稿章节目录时破坏视觉整洁并残留语法碎片，与 `BUG-453` 目标（目录文案与正文一致）仍留边角缝隙。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-final/FinalToc.tsx`（`stripMarkdownInline`）。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`FinalToc.tsx` 内 `stripMarkdownInline` 使用非嵌套正则匹配链接目标并在首个右括号截断，遇到 Wikipedia 等 URL 自带平衡括号 `(...)` 的链接时将外层闭合右括号漏进章节目录正文。

## 修法

在 `FinalToc.tsx` 新增 `findMatchingBracket`、`findMatchingParen` 与 `stripMarkdownLinks` 做平衡方括号/圆括号与转义扫描，支持嵌套链接与图片解包并递归清洗标签正文。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-final/FinalToc.tsx",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": "[ '审计终稿', '参考 United Nations) 说明', '深度 API (v2))) 概览' ] !== [ '审计终稿', '参考 United Nations 说明', '深度 API (v2) 概览' ]"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/final-evidence.spec.mjs" }
}
```
