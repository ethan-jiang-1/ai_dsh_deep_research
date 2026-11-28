---
topic: ux-ui-v2-diagnosis-and-dsh-leverage
intent: 剖析 M1–M7 之后仍存的六大结构性 UX/UI 瓶颈，映射 DSH 高阶原生机制（Session Projection / CommandUI / InputTrigger / UserText / Output Blocks），制定 X1–X6 实验方案
---

# 研究驾驶舱 UX/UI 二期诊断与 DSH 深度利用方案

## 一、仓库目的与第一轮改造复盘

### 1.1 仓库核心定位

本仓（`ai_dsh_deep_research`）是运行在 DeepSeek Harness（DSH）之上的**可核查多角色深度研究系统**，唯一交付包为 [packages/deep-research-pack](../../../../packages/deep-research-pack/AGENTS.md)：

- **核心公式**：`研究报告 = harness(run bundle)`（[docs/architecture.md](../../../../docs/architecture.md)）。`harness` 只读无状态（4 个研究角色 `Lead / Scout / Analyst / Critic` + 第 5 角色 `Method Editor` + 2 个 worker profile，走 DSH Agent Teams + subagent 协作）；每次研究的全部过程与结论沉淀在用户工作区 `<workspace>/drt_<slug>/` 中。
- **产品核心价值**：用户抛出一个复杂问题，经过 **HITL1（立项与研究契约确认）→ 多角色多视角（Topic × Lens）取证与交叉核查 → Critic 逐条 Claim 挑刺 → HITL2（审阅与定稿交付）**，拿到一份「每条关键结论都有出处可查、反证与未知边界诚实标注」的报告。
- **驾驶舱（Research Cockpit）的职责**：因为深度研究耗时长、中间自主轮次多、且有两个关键的人机拍板点（HITL1/HITL2），用户在 DSH Web 界面里需要一个**“平时安心放手、瞄一眼知全局、拍板时信息齐备、交付后沉浸精读与溯源”**的界面层（[docs/contracts/client-ui.md](../../../../docs/contracts/client-ui.md)）。

### 1.2 为什么第一轮 UX/UI 升级（M1–M7）“还没有彻底解决问题”？

2026-11-26 完成的第一轮升级（[2026-11-26-cockpit-ux-ui-native-upgrade](../../../../notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md) 及后续三轮修补）本质上完成的是 **L0 设计系统合规与功能补齐**：

- **已解决的问题**：接入 `lightningcss` CSS Modules、消灭幽灵 `--dsh-*` 与硬编码颜色、建立 `client-tokens` 门禁、替换原生 `<select>` 为 `Menu`、新增 `ProtocolCard` / `QualityRadar` / `ClaimsAuditView` / `ResearchEvidenceTab` / `ResearchHeaderPill` / `ResearchMilestoneCard` / `ResearchHubPanel`。
- **尚未解决的根本矛盾**：第一轮是在**原有的“工程师调试台”信息架构上做原位替换和区块叠加**——不仅没有做减法与心流重组，反而因为新加了契约卡、质量雷达、顶栏胶囊、里程碑卡、全局 Hub，导致**界面元素更密、入口重复、状态静态堆叠、会话与研究档案脱节**。同时，DSH 作为开发环境最精华的 **Host 会话投影、Lexical 结构化输入触发器（`/` 与 `@`）、富输出卡片（`SearchBlock`/`WebBlock`/`LinkIconMedium`）与行内引用芯片** 几乎仍是空白。

---

## 二、当前 UX/UI 的六大深层结构性问题（代码实证）

### 问题 1：首屏心智割裂——“说明书横幅叠在通用代码壳上”

- **现状现场**（见 [docs/assets/readme-first-screen.png](../../../../docs/assets/readme-first-screen.png) 与 [StartCard.tsx](../../../../packages/deep-research-pack/src/client/StartCard.tsx)）：
  1. 中央 `EmptyHero` 标题仍是通用编程壳的 `Into the Unknown`，下方已经有 DSH 原生工作区选择器（`research-workspace`）和角色选择器（`Deep Research Lead`）；
  2. 紧接着 `conversation.input.dock` 里的 `StartCard` 又在输入框上方撑开一大块卡片：**再次重复显示当前工作区路径与「选择项目目录」按钮** + 三行操作说明书文案 + 4 个朴素框线按钮 + 两行凭据/目录小字提示；
  3. 右栏默认停留在 `Start` 引导页，竖排 5 张大号工具入口卡（状态 / 配置 / 图谱 / 文件 / 更多），而在尚未发消息的空白会话点开「研究状态」或「研究图谱」，看到的只是“尚未绑定 run”的空面板。
