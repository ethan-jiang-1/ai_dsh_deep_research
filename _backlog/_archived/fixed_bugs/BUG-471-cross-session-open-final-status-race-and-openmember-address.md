---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-471：跨会话打开终稿与从工作台进会话的右栏挂载竞态，且 `openMember` 丢弃 `parentSessionId`

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

三处跨会话/子会话导航均存在真实竞态或崩溃：
1. **左栏菜单 / 首屏续接条跨会话打开终稿串台**：当前停留在会话 A（右栏已挂载会话 A），在左栏对会话 B 点「… → 打开研究终稿」或在 `StartCard` 点最近已交付会话 B 时，终稿页签被错开在**会话 A** 的右栏，切换后会话 B 右栏并未打开终稿；
2. **工作台 `RunsView` 点「进入研究会话 / 查看会话」抛未捕获异常**：在冷启动或切换到未渲染过的会话 B 时，点击后同步抛出 `Error: sidebarRight: no session surface is mounted`，未能打开「研究状态」页签；
3. **点击队员跳转钮可能抛 `unknown session`**：在状态页或工具卡点击队员子会话跳转按钮时，若 `subagentCatalog` 尚未预热，抛出 `Error: sessions.retain: unknown session <memberId>`。

## 分诊与授权

- 严重级：P1 — 核心跨会话导航主路径（左栏菜单、首屏续接、Hub 进会话、队员跳转）在真实使用中串台或抛未捕获异常。
- 表面 / 边界：`packages/deep-research-pack/src/client/index.ts`、`packages/deep-research-pack/src/client/startup.ts`、`packages/deep-research-pack/src/client/ResearchHubPanel.tsx` / client ↔ vendor `ui-sidebar-right` & `ui-workspace`
- DSH 不变量：fail-loud · Identity, initial state & disposal
- 触及面：pack 公共行为 — 涉及研究驾驶舱跨会话导航行为
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码与 `vendor/dsh` 生命周期对账
边界：browser / client ↔ `ui-sidebar-right` (`service.ts:322-335`) & `session-controller` (`manager.ts:135-181`)

1. `openSessionFinal(sessionB, pathB)`（[index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L234-L238`））依次同步调用 `openSession(sessionB)` → `backToChat()` → `openFinal(sessionB, pathB)`。此时 React 尚未提交切会话渲染，`sidebarRight.mounted.getSnapshot()` 仍为 `sessionA`，[startup.ts](../../../packages/deep-research-pack/src/client/startup.ts)（`L114`） `openResourceWhenMounted` 同步调用 `sidebarRight.openResource` 不抛错、直接落在 `sessionA` 的右栏；
2. [ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx)（`L212-L216`） 同步调用 `openSession(target)` → `backToChat()` → `openStatus()`（即未做挂载等待的裸 `scoped.sidebarRight.openTab`，[index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L223`）），在 `RightbarSeat` 尚未 `adopt` 目标会话前直接命中 `require()` 抛错；
3. [index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L222`） `openMember = (_leadSessionId, memberId) => uiWorkspaceNav.openSession(memberId)` 丢弃了 `leadSessionId`，未按上游 `client-ui-agent-team` 传入显式 `SubagentAddress`。

## 根因（假设 → 已证）

1. `openResourceWhenMounted` 仅靠捕获 `no session surface is mounted` 重试，未校验 `sidebarRight.mounted.getSnapshot() === targetSessionId`；当旧会话仍挂载在屏时误把新会话资源塞进旧会话右栏。
2. `revealStatusTab` / `revealGraphTab` 未封装等待目标会话挂载的辅助函数（与 BUG-459 修 `openFinal` 时漏掉 `openStatus`），且未在右栏收起时展开。
3. `openMember` 以裸 `SessionId` 调用 `uiWorkspace.openSession`，依赖未保证存在的 `subagentCatalog`，而上游 `vendor/dsh/packages/experimental/client-ui-agent-team/src/client/mount.ts:45-49` 显式传 `{ parentSessionId, childSessionId, mode: 'continuable' }`。
- 根因证据：核对 `vendor/dsh/packages/client/ui-sidebar-right/src/client/service.ts`（`L322-L335`）、[startup.ts](../../../packages/deep-research-pack/src/client/startup.ts)（`L95-L134`）、[ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx)（`L212-L223`） 与 `vendor/dsh/packages/experimental/client-ui-agent-team/src/client/mount.ts`（`L45-L49`）。
- DSH 不变量：Identity — 右栏导航目标会话与当前挂载会话身份未对齐。

## 牵出的失败类

- 同机制第 2 次（前例 = [BUG-459](./BUG-459-hub-runs-open-final-fails-expand-and-hardcodes-root-final.md) 仅解决 Hub 无挂载时的 `openFinal`，未覆盖跨会话已挂载竞态与 `openTab`）｜处置：类修（统一 `whenSessionMounted(sidebarRight, expectedSessionId, action)` 守卫所有跨会话右栏打开动作）

## 修法

1. 在 `startup.ts` 中为 `openResourceWhenMounted` 增加可选 `expectedSessionId`（同步检查 `sidebarRight.mounted?.getSnapshot() === expectedSessionId`，不等则继续重试/订阅 `mounted` 变化，并支持 `openTabWhenMounted` 复用同一等待逻辑与展开右栏逻辑）；
2. `openSessionFinal`、`ResearchHubPanel.onOpenFinal` 与 `onEnterSession` 均传入 `expectedSessionId`；
3. `openMember(leadSessionId, memberId)` 改为传入 `{ parentSessionId: leadSessionId, childSessionId: memberId, mode: 'continuable' }`（兼容结构类型）。

## 修复判据

1. 单测：当 `mounted` 初始为 `sessionA`、延迟 2 tick 才变为 `sessionB` 时，`openResourceWhenMounted(..., { expectedSessionId: 'sessionB' })` 与 `openTabWhenMounted(..., { expectedSessionId: 'sessionB' })` 绝不在 `sessionA` 上执行，待 `mounted === 'sessionB'` 后在 `sessionB` 精确打开并展开右栏；
2. 负控：`mounted` 在超时内未切到目标会话或被 `cancel` 取消时，安全中止并走 `onError`，不抛未捕获异常也不写错会话；
3. `openMember(leadId, memberId)` 单测验证向 `uiWorkspace.openSession` 传入 `{ parentSessionId: leadId, childSessionId: memberId, mode: 'continuable' }`。

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
    "packages/deep-research-pack/src/client/ResearchHubPanel.tsx",
    "tests/cockpit/client/product-startup.spec.mjs",
    "tests/cockpit/client/research-hub-panel.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/product-startup.spec.mjs tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 1,
    "output": "BUG-471 openResourceWhenMounted/openTabWhenMounted/buildMemberSessionTarget missing expectedSessionId guard and SubagentAddress"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/product-startup.spec.mjs tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/product-startup.spec.mjs"
  }
}
```
