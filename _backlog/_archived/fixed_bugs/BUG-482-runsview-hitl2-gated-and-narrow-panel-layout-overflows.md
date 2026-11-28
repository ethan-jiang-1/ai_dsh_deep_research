---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-482：`RunsView` HITL2「待你审阅」被 `in_progress` 门禁锁死，且多处核心面板窄栏与长文件名存在爆宽裁切

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **工作台 `RunsView` HITL2 态「待你审阅」徽章与主按钮不可达**：当研究已由 Critic 写完 `review.md`/`readiness.json` 并进入 HITL2 等待用户拍板时，盘上状态被推导为 `reviewed_pass`/`reviewed_fail` 而非 `in_progress`，导致卡片错显绿色「审查通过」、把「进入研究会话」降级为次按钮；同样同会话二次研究时 `research-projection.ts` 未在 `writeSlug` 切换新 slug 时清空旧 `deliveredPath`，`ResearchHeaderPill` 盘侧兜底也硬编码 `${dir}/final.md` 忽略 `delivered.json` 真路径；
2. **核心面板在窄栏 / 768–1050px 视口与长证据名下爆宽裁切**：
   - `ResearchEvidenceTab`：`.body` 用 `display: grid` 未设 `grid-template-columns: minmax(0, 1fr)` 与 `.md-table-wide` 覆盖，证据卡含 4+ 列宽表或长代码块时整页爆宽；
   - `ClaimsAuditView`：真实长证据文件名（如 `evidence/t5-ascend-pytorch-199-graph-capture.md`）在 330px `StudioInspectorPane` 内撑爆卡片，在固定高 `24px` 的 `Pill` 内折成两行上下溢出碰撞；
   - `ResearchFinalTab`：`SegmentedControl` 341–372px 容器宽死区未触发 `@container (max-width: 340px)`，第 3 项「核查清单 (N)」被横向裁切；
   - `MethodLibraryView` & `DefaultsPanel (compact)`：基于 `window.matchMedia` 视口宽（未扣除左侧 240px 侧栏）写断点，768px 视口下方法库右侧工作区被挤到仅 `~250px`（且 `ColumnHandle` 拖拽超出 `38vw` 产生 129px 死区），921–1050px 视口下紧凑双列 `DefaultsPanel` 的受众输入框被压成 `~24px` 不可用。

## 分诊与授权

- 严重级：P1 — HITL2 关键待拍板信号在工作台被误标成绿色已过，且证据卡/核查栏/方法库/默认面板在常见桌面分屏与 768px 视口下控件裁切不可用。
- 表面 / 边界：`packages/deep-research-pack/src/client/research-hub/RunsView.tsx`、`packages/deep-research-pack/src/lib/events/research-projection.ts`、`packages/deep-research-pack/src/client/ResearchHeaderPill.tsx`、`packages/deep-research-pack/src/client/{ResearchEvidenceTab,ResearchFinalTab}.module.css`、`packages/deep-research-pack/src/client/MethodLibraryView.tsx`、`packages/deep-research-pack/src/client/defaults/defaults.module.css` / client + pack lib
- DSH 不变量：One value states one fact
- 触及面：pack 公共行为 — 工作台 HITL2 状态投影与多面板响应式布局
- 授权：自授权（P1 修理型修复）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 逻辑条件与 CSS 几何算术确定性复现
边界：client + pack lib

1. [RunsView.tsx](../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx)（`L170-L179`） 写 `const isHitlPending = isActiveRun && matchedProj?.phase === 'hitl_pending'`，而 [runs-catalog.ts](../../../packages/deep-research-pack/src/lib/workspace/runs-catalog.ts)（`L91-L105`） 在 `review.md` 落盘后产出 `reviewed_pass`/`reviewed_fail`；[research-projection.ts](../../../packages/deep-research-pack/src/lib/events/research-projection.ts)（`L229-L243`） `writeSlug` 变更新 run 时未清 `deliveredPath`；[ResearchHeaderPill.tsx](../../../packages/deep-research-pack/src/client/ResearchHeaderPill.tsx)（`L82-L83`） 硬编码 `${opened.value.dir}/final.md`；
2. [ResearchEvidenceTab.module.css](../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.module.css)（`L45-L53`） 缺 `grid-template-columns: minmax(0, 1fr)`；[ClaimsAuditView.tsx](../../../packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx)（`L96-L99`） 渲染长路径进固定 `height: 24px` 的 `Pill`；[ResearchFinalTab.module.css](../../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css)（`L192-L209`） 断点 `340px` 低于 3-tab 实际最小宽 `~372px`；[MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)（`L166,L379`） 与 [defaults.module.css](../../../packages/deep-research-pack/src/client/defaults/defaults.module.css)（`L59-L70`） 用 `@media` 视口宽而非容器宽 `@container`。

