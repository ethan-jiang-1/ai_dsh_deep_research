---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-479：跨面草稿预填与 `@` 引用闭环断裂：透镜起题已有草稿静默丢弃、图谱插入回退清空草稿、点击 `@W2.1` 不选节点且全屏预填不可见

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

驾驶舱四处「一键预填 / `@` 引用」交互（对应 North Star D18 仅预填不自动发送与 S4 图谱引用闭环）存在多处断链：
1. **工作台 `LensesView` 点「以此透镜发起研究」静默丢弃提示词 & 切错工作区**：若空白会话输入框里已有文字，点击透镜卡后 `startSession` 复用该空白会话，因 `whenDraftExists: 'keep'` 直接丢弃透镜 prompt 且零提示；若用户已切到工作区 B，`startResearch` 仍按 `localStorage` 旧 `PRODUCT_WORKSPACE_KEY` 强跳回工作区 A；
2. **图谱 `insertReference` 失败回退 `setDraft` 清空用户草稿与全部 `@` 胶囊，且非 `W[1-9]`/未绑定节点产出无法解析的假引用**：当编辑器锁定/span 失效导致 `insertText` 返回 `false` 时，直接调用 `setDraft(payload)` 清空用户已写的长草稿与所有已有引用胶囊；未绑定 slug 时插裸 `task-1 `，Team 回退任务/旧 `N1` 节点插 `@drt_<slug>/task-1` 不满足 `PLAN_NODE_TOKEN_RE` 永远不渲染成胶囊；
3. **点击已发送或草稿里的 `@W2.1` 计划节点胶囊不选中目标节点**：仅打开「研究图谱」页签，未传递 `nodeId` 选中高亮对应节点（对比 North Star `OPEN_GRAPH_NODE`）；
4. **终稿页尾与首屏起题卡预填拼接长文 & 全屏下不可见**：全屏精读台点「填入草稿」时 Composer 仍被全屏层遮挡，用户反复点击会无分隔符把多段完整 prompt 拼成一坨；首屏连续点击两张不同起题灵感卡也会把两条完整模板拼在一起；终稿 `prefilledCopy` 切报告/切会话不复位。

## 分诊与授权

- 严重级：P1 — 覆盖首屏起题、工作台透镜起题、终稿续研、图谱 `@` 引用四条核心「观察 → 行动」闭环，会导致静默丢词或清空用户已写草稿。
- 表面 / 边界：`packages/deep-research-pack/src/client/startup.ts`、`packages/deep-research-pack/src/client/index.ts`、`packages/deep-research-pack/src/client/ResearchGraphTab.tsx`、`packages/deep-research-pack/src/client/ResearchFinalTab.tsx`、`packages/deep-research-pack/src/client/StartCard.tsx`、`packages/deep-research-pack/src/client/research-triggers.tsx`、`packages/deep-research-pack/src/lib/events/research-references.ts` / client + pack lib
- DSH 不变量：fail-loud · Identity, initial state & disposal
- 触及面：pack 公共行为 — 涉及跨面草稿预填与 `@` 引用协议
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码与 `vendor/dsh` `InputActions` / `navigation.ts` / `facade.ts` 直接证成
边界：client (`startup.ts` / `index.ts` / `ResearchGraphTab` / `ResearchFinalTab` / `StartCard` / `research-triggers.tsx`)

