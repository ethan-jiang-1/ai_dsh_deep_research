---
status: 已结
opened: 2026-11-26
---

# 推敲：基于 DSH 原生能力全面升级研究驾驶舱 UX/UI（Goal-Driven 实施卡）

> 立卡：2026-11-26 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [2026-11-26-cockpit-ux-ui-native-upgrade](../../../notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md)（业务/视觉最终拍板后归档）
> 调研依据：[cockpit-ux-ui 调研题](../research/cockpit-ux-ui/README.md)（[现状审计](../research/cockpit-ux-ui/2026-11-26-cockpit-ux-ui-audit.md) · [DSH 原生可行性与设计](../research/cockpit-ux-ui/2026-11-26-dsh-native-feasibility-and-design.md)）

**问题与期望结果：** 研究驾驶舱（Research Cockpit）在数据折算层（`src/lib/`）和工程测试门禁上已很成熟，但呈现层仍停留在早期“内联样式调试台”形态：存在大量幽灵 CSS 变量与硬编码亮色 hex（暗色模式崩坏、错误态失效）、未接入 CSS Modules 与 `ui-primitives` 原子控件、重要研究数据（`protocol.json`、`claims.json`、`verdicts.json`、`topics.md` × `evidence/*.md` 8 字段）未端上界面、终稿不支持点击 `[来源: evidence/xx.md]` 分屏核查，且「方法库」受限于 `conversation.view` 在空白会话不可见。本卡旨在**严格利用 DSH 原生能力（零魔改内核）**完成 M1–M7 全链路 UX/UI 升级，使 DSH 未来升级时可自然继承上游演进。

**当前情况：** 调研题 `cockpit-ux-ui` 已完成代码级审计与 DSH `dsh-v0.2.1-rc.5` 能力盘点并定性：12 项升级点中 11 项确认走 DSH 原生公开槽位/原语/构建契约（S1）可落，1 项（左栏行首状态标）按无 N+1 订阅原则明确延后至 Host 聚合源，4 项高风险覆写明确否决；CSS Modules 构建与 `node --test` 运行期兼容路径已探明。

