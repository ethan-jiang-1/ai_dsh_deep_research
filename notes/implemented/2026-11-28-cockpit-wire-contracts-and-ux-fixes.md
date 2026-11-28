# 研究驾驶舱双端 Wire 契约、跨会话身份与交互健壮性收口

> 状态：implemented

相关前序决定：[cockpit-ux-v2-and-dsh-showcase](2026-11-28-cockpit-ux-v2-and-dsh-showcase.md) · [handoff-readiness-all-green](2026-11-28-handoff-readiness-all-green.md)。

## 决定

针对驾驶舱端到端深查暴露的 `BUG-470`–`BUG-482`，按五类系统性共因完成横切收口：

1. **Client ↔ Host Wire 契约与单源工具名（BUG-470 / BUG-474）**：
   - [`packages/deep-research-pack/src/lib/events/research-references.ts`](../../packages/deep-research-pack/src/lib/events/research-references.ts) 与 [`packages/deep-research-pack/src/client/research-commands.ts`](../../packages/deep-research-pack/src/client/research-commands.ts) 将 `/research-defaults` 弹窗全部 `set` 选项统一封装为 `{"patch":...,"expectedRevision"?:N}`，并修正 `source.authority` 影子枚举（`primary_first`/`authoritative_secondary` → 真值 `primary`/`secondary`）；新增 `interpretDefaultsCommandResult` 使 RPC 外层成功但命令层 `kind: 'error'` 时显性失败；冷会话（`phase === 'loading'`）打开弹窗先 `refresh`。
   - [`packages/deep-research-pack/src/lib/events/journal-wire.ts`](../../packages/deep-research-pack/src/lib/events/journal-wire.ts) 抽取共享 `WRITE_TOOLS`、`TOOL_PATH_FIELDS` 与 `primaryPathOfToolArgs`，供 [`research-turn.ts`](../../packages/deep-research-pack/src/client/research-turn.ts)、[`research-projection.ts`](../../packages/deep-research-pack/src/lib/events/research-projection.ts) 与 [`bundle-bind.ts`](../../packages/deep-research-pack/src/lib/run/bundle-bind.ts) 共用，并补齐 `drt_<slug>/` 边界校验。
2. **跨会话右栏挂载对齐与草稿/`@` 引用闭环（BUG-471 / BUG-479）**：
   - [`packages/deep-research-pack/src/client/startup.ts`](../../packages/deep-research-pack/src/client/startup.ts) 抽取 `whenSessionMounted`（统一服务 `openResourceWhenMounted` / `openTabWhenMounted`，显式核对 `sidebarRight.mounted.getSnapshot() === expectedSessionId` 并订阅变化）与 `buildMemberSessionTarget`（传入 `{ parentSessionId, childSessionId, mode: 'continuable' }`）、`pickStartWorkspaceId`（优先当前会话工作区），并由 [`rightbar-nav.ts`](../../packages/deep-research-pack/src/client/rightbar-nav.ts) 集中装配以保持 `index.ts` 低于单文件行数上限。
   - `buildStartResearchOptions` 改用 `whenDraftExists: 'append'`；`ResearchGraphTab` 禁止 `insertText` 失败时回退 `setDraft` 清空草稿、通过 `tabInfo.tab.navigation.params.nodeId` 响应 `@W#` 节点直达并在全屏预填时退出全屏；`ResearchFinalTab` 与 `StartCard` 避免重复点击拼接完整模板并在切文档/会话时复位预填态。
3. **共享容器实测宽度与多面板响应式布局（BUG-472 / BUG-477 / BUG-482）**：
   - 新增 [`packages/deep-research-pack/src/client/useContainerWidth.ts`](../../packages/deep-research-pack/src/client/useContainerWidth.ts)，以 `ResizeObserver` + `window.resize` 驱动单一宽度真值：终稿三栏精读台按 `isFullscreen && width >= 960` 统一切换布局/目录钮/证据路由；`DagMap` 宽画布按 `isFullscreen && width >= 768` 门禁；`MethodLibraryView` 按容器宽 `< 640px` 切窄列并把 `ColumnHandle` 钳制至容器宽 `38%`。
   - `ResearchEvidenceTab.module.css` 补 `minmax(0, 1fr)` 与 `.md-table-wide` 折行；`ClaimsAuditView` 长证据名 `Pill` 单行省略保留完整 `title`；`ResearchFinalTab.module.css` 紧凑断点抬升至 `390px`；`defaults.module.css` `.compactGrid` 改用 `@container (max-width: 720px)`。
