# 2026-11-27 · 驾驶舱 UX/UI 全量核查 15 项缺陷批修复（BUG-436…450）

> 状态：implemented

## 决定

对 2026-11-27 UX/UI 核查发现的 15 张未决缺陷卡（BUG-436…450；BUG-435 已在前期 `16ddd7c6` 修复落地并保留未动）按真边界与根因聚类一次性收口：

1. **工具与浏览器回归基建（BUG-450 / BUG-441 / BUG-442 / BUG-443）**：
   - [`tools/env.sh`](../../tools/env.sh) 增加 `BASH_SOURCE[0]` / `ZSH_VERSION`（`${(%):-%x}`）/ `$0` 三段根路径解析与仓库根标志校验，`git -C` 复用同一 `_repo_root`；
   - [`checks/lib/shared/probe-status-tab.mjs`](../../checks/lib/shared/probe-status-tab.mjs) 抽出纯可重入状态机 `nextStatusPaneAction`，供 [`probes/browser/cdp-probe.mjs`](../../probes/browser/cdp-probe.mjs) 在 `workspace-boot` 异步切换 Blank Session 重设右栏后重新展开状态栏并选中新会话胶囊；
   - [`SelectMenu.tsx`](../../packages/deep-research-pack/src/client/defaults/SelectMenu.tsx) `<button>` 同时暴露 `data-value` 与 `value`，并让 [`cockpit-truth-residuals.entry.mjs`](../../checks/smoke/cockpit-truth-residuals.entry.mjs) S21 读取之；[`cockpit-truth-substance.entry.mjs`](../../checks/smoke/cockpit-truth-substance.entry.mjs) 对 `TrackRail` 改读 `[data-step-key]` / `[data-step-state]` 与后缀 `?`。
2. **数据读面与五态诚实性（BUG-436 / BUG-437 / BUG-444）**：
   - [`run-context.ts`](../../packages/deep-research-pack/src/lib/run/run-context.ts) `EOF_NAME` 补齐 `protocol.json`、`topics.md`、`review/claims.json`、`review/verdicts-r<N>.json`、`claims.json`、`verdicts.json`，避免落入 40 行默认截断；
   - [`artifact-read.ts`](../../packages/deep-research-pack/src/lib/run/artifact-read.ts) 与 [`claims-verdicts.ts`](../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts) 优先读取规范目录 `review/claims.json` 与最高轮 `review/verdicts-r<N>.json`（仅在缺失时回退根路径，目录读取失败显性返回 `unreadable`），兼容四值规范裁决 `supported` / `partially_supported` / `unsupported` / `unverifiable`，并在 [`ClaimsAuditView.tsx`](../../packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx) 渲染 `insufficient` 计数标签；
   - [`ProtocolCard.tsx`](../../packages/deep-research-pack/src/client/research-status/ProtocolCard.tsx) 与 [`ResearchEvidenceTab.tsx`](../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx) 分别拆分 `absent` / `empty` / `unreadable` / `invalid` 独立文案与 `data-*-state` 属性。
