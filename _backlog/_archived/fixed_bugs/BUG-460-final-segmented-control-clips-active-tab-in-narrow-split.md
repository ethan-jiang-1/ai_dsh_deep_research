---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-460：终稿视图 SegmentedControl 在窄分屏宽度下裁切选中标签与圆角边框

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（`.controlsBar` 启用 `container-type: inline-size` 并在窄栏下压缩 `.segmentedControl` 适应容器宽） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-round3-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-round3-fixes.md)

## 症状

在 `480×800` 窄屏（或桌面端右栏较窄并启用「分屏看状态」/并排开证据卡分屏）下，在 `ResearchFinalTab` 点击「分屏看状态」或打开 `EvidenceTab` 分屏后，左侧窗格宽度收窄至约 `238px`（净内容区约 `214px`）。由于顶部 `SegmentedControl` 三个分段（`读者版 | 审计版 | 核查清单 (1)`）采用等宽网格 `1fr` 并按最长项对齐且不可换行/紧凑，当选中最右侧「核查清单 (1)」时，标签文字在屏幕右缘被横向裁成 **`核查清`**，白色高亮滑块与外框右圆角一并被硬截断；在 macOS / 移动端覆盖式滚动条下界面也无任何可横滑线索。

- 真实浏览器截图实证：`runtime/smoke-workspace/ux-audit-r3-2026-11-27/screenshots/r3-s4-evidence-unsafe-url-480.png`（左半栏顶部 `读者版 | 审计版 | 核查清` 截断与白框右缘切开）。

## 根因与边界

- [ResearchFinalTab.module.css](../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css) 的 `.controlsBar` 内 `.segmentedWrap` 设为 `flex: 0 0 auto; max-width: 100%; overflow-x: auto;`；
- 内部的 `@deepseek-ai/dsh-client-ui-primitives` `SegmentedControl` 使用 `display: inline-grid; grid-auto-columns: 1fr;` 与 `.tab { padding: 0 16px; white-space: nowrap; font-size: 13px; }`，由最长项「核查清单 (N)」撑大三列等宽总宽度至 ~300px，超出分屏后的半栏宽度（~214px）从而在左侧窗格右缘触发隐藏式裁切（英文版 `Reader | Audit | Claims (N)` 等长标签也会在窄分屏接近或触及同宽度压力）。
- 边界说明：不导致整页 `documentElement.scrollWidth` 溢出（`480 <= 480`），但导致分屏左侧窗格主导航当前选中态文字与边框在无提示状态下被裁半截。

## 复现

```sh
# 1. 启动 DSH Web，在 480x800（或窄右栏开启分屏后使单窗格 <= 250px）打开已绑定且带核查清单的终稿页签
# 2. 切到「核查清单 (N)」，点击「分屏看状态」或点击一条证据 Pill 打开右侧证据卡分屏
# 3. 观察左侧终稿窗格顶部的「读者版 | 审计版 | 核查清单 (N)」分段控件右缘：文字与高亮框被裁断
```

## 修复判据

1. 在窄栏/分屏宽度（例如单窗格 `210px–260px`）下，「读者版 / 审计版 / 核查清单 (N)」控件不再把激活标签裁成半截并切开白框边框（可通过容器宽度自适应紧凑内边距、自动降级/换行标签栏或隐藏/折叠分屏策略解决）；
2. 补齐窄分屏宽度下的组件/浏览器视觉检查并通过 `pnpm verify && pnpm test`。

## 分诊与授权

- 严重级：P2 — 窄屏/分屏组合下的视觉裁切与选中态边框截断，直接遮蔽当前激活导航标签文字。
- 表面 / 边界：`packages/deep-research-pack/src/client/ResearchFinalTab.module.css`（`.controlsBar` / `.segmentedWrap`）及 `ResearchFinalTab.tsx`。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`SegmentedControl` 内部 `1fr` 均分轨道被 `padding: 0 16px` 和 `font-size: 13px` 撑宽到 ~300px，在分屏后的 ~215px–238px 窗格内超过容器宽度且因无 `@container` 收紧而在右缘硬裁切激活标签与白色滑块。

## 修法

保留 `.segmentedWrap` 既有 `BUG-438` 规则，为 `.controlsBar` 启用 `container-type: inline-size`、为 `ResearchFinalTab` `SegmentedControl` 传入 `.segmentedControl` 类，在 `@container (max-width: 340px)` 与 `(max-width: 260px)` 下将控件宽度适配至 `100%` 并压缩分段内边距与字号（`0 4px` / `11px` / `min-width: 0`）。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/ResearchFinalTab.module.css",
    "tests/cockpit/client/final-evidence.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": ".controlsBar 须启用 container-type: inline-size"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/final-evidence.spec.mjs" }
}
```
