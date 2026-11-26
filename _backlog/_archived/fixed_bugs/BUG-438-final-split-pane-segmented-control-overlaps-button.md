---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-438：终稿分屏窄列下 ResearchFinalTab 顶部 SegmentedControl 横向冲出并遮挡右侧「分屏看状态」按钮

> 严重级别：P1 ｜ 发现：2026-11-27 ｜ 状态：已修 — 结论：.segmentedWrap 改为 flex: 0 0 auto 保持固有宽度并随父容器换行，分屏窄栏零重叠；去向：implemented — [2026-11-27-cockpit-ux-ui-audit-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md)

## 症状

在 `1440×900` 视口下点击终稿中的证据引用，右栏双格分屏打开「终稿 + 证据卡」后：终稿页签顶部的 `SegmentedControl`（`读者版 | 审计版 | 核查清单 (0)`）向右越界，与同一行的「分屏看状态」按钮文字发生直接重叠遮挡（截图中可见 `核查清单 (0)` 压在 `分屏看状态` / `看状态` 上）。

## 根因与边界

- [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L439-L460`） 将 `SegmentedControl` 包在 `.segmentedWrap` 内与 `<Button>` 同居 `.controlsBar`；
- [ResearchFinalTab.module.css](../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css)（`L118-L130`） 给 `.segmentedWrap` 设为 `flex: 1; min-width: 180px;`。当分屏单栏仅约 ~270px 宽时，`.segmentedWrap` 被压缩至 ~180px 左右，而内部 `SegmentedControl` 三项自然宽度大于 180px 且无截断/换行保护，直接溢出并盖住右侧 `<Button>`。
- 现场证据：`runtime/smoke-workspace/ux-audit-2026-11-27/screenshots/08-final-and-evidence-split-light-1440.png`、`09-final-claims-canonical-check.png`。

## 复现

```sh
# 1440x900 打开任意含 [来源: evidence/...] 引用的终稿并点击引用打开分屏「证据卡」
# 观察左半栏「终稿」顶部 SegmentedControl 与「分屏看状态」按钮横向重叠
```

## 修复判据

1. 分屏（单栏宽 ~260–320px）下 `.controlsBar` 内 `SegmentedControl` 与「分屏看状态」按钮不发生文字重叠或截断，允许自然换行或紧凑布局；
2. `1440×900` 分屏、`768×900` 与 `480×800` 下控件 bounding box 互不碰撞。

## 分诊与授权

- 严重级：P1 — 右栏双格分屏时终稿操作区按钮文字直接重叠，影响切换视图与分屏看状态。
- 表面 / 边界：`ResearchFinalTab.module.css` 顶栏布局。
- 授权：已随 UX/UI 全量修复批授权直接落地；批 = `2026-11-27-cockpit-ux-ui-audit-fixes`。

## 根因

`.segmentedWrap` 使用 `flex: 1; min-width: 180px` 在窄分屏强制压窄至 `SegmentedControl` 固有宽度以下，导致内文字横向溢出并遮挡右侧按钮。

## 修法

将 `.controlsBar` 设 `justify-content: space-between`，`.segmentedWrap` 改为 `flex: 0 0 auto; max-width: 100%; min-width: 0; overflow-x: auto`，`.splitReviewBtn` 设 `flex-shrink: 0`。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchFinalTab.module.css",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=$(pwd -P)/packages/deep-research-pack/tsconfig.client.json node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": "BUG-438 ResearchFinalTab.module.css：segmentedWrap matched min-width: 180px"
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
