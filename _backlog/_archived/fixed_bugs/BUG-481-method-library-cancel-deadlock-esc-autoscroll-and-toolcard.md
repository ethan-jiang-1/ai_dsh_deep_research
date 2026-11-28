---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-481：`MethodLibraryView` 交互死锁与误显：取消读取研究永久卡死 `loading`、访谈页无取消/Esc、滚底 observer 永不挂载、`useLibraryData` 抢选

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **「从研究沉淀」点击「取消」永久卡死在「读取中…」**：点击「读取已完成研究」或点选某条 run 预览后点击「取消」，状态永远停在 `loading`，按钮永久禁用且再次点「取消」无反应；
2. **访谈阶段无「取消 / 关闭」按钮且不支持 `Esc`，编辑态「重新选择来源」劫持进新建**：从已有方法点「在工作台继续」进入 `interview` 阶段，工具栏无取消/返回按钮（对比 North Star `关闭 (Esc)`），用户必须切去「检查表单」并滚到底部才能退出；且编辑态下顶部仍显示「重新选择来源」，点击后无提示直接把 `mode` 从 `edit` 切到 `new` 丢弃正在编辑的条目；
3. **Method Editor 内嵌对话永远不自动滚底**：`MethodCoachPanel` 里的 `MutationObserver` 仅在首次挂载跑一次，此时 Portal 尚未传送 `[data-conversation-scroll]`，直接早退且永不重试，对话流新消息全部被藏在视口下方；
4. **新建方法时左侧列表立刻抢选第一条已有方法**：点「新建」清空 `selectedName` 后，`useLibraryData` 的 `useEffect` 下一帧立即把它覆写回 `entries[0].name`，整个新建过程左侧始终高亮第一条旧方法；
5. **`MethodLibraryToolCard` 未知动作伪报「已清除默认偏好」**：当 `method_library_set_default` 入参不可解析（`defaultAction === null`）且已完成时，二元三目误落入 `toolDefaultClearDone` 谎报已清除默认；且 `name` 为空时输出残缺冒号「已设默认：」。

## 分诊与授权

- 严重级：P1 — 包含真实 UI 永久卡死（`loading` 死锁）、无出口退出路径、对话永不滚底与工具卡误报方向四项高影响交互缺陷。
- 表面 / 边界：`packages/deep-research-pack/src/client/method-library/{useRunSourcePicker,useLibraryData,views,coach}.tsx|.ts`、`packages/deep-research-pack/src/client/MethodLibraryView.tsx`、`packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx` / client
- DSH 不变量：One value states one fact · Identity, initial state & disposal
- 触及面：pack 公共行为 — 方法库工作台核心交互
- 授权：自授权（P1 修理型修复）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码确定性复现
边界：client (`useRunSourcePicker` / `MethodLibraryView` / `MethodCoachPanel` / `useLibraryData` / `MethodLibraryToolCard`)

1. [useRunSourcePicker.ts](../../../packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts)（`L41-L44,L74-L78,L105-L117,L138-L143`）：`abortRunRead()` 把 `sourceReadControllerRef.current` 置为 `null`，导致 3 处 `if (sourceReadControllerRef.current !== controller) return` 永远在 `if (controller.signal.aborted) setRunState('cancelled')` 之前早退；
2. [views.tsx](../../../packages/deep-research-pack/src/client/method-library/views.tsx)（`L232-L240`） 的 `MethodSummaryView` 无 `onCancel` 按钮，且 `mode === 'edit'` 仍渲染 `onRestartSource`；
3. [coach.tsx](../../../packages/deep-research-pack/src/client/method-library/coach.tsx)（`L145-L163`） 的 `useEffect(..., [host])` 在 `coachChat.open` 传送 Portal 之前查找 `[data-conversation-scroll]` 返回 `null` 后永不重挂；
4. [useLibraryData.ts](../../../packages/deep-research-pack/src/client/method-library/useLibraryData.ts)（`L78-L87`） 不知晓 `mode === 'new'`，见 `selectedName === null` 立即选回 `entries[0].name`；
5. [MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)（`L46-L53`） 完成态用 `defaultAction === 'set' ? ... : 'toolDefaultClearDone'` 漏掉 `null` 态。