**未决问题：** 无设计阻塞。各里程碑仅需在实施时顺手核对新增 `dsh.client.inject` 条目（如 `@deepseek-ai/dsh-client-ui-chat`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-sidebar`）与既有 `client-load.entry.mjs` 冒烟选择器的兼容性。

**下一步：** 可直接作为 `/goal` 的输入目标，按 **M1 → M2 → M3 → M4 → M5 → M6 → M7** 顺序自主推进并逐段通过机械门禁与真浏览器实证。

---

## 全局不变量与禁区（Goal 执行不可违背的红线）

1. **只读基线铁律**：严禁修改 `vendor/dsh/` 任何文件（`vendor-clean` / `vendor-pin`）。
2. **严禁魔改宿主**：不覆盖 `sidebar` / `rightbar` / `sidebar.right.tab.guide`（chain），不写针对 `EmptyHero` 或通用 composer 内部 DOM 的脆性 CSS/DOM 补丁，不在 `sidebar.session.row.leading` 按行开 `remote.session.follow`。
3. **守住 D18 只读边界**：观测/终稿/核查视图不提供一键发送或自动 `rerun` 动作；「下一版优先项 / 三种改法」只能经 `inputActions.insertText` 向输入框预填草稿，由用户审阅提交。
4. **守住五态诚实降级与强判别联合**：新增结构化数据读取（`protocol.json` / `claims.json` / `verdicts.json` / `topics.md` / `evidence/*.md`）一律走 `readArtifact(..., { decoder })` 与 `ArtifactState`（`ok / absent / unreadable / empty / invalid`），禁止把读取失败折叠为空态或静默 `catch`。
5. **day-one 双语与单正本纪律**：所有用户可见字符串同步录入 `src/client/locales/{zh,en}.ts` 或 `{zh,en}-fold.ts`；所有槽名/key/id/wire 工具名唯一住 [keys.ts](../../../packages/deep-research-pack/src/client/keys.ts)；所有注册包进 `scoped.effect`；所有 `src/client/` 与 `src/lib/` 文件同步登记到 [40-research-cockpit.md](../../../docs/design/40-research-cockpit.md) 与 [faces.json](../../../packages/deep-research-pack/src/lib/faces.json)。
6. **冒烟选择器向后兼容**：保留既有 `data-testid`（如 `deep-research-start`、`deep-research-choose-workspace`、`deep-research-defaults`、`defaults-panel` 等）与 `data-research-face` 机器标记；若交互结构改变需同步更新 `checks/smoke/client-load.entry.mjs` 及对应测试。

---

## 已知与未决

- **已决**：CSS Modules 采用 `lightningcss`（devDependency）+ `tsdown.config.ts` 内联注入；`node --test` 采用 `tests/cockpit/css-module-hook.mjs`（Node `module.registerHooks`）；引用溯源在内存用 `citation-linkify.ts` 预转，不改写磁盘 `final*.md`。
- **实施期顺手核对**：增加 `dsh.client.inject` 包名时同步更新 [packages/deep-research-pack/package.json](../../../packages/deep-research-pack/package.json)（并确保只列浏览器模块表能提供的包，不破坏 `client-half` / `client-bundle-purity`）。

---

## 方案与取舍（M1–M7 Goal-Driven 执行路线）

### M1 · 样式管线 + Token 清洗 + `client-tokens` 静态门禁

- **目标**：建立插件级 CSS Modules 编译与测试加载链，彻底消除幽灵 `--dsh-*` / `--dsw-alias-label-error` 与裸亮色 hex，实现明/暗主题自适应与静态门禁兜底。
- **涉及文件与改造**：
  1. 根/包 `devDependencies` 引入 `lightningcss`；改造 [tsdown.config.ts](../../../packages/deep-research-pack/tsdown.config.ts) 接入 `dsh-css-modules-inline`（映射 `lib/types/client/.../*.module.css` → `src/client/.../*.module.css`，注入 `<style data-plugin="dsh-deep-research-pack" data-plugin-css="...">`）；
  2. 新增 `packages/deep-research-pack/src/client/css-modules.d.ts`；
  3. 新增 `tests/cockpit/css-module-hook.mjs`（基于 `node:module` `registerHooks` 拦截 `*.module.css` 返回恒等类名 `Proxy`），并在根 [package.json](../../../package.json) 的 `test:spec` / `test:coverage` 挂载 `--import ./tests/cockpit/css-module-hook.mjs`；
  4. 将 `StartCard.tsx`、`DefaultsButton.tsx`、`DefaultsPanel.tsx`、`ResearchStatusTab.tsx`、`TrackRail.tsx`、`ResearchGraphTab.tsx`、`NodeCard.tsx`、`GraphNotices.tsx`、`GraphVersionRail.tsx`、`ResearchConfigTab.tsx`、`ResearchFinalTab.tsx`、`ResearchToolCard.tsx`、`MethodLibraryToolCard.tsx`、`MethodLibraryView.tsx`、`views.tsx`、`coach.tsx` 等全部幽灵变量与硬编码 hex 迁入 `*.module.css` 并改用 `ui-theme` 真实 `--dsw-alias-*`（如 `--dsw-alias-state-error-primary`、`--dsw-alias-state-warn-*`、`--dsw-alias-state-success-*`、`--dsw-alias-border-l2`）与 `0.5px` 边框；
  5. 在 `checks/verify/gates/b-pack.mjs`（或 `b-pack-lint.mjs`）新增 `client-tokens` 门禁（提取 `vendor/dsh/packages/client/ui-theme/src/styles/` 全量 `--dsw-*` 白名单，校验 `src/client/**/*.{ts,tsx,css}` 零幽灵 `--dsh-*`、零未知 `--dsw-*`、零未豁免颜色字面量），按 `.agents/skills/writing-a-gate/SKILL.md` 先造反证红灯再过绿，并登记进 [docs/evaluation.md](../../../docs/evaluation.md) §L0 与 `tests/checks/`。
- **局部验收**：`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿。

