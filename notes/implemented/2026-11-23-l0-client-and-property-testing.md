> 状态：implemented

# L0 客户端行为测试底座、恶意 RunSource 故障矩阵与 PBT 寻虫接入

> 2026-11-23 ｜ 决定载体：[client-dom-helpers](../../tests/cockpit/client-dom-helpers.mjs) · [tabs-fault-matrix](../../tests/cockpit/client/tabs-fault-matrix.spec.mjs) · [status-feed-behavior](../../tests/cockpit/client/research-status/status-feed-behavior.spec.mjs) · [graph-feed-behavior](../../tests/cockpit/client/research-graph/graph-feed-behavior.spec.mjs) · [config-feed-behavior](../../tests/cockpit/client/research-config/config-feed-behavior.spec.mjs) · [markdown-mask](../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts) · [run-property](../../tests/cockpit/lib/run/run-property.spec.mjs) · [plan-mdast](../../tests/cockpit/lib/plan/plan-mdast.spec.mjs) · [markdown-mask-diff](../../tests/cockpit/lib/shared/markdown-mask-diff.spec.mjs) · [research-defaults-property](../../tests/cockpit/lib/workspace/research-defaults-property.spec.mjs) · [review-readiness-property](../../tests/run/gates/review-readiness-property.spec.mjs)

## 决定

在不改动 `package.json` `test:spec` CLI 签名（由 `layering` 门禁严格锁死）的前提下，于 L0 `keyless` 回归车道落地三块客户端行为与高密度寻虫设施：

1. **进程内 `.css` ESM stub + JSDOM / RTL 客户端行为底座（[client-dom-helpers.mjs](../../tests/cockpit/client-dom-helpers.mjs)）**：
   - 在 `client-dom-helpers.mjs` 首次导入时通过 `node:module` `register()` 安装幂等 `.css` ESM loader stub（将 `@deepseek-ai/dsh-client-ui-primitives` 的 CSS module 导入映射为 `Proxy` 键名），配合 `jsdom` + `@testing-library/react` + React 18 `act()`，使 `ResearchFinalTab.tsx` 与 `ResearchConfigTab.tsx` 在标准 `pnpm test:spec` 进程内真挂载渲染。
   - 收编共享 **恶意 `RunSource` 工厂（`makeMaliciousRunSource` + `applyArtifactFault`）**，支持对任意路径/目录按需注入 `missing` / `unreadable` / `truncated` / `empty` / `headings-only` / `invalid-json` / `conflict` / `throw` 及受控 `deferredPaths` 慢竞态与 `AbortSignal` 取消。
2. **三大 Hook 与四页签 L0 行为 + 故障矩阵测试**：
   - [status-feed-behavior.spec.mjs](../../tests/cockpit/client/research-status/status-feed-behavior.spec.mjs)：覆盖 `useStatusFeed` 会话切换慢 IO 竞态隔离、30s 定时器重扫与停摆阈值推进、`retry()` 恢复、`revealStatusTab` 单次触发，以及 `useMemberActivity` 的持久 `subagent` 父地址格式与卸载 `abort`。
   - [graph-feed-behavior.spec.mjs](../../tests/cockpit/client/research-graph/graph-feed-behavior.spec.mjs)：覆盖 `useGraphFeed` 会话切换复位、5s 定时重读、`retry()` 恢复、`follow` 断连最多 3 次有界重试与 `followError` 保留、`plan/vN.md` 快照五态。
   - [config-feed-behavior.spec.mjs](../../tests/cockpit/client/research-config/config-feed-behavior.spec.mjs)：覆盖 `useConfigFeed` 跨会话慢 `readLibrary` epoch/abort 竞态拦截、`send()` 发送后回话筛选与有界对账轮询、follow fail-soft 与 `question.md` 采用度。
   - [tabs-fault-matrix.spec.mjs](../../tests/cockpit/client/tabs-fault-matrix.spec.mjs)：在 JSDOM 下驱动四页签并运行 `artifacts × 7 类故障` 矩阵（验证零伪造交付/确认态 + 显性故障警示 + 重试按钮重扫），在 [client-surface.test.mjs](../../tests/checks/test-infra/client-surface.test.mjs) 的 `CLIENT_SMOKE_ONLY` 退役 `useStatusFeed`、`useGraphFeed` 与 `useMemberActivity` 三项登记。
3. **`fast-check` PBT + `mdast` 差分测试与实抓缺陷修复**：
   - 落地五组属性/差分测试：[run-property.spec.mjs](../../tests/cockpit/lib/run/run-property.spec.mjs)、[plan-mdast.spec.mjs](../../tests/cockpit/lib/plan/plan-mdast.spec.mjs)、[markdown-mask-diff.spec.mjs](../../tests/cockpit/lib/shared/markdown-mask-diff.spec.mjs)、[research-defaults-property.spec.mjs](../../tests/cockpit/lib/workspace/research-defaults-property.spec.mjs)、[review-readiness-property.spec.mjs](../../tests/run/gates/review-readiness-property.spec.mjs)，固定小样本预算以维持 `verify + test` 在 ~15s 量级。
   - **PBT 当场捕获并修复真实缺陷**：`markdown-mask-diff.spec.mjs` 第 34 次随机试跑用 `mdast` 最小反例揭示 [markdown-mask.ts](../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts) 容器嵌套缺陷——列表内未闭合围栏（`- \`\`\``）遇列首同深度 `blockquote`（`> \`\`\``）时，因先剥 `>` 后比较深度导致列表栈未弹出、`>` 误闭外层围栏且后续顶层 4 空格缩进代码块未被遮罩（可致代码块内 `readiness: FAIL` 泄漏为终局判定）。补齐 `restAtDepth` 列首缩进检查与同层围栏闭合判定，并在 `markdown-mask-diff.spec.mjs` 固化回归样本。