3. **功能交互、双语与布局收口（BUG-440 / BUG-445 / BUG-447 / BUG-449 / BUG-438 / BUG-439 / BUG-446 / BUG-448）**：
   - [`research-turn.ts`](../../packages/deep-research-pack/src/client/research-turn.ts) 对单回合多文件 `deliverables/presented` 只生成一张交付里程碑卡（优先 `readable*.md`）；
   - [`FinalToc.tsx`](../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx) 改为 `<button type="button">` 并连接 [`ResearchFinalTab.tsx`](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 正文 `bodyRef` 的 `scrollIntoView`；
   - [`evidence-card.ts`](../../packages/deep-research-pack/src/lib/run/evidence-card.ts) 解析出 `Question List` 勾选项后从 `bodyMarkdown` 裁剪对应小节，避免与结构框双重渲染，并将质量与信源层级标签迁入中英文 locale；[`QualityRadar.tsx`](../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx) 在英文单域名时走 `statusRadarPublishersOne`（`1 domain`）；
   - [`ResearchFinalTab.module.css`](../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css) 保持 `.segmentedWrap` 固有宽度并在窄分屏自动换行；[`ResearchHeaderPill.tsx`](../../packages/deep-research-pack/src/client/ResearchHeaderPill.tsx) 为 `HoverCard` 传 `inline` 激活主题随动 `.media` 表面；[`hub.module.css`](../../packages/deep-research-pack/src/client/research-hub/hub.module.css) 与 [`RunsView.tsx`](../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) / [`LensesView.tsx`](../../packages/deep-research-pack/src/client/research-hub/LensesView.tsx) 为搜索输入框挂 `.searchInput` 撑满容器；
   - [`workspace-files.ts`](../../packages/deep-research-pack/src/client/workspace-files.ts) 与 [`useStatusFeed.ts`](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) 识别 `gateway/cancelled` 与已中止 signal 后静默退场，保留其余故障的 `console.error`；其中 `Sidebar Session opening failed: Error: Session reference ... is released` 来自只读 `vendor/dsh` 的 `SidebarSessionView.dispose`，按仓规保持 vendor 只读不私改。

| 卡 | 根因一句话 | 归档卡 | 守卫 |
|---|---|---|---|
| BUG-436 | `EOF_NAME` 漏列 canonical 工件致 40 行截断 | [BUG-436](../../_backlog/_archived/fixed_bugs/BUG-436-run-context-40-line-cap-truncates-protocol-topics-claims.md) | `tests/cockpit/lib/run/artifact-read.spec.mjs` |
| BUG-437 | 仅读根目录且漏 `partially_supported`/`unverifiable` | [BUG-437](../../_backlog/_archived/fixed_bugs/BUG-437-claims-verdicts-wrong-paths-and-verdict-enum-mismatch.md) | `tests/cockpit/lib/run/claims-verdicts.spec.mjs` |
| BUG-438 | `.segmentedWrap` 强制压缩与分屏按钮重叠 | [BUG-438](../../_backlog/_archived/fixed_bugs/BUG-438-final-split-pane-segmented-control-overlaps-button.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-439 | `HoverCard` 缺 `inline` 在浅色模式黑底暗字 | [BUG-439](../../_backlog/_archived/fixed_bugs/BUG-439-header-pill-hovercard-dark-text-on-dark-bg-light-mode.md) | `tests/cockpit/client/research-tabs.spec.mjs` |
| BUG-440 | `deliverables/presented` 多文件产双里程碑卡 | [BUG-440](../../_backlog/_archived/fixed_bugs/BUG-440-milestone-card-duplicates-delivered-row-for-multifile-present.md) | `tests/cockpit/client/research-turn.spec.mjs` |
| BUG-441 | `cdp-probe` 未在会话切新后重展右栏 | [BUG-441](../../_backlog/_archived/fixed_bugs/BUG-441-run-driver-up-red-status-pane-open-on-blank-session.md) | `tests/run/probes/probe-status-tab.spec.mjs` |
| BUG-442 | `SelectMenu` button 缺 `data-value` 属性 | [BUG-442](../../_backlog/_archived/fixed_bugs/BUG-442-cockpit-truth-residuals-s21-fails-on-selectmenu-button.md) | `tests/cockpit/client/defaults/defaults-panel-confirm.spec.mjs` |
| BUG-443 | 门禁仍匹配 `TrackRail` 旧文本前缀 `?` | [BUG-443](../../_backlog/_archived/fixed_bugs/BUG-443-cockpit-truth-substance-trackrail-dot-prefix-breaks-4-checks.md) | `tests/cockpit/client/research-status/protocol-radar.spec.mjs` |
| BUG-444 | `ProtocolCard`/`EvidenceTab` 异常多态共文 | [BUG-444](../../_backlog/_archived/fixed_bugs/BUG-444-protocolcard-and-evidencetab-collapse-error-states.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-445 | `FinalToc` 为静态 `<div>` 无点击跳转 | [BUG-445](../../_backlog/_archived/fixed_bugs/BUG-445-final-toc-headings-not-clickable-no-scroll.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-446 | Hub 搜索 `<Input>` 未设 100% 宽度类 | [BUG-446](../../_backlog/_archived/fixed_bugs/BUG-446-hub-search-input-narrow-intrinsic-width-clips-placeholder.md) | `tests/cockpit/client/research-hub-panel.spec.mjs` |
| BUG-447 | 证据卡重复渲染 `Question List` 且硬编码英文标签 | [BUG-447](../../_backlog/_archived/fixed_bugs/BUG-447-evidence-tab-duplicates-question-list-and-hardcodes-quality-label.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-448 | `workspace-files` 把 `gateway/cancelled` 记错误 | [BUG-448](../../_backlog/_archived/fixed_bugs/BUG-448-rapid-session-switch-logs-cancelled-rpc-as-console-error.md) | `tests/cockpit/client/workspace-files.spec.mjs` |
| BUG-449 | `QualityRadar` 英文单数域名仍输出 `1 domains` | [BUG-449](../../_backlog/_archived/fixed_bugs/BUG-449-english-quality-radar-prints-1-domains-plural.md) | `tests/cockpit/client/research-status/protocol-radar.spec.mjs` |
| BUG-450 | `tools/env.sh` 仅用 `BASH_SOURCE[0]` 不兼容 `zsh` | [BUG-450](../../_backlog/_archived/fixed_bugs/BUG-450-env-sh-bash-source-breaks-under-zsh.md) | `tests/run/channel/env-credentials.spec.mjs` |

## 输掉的方案

- **在 `FinalToc` 用 `document.getElementById` 全局扫描定位标题**：同一页面分屏或多个 Tab 并存时全局 id 会跨容器碰撞；改用 `ResearchFinalTab` 自持的 `bodyRef` 局限在当前终稿滚动容器中按同下标/文本匹配。
- **在 `ResearchEvidenceTab` 用 DOM 隐藏替代正文裁剪**：仅用 CSS 隐藏 `Question List` 会耦合 markdown 渲染内部 DOM 结构且影响文本拷贝；在 `evidence-card.ts` 折算层完成裁剪兼顾 JSDOM、Markdown 导读和纯函数测试。
- **手写颜色覆盖 `HoverCard` CSS token 解决 Light 模式黑底**：容易随 vendor 暗亮 token 改版漂移；直接传 vendor 原生 `inline` prop 切到 `.media` 表面与宿主同源一致。

## 实际跑过的验证

- 构建与类型检查：`pnpm build`（exit 0）、`pnpm typecheck`（exit 0）、`node tools/release/export-dist.mjs`（exit 0，刷新 `_dist/dsh-deep-research-pack-0.3.7.tgz` 与 `_dist/安装手册.md`）。
- L0 结构门禁与单元测试：`zsh -c 'source tools/env.sh && pnpm verify && pnpm test'` → exit 0（`verify: 全绿`，`test:spec: 1670/1670 PASS`，`test:checks: 273/273 PASS`）。
- 既有真实浏览器冒烟（Chromium）：
  - `cockpit-truth-residuals.entry.mjs`：`28/28 PASS`（验证 BUG-442）；
  - `cockpit-truth-substance.entry.mjs`：`19/19 PASS`（验证 BUG-443）；
  - `cockpit-truth.entry.mjs`：`24/24 PASS`；
  - `cockpit-artifact-truth.entry.mjs`：`31/31 PASS`；
  - `cockpit-locale.entry.mjs`：`3/3 PASS`；
  - `client-load.entry.mjs --seed tests/fixtures/client-load-home`：exit 2 `NOT-RUN`（宿主机负载守卫 `load 28.24 / free 6489MB / 10 CPU: load/cpu 2.82 > 1.5`）。
- 活开发通道自检：`node tools/channel/run-driver.mjs up --force-probe`（端口 3083）→ 自动同步 `lib/client.js` 与 locales `.d.ts` 后 exit 0 `GREEN`（`statusPaneOpen=true`、`consoleProblems=0`、`exceptions=0`，验证 BUG-441）。
- 定向真实浏览器交互与故障注入验证（Chromium，Light/Dark、zh/en）：12/12 PASS（覆盖 58 行 `protocol.json`、`review/claims.json` + `review/verdicts-r1.json` 四值裁决与 `证据不足: 1`、分屏不重叠、`HoverCard` 浅色 `.media` 表面、单次交付去重里程碑、契约 `empty` vs `invalid` 分离、`FinalToc` 点击滚动、`Hub RunsView/LensesView` 搜索框全宽、`证据卡` 本地化标签与 `Question List` 去重、快速切会话零 `workspaceFiles` 取消错误、`en` 雷达单数 `1 domain`）。
