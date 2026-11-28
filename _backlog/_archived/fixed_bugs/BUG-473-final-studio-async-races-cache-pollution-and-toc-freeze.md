---
status: 已修
severity: P1
opened: 2026-11-28
---

# BUG-473：终稿精读台异步竞态与目录滚动同步缺陷（手动重试跨报告覆盖、证据对照错配与 `FinalToc` 卡死）

> 严重级别：P1｜发现：2026-11-28｜状态：已修

## 症状

1. **手动重试跨报告/跨会话覆盖**：查看报告 A 时点击刷新/重试，在读盘返回前切到报告 B 或另一会话，报告 A 的旧请求完成后覆盖报告 B 的正文、`claimsSummary`、`reviewVerdict` 与目标路径；
2. **对照栏证据卡图文错配与跨会话缓存污染**：在全屏精读台先后快速点击引用 A（慢）与引用 B（快/命中缓存），慢请求 A 返回后覆盖 `inspectedEntry`，右侧栏顶部显示 B 的路径与「分屏打开 B」按钮，正文却显示 A 的标题、等级与摘录；切换会话时旧会话在途请求写入新会话缓存；
3. **左侧 Sticky TOC 滚动同步永久卡死**：当报告任一标题含下划线斜体（`_em_`）、尾 `#` 或 KaTeX 语法导致未命中匹配时，该标题及之后全部章节的高亮永远卡死在前一节；点击文末最后章节时，因滚动到底仍未越过 `56px` 阈值，高亮立刻回弹到上一节。

## 分诊与授权

- 严重级：P1 — 跨报告/跨证据数据错位直接破坏终稿与证据的真实性边界（用户可能把 A 证据的等级/内容误当成 B 证据），目录滚动高亮卡死影响长报告精读主体验。
- 表面 / 边界：`packages/deep-research-pack/src/client/ResearchFinalTab.tsx`、`packages/deep-research-pack/src/client/research-final/useEvidencePreview.ts`、`packages/deep-research-pack/src/client/research-final/FinalToc.tsx`、`packages/deep-research-pack/src/lib/run/evidence-preview.ts` / client + pack lib
- DSH 不变量：Identity, initial state & disposal
- 触及面：pack 公共行为 — 终稿精读与证据对照真实性
- 授权：等人拍板（触及 pack 公共行为）
- 批：2026-11-28-cockpit-wire-contracts-and-ux

## 复现

复现状态：稳定 — 源码确定性竞态与数学边界
边界：client + pack lib (`ResearchFinalTab` / `useEvidencePreview` / `FinalToc` / `activeTocHeadingIndex`)

1. [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L76-L77,L188-L198`）：`manualControllerRef.current?.abort()` 仅在组件卸载 `[]` 执行，不在 `[load]` 变更 cleanup 中执行，导致旧手动请求在 `aliveRef.current = true` 后落盘到新报告 state；
2. [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L257-L270`） `inspectInStudio` 与 [useEvidencePreview.ts](../../../packages/deep-research-pack/src/client/research-final/useEvidencePreview.ts)（`L31-L34,L63-L88`） 均缺少请求代次/会话 epoch 校验；
3. [FinalToc.tsx](../../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx)（`L48-L52`） 对未匹配标题塞入 `Number.POSITIVE_INFINITY`，[evidence-preview.ts](../../../packages/deep-research-pack/src/lib/run/evidence-preview.ts)（`L238-L246`） 的 `activeTocHeadingIndex` 在首个 `> thresholdPx` 处执行 `else break`，导致后续全部标题不可达。

## 根因（假设 → 已证）

1. 手动刷新 controller 与自动加载 effect controller 分离，且 effect 切换时未中止前者的在途请求。
2. 证据预取 hook 与调用方未做 epoch/token 校验，慢返回覆盖快返回与新会话状态。
3. `activeTocHeadingIndex` 把「找不到 DOM 元素（`Infinity`）」当成「尚未滚到该标题」并提前 `break`，且未处理容器滚到底部（`scrollTop + clientHeight >= scrollHeight - 2`）的边界情况。
- 根因证据：逐行核对 [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（`L76-L77,L188-L198,L257-L270`）、[useEvidencePreview.ts](../../../packages/deep-research-pack/src/client/research-final/useEvidencePreview.ts)（`L31-L88`） 与 [evidence-preview.ts](../../../packages/deep-research-pack/src/lib/run/evidence-preview.ts)（`L208-L246`）。
- DSH 不变量：Identity, initial state & disposal — 异步操作缺少身份/代次隔离。

## 牵出的失败类

- 同机制第 2 次（与 BUG-409 的 `chooseTokenRef` 同属异步回写缺少代次校验）｜处置：类修（统一 `epochRef` / cleanup abort 守卫终稿与证据预取全部异步回调）

## 修法

1. 在 `ResearchFinalTab` `[load]` cleanup 中同步 `manualControllerRef.current?.abort()`，并引入 `loadEpochRef`；
2. 为 `inspectInStudio` 增加 `inspectTokenRef`（仅当 `token === inspectTokenRef.current` 才写回 `inspectedEntry`），并在 `useEvidencePreview` 增加 `sessionEpochRef` 拒绝跨会话回写缓存与 `inflightRef`；
3. `activeTocHeadingIndex` 跳过非有限偏移（`!Number.isFinite(offset)` `continue` 而非 `break`），`normalizeHeadingText` 补齐 `_`/尾 `#` 剥离，`FinalToc` 在滚到底部时允许高亮最后一个可见标题。

## 修复判据

1. 单测：慢手动 reload A 后切换到 B，A 晚到 resolve 不改写 B 的任何 state；
2. 单测：快速依次 `inspectInStudio('evidence/a.md')`（慢）与 `'evidence/b.md'`（快），A resolve 后仍保持 B 的内容；切换 `sessionId` 后旧会话预取不污染新会话缓存；
3. 单测：`activeTocHeadingIndex([-200, Number.POSITIVE_INFINITY, -40, 120])` 返回 `2` 而非 `0`；滚到底部时末节高亮不回弹。

## 修复关联

去向：implemented — [2026-11-28-cockpit-wire-contracts-and-ux-fixes](../../../notes/implemented/2026-11-28-cockpit-wire-contracts-and-ux-fixes.md)
审查：agent（2026-11-28）

## 修复落地（2026-11-28）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/research-final/useEvidencePreview.ts",
    "packages/deep-research-pack/src/client/research-final/FinalToc.tsx",
    "packages/deep-research-pack/src/lib/run/evidence-preview.ts",
    "tests/cockpit/lib/run/evidence-preview.spec.mjs",
    "tests/cockpit/client/final-studio-r2.spec.mjs",
    "tests/cockpit/client/research-final/final-studio-sub.spec.mjs",
    "tests/fixtures/guard-ledger/ledger.json"
  ],
  "red": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/lib/run/evidence-preview.spec.mjs tests/cockpit/client/final-studio-r2.spec.mjs",
    "exit": 1,
    "output": "BUG-473: slow evidence/a.md overwrote fast evidence/b.md in inspector; activeTocHeadingIndex returned 0 !== 2 on Infinity"
  },
  "green": {
    "command": "TSX_TSCONFIG_PATH=\"$(pwd -P)/packages/deep-research-pack/tsconfig.client.json\" node --import tsx/esm --import ./tests/cockpit/css-module-helpers.mjs --test --test-reporter=spec tests/cockpit/lib/run/evidence-preview.spec.mjs tests/cockpit/client/final-studio-r2.spec.mjs tests/cockpit/client/research-final/final-studio-sub.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/cockpit/client/final-studio-r2.spec.mjs"
  }
}
```