- **体验后果**：首屏视觉重心碎成三块（通用 Hero 标题 + 说明书式 StartCard + 右栏空工具卡），缺少“直接围绕研究意图与视角开题”的产品呼吸感。

### 问题 2：右栏「研究状态」是 10 段静态垂直堆砌，缺乏阶段主次与可交互性

- **现状现场**（[ResearchStatusTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) + [status.module.css](../../../../packages/deep-research-pack/src/client/research-status/status.module.css)）：
  在 360px–440px 宽的右栏里，组件不区分当前处于「立项期 / 挖掘期 / 审阅期 / 已交付」，自上而下平铺了多达 **10 层区块**：
  1. 警告/流失败/停摆横幅；
  2. 常驻浅绿底色的 `briefCard`（五问文字块——即使还在立项或遇到警告也铺着 `state-success` 绿底，视觉语义冲突且与下方轨道/契约信息重复）；
  3. `TrackRail`（9 枚胶囊 `flex-wrap` 折成 2–3 行散落排列，缺少时间轴/阶段分组主干，且底部还跟一段静态文字图例 `trackLegend`）；
  4. `ProtocolCard`（研究契约键值对）；
  5. `decisionsLine`（决策次数提示）；
  6. `evidenceBar`（裸文字 + 原生下划线 `<button>` 混排）；
  7. `QualityRadar`（[QualityRadar.tsx](../../../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx)：一张静态 HTML `<table>`，列头直接暴露窄列易挤爆的透镜名，单元格只写 `1 / 0 / ·`——**既不能点击 `0` 查看缺口说明，也不能点击数字筛选/打开对应证据卡**）；
  8. 原生 `<details>` 折叠的「还不满意？三种改法」（与终稿底部 `FinalFollowupFooter` 完全重复）；
  9. `activityList`（所有历史动作挤在一个扁平列表，用 `🔍/👥/💬` emoji 硬拼，无阶段分组、无信源域名图标、不可点击跳转产物）；
  10. `membersSection`（队员折叠行，同样用 `🔍3 · 🌐2` emoji 拼接）。
- **视觉规范落差**：对照 `vendor/dsh/docs/web-styling.zh.md`，DSH 推崇极克制的中性层级（`0.5px` 发丝线、`--dsw-elevation-*`、克制的状态点而非大面积彩色底框、无原生裸下划线按钮、无粗糙 emoji 拼接）。当前状态页签的视觉噪音仍然偏高。

### 问题 3：Session（左栏会话）与 Run Bundle（`drt_<slug>`）断联——全局工作台成了“半截子目录”

- **现状现场**（[ResearchHubPanel.tsx](../../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) 与 [RunsView.tsx](../../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx)）：
  1. **左栏会话列表无研究态感知**：左栏列出 10 条历史会话时，用户完全看不出哪条会话正在后台跑波次、哪条正卡在 `⏳ 等你拍板`、哪条已经 `✓ 已交付`。
  2. **Research Hub 的 `RunsView` 无法跳回所属会话**：
     - 对于 `in_progress`（进行中）的研究档案，`preferredFinalPathOf(run)` 为 `null`，卡片底部**没有任何主操作按钮**（只能点「复制路径」），用户无法从工作台一键切进那场正在跑的研究会话！
     - 对于已交付的研究档案，点「打开终稿」执行的是 `backToChat(); openFinal(activeSessionId, finalPath)`——它没有切换到产生该报告的 Session，而是**强行借用当前随便停留在屏幕上的 `activeSessionId` 打开另一场研究的终稿**，造成“主对话聊着 A 题、右栏状态绑着 A 题、终稿页签却开着 B 题”的认知错乱。

### 问题 4：配置与方法心智碎片化（四处入口、两套方法库宿主、遗留死分支）

