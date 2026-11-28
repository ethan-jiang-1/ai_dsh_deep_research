---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-478：研究图谱状态机与投影错报：复合子节点丢状态误报「owner 未知」、缺图陷 `vnull` 死锁、`planDiffOf` 丢多后继拆分

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **复合子节点永远误报「进行中（owner 未知）」并静默丢失失败/卡住态**：展开复合节点查看子任务（如 `W2.1.1`、`W3.1`）时，即使负责队员正在活跃执行，子节点也永远显示「进行中（owner 未知）」；更严重的是，若子节点负责队员已崩溃（`owner-failed`）、卡住（`stalled`）或 `unassigned`，完全不显示告警/错误态，仍误报为「进行中（owner 未知）」；
2. **断流/缺图陷入 `vnull` 死锁与旧快照无限加载**：在查看「结构差异」或「旧图快照」期间若 5 秒轮询遇到 `plan-missing` / `plan-truncated`，版本轨按钮被隐藏但 `graphView='diff'` / `showSnapshotPlan=true` 不复位，界面渲染「结构差异（vnull → 当前）」「读不到 plan/vnull.md」且**无任何按钮可退出**；切会话不复位 `followAttempt`（上一会话用完 3 次重连后新会话 0 次重连）；读取 `plan/vN.md` 无 `try/catch`，通道异常时 `snapshotState` 永久锁死 `loading`；
3. **`planDiffOf` 丢失一拆多后继**：当节点拆分为多节点（如 `W3.1` → `superseded_by: W3.2, W3.3`）时，仅识别第一个 `W3.2`，把 `W3.3` 误报为全新 `+ 新增` 节点；
4. **`state-note.ts` 文案与事实相反**：当 `plan.md` 有节点但无依赖边（此时不画图）时，横幅却错怪 Team 看板缺 `blocked_by` 并宣称「图谱按 plan deps 画」。

## 分诊与授权

- 严重级：P1 — 观察面直接把队员崩溃/卡住的子任务伪报成「进行中」，版本对比可陷入无出口 `vnull` 死锁，违反观察面真实性与状态机完备性。
- 表面 / 边界：`packages/deep-research-pack/src/client/ResearchGraphTab.tsx`、`packages/deep-research-pack/src/client/research-graph/{graph-state,useGraphFeed,state-note}.ts`、`packages/deep-research-pack/src/lib/plan/plan-diff.ts` / client + pack lib
- DSH 不变量：fail-loud · One value states one fact · Identity, initial state & disposal
- 触及面：pack 公共行为 — 研究图谱状态机与计划 diff 投影
- 授权：自授权（P1 修理型修复）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 纯函数与状态机代码确定性复现
边界：pack lib (`plan-diff.ts`) + client (`ResearchGraphTab.tsx` / `graph-state.ts` / `useGraphFeed.ts` / `state-note.ts`)