## 判据形状

- **权威事实**：四页签 DOM 渲染/交互行为 = `tests/cockpit/client/tabs-fault-matrix.spec.mjs`；三大 Hook 时序/竞态/重试行为 = 对应 `research-{status,graph,config}/*-behavior.spec.mjs`；纯折算不变量/CommonMark 等价性 = `fast-check` + `mdast-util-from-markdown`。
- **读取方**：`pnpm test:spec`、`pnpm test:coverage`、`tests/checks/test-infra/client-surface.test.mjs`、`tests/checks/shared/pack-mirror.test.mjs`、`tests/checks/repo/navigability-contract.test.mjs`。
- **坏输入**：`RunSource` 返回 `missing`/`unreadable`/`truncated`/`empty`/仅标题/坏 JSON/互斥声明或乱序慢返回，或随机 Markdown 容器交错输入 `markdown-mask`。
- **旧形态**：`renderToStaticMarkup` 空态静态渲染（[research-tabs.spec.mjs](../../tests/cockpit/client/research-tabs.spec.mjs)）保留作最小 SSR 壳回归；`CLIENT_SMOKE_ONLY` 仅保留 `method-library` 四个 Hook 与类型/风格文件；后续状态机纯 Reducer 抽干承接见 [结构治本 Note](2026-11-23-state-machine-and-contract-architecture.md)。
- **反证**：`markdown-mask` 真实 `mdast` 反例先红后绿；对 `useStatusFeed.ts` 注入退化变异（去掉 `if (next.pending && !prevPending.current)` 守卫使 `revealStatusTab` 每次重复触发）触发 `status-feed-behavior.spec.mjs` 红（`2 !== 1`，exit `1`）。

## 输掉的方案

- **修改 `package.json test:spec` 添加 `--loader`/`--import` CSS hook 或改用 Vitest**：`tests/checks/test-infra/layering.test.mjs` 精确锁定 `test:spec` 与 `test:coverage` CLI 字符串，引入两套 runner 也会分裂日常验证链路；改为共享 `tests/cockpit/client-dom-helpers.mjs` 进程内调用 `node:module register()`，保持零 CLI 改动且 `test:coverage` 与日常车道同源。
- **无上限提高 `fast-check numRuns`**：按 Issue 停损设定 `numRuns` 为 `40–100`，在保证 ~15s 日常链路的前提下稳定触发跨容器 CommonMark 反例与结构不变量。

## 实际跑过的验证

- **修复前实测基线与红证**：
  - `pnpm test:coverage` 基线（实施前）：`useStatusFeed.ts` 行 `56.28%`、`useConfigFeed.ts` 行 `58.04%` / 函数 `66.67%`、`useGraphFeed.ts` 函数 `33.33%`、`ResearchStatusTab.tsx` 分支 `8.00%`、`ResearchGraphTab.tsx` 分支 `10.34%`、`ResearchFinalTab.tsx` / `ResearchConfigTab.tsx` 未接入 L0 覆盖。
  - 真实红证：`markdown-mask-diff.spec.mjs` 捕获 `mdast` 最小反例（列表未闭合围栏 + 列首 `>` + `    indented Aa\n    readiness: FAIL`）；对 `useStatusFeed.ts` 临时注入无条件 `revealStatusTab()` 变异，单测 `tests/cockpit/client/research-status/status-feed-behavior.spec.mjs` fail（`actual: 2, expected: 1`），还原后绿。
- **实施后全量验证**：
  - `pnpm verify`：**PASS**（全项绿，含 `guard-red-record`、`pack-mirror`、`client-surface`、`dist-freshness`）。
  - `pnpm test`：`test:spec` **1522/1522 PASS**（`8.30s`），`test:checks` **269/269 PASS**（`20.94s`）。
  - `pnpm test:coverage`（实施后）：`useStatusFeed.ts` 行 `99.52%`（分支 `87.26%` / 函数 `91.18%`）、`useGraphFeed.ts` 行 `99.10%`（分支 `84.29%` / 函数 `90.48%`）、`useConfigFeed.ts` 行 `99.55%`（分支 `76.56%` / 函数 `95.45%`）、`useMemberActivity.ts` 行 `96.55%`（函数 `100.00%`）、`ResearchStatusTab.tsx` 行 `86.03%` / 分支 `88.62%`、`ResearchGraphTab.tsx` 行 `87.34%` / 分支 `62.30%`、`ResearchFinalTab.tsx` 行 `93.38%` / 函数 `92.00%`、`ResearchConfigTab.tsx` 行 `55.56%` / 分支 `34.29%`、`markdown-mask.ts` 行 `99.69%` / 分支 `97.37%`。