1. [startup.ts](../../../packages/deep-research-pack/src/client/startup.ts)（`L78-L84`） 返回 `{ prompt, whenDraftExists: 'keep' }`，`vendor/dsh/packages/client/ui-conversation/src/client/input/facade.ts`（`L299-L303`） 遇非空草稿静默返回 `'preserved'`；[index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L264-L268`） 忽略当前工作区硬取 `PRODUCT_WORKSPACE_KEY`；
2. [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（`L268-L275`） `if (!inputActions.insertText(payload, span)) inputActions.setDraft(payload)` 直接覆盖整份草稿；[research-references.ts](../../../packages/deep-research-pack/src/lib/events/research-references.ts)（`L28`） `PLAN_NODE_TOKEN_RE` 仅认 `W[1-9]...`；
3. [research-triggers.tsx](../../../packages/deep-research-pack/src/client/research-triggers.tsx)（`L103,L236`） 与 [index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L224`） 调 `openGraph()` 零参未传 `nodeId`；
4. [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L297-L302`） 与 [StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)（`L70-L74`） 无条件 `insertText` 拼接且全屏下不退出全屏、`prefilledCopy` 不随 `load` 复位。

## 根因（假设 → 已证）

1. 未区分「插入片段（追加，失败绝不 `setDraft` 清空）」与「选模板/透镜起题（替换或带换行追加）」两种语义；
2. `openTab(RESEARCH_GRAPH_TAB_KIND, { params: { nodeId } })` 是 DSH 原生支持的导航参数，却未被 `openGraph` 与 `ResearchGraphTab` 接线；
3. 全屏右栏覆盖主区 Composer，预填动作未同步退出全屏让用户看到已填好的草稿（对比 North Star `PREFILL_DRAFT` 设 `rightFullscreen: false`）。
- 根因证据：逐行核对上述 7 个源文件与 vendor `input.ts:255-266`、`facade.ts:125-131,291-306`、`navigation.ts:221-236`。
- DSH 不变量：fail-loud（静默丢透镜 prompt / 静默清空草稿）。

## 牵出的失败类

- 同机制第 1 次（四处预填各自手写 `insertText || setDraft` 导致一致性的破坏）｜处置：类修（抽象区分 `insertDraftSnippet` 与 `prefillDraftPrompt`，并统一退出全屏语义）

## 修法

1. `buildStartResearchOptions` 改为 `whenDraftExists: 'append'`（或带空行追加），`startResearch` 优先采用当前会话所属工作区再回退 `PRODUCT_WORKSPACE_KEY`；
2. `ResearchGraphTab.insertReference` 禁止在 `insertText` 失败时回退 `setDraft` 清空草稿；仅对满足 `PLAN_NODE_TOKEN_RE` 且已绑定 `boundSlug` 的节点显示「插入 `@` 引用」（或同步放宽 parser 支持合法 plan 节点 ID）；
3. `openGraph(nodeId?: string)` 通过 `sidebarRight.openTab(RESEARCH_GRAPH_TAB_KIND, nodeId ? { params: { nodeId } } : undefined)` 透传目标节点，`ResearchGraphTab` 监听 `tabInfo.navigation.params.nodeId` 自动展开并选中该节点；
4. `ResearchFinalTab` 与 `ResearchGraphTab` 在 `isFullscreen` 下预填草稿时先退出全屏（`toggleFullscreen()`）；`StartCard` 点击模板卡替换草稿或仅在用户未手改时替换；`ResearchFinalTab` 切文档时重置 `prefilledCopy`。

## 修复判据

1. 单测：`buildStartResearchOptions(prompt)` 使用 `'append'` 不再静默丢词；`startResearch` 尊重当前工作区；
2. 单测：`insertReference` 在 `insertText` 返回 `false` 时绝不调用 `setDraft`；
3. 单测：点击 `ResearchRefChip` (`kind: 'plan_node', nodeId: 'W2.1'`) 将 `nodeId: 'W2.1'` 传入 `openGraph`，`ResearchGraphTab` 选中 `W2.1`；
4. 单测：`ResearchFinalTab` 全屏态预填触发 `toggleFullscreen` 并在切换文档后重置 `prefilledCopy`。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/startup.ts",
    "packages/deep-research-pack/src/client/rightbar-nav.ts",
    "packages/deep-research-pack/src/client/index.ts",
    "packages/deep-research-pack/src/client/research-triggers.tsx",
    "packages/deep-research-pack/src/client/research-graph/types.ts",
    "packages/deep-research-pack/src/client/ResearchGraphTab.tsx",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/StartCard.tsx",
    "tests/cockpit/client/product-startup.spec.mjs",
    "tests/cockpit/client/research-commands-shortcuts.spec.mjs",
    "tests/cockpit/client/final-studio-r2.spec.mjs",
    "tests/cockpit/client/start-card.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/product-startup.spec.mjs tests/cockpit/client/research-commands-shortcuts.spec.mjs tests/cockpit/client/final-studio-r2.spec.mjs",
    "exit": 1,
    "output": "BUG-479: openGraph received [undefined] instead of [\"W1\"]; buildStartResearchOptions returned keep; fullscreen prefill did not exit fullscreen"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/product-startup.spec.mjs tests/cockpit/client/research-commands-shortcuts.spec.mjs tests/cockpit/client/final-studio-r2.spec.mjs tests/cockpit/client/start-card.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/final-studio-r2.spec.mjs"
  }
}
```