- **现状现场**：用户想控制“这场研究怎么跑”，需要在 4 个位置来回找：
  1. 输入框左下角 `DefaultsButton`（只反映 `depth/output/source` + 默认方法名，点击跳右栏「研究配置」）；
  2. 右栏 [ResearchConfigTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)（摆着 `DefaultsPanel` + 本次采用的方法 + 一块纯提示框叫用户去点顶部「方法库」tab；且文件内仍残留约 250 行 `COMPACT=false` 的 `LegacyManagementPane` / `detailModal` 不可达历史代码）；
  3. 会话顶栏 `conversation.view` 的「方法库」tab（为了压住底部的聊天输入框，被迫在 [styles.ts](../../../../packages/deep-research-pack/src/client/styles.ts) 注入 `html[data-dsh-deep-research] [data-conversation-scroll]:has([data-method-library-edit])...` 全局 CSS 隐藏补丁）；
  4. 左侧全局 `ResearchHubPanel` 里的「方法库」tab 与「研究透镜」tab（后者底部**又嵌了一遍** `DefaultsPanel`）。
- **体验后果**：`Defaults`（默认参数）、`Method`（整场打法偏好）、`Lens`（单题取证视角）三者在后端契约上正交清晰，但在 UI 上缺乏统一的「开题前轻量选配 + 工作台集中管理」动线。

### 问题 5：DSH 核心的 Composer 原生交互面（`/` 命令弹窗、`@` 引用、行内芯片、快捷键）利用率为 0%

- **现状现场**：
  - 用户在输入框敲 `/`，看到的只有系统通用命令；本包虽注册了 `/research-defaults` host command，却未接入 `ctx.commandUi` 提供可视化弹窗，也没有 `/lens`、`/method`、`/cockpit` 等研究专属斜杠交互；
  - 用户在输入框敲 `@`，无法直接按研究语义检索并插入当前 bundle 的 `evidence/*.md` 或 `plan` 节点；
  - 对话流中用户发出的 `drt_<slug>/W3.1` 或证据路径只是死文本，未接入 `uiConversation.userText` 渲染为可点击预览的 `ReferenceChip`；
  - 全包未向 `ctx.shortcuts` 注册任何键盘快捷键，重度用户无法用键盘在「对话 ↔ 终稿 ↔ 证据分屏 ↔ 研究工作台」之间切换。

### 问题 6：对话流工具卡、里程碑卡、终稿阅读与图谱的精细度短板

1. **工具卡展开是裸 JSON 参数截断**（[ResearchToolCard.tsx](../../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx)）：点击展开 `web_search` / `web_fetch` / `spawn_teammate` / `subagent` 时，直接 `<pre>{previewDetail.slice(0, 600)}</pre>` 吐出未格式化的原始 JSON 字符串，既不展示检索命中的网页列表/域名图标（DSH `ui-primitives` 现成有 `SearchBlock`、`WebBlock`、`LinkIconMedium`），也不支持从 `spawn_teammate` 工具卡一键点进该队员的子会话观察。
2. **回合尾里程碑卡存在双语漏网与交付卡重复**（[ResearchMilestoneCard.tsx](../../../../packages/deep-research-pack/src/client/ResearchMilestoneCard.tsx)）：
   - `<Tag tone="outline">{m.kind}</Tag>` 直接把内部枚举字面量 `'protocol' | 'review' | 'delivered'` 裸渲染到中文界面；
   - 在交付回合，DSH 原生 `ui-deliverables` 已经在 `conversation.chat.turnTail` 渲染了精美的 `present` 交付文件卡，紧接着 `ResearchMilestoneCard` 又渲染一条「已交付研究报告」横条，视觉重复。
3. **终稿精读缺少“悬停即看证据”与双栏导航协同**（[ResearchFinalTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx)）：
   - 顶部同时存在 `.strip`（带旧文字切换链接 `看审计版 / 看读者版 / 过程`）与 `.controlsBar`（`SegmentedControl` `读者版 / 审计版 / 核查清单` + `分屏审阅`），**两栏职责重叠，吃掉宝贵的纵向阅读视口**；
   - 正文点击 `[来源: evidence/xx.md]` 虽能分屏打开 `ResearchEvidenceTab`，但**缺少悬停 `HoverCard`（配合 `HoverCardGroup`）轻量预览**：读者每核对一处引用都得触发分屏切换，缺乏“指哪看哪（显示信源等级 A/B、发布域名图标、核心摘录、一键打开原网页/固定分屏）”的丝滑感；
   - `ClaimsAuditView` 缺少按状态筛选（如一键只看 `部分支持 / 未核查 / 反证`），当报告有 20+ 条 claim 时难以快速聚焦风险点。
