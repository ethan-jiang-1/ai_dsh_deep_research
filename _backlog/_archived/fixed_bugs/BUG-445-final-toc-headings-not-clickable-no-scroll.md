---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-445：终稿 FinalToc 章节目录渲染为不可点击 div，无法跳转到对应正文章节

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：FinalToc 目录项改为 <button type="button"> 并连接 bodyRef 对应标题 scrollIntoView；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在「终稿」页签展开「章节目录（N）」折叠面板后，列出的 H1–H3 章节条目只是纯文本 `<div>`，点击目录项既无交互态（非 `<button>`/`<a>`）也不会滚动 `.body` 到正文中对应章节（实测 `tag=DIV`，点击前/后容器 `scrollTop` 保持 `0 -> 0`）。

## 根因与边界

- [FinalToc.tsx](../../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx)（`L43-L49`） 直接将提取的 `headings` 映射为 `<div key={...} className={...}>{h.text}</div>`，既未绑定点击回调/锚点 id，也未在正文中定位对应标题节点执行 `scrollIntoView`。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/stage234.log`（`FAIL [S2-F] FinalToc 目录项可点击跳转正文对应章节（交互预期） — tag=DIV scroll=0->0`）。

## 复现

```sh
# 打开多节终稿的「终稿」页签，展开「章节目录」，点击二级或三级标题
# 实测元素为 <div>，点击无滚动响应
```

## 修复判据

1. `FinalToc` 目录项使用可访问语义控件（`<button type="button">`），点击可将 `.body` 内对应章节标题平滑滚动至可见区；
2. 键盘 Tab 与 Enter/Space 均可触发章节跳转。

## 分诊与授权

- 严重级：P1 — 长终稿章节目录仅可读不可点击跳转，核心阅读导航失效。
- 表面 / 边界：`FinalToc.tsx`、`ResearchFinalTab.tsx`、`ResearchFinalTab.module.css`。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`FinalToc` 仅把标题渲染为静态 `<div>`，既无交互控件也未持有终稿正文容器 `bodyRef`。

## 修法

`ResearchFinalTab` 将 `bodyRef` 传入 `FinalToc`，目录条目渲染为 `<button type="button">` 并按下标/文本匹配正文 `h1/h2/h3` 触发 `scrollIntoView({ behavior: 'smooth', block: 'start' })`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-final/FinalToc.tsx",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/ResearchFinalTab.module.css",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": "BUG-445 FinalToc：目录项必须是可点击 <button type=\"button\">"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/final-evidence.spec.mjs"
  }
}
```
