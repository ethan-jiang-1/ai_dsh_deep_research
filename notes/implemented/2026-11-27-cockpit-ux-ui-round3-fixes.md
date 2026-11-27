# 2026-11-27 · 第三轮 UX/UI 盲区 5 项缺陷批修复（BUG-458…462）

> 状态：implemented

## 决定

对第三轮 UX/UI 盲区核查检出的全部 5 项缺陷卡（BUG-458…462）按 P1 → P2 次序在真实契约与组件边界处修复并归档：

1. **ResearchHub「打开终稿」调用序、右栏重挂等待/展开与真路径解析（BUG-459 · P1）**：
   - [`runs-catalog.ts`](../../packages/deep-research-pack/src/lib/workspace/runs-catalog.ts) 新增纯函数 `preferredFinalPathOf(run)`，按 `latestReaderVersion`（`final/readable-v<N>.md`）> `latestFinalVersion`（`final/v<N>.md`）> `hasFinalMd`（`final.md`）择优解析在盘终稿路径，不再硬编码 `${rootPath}/final.md`；
   - [`RunsView.tsx`](../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) 将卡片按钮绑定到 `preferredFinalPathOf(run)` 产出的真实相对路径并传给 `onOpenFinal(finalPath)`；
   - [`ResearchHubPanel.tsx`](../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) 将调用序翻正为先执行 `backToChat()`（切回会话界面并触发 `ui-sidebar-right` 挂载会话表面）再调用 `openFinal(activeSessionId, finalPath)`；
   - [`startup.ts`](../../packages/deep-research-pack/src/client/startup.ts) 导出 `openResourceWhenMounted(sidebarRight, address, opts?)`，遇到 `no session surface is mounted` 时以 `25ms` 短间隔（上限 24 次）等待 React 提交完成挂载后再打开资源，并在右栏原本收起时（`isExpanded() === false`）调用 `toggleExpanded()` 主动展开；[`index.ts`](../../packages/deep-research-pack/src/client/index.ts) 接入该闭合并在 `scoped.effect` 清理函数中取消挂起重试定时器。
2. **RunsView「复制路径」按异步剪贴板结果诚实反馈（BUG-461 · P2）**：
   - [`zh-cockpit.ts`](../../packages/deep-research-pack/src/client/locales/zh-cockpit.ts) 与 [`en-cockpit.ts`](../../packages/deep-research-pack/src/client/locales/en-cockpit.ts) 同步新增 `hubCopyFailed`（`复制失败` / `Copy failed`）；
   - [`RunsView.tsx`](../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) 将同步置位改为三态 `copyFeedback`（`idle | copied | failed`）+ `useRef` 定时器清理，仅在 `navigator.clipboard?.writeText(rootPath)` resolve 后才置 `'copied'`，缺少对象或 reject 时如实置 `'failed'` 与 `data-copy-state="failed"`。
3. **DefaultsButton 去重原生 `title` 属性（BUG-462 · P2）**：
   - [`DefaultsButton.tsx`](../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx) 删除 `<button>` 上的原生 `title={tooltip}` 属性，保留外层自定义 `<Tooltip label={tooltip} side="top">` 与无障碍 `aria-label`，消除桌面悬停双重浮窗叠压。
4. **FinalToc 平衡括号扫描剥离嵌套括号链接（BUG-458 · P2）**：
   - [`FinalToc.tsx`](../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx) 新增 `findMatchingBracket`、`findMatchingParen` 与 `stripMarkdownLinks` 替代 `[^)]*` 非嵌套正则，支持带平衡括号 URL（如 Wikipedia 消歧义链接）及多层括号/尖括号链接目标的完整剥离与递归标签清洗。
