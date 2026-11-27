---
status: 已修
severity: P2
opened: 2026-11-27
---

# BUG-457：TrackRail 复盘回边箭头（▲）固定左偏 3px 指向「立项确认 / 审查」而非重入节点「挖掘」

> 严重级别：P2 ｜ 发现：2026-11-27 ｜ 状态：已修（移除错位绝对定位 `▲` 箭头，在重入节点 `evidence` 内随行展示 `↺` 徽标） ｜ 去向：implemented — [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md)

## 症状

在「研究状态」页签顶部的流程轨道（`TrackRail`）中，当 `loopOn` 激活（展示虚线橙框 `↻ rerun 图例`）时，虚线框左上角的向上箭头 `▲` 固定位于容器最左侧 `left: 3px`：
- 在桌面宽度（575px 右栏）下，`▲` 指向上方的 `◆立项确认 ✓`；
- 在较窄或 `480×800` 视口下，轨道换行成两排后，`▲` 直接指向上排或第二排最左端的 `审查`（而非真正带有虚线回边描边的重入节点 `挖掘`），造成视觉指向错位。

## 根因与边界

- [TrackRail.tsx](../../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx)（`L83-L88`）将 `rerunLoop` 与 `rerunArrow` 放在换行容器 `.railFlex` 之外，无法随重入节点 `data-step-key="evidence"` 的横坐标或所在行对齐；
- [status.module.css](../../../packages/deep-research-pack/src/client/research-status/status.module.css)（`L300-L306`）写死 `.rerunArrow { position: absolute; top: -9px; left: 3px; }`；
- 现场证据：截图 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-s3-status-protocol-radar-20x8.png`（`▲` 指向 `◆立项确认` 左边缘）与 `runtime/smoke-workspace/ux-audit-r2-2026-11-27/screenshots/r2-fv-480x800-status-open.png`（`▲` 指向第二行 `审查`）。

## 复现

```sh
# 打开任一已到达或通过交付审阅（loopOn=true）的研究会话 → 展开右栏「研究状态」
# 对比虚线重入框（挖掘）与下方虚线图例框左上角橙色 ▲ 指向，分别在 1280×800 与 480×800 下截图观察
node --import tsx/esm ~/.gemini/antigravity-cli/brain/76cb36c3-4eb9-4406-a90c-f3598216d26f/scratch/r2_final_verify.mjs
```

## 修复判据

1. 移除与目标步脱节的错位绝对定位箭头（或按实际重入节点坐标/图标徽标对齐语义），避免图例箭头指向 `◆立项确认` 或折行后的 `审查`；
2. 在桌面与 `480×800` 宽度下复测视觉一致且不退化既有 `TrackRail` 门禁断言。

## 分诊与授权

- 严重级：P2 — 视觉指示误导用户认为重跑起点在「立项确认」或「审查」。
- 表面 / 边界：`TrackRail.tsx` + `status.module.css`。
- 授权：已授权并在 2026-11-27 批量修复落地。

## 根因

`TrackRail.tsx` 将 `.rerunLoop` 放在折行列表 `.railFlex` 之外，并通过 `status.module.css` 把 `▲` 硬编码在 `left: 3px`，导致无论是桌面还是窄屏折行都指向首列而非重入节点 `evidence`。

## 修法

移除 `TrackRail.tsx` 中的 `<span className={css.rerunArrow}>▲</span>` 及 `.rerunArrow` 样式，封闭图例虚线框并在 `reentry` 节点（`evidence`）内部随行渲染 `↺` 徽标（`.reentryBadge`），保持 `data-step-reentry="true"` 契约不变。

## 修复落地（2026-11-27）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-status/TrackRail.tsx",
    "packages/deep-research-pack/src/client/research-status/status.module.css",
    "tests/cockpit/client/research-status/protocol-radar.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/cockpit/client/research-status/protocol-radar.spec.mjs",
    "exit": 1,
    "output": "命中错位 <span class=\"rerunArrow\">▲</span>"
  },
  "green": {
    "command": "pnpm test",
    "exit": 0
  },
  "guard": { "path": "tests/cockpit/client/research-status/protocol-radar.spec.mjs" }
}
```