4. **异步代次隔离、DOM 实例作用域与状态机收口（BUG-472 / BUG-473 / BUG-475 / BUG-476 / BUG-477 / BUG-478）**：
   - `ResearchFinalTab` 用 callback ref `assignBodyEl` 重绑 `CitationHoverLayer`（`useLayoutEffect` 实测高度、滚动/切文档/分屏打开即收起、`role="region"` 焦点续留），补 `loadEpochRef` + cleanup 中止 `manualControllerRef` + `inspectTokenRef` + `useEvidencePreview` `sessionEpochRef`；`activeTocHeadingIndex` 对非有限偏移 `continue` 而非 `break`，`FinalToc` 支持滚底高亮末节。
   - `ResearchStatusTab` 将队员跳转钮移至 `DisclosureRow.headerAccessory`，`ResearchStatusTitle` 声明 `locale: 'deepResearchPack'` 并随 `sessionId` 复位 `hitl`，`useStatusFeed` / `useMemberActivity` 将 `t` 移出 I/O `useEffect` 依赖改在 `useMemo` 投影，HITL2 优先显示审阅入口，`danglingReceipt` 仅在 `finalState === 'ok'` 时判定。
   - `DefaultsPanel` 补 `commitAudience` 脏值校验与 `sessionId` 草稿复位，`defaults-source-auto` 仅清除 `families` 保留 `authority`/`recency`；`SelectMenu` 布局类移至外层 `<Menu>`；`ResearchConfigTab` 显性渲染 `configLibraryUnreadable`、发送态禁用切换、三路联动刷新与 `use-now` 后重读 `question.md`。
   - `DagMap` 用 `useId()` 生成唯一 `<marker>`/`<clipPath>` 并按 CJK 双宽截断避让 `+N`；`ResearchGraphTab` 补 `childStateOf` 真实 `running`/`attention` 投影与实例 ref Map 滚动；`graph-state` 新增 `reset-session` 并在 `plan-missing`/`truncated`/`error` 自动退出 `diff`/`showSnapshotPlan` 消除 `vnull` 死锁；`plan-diff` 改为 `.filter` 支持一拆多后继；同步修正 `graphNotePlanNoEdges*` 双语说明。
5. **方法库生命周期守卫与工作台 HITL2 真实投影（BUG-480 / BUG-481 / BUG-482）**：
   - `MethodLibraryView` 将 `manualEditPrompt` 严格门禁在 `interviewStarted && !sending && pendingOperationRef.current === null`，`MethodCoachPanel.startInterview` 仅在 `result.ok === true` 时锁定并补 `host` `MutationObserver` 自动挂滚底；`ResearchHubPanel` 切页签/离场前校验方法库在途保存与脏草稿；`useRunSourcePicker` 拆分 `cancelRunRead()` 消除 `loading` 死锁；`MethodSummaryView` 增取消/Esc 并隐藏编辑态重选来源；`useLibraryData` 在新建态保持空选中；`MethodLibraryToolCard` 补三态 `toolDefaultDone`。
   - `RunsView` 移除 `isActiveRun` 门禁让 HITL2 准确呈现待审阅主按钮；`research-projection` 在 `writeSlug` 切换新 slug 时清空旧 `deliveredPath`；`ResearchHeaderPill` 经 `readArtifact(..., { decoder: decodeDeliveredReceipt })` 读取 `delivered.json` 真实终稿路径。

## 输掉的方案

- **在单测中继续 mock `executeDefaultsCommand` 而不直连 Host `runDefaultsCommand`**：导致 `BUG-470` 不仅漏检 `{patch}` 外壳，还掩盖了 `source.authority` 影子枚举（`primary_first`）——端到端直连真 Host 后首跑即抓出两层脱节。
- **靠扩大 `client-file-size` 上限容纳 `index.ts` / `ResearchFinalTab.tsx` / `ResearchGraphTab.tsx` / `MethodLibraryView.tsx`**：违反单文件 ≤500 行架构守卫；改为抽出 `rightbar-nav.ts`、`useContainerWidth.ts` 及子模块工具函数，所有 client 单文件均稳守上限内。
- **在 `ResearchHeaderPill.tsx` 直接调 `RunView.read('delivered.json')` + `JSON.parse`**：被 `semantic-guardrails` 与 `JsonDecoderRequiredError` 类型守卫拦截；改为复用规范 `readArtifact(..., { decoder: decodeDeliveredReceipt })`。

## 实际跑过的验证

- **Red→Green 回归**：覆盖 `BUG-470`–`BUG-482` 的全部新建/更新用例均先观察预期红灯再转绿，全量登记 `tests/fixtures/guard-ledger/ledger.json`，刷新 `tests/fixtures/asset-ledger/ledger.json`、`tests/INDEX.generated.md` 与 `docs/reference/*.generated.md`。
- **L0 静态 / 类型 / 构建 / 全量测试**：`pnpm typecheck`（0 errors）、`pnpm lint`（oxlint 0 warnings / 0 errors）、`pnpm build` + `export-dist`（88 entries）、`pnpm verify` 与 `pnpm test`（`test:spec` + `test:checks` 全绿）。
- **真浏览器装配与契约冒烟**：实跑 `client-load.entry.mjs`、`cockpit-truth.entry.mjs`、`cockpit-artifact-truth.entry.mjs`、`cockpit-truth-residuals.entry.mjs`、`cockpit-truth-substance.entry.mjs`、`cockpit-locale.entry.mjs`（见本次交付证据账）。
