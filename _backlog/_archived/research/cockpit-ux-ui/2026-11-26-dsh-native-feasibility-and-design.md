---
topic: dsh-native-feasibility-and-design
intent: 逐项验证研究驾驶舱 UX/UI 加码方案在 DSH 原生能力上的落地可行性与版本升级安全性，形成可转入 goal 实施的决策表与蓝图
---

# 研究驾驶舱基于 DSH 原生能力的 UX/UI 升级可行性与设计方案

## 一、核心结论与升级安全原则

经逐包核查 `vendor/dsh/packages/client/`（钉版 `dsh-v0.2.1-rc.5`）与本仓 [packages/deep-research-pack](../../../../packages/deep-research-pack/package.json) 源码及构建/测试管线，结论如下：

> **12 项拟议 UX/UI 升级与加码点中，11 项可 100% 通过 DSH 原生公开槽位、官方原子组件库与标准构建契约「零魔改」落地；仅 1 项（左栏会话列表行首状态标）因缺 Host 聚合数据源而有条件延后，绝不采用低效 N+1 订阅。**

### 升级安全三条铁律

1. **只依赖官方模块表与 `dsh.client.inject` 公开面**：浏览器运行时共享模块清单正本为 `vendor/dsh/packages/client/web/src/platform.ts`（`PLATFORM_MODULES`：`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`zod`、`@tanstack/react-virtual`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-dockkit`）与插件 `package.json` 的 `dsh.client.inject` 服务清单。严禁跨插件值导入，只通过 `ctx.slots`、服务接口与 type-only import 协作。
2. **只做增量插槽注册，不覆盖宿主核心布局壳**：全部扩展严格落在 `list`、`keyed`、`extension` 优先级档位或标准 `single` 品牌槽上，不覆写 `sidebar`、`rightbar`、`sidebar.right.tab.guide`（chain）等宿主全局骨架，确保 DSH 未来升级时新增的面板、引导入口、快捷键与布局特性可自动继承。
3. **样式全部走 `--dsw-alias-*` 语义 token + scoped CSS Modules**：遵循 `vendor/dsh/docs/web-styling.zh.md`，清除所有幽灵变量、颜色字面量与针对 vendor 内部 DOM 结构的脆弱补丁。

### 已实证的 3 个关键构建与测试破局点

1. **CSS Modules 构建管线兼容（`tsdown` + `lightningcss`）**：
   - 上游 `vendor/dsh/packages/client/tsdown.client.ts`（L41–61、L579–620）在 client 构建中内建了 `dsh-css-modules-inline` 插件：使用 `lightningcss` 的 `transform({ filename, code, cssModules: { pattern: '[hash]_[local]' }, minify: true })` 生成作用域类名表，并生成 `<style data-plugin="dsh-deep-research-pack" data-plugin-css="...">` 注入逻辑。
   - 本仓 [packages/deep-research-pack/tsdown.config.ts](../../../../packages/deep-research-pack/tsdown.config.ts) 当前输入是 `tsc -b .` 编译后的 `lib/types/client/index.js`（不含 `.css` 拷贝）。只要将 `lightningcss` 作为仓内构建期 `devDependency`（零运行时依赖、不进入发布 tarball），在 `tsdown.config.ts` 中加入同款插件并将 `lib/types/client/.../*.module.css` 解析回对应的 `src/client/.../*.module.css`，同时补充 `src/client/css-modules.d.ts`（需登记到 [40-research-cockpit.md](../../../../docs/design/40-research-cockpit.md) 以通过 `cockpit-doc-registry` 门禁），即可产出完全符合 `window.__ModuleLoader__.load` 契约的 `lib/client.js`。
2. **`node --test` 无打包直接跑 `.tsx` 的 CSS Modules 兼容**：
   - 本仓 `pnpm test:spec` 通过 `node --import tsx/esm --test` 直接加载 `src/client/**/*.tsx`（见根 [package.json](../../../../package.json)），而 Node 原生不支持 import `.module.css`。
   - 根 `package.json` 的 `engines.node` 为 `^22.19.0 || >=24.0.0`，原生提供 `node:module` 的 `registerHooks`。在 `tests/cockpit/` 新增一个约 15 行的轻量 ESM 钩子（如 `css-module-hook.mjs`），在 `load` 钩子中把 `.module.css` 返回为恒等类名 `Proxy`（`export default new Proxy({}, { get: (_, k) => String(k) })`），并在 `test:spec` / `test:coverage` 脚本挂载 `--import`，即可零第三方测试依赖通过全部 keyless 单测。