1. [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（`L291`）：`childStateOf` 对每个子节点硬编码传 `planNodeStateOf(mappingIndex.mapping.get(childId), undefined, undefined, props.t)`，直接丢弃 `running` 与 `attention`；
2. [graph-state.ts](../../../packages/deep-research-pack/src/client/research-graph/graph-state.ts)（`L77-L125`）：`follow-start` 未重置 `followAttempt`，`plan-missing` / `plan-error` / `plan-truncated` 未重置 `graphView` 与 `showSnapshotPlan`；[useGraphFeed.ts](../../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)（`L191-L201`） 的 `readArtifact` 缺少 `try/catch`；
3. [plan-diff.ts](../../../packages/deep-research-pack/src/lib/plan/plan-diff.ts)（`L96-L109`）：`successorsOf(tombstoneLifecycle).find(...)` 仅取首项而非 `.filter(...)`；
4. [state-note.ts](../../../packages/deep-research-pack/src/client/research-graph/state-note.ts)（`L49-L50`） 对 `hasPlan && !hasEdges` 返回「Team 看板缺 `blocked_by`、图谱按 plan deps 画」，与 [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（`L189,L395`） 仅由 `plan.deps` 判定 `hasEdges` 且 `!hasEdges` 不画图矛盾。

## 根因（假设 → 已证）

1. 子节点渲染复用 `planNodeStateOf` 时漏查 `taskId` 对应的 `running`（成员 `phase === 'active'`）与 `attentionByTaskId`；
2. `graph-state` reducer 对异常转移未收口辅助视图状态，且 `useGraphFeed` 异步快照读取未按防御红线兜底异常；
3. `planDiffOf` 实现用了 `.find()` 与其自身注释声明的 `superseded_by: W3.2,W3.3` 契约矛盾；
4. `state-note.ts` 保留了早期 Team-only 时代旧文案。
- 根因证据：逐行核对上述 5 个文件及 `artifact-read.ts:229`。
- DSH 不变量：One value states one fact / fail-loud — 子节点失败态被压扁成「owner 未知」，快照通道异常引发未捕获 rejection 锁死加载态。

## 牵出的失败类

- 同机制第 1 次（reducer 异常分支漏重置派生视图态）｜处置：类修（枚举全部非法/缺失状态迁移统一收敛视图态，并补齐异常路径单测）

## 修法

1. `ResearchGraphTab` 为 `childStateOf` 查明子节点映射 task 的 `running` 与 `attention`，准确展示活跃/失败/卡住/未分配态；
2. `graph-state.ts` 新增 `reset-session` 动作重置 `followAttempt` 与全部视图状态；`plan-missing`/`plan-truncated`/`plan-error` 同步清零 `graphView='current'`、`showSnapshotPlan=false`；`useGraphFeed.ts` 包裹快照读取 `try/catch` 并在异常时转 `unreadable`；`ResearchGraphTab.tsx` 的 diff/old-graph 渲染额外守卫 `latestSnapshot !== null`；
3. `plan-diff.ts` 改为 `const nextTargets = successorsOf(tombstoneLifecycle).filter((id) => newById.has(id))`，全部写入 `aliases` 与 `aliasTargets`；
4. `state-note.ts` 对应 zh/en 文案如实说明「`plan.md` 节点未声明依赖边（deps），当前以节点清单展示」。

## 修复判据

1. 单测：复合子节点对应 task 的 `owner-failed`/`stalled`/`active` 状态准确投影，不再误报 `owner 未知`；
2. 单测：`graph-state` 在 `graphView='diff'` 遇 `plan-missing` 自动回到 `current` 无 `vnull`；快照读抛错转 `unreadable` 不锁 `loading`；
3. 单测：`planDiffOf` 对 `W3.1 → superseded_by: W3.2, W3.3` 产出两条 alias 且 `added` 不含 `W3.3`；
4. `hasPlan && !hasEdges` 的中/英文说明与「`plan.md` 无 deps、不画 DAG」事实一致。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/plan/plan-diff.ts",
    "packages/deep-research-pack/src/client/ResearchGraphTab.tsx",
    "packages/deep-research-pack/src/client/research-graph/graph-state.ts",
    "packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts",
    "packages/deep-research-pack/src/client/research-graph/GraphVersionRail.tsx",
    "packages/deep-research-pack/src/client/research-graph/state-note.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/lib/plan/plan-diff.spec.mjs",
    "tests/cockpit/client/research-graph/graph-state.spec.mjs",
    "tests/cockpit/client/research-graph/graph-feed-behavior.spec.mjs",
    "tests/cockpit/client/research-graph/state-note.spec.mjs",
    "tests/cockpit/client/research-graph/dag-map.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/lib/plan/plan-diff.spec.mjs tests/cockpit/client/research-graph/graph-state.spec.mjs tests/cockpit/client/research-graph/graph-feed-behavior.spec.mjs tests/cockpit/client/research-graph/dag-map.spec.mjs",
    "exit": 1,
    "output": "BUG-478: child nodes misreported 进行中（owner 未知）; plan-missing left graphView=diff; snapshot error unhandled; planDiff dropped W3.3"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/lib/plan/plan-diff.spec.mjs tests/cockpit/client/research-graph/graph-state.spec.mjs tests/cockpit/client/research-graph/graph-feed-behavior.spec.mjs tests/cockpit/client/research-graph/state-note.spec.mjs tests/cockpit/client/research-graph/dag-map.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-graph/dag-map.spec.mjs"
  }
}
```
