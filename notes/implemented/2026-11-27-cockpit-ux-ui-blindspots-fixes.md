# 2026-11-27 · 第二轮驾驶舱 UX/UI 深度盲区 7 项修复与 BUG-435/二阶段归档支持（BUG-435, BUG-451…457）

> 状态：implemented

## 决定

对第二轮驾驶舱 UX/UI 深度盲区核查提出的 7 张缺陷卡（BUG-451…457）按真实上游契约与组件边界逐一在根因处修复，并补齐「前序提交先 `修复落地`、后续提交仅做卡片 `已修` 归档」的门禁缺口以干净归档 BUG-435：

1. **工作台发研究契约与面板导航直达（BUG-451 / BUG-452）**：
   - [`startup.ts`](../../packages/deep-research-pack/src/client/startup.ts) 导出纯函数 `buildStartResearchOptions(prompt)`，非空时返回 `{ prompt, whenDraftExists: 'keep' }`；[`index.ts`](../../packages/deep-research-pack/src/client/index.ts) 直接引入上游 `@deepseek-ai/dsh-client-ui-workspace` 的 `DraftInitializationOptions` 替换手写影子 `initialPrompt` 字段，修复 Research Hub「以此透镜发起研究」静默丢失透镜提示词的问题；
   - [`DefaultsPanel.tsx`](../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx) 与 [`defaults.module.css`](../../packages/deep-research-pack/src/client/defaults/defaults.module.css) 将「方法库 ›」由无事件 `<span>` 改为语义化可聚焦 `<button type="button" data-testid="defaults-method-library-link">`（无跳转回调时不渲染伪链接）；[`ResearchHubPanel.tsx`](../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) 透镜页直切 `'methods'` 页签，[`ResearchConfigTab.tsx`](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)、[`useConfigFeed.ts`](../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts) 与 [`index.ts`](../../packages/deep-research-pack/src/client/index.ts) 桥接 `openHubTab('methods')` 直达工作台方法库。
2. **终稿目录、下拉菜单视口定位与纯文本提示槽（BUG-453 / BUG-454 / BUG-455）**：
   - [`FinalToc.tsx`](../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx) 新增 `stripMarkdownInline`（剥离图片、多轮内联链接/参考链接、反斜杠转义与行内强调/代码/删除线语法，仅留可见标签文本），使 `FinalToc` 展示文本与渲染后的 DOM 标题 `textContent` 对齐并稳定命中滚动；
   - [`config.module.css`](../../packages/deep-research-pack/src/client/research-config/config.module.css) 新增 `.switchMenuList` 限高滚动样式，[`ResearchConfigTab.tsx`](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) `methodPicker` `<Menu>` 启用 `portal` 与 `listClassName`，避免 `1280×720` 下向下溢出 72px 被裁切；
   - [`zh.ts`](../../packages/deep-research-pack/src/client/locales/zh.ts)、[`en.ts`](../../packages/deep-research-pack/src/client/locales/en.ts)、[`zh-fold.ts`](../../packages/deep-research-pack/src/client/locales/zh-fold.ts)、[`en-fold.ts`](../../packages/deep-research-pack/src/client/locales/en-fold.ts) 清除纯文本渲染槽的 `**...**` 原始星号（保留 `都是给 Lead 发一条指令` 既有契约），并同步中英文补充「研究工作台 → 方法库」指引。
3. **方法名诊断完整性与 TrackRail 随步标识（BUG-456 / BUG-457）**：
   - [`library-fold.ts`](../../packages/deep-research-pack/src/lib/method-library/library-fold.ts) 导出 `MethodNameIssueKind` 与 `methodNameIssueKind(name)`，在括号与不可见字符之外补齐拦截前导 `#`（`leading-hash`）与换行（`newline`）；[`zh-cockpit.ts`](../../packages/deep-research-pack/src/client/locales/zh-cockpit.ts) 与 [`en-cockpit.ts`](../../packages/deep-research-pack/src/client/locales/en-cockpit.ts) 增加对应 5 条名称诊断与重名提示词条；[`views.tsx`](../../packages/deep-research-pack/src/client/method-library/views.tsx) 抽取 `draftStatusOf` 共用判据给 `MethodSummaryView` 与 `EditorView`（消除名称非法时渲染空后缀「还需补齐：」问题），并由 [`MethodLibraryView.tsx`](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) 传入 `mode` 与 `existingNames`；
   - [`TrackRail.tsx`](../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx) 与 [`status.module.css`](../../packages/deep-research-pack/src/client/research-status/status.module.css) 移除固定在容器左上角的错位 `.rerunArrow`（`▲`），封闭虚线图例框并在 `evidence` 重入节点内随行渲染 `↺` 徽标（`.reentryBadge`）。
4. **结构门禁：支持前序已落地卡的二阶段归档（BUG-435）**：
   - [`staged-change-pairing.mjs`](../../checks/lib/repo/staged-change-pairing.mjs) 新增可选 `readHead` 注入，[`f-repo.mjs`](../../checks/verify/gates/f-repo.mjs) 传入 `git show HEAD:<rel>`；当暂存区存在从 `_backlog/bugs/BUG-*.md` 重命名到 `_archived/fixed_bugs/` 且暂存区无该卡 `changes` 时，仅在 `HEAD` 版卡已处于 `status: 修复落地`、带合法 `fix-evidence` 且非 `_backlog/` 改动文件全数仍在盘上时放行，仍在 `等人拍板` 等未落地状态或改动文件缺失的卡依旧拦截红灯。