### M2 · `ui-primitives` 全面统一 + 首屏与基础控件升级

- **目标**：消除原生 HTML 简陋控件与调试感，统一为 DSH 原生 `ui-primitives` 质感。
- **涉及文件与改造**：
  1. 在 [keys.ts](../../../packages/deep-research-pack/src/client/keys.ts) 声明 `conversation.hero.brand.mark` 常量，在 [index.ts](../../../packages/deep-research-pack/src/client/index.ts) 用 `scoped.effect` 注册 `OrcaMark`（`size: 34`，`priority: -1`）；
  2. 重做 [StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)：用 `Button` / `Tag` 与 CSS Modules 重排为清晰紧凑的研究起步卡，提供 3–4 个研究题型快捷模板按钮，点击调用标准 props `inputActions.insertText(...)` 向输入框填入问题骨架（不自动发送）；
  3. 升级 [DefaultsButton.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx) 与 [DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)：将原生 `<select>` / `<input>` / inline chip 替换为 `Menu` / `MenuItemButton` / `Pill` / `Input` / `Tooltip`；
  4. 升级 [ResearchToolCard.tsx](../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) 与 [MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)：使用 `DisclosureRow` + `StateDot` + `TextShimmer`（可选内嵌 `SearchBlock` / `WebBlock` 摘要），并将 `RESEARCH_TOOL_KEYS` 扩充至 `['spawn_teammate', 'web_search', 'web_fetch', 'subagent']`（同步更新 `src/lib/events/tool-card.ts` 折算与单测）。