4. **研究图谱可读性弱且存在英文硬编码残留**（[ResearchGraphTab.tsx](../../../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) + [DagMap.tsx](../../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)）：
   - 头部硬编码了 `'top-level'`、`'nodes'`、`WAVE ${wave.level + 1}` 等未本地化文本；
   - `DagMap` 节点固定 `108×32px`，只画 `W1.1` + `broad-scan`（节点类型），完全看不出这个节点**在查什么子问题、由哪个角色负责**，且在右栏宽屏/全屏（`fullscreen`）模式下不会自适应舒展。

---

## 三、DSH 开发环境的高杠杆原生能力矩阵（零魔改可接入）

经核查 `vendor/dsh/packages/` 真实源码，以下机制均为 DSH 一等公民，可在严守 `vendor-clean` 铁律下直接赋能本包：

| DSH 原生能力 | 权威源码锚点 | 机制特性 | 可解锁的二期 UX 跃迁 |
|---|---|---|---|
| **Host 会话投影（`sessionProjections`）** | `vendor/dsh/packages/experimental/agent-team/src/index.ts`、`projection.ts`（`ctx.root.sessionProjections.register`） | Host 从已提交的会话日志确定性增量折叠出轻量投影，经 `useSessions(s => s.projectionsBySession[id]?.values.xxx)` 自动推给所有已连接浏览器，带 checkpoint 缓存、零额外 WebSocket | **一举打通全局 Session ↔ Run 索引**：① 解锁左栏 `sidebar.session.row.leading` 与 `.hover`（显示 `⏳等你拍板 / 进行中 / ✓已交付`）；② 让 Research Hub 的 `RunsView` 支持一键跳回对应研究会话；③ 替代客户端多处重复扫全量历史事件 |
| **左栏会话行动作与悬停槽** | `vendor/dsh/packages/client/ui-workspace/src/client/contract/slots.ts`（`sidebar.session.row.leading`、`.hover`、`sidebar.workspaces.session.menu.item`、`.row.action`） | root 作用域、零强制激活开销；只读 `useSessions` 投影即可为每行加状态标、悬停研究摘要（绑定 `drt_<slug>` / 阶段）、`...` 菜单「打开终稿」 | 多场并行研究管理体验质变，左栏直接成为“活的研究队列” |
| **客户端斜杠命令与弹窗（`ctx.commandUi`）** | `vendor/dsh/packages/client/ui-commands/src/client/contract.ts`（`register` / `decorate` / `popupSelect` / `action`） | 原生支持 `MenuSurface` 毛玻璃、模糊搜索、分组吸顶标题（`MenuGroup`）、当前激活项默认高亮、`+` 号菜单自动收录 | ① `decorate('research-defaults')` 提供交互式默认设置弹窗；② 新增 `/lens`（8 大研究透镜速选插入）、`/method`（方法库速选）、`/hub`（打开研究工作台） |
| **结构化 `@` 引用触发器（`ui-input-trigger`）** | `vendor/dsh/packages/client/ui-input-trigger/src/types.ts`（`InputTriggerSource`、`ReferenceCodec`、`openReference`） | 在 Lexical 编辑器中键入 `@` 提供分组补全（支持 `drill` 下钻与面包屑），选定生成原子引用胶囊，点击胶囊免提交直接右栏预览 | 在追问或 HITL 反馈时，键入 `@` 直接点选本场 `evidence/*.md` 或 `W2.1` 计划节点作为精确上下文胶囊，点击胶囊在右栏打开对应证据卡 |
| **已发送消息结构化渲染（`uiConversation.userText`）** | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts`（`conversation.user.text.node` + `ReferenceChip`） | 纯同步匹配器将用户消息中的特定语法 token 渲染为行内交互式 `ReferenceChip`，保留复制/编辑原文不变 | 用户粘贴/发送的 `drt_<slug>/W3.1`、`evidence/xx.md` 或透镜标记在聊天气泡内自动变为可点击跳转芯片 |
| **Hero 紧凑选项槽（`conversation.hero.options`）** | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` | 紧贴空白会话 `Workspace` 与 `Deep Research Lead` 选择器右侧的同行紧凑槽位 | 把“方法/深度预设速选”与“打开研究工作台”优雅收进 Hero 控制行，大幅瘦身 `StartCard` |
| **富语义输出组件与站点图标** | `vendor/dsh/packages/client/ui-primitives/README.zh.md`（`SearchBlock`、`WebBlock`、`PathLabel`、`LinkIconMedium`、`HoverCardGroup`、`InlineEditor`、`ShortcutKeys`） | DSH 官方打磨的检索/网页卡片、左侧渐隐路径组件、40+ 知名站点矢量图标、共享延迟互斥悬停预览组 | ① 工具卡展开显示真实搜索结果与站点图标而非裸 JSON；② 终稿引用悬停通过 `HoverCardGroup` 秒开证据摘要卡；③ 路径统一用 `PathLabel` |
| **右栏全屏形态与保活（`sidebarRight`）** | `vendor/dsh/packages/client/ui-sidebar-right/src/client/contract/slots.ts`（`sidebar.fullscreen`、`toggleFullscreen`、`keepMounted`） | 原生支持单栏推挤（`push`）与沉浸全屏（`fullscreen`）无缝切换不重挂载；组件经 `useTabInfo().sidebar.fullscreen` 感知当前模式 | ① 终稿在 `fullscreen` 下自动切换为「左目录 + 中正文 + 右常驻证据/核查栏」三栏沉浸阅读台；② 图谱在 `fullscreen` 下切换为宽画布完整节点卡片 DAG |
| **全局键盘快捷键（`ctx.shortcuts`）** | `vendor/dsh/packages/client/shortcuts/README.zh.md` | 跨平台键位注册、冲突检测、自动进入全局快捷键速查面板与 `Tooltip.shortcutKeys` | 注册打开/收起研究状态、切换终稿读者/审计视图、打开全局研究工作台等快捷键 |

