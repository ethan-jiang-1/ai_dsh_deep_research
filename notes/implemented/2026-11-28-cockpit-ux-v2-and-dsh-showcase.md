# 研究驾驶舱二期 UX/UI 深水区重塑与 DSH 标杆示范工程（R0–R4）

> 状态：implemented
>
> 前序基线：[2026-11-26-cockpit-ux-ui-native-upgrade](./2026-11-26-cockpit-ux-ui-native-upgrade.md)（第一轮 M1–M7 工程底座；本篇在零改 `vendor/dsh/` 前提下收口反范式补丁并补齐五大标志性体验瞬间与示范体系）
> 需求来源：[2026-11-28-cockpit-ux-v2-and-dsh-showcase](../../_backlog/_archived/settled_issues/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md)（调研：[cockpit-ux-v2](../../_backlog/_archived/research/cockpit-ux-v2/README.md) · 上游反馈账本：[dsh-upstream-feedback](../../_backlog/_archived/research/cockpit-ux-v2/2026-11-28-dsh-upstream-feedback.md) · 原型：[prototype-north-star.html](../../_backlog/_archived/research/cockpit-ux-v2/prototype-north-star.html)）
> 现行合同：[docs/contracts/client-ui.md](../../docs/contracts/client-ui.md) · [docs/guides/dsh-showcase.md](../../docs/guides/dsh-showcase.md)

## 决定

