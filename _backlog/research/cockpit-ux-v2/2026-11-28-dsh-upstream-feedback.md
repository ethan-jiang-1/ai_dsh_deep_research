---
topic: dsh-upstream-feedback
intent: 沉淀 R0–R2 零修改 vendor/dsh 实践中遇到的真实平台缺口（U1–U7）、当前可逆降级边界与可复用的上游扩展点提案
---

# DSH 平台上游反馈账本（Upstream Feedback Ledger）

> 日期：2026-11-28 ｜ 基线：`vendor/dsh` `dsh-v0.2.1-rc.5` @ `b830ec950f` ｜ 归属调研：[cockpit-ux-v2](./README.md)
> 原则：二期 UX/UI 与示范工程全程坚守「零修改 `vendor/dsh/`、零 DOM hack」红线；撞到平台能力边界时一律采用可逆的官方降解方案，并将真实缺口与可复用上游提案集中沉淀于本账本，供后续向上游反哺或换 pin 验收对账。

| # | 现象与摩擦场景 | 复现锚点 / 代码落点 | 当前边界与本仓降级做法 | 建议上游扩展点 / 改进方向 |
|---|---|---|---|---|
| **U1** | `ask_user_question` 交互卡在窄列（如 768px 视口或半宽分屏）下卡头长文案横向溢出 | `packages/deep-research-pack/src/client/index.ts`（针对 `[data-question-key]` 的局部换行兜底） | 本仓保留最小作用域换行兜底，不覆写宿主外层布局 | 建议上游问卡标题容器默认 `min-width: 0; overflow-wrap: anywhere`，出厂即适配窄列 |
| **U2** | 快速切换会话时，右栏已有打开的自定义页签偶发滞留上一会话数据帧或未自动重挂载 | `packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`（显式 `reset-session` reducer）与 `docs/contracts/client-ui.md` §6 | 本仓在每个数据 hook 内监听 `sessionId` 变化原子重置状态并中止旧 `AbortController` | 建议上游 `sidebar.right.tab` 生命周期增加 `sessionScope: 'reset' | 'keep'` 选项或向 tab 回调推送 `onSessionChange` 钩子 |
| **U3** | `@deepseek-ai/dsh-experimental-tool-agent-team` 缺少 per-preset 细粒度开关，启用团队层后与 profile 整体绑定 | `packages/deep-research-pack/cordis.patch.yml`、`packages/deep-research-pack/presets/*.patch.yml` | 本仓通过角色提示词、窄工具白名单与 `isolate` 非角色 worker profile 控制工具暴露面 | 建议上游允许在 `agent-preset` 工具策略层声明对 experimental 团队工具的按角色放行/屏蔽，避免角色间误触 |
| **U4** | `MarkdownDelegate` 未提供自定义链接悬停预览或 link-renderer 扩展槽，行内 `[来源: evidence/xx.md]` 悬停卡需在渲染容器外包事件委托层 | `packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx` + `packages/deep-research-pack/src/lib/run/citation-linkify.ts` | 本仓在终稿容器外包裹共享 `HoverCardGroup` 与指针/焦点委托捕获 `a[href^="research-evidence:"]`，不侵入 Markdown 内部 DOM | 建议上游 `MarkdownDelegate` 暴露 `onLinkHover` / `renderLink` 或自定义 scheme interceptor 钩子，便于插件以一等公民实现文档内悬停卡片 |
| **U5** | `@deepseek-ai/dsh-client-ui-primitives` 中部分原语（如 `SegmentedControl`、`DisclosureRow`、`Pill`）未统一透传 `data-testid` / `aria-*` 属性到交互根节点 | `packages/deep-research-pack/src/client/research-final/FinalToolbar.tsx`、`ClaimsAuditView.tsx`、`checks/smoke/client-load-final.support.mjs` | 本仓对需要稳定自动化定位的原语在业务外层加语义容器或按 WAI-ARIA `role="tab"` / `role="button"` 定位 | 建议上游对全部交互型 `ui-primitives` 统一透传 `data-*` 与 `aria-*` 属性并写入原语契约测试 |
| **U6** | 缺少官方「无底部 Composer 主视图（composerless main view）」声明协议，嵌入式专职 Agent 交互（如 Method Editor）无法作为纯净主 tab 挂载 | `packages/deep-research-pack/src/client/ResearchHubPanel.tsx`、`MethodLibraryView.tsx`（R0 退役原 `:has(...)` 隐藏补丁，收口至全局 Hub + `shell.overlay` Portal） | 本仓彻底拔除 `:has(...)` 全局 CSS hack，统一改走 `sidebar.panellist` + `main` 全局面板与 `shell.overlay` 悬浮窗 | 建议上游 `conversation.view` 注册项支持 `composer: 'hidden' | 'default'` 声明式属性，让非对话主视图合法隐藏外层输入框 |
| **U7** | `ui-input-trigger` 的 `@` 弹出选择后 token 消费范围与自定义格式化缺少显式光标回调，且 `dsh-client-shortcuts` Web 安全键位保留表需人工试探避让浏览器默认组合键 | `packages/deep-research-pack/src/client/research-triggers.tsx`、`packages/deep-research-pack/src/client/research-shortcuts.ts`、`tests/cockpit/client/research-commands-shortcuts.spec.mjs` | 本仓实测复用 `normalizeBinding` / `bindingIssue` / `isWebBindingAllowed` 锁死 `Primary+Shift+{U,G,D}` 并以 keyless 单测回归防冲突 | 建议上游导出官方 Web 保留快捷键清单及 `ui-input-trigger` `formatToken` / 选后焦点控制 API，降低插件作者踩坑成本 |

## 后续跟进节奏

- 每次执行 `bumping-vendor-pin` 升级 DSH 子模块基线时，逐条复核 **U1–U7**：上游已修复/提供原生 Seam 的条目优先切换并删除本仓对应降级层，同步更新本表状态。
