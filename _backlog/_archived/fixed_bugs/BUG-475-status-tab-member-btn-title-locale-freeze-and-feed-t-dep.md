---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-475：`ResearchStatusTab` 队员跳转钮嵌套破坏键盘与 DOM、活标题切会话残余挂起且切语言冻结、切换语言触发流重连劫持右栏

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **队员跳转钮键盘失效且运行态双 DOM**：在「研究状态」页签队员行上用 `Tab` 聚焦跳转按钮后按 `Enter`/`Space`，反而折叠/展开了行而无法跳进队员会话；且队员处于 `active` 时页面出现**两个** `data-testid="status-open-member"` 按钮（第二枚被 `<TextShimmer>` 复制渲染并扫过边框）；
2. **活标题切会话残余挂起 & 切语言永久冻结**：从 HITL 挂起会话切到新/空白会话，右栏页签标题残留「状态 · 待拍板」不复位；在设置中切换中/英文后，状态页签标题永久停留在旧语言；
3. **切换语言清空状态、重连全部流并劫持右栏**：中/英文切换时，`useStatusFeed` 与 `useMemberActivity` 将 `t` 放进流与扫描 `useEffect` 依赖，导致重置全部状态、重连主/子流、全量重扫 `evidence/*.md`，并在 HITL 会话中强行把右栏切回「研究状态」；
4. **Rerun HITL2 主按钮指向旧 v1 且 `final/` 读取失败误报悬空回执**：v2+ 重跑进入 HITL2 时，Focus Hero 因 `delivery !== null` 隐藏「分屏审阅终稿」而把主按钮指回旧 v1；`final/` 目录临时不可读时，把 `finalFileNames` 折成 `[]`，同时弹出矛盾的「目录不可读」与「终稿不在盘上」两条报错。

## 分诊与授权

- 严重级：P1 — 状态页签高频生命周期操作（键盘跳转队员、切会话、切语言、v2 重跑审阅、读失败诚实性）多处违背原生原语契约与真实性红线。
- 表面 / 边界：`packages/deep-research-pack/src/client/ResearchStatusTab.tsx`、`packages/deep-research-pack/src/client/index.ts`、`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`、`packages/deep-research-pack/src/client/research-status/useMemberActivity.ts` / client
- DSH 不变量：Identity, initial state & disposal · One value states one fact
- 触及面：pack 公共行为 — 状态页签观察面核心行为
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码与 `vendor/dsh` `DisclosureRow`/`TextShimmer`/`scoped-slots` 直接证成
边界：client (`ResearchStatusTab` / `useStatusFeed` / `useMemberActivity`)

1. [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)（`L371-L400`） 将 `memberJumpBtn` 放进 `DisclosureRow.collapsedContent`（vendor `vendor/dsh/packages/client/ui-primitives/src/DisclosureRow.tsx`（`L23-L24,L69-L118`） 将 `collapsedContent` 放进 `<div role="button">` 与 `<TextShimmer>` 内，独立操作钮应走 `headerAccessory`）；
2. [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)（`L429-L433`） 的 `ResearchStatusTitle` 从不在 `sessionId` 变更时复位 `hitl`，且 [index.ts](../../../packages/deep-research-pack/src/client/index.ts)（`L360-L363`） 在 `inject` 内静态求值 `t(...)` 而未声明 `locale: 'deepResearchPack'`；
3. [useStatusFeed.ts](../../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)（`L99-L132,L244-L254`） 与 [useMemberActivity.ts](../../../packages/deep-research-pack/src/client/research-status/useMemberActivity.ts)（`L29-L56`） 把 `t` 列入 `useEffect` 依赖；`danglingReceipt` 未排除 `finalState !== 'ok'`；
4. [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)（`L211-L232`） 用 `delivery === null` 门禁 `statusReviewFinal`。

## 根因（假设 → 已证）

1. 未按 `DisclosureRow` 官方 API 将独立按钮放入 `headerAccessory`；
2. 活标题组件缺失 `reset` 与响应式 `locale` 注入；
3. 数据拉取/订阅层与文案投影层耦合（把 `t` 放进 I/O effect 依赖而非 `useMemo`）；
4. v2 重跑场景未优先判断 `focusPhase === 'hitl2'`，`danglingReceipt` 将「目录不可读」折叠成「目录为空列表」。
- 根因证据：逐行核对上述 4 个源文件与 vendor `DisclosureRow.tsx`、`TextShimmer.tsx`、`scoped-slots.tsx`。
- DSH 不变量：One value states one fact（`final/` 读取失败被折成 `[]`）；Identity & disposal（切换语言误触发 `reset-session` 与 `revealStatusTab`）。

## 牵出的失败类

- 同机制第 1 次（I/O effect 依赖 `t` 导致 locale 切换重建订阅）｜处置：类修（拉取与订阅只存原始数据，格式化移入 `useMemo`；`DisclosureRow` 内独立按钮统一走 `headerAccessory`）

## 修法

1. 将 `memberJumpBtn` 移至 `DisclosureRow` 的 `headerAccessory` 槽位；
2. 为 `ResearchStatusTitle` 注册 `locale: 'deepResearchPack'`、在组件内取 `props.t(...)`，并在 `useEffect` 入口立即 `setHitl({ pending: false, since: undefined })`；
3. `useStatusFeed` 与 `useMemberActivity` 移除 `t` 出流/IO `useEffect` 依赖，在返回/渲染层用 `useMemo` 结合 `t` 投影本地化文案；
4. Focus Hero 当 `focusPhase === 'hitl2' && reviewDraftPath !== null` 时优先展示「分屏审阅终稿」；`danglingReceipt` 仅在 `finalState === 'ok'` 时判定。

## 修复判据

1. 队员行 `running=true` 时页面仅存在 1 枚 `status-open-member` 按钮，且聚焦按 `Enter`/`Space` 触发 `openMember` 而非折叠行；
2. `ResearchStatusTitle` 从 HITL 会话切到 `undefined`/新会话立刻恢复 idle 标题，切换 zh ↔ en 标题实时刷新；
3. 切换 `t` 引用不触发 `follow` 重连、不重扫目录、不触发 `revealStatusTab`；
4. v2 HITL2 态（已有旧 v1 `delivery` + 新 `reviewDraftPath`）展示「分屏审阅终稿」；`final/` 读失败时 `danglingReceipt === false`。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/index.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/research-status/types.ts",
    "packages/deep-research-pack/src/client/research-status/status-state.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/research-status/useMemberActivity.ts",
    "tests/cockpit/client/research-status/status-feed-behavior.spec.mjs",
    "tests/cockpit/client/locales/client-locale.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/research-status/status-feed-behavior.spec.mjs",
    "exit": 1,
    "output": "BUG-475: TextShimmer duplicated status-open-member (2 !== 1); ResearchStatusTitle froze locale; t change reconnected follow stream"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/client/research-status/status-feed-behavior.spec.mjs tests/cockpit/client/locales/client-locale.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/research-status/status-feed-behavior.spec.mjs"
  }
}
```