3. **本仓 L0 门禁全闭环**：
   - `client-keys`（[b-pack.mjs](../../../../checks/verify/gates/b-pack.mjs)）：所有 slot 名、key、id、工具族字面量必须唯一住 [keys.ts](../../../../packages/deep-research-pack/src/client/keys.ts)；
   - `client-effect-wrap`：`src/client/index.ts` 中所有 `slots.inject` 与 `sidebarRightTabs.register` 必须包在 `scoped.effect(...)` 内；
   - `cockpit-doc-registry`：`src/client/` 与 `src/lib/` 下每个 `.ts`/`.tsx` 文件都必须在 [40-research-cockpit.md](../../../../docs/design/40-research-cockpit.md) 登记；
   - `src-lib-faces`：新增 `src/lib/` 文件必须在 [faces.json](../../../../packages/deep-research-pack/src/lib/faces.json) 声明 `host`/`shared`/`client` 归属；
   - 双语 day-one 守卫（`tests/cockpit/locales/` 与 `cjk-source`）：所有 UI 与折层文案必须同步更新 `zh`/`en` 字典；
   - `semantic-guardrails`（`tests/checks/`）：保持闭集判别联合、`readArtifact` 唯一读取入口、`AbortController` 生命周期回收与零静默 `catch`。

---

## 二、逐项可行性 Decision Table（12 项升级与加码点）

> 分级定义：**S1（原生零冲突）**= 完全走 DSH 公开 slot/原语/构建契约；**S2（有界条件适配）**= 依赖前置数据面或最小 fail-soft 守卫；**Veto（否决）**= 需入侵宿主 DOM/覆盖骨架，不采纳。

