---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-480：`MethodLibraryView` 写库与访谈状态破坏：手改表单每 900ms 静默调 LLM、切 Hub 页签丢草稿与写盘回执、访谈失败锁死按钮

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **手改表单每停顿 900ms 静默发送真实 LLM 请求**：新建方法选「从零开始」后直接切到「检查表单」（从未点「开始访谈」），在名称与四字段间打字每停顿 900ms 即向隐藏的 Method Editor 会话静默发送一次 `remote.session.prompt`（烧 token、污染会话历史）；若修改后 900ms 内点「保存到方法库」，还会把杂散提示塞在写盘操作前后；
2. **切换 Hub 页签静默丢失未保存草稿与在途写盘回执**：在「方法库」编辑草稿或刚点击「保存到方法库」等待写盘回读期间，点击顶部「Run 档案 / 研究透镜」或「返回对话」，`ResearchHubPanel` 直接卸载 `MethodLibraryView`，完全绕过 `confirmDiscard()` 与 `pendingOperationRef`，草稿与写盘确认回执直接丢失；
3. **启动访谈遇瞬时网络失败永久锁死「访谈已开始」**：`remote.session.prompt` 抛错（`uncertain: true`）或 reject 时，`MethodCoachPanel` 仍执行 `setStarted(true)`，按钮永久锁死在禁用态「访谈已开始」无法重试，且顶部同时出现面向写盘操作的误导文案「操作结果暂无法确认…」。

## 分诊与授权

- 严重级：P1 — 未经用户同意自动静默触发付费 LLM 回合（严重违背 D18 与成本红线），且直接导致用户编辑草稿与写盘确认丢失。
- 表面 / 边界：`packages/deep-research-pack/src/client/MethodLibraryView.tsx`、`packages/deep-research-pack/src/client/ResearchHubPanel.tsx`、`packages/deep-research-pack/src/client/method-library/coach.tsx` / client
- DSH 不变量：fail-loud · Identity, initial state & disposal
- 触及面：pack 公共行为 — 方法库编辑、访谈与写盘队列安全边界
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码控制流确定性复现
边界：client (`MethodLibraryView` / `ResearchHubPanel` / `MethodCoachPanel`)

1. [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)（`L335-L342,L480-L482`）：`MethodCoachPanel` 在 `mode !== 'read' && workbenchStage !== 'source'` 时即挂载并拿到 `coachId`（隐藏态 `display: none`），`useEffect` 仅检查 `coachId === null || manual.size === 0 || draft === null`，不检查访谈是否已开始、`sending` 或 `pendingOperationRef.current`，900ms 后直接 `sendCoach(...)`；
2. [ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx)（`L174-L198`）：条件渲染 `{tab === 'methods' ? <MethodLibraryView ... /> : ...}`，切 tab 直接卸载组件且无脏状态/在途操作拦截；
3. [coach.tsx](../../../packages/deep-research-pack/src/client/method-library/coach.tsx)（`L217-L223`） 与 [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)（`L225-L228`）：`setStarted(result.ok || result.uncertain === true)` 并在 `.catch` 里无条件 `setStarted(true)`，同时写入 `t('operationUnknown')`。

## 根因（假设 → 已证）

1. R0 将方法库从独立 `conversation.view` 迁入 `ResearchHubPanel` 的 tab 条件渲染后，未将脏草稿/在途写盘保护上提至 `ResearchHubPanel`（或以保活/拦截回调守住切 tab）；
2. `manualEditPrompt` 防抖副作用缺少 `interviewStarted && !sending && pendingOperationRef.current === null` 门禁；
3. `startInterview` 复用了写盘操作专用的 `uncertain` 锁死语义，而发一条访谈开场消息失败理应允许用户重试。
- 根因证据：逐行核对 [MethodLibraryView.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)（`L222-L229,L335-L342,L480-L482`）、[ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx)（`L174-L198`） 与 [coach.tsx](../../../packages/deep-research-pack/src/client/method-library/coach.tsx)（`L213-L224`）。
- DSH 不变量：fail-loud & disposal — 卸载静默丢写盘回执；未授权自动发 LLM 请求。

## 牵出的失败类

- 同机制第 1 次（组件迁入条件渲染 tab 后丢失生命周期守卫）｜处置：类修

## 修法

1. `MethodLibraryView` 将 `interviewStarted` 状态上提并严格门禁 `manualEditPrompt`：仅当 `interviewStarted === true && !sending && pendingOperationRef.current === null` 且用户主动启用访谈时才同步手改上下文（或改为仅在下一轮用户消息前随上下文附上，不定时盲发）；
2. `ResearchHubPanel` 切 tab 或「返回对话」前通过注册的 guard 回调检查方法库是否有在途写盘（阻断并提示）或未保存草稿（走 `confirmDiscard`），或在切 tab 时保持挂载（`hidden`）避免静默丢失状态；
3. `MethodCoachPanel.startInterview` 仅在 `result.ok === true` 时 `setStarted(true)`，失败时保留按钮可重试并展示清晰的访谈启动失败提示而非写盘 `operationUnknown` 文案。

## 修复判据

1. 单测：未启动访谈时修改表单等待 >1000ms，`sendCoach` 调用次数为 `0`；写盘 `sending === true` 期间 `sendCoach` 不发 `manualEditPrompt`；
2. 单测：方法库有未保存草稿或正在保存时，在 `ResearchHubPanel` 切 tab 会触发确认/拦截，不会静默丢失；
3. 单测：`onStartInterview` 返回 `{ ok: false, uncertain: true }` 或 reject 后，开始访谈按钮仍可点击重试且不显示 `operationUnknown`。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/MethodLibraryView.tsx",
    "packages/deep-research-pack/src/client/ResearchHubPanel.tsx",
    "packages/deep-research-pack/src/client/method-library/coach.tsx",
    "packages/deep-research-pack/src/client/method-library/model.ts",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/client/method-library/coach-panel.spec.mjs",
    "tests/cockpit/client/method-library/method-library-queue.spec.mjs",
    "tests/cockpit/client/research-hub-panel.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/method-library/coach-panel.spec.mjs tests/cockpit/client/method-library/method-library-queue.spec.mjs tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 1,
    "output": "BUG-480: startBtn.disabled locked true on uncertain; sent.length 1 !== 0 without interview; Hub tab switch confirmCalls 0 !== 1"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/method-library/coach-panel.spec.mjs tests/cockpit/client/method-library/method-library-queue.spec.mjs tests/cockpit/client/research-hub-panel.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/method-library/coach-panel.spec.mjs"
  }
}
```
