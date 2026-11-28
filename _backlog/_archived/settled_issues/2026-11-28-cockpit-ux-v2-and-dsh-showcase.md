---
status: 已结
opened: 2026-11-28
---

# 推敲：研究驾驶舱二期 UX/UI 深水区重塑与 DSH 标杆示范工程（Goal-Driven 实施卡）

> 立卡：2026-11-28 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [2026-11-28-cockpit-ux-v2-and-dsh-showcase](../../../notes/implemented/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md)（R0–R4 全部落地并经用户 2026-11-28 验收签收，与 Note 同变更归档）
> 调研依据：[cockpit-ux-v2 调研题](../research/cockpit-ux-v2/README.md)（[二期诊断与 DSH 能力杠杆方案](../research/cockpit-ux-v2/2026-11-28-ux-ui-v2-diagnosis-and-dsh-leverage.md)）

**问题与期望结果：** 本仓承载双重使命——既要交付一流体验的深度研究工作台，又要作为 DeepSeek Harness（DSH）「Everything is a Plugin（零改内核、全靠插件组合长出完整垂直应用）」的标杆示范工程。当前后端组合层与验证水位已很扎实（单包 5 角色 + 2 worker profile、`isolate` 隔离域 `workflow-ptc`、自定义 `ctx.web` 回退提供方、Agent Teams + Goal + Session Query），但前台 UX/UI 在第一轮 M1–M7（合规与组件补齐）之后仍存在六大结构性断层：首屏说明书感重且控件重复、右栏「研究状态」10 层静态堆砌无阶段焦点、Session 与 Run 断联导致 Hub 打开终稿跨会话串台、配置多头分散且残留 `:has(...)` 全局 CSS hack 与死代码、DSH 最具辨识度的原生机制（Host `sessionProjections`、`/` 模糊命令弹窗、`@` 证据引用胶囊、`sidebar.fullscreen` 沉浸三栏、`HoverCardGroup` 悬停溯源）几乎空白，且缺少「3 分钟零 Key 可体验」的示范入口与技术导览。期望结果：按 **R0 → R1 → R2 → R3** 四个垂直轮，打造**前台极简优雅、后台原教旨 DSH 化、3 分钟零 Key 可感、10 分钟源码可读**的标杆深度研究插件。

**当前情况：** 调研题 `cockpit-ux-v2` 已完成代码级审计与 `vendor/dsh`（`dsh-v0.2.1-rc.5`）原生能力盘点并定性；用户已认同「两类观众、同一份实现」的 Owner 策略与四轮推进节奏，要求显性化为可由 `/goal` 自主驱动落地的完整实施卡。

**未决问题：** 架构主线已收敛，无前置设计阻塞。执行期仅需在两个技术边界做实测核对：① **R1.1** 核对 Host 半 [src/index.ts](../../../packages/deep-research-pack/src/index.ts) 注册 `sessionProjections` 后，浏览器 `useSessions` 在冷启动与热更新下的投影投递语义；② **R2.2** 核对 `@deepseek-ai/dsh-client-ui-commands`、`@deepseek-ai/dsh-client-ui-input-trigger`、`@deepseek-ai/dsh-client-shortcuts` 在当前 `dsh-v0.2.1-rc.5` 浏览器模块表中的可见性与门禁兼容性（若个别能力在当前 RC 未暴露给外部包，须按事实记录进 R3.3 上游反馈账本并精准降级，绝不绕过框架写 hack）。

**下一步：** 直接作为 `/goal` 的驱动目标，按 **R0 → R1 → R2 → R3** 顺序自主推进；每轮先补契约/单测与红绿证，过完本轮机械门禁、真浏览器冒烟与明暗双主题视觉核查再进入下一轮，全部绿灯且对抗自审通过后提请用户最终视觉与业务验收。

---

## 一、核心设计哲学：驾驭「极致 UX/UI × DSH 标杆示范」的四条铁律

1. **前台极简、后台原教旨（两类观众，同一份实现）**：终端用户看到的是零工程噪音、浑然天成的深度研究工作台；技术观众翻开源码看到的是零 hack、零私有轮子、把 DSH 各层 Seam 用到极致的参考实现。**双向一票否决**：对研究心流无益的 DSH 特性坚决不做（主动裁剪本身就是示范）；对体验有益的交互必须 100% 走 DSH 正统扩展点，撞到平台缺口则记录进上游反馈账本，不以脆性 DOM hack 凑数。
2. **集中打透 5 个「标志性示范瞬间（Signature Moments）」**（不铺 30 个平庸功能）：

| # | 标志性瞬间 | 用户侧体验爽点 | 示范的 DSH 原生能力 |
|---|---|---|---|
| **S1** | 一键重塑的意图首屏 | 去掉编程壳噪音与说明书横幅，同行轻量选配方法/视角，一键从灵感卡或最近 Run 起步 | `cordis.patch.yml` 白名单裁剪（`disabled: true`）+ 品牌槽 + `conversation.hero.options` |
| **S2** | 全域活队列与阶段聚焦驾驶舱 | 左栏会话自带实时研究状态灯，Hub 秒切所属会话不串台；右栏随阶段聚焦，点击质量雷达格直钻证据卡 | **Host `sessionProjections`** + `sidebar.session.row.*` + `Agent Teams` 子会话联动 |
| **S3** | 学术级全屏三栏精读 + 悬停溯源 | 终稿全屏自动展开「左常驻目录 + 中舒适正文 + 右证据/Critic 核查栏」；悬停 `[来源: xx]` 150ms 秒看等级与摘录；核查清单按风险过滤 | `sidebarRight` `fullscreen` 保活形态 + `HoverCardGroup` + Critic 独立 Claim 核查架构 |
| **S4** | Composer `/` 与 `@` 研究指令流 | 敲 `/lens` 选批判视角、`/method` 选打法、`/research-defaults` 可视化设默认；敲 `@` 将证据卡或计划节点变原子胶囊嵌进追问 + 全局快捷键 | `ctx.commandUi` + `ui-input-trigger` + `uiConversation.userText`（`ReferenceChip`）+ `ctx.shortcuts` |
| **S5** | 零 hack 嵌入式专职 Agent 方法库 | 全局唯一工作台里点击新建/优化方法，由独立 Method Editor 对话提炼并通过窄权 Host 工具安全落盘 | 多 `agent-preset` 隔离 + 窄 Host 工具 + `shell.overlay` Portal |

