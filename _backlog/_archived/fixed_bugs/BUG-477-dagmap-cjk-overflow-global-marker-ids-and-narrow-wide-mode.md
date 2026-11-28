---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-477：`DagMap` SVG 中文文本无裁剪溢出侵入邻卡、全局 `<marker id>` 与重复 `NodeCard id` 跨会话破坏箭头与跳转、窄屏反切宽画布

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **中文节点摘要溢出卡片侵入相邻节点**：`DagMap` 内无 `<clipPath>`，按等宽英文字符估算的 `summaryChars`（紧凑 `16` 字 / 宽画布 `26` 字）在中文宽字形下分别超出 `<rect>` 右边界约 `24px` 与 `79px`，直接跨过 `gapX` 撞进右侧并排节点（如示范夹具 `W2.1` 与 `W2.2`）；复合节点右下角 `+N` 徽标与摘要行重叠；
2. **跨会话与同页重复 DOM ID 破坏箭头与点击定位**：
   - DSH 保留非活跃会话右栏 DOM（`hidden` / `display: none`），会话 A 先开图谱后切到会话 B 开图谱，全局写死 `url(#research-graph-arrow)` 命中会话 A 隐藏 DOM 内的 `<marker>`，导致会话 B DAG 连线箭头全部消失；
   - 选中节点同时渲染在 `graph-selected-node` 与 `graph-all-nodes` 两处，携带重复 `id="research-graph-${node.id}"`，且 `document.getElementById` 会命中其他隐藏会话的同 ID 节点；在 `diff` 视图点击 `GraphNotices` 异常节点不会切回 `current` 视图；
3. **残余 `expandedId` 永久压暗全图连线 & 窄屏反切宽画布**：切会话或 plan 重编号后旧 `expandedId` 不复位，详情卡消失但仍将旧 ID 传给 `DagMap` 导致所有边被永久压暗至 `opacity: 0.28`；视口 `<768px` 时 DSH 自动设 `sidebar.fullscreen = true`，`DagMap` 反而切换成 `WIDE_GEOM`（`min-width: 640px`），加剧窄屏横向溢出。

## 分诊与授权

- 严重级：P1 — 中文默认语言下核心图谱卡片文字直接撞入邻卡、多会话切换后连线箭头消失、窄屏反切宽画布，严重破坏可读性与交互。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-graph/DagMap.tsx`、`packages/deep-research-pack/src/client/research-graph/NodeCard.tsx`、`packages/deep-research-pack/src/client/ResearchGraphTab.tsx` / client
- DSH 不变量：Identity, initial state & disposal
- 触及面：pack 公共行为 — 研究图谱核心可视化与交互
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 几何算术与 vendor `RightbarRoot.tsx:22` / `SidebarRight.tsx:360-361` 确定性复现
边界：browser / client (`DagMap` + `ResearchGraphTab`)

1. [DagMap.tsx](../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)（`L9-L10,L96-L138`）：`w=146`（可用宽 `128px`）放 `16` 个 `9.5px` 中文字符（`~152px`），`w=212`（可用宽 `194px`）放 `26` 个 `10.5px` 中文字符（`~273px`），且无 `<clipPath>`；
2. [DagMap.tsx](../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)（`L60-L65,L88`） 硬编码全局 `<marker id="research-graph-arrow">`，与 vendor `vendor/dsh/packages/client/ui-sidebar-right/src/client/shell/RightbarRoot.tsx`（`L22`） `hidden={!active}` 冲突；
3. [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（`L117,L122,L233-L237,L396-L427`）：`expandedId` 不随会话/slug 复位且直接传给 `DagMap`；`isFullscreen` 未区分 `<768px` 自动全屏。

## 根因（假设 → 已证）

1. SVG `<text>` 不会自动按 `<rect>` 裁切，且按字数而非 CJK/ASCII 显示宽度截断；
2. SVG `<marker>` 与 `NodeCard` 使用了无实例作用域的全局字面量 `id`，忽略了 DSH 多会话常驻隐藏 DOM 架构；
3. 未对 `selectedId` 做存活校验（应传 `selectedNode?.id ?? null`），也未基于容器实际宽度而非单纯 `sidebar.fullscreen` 切换宽画布。
- 根因证据：逐行核对 [DagMap.tsx](../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)（`L1-L145`）、[ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（`L117-L125,L228-L242,L395-L428`） 与 vendor `RightbarRoot.tsx` / `SidebarRight.tsx`。
- DSH 不变量：Identity — 多会话实例共享全局 DOM/SVG ID 与未随会话复位的选中态。

## 牵出的失败类

- 同机制第 1 次（多会话常驻 DOM 下全局 SVG/HTML `id` 碰撞 + 按 `sidebar.fullscreen` 误判宽视口，与 BUG-472 同源）｜处置：类修（SVG `<marker>` / `<clipPath>` 全面改用 `React.useId()`；`scrollIntoView` 改用实例内 ref Map；宽画布按实测容器宽判断）

## 修法

1. `DagMap` 使用 `useId()` 生成实例唯一 `<marker>` 与 `<clipPath>` ID，对每个节点卡片 `<rect>` 内文字施加 `<clipPath>` 并按东亚宽字形（CJK 计 2 单位）截断摘要与标题行，错开 `+N` 徽标与摘要列宽；
2. `ResearchGraphTab` 在 `leadSessionId` / `boundSlug` 变更时重置 `expandedId`/`copiedId`/`insertedId`；传给 `DagMap` 的 `selectedId` 改为 `selectedNode?.id ?? null`（支持再次点击取消选中）；点击 `GraphNotices` 异常项先切回 `graphView='current'` 并通过组件内 `ref` 滚动，不再使用全局重复 `document.getElementById`；
3. 宽画布模式按 `isFullscreen && containerWidth >= 768`（或容器宽 `>= 640`）激活，窄屏始终保持紧凑布局。

## 修复判据

1. 双实例渲染 `DagMap` 时 `<marker id>` 与 `markerEnd` 均携带互不相同的 `useId()` 前缀，且每个节点含对应 `<clipPath>` 防止文本越界；
2. 切会话或当前节点从 `graphNodes` 消失后，`DagMap` 收到 `selectedId={null}`，所有边 `opacity === 1`；
3. 在 `diff` 视图点击异常节点切回 `current` 并高亮选中；`<768px` 自动全屏下 `DagMap` 保持 `compact` 模式。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-graph/DagMap.tsx",
    "packages/deep-research-pack/src/client/research-graph/format.ts",
    "packages/deep-research-pack/src/client/research-graph/NodeCard.tsx",
    "packages/deep-research-pack/src/client/ResearchGraphTab.tsx",
    "tests/cockpit/client/research-graph/dag-map.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/research-graph/dag-map.spec.mjs",
    "exit": 1,
    "output": "BUG-477: hardcoded research-graph-arrow / missing clipPath / CJK overflow; <768px auto-fullscreen rendered wide instead of compact"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/research-graph/dag-map.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-graph/dag-map.spec.mjs"
  }
}
```