## 根因（假设 → 已证）

1. `RunsView` 把盘上静态状态 `in_progress` 当作活态 `hitl_pending` 的前置条件，导致盘上已完成审查但正等 HITL2 拍板的 run 永远进不了待拍板分支；
2. 嵌入式组件（方法库、默认面板）用 `window` 媒体查询代替容器查询，忽略了宿主 240px 左栏占位；证据卡与对照栏缺 `minmax(0, 1fr)` / 省略截断守卫。
- 根因证据：逐行核对上述 7 个源文件与 vendor `Pill.module.css:5`、`SegmentedControl.module.css:15,48`、`MarkdownText.module.css:231`。
- DSH 不变量：One value states one fact — 活态 HITL2 被盘上 `reviewed_pass` 掩盖。

## 牵出的失败类

- 同机制第 2 次（与 BUG-460 同属容器宽度断点漏算，现横切补齐全部面板）｜处置：类修（统一容器查询 `@container` + `minmax(0, 1fr)` + 长文件名 `ellipsis` 截断）

## 修法

1. `RunsView`：`isHitlPending = matchedProj?.phase === 'hitl_pending'`（不再门禁 `isActiveRun`），活态 `hitl_pending`/`running` 优先升格「进入研究会话」为主按钮；`research-projection.ts` 当 `writeSlug` 切到不同新 slug 时重置 `deliveredPath: null`；`ResearchHeaderPill` 读 `delivered.json` 取真实 `delivered.path`；
2. `ResearchEvidenceTab.module.css` 补 `grid-template-columns: minmax(0, 1fr); overflow-x: hidden; overflow-wrap: anywhere` 与 `.md-table-wide` 自适应规则；
3. `ClaimsAuditView` 证据 `Pill` 内文件名用单行 `max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`（`title` 保留完整路径），`.studioInspectorBody` 补 `overflow-x: hidden; overflow-wrap: anywhere`；
4. `ResearchFinalTab.module.css` 将紧凑断点从 `340px` 调高至 `390px` 消除死区；
5. `MethodLibraryView` 改用 `ResizeObserver` 按自身容器宽（`< 640px`）切换窄列、把 `ColumnHandle` 上限钳制到实际容器宽的 `38%`；`defaults.module.css` `.compactGrid` 改用 `@container (max-width: 720px)` 切单列。

## 修复判据

1. 单测：`RunsView` 在 `run.status === 'reviewed_pass'` + `matchedProj.phase === 'hitl_pending'` + `hitlKind === 'hitl2'` 时渲染琥珀色「待你审阅」徽章并将「进入研究会话」标为主按钮；`research-projection` 同会话写入新 `drt_run2` 时清空旧 `drt_run1` 的 `deliveredPath`；
2. 布局验证：330px `StudioInspectorPane` 长证据名 `Pill` 单行截断不折行爆高；360px 终稿页签 `SegmentedControl` 无横向裁切；768px 视口方法库自动切单列无 250px 挤压；930px 视口紧凑默认面板无 24px 压缩；证据卡宽表不撑爆容器。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/research-hub/RunsView.tsx",
    "packages/deep-research-pack/src/lib/events/research-projection.ts",
    "packages/deep-research-pack/src/client/ResearchHeaderPill.tsx",
    "packages/deep-research-pack/src/client/ResearchEvidenceTab.module.css",
    "packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx",
    "packages/deep-research-pack/src/client/ResearchFinalTab.module.css",
    "packages/deep-research-pack/src/client/MethodLibraryView.tsx",
    "packages/deep-research-pack/src/client/defaults/defaults.module.css",
    "tests/cockpit/client/runs-view-ownership.spec.mjs",
    "tests/cockpit/lib/events/research-projection.spec.mjs",
    "tests/cockpit/client/final-evidence.spec.mjs",
    "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs",
    "tests/cockpit/client/method-library/method-library-queue.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/runs-view-ownership.spec.mjs tests/cockpit/lib/events/research-projection.spec.mjs tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 1,
    "output": "BUG-482: reviewed_pass+hitl2 rendered 审查通过 instead of 待你审阅; write drt_run2 kept deliveredPath; HeaderPill opened final.md; missing @container/minmax"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/runs-view-ownership.spec.mjs tests/cockpit/lib/events/research-projection.spec.mjs tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs tests/cockpit/client/final-evidence.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs"
  }
}
```