| 卡 | 根因一句话 | 归档卡 | 守卫 |
|---|---|---|---|
| BUG-435 | `16ddd7c6` 已落地但仅重命名归档被 `staged-change-pairing` 当次暂存配对拦住 | [BUG-435](../../_backlog/_archived/fixed_bugs/BUG-435-channel-drift-recovery-full-rebuild-only.md) | `tests/run/channel/run-driver-contract.spec.mjs` |
| BUG-451 | `index.ts` 手写影子字段 `initialPrompt`，vendor `StartSessionOptions` 读 `prompt` | [BUG-451](../../_backlog/_archived/fixed_bugs/BUG-451-hub-lens-start-research-drops-initial-prompt.md) | `tests/cockpit/client/research-hub-panel.spec.mjs` |
| BUG-452 | `DefaultsPanel`「方法库 ›」为静态 `<span>` 伪链接，无事件且不可 Tab 聚焦 | [BUG-452](../../_backlog/_archived/fixed_bugs/BUG-452-defaults-panel-method-library-link-non-interactive.md) | `tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs` |
| BUG-453 | `FinalToc` 仅剥 `[*`]`, 保留 linkified 链接 `(url)` 致目录露 URL 且滚动失配 | [BUG-453](../../_backlog/_archived/fixed_bugs/BUG-453-final-toc-exposes-raw-markdown-links-and-fails-scroll.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-454 | `ResearchConfigTab`「换一条」`<Menu>` 未传 `portal` 与限高样式，720p 下裁切 | [BUG-454](../../_backlog/_archived/fixed_bugs/BUG-454-config-switch-menu-clips-below-720p-viewport.md) | `tests/cockpit/client/research-config-source.spec.mjs` |
| BUG-455 | 纯文本 locale 词条带原始 `**...**` 星号且 `configMethodHint` 指引未提工作台 | [BUG-455](../../_backlog/_archived/fixed_bugs/BUG-455-config-ui-strings-render-raw-markdown-asterisks.md) | `tests/cockpit/client/locales/client-locale.spec.mjs` |
| BUG-456 | `methodNameIssue` 放行前导 `#`/换行且摘要条在名称非法时拼出空后缀「还需补齐：」 | [BUG-456](../../_backlog/_archived/fixed_bugs/BUG-456-method-summary-shows-empty-incomplete-fields-on-name-issue.md) | `tests/cockpit/client/method-library/method-library-views.spec.mjs` |
| BUG-457 | `TrackRail` 将复盘箭头 `▲` 固定 `left: 3px`，脱离重入节点 `evidence` 且折行错指 | [BUG-457](../../_backlog/_archived/fixed_bugs/BUG-457-track-rail-rerun-arrow-misaligned-from-reentry-step.md) | `tests/cockpit/client/research-status/protocol-radar.spec.mjs` |

## 输掉的方案

- **在 `FinalToc` 直接用未 `linkify` 的原始 Markdown 切片替代 `stripMarkdownInline`**：若标题本身写有合法 Markdown 外链（如 `## [参考文档](https://...)`），跳过 `linkify` 仍会裸露链接语法；用 `stripMarkdownInline` 统一按可见文本解包同时覆盖用户外链与 `evidence/` 自动链接两类情况。
- **靠 JS 计算 `evidence` 节点偏移像素定位 `.rerunArrow`**：在窄屏折行、`ResizeObserver` 抖动或字体尺度变化时像素坐标易短暂失真；直接在重入节点内随行渲染 `↺` 徽标与 `data-step-reentry="true"` 绑定，不依赖固定宽度或折行位置。
- **对 `BUG-435` 放宽 `staged-change-pairing` 对所有纯 `bugs -> fixed_bugs` 重命名的检查**：直接免检会让未落地的卡趁机空翻 `已修`；仅允许在 `HEAD` 中已写有 `status: 修复落地`、合法 `fix-evidence` 且改动文件全在盘上的前序卡走二阶段归档。

## 实际跑过的验证

- 构建、类型与交付物生成：`pnpm build`（exit 0）、`pnpm typecheck`（exit 0）、`node tools/release/export-dist.mjs`（exit 0）、`record-asset-ledger.mjs`（278 项资产）与 `render-test-index.mjs`（exit 0）。
- 真浏览器逐项回归（Chromium 临时验证脚本 `verify-451-457.mjs` 跑后已清理）：**9/9 PASS**（exit 0），实测覆盖 `BUG-457`（1280×720 与 480×800 均无 `▲` 且 `挖掘↺` + `data-step-reentry="true"`）、`BUG-453`（目录去 URL 且 `afterCiteScroll=562 > 0`）、`BUG-455`、`BUG-454`（`top=496, bottom=708 <= 720`）、`BUG-452`（ConfigTab 与 Hub Lenses 均为 `<button>` 且直达 Hub 方法库）、`BUG-456`（含括号与前导 `#` 均禁用保存且给出精确原因）、`BUG-451`（composer 草稿预填非空透镜提示词）。
- 重叠既有真浏览器冒烟（Chromium）：
  - `node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs`：**28/28 PASS**（exit 0）；
  - `node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs`：**19/19 PASS**（exit 0）。
- 活通道探针：`zsh -c 'source tools/env.sh && node tools/channel/run-driver.mjs up --force-probe'` 返回 `NOT-RUN`（exit 2）：既有运行中通道（端口 3083，pid 75341）检测到 `BUG-456` 触发重建的 host 侧共享块（`lib/defaults.js`、`lib/method-library-io-jUEV3GCi.js`、`lib/method-library-tool.js`）发生漂移，BUG-435 host 漂移拒绝防护正确拦截未强行覆写运行中宿主（按 `guides/61 §0.1` 需停通道后重建 profile，本次未中断外部运行中通道）。
- L0 门禁与无密钥全量测试：`zsh -c 'source tools/env.sh && pnpm verify && pnpm test'` → exit 0（`verify` 全门禁绿，`test:spec` 1680/1680 PASS，`test:checks` 276/276 PASS）。
