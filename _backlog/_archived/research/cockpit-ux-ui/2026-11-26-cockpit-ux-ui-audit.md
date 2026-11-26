---
topic: cockpit-ux-ui-audit
intent: 诊断研究驾驶舱现状 UX/UI 债务并盘点 DSH 宿主可用能力，给出渐进实验路线图（E1–E5）
---

# 研究驾驶舱 UX/UI 诊断与 DSH 能力充分利用评估

## 一、仓库目的与现状定性

1. **仓库定位**：`ai_dsh_deep_research` 是基于 DeepSeek Harness（DSH，pinned 基线 `dsh-v0.2.1-rc.5` @ `vendor/dsh/`）的多角色深度研究插件包（`packages/deep-research-pack/`）：提供 4 个研究角色 preset（`lead` / `scout` / `analyst` / `critic`）+ 1 个方法编辑 preset（`method-editor`）+ 2 个非研究 worker profile（`research-worker` / `research-wave`），以 Agent Teams + subagent 为协作通道，遵循 `研究报告 = harness(bundle)`（[docs/design/10-architecture.md](../../../../docs/design/10-architecture.md)）交付带出处核查的 `drt_<slug>/` 研究产物。
2. **核心判断——底座扎实、呈现欠账**：
   - **数据面与工程纪律很扎实**：`packages/deep-research-pack/src/lib/` 折算纯函数层具备强判别联合（`ArtifactState` 五态、`binding-trust` 三态、三位置发现、`review-readiness`、`brief-fold` 五问折算）、day-one 双语词表（`src/client/locales/{zh,en}.ts` 与 `*-fold.ts`），以及 L0–L4 分层门禁。
   - **呈现层与交互体验明显滞后**：如 [docs/design/40-research-cockpit.md](../../../../docs/design/40-research-cockpit.md) §1 所记，驾驶舱最初源于“调试期观察面”诉求（“调试的时候让我知道底下在干什么、它在等我”），导致信息几乎都暴露出来了，但视觉与交互形态停留在“带内联样式的工程师调试台”，且几乎没有用上 DSH 客户端框架本身成熟的扩展点与 UI 原语。

---

## 二、代码级 UX/UI 诊断（实证清单）

### P0 · 设计系统脱节与幽灵 CSS Token（暗色模式崩坏 + 错误态失效）

1. **幽灵 `--dsh-*` 语义变量**：
   - [`StartCard.tsx`](../../../../packages/deep-research-pack/src/client/StartCard.tsx)（L31–33）使用了 `var(--dsh-border, ...)` 与 `var(--dsh-surface, transparent)`。
   - [`DefaultsButton.tsx`](../../../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx)（L98–100）使用了 `--dsh-accent`、`--dsh-border`、`--dsh-text-secondary`。
   - [`DefaultsPanel.tsx`](../../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)（L25–46、L135–158、L249、L320–322）使用了 `--dsh-text-secondary`、`--dsh-border`、`--dsh-surface`、`--dsh-text`、`--dsh-text-tertiary`、`--dsh-accent`。
   - **实证核对**：经检索 `vendor/dsh/packages/client/ui-theme/src/styles/design-platform.css`，DSH 主题中**不存在这些 `--dsh-*` 颜色/表面 token**（DSH 真实语义变量前缀为 `--dsw-alias-*`）。浏览器求值时它们全部静默回落到亮色硬编码 fallback（如 `#ffffff`、`#111827`、`#d1d5db`），导致暗色模式下出现白底黑字与对比度断裂。
2. **幽灵 `--dsw-alias-label-error` 变量**：
   - [`MethodLibraryToolCard.tsx`](../../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)（L53）、[`MethodLibraryView.tsx`](../../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)（L371–373、L397）、[`coach.tsx`](../../../../packages/deep-research-pack/src/client/method-library/coach.tsx)（L243）、[`views.tsx`](../../../../packages/deep-research-pack/src/client/method-library/views.tsx)（L85、L117、L127、L252）引用了 `var(--dsw-alias-label-error)`。
   - **实证核对**：`design-platform.css` 中**不存在 `--dsw-alias-label-error`**，真实错误态 token 为 `--dsw-alias-state-error-primary`（L250/L368）。当前方法库与工具卡的错误态红字/红框在运行期静默失效。