---

## 四、二期 UX/UI 目标架构重塑蓝图（五大体验支柱）

### 支柱 A：去说明书化的「意图优先」首屏（Intent-First Onboarding）

1. **瘦身 `StartCard`，消除重复控件**：
   - 当会话已绑定有效研究工作区时，不再重复喧宾夺主地渲染第二套工作区路径大框（工作区切换已由 DSH Hero 原生 `WorkspaceChip` 承担；仅在未选工作区或首次引导时突出目录确认）；
   - 删掉三段式说明书长文与凭据絮叨，改为**极简一行副标题 + 4–6 张带题型标签（全景/对比/尽调/核查）的可点击起题灵感卡 + 最近进行中/刚交付的 1–2 场 Run 快捷续接条**。
2. **Hero 同行选配（`conversation.hero.options`）**：在 `Deep Research Lead` 旁提供轻量「方法 / 透镜」胶囊入口，开题前点两下即可组合本次偏好，无需先绕去右栏或全局面板。

### 支柱 B：阶段自适应（Phase-Adaptive）的「研究状态」驾驶舱

将 `ResearchStatusTab` 从“10 层平铺流水账”重排为**随研究生命周期自动聚焦的 3 层清晰结构**：

1. **顶部：当前态势焦点卡（Focus Hero）**——摒弃常驻绿底五问框，按 4 种阶段切换唯一视觉焦点：
   - **立项期（HITL1）**：聚焦展示 `ProtocolCard`（研究契约草案）+ 待答问题提醒；
   - **推进期（Running）**：紧凑单行/双行阶段进度条（当前波次 + 活跃角色 `TextShimmer` + 有效证据计数），收起无关历史噪音；
   - **审阅期（HITL2）**：聚焦展示 Critic 核查就绪度（Claim 支持率 / 缺口警示）+ 一键「分屏审阅终稿」主按钮；
   - **已交付（Delivered）**：清爽交付印章 + 「沉浸精读终稿」主按钮（删掉状态页里重复的 `<details>` 三种改法，统一收口至终稿页尾）。
2. **中段：交互式 `QualityRadar`（证据覆盖矩阵）**：
   - 紧凑化表头，支持点击任意 `Topic × Lens` 单元格：命中格展开该格下的证据卡列表（带质量等级 `A–D`、`LinkIconMedium` 域名图标，点选即在右栏打开 `ResearchEvidenceTab`）；缺口格（`0`）悬停提示为何是必查盲区。
3. **底部：按波次/角色聚合的干净动态流**：
   - 淘汰粗糙 emoji 拼接（`🔍3 · 🌐2`），改用 `ui-primitives` 标准矢量图标、`StateDot` 与对齐的数字徽章；队员行右侧提供一键「查看队员会话」入口（复用 `agentTeam` 子会话导航）。

