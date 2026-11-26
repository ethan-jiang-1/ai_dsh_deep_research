---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-439：ResearchHeaderPill HoverCard 在浅色主题下渲染为深灰黑底暗字，摘要对比度严重不足

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：HoverCard 显式传 inline 使用主题随动 .media 表面（浅色模式亮底深字），消除黑底暗字；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

浅色主题（Light）下悬停顶栏进度胶囊 `ResearchHeaderPill`（`研究已交付`）弹出摘要 `HoverCard` 时，浮层底色为深炭灰（`#2C2C2E`），而文字「研究已交付 / 档案：drt_unsc-p5-members / 已见证交付，点击打开终稿。」渲染为深黑/深灰字，肉眼几乎不可辨识。

## 根因与边界

- DSH 原语 `vendor/dsh/packages/client/ui-primitives/src/HoverCard.module.css#L9-L18` 将 `.card` 固定为深色提示底 `--dsw-hovercard-bg: #2C2C2E`（默认供暗面/白字提示消费，仅 `.preview` 槽自行铺回 `--dsw-alias-bg-layer-1`）；
- 本包 [ResearchHeaderPill.module.css](../../../packages/deep-research-pack/src/client/ResearchHeaderPill.module.css)（`L34-L45`） 为 `.hoverCardBody` 与 `.hoverMeta` 设置 `color: var(--dsw-alias-label-primary)` 与 `color: var(--dsw-alias-label-secondary)`，在浅色模式下解析为深色文字，最终与 `#2C2C2E` 暗底形成暗字配暗底。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/05-rich-chat-pill-tools-milestone-light-1440.png`（顶栏偏中黑色 HoverCard 浮层）。

## 复现

```sh
# 浅色主题下打开已绑定 run 的会话，悬停顶栏 research-header-pill
# 观察 05-rich-chat-pill-tools-milestone-light-1440.png 顶部浮层呈黑底深灰字
```

## 修复判据

1. 浅色与深色主题下 `ResearchHeaderPill` 的 `HoverCard` 均具备清晰前背景对比度（使用反色前景色或按 `HoverCard` 表面约定设底/色）；
2. 在 Light/Dark 两套截图中可读核验通过。

## 分诊与授权

- 严重级：P1 — 浅色主题下悬停顶栏进度胶囊几乎无法辨识浮层文字。
- 表面 / 边界：`ResearchHeaderPill` 消费 vendor `HoverCard` 原语的风格参数。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`ResearchHeaderPill` 调用 vendor `HoverCard` 未传 `inline`，触发硬编码暗背景 `--dsw-hovercard-bg: #2C2C2E`，与 `--dsw-alias-label-primary` 在 Light 模式撞色。

## 修法

给 `<HoverCard>` 添加 `inline` 属性激活 vendor `.media` 随动表面（`var(--dsw-specific-menu)` 配 `--dsw-alias-label-primary`），并在 `.hoverCardBody` 补内边距。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchHeaderPill.tsx",
    "packages/deep-research-pack/src/client/ResearchHeaderPill.module.css",
    "tests/cockpit/client/research-tabs.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/research-tabs.spec.mjs",
    "exit": 1,
    "output": "BUG-439 ResearchHeaderPill：actual className=root，missing inline"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-tabs.spec.mjs"
  }
}
```