| # | 能力项 | 分级 | DSH 原生载体与源码正本 | 依赖数据 / 服务面 | 风险与缓解 |
|---|---|---|---|---|---|
| 1 | CSS Modules 管线 + `--dsw-alias-*` Token 清洗 + `client-tokens` 静态门禁 | **S1** | `vendor/dsh/packages/client/tsdown.client.ts`（L41–61, L579–604）；`vendor/dsh/packages/client/ui-theme/src/styles/design-platform.css`；`vendor/dsh/docs/web-styling.zh.md` | 构建期 `devDependency`: `lightningcss`；测试期 `node:module` `registerHooks` | 若上游升级改动 `--dsw-*` token 名，`client-tokens` 门禁在 `pnpm verify` 阶段立即红灯阻断，杜绝暗色模式静默回落 |
| 2 | `ui-primitives` 全面替换原生 HTML 控件 | **S1** | `vendor/dsh/packages/client/ui-primitives/src/index.ts`（`Button`, `Input`, `Menu`, `Modal`, `SegmentedControl`, `SegmentedTabs`, `Pill`, `Tag`, `StateDot`, `DisclosureRow`, `TextShimmer`, `Tooltip`, `HoverCard`, `PathLabel`, `SearchBlock`, `WebBlock`, `MarkdownDelegateProvider`） | 已在 [package.json](../../../../packages/deep-research-pack/package.json) `dsh.client.inject` 声明 `@deepseek-ai/dsh-client-ui-primitives` | 每个 `ui-primitives` 组件须在 `tests/cockpit/client/` 下的 JSDOM 测试验证标签/label 必填契约（zero-Cordis 要求完整传 `t()` 文案） |
| 3 | 首屏品牌 `conversation.hero.brand.mark` + 研究模板快捷起步 | **S1** | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts`（L266, L351, `HeroBrandMarkOwnerProps`）+ `inputActions.insertText`（`ui-conversation` 标准 props） | `OrcaMark`（`size: 34`，`priority: -1`）+ [StartCard.tsx](../../../../packages/deep-research-pack/src/client/StartCard.tsx) 标准 props `inputActions` | 不改 `EmptyHero` 文案 DOM，只通过官方品牌槽替换小鱼标志、通过起步卡快捷模板向 composer 插入问题骨架 |
| 4 | 终稿三视图（读者/审计/核查）+ 证据卡阅读器 + 右栏双格分屏溯源 | **S1** | `sidebarRightTabs.register`（`extension` 档）；`MarkdownDelegateProvider`（`vendor/dsh/packages/client/ui-primitives/src/markdown/MarkdownDelegate.tsx`）；`tab.actions.openResource(..., { preferNewPane: true })`（`ui-sidebar-right`） | [claims.json](../../../../packages/deep-research-pack/content/templates/run/claims.json)、[verdicts.json](../../../../packages/deep-research-pack/content/templates/run/verdicts.json)、[evidence-entry.md](../../../../packages/deep-research-pack/content/templates/run/evidence-entry.md) | 终稿内 `[来源: evidence/xx.md]` 为纯文本非 Markdown 链接；在 `src/lib/` 写纯函数 `citation-linkify.ts` 仅于渲染前在内存将非代码块引用转为指向 `evidence/xx.md` 的 Markdown 链接，不改磁盘文件 |
| 5 | 质量雷达（`Topic × Lens` 覆盖矩阵 + 信源质量分布条） | **S1** | 运行于现有 [ResearchStatusTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 内部，UI 用 `Tag` / `Tooltip` / `DisclosureRow` | [topics.md](../../../../packages/deep-research-pack/content/templates/run/topics.md) + `evidence/*.md` 8 字段 frontmatter，经 `remote.workspaceFiles` 读 | 若 `evidence/` 卡片较多，需对 frontmatter 读取做并发限流 + 基于目录名/version 的增量缓存，只读顶部 YAML 块（有界字节窗） |
| 6 | HITL1 契约卡 + HITL2 双格分屏审阅 + 续研草稿预填 | **S1** | `inputActions.insertText` + `sidebarRight.openResource(..., { preferNewPane: true })` | [protocol.json](../../../../packages/deep-research-pack/content/templates/run/protocol.json) + [final.md](../../../../packages/deep-research-pack/content/templates/run/final.md) 固定节（`最强反证` / `目前不能判断` / `下一版优先项`） | 严守 D18 只读红线：按钮只将续研草稿填入输入框并聚焦，绝不直接调用 `session/prompt` 代发研究指令 |
| 7 | 会话流合流 store + 顶栏「研究进度胶囊」 | **S1** | `conversation.session.header.actions`（范本：`vendor/dsh/packages/experimental/client-ui-agent-team/src/client/mount.ts` L53–62）；`HoverCard` / `StateDot` / `TextShimmer` | `remote.session.follow` + `remote.workspaceFiles`，抽共享 `session-stream-store.ts`（按 `sessionId` refcount 复用） | 顺手解决 [40-research-cockpit.md](../../../../docs/design/40-research-cockpit.md) §6 已记「活标题与页签体双开 WebSocket 流」债务；悬停卡片遵循 150ms 延迟约定 |
| 8 | 对话流阶段里程碑卡（`conversation.chat.turnTail`） | **S1** | `vendor/dsh/packages/client/ui-chat/src/client/contract/slots.ts`（L441）+ `ctx.uiConversation.events.register`（范本：`vendor/dsh/packages/client/ui-schedule/src/client/index.ts` L188–201） | 需在 `dsh.client.inject` 补充 `@deepseek-ai/dsh-client-ui-chat`（`ui-conversation` 已注入）；在 `src/client/index.ts` 注入 `uiConversation` | 只在含立项定稿/审查结论/交付见证的回合尾部渲染摘要，其余普通回合返回 `null`，避免对话流膨胀 |
| 9 | 全套研究语义工具卡升级（`tool.call.toolview`） | **S1** | `vendor/dsh/packages/client/ui-tool/src/client/contract/slots.ts`（L26–30），复用 `DisclosureRow`、`StateDot`、`TextShimmer`、`SearchBlock`、`WebBlock` | [keys.ts](../../../../packages/deep-research-pack/src/client/keys.ts) `RESEARCH_TOOL_KEYS` 扩充 `web_fetch`、`subagent` | 注册保留 `priority: -1` 与各自独立的 `scoped.effect` 包裹；参数流式未完成时稳妥回落到加载态 |
| 10 | 左侧全局「研究工作台（Research Hub）」+ 删除主 Composer DOM Hack | **S1** | `sidebar.panellist` + `main` keyed（范本：`vendor/dsh/packages/client/ui-schedule/src/client/index.ts` L168–184；`ui-layout/src/client/index.ts` L70–74） | 核实 `dsh.client.inject` 声明 `@deepseek-ai/dsh-client-ui-layout` 与 `@deepseek-ai/dsh-client-ui-sidebar`；内部用 `SegmentedTabs` 分「研究档案 / 方法库 / 视角库」 | 把方法库迁入全局 `main` 面板后，可解决空白会话无法进方法库的限制，并**直接移除** [styles.ts](../../../../packages/deep-research-pack/src/client/styles.ts) 中隐藏外层主 composer 的脆弱 CSS 补丁 |
| 11 | 页签菜单项与原生刷新命令绑定 | **S1** | `sidebar.right.tab.menu.item`（`ui-sidebar-right`）+ `tab.actions.bindCommands({ refresh })` | 现有 `useTabInfo()` 与各页签的 `retry` / `reloadManually` 回调 | 菜单项触发后必须按契约调用 `dismiss()`；卸载时释放 `bindCommands` disposer |
| 12 | 左栏会话列表行首研究状态点（`sidebar.session.row.leading` / `.hover`） | **S2（本轮延后）** | `vendor/dsh/packages/client/ui-workspace/src/client/contract/slots.ts`（L35–39, L122–136）；`ui-schedule`（L23–28） | 必须有 Host 侧单源聚合投影（1 次查询覆盖所有会话） | 该槽位为 `root` 作用域，文档明确禁止 per-row 订阅/激活会话；本仓目前无工作区级汇总 RPC，本轮不硬上，留待 Host 聚合数据源落地 |

---

## 三、明确否决与不魔改红线

以下方案在评估中被明确**否决**，不得在实施阶段复燃：

1. **Veto · 用 `sidebar.right.tab.guide`（chain）整页接管右栏引导页**：整页替换会吞掉 DSH 未来为引导页添加的新工具入口、Pin 控制与快捷键能力；只保留标准 `guide` 入口元数据声明。
2. **Veto · 写 CSS/DOM 补丁改写 `EmptyHero` 的标题 `Into the Unknown` 或原生输入提示**：`ui-conversation` 未为这两者声明公开 slot，靠选择器覆写会在 DSH 类名或结构变更时瞬间崩溃。
3. **Veto · 在 `sidebar.session.row.leading` 按行调用 `remote.session.follow`**：会引发 N+1 WebSocket 连接并强制激活未打开的会话，直接违背 `ui-workspace` 契约。
4. **Veto · 为 `rerun` 或质量缺口增加一键自动发给 Lead 的执行按钮**：违背 D18 只读观察面定位，改为经 `inputActions.insertText` 预填草稿交用户审核。
5. **脆弱 CSS 补丁处置**：[styles.ts](../../../../packages/deep-research-pack/src/client/styles.ts) 中 `installQuestionCardNarrowFix` 保持最小 fail-soft 并保留移除条件；待全局「研究工作台」上线后，评估移除 `installCoachComposerStyles` 中的外层 composer 隐藏规则。

---

## 四、M1–M7 渐进实施路线（与 Goal 实施卡 1:1 对齐）

1. **M1 · 构建管线与 Design System 底座**：`tsdown.config.ts` 接入 `lightningcss` CSS Modules + `tests/cockpit/css-module-hook.mjs` + 清理全部幽灵 `--dsh-*`/`--dsw-alias-label-error`/亮色 hex + 新增 `client-tokens` L0 门禁。
2. **M2 · `ui-primitives` 统一与基础交互升级**：`conversation.hero.brand.mark` + `StartCard` 快捷研究模板 + `DefaultsPanel`/`DefaultsButton` 原生控件化 + `ResearchToolCard`/`MethodLibraryToolCard` 升级。
3. **M3 · 状态页与图谱页重构 + 质量雷达 + HITL1 契约卡**：`protocol-fold` + `evidence-matrix` + 重构 `ResearchStatusTab`/`TrackRail` 与 `ResearchGraphTab`/`DagMap`。
4. **M4 · 终稿 Claim 核查 + 证据卡阅读器 + 分屏溯源 + 续研预填**：`claims-verdicts` + `evidence-card` + `citation-linkify` + `ResearchEvidenceTab` + `ResearchFinalTab` 三视图与 `MarkdownDelegateProvider` 分屏。
5. **M5 · 共享会话流 + 顶栏进度胶囊 + 对话流里程碑**：`session-stream-store` + `ResearchHeaderPill`（`conversation.session.header.actions`）+ `ResearchMilestoneCard`（`conversation.chat.turnTail`）。
6. **M6 · 左侧全局「研究工作台（Research Hub）」**：`sidebar.panellist` + `main` 三页工作台（研究档案 / 方法库 / 视角库与默认）+ 清理遗留 DOM hack。
7. **M7 · 真浏览器双主题实证、文档同步与闭环归档**：`client-load.entry` / `preset.e2e` / `run-driver` 双主题截图验收 + 更新 `docs/design/40-research-cockpit.md` 与包 README + `notes/implemented/` Note 落盘 + issue 卡归档。

---

## 五、什么会改变结论（重议触发条件）

- **DSH 新增 `conversation.hero.headline` / `composer.placeholder` 公开槽位**：可将首屏标题与引导提示升级为完全研究语义化，无需任何 DOM hack。
- **DSH `ui-user-questions` 修复窄列卡头换行**：直接删除 `styles.ts` 中的 `installQuestionCardNarrowFix`。
- **pack 新增 Host 侧「工作区研究会话汇总」轻量投影/command**：解锁第 12 项 `sidebar.session.row.leading` 与 `.hover`，以单源查询实现左栏全会话研究状态点。
- **DSH 升级改变 `--dsw-alias-*` token**：`client-tokens` 门禁在 `bumping-vendor-pin` 换 tag 时自动红灯告警，按差量映射更新即可。