- **局部验收**：`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿；补齐工具卡新工具类型与 `StartCard` 模板插入单测。

### M3 · 右栏「研究状态」&「研究图谱」重构 + 质量雷达 + HITL1 契约卡

- **目标**：解决右栏堆叠冗余与信息主次失焦问题，将 `protocol.json` 与 `topics.md × evidence/*.md` 质量面端上界面。
- **涉及文件与改造**：
  1. 新增 `src/lib/run/protocol-fold.ts`（解码 `protocol.json` → HITL1 结构化研究契约数据，严格 `ArtifactState` + `readArtifact(..., { decoder })`）与 `src/lib/run/evidence-matrix.ts`（解析 `topics.md` 的 `lenses` 与 `evidence/*.md` 8 字段 frontmatter → `Topic × Lens` 覆盖矩阵 + `source_tier` / `quality A–D` / 独立域名统计，带单次有界读取与缓存）；在 [faces.json](../../../packages/deep-research-pack/src/lib/faces.json) 与 [40-research-cockpit.md](../../../docs/design/40-research-cockpit.md) 登记；
  2. 重构 [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 与 [TrackRail.tsx](../../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx)：去掉五问摘要与问题行重复；将 9 列横向轨道改为自适应窄栏的步进轨（`StateDot` `appearance="step"`）；HITL1 挂起时置顶展示 `protocol` 契约卡；中段展示质量雷达（覆盖矩阵 + 信源分布条）；活动流与队员动态用 `DisclosureRow` + `TextShimmer` 收纳；
  3. 重构 [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) 与 [DagMap.tsx](../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)：合并顶部多余横幅、`DagMap` 全面切换 CSS 变量 + 选中节点上下游边高亮 + 消除“图 + 下方全量卡片”的双倍占位冗余（未选中仅展简行/统计，选中定位详情）。
- **局部验收**：新增 `tests/cockpit/lib/run/protocol-fold.spec.mjs`、`evidence-matrix.spec.mjs` 与组件行为测试；`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿。

### M4 · 终稿「Claim 核查视图 + 证据卡阅读器 + 双格分屏溯源 + 续研预填」

- **目标**：打造“每条结论都可点开核对原文”的深度研究杀手级阅读体验。
- **涉及文件与改造**：
  1. 新增 `src/lib/run/claims-verdicts.ts`（联合解码 `claims.json` + `verdicts.json` → Claim 核查视图模型，精确区分缺席/不合法/未核查 `UNVERIFIED`）、`src/lib/run/evidence-card.ts`（解析单张 `evidence/*.md` 8 字段 frontmatter + 摘录/解读/Question List + `isEvidenceAddress` / `evidenceAddressOf` 地址认领谓词）、`src/lib/run/citation-linkify.ts`（非代码块内 `[来源: evidence/xx.md]` 内存转链接）；全部登记 `faces.json` 与 `40-research-cockpit.md`；
  2. 新增 `src/client/ResearchEvidenceTab.tsx`：经 `sidebarRightTabs.register`（`extension` 档，`*.md` + `canOpen: isEvidenceAddress`）认领 `drt_<slug>/evidence/*.md`，顶部展示 `Quality` / `source_tier` / `publisher` / `lens` / `retrieved_at` / 可点原文外链，正文渲染摘录、解读与 Question List 勾选态；
  3. 升级 [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)：用 `SegmentedControl` 提供三视图（`读者版 / 审计版 / 核查清单`）；接入 `MarkdownDelegateProvider`（拦截 `evidence/*.md` 调用 `tab.tab.actions.openResource(..., { preferNewPane: true })` 实现右栏左报告右证据分屏）；新增轻量可折叠章节目录（TOC）；HITL2 态提供「分屏审阅」入口；交付后「下一版优先项 / 三种改法」按钮经 `inputActions.insertText` 预填草稿；绑定 `tab.actions.bindCommands({ refresh })`。
- **局部验收**：新增 `claims-verdicts.spec.mjs`、`evidence-card.spec.mjs`、`citation-linkify.spec.mjs` 及组件测试；`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿。

### M5 · 共享会话流合流 + 顶栏进度胶囊 + 对话流里程碑卡

- **目标**：消除状态/标题多条重复 WebSocket 流，让用户在收起右栏时也能在主区和顶栏看清研究全貌。
- **涉及文件与改造**：
  1. 新增 `src/client/session-stream-store.ts`（按 `sessionId` refcount 复用单条 `remote.session.follow` 流，供 `ResearchStatusTab`、`ResearchStatusTitle`、`ResearchHeaderPill` 共享）；
  2. 新增 `src/client/ResearchHeaderPill.tsx`，注册至 `conversation.session.header.actions`（`StateDot` + `TextShimmer` + 当前阶段/HITL/证据数，悬停 `HoverCard` 展示五问摘要，点击打开右栏对应页签）；
  3. 新增 `src/client/ResearchMilestoneCard.tsx`（经 `ctx.uiConversation.events.register` 折叠关键节点事件，注册至 `conversation.chat.turnTail`，只在立项定稿/审查出结论/交付完成轮尾渲染结构化卡片；在 `package.json` `dsh.client.inject` 按需补充 `@deepseek-ai/dsh-client-ui-chat`）。
- **局部验收**：补齐 `session-stream-store`、胶囊与 Turn-Tail 折叠单测；`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿。

### M6 · 左侧全局「研究工作台（Research Hub）」+ 清理遗留 DOM Hack

- **目标**：提供全局工作区级研究管理入口，解决空白会话进不了方法库的限制并清除脆弱 DOM 补丁。
- **涉及文件与改造**：
  1. 在 [keys.ts](../../../packages/deep-research-pack/src/client/keys.ts) 与 [index.ts](../../../packages/deep-research-pack/src/client/index.ts) 注册 `sidebar.panellist` 图标与 `main` keyed 面板 `ResearchHubPanel.tsx`（按需在 `package.json` `dsh.client.inject` 补充 `@deepseek-ai/dsh-client-ui-layout` / `@deepseek-ai/dsh-client-ui-sidebar`）；
  2. 面板内用 `SegmentedTabs` 分为三页：**研究档案（Runs）**（聚合当前工作区 `drt_*` / `archive/` / `_abandoned/` 状态、版本、证据数与快捷跳转）、**方法库（Methods）**（复接 `MethodLibraryView` 工作台）、**视角库（Lenses）与项目默认**（可视化展示 `content/lenses/*.md` 8 条内置视角）；
  3. 评估并移除 [styles.ts](../../../packages/deep-research-pack/src/client/styles.ts) 中不再必要的 `installCoachComposerStyles` 外层主 composer 隐藏规则（如保留 `conversation.view` 快捷入口则保留最小规则；如迁入全局 `main` 则彻底删除）。
- **局部验收**：`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿。

### M7 · 真浏览器实证 + 文档同步 + Note 落盘 + 归档

- **目标**：完成端到端真实运行时验收与仓库文档收口。
- **步骤与验证**：
  1. 跑 `source tools/env.sh && node checks/smoke/client-load.entry.mjs` 与 `node checks/smoke/preset.e2e.mjs` 全绿（含新增页面/分屏/工作台断言）；
  2. 运行 `node tools/channel/run-driver.mjs up`，在明/暗双主题、1280px / 1440px / 768px 视口下实机截图核查全套界面；
  3. 更新 [40-research-cockpit.md](../../../docs/design/40-research-cockpit.md)、[packages/deep-research-pack/README.md](../../../packages/deep-research-pack/README.md) / [README.zh.md](../../../packages/deep-research-pack/README.zh.md)，并重跑 `node tools/record/render-overlay.mjs` 刷新 overlay（保证 `overlay-fresh` / `cockpit-doc-registry` 全绿）；
  4. 交付同 diff 写入 `notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md`，经用户确认验收后将本卡翻为 `已结`、`可关闭：是` 并 `git mv` 归档至 `_backlog/_archived/settled_issues/`。

---

## 判据形状

- **权威事实**：
  1. Token 门禁 `client-tokens` 的合法白名单 = `vendor/dsh/packages/client/ui-theme/src/styles/` 中声明的全部 `--dsw-*` 自定义属性；
  2. 结构化研究展示层事实 = `protocol.json`、`claims.json`、`verdicts.json`、`topics.md`、`evidence/*.md`（全部经 `readArtifact` 读盘并按各自 schema 解码为强判别联合 `ArtifactState`）。
- **读取方**：`checks/verify/gates/` 静态门禁（L0）与驾驶舱 `src/client/` 各 React 组件（运行期）。
- **坏输入**：
  - `src/client/` 出现 `--dsh-*` 幽灵变量、未在 `ui-theme` 声明的 `--dsw-*` 变量、或未显式豁免的硬编码颜色字面量 → `client-tokens` 门禁红灯；
  - `protocol.json` / `claims.json` / `verdicts.json` / `evidence/*.md` 缺失 → `absent`（如实不虚构）；0 字节 → `empty`；读异常 → `unreadable` + 重试；JSON/frontmatter 畸形 → `invalid` + 显式错误提示，绝不回落为「0 份」或「全部通过」。
- **旧形态**：`src/client/*.tsx` 内联样式硬编码 hex 与幽灵 `--dsh-*` / `--dsw-alias-label-error` 变量（M1 后清零删除）；`installCoachComposerStyles` 外层 composer 隐藏 hack（M6 方法库迁入全局 `main` 后删除）。
- **反证**：
  - `client-tokens` 门禁：在 `tests/checks/` 构造注入 `--dsh-border` / `--dsw-alias-label-error` / `#ffffff` 的变异样本并证明门禁必红；
  - 折算层：`tests/cockpit/lib/run/{protocol-fold,evidence-matrix,claims-verdicts,evidence-card,citation-linkify}.spec.mjs` 逐一覆盖 `ok / absent / unreadable / empty / invalid` 变异输入矩阵。

---

## 验收标准

1. **L0 机械与构建门禁全绿**（每个里程碑结束必跑）：`pnpm build && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 退出码均为 `0`，零跳过断言。
2. **新增门禁与纯折算覆盖**：`client-tokens` 门禁合入 `docs/evaluation.md` §L0 并通过 `tests/checks/` 先红后绿反证；所有新增 `src/lib/` 折算件与组件行为有完整 `node:test` 回归。
3. **L1 / L2 真浏览器挂载与运行态全绿**：`source tools/env.sh && node checks/smoke/client-load.entry.mjs` 与 `node checks/smoke/preset.e2e.mjs` 全绿，且验证明/暗双主题均无幽灵变量回落白块、无报错横幅误触发、终稿点击引用可触发右栏双格分屏打开对应证据卡、全局「研究工作台」在空白会话可打开并管理方法库/查看 runs 与 lenses。
4. **真机交互视觉验收**：`node tools/channel/run-driver.mjs up` 启动实机在明/暗主题与 1280px / 1440px / 768px 视口下无裁剪/重叠/对比度断裂。

---

## 关闭条件

- 上述 **M1–M7** 全部实施与验收通过；
- `docs/design/40-research-cockpit.md`、包 README 与 `tools/record/research.overlay.yml` 同步完毕；
- `notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md` 在交付同变更落盘；
- 用户确认业务与视觉验收通过后，状态翻为 `已结`、`可关闭：是` 并同变更 `git mv` 归档至 `_backlog/_archived/settled_issues/`。

---

## 给 `/goal` 执行者的防坑备忘

1. 任何 `.module.css` 引入必须先确认 M1 的 `tsdown.config.ts` 与 `tests/cockpit/css-module-hook.mjs` 已就位，否则 `pnpm build` 和 `pnpm test` 会报错。
2. 每次在 `src/client/` 或 `src/lib/` 新增 `.ts`/`.tsx` 文件，必须同轮更新 `docs/design/40-research-cockpit.md` 与 `src/lib/faces.json`，否则 `pnpm verify` 的 `cockpit-doc-registry` 与 `src-lib-faces` 会拦截。
3. 所有新增 UI 文案和折层文本必须同步写进 `locales/zh*.ts` 与 `locales/en*.ts`，不要在 TSX 里残留未走字典的中文字符串（`cjk-source` 守卫）。
4. 在 `src/client/index.ts` 里新增 `slots.inject` 或 `sidebarRightTabs.register` 时，必须包进 `scoped.effect(...)`，key 常量必须集中放 `src/client/keys.ts`（`client-effect-wrap` + `client-keys`）。
5. 编写/更新 Markdown 文档时，`vendor/dsh/...` 路径一律用反引号（不要用 Markdown 链接），仓内相对链接不要带 `#L` 行号锚点（`md-links` + `md-anchors`）。

---

## M1–M7 落地与验收记录（2026-11-26 已验收归档）

- **代码与门禁全链路就绪**：已完成 M1–M7（CSS Modules + `--dsw-*` + `b-pack-tokens`、`session-stream-store` + `ResearchHeaderPill` + `ResearchMilestoneCard`、`TrackRail` `StateDot` + `ProtocolCard` + `QualityRadar`、`ResearchFinalTab` 三态切换 + `FinalToc` + `ClaimsAuditView` + `ResearchEvidenceTab` 分屏溯源、`DagMap` 缩放平移 + `cockpit-locale`、`ResearchHubPanel` Runs/Methods/Lenses、设计文档/README/Overlay/Note/账本同步），`vendor/dsh/` 零修改。
- **毕业记录**：[2026-11-26-cockpit-ux-ui-native-upgrade](../../../notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md)。
- **验收归档**：2026-11-26 用户确认按推荐方案验收并归档，与 implemented Note 及全部 M1–M7 改动同变更提交。