## 根因（假设 → 已证）

1. BUG-398 在 `abortRunRead` 中清空 ref 供 `reset()` 用，误杀掉用户主动取消路径的状态翻转；
2. 访谈/摘要顶栏与 `MethodCoachPanel` 缺少关闭按钮、`Escape` 监听及 `mode === 'edit'` 按钮显隐控制；
3. Portal 异步挂载晚于 `host` DOM 创建，单次 `querySelector` 无法捕获后续传送进来的滚动容器；
4. `useLibraryData` 自动选中逻辑与 `useDraftState.beginNew` 互抢 `selectedName`；
5. `MethodLibraryToolCard` `ok` 分支未沿用 `running` 分支的三态设计。
- 根因证据：逐行核对上述 6 个源文件。
- DSH 不变量：One value states one fact（`defaultAction === null` 伪报为 `clear`；取消态被卡死在 `loading`）。

## 牵出的失败类

- 同机制第 1 次（abort cleanup 把 `ref` 置空导致取消分支不可达）｜处置：类修（区分 `cancelRunRead` 显式置 `cancelled` 与 `reset` 静默丢弃）

## 修法

1. `useRunSourcePicker` 拆分 `cancelRunRead()`（先 abort 再直接把加载态落为 `cancelled` / `selectedRunLoading = false`）与 `reset()`；
2. `MethodSummaryView` 增补「取消 / 返回」按钮并支持 `Escape`（非输入焦点或按确认退出），`mode === 'edit'` 时隐藏「重新选择来源」；
3. `MethodCoachPanel` 将 `coach?.id` 纳入滚动 effect 依赖，或在 `host` 上挂 `MutationObserver` 等待 `[data-conversation-scroll]` 出现后再挂滚底监听；
4. `useLibraryData` 接收 `preserveEmptySelection`（`mode === 'new'`）避免抢选 `entries[0]`；
5. `MethodLibraryToolCard` 为 `state === 'ok' && defaultAction === null` 补充中性完成文案，空 `nameField` 回退 `t('methodEntries')`。

## 修复判据

1. 单测：`useRunSourcePicker` 在 `loadRunNames` 与 `selectRunSource` 进行中调用 `onCancelRunRead` 后，分别立刻进入 `runState === 'cancelled'` 与 `selectedRunLoading === false`；
2. 单测：`MethodSummaryView` 在 `interview` 态展示取消钮、`mode === 'edit'` 不渲染 `restartSource`；
3. 单测：`MethodCoachPanel` 在 Portal 异步插入 `[data-conversation-scroll]` 后能触发自动滚底；
4. 单测：`mode === 'new'` 时 `selectedName` 保持 `null`；`MethodLibraryToolCard` 对 `defaultAction === null` 的 `ok` 卡片不渲染「已清除默认偏好」。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/MethodLibraryView.tsx",
    "packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx",
    "packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts",
    "packages/deep-research-pack/src/client/method-library/useLibraryData.ts",
    "packages/deep-research-pack/src/client/method-library/useDraftState.ts",
    "packages/deep-research-pack/src/client/method-library/views.tsx",
    "packages/deep-research-pack/src/client/method-library/coach.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/method-library/coach-panel.spec.mjs",
    "tests/cockpit/client/method-library/method-library-queue.spec.mjs",
    "tests/cockpit/client/method-library/method-library-tool-card.spec.mjs",
    "tests/cockpit/client/method-library/method-library-views.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/method-library/coach-panel.spec.mjs tests/cockpit/client/method-library/method-library-queue.spec.mjs tests/cockpit/client/method-library/method-library-tool-card.spec.mjs tests/cockpit/client/method-library/method-library-views.spec.mjs",
    "exit": 1,
    "output": "BUG-481: scrollEl.scrollTop 0 !== 420 on async Portal; cancel stuck in loading; left list re-selected Alpha; unknown defaultAction rendered 已清除默认偏好"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/method-library/coach-panel.spec.mjs tests/cockpit/client/method-library/method-library-queue.spec.mjs tests/cockpit/client/method-library/method-library-tool-card.spec.mjs tests/cockpit/client/method-library/method-library-views.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/method-library/coach-panel.spec.mjs"
  }
}
```