3. **生态可组合性靠「示范加法」而非「硬塞默认包」**：严守 [D22](../../../docs/decisions.md#d22)（零外部服务依赖、开箱干净）；在 R3 架构导览中单独示范用户如何不改本包一行代码，在自己 profile 层按需叠加其他 DSH 插件（如定时追踪、动态网页抓取、文档预览）。
4. **稳定性分级与可逆边界**：新接入的 DSH 客户端能力按小模块隔离、全量包裹 `scoped.effect`、严格遵守 N0/N1 与 N2 边界，防止后续升 pin 时互相牵连。

### 明确不做（拒绝清单）

- 不开启 `ui-trajectory`、`ui-sidebar-terminal`（保持研究工作台纯粹性，守住 [client-ui.md §2.0](../../../docs/contracts/client-ui.md#cockpit-surface) 出厂面白名单）；
- 不为炫技硬塞与研究心流无关的实验包（Worktree、LSP、Computer-Use、Voice）；
- 严禁修改 `vendor/dsh/` 任何文件；
- 严禁破坏 [D17](../../../docs/decisions.md#d17)（harness 只读、run 状态唯一住 `drt_<slug>/`）与 [D18](../../../docs/decisions.md#d18)（驾驶舱只读观察与预填草稿，不提供绕过会话与日志的一键直写或自动发送）。

---

## 二、全局不变量与禁区（Goal 执行不可违背的红线）

1. **只读基线铁律**：严禁修改 `vendor/dsh/` 任何文件（`vendor-clean` / `vendor-pin`）。
2. **零反范式补丁**：R0 必须彻底删除 [styles.ts](../../../packages/deep-research-pack/src/client/styles.ts) 中的 `installCoachComposerStyles` `:has(...)` 主输入框隐藏补丁；后续轮次禁止新增针对 DSH 宿主壳内部 DOM 的 CSS 隐藏或 hack。
3. **Host 投影零副作用与诚实原则**：Host `researchRun` 投影只从已提交会话日志确定性增量折叠，零额外磁盘写入、零静默默认值；浏览器侧绝不在 `sidebar.session.row.leading` 按行开 `remote.session.follow`（防 N+1 订阅风暴）。
4. **五态诚实降级与强判别联合**：任何新增的工件读面（含悬停证据卡懒加载、雷达下钻读取）一律经 `readArtifact` + `ArtifactState`（`ok / absent / unreadable / empty / invalid`）处理，禁止静默 `catch` 或将读失败折成空态。
5. **契约与守卫单源**：
   - 全部用户可见文本 day-one 中英双语，同步录入 `src/client/locales/{zh,en}*.ts`（`cjk-source` 与 locale 单测把守）；
   - 全部槽名/key/id/wire 工具名唯一住 [keys.ts](../../../packages/deep-research-pack/src/client/keys.ts)（`client-keys`）；
   - 全部槽/页签/命令/快捷键注册全量包进 `scoped.effect`（`client-effect-wrap`）；
   - 全部颜色样式严守 `--dsw-alias-*` 令牌与 CSS Modules（`client-tokens`）；
   - 新增/删除 `src/client/`、`src/lib/`、`keys.ts` 或 `package.json` 导出后，同轮执行 `pnpm docs:gen` 并同步 `src/lib/faces.json`（`cockpit-doc-registry` / `docs-reference-fresh`）。
6. **冒烟选择器演进纪律**：保留既有核心 `data-testid` / `data-research-face`；若 R0 收敛 `conversation.view` 方法库 tab，必须同变更更新 [client-load.entry.mjs](../../../checks/smoke/client-load.entry.mjs) 及相关单测，确保方法库全链路断言迁至全局「研究工作台」且零覆盖下降。

---

## 三、已知与未决

- **已决**：
  - Host 投影落点优先复用已存在的 Host 半 [src/index.ts](../../../packages/deep-research-pack/src/index.ts)（`id: research-client`，`name: 'dsh-deep-research-pack'`），通过 `ctx.inject(['sessionProjections'], ...)` 惰性注册（纯折算逻辑住 `src/lib/events/research-projection.ts`），既把现有空壳 Host 半升级为标准双半插件，又不新增额外 bundle 行与冗余 `locale-*` 元数据目录；
  - 终稿悬停溯源继续基于内存预转（`citation-linkify.ts`）与 `workspaceFiles` 有界缓存读取，不改写磁盘 `final*.md`；
  - 零 Key 示范体验通道作为仓级工具（不塞大体积示例文件进发布 tarball，守住包体纯净与 D40）。
- **执行期实证点**：
  - R1.1 实测 `useSessions(s => s.projectionsBySession[id]?.values['...'])` 的精确 key 命名约定与冷启动刷新时机；
  - R2.2 实测 `dsh.client.inject` 补充 `@deepseek-ai/dsh-client-ui-commands`、`@deepseek-ai/dsh-client-ui-input-trigger`、`@deepseek-ai/dsh-client-shortcuts` 后在真浏览器模块表的装配情况（若某项在 `0.2.1-rc.5` 需特殊声明或受限，记入 R3.3 上游反馈账本并采取已验证的最优雅替代）。

---

## 四、方案与取舍（R0–R3 Goal-Driven 执行路线）

### R0 · 清债、入口收敛与视觉验收基线（先立范本底色）

- **目标**：拔掉示范项目里残留的反范式 hack、死代码与英文漏网，收口冗余入口，并建立前后可对比的视觉基线。
- **具体改造**：
  1. **R0.1 收敛双「方法库」入口并清除 `:has(...)` CSS hack**：
     - 退役 `conversation.view` 里的第二个「方法库」tab（[index.ts](../../../packages/deep-research-pack/src/client/index.ts) 中移除 `METHOD_LIBRARY_VIEW` 注册及 [keys.ts](../../../packages/deep-research-pack/src/client/keys.ts) 对应退役键），统一归口左侧全局 `ResearchHubPanel`（方法库页签）与后续 `/method` 快捷入口；
     - 彻底删除 [styles.ts](../../../packages/deep-research-pack/src/client/styles.ts) 中的 `installCoachComposerStyles`（全局 `:has([data-method-library-edit])` 隐藏外层 composer 补丁）及其在 `index.ts` 的注册与测试；
     - 在 [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 中将「去方法库」引导文案与按钮统一直指全局「研究工作台 → 方法库」；同步更新 `client-load.entry.mjs` 与相关测试，确认方法库（含 Method Editor 悬浮窗与写库回执）在全局工作台内全链路测试绿灯。
  2. **R0.2 清理历史死分支与双语/重复漏网**：
     - 清理 [ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) 中不可达的 `COMPACT=false` 分支与不再使用的 `LegacyManagementPane.tsx`（先 grep 确认零外部引用后再删除）；
     - 修复 [ResearchMilestoneCard.tsx](../../../packages/deep-research-pack/src/client/ResearchMilestoneCard.tsx)：将裸渲染的英文枚举 `'protocol' | 'review' | 'delivered'` 走 `locales/{zh,en}*.ts` 字典本地化；当同一回合已存在 DSH 原生 `ui-deliverables` 交付文件卡时对「已交付」横条做去重/降噪，消除视觉重复；
     - 修复 [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) 中残留的英文硬编码（`'top-level'`、`'nodes'`、`'WAVE ...'` 全部迁入双语字典）。
  3. **R0.3 采集二期改造前基线现场**：
     - 用 `tests/fixtures/client-load-home` 种子数据在 `runtime/scenes/ux-v2-before/`（gitignored）记录明/暗主题、1440×900 与 1280×800 的改造前截图（首屏 / 状态页 / 图谱 / 终稿 / 全局工作台），作为后续 R1–R3 视觉改善的客观对照。
- **局部验收**：`pnpm build && pnpm docs:gen && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿；`source tools/env.sh && node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home` 全绿。

---

### R1 · 全域贯通 + 阶段聚焦驾驶舱 + 意图首屏（重塑产品骨架：X1 + X3 + X5）

- **目标**：打通 Session ↔ Run 全局身份索引，根治 Hub 跨会话串台 BUG；把右栏状态页从 10 段流水账重构为阶段自适应焦点驾驶舱与可下钻质量雷达；去掉首屏说明书噪音。
- **具体改造**：
  1. **R1.1 Host `researchRun` Session Projection + 左栏活队列 + Hub 会话跳转（X1）**：
     - 新增 `packages/deep-research-pack/src/lib/events/research-projection.ts`（纯函数状态机，复用既有 `hitl-fold.ts` / `session-binding.ts` 语义）：从已提交 `SessionEvent` 确定性增量折算 `ResearchRunProjection`（`{ schemaVersion: 1, slug: string | null, phase: 'idle' | 'intake' | 'running' | 'hitl_pending' | 'delivered', hitlKind: 'hitl1' | 'hitl2' | 'other' | null, deliveredPath: string | null, updatedAt: number }`）；补齐完备的 keyless 单元测试（含全状态转移、重放幂等、畸形/缺失事件容错）；
     - 升级 [packages/deep-research-pack/src/index.ts](../../../packages/deep-research-pack/src/index.ts)（保持 named exports `inject = []` 与 `apply`，通过 `ctx.inject(['sessionProjections'], ...)` + `scoped.effect` 注册投影单元，零磁盘副作用；参照 `vendor/dsh/packages/experimental/agent-team/src/projection.ts` 的官方注册契约）；
     - 浏览器端新增轻量投影消费模块：
       - 在 `sidebar.session.row.leading` 注册克制研究状态标（HITL 挂起亮琥珀提醒点、进行中亮活跃态、已交付亮完成标；非研究会话或 idle 零渲染不添噪音）；
       - 在 `sidebar.session.row.hover` 注册悬停研究摘要（绑定 `drt_<slug>` 与当前阶段）；
       - 在 `sidebar.workspaces.session.menu.item` 注册「打开研究终稿」（仅当该会话存在 `deliveredPath` 时显示）；
     - 升级 [ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) 与 [RunsView.tsx](../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx)：
       - 将工作区三位置 `drt_*` 档案与 `projectionsBySession` 按 `slug` + `workspace` 精确关联；
       - `in_progress` 档案卡片新增「进入研究会话」主按钮（切回所属会话并展开研究状态）；
       - `delivered` 档案卡片点「打开终稿」时，**先切换至产生该报告的所属会话，再打开终稿页签**，彻底根治「A 题会话开 B 题终稿」的串台缺陷（对磁盘存在但本地无关联历史会话的归档目录，显式标记为只读归档并安全打开，绝不静默伪造会话归属）。
  2. **R1.2 右栏「研究状态」阶段自适应重构 + 可交互 `QualityRadar`（X3）**：
     - 将 [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) 重排为清晰 3 层架构，严格对齐 `vendor/dsh/docs/web-styling.zh.md` 的发丝线与克制中性层级：
       - **顶层 · 当前态势焦点卡（Focus Hero）**：淘汰常驻绿底五问框，按 4 种阶段只突出当下唯一焦点——① 立项期（HITL1）：置顶 `ProtocolCard` 契约草案 + 待答问题提示；② 推进期（Running）：紧凑阶段主干轨（避免 9 胶囊乱折多行与多余静态图例）+ 当前波次/活跃角色 `TextShimmer` + 有效证据计数；③ 审阅期（HITL2）：Critic 核查就绪度（Claim 支持率 / 缺口警示）+「分屏审阅终稿」主按钮；④ 已交付（Delivered）：清爽交付印章 +「沉浸精读终稿」主按钮（移除状态页内重复的 `<details>` 三种改法，统一收口在终稿页尾）；警告/流失败横幅保留最高优先级置顶；
       - **中层 · 交互式 `QualityRadar`**（[QualityRadar.tsx](../../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx)）：优化窄栏列头防挤爆；任意 `Topic × Lens` 单元格支持点击交互——命中格点击展开该格下的证据卡微列表（显示质量等级 `A–D`、`LinkIconMedium` 来源域名图标、卡标题，点选即在右栏打开 `ResearchEvidenceTab`）；缺口格（`0`）悬停 `Tooltip` 说明对应透镜的必查盲区；
       - **底层 · 聚合动态流与队员直达**：淘汰 `🔍3 · 🌐2` 等粗糙 emoji 拼接，改用 `ui-primitives` 矢量图标、`StateDot` 与对齐数字徽章；活动流按阶段/波次清爽分组，支持点击产出物路径跳转；队员行右侧提供一键跳转该队员子会话（复用 `agentTeam` 导航能力，缺席时优雅隐藏）。
  3. **R1.3 去说明书化的「意图优先」首屏（X5）**：
     - 接入 `conversation.hero.options` 槽位（空白会话 `Deep Research Lead` 选择器右侧），提供紧凑的「方法 / 视角 / 工作台」轻量触发胶囊，让用户在开题位置两下完成选配；
     - 瘦身 [StartCard.tsx](../../../packages/deep-research-pack/src/client/StartCard.tsx)：当会话已绑定有效研究工作区时，不再重复渲染第二套大号工作区路径框与切换按钮（工作区由 DSH Hero 原生选择器承载；仅在尚未绑定有效工作区时突出引导目录选择）；删除三行操作说明长文与凭据絮叨，改为极简一行副标题 + 4–6 张带题型标签（全景 / 对比 / 尽调 / 核查）的可点击起题灵感卡（`inputActions.insertText`）+ 最近 1–2 场活跃/已交付 Run 快捷续接条。
- **局部验收**：
  - 新增 `research-projection`、交互式雷达、首屏瘦身、Hub 会话反查等全量 `node:test` 单测；
  - `pnpm build && pnpm docs:gen && node tools/record/render-overlay.mjs && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿；
  - 真挂载与真浏览器：`source tools/env.sh && DSH_SMOKE_REAL=1 node checks/smoke/preset.e2e.mjs`、`node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home`、`node checks/smoke/product-boot.entry.mjs` 及 `cockpit-truth*.entry.mjs` 全绿（新增左栏状态点、Hub 跳会话不串台、雷达点击下钻断言）。

---

### R2 · 巅峰交互：全屏三栏精读 + Composer `/` & `@` 指令流 + 富语义工具卡（X4 + X2 + X6）

- **目标**：打磨 3 个最具产品辨识度与 DSH 技术震撼力的“哇塞时刻”，彻底消除阅读摩擦与对话流工程味。
- **具体改造**：
  1. **R2.1 学术/投研级终稿精读台（X4）**：
     - **顶栏合一**：合并 [ResearchFinalTab.tsx](../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) 顶部职责重叠的 `.strip` 与 `.controlsBar` 为单条精致工具栏（左：`SegmentedControl` `读者版 / 审计版 / 核查 (N)` + 版本 `Menu`；右：目录开关、分屏审阅、全屏切换）；
     - **全屏三栏精读布局**：监听 `useTabInfo().sidebar.fullscreen`——常规侧栏态保持单列清爽；切换至 `fullscreen === true` 时自动展开为「**左常驻可高亮当前章节 Sticky TOC + 中舒适阅读列宽（`68ch–76ch`）正文 + 右常驻证据卡/Critic 核查对照栏**」，无需跳出即可边读边查；
     - **行内引用悬停预览（Inline Citation HoverCard）**：在终稿 Markdown 渲染路径挂载共享 `HoverCardGroup`，为 `[来源: evidence/xx.md]` 链接提供 150ms 延迟悬停卡片（异步懒加载单卡并按地址缓存，严守 `ArtifactState` 失败显性提示：展示标题、质量等级 `A–D`、`source_tier`、`LinkIconMedium` 来源网站图标、核心摘录前 3 行，以及「分屏固定打开」与「访问原网页」快捷按钮）；
     - **`ClaimsAuditView` 风险过滤**：顶部统计摘要升级为可点击筛选 `Pill`（全部 / 仅看存疑与未核查 / 完全支持），支持快速定位薄弱结论并点击直达关联证据卡；
     - **研究图谱可读性与全屏舒展**：升级 [ResearchGraphTab.tsx](../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) 与 [DagMap.tsx](../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)，节点卡片展示子问题短摘要与负责角色标识，并在 `sidebar.fullscreen` 下自适应展开宽画布 DAG。
  2. **R2.2 Composer 原生 `/` 命令、`@` 证据引用与全局快捷键（X2）**：
     - **探针先行**：验证 `dsh.client.inject` 补充 `@deepseek-ai/dsh-client-ui-commands`、`@deepseek-ai/dsh-client-ui-input-trigger`、`@deepseek-ai/dsh-client-shortcuts` 在 `client-half`、`client-load.entry` 与 `tsdown` externals 下零报错；
     - **斜杠命令弹窗（`ctx.commandUi`）**：
       - `decorate('research-defaults')`：提供分组交互选择弹窗替代手敲 JSON；
       - 注册 `/lens`：弹出 8 条内置研究透镜（含 `when` / `bias` 副标题与模糊搜索），选中插入结构化透镜要求；
       - 注册 `/method`：弹出当前工作区方法库 + 内置打法速选；
       - 注册 `/hub`：一键打开全局「研究工作台」；
     - **`@` 研究上下文引用（`ui-input-trigger` + `uiConversation.userText`）**：
       - 在追问或 HITL 反馈时，键入 `@` 提供当前绑定 run bundle 的分组补全（`证据卡 evidence/*.md` 与 `计划节点 W#.#`），选定后生成原子引用胶囊；点击胶囊免提交直接在右栏打开对应证据卡/图谱节点；
       - 在已发送用户消息中，通过 `conversation.user.text.node` 将 `drt_<slug>/W#.#` 与 `evidence/*.md` 渲染为可交互 `ReferenceChip`（保留复制/编辑原文不变）；
     - **全局快捷键（`ctx.shortcuts`）**：注册打开/收起研究状态、切换终稿视图、打开全局工作台等跨平台快捷键，自动进入 DSH 快捷键速查与 `Tooltip.shortcutKeys`。
  3. **R2.3 对话流工具卡富语义渲染（X6）**：
     - 升级 [ResearchToolCard.tsx](../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) 与 `src/lib/events/tool-card.ts`：解析 `ToolCallViewProps` 中 `block.result`（兼容流式进行中、成功结果、错误与截断态），对 `web_search` 与 `web_fetch` 使用 DSH 原生 `SearchBlock` / `WebBlock` / `LinkIconMedium` 展示结构化命中网页列表与站点图标，彻底告别 `<pre>` 原始 JSON 截断；
     - 对 `spawn_teammate` 与 `subagent`（识别 `research-wave` 扇出与独立 Critic 复核）清晰呈现角色徽章、目标摘要与一键跳转队员子会话按钮。
- **局部验收**：
  - 补齐终稿悬停缓存、风险筛选、`@` 编码/解码器、`/` 命令数据、工具卡结果解析的 `node:test` 单测；
  - `pnpm build && pnpm docs:gen && pnpm typecheck && pnpm lint && pnpm verify && pnpm test` 全绿；
  - 真浏览器全套件（`client-load.entry` + `cockpit-truth.entry` + `cockpit-artifact-truth.entry` + `cockpit-truth-residuals.entry` + `cockpit-truth-substance.entry` + `cockpit-locale.entry`）全绿（新增终稿全屏三栏、引用悬停预览、`/` 弹窗、工具卡富渲染断言）。

---

### R3 · 标杆示范工程收口：3 分钟零 Key 体验通道 + 架构导览 + 上游反馈 + 全量实证

- **目标**：把「好产品」放大为「零门槛可体验、架构可学习、能反哺平台」的 DSH 官方级标杆示范项目。
- **具体改造**：
  1. **R3.1 3 分钟零 Key 示范体验通道（Showcase Sample）**：
     - 整理一份高质量、脱敏、包含完整 8 字段证据卡 / `protocol.json` / `topics.md` / `plan.md` / `claims.json` × `verdicts.json` / 读者版 + 审计版终稿的示范研究夹具（可升级或独立于 `tests/fixtures/client-load-home`，不进发布 tarball、零外部依赖）；
     - 新增一键启动脚本（如 `tools/channel/demo-showcase.mjs` 与根 [package.json](../../../package.json) 的 `demo` 脚本，同步登记 [docs/reference/commands.md](../../../docs/reference/commands.md)），使用隔离临时 home 启动带预载完整研究会话的 DSH Web 界面——无须 API Key、无须等待 20 分钟模型跑完，30 秒即可完整把玩全部 5 个 Signature Moments（首屏、左栏状态灯、交互雷达、全屏三栏终稿、悬停溯源、Claim 核查过滤、`/` 与 `@` 指令流、全局工作台）。
  2. **R3.2 DSH 能力实战解剖图与门面视觉刷新**：
     - 新增 `docs/guides/dsh-showcase.md`（并挂载进 [docs/README.md](../../../docs/README.md) 与 [README.md](../../../README.md)）：
       - 完整呈现 **「用户体验 → DSH 原生机制/Seam → 本仓源码落点」全景对照表**（覆盖后端 S0 裁剪、5 角色 + `isolate` PTC wave、`ctx.web` 回退提供方、Host `sessionProjections`、到前端五大 Signature Moments）；
       - 专节示范 **「零改本包代码的生态可组合性」**：说明用户如何在自定义 `deep-research` profile 里叠加 `schedule-bundle`、`browser-use` 或 `office-to-pdf` 等 DSH 插件，彰显「Everything is a Plugin」的真正上限；
     - 在实机运行态下采集高清新界面截图，更新 `docs/assets/readme-first-screen.png` 并按需补充关键场景展示图；同步刷新 [README.md](../../../README.md)、[docs/contracts/client-ui.md](../../../docs/contracts/client-ui.md)、[packages/deep-research-pack/README.md](../../../packages/deep-research-pack/README.md) / [README.zh.md](../../../packages/deep-research-pack/README.zh.md)、`tools/record/research.overlay.yml` 与 `pnpm docs:gen` 全部自动生成参考物。
  3. **R3.3 沉淀「DSH 平台上游反馈账本（Upstream Feedback Ledger）」**：
     - 在 `_backlog/research/cockpit-ux-v2/2026-11-28-dsh-upstream-feedback.md` 登记本轮实践中遇到的真实平台缺口与摩擦（含复现锚点、现状边界与建议上游扩展点：如问卡窄列响应、右栏切会话滞留、`tool-agent-team` 缺 per-preset 开关、无 composer 主视图官方协议、以及 R2.2 实测发现的任何客户端模块边界），并在题名页点名登记。
  4. **R3.4 全量验收、对抗自审与毕业准备**：
     - 跑通 L0 / L1 / L2 与全部真浏览器测试套件；
     - 在 `1440×900`、`1280×800`、`768×900` 明暗双主题下与 R0.3 基线截图逐一对比复核（零横向溢出、零 console/page 错误、明暗对比度清晰）；
     - 严格按 [reviewing-a-delivery](../../../.agents/skills/reviewing-a-delivery/SKILL.md) 完成跨面语义对抗自审；
     - 起草 `notes/implemented/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md`（仅在最终交付与归档同变更落盘，避免提前落盘触犯 `backlog-liveness` 规则）。

---

### R4 · 对照 North Star 原型精修收口与 D38 演进（2026-11-28 实景逐页对账收口）

- **背景与 Owner 裁决**：R0–R3 落地后对照 [prototype-north-star.html](../research/cockpit-ux-v2/prototype-north-star.html) 逐页真浏览器实景对账，确认核心交互已到达 ~80%–90%，同时识别出 5 组本仓可控的高体感落差与 3 条 DSH 宿主平台边界（U8–U10）。按本仓治理口径，不拆零散 bug 卡、不另起新 issue，直接在本卡追加 R4 收口，严格遵守 `vendor/dsh/` 只读铁律（零修改 `vendor/dsh/`，零宿主 DOM hack）。
- **具体改造**：
  1. **R4.1 S1 意图首屏复活（D38 演进）与去套娃外框**：
     - 演进 `src/lib/workspace/start-card.ts`：`shouldShowStartCard` 改为仅在当前会话已有用户消息时收起（空白新会话即使工作区已有 `drt_*` 也继续展示意图起题卡与「继续最近研究」快捷续接条；若冷启动会话投影尚未水合且工作区已有磁盘 `drt_*`，展示轻量「在研究工作台查看全部档案」入口，零 N+1 `follow`）；
     - 精简 `StartCard.tsx` / `StartCard.module.css`：移除重复外层容器盒与重复大号标题，与 Hero 轻量选配区自然衔接；同步更新 `start-card` 单测与 `docs/contracts/client-ui.md`。
  2. **R4.2 S2 状态页与 S5 Hub 降噪精致化**：
     - 状态页：移除 `statusDelivered` 中的绿色 `✅` emoji（改用原语 `<StateDot state="done" />` 搭配文本）；缩短 `tabStatusPending` 防止窄侧栏被关闭按钮裁切（同步更新 `web-ui-nav.mjs` `TAB_TEXT.statusPending`）；为 `QualityRadar` 命中格增加清晰可点视觉提示与引导文案；
     - Hub `RunsView`：消费已有 `sessionMatches[run.rootPath]` 的 `hitl_pending` 投影，将待拍板研究卡片右上角标签由灰色「进行中」升格为琥珀色「立项待拍板 / 待你审阅」；卡片标题加 2 行截断保持网格等高；
     - Hub `研究透镜`：将「工作区项目默认」提至透镜页顶部紧凑展示（避免压在 8 张大卡底端截断）；清理面向用户的透镜文案中的内部编号（`P1/P2/P6/P8` 等），中英双语同步。
  3. **R4.3 S3 终稿精读排版修复与 S4 图谱净面/一键引用**：
     - 终稿页签：在 `ResearchFinalTab.module.css` 内利用 DSH 文档化 `md-table-wide` 钩子修复全屏三栏与侧栏内宽表右列截断问题（全屏 `studioProse` 内自适应列宽与代码折行，窄侧栏支持显式横向滚动不裁切）；收紧窄侧栏 `FinalToolbar` 防止 `过程 →` 单独换到第二行；全屏态悬停卡按钮直切右侧「证据速览」不再多开冗余分屏；
     - 研究图谱与示范夹具：升级 `tests/fixtures/showcase-home/.../plan.md` 为规范 `图版本：v1`、`W1.1 / W2.1 / W2.2 / W3.1 / W4.1` 与 `task_id = plan-only`，消除示范状态页的 `plan 版本未声明` 与图谱页顶部的两条黄色告警条；在图谱选中 `NodeCard` 新增「插入 `@` 引用」按钮（走 `inputActions.insertText` 预填草稿，守住 D18）；
     - 上游反馈账本与子目录红线内化：向 `2026-11-28-dsh-upstream-feedback.md` 补录 **U8–U10**（冷会话列表未水合 `未命名` / 切会话默认右栏 Tab / Composer placeholder）并修正 U4 锚点；核查 `packages/deep-research-pack/AGENTS.md` 强化 `vendor/dsh/` 只读铁律提示。
- **局部验收**：
  - `pnpm build && pnpm docs:gen && node tools/record/render-overlay.mjs && pnpm typecheck && pnpm lint && pnpm verify && pnpm test && pnpm release:check` 全绿（`vendor-pin` / `vendor-clean` 零变动）；
  - L1 `preset.e2e`、L2 `pack.e2e` / `release.entry --install-only` / `product-boot`、`demo-showcase --check` 与真浏览器全套件（`client-load`、`cockpit-locale`、`cockpit-truth*`）全绿；
  - 重采全页面真浏览器截图（`runtime/scenes/ux-v2-r4-after/`）逐张核验无截断、无溢出、无噪音告警，并刷新 `docs/assets/readme-first-screen.png`。

---

## 判据形状

- **权威事实**：
  1. 会话级研究态势（左栏状态标与 Hub 反查）：唯一权威 = DSH 持久会话日志经 `src/lib/events/research-projection.ts` 纯增量折叠产出的 `ResearchRunProjection`；
  2. 研究产物细节（终稿、证据卡、质量雷达、核查清单、图谱）：唯一权威 = 用户工作区 `drt_<slug>/`（及 `archive/` / `_abandoned/` 三位置，唯一发现入口 = `src/lib/run/run-context.ts`）经 `readArtifact(..., { decoder })` 解码后的 `ArtifactState`；
  3. 界面令牌、双语、键名与模块注册：唯一权威 = `vendor/dsh/packages/client/ui-theme`、`src/client/locales/{zh,en}*.ts`、`src/client/keys.ts` 与 `pnpm docs:gen` 生成物。
- **读取方**：Host `sessionProjections` 折叠器、驾驶舱各 React 组件与 `ResearchHubPanel`、L0 `pnpm verify` 全部门禁及真浏览器冒烟脚本。
- **坏输入**：
  - 会话日志含截断/非研究事件/乱序工具调用 → `researchRun` 投影确定性降级为 `idle` 或保持最近合法状态，绝不抛异常阻断 Host 投影管线；
  - 磁盘 `drt_*` 无对应历史会话 → Hub 如实标记无关联会话（只读归档打开或显式提示），绝不借用当前无关会话强行打开造成跨会话串台；
  - 悬停预览 `evidence/*.md` 缺失/0 字节/畸形/读异常 → `HoverCard` 显性渲染对应错误或空态提示并允许重试，绝不静默显示空白或伪造等级；
  - 工具卡 `block.result` 非标准结构或被截断 → 优雅降级为有界结构化纯文本摘要，不崩溃、不吐未处理 JSON 堆。
- **旧形态**：
  - `conversation.view` 重复「方法库」tab 与 `styles.ts` 的 `installCoachComposerStyles` `:has(...)` 补丁 → R0 删除；
  - `ResearchConfigTab.tsx` `COMPACT=false` 死分支与 `LegacyManagementPane.tsx` → R0 删除；
  - `ResearchStatusTab.tsx` 常驻绿底五问框、重复 `<details>` 三种改法、emoji 拼接动态 → R1 删除；
  - `ResearchFinalTab.tsx` 顶部重叠双控制条、工具卡裸 `<pre>` JSON 截断 → R2 删除。
- **反证**：
  - `research-projection` 单测覆盖空流、HITL1 挂起/已答、推进、HITL2 挂起/已答、交付、非法载荷与幂等重放矩阵；
  - Hub 关联反查单测覆盖「进行中进会话 / 已交付切所属会话再开终稿 / 孤立目录不串台」三分支（含负例：禁止把 `activeSessionId` 混绑到另一题 slug）；
  - 雷达下钻、终稿悬停缓存、Claim 过滤、`@` 引用编解码与工具卡结果解析各自配正反变异测试矩阵；
  - `client-load.entry.mjs` 与 `cockpit-truth*.entry.mjs` 作为真浏览器端到端回归持续守卫。

---

## 验收标准

1. **L0 构建与全量机械门禁全绿（每轮结束必跑）**：
   - `pnpm build && pnpm docs:gen && node tools/record/render-overlay.mjs && pnpm typecheck && pnpm lint && pnpm verify && pnpm test && pnpm release:check` 退出码均为 `0`，零跳过断言，零新增 `vendor/dsh/` 改动。
2. **反范式清零核验（R0）**：
   - `src/client/styles.ts` 中零 `:has(...)` 主输入框隐藏规则；`ResearchConfigTab.tsx` 零 `COMPACT=false` 死代码；`ResearchMilestoneCard.tsx` 与 `ResearchGraphTab.tsx` 零裸英文枚举或未本地化标签。
3. **L1 / L2 真挂载与安装形状全绿**：
   - `source tools/env.sh && DSH_SMOKE_REAL=1 node checks/smoke/preset.e2e.mjs` 全绿；
   - `source tools/env.sh && node checks/smoke/pack.e2e.mjs`、`node checks/smoke/release.entry.mjs --install-only`、`node checks/smoke/product-boot.entry.mjs` 全绿。
4. **真浏览器全套件与核心 UX 闭环实证（R1–R2）**：
   - `client-load.entry.mjs` + `cockpit-truth.entry.mjs` + `cockpit-artifact-truth.entry.mjs` + `cockpit-truth-residuals.entry.mjs` + `cockpit-truth-substance.entry.mjs` + `cockpit-locale.entry.mjs` 全部通过；
   - 真浏览器实证覆盖：左栏会话研究状态灯与悬停摘要、Hub `RunsView` 一键切所属会话零串台、右栏阶段焦点卡与点击雷达下钻证据卡、终稿全屏三栏与引用悬停预览、Claim 风险过滤、Composer `/` 命令弹窗与 `@` 证据引用、富语义搜索/组队工具卡。
5. **示范项目体验与文档实证（R3）**：
   - 零 Key 示范通道可一键启动并在 30 秒内展示完整 5 个 Signature Moments；
   - `docs/guides/dsh-showcase.md`、更新后的 `README.md` 截图与 `_backlog/research/cockpit-ux-v2/2026-11-28-dsh-upstream-feedback.md` 全部就位且通过 `pnpm verify`；
   - 实机在 Light/Dark 双主题与 `1440×900` / `1280×800` / `768×900` 视口下零横向溢出、零控制台报错、视觉前后对比达到标杆级水准。

---

## 关闭条件

- **R0–R3** 全部里程碑实施完毕且上述 5 项验收标准均有实跑证据；
- 按 [reviewing-a-delivery](../../../.agents/skills/reviewing-a-delivery/SKILL.md) 完成跨面语义对抗自审；
- `notes/implemented/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md` 在最终交付同变更落盘（只写实际跑过的验证与环境态）；
- 用户完成最终业务与视觉体验验收拍板后，将本卡状态翻为 `已结`、`可关闭：是` 并同变更 `git mv` 归档至 `_backlog/_archived/settled_issues/`，同时将无其他活跃消费者的 `cockpit-ux-v2/` 研究目录归档至 `_backlog/_archived/research/`。

---

## 给 `/goal` 执行者的防坑备忘（对齐 2026-11-28 现行仓库门禁）

1. **文档自动生成与单正本（D59 后路径）**：驾驶舱设计合同正本 = [docs/contracts/client-ui.md](../../../docs/contracts/client-ui.md)（测试宪法 = [docs/testing.md](../../../docs/testing.md)）。每轮增删 `src/client/`、`src/lib/`、`keys.ts` 或 `package.json` 导出后，必须运行 `pnpm docs:gen` 刷新 `docs/reference/*.generated.md`（`cockpit-doc-registry` / `docs-reference-fresh` 门禁把守），同时按需同步 `packages/deep-research-pack/src/lib/faces.json`。
2. **`release-vocab` 退役词门禁（极易踩坑）**：编写或修改任何 live 文档（`README.md`、`docs/**`、`packages/deep-research-pack/README.md`、`tools/release/product-manual.md`）时，**严禁**出现退役词（`插件即产品`、`产品 profile`、`产品形态`、`产品设置`、`产品用户`、`产品启动`、`产品面`、`产品化`、`产品包`、`产品账本`、`产品内(?!容)`、`P0–P4`）。请改用「研究工作台 / 垂直应用 / 插件组合 / 界面面 / 交互体验」等合规措辞。
3. **`count-free` 与 `doc-now-only` 门禁**：live 文档禁止写死门禁/测试/案例具体数字，也禁止写入历史对比措辞（`已销账` / `修订 →` / `曾用` / `首版…已由`）；所有改动只写「现在为真」，历史决策理由留到毕业 `notes/implemented/`。
4. **Host 半导出形态守卫（`export-shape.spec.mjs`）**：改造 `packages/deep-research-pack/src/index.ts` 注册 `sessionProjections` 时，务必保留 `export const inject: readonly string[] = []` 与 `export function apply(ctx: Context)` 的具名导出且严禁任何 `export default`；在 `apply` 内使用 `ctx.inject(['sessionProjections'], ...)` 惰性挂载并包裹 `scoped.effect`。
5. **浏览器模块表与构建外部化**：若在 `packages/deep-research-pack/package.json` 的 `dsh.client.inject` 新增 `@deepseek-ai/dsh-client-*` 依赖，须同步加进 `devDependencies`（`workspace:*`），并核对 [tsdown.config.ts](../../../packages/deep-research-pack/tsdown.config.ts) 的 `external` 匹配与真浏览器 `client-load.entry.mjs` 装载零报错。
6. **客户端四道常驻守卫**：全部槽名/key/id/工具名进 [keys.ts](../../../packages/deep-research-pack/src/client/keys.ts)（`client-keys`）；全部注册包进 `scoped.effect`（`client-effect-wrap`）；零裸 hex 与幽灵 `--dsh-*` 变量（`client-tokens`）；零硬编码中文与单语漏网（`cjk-source` + `client-locale.spec.mjs`）。
7. **文档路径与链接卫生**：`vendor/dsh/...` 路径与尚未创建的计划路径一律用反引号不要写成 Markdown 链接；仓内相对链接不带 `#L` 行号；live 文件零本机 `/Users/...` 绝对路径（`md-links` / `md-anchors` / `host-paths`）；每份 `.md` 末尾恰留一个换行（`md-utf8-newline`）。
8. **Note 勿早写（`backlog-liveness`）**：在卡处于 `待落地` 期间，切勿提前创建 `notes/implemented/2026-11-28-cockpit-ux-v2-and-dsh-showcase.md`——门禁会因「Note 已存在但卡仍未结」报红；等到交付收口与卡归档同变更再落盘。
9. **运行环境前置**：执行 L1/L2 或真浏览器冒烟前务必先 `source tools/env.sh` 锁住 `DSH_HOME=runtime/harness-home`；修改 `cordis.patch.yml` 或 pack 源后必先 `pnpm build` 与 `node tools/record/render-overlay.mjs`。
