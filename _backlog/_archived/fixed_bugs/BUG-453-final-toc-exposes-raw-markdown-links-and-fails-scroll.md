---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-453：FinalToc 未剥离 Markdown 链接语法导致含外链或证据引用的标题裸露原始 URL 且点击无法跳转滚动

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（`stripMarkdownInline` 剥离链接与行内 Markdown 语法并与 DOM 标题文本对齐） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

终稿正文若在 Markdown 标题中包含普通链接（如 `## [参考文档标题]` 后跟 `(https://example.com/spec)`）或证据引用标注（如 `## 核心结论 [来源: evidence/un-charter-art23-en.md]`，`linkifyEvidenceCitations` 会将其转为 Markdown 链接），展开终稿顶部的「章节目录」时：
1. 目录项直接裸露原始 Markdown 链接的括号 URL 文本；
2. 点击含引用的目录按钮后正文完全不滚动（`scrollTop` 保持 `0`）。

## 根因与边界

- [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L328`）把经过 `linkifyEvidenceCitations` 转换后的 `linkifiedMarkdown` 传给 `FinalToc`；
- [FinalToc.tsx](../../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx)（`L25`、`L52`）抽取标题时仅剥离星号与反引号字符，未剥离 Markdown 链接（`[文本]` + `(url)`）语法；点击查找 DOM 标题时用含 `(url)` 的字符串去匹配实际仅含 `label` 的 `<h2>.textContent`，导致精准相等比较失败、静默不滚动。
- 现场证据：`runtime/smoke-workspace/ux-audit-r2-2026-11-27/batch-a.log`（`FAIL S0.4a TOC 含引用后缀标题可真滚动命中 — topAfterCite=0`）与截图 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-s0-final-toc-edge.png`。

## 复现

```sh
# 终稿 v1.md / readable-v1.md 中写入含 Markdown 链接或 [来源: evidence/...] 的二级标题
# 打开终稿页签 → 展开「章节目录」→ 观察目录文案裸露 (url) 且点击无法滚动到对应小节
node --import tsx/esm ~/.gemini/antigravity-cli/brain/76cb36c3-4eb9-4406-a90c-f3598216d26f/scratch/r2_batch_a.mjs
```

## 修复判据

1. `FinalToc` 抽取与匹配标题文本时按可见纯文本口径剥离 Markdown 链接（只保留 label text）/ 强调符 / 行内代码反引号（或消费未 linkify 的纯标题文本并对链接做 label 解包），使目录文案与 DOM `textContent` 一致；
2. 点击含外链或 `[来源: ...]` 后缀的目录按钮可稳定滚动定位到目标标题；补 `tests/cockpit/client/` 回归单测。

## 分诊与授权

- 严重级：P2 — 终稿带引用标题场景下目录展示乱码感强且跳转失效。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-final/FinalToc.tsx` + `ResearchFinalTab.tsx`。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`ResearchFinalTab` 将 `linkifyEvidenceCitations` 转换后的 Markdown 传给 `FinalToc`，而 `FinalToc.extractTocHeadings` 仅剥离星号与反引号字符，保留了 `[label]` + `(url)` 括号部分，造成目录文本裸露 URL 且与实际渲染的 DOM 标题 `textContent` 不匹配。

## 修法

在 `FinalToc.tsx` 新增并复用 `stripMarkdownInline`（剥离图片、多轮内联链接与参考链接、反斜杠转义、强调/行内代码/删除线，仅留可见标签文本），使目录展示文本与 DOM 匹配口径一致。

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
    "output": "BUG-453 FinalToc 裸露 linkified 引用 URL 且 scrolledCite=0"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/final-evidence.spec.mjs" }
}
```