5. **ResearchFinalTab 窄分屏 SegmentedControl 容器查询适配（BUG-460 · P2）**：
   - [`ResearchFinalTab.tsx`](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 给 `<SegmentedControl>` 传入 `css.segmentedControl`，[`ResearchFinalTab.module.css`](../../packages/deep-research-pack/src/client/ResearchFinalTab.module.css) 完整保留 `.segmentedWrap` 既有 `BUG-438` 规则，为 `.controlsBar` 增设 `container-type: inline-size`，并在 `@container (max-width: 340px)` / `(max-width: 260px)` 下把分段控件收紧贴合单栏宽（`width: 100%`、tab `padding: 0 4px`、`font-size: 11px`、`min-width: 0`）。

| 卡 | 根因一句话 | 归档卡 | 守卫 |
|---|---|---|---|
| BUG-458 | `FinalToc` 用非嵌套正则 `[^)]*` 过早截断含平衡括号 URL 的链接 | [BUG-458](../../_backlog/_archived/fixed_bugs/BUG-458-final-toc-truncates-markdown-links-with-nested-parens.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-459 | `ResearchHub` 先于 `backToChat` 调 `openFinal`、未展开右栏且硬编码 `${rootPath}/final.md` | [BUG-459](../../_backlog/_archived/fixed_bugs/BUG-459-hub-runs-open-final-fails-expand-and-hardcodes-root-final.md) | `tests/cockpit/client/research-hub-panel.spec.mjs` |
| BUG-460 | `SegmentedControl` 在 ~215px–238px 窄分屏下未被 `@container` 收紧并在右缘硬裁切 | [BUG-460](../../_backlog/_archived/fixed_bugs/BUG-460-final-segmented-control-clips-active-tab-in-narrow-split.md) | `tests/cockpit/client/final-evidence.spec.mjs` |
| BUG-461 | `RunsView.copyPath` 把置已复制同步写在异步 `writeText` 之外导致拒绝权限假绿 | [BUG-461](../../_backlog/_archived/fixed_bugs/BUG-461-runs-view-copy-path-shows-copied-on-clipboard-reject.md) | `tests/cockpit/client/research-hub-panel.spec.mjs` |
| BUG-462 | `DefaultsButton` 在 `<Tooltip>` 内对 `<button>` 多传原生 `title` 导致双浮窗 | [BUG-462](../../_backlog/_archived/fixed_bugs/BUG-462-defaults-button-renders-double-tooltip-and-native-title.md) | `tests/cockpit/shared/defaults-ui.spec.mjs` |

## 输掉的方案

- **在 `index.ts` `openFinal` 用单次固定 `setTimeout(..., 100)` 盲等会话重挂**：机器负载高或首屏渲染跨多帧时 100ms 仍可能失手、快机器上则空等 100ms；采用 `openResourceWhenMounted` 先同步试探并在遇到 `no session surface is mounted` 时 `25ms` 短轮询（带上限与卸载取消）更稳健。
- **在 `FinalToc` 靠全局渲染隐藏 DOM 再读 `textContent` 抽取标题**：会让纯文本抽取耦合 React 挂载时机与 Markdown 渲染器；纯 JS 平衡括号扫描 `stripMarkdownLinks` 线性时间无副作用、node/browser 同构可测。
- **在 `ResearchFinalTab` 用 `transform: scale()` 缩窄 `SegmentedControl`**：缩小文字渲染清晰度并使外框占位高度与点击热区脱节；采用 `@container` 收紧 tab 内边距与字号并维持 `width: 100%` 使 `.indicator` 百分比定位零偏移。

## 实际跑过的验证

- 定向单测与构建生成：`runs-catalog` / `product-startup` / `research-hub-panel` / `defaults-ui` / `final-evidence` / `client-locale` 6 份回归用例 **36/36 PASS**；`pnpm build`、`pnpm typecheck`、`node tools/release/export-dist.mjs`、`record-asset-ledger.mjs`（278 项资产）与 `render-test-index.mjs` 均 exit 0。
- 真浏览器端到端验证（Chromium，`verify-458-462.mjs` 跑后已清理）：**5/5 PASS**（exit 0）——实证 `BUG-462`（`nativeTitle=null, tooltipCount=1`）、`BUG-458`（TOC `["边界目录测试","参考 United Nations 说明","深度 API (v2) 概览"]`, `scroll 0 -> 408`）、`BUG-460`（`480×800` 分屏 `wrapWidth=215, wrapScrollWidth=215, activeText="核查清单 (1)", docScrollOverflow=0`）、`BUG-461`（reject 时 `text="复制失败", state="failed"`）与 `BUG-459`（收起态右栏 + 归档 `readable-v1.md` 自动展开并渲染 `ARCHIVED_FINAL_OK`, `mountErrors=[]`）。
- 重叠既有真浏览器冒烟与活通道探针：
  - `node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs`：**28/28 PASS**（exit 0）；
  - `node --import tsx/esm checks/smoke/cockpit-truth-substance.entry.mjs`：**19/19 PASS**（exit 0）；
  - `node tools/channel/run-driver.mjs up --force-probe`：**GREEN**（exit 0，原子同步 3 个 client 产物并在 3083 活通道免重启热载，`statusPaneOpen=true`, `consoleProblems=0`）。
- L0 门禁与无密钥全量测试：`zsh -c 'source tools/env.sh && pnpm verify && pnpm test'` → exit 0（`verify` 全门禁绿，`test:spec` 1687/1687 PASS，`test:checks` 276/276 PASS）。