在严格守住 `vendor/dsh/` 只读红线（`dsh-v0.2.1-rc.5` @ `b830ec950f`）、零宿主 DOM/CSS hack、[D17](../../docs/decisions.md#d17) 与 [D18](../../docs/decisions.md#d18) 只读观察边界的前提下，按 **R0 → R1 → R2 → R3 → R4** 五轮完成研究驾驶舱二期 UX/UI 升级与 DSH「Everything is a Plugin」标杆示范工程：

1. **R0 · 清债与反范式清零**：退役 `conversation.view` 重复「方法库」tab，彻底删除 `styles.ts` 中的 `installCoachComposerStyles` 全局 `:has(...)` 输入框隐藏补丁，方法库统一归口左侧全局 [ResearchHubPanel.tsx](../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) + `shell.overlay` Portal；清除 `ResearchConfigTab.tsx` 不可达 `COMPACT=false` 分支与 `LegacyManagementPane.tsx`；补齐 `ResearchMilestoneCard.tsx`（含同回合原生 `ui-deliverables` 交付卡去重降噪）与 `ResearchGraphTab.tsx` 的中英双语漏网。
2. **R1 · 全域贯通、阶段聚焦驾驶舱与意图首屏**：
   - **Host `researchRun` 投影**：在 [packages/deep-research-pack/src/index.ts](../../packages/deep-research-pack/src/index.ts) 经 `ctx.inject(['sessionProjections'], ...)` + `scoped.effect` 注册纯增量状态机 [research-projection.ts](../../packages/deep-research-pack/src/lib/events/research-projection.ts)，零额外写盘、零 N+1 按行 `follow` 订阅；浏览器端通过 [ResearchSessionRow.tsx](../../packages/deep-research-pack/src/client/ResearchSessionRow.tsx) 挂载左栏状态点、悬停摘要与已交付右键直开终稿，并驱动 [RunsView.tsx](../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) 按 `slug` + 工作区精确反查所属会话（进行中进会话、已交付先切回所属会话再开终稿、无关联目录诚实标只读归档），彻底根治跨会话串台。
   - **三层阶段聚焦驾驶舱与交互式雷达**：[ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 按立项 / 推进 / 审阅 / 已交付四阶段聚焦当下唯一动作（去重状态页内三种改法、改用 `ui-primitives` 矢量图标与 `StateDot`、队员行支持一键跳子会话）；[QualityRadar.tsx](../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx) 支持点击命中格原地展开证据微列表并直开 `ResearchEvidenceTab`，缺口格悬停 `Tooltip` 说明盲区透镜。
   - **意图优先首屏**：接入 `conversation.hero.options`（[HeroResearchOptions.tsx](../../packages/deep-research-pack/src/client/HeroResearchOptions.tsx) 提供方法 / 视角 / 工作台轻量选配），瘦身 [StartCard.tsx](../../packages/deep-research-pack/src/client/StartCard.tsx) 去除重复工作区大框与长篇说明书。
3. **R2 · 学术级全屏三栏精读、Composer 指令流与富语义工具卡**：
   - **终稿精读台**：合并 [FinalToolbar.tsx](../../packages/deep-research-pack/src/client/research-final/FinalToolbar.tsx) 为单条工具栏；监听 `useTabInfo().sidebar.fullscreen` 自动展开「左 Sticky TOC + 中舒适正文 + 右 [StudioInspectorPane.tsx](../../packages/deep-research-pack/src/client/research-final/StudioInspectorPane.tsx)」；经 [CitationHoverLayer.tsx](../../packages/deep-research-pack/src/client/research-final/CitationHoverLayer.tsx) 与 [evidence-preview.ts](../../packages/deep-research-pack/src/lib/run/evidence-preview.ts) 提供 150ms 悬停溯源预览（严守 `ArtifactState` 五态）；[ClaimsAuditView.tsx](../../packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx) 顶部升级为可点击风险筛选 `Pill`；[DagMap.tsx](../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx) 展示子问题摘要与角色并在全屏舒展宽画布。
   - **Composer `/` 与 `@` 指令流及快捷键**：新增 [research-commands.ts](../../packages/deep-research-pack/src/client/research-commands.ts)（`decorate('research-defaults')` + `/lens` / `/method` / `/hub`）、[research-triggers.tsx](../../packages/deep-research-pack/src/client/research-triggers.tsx)（`@` 证据卡与计划节点补全 + `ReferenceChip`）与 [research-shortcuts.ts](../../packages/deep-research-pack/src/client/research-shortcuts.ts)（`Primary+Shift+{U,G,D}`）。
   - **富语义工具卡**：[ResearchToolCard.tsx](../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) 解析结果正文，对 `web_search` / `web_fetch` 渲染 DSH 原生 `<WebBlock>`，对 `spawn_teammate` / `subagent` 呈现角色波次与队友跳转按钮。
4. **R3 · 3 分钟零 Key 示范工程与上游反馈沉淀**：新增脱敏自包含示范夹具 `tests/fixtures/showcase-home/` 与一键入口 [demo-showcase.mjs](../../tools/channel/demo-showcase.mjs)（`pnpm demo`）；编写 [docs/guides/dsh-showcase.md](../../docs/guides/dsh-showcase.md) 全景对照表与 profile 层零改代码可组合性示范；沉淀 [2026-11-28-dsh-upstream-feedback.md](../../_backlog/_archived/research/cockpit-ux-v2/2026-11-28-dsh-upstream-feedback.md) 上游反馈账本。
5. **R4 · 对照 North Star 原型精修收口与 D38 演进**：
   - **D38 首屏演进**：[start-card.ts](../../packages/deep-research-pack/src/lib/workspace/start-card.ts) 将 `shouldShowStartCard` 改为仅按 `!hasUserMessage` 判定（回访空白会话保持展示意图起题卡），去除外层双重边框与重复大标题，冷启动提供磁盘档案数与工作台直达条，水合后呈现可点击「继续最近研究」快捷续接条。
   - **全页像素级收口**：状态页移除 `✅` 改原生 `StateDot`、缩短 HITL 活标题为「状态 · 待拍板」/「Status · Input」并预留右侧 `30px` 避让 dockkit 活跃页签关闭钮、为质量雷达新增可点提示；终稿页签复用 DSH 文档化 `md-table-wide` 钩子让全屏 4 列宽表完整自适应无裁切，窄侧栏 `@container (max-width: 680px)` 保持工具栏单行，全屏悬停卡主操作改为「在右侧固定打开」直钉对照栏；图谱选中节点支持一键「插入 `@` 引用」预填草稿，升级示范 `plan.md` 消除告警条与 `plan 版本未声明`；Hub `RunsView` 升格琥珀「立项待拍板」徽章并等高截断标题，透镜页顶部置放 `layout="compact"` 双列「项目默认」并清除 `P1–P8` 内部编号；补录上游反馈 **U8–U10** 并在 [packages/deep-research-pack/AGENTS.md](../../packages/deep-research-pack/AGENTS.md) 显式固化 `vendor/dsh/` 只读铁律；刷新 [docs/assets/readme-first-screen.png](../../docs/assets/readme-first-screen.png)。

## 判据形状

- **权威事实**：会话级研究态势唯一来自 Host `sessionProjections` 对已提交会话日志的确定性增量折叠（`src/lib/events/research-projection.ts`）；工件细节唯一来自工作区三位置（`src/lib/run/run-context.ts`）经 `readArtifact(..., { decoder })` 解码的 `ArtifactState` 五态；槽位键名、语义令牌与双语文案分别由 `keys.ts`、`ui-theme` 与 `locales/{zh,en}*.ts` 单点把守。
- **读取方**：Host 投影折叠器、驾驶舱全部 React 面板与 Hub、`pnpm verify` 结构门禁及真浏览器端到端冒烟套件。
- **坏输入**：非研究/截断日志确定性回退 `idle` 或最近合法态不阻断 Host 管线；孤立磁盘 `drt_*` 目录诚实标只读归档绝不借用当前会话；悬停证据卡缺席/空/不可读/非法均显性呈错并支持重试；工具卡异常结果有界降级不崩溃。
- **旧形态退场**：`conversation.view` 重复方法库 tab、`installCoachComposerStyles` `:has(...)` 隐藏补丁、`ResearchConfigTab` `COMPACT=false` 死分支、`LegacyManagementPane.tsx`、状态页常驻五问绿框/重复三种改法/emoji 拼接及终稿双控制条均已同变更删除。
- **反证**：`research-projection` 状态转移与重放幂等测试、Hub 会话归属防串台负例、`start-card` 回访/冷启动矩阵、终稿 Studio/悬停/宽表与图谱 `@` 引用单测、`client-load.entry` 与四套 `cockpit-truth*.entry` 真浏览器端到端守卫。

## 输掉的方案

- **修改 `vendor/dsh/` 或针对宿主壳 DOM 写 CSS 隐藏/点击 hack**：破坏只读基线与上游升级可继承性，明确否决；10 项平台边界（U1–U10）一律采用可逆降级并沉淀至上游反馈账本。
- **保留 `conversation.view` 第二方法库入口与 `:has(...)` 隐藏补丁**：作为标杆示范工程不可保留反范式 hack，统一收敛至全局 Hub + `shell.overlay` Portal。
- **在左栏行首按行订阅 `remote.session.follow`**：会造成 N+1 WebSocket 订阅风暴，改为 Host `sessionProjections` 单源增量推送。
- **维持回访工作区隐藏 `StartCard`（旧 D38 判据）**：导致回访用户面对空白首屏缺失起题灵感与最近研究续接入口，改为仅在当前会话已有用户消息时收起。
- **把 `schedule-bundle` / `browser-use` 等外围扩展硬塞进默认包**：违背 [D22](../../docs/decisions.md#d22) 零外部服务依赖原则，改为在 `docs/guides/dsh-showcase.md` 示范 profile 层零改代码叠加。
- **把 R4 对照原型精修拆成零散 bug 卡**：落差源于对同一设计意图的系统性视觉与交互收口，归口同实施卡 R4 一次闭环更利于证据与交付统一。

## 实际跑过的验证

以下全部基于最终交付构建（提交 `55d8fa92` → `8a1eb76a`，`vendor/dsh/` 零变更）实跑通过：

- **L0 静态、门禁与单元测试**：
  - `pnpm typecheck && pnpm lint` → PASS（0 warnings / 0 errors，152 文件）。
  - `pnpm verify`（含 `pre-commit`）→ **63/63 PASS**（含 `vendor-pin`、`vendor-clean`、`doc-budgets`、`client-tokens`、`client-keys`、`client-effect-wrap`、`dist-freshness`、`staged-change-pairing`）。
  - `pnpm test` → **PASS**（`test:spec` 1724/1724 + `test:checks` 281/281）。
  - `pnpm release:check` → **OK**（`version=0.3.8`）。
- **L1 / L2 打包与真实 CLI 安装形态**：
  - `source tools/env.sh && node checks/smoke/preset.e2e.mjs` + `node checks/smoke/pack.e2e.mjs`（88 tarball 条目、peers-only、可复现 sha）+ `node checks/smoke/release.entry.mjs --install-only`（干净室 `plugin add`、doctor、5 角色 + 2 worker profile `DSH_SMOKE_REAL=1` 真挂载、干净卸载与端口释放）→ **ALL PASS**。
- **真实模拟环境端到端（真 DSH daemon + 真 Chromium Playwright）**：
  - `node tools/channel/demo-showcase.mjs --check` → **CHECK PASS**（`sessions=2`）。
  - `node checks/smoke/product-boot.entry.mjs` → **15/15 GREEN**（零 `pageerror`）。
  - `node checks/smoke/cockpit-locale.entry.mjs` → **3/3 PASS**（英文界面零 CJK 残留与词边界验证）。
  - `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1 node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home` → **ALL PASS**（因测试机存在其他项目常驻进程致主机 load/cpu > 1.5，按脚本官方诊断开关执行并通过全部断言，覆盖左栏投影、阶段聚焦、终稿全屏三栏与悬停溯源、`/lens`、方法库与全局工作台）。
  - 四套真值契约：`cockpit-truth.entry.mjs`（24/24）、`cockpit-artifact-truth.entry.mjs`、`cockpit-truth-residuals.entry.mjs`、`cockpit-truth-substance.entry.mjs`（19/19）→ **4/4 ALL PASS**。
  - R4 真浏览器多视口与明暗主题实拍（`1440×900` 明/暗、`1280×800`、`768×900`，16 张全量逐像素目检）：**13/13 几何与交互断言 PASS**，0 `consoleError`、0 `pageError`、0 横向溢出。
- **未跑项（显式声明，未跑 ≠ 通过）**：依赖真实外部模型 API Key 的 `client-hitl.entry.mjs` 与 `l4-lite.e2e.mjs` 本轮 keyless 验收未运行（HITL 挂起态视觉与活标题由真实示范会话实测覆盖；真模型活流边界仍受 [triggers.md](../../_backlog/triggers.md) 首行追踪）。
- **审查与业务验收**：已按 `reviewing-a-delivery` 完成跨面语义对抗自审（补齐 `docs/contracts/client-ui.md` 3 处同步更新并核实无旧 Note 矛盾）；用户于 2026-11-28 正式批准毕业并归档。

## 环境状态与后续触发

- 10 项 DSH 平台边界与上游提案（U1–U10）已沉淀于归档账本 [2026-11-28-dsh-upstream-feedback.md](../../_backlog/_archived/research/cockpit-ux-v2/2026-11-28-dsh-upstream-feedback.md)，并在 [_backlog/triggers.md](../../_backlog/triggers.md) 登记「下次 `bumping-vendor-pin` 升级基线时逐条复核 U1–U10，优先切换上游原生 Seam 并拆除本仓降级层」。
- 同步从 `_backlog/triggers.md` 清理已由 R0 彻底退役的 `COMPACT=false` 回滚分支触发行。
