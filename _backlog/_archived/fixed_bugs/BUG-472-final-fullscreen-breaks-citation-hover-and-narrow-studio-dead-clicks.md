---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-472：终稿切全屏后 `CitationHoverLayer` 监听挂死在旧 DOM 上失效，且全屏 `<960px` 点引用无响应、目录消失

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **切全屏后 150ms 悬停溯源彻底失灵**：在右栏打开终稿后点击「全屏三栏精读」（或从全屏退出回右栏），正文内悬停 `[来源: evidence/*.md]` 再也不会弹出预览卡，直到切去「核查清单」再切回才会恢复；
2. **全屏下容器宽度 `<960px`（如 1280/1440px 全屏再点「分屏看状态」，或 `<768px` 视口自动全屏）时交互断链**：
   - 点击正文任意 `[来源: evidence/*.md]` 或悬停卡主按钮**完全无反应**（既不打开证据页签，右侧也没有可见面板）；
   - 工具栏目录开关与折叠目录全部消失，章节目录 100% 不可达；
3. **`CitationHoverLayer` 定位与关闭缺陷**：卡片高度硬编码 `210px` 导致长摘录底栏被视口裁切或向上弹出时压住原链接；正文滚动时卡片悬停原处不跟随也不关闭；非全屏点击「分屏固定打开」后卡片不关闭；键盘 `Tab` 无法进入卡片内按钮。

## 分诊与授权

- 严重级：P1 — S3 学术精读台核心卖点（150ms 悬停溯源、全屏三栏与分屏对照）在最常规的「进入/退出全屏」和「全屏分屏」路径上直接失效。
- 表面 / 边界：`packages/deep-research-pack/src/client/ResearchFinalTab.tsx`、`packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx`、`packages/deep-research-pack/src/client/research-final/FinalToolbar.tsx`、`packages/deep-research-pack/src/client/ResearchFinalTab.module.css` / client
- DSH 不变量：Identity, initial state & disposal · Narrow injection face
- 触及面：pack 公共行为 — 影响终稿精读台核心交互
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码与 React 挂载生命周期确定性复现
边界：browser / client (`ResearchFinalTab` + `CitationHoverLayer`)

1. [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L437-L488`）：切换 `isFullscreen` 会将 `<div ref={bodyRef}>` 从非全屏分支卸载并挂载全屏 `.studioBody` 新 DOM 节点，但 `<CitationHoverLayer containerRef={bodyRef} />` 保持挂载；[CitationHoverLayer.tsx](../../../packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx)（`L100-L144`） 的 `useEffect` 依赖 `[containerRef, ...]` 引用不变不会重跑，事件监听永远留在已卸载的旧 DOM 上；
2. [ResearchFinalTab.module.css](../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css)（`L411-L465`） 仅在 `@container (min-width: 960px)` 显示 `.studioToc` 与 `.studioInspector`，而 [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L275-L278,L379`） 与 [FinalToolbar.tsx](../../../packages/deep-research-pack/src/client/research-final/FinalToolbar.tsx)（`L70`） 只判 `isFullscreen`（不判三栏是否实际可见），导致全屏分屏或 `<768px` 自动全屏时点击引用写进 `display: none` 的对照栏且目录完全不可见；
3. [CitationHoverLayer.tsx](../../../packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx)（`L38-L45,L223-L233`） 写死 `210` 高度、无 `scroll`/`resize` 监听、`onOpenSplit` 后未关闭卡片。

## 根因（假设 → 已证）

1. 将可变 `RefObject` 当作 effect 依赖来绑定 DOM 事件，忽略了条件渲染替换宿主元素时 ref 对象身份不变的 React 规则。
2. 将 DSH 栏级布尔值 `tab.sidebar.fullscreen`（在 `<768px` 视口也会为 `true`，且全屏分屏时单个 pane 宽度仅 `~640px`）等同于「三栏 Studio 可见」，造成 JS 路由与 CSS `@container (min-width: 960px)` 判定分裂。
3. 悬停卡未实测自身渲染高度（对比 vendor `HoverCard.tsx`），未订阅滚动/视口变化与视图切换复位。
- 根因证据：逐行核对 [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L272-L284,L437-L488`）、[CitationHoverLayer.tsx](../../../packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx)（`L38-L45,L100-L144,L223-L233`） 与 `vendor/dsh/packages/client/ui-sidebar-right/src/client/shell/SidebarRight.tsx`（`L360-L361`）。
- DSH 不变量：Identity, initial state & disposal — DOM 变更未重新绑定/清理监听。

## 牵出的失败类

- 同机制第 1 次（CSS `@container` 断点与 JS 交互路由使用两套不同条件，且 ref 对象作 effect 依赖）｜处置：类修（以 `ResizeObserver` 实测的 `studioThreeCol` 单一真值同时驱动三栏渲染、TOC 按钮与引用点击路由；`CitationHoverLayer` 改接真实 DOM element state 或 `rebindKey`）

## 修法

1. `ResearchFinalTab` 用 callback ref (`setBodyEl`) 将实际挂载的 `HTMLDivElement | null` 传入 `CitationHoverLayer`（或将 `isFullscreen` + `view` 纳入绑定依赖），确保每次 DOM 切换立刻解绑旧节点并绑定新节点；
2. 以 `ResizeObserver` 追踪根容器宽 `>= 960px` 推导 `studioActive = isFullscreen && containerWidth >= 960`，统一控制三栏布局、`FinalToc` 折叠按钮、`openEvidence` 路由（仅 `studioActive` 时写右侧对照栏，否则走 `openEvidenceSplit`）；
3. `CitationHoverLayer` 改用 `useLayoutEffect` 实测卡片 `offsetHeight` 定位、监听滚动/resize/文档切换即时收起、点击 `onOpenSplit` 后关闭卡片，并修正键盘焦点与 ARIA 角色（`role="region"` 或支持焦点移入）。

## 修复判据

1. 组件测试：渲染 `ResearchFinalTab` 先在 `isFullscreen=false` 悬停引用弹出卡片，再切换 `isFullscreen=true` 并再次切换回 `false`，每次切换后悬停引用均能正常弹出预览卡；
2. 窄全屏测试：`isFullscreen=true` 且容器宽 `< 960px`（如 `640px`）时，点击引用走 `openResource` 分屏打开而非写入隐藏栏，且工具栏展示目录切换按钮；
3. `CitationHoverLayer` 测试：滚动容器自动收起卡片、点击 `onOpenSplit` 收起卡片、高卡片（>280px）贴近底边时不超出视口且不压住触发链接。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/useContainerWidth.ts",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx",
    "packages/deep-research-pack/src/client/research-final/FinalToolbar.tsx",
    "tests/cockpit/client/final-studio-r2.spec.mjs",
    "tests/cockpit/client/research-final/final-studio-sub.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/final-studio-r2.spec.mjs",
    "exit": 1,
    "output": "BUG-472 ResearchFinalTab: 全屏但容器宽 640px(<960px) 应退回 sidebar 布局 ('studio' !== 'sidebar')"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/final-studio-r2.spec.mjs tests/cockpit/client/research-final/final-studio-sub.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/final-studio-r2.spec.mjs"
  }
}
```