### 支柱 C：基于 Host `sessionProjections` 的「Session ↔ Run 全域贯通」

1. 在 `packages/deep-research-pack` 新增轻量只读 Host 插件行（如 `research-projection`），调用 `ctx.root.sessionProjections.register` 从会话日志增量派生 `researchRun` 投影（`{ slug, status, hitlPending, deliveredPath, updatedAt }`，零磁盘额外文件写入、100% 遵循 DSH `持久日志，派生状态` 教义）。
2. **左栏会话列表亮灯**：接入 `sidebar.session.row.leading`（空闲但挂起 HITL 时亮琥珀提醒点，已交付亮完成标）与 `sidebar.session.row.hover`（悬停显示 `drt_<slug>` 与阶段摘要），并在会话 `...` 菜单加入「打开研究终稿」。
3. **修复并升级 Research Hub `RunsView`**：
   - 将磁盘 `drt_*` 目录与 `projectionsBySession` 关联：每张 Run 卡片不仅能看产物统计，还能**一键打开对应研究会话**（`in_progress` 卡片从此拥有「进入会话查看进度」主操作；`delivered` 卡片先切到所属会话再打开终稿，彻底根除跨会话串台 BUG）。

### 支柱 D：Composer 原生 `/` 与 `@` 研究指令流 + 砍掉冗余配置入口

1. **接入 `ctx.commandUi`**：
   - `decorate('research-defaults')`：键入 `/research-defaults` 弹出分组交互选择框；
   - `register` 客户端命令：`/lens`（弹出 8 条内置透镜，带 `when/bias` 副标题，选中向输入框填入结构化透镜要求）、`/method`（弹出本工作区方法库与内置打法）、`/hub`（直达研究工作台）。
2. **评估收敛双方法库入口**：
   - 全局 `ResearchHubPanel` 已能在任意时刻（含空白会话）打开方法库，且配备顶部导航与快捷键后，可评估将 `conversation.view` 里的第二个「方法库」tab 退役（或降级为跳转到全局 Hub 的轻量动作），从而**彻底删除 `styles.ts` 中脆弱的 `installCoachComposerStyles` `:has(...)` 外层输入框隐藏补丁**，并清理 `ResearchConfigTab.tsx` 中不可达的 `COMPACT=false` 历史死代码。

### 支柱 E：沉浸式终稿精读台（Hover 溯源 + 全屏三栏 + 丰富工具卡）

1. **终稿顶栏合一与全屏自适应（`ResearchFinalTab`）**：
   - 合并 `.strip` 与 `.controlsBar` 为单条精致工具栏（左侧 `SegmentedControl` `读者版 / 审计版 / 核查 (N)` + 版本 `Menu` 选择器，右侧目录开关、分屏按钮与全屏切换）；
   - 当 `useTabInfo().sidebar.fullscreen === true` 时，自动展开为宽屏学术/投研阅读布局：**左侧常驻可高亮当前小节的 Sticky TOC + 中央舒适阅读列宽（`68ch–76ch`）正文 + 右侧常驻证据卡/核查对照栏**。
2. **行内引用悬停预览（Inline Citation HoverCard）**：
   - 在终稿渲染层为 `[来源: evidence/xx.md]` 链接挂载共享 `HoverCardGroup` 的内联预览：指针悬停 150ms 即浮出卡片（标题、`Quality A/B` 标签、`LinkIconMedium` 来源网站图标、核心摘录前 3 行、「分屏固定打开」与「访问原网页」按钮），无需每次点击切屏。
3. **`ClaimsAuditView` 风险过滤器**：顶部统计胶囊改为可交互筛选 `Pill`（全部 / 仅看存疑与未核查 / 完全支持），审阅 30 条结论只需 5 秒锁定薄弱环节。
4. **对话流工具卡与里程碑打磨**：
   - `ResearchToolCard` 接入结果解析：展开 `web_search` / `web_fetch` 渲染结构化网页条目与 `LinkIconMedium` 域名图标，展开 `spawn_teammate` 展示角色任务说明与跳转按钮，彻底告别裸 JSON 截断；
   - 修复 `ResearchMilestoneCard` 的英文枚举裸露，并在已有 `ui-deliverables` 交付卡同轮去重合并，保持对话流干净利落。

