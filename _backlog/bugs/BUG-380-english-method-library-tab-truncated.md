---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-380：英文主 tab「Method Library」被截成「Method libr...」——主导航标签不可读全

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/locale-audit.png`（同一会话、locale=en）；
> 复现 = `runtime/e2e/locale-audit-e2e.mjs`（截图即该次运行）。

## 症状

英文界面下，主视图顶部 tab 显示：

```text
Chat | Method libr...
```

完整标签是 `Method Library`，但被截断成 `Method libr...`；中文「方法库」能完整显示。
这是主视图的一级导航，用户看不到完整名称，也无法从标签区分“方法库”与其他 method 面。

## 证据

locale=en 的 seed 会话，截图 `runtime/e2e/locale-audit.png`：顶部 tab 行可见
`Chat` 与 `Method libr...`（省略号由 UI 截断，不是数据）。同一 run 的
`runtime/e2e/locale-more-tabs-verdict.json` 里 `libClicked:true`、`library` 为方法库正文，
说明截断的是 tab label，不是页面未打开。

复跑（会生成同图）：

```sh
node --import tsx/esm runtime/e2e/locale-audit-e2e.mjs
```

## 根因

主视图 tab 的标签宽度按中文短标签「方法库」定；en 的 `Method Library` 更长，tab 容器
`overflow:hidden` + 固定/竞争宽度把文本截成省略号。没有按 locale 调整 tab 宽度或提供短标签。

## 修法方向（未实施）

- 给主 tab 足够宽度/允许换行（至少完整显示 `Method Library`），或 en 使用短标签
  `Methods`/`Library` 并在 `aria-label`/title 保留全名。
- 其他 locale 的长标签同样按内容测量，不硬编码中文宽度。
- 中文「方法库」保持现状（负控）。

## 修复判据

- locale=en 时主 tab 完整显示 `Method Library`（或明确的短标签 + 全名可达）。
- 中文仍完整显示「方法库」。
- 窄屏下可截断，但必须有 title/aria 全名；不能只有省略号。
- 红证：把 en 标签改回固定中文宽度 → 截图再次出现 `Method libr...`，exit 1；还原后绿。
- guard 落点：tab label 的 locale 宽度/aria 可读性测试，或浏览器层截图断言。