3. **大面积硬编码亮色 Hex 与透明黑底色**：
   - [`ResearchStatusTab.tsx`](../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)（L133–250）大量硬编码 `#f59e0b33`、`#ef444418`、`#22c55e14`、`#b45309`、`#2563eb`、`#0000000d`；
   - [`TrackRail.tsx`](../../../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx)（L35–65）硬编码 `#888`、`#0000000d`、`#c08a2e`；
   - [`research-graph/styles.ts`](../../../../packages/deep-research-pack/src/client/research-graph/styles.ts)（L8–19）、[`GraphNotices.tsx`](../../../../packages/deep-research-pack/src/client/research-graph/GraphNotices.tsx)（L22–33）、[`DagMap.tsx`](../../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)（L30–135）硬编码 `#fafbfc` 画布底色、`#f0fdf4`/`#eff6ff`/`#f8fafc` 节点填充、`#0f172a` 文字、`#00000005`/`#00000014` 边框；
   - [`ResearchConfigTab.tsx`](../../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)（L103、L314、L357、L365）、[`ResearchFinalTab.tsx`](../../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（L69–77、L415）、[`ResearchToolCard.tsx`](../../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx)（L18–34）同理（如 `border: '1px solid #ddd'`、`#2a2`、`#b00`）。
   - 直接违背 `vendor/dsh/docs/web-styling.zh.md`「禁止颜色字面量、必须使用 `--dsw-alias-*` 语义 token、平面中性边框统一 `0.5px`」规范。

### P0 · 样式构建管线缺失导致被迫全员 Inline Styles

- 对比 `vendor/dsh/packages/client/tsdown.client.ts`（L1–61，内置 `lightningcss` + `styleInjectionModule`，支持 `*.module.css` 自动哈希和 `<style data-plugin-css>` 注入），[`packages/deep-research-pack/tsdown.config.ts`](../../../../packages/deep-research-pack/tsdown.config.ts)（L31–47）尚未接入 CSS Modules 管线。
- **后果**：组件被迫全面采用 React inline `CSSProperties`，无法自然表达 `:hover`、`:focus-visible`、`prefers-reduced-motion`、响应式断点、`0.5px` 发丝线、`corner-shape: round`；只能在 [`src/client/styles.ts`](../../../../packages/deep-research-pack/src/client/styles.ts)（L1–68）中手拼全局 CSS 字符串向 `<head>` 打补丁。

### P1 · 闲置 DSH `ui-primitives` 原子组件库，重复手搓原生 HTML 控件

- 本包已经在 `package.json` 的 `dsh.client.inject` 与 `peerDependencies` 中声明了 `@deepseek-ai/dsh-client-ui-primitives`，但当前 `src/client/` 仅零星使用了 `MarkdownText`、3 个图标以及 `ResearchConfigTab` 中的 `Button` / `Input` / `Menu` / `Modal` / `Tag`。
- 其余界面大量手写原生 `<select>`、`<input>`、`<textarea>`、`<details>/<summary>`、无样式下划线按钮和原始 Unicode 符号（`…`/`✓`/`●`/`○`/`🔍`/`🌐`）。
- 而 `vendor/dsh/packages/client/ui-primitives/README.zh.md`（L41–78）已现成提供：`Button`、`Input`、`InlineEditor`、`SegmentedControl`、`SegmentedTabs`、`Pill`、`Tag`、`StateDot`（含 `appearance="step"` 与全页同相旋转 `ongoing`）、`DisclosureRow`、`TextShimmer`、`Menu`/`MenuItemButton`/`MenuSurface`、`Modal`、`RiskConfirmation`、`Tooltip`、`HoverCard`/`HoverCardGroup`、`Toast`、`PathLabel`、`SearchBlock`、`WebBlock`、`FileTypeIcon`、`LinkIconMedium`。

### P1 · 信息架构与交互体验短板（“什么都暴露了，但不好扫读、不好下手”）

1. **首屏割裂与引导弱**（见 [`docs/assets/readme-first-screen.png`](../../../../docs/assets/readme-first-screen.png)）：Blank Session 中央仍显示通用代码助手输入提示，[`StartCard.tsx`](../../../../packages/deep-research-pack/src/client/StartCard.tsx)（L84–120）以 9 行纯文本说明占满输入框上方，右栏 Start 页平铺 5 张普通卡片；新用户看不到最近研究，也无法一键套用题型模板或直接进入方法库。
2. **方法库入口受限于活跃会话**（[design/40 §6](../../../../docs/design/40-research-cockpit.md) 已记限制）：方法库只挂在 `conversation.view`，而 Blank Session Hero 不渲染 `conversation.view` tab——开跑前想管理方法库，只能先随便点进一条历史会话。
3. **右栏「研究状态」堆叠 8 区、信息重复且缺乏主次**：[`ResearchStatusTab.tsx`](../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx)（L131–295）自上而下堆叠了 HITL 横幅 + 绿色五问摘要块 + 9 列横向 `TrackRail`（窄栏易横向溢出）+ 决策诚实线 + 问题行（与五问摘要的 `goal` 重复）+ 证据/交付/版本混排一行 + 活动流 + 队员折叠区。静默推进期缺乏 `TextShimmer` + `StateDot` 的节奏感，等待 HITL 时焦点也易被绿色摘要框分散。
4. **右栏「研究图谱」顶部叠床架屋、图与列表冗余**：[`ResearchGraphTab.tsx`](../../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)（L292–428）顶部最多可同时叠出 Header + VersionRail + DiffCard + MappingGap + StateNote + PlanLoaded 统计 + GraphNotices 6 层区块才见到 DAG；[`DagMap.tsx`](../../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)（L13–141）节点尺寸写死且无关联边高亮/缩放适配，下方又全量平铺所有顶层 [`NodeCard`](../../../../packages/deep-research-pack/src/client/research-graph/NodeCard.tsx) 造成双倍占位。
5. **右栏「终稿」缺少核心的“证据可核查”溯源交互**：[`ResearchFinalTab.tsx`](../../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)（L408–410）已做好读者版/审计版切换与 `MarkdownText` 渲染，但未接入 `MarkdownDelegateProvider`（`openFile`），文内 `[来源: evidence/xx.md]` 不能直接悬停预览或点击在右栏分屏对照证据原文；长报告也缺少章节目录（TOC）跳转。
6. **右栏折叠时失去进度感知**：用户收起右栏专注主对话区时，会话顶栏没有任何研究阶段、HITL 提醒或证据进展指示。
7. **对话流工具卡过于简陋**：[`ResearchToolCard.tsx`](../../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx)（L33–39）为 1px `#ddd` 框 + 单行文字，与 DSH 原生 `ui-tool` 卡片质感落差较大。

---

## 三、DSH 开发环境的高价值能力地图（已核实、未充分利用）

以下能力均在 `vendor/dsh/packages/client/` 源码中真实存在，可零魔改、按插件标准路径接入：

| DSH 能力 / 扩展位 | 权威源码位置 | 能解决的 UX/UI 问题 |
|---|---|---|
| `sidebar.panellist` + `main`（root keyed） | `vendor/dsh/packages/client/ui-sidebar/src/client/contract/slots.ts`, `ui-layout/src/client/index.ts` | 将「方法库 + 研究档案/Run 总览」升格为左侧全局主面板，彻底消除空白会话进不了方法库的限制 |
| `conversation.session.header.actions` / `.utilities` | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts`（成熟范例：`vendor/dsh/packages/experimental/client-ui-agent-team/src/client/TeamAction.tsx`） | 在会话顶栏常驻「研究进度胶囊」（当前阶段 + HITL 等待态 + 证据数），悬停展示五问摘要浮层、点击展开对应右栏页签 |
| `sidebar.session.row.leading` / `.hover` | `vendor/dsh/packages/client/ui-workspace/src/client/contract/slots.ts` | 在左栏会话列表行首直接展示研究状态点（进行中 / ⏳等你拍板 / ✅已交付），多场并行研究一目了然 |
| `sidebar.right.tab.guide`（chain）/ `.guide.entry` | `vendor/dsh/packages/client/ui-sidebar-right/src/client/contract/slots.ts` | 定制右栏空白 Start 引导页：用统一插画与卡片呈现工作区最近 run、快捷入口与研究导览 |
| `conversation.hero.brand.mark` + `.hero.options` + `inputActions.insertText` | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` | 打造真正的 Orca 首屏 Hero：虎鲸品牌标志 + 题型/深度快速起步模板，点击即向输入框注入研究骨架 |
| `sidebarRight.openResource(..., { preferNewPane: true })` + `MarkdownDelegateProvider` | `vendor/dsh/packages/client/ui-sidebar-right/README.zh.md`, `ui-primitives/README.zh.md` | **杀手级证据溯源**：在终稿点击 `[来源: evidence/xx.md]` 时，利用 DSH 右栏原生双格分屏（`ui-dockkit`），左侧看终稿、右侧对照打开证据原文；悬停先用 `HoverCard` 预览摘要与来源等级 |
| `sidebar.right.tab.menu.item` + `tab.actions.bindCommands({ refresh })` + `ctx.shortcuts` | `vendor/dsh/packages/client/ui-sidebar-right/src/client/contract/slots.ts` | 为状态 / 图谱 / 终稿页签补齐原生刷新快捷键与页签菜单项 |
| `ui-primitives` + `ui-theme` `--dsw-alias-*` + `--dsw-elevation-*` + `0.5px` 边框 | `vendor/dsh/docs/web-styling.zh.md`, `ui-theme/src/styles/design-platform.css` | 与宿主浑然一体的视觉质感，天然兼容明暗主题与 macOS/Web 材质 |
| `tsdown` + `lightningcss` CSS Modules 注入 + DSH Client HMR | `vendor/dsh/packages/client/tsdown.client.ts`, `vendor/dsh/packages/client/hmr` | 让插件代码告别 inline styles，获得 scoped CSS Modules 与开发期热更新环 |

---

## 四、建议的调研与实验路线（E1–E5）

1. **E1 · 视觉基线与暗色模式取证**：用 `node tools/channel/run-driver.mjs up` 与浏览器探针在明/暗双主题、1280px / 1440px / 768px 视口下完整截图现状全套页面（Hero、StartCard、Status、Graph、Config、Final、MethodLibrary、HITL 问卡），存至本目录 `assets/`，作为后续改造前后对比的客观基准。
2. **E2 · 样式构建管线 & Token 契约实验**：
   - 验证在 `packages/deep-research-pack/tsdown.config.ts` 中引入轻量 `lightningcss` CSS Modules 注入（兼容现有 `window.__ModuleLoader__.load` 外壳、`pnpm test` 与 `client-load.entry`）；
   - 形成完整 Token 映射表，清理全部 `--dsh-*`、`--dsw-alias-label-error` 与裸亮色 hex；
   - 试验新增一条 L0 静态门禁：校验 `src/client/` 中所有 `var(--dsw-*)` 均真实存在于 `vendor/dsh/packages/client/ui-theme/`，且不允许出现幽灵 `--dsh-*` 颜色变量或裸 hex 字面量（例外显式登记）。
3. **E3 · 核心阅读与监控体验重构原型（状态页 + 终稿分屏溯源）**：
   - 状态页重排：去掉摘要区与问题行的重复，将 9 列横向 `TrackRail` 改造为不溢出的分段/两层步进轨（复用 `StateDot` `appearance="step"`），活动流与队员动态用 `DisclosureRow` + `TextShimmer` 收纳；
   - 终稿页增强：接入 `MarkdownDelegateProvider`（识别 `evidence/*.md` 等 bundle 内部引用）+ `preferNewPane: true` 右栏双格分屏对照 + 轻量可折叠目录（TOC）。
4. **E4 · DSH 未开发槽位可行性探针**：在真实运行态逐个验证 4 个高价值扩展位的接线约束与性能开销：
   - `sidebar.panellist` + `main`（全局方法库 / 研究工作台）；
   - `conversation.session.header.actions`（顶栏研究进度胶囊 + 悬停五问摘要）；
   - `sidebar.session.row.leading`（左栏会话状态点，评估多会话订阅成本）；
   - `conversation.hero.brand.mark` + `sidebar.right.tab.guide`（首屏 Hero 与右栏 Start 页）。
5. **E5 · 交互组件质感打磨（工具卡 + DAG 图谱 + 默认配置控件）**：
   - `ResearchToolCard` 升级为 `DisclosureRow` + `StateDot` + `TextShimmer`；
   - `DefaultsPanel` / `DefaultsButton` 替换原生控件为 `ui-primitives` 的 `Menu` / `Pill` / `Input` / `Tooltip`；
   - `DagMap` 主题化（SVG 消费 CSS 变量）+ 选中节点关联依赖边高亮 + 消除图与卡双倍冗余。

---

## 五、待拍板的产品取舍问题

1. **改造优先级**：先「修底子」（E1 + E2：补齐 CSS Modules 管线、修复暗色模式/幽灵 token、切换 `ui-primitives`），还是直接做「信息架构跃迁」（E3 + E4：全局面板、顶栏进度胶囊、终稿分屏看证据）？
2. **视觉风格定位**：完全贴合 DSH 原生极简质感（看起来像 DSH 一方功能），还是在原生骨架上保留适度的 Orca 研究产品辨识度（强化报告阅读排版、阶段轨道与证据卡）？
3. **「方法库」入口调整**：把方法库从 `conversation.view` 搬迁到左侧全局 `sidebar.panellist` + `main`（或保留双入口），是否符合你的预期？