---

## 五、调研实验计划（X1–X6：小步探针 → 视觉对比 → 择优立卡）

为了避免“一口气大改却偏离直觉”，建议在 `_backlog/research/cockpit-ux-v2/` 内按以下 6 个独立可验证的实验推进：

| 实验编号 | 实验主题 | 验证什么关键假设 / 技术边界 | 预期产出物 |
|---|---|---|---|
| **X1** | **Host `researchRun` Session Projection 可行性探针** | 验证在不碰 `vendor/dsh` 前提下，pack 新增 host 子路径注册 `ctx.root.sessionProjections.register` 能否被浏览器 `useSessions` 实时读取，以及冷启动回放开销与 `sidebar.session.row.leading` / `RunsView` 会话反查的精确度 | 机制验证报告 + 投影数据结构契约 |
| **X2** | **Composer `/` 命令弹窗与 `@` 证据引用原型** | 验证 `dsh.client.inject` 注入 `@deepseek-ai/dsh-client-ui-commands` 与 `@deepseek-ai/dsh-client-ui-input-trigger` 的模块表兼容性（`client-half` / `client-bundle-purity` 门禁是否放行），实测 `/lens`、`/method` 弹窗交互手感 | 可运行原型 + 门禁兼容性结论 |
| **X3** | **「研究状态」阶段自适应重排 & 交互式雷达视觉稿** | 用真实 `drt_*` 夹具对比现状“10 段堆叠”与新“4 阶段焦点卡 + 可下钻覆盖矩阵 + 去 emoji 动态流”在 380px 窄栏下的首屏信息密度与扫读速度 | 前后对比截图（Light/Dark）+ 布局规格 |
| **X4** | **沉浸式终稿精读台（悬停证据卡 + 全屏三栏）实验** | 验证在 `MarkdownText` 自定义渲染路径中挂载 `HoverCardGroup` 异步懒加载 `evidence/*.md` 摘要的流畅度，以及 `sidebar.fullscreen` 响应式三栏阅读排版 | 交互录屏/截图 + 组件拆分方案 |
| **X5** | **首屏降噪与配置入口收口方案** | 对比保留 vs 退役 `conversation.view` 重复「方法库」tab 的利弊，设计 `conversation.hero.options` + 瘦身版 `StartCard` 首屏草图，清除 `installCoachComposerStyles` DOM hack | 首屏前后对比图 + 入口收敛决策表 |
| **X6** | **对话流研究工具卡富渲染与里程碑去重** | 验证 `ToolCallViewProps` 中 `block.result` 的结构解析，用 `LinkIconMedium` / `SearchBlock` / `WebBlock` 替换裸 `<pre>` JSON，修复 `ResearchMilestoneCard` 枚举裸露与交付重复 | 工具卡全状态截图 + 折算单测矩阵 |

---

## 六、待与用户对齐的关键方向选择

在启动具体实验与改动前，有 4 个产品级取舍值得先对齐：

1. **最痛的第一优先级**：你当前体感最别扭的是 **① 首屏与开题配置体验（StartCard 啰嗦 + 配置四处找）**、**② 运行期的过程感知（左栏看不出状态 + 右栏状态页太杂乱 + 图谱难读）**，还是 **③ 交付后的报告精读与核查体验（终稿排版 + 悬停查证据 + 全屏阅读）**？
2. **「方法库」双入口去留**：现在左侧全局「研究工作台」已经常驻了完整方法库，是否同意**收掉会话顶栏重复的「方法库」tab**（改成从全局工作台或 `/method` 进入），从而彻底删掉隐藏主输入框的全局 CSS hack 并让对话区回归纯粹？
3. **Host 轻量投影的边界**：引入一个零磁盘副作用的 Host `sessionProjections`（让左栏会话行亮起研究状态灯、让 Research Hub 能一键跳进对应研究会话），属于 `packages/deep-research-pack/src/` 新增一个极薄 host 投影子入口，是否符合你对“充分利用 DSH 原生机制”的预期？
4. **实验推进方式**：是希望先挑 1–2 个高优实验（如 **X1 会话↔Run 打通 + X3/X4 状态与终稿重塑**）在活通道（`run-driver up`）里做出真实可交互界面给你直观体验，还是先把 X1–X6 全部做完一轮可行性探针再统一立卡？
