---
status: 已结
opened: 2026-11-27
---

# 推敲：UX/UI 第三轮盲区核查计划（ef5aff1f 复验、全英文与热切语言、多工作区 Hub 路由、工具卡/Agent Team 与深边缘矩阵）

> 立卡：2026-11-27 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [2026-11-27-cockpit-ux-ui-round3-verification](../../../notes/implemented/2026-11-27-cockpit-ux-ui-round3-verification.md)（业务验收 owner = 用户；2026-11-27 确认三轮核查闭环，Note 与归档同变更落盘）
> 前置依据：[2026-11-27-cockpit-ux-ui-deep-blindspots-verification](2026-11-27-cockpit-ux-ui-deep-blindspots-verification.md) · [2026-11-27-cockpit-ux-ui-blindspots-fixes](../../../notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md) · [40-research-cockpit](../../../docs/design/40-research-cockpit.md)

**问题与期望结果：** 前两轮核查已把主路径静态表面、Dark/480px 布局、方法库/配置基础深交互、`Final`/`Claims`/`Evidence`/`Graph` 主态与焦点保护里的 22 项真缺陷（`BUG-436…457` + `BUG-435`）全部打穿并已经在 `ef5aff1f` 修复归档。复盘历史执行面，仍有一大片**从未成体系真机过完的 UI/UX 盲区与 `ef5aff1f` 新引入边界**：

1. **`ef5aff1f` 修复边界与活通道镜像实态**：
   - `notes/implemented/2026-11-27-cockpit-ux-ui-blindspots-fixes.md` 明确记载，交付收尾时 `run-driver.mjs up --force-probe` 因在跑通道 `3083` 存在 host chunk 漂移而录得 `NOT-RUN`（`exit 2`），重启后完整活通道镜像状态尚未实机复验；
   - `FinalToc.tsx` 新正则对**含成对括号的 Markdown URL**（如 Wikipedia 条目链接）、引用块内 `> ## heading` 及跨 `reader`/`audit` 视图切换后的锚点行为尚未核实；
   - `DefaultsPanel` 新增的 `方法库 ›` 在 `ResearchConfigTab`、`ResearchHubPanel -> Lenses` 与**空工作区 / 无匹配会话**三种宿主里的跳转与提示一致性尚未核对；
   - `ResearchConfigTab` `switchMenuList` 在**超多条目（≥12 条）+ 720px 视口**下的滚动与遮挡、`MethodLibrary` 在**编辑同名已有条目（非另存覆盖）**时误报重名警告与否、`BUG-455/456` 的**英文文案**均未实跑。
2. **全量英文模式（`locale: en`）与免刷新实时切换语言（`zh <-> en`）**：
   - 首轮仅跑过英文静态基础页，第二轮新增与改版面（`ResearchHubPanel` 全 4 个页签、`RunsView`、`LensesView`、`DefaultsButton`/`DefaultsPanel`、`MethodLibraryView`、`ResearchConfigTab`、`ClaimsAuditView`、`ResearchEvidenceTab`、`GraphVersionRail` diff、`ResearchMilestoneCard`）**从未在真机英文 UI 下系统核查**；
   - 浏览器不刷新直接在设置切 `zh <-> en` 时，[coach-sessions.ts](../../../packages/deep-research-pack/src/client/coach-sessions.ts) `migrateKnownCoachTitles` 是否漏改或误改用户自定义标题、各类 `useState`/缓存标签/弹窗标题是否原地同步，从未真机实测。
3. **多工作区 / 多目录状态隔离（`ResearchHubPanel` · `RunsView` · `DefaultsButton`）**：
   - 双工作区并发在场（例如空白目录 `empty-ws` 与含 run/方法库/默认项的 `research-workspace`）时，切换当前会话或关闭会话后打开 `Research Hub`，[ResearchHubPanel.tsx](../../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx)、[RunsView.tsx](../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) 与 [LensesView.tsx](../../../packages/deep-research-pack/src/client/research-hub/LensesView.tsx) 到底跟随当前选中会话、历史持久化工作区还是 `sessions.ids[0]`，其「以此透镜发起研究」与默认项归属极易串台；
   - `RunsView` 跨三目录桶（`.` / `archive/` / `_abandoned/`）与筛选胶囊（全部 / 当前 / 归档 / 停放）、已归档/停放 run 点击「打开终稿」、及桶目录 `chmod 0000` 触发的 `dirErrors` 横幅尚未实机过完。
4. **流式工具卡、Agent Team 队员实时动态（`useMemberActivity`）与未覆盖卡件**：
   - [MethodLibraryToolCard.tsx](../../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)（`upsert` / `remove` / `set_default` + `set`/`clear` + 流式半截 JSON 参数）、[ResearchToolCard.tsx](../../../packages/deep-research-pack/src/client/ResearchToolCard.tsx)（`spawn_teammate` / `subagent` / `TOOL_OUTCOME_UNKNOWN`）、[ResearchMilestoneCard.tsx](../../../packages/deep-research-pack/src/client/ResearchMilestoneCard.tsx)（超长路径、480px 换行、终稿跳转）此前因手工拼装 `.jsonl` 被 runtime 拒载而未能上真屏；
   - 真实/录制 `agent-team` 队友活动投影在 `ResearchStatusTab` 成员列表、四轴 `stalledBanner`、`Graph` [WorkerChips.tsx](../../../packages/deep-research-pack/src/client/research-graph/WorkerChips.tsx)（`>3` 子 agent 折算 `+N`）与 `openOwner` 抽屉跳转从未真机联动。
5. **各 Tab 深水边缘态与故障/降级矩阵**：
   - `Final`：`v1.md` 与 `readable-v1.md` **双坏（atomic clear）**、仅草稿无终版横幅、`claims.json` 非法 JSON vs `verdicts-r<N>.json` 非法 JSON 组合、尾部优先项预填多轮覆盖确认；
   - `Evidence`：含 `javascript:` / 非法协议外部 URL 的 `safeExternalUrl` 拦截渲染与视觉表现、长摘要、空字段；
   - `Graph`：**零边纯节点扁平布局**、`GraphNotices` 点击跳定位、无剪贴板权限下 `NodeCard` 复制引用降级、`<details>` 原始 `plan.md` 展开、`snapshots` 为 `unreadable`/`invalid` 时 `v1/v2` diff 控件降级；
   - `Status` & `Config` & `StartCard`：`kickoffHold` / `pendingBinding` / `receiptIssue` / `planVersionUnknown` / `triageDetails`、非 `active` / 超时发令回执、`StartCard` 选目录报错（`startChooseWorkspaceFailed`）与已选空白目录提示；
   - `DefaultsButton`：`<Tooltip>` 套原生 `<button title>` 双重浮窗重叠、超长受众/方法名截断与面板对齐。
6. **高并发交互、弹窗焦点陷阱与无障碍深检**：
   - `Modal` / `SelectMenu` / `switchOpen` 的 `Tab` / `Shift+Tab` 焦点锁定、`Escape` 关闭后焦点准确回到触发按钮（含内层与外层嵌套返回）；
   - `MethodLibrary` 脏草稿未保存切换提示（原生 `confirm` / 守卫）、极快连点会话列表 / Tab 切换下的竞态与定时器泄漏（不闪现上一会话数据）；
   - `Final` / `Claims` / `Evidence` / `Graph` / `Status` 在 **Dark 模式 + 480×800px 窄屏 + 英文超长单词**下的重叠、横滚与对比度复查。

本计划遵循前两轮同一纪律：**零重复只攻新盲区、以真实 DSH Web + Playwright 为准、遇到问题直接建 `BUG-458+` 卡、不顺手修代码也不放宽判据**。

**当前情况：**
- Stage 0–Stage 6 已全部执行完毕：基于真实 DSH Web + Playwright Chromium（隔离临时家目录与临时工作区）完成五批真机矩阵，**共检出并建卡 5 项新 UX/UI 缺陷（`BUG-458`…`BUG-462`）**，同步登记于 [_backlog/bugs/README.md](../../bugs/README.md) 活跃表，全量结果、截图/日志实证与 `NOT-RUN` 边界已落入下方执行记录，待用户拍板定夺后并入修复闭环与 `notes/implemented/2026-11-27-cockpit-ux-ui-round3-verification.md`。

**未决问题：**
1. 本轮如在真机通道复用录制会话夹具（而非手写简化 `.jsonl`）渲染 `MethodLibraryToolCard` / `ResearchToolCard` / `agent-team` `spawn_teammate` 投影，需确保仅注入孤立沙箱 `runtime/` 临时会话目录，绝不修改 `tests/fixtures/` 或仓库正本文件。
2. 如在核查中发现 `ef5aff1f` 修补点在新边界下仍有残余异常，均按新卡 `BUG-458+` 独立建卡并标注关联旧 BUG 号，不改写已归档历史卡。

**下一步：** 用户确认本计划并回复「开跑」（或通过 `/goal` 启动）后，按 **Stage 0（ef5aff1f 复验与通道重启核对）→ Stage 1（全英文与免刷新热切语言矩阵）→ Stage 2（多工作区 / 三目录 Hub 与 Defaults 深态）→ Stage 3（流式工具卡、Milestone 与 Agent Team 实时动态）→ Stage 4（Final / Evidence / Graph / Status / Config 深边缘矩阵）→ Stage 5（键盘无障碍、焦点陷阱、竞态与 Dark/480px 压测）→ Stage 6（缺陷建卡汇总与报告交接）** 顺序自主执行并实时建卡。

---

## 核查纪律（延续前两轮铁律）

1. **只查历史空白与 `ef5aff1f` 修复边缘**：跳过已在上轮 100% 验证通过且代码未改的静态用例，把全部精力投向跨界交互、新代码边缘、英文/多工作区与活流卡片。
2. **真 DSH 进程 + 真实 Playwright 浏览器裁决**：UI 断言、滚动裁剪、焦点流转、弹窗重叠与热切语言一律跑真 Chromium；仅当浏览器 API 受系统宿主限制（如 macOS 原生 Finder 目录弹窗）时诚实记录 `NOT-RUN` 边界，可控 RPC/目录桩需在报告中明确标注“注入边界”。
3. **见错即建 `BUG-458+` 卡，绝不修补或洗绿**：每发现 1 条实锤问题（样式崩坏、文案截断、焦点丢失、状态串台、假报错、功能无响应等），立即按 [_backlog/bugs/README.md](../../bugs/README.md) 模板独立建卡并附上可复现命令、截图路径、真实 DOM/日志输出与源码文件定位。
4. **只读红线**：严禁修改 `packages/deep-research-pack/` 源码、`vendor/dsh/` 子模块或污染仓内 `research-workspace/`；一切临时沙箱放 `runtime/` 孤立 `DSH_HOME`。

---

## 覆盖矩阵（第三轮专攻盲区清单）

### Stage 0 · `ef5aff1f` 复验与活通道镜像重启校验

- **目标**：验证 `ef5aff1f` 补齐后的真机环境完整生效（消除此前因 `3083` 进程未重启导致的 `NOT-RUN` 盲点），并压测 `BUG-451…457` 修复代码的新边界输入。
- **核查清单**：
  1. **洁净环境与通道重建**：先检查 `zsh -c 'source tools/env.sh && pnpm verify && pnpm test'` 状态，随后**先停旧通道再冷启** `node tools/channel/run-driver.mjs up --force-probe`，确认宿主共享块（`defaults.js` / `method-library` / `client`）全部与当前 `HEAD` 一致，Blank Session 启动后立即打开引导卡并带预填能力；
  2. **`FinalToc` 新边界对抗（[FinalToc.tsx](../../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx)）**：构造含如下标题的 `readable-v1.md` 并真机点击跳转：
     - 标题内带**含括号 URL**的 Markdown 链接（如 `## 参考 [United Nations](https://en.wikipedia.org/wiki/United_Nations_(disambiguation)) 说明`），检查目录显示文本是否残留 URL 碎片或解析断裂；
     - 引用块伪标题 `> ## Quoted Heading` 与代码块内 `#` 行，核对 DOM 查询 `nodes[index]` 会不会产生目录项与正文索引错位；
     - 同一会话内先点目录跳滚、切换到「审计源」、再切回「读者版」，检查目录开合态与二次点击滚动是否仍有效；
  3. **`DefaultsPanel` `方法库 ›` 全宿主检查（[DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)）**：
     - 分别在「研究配置 tab」「Research Hub → Lenses」「无绑定会话时的 Global Hub」三处点击 `方法库 ›`；
     - 检查方法库页签是否准确高亮打开、空会话/未选方法库入口时有没有静默无响应或错误焦点；
  4. **`ResearchConfigTab` 超多条「换一条」与 `MethodLibrary` 同名编辑检查（[ResearchConfigTab.tsx](../../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx)、[views.tsx](../../../packages/deep-research-pack/src/client/method-library/views.tsx)）**：
     - 写入 **14 条**方法条目的 `method-library.md`，在 `720px` 高度下打开「换一条」悬浮列表（`switchMenuList`），验证 max-height 滚动、搜索输入不丢失焦点、底部条目可点击且不与宿主边框重叠；
     - 编辑**已存在的条目自身**（改正文不改名，或改空格后还原同名），确认不会误触发 `BUG-456` 的“同名将覆盖已有方法”警告；仅在编辑 A 时把名字改成另一个已有条目 B 时才弹覆盖提示，再新建同名 C 验证中文与英文双语覆盖警告；
  5. **`TrackRail` 与 `StartCard` 边界检查**：核对 `reentry` 徽章在 `zh`/`en` + `480px` 窄屏下与主轨节点无重叠；核对 `StartCard` 点「发起研究」把问题真填入对话草稿框（而非只打开空白输入框），且草稿框已写字时按 `whenDraftExists: 'keep'` 保留原草稿不覆盖。

---

### Stage 1 · 全英文界面（`locale: en`）与免刷新实时切换语言矩阵

> 覆盖首轮漏检的英文态，以及第二轮所有新增 Hub / Defaults / Claims / Evidence / Diff / Milestone 界面在英文下与热切语言下的表现。

- **1.1 全量英文静态与交互审计（`locale: en`）**：
  1. 切换 DSH 设置为 `en`，逐一打开并截屏排查文本溢出、截断、中英文混杂（漏翻译 key / 回退中文 / `{placeholder}` 未替换）：
     - `StartCard` + `DefaultsButton` + `DefaultsPanel`（含方法库 `conflict` / `unreadable` / `stale` / `warnings` 英文提示）；
     - `ResearchHubPanel` 全 4 页签：`Runs`（含各状态徽章与 `dirErrors`）、`Methods`（内置参考 8 模板英文投影、来源引导、删除/覆盖确认、`MethodCoach`）、`Lenses`（8 透镜全字段英文、配对标签点击高亮、「以此透镜发起研究」发出的英文预填 prompt）、`Workspace defaults`；
     - `ResearchStatusTab`（`TrackRail`、`ProtocolCard`、`QualityRadar`、`triageDetails`、活动流折叠项）；
     - `ResearchGraphTab`（Wave 图例、`GraphVersionRail` diff 卡、`NodeCard` 详情与复制提示、`WorkerChips`）；
     - `ResearchFinalTab`（Reader/Audit 切换、`FinalToc`、`ClaimsAuditView` 统计胶囊与过滤、`FinalFollowupFooter` 后续优先级预填英文句）；
     - `ResearchEvidenceTab`（筛选器、卡片标签、外链提示）与 `ResearchConfigTab`（`thisRun` 七态、`switchMenuList`、发送回执）；
     - `ResearchMilestoneCard` / `ResearchToolCard` / `MethodLibraryToolCard` 英文展示。
- **1.2 免刷新实时语言切换（`zh -> en -> zh`）**：
  1. 打开一个含研究运行数据、已打开 `MethodCoach` 会话（默认标题 vs 用户手改标题 `我的自定义教练`）以及打开过 `ResearchHub` / `DefaultsPanel` 的浏览器页签；
  2. 在不刷新页面的前提下切换语言 `zh -> en`，再切回 `zh`：
     - 验证所有 tab 标题、按钮、`DefaultsButton` 状态胶囊、`HoverCard` 内容与 `MethodLibrary` 栏立即切语种；
     - 核对 [coach-sessions.ts](../../../packages/deep-research-pack/src/client/coach-sessions.ts) `migrateKnownCoachTitles` 是否把默认标题 `研究方法编辑` 自动迁移成 `Method Editor` 并同步回 `Research Methods`，同时**绝不篡改用户自定义的教练会话标题**；
     - 检查已有 `useState` 局部文案（如 `Defaults` 已保存回执、`Config` 回执条、`RunsView` 空态）是否卡死在旧语种。

---

### Stage 2 · 多工作区路由、三目录 Hub 归档体系与 Defaults 深态

> 检验用户真机同时存在多个工作区、多份 `research-defaults.json` 与 `archive/` / `_abandoned/` 历史 run 时的隔离性与引导体验。

- **2.1 双工作区路由与上下文一致性**：
  1. 在同一个 `DSH_HOME` 中挂载两个工作区：`WS-Empty`（干净空白目录，无 `drt_` 与 `method-library.md`）与 `WS-Rich`（含 active / archive / abandoned run、5 条方法、已设 `research-defaults.json`）；
  2. 先进入 `WS-Rich` 会话并打开 `Research Hub` 确认数据正确 → 切换到 `WS-Empty` 会话打开 `Research Hub`，验证 `Runs`、`Methods`、`Workspace defaults` 是否即时随工作区切换到 `WS-Empty`（且不残留 `WS-Rich` 条目或把 `Lenses → 以此透镜发起研究` 发错到 `WS-Rich`）；
  3. 故意保留“上一个产品工作区被删/路径不可达”时重新打开页面，核查 [startup.ts](../../../packages/deep-research-pack/src/client/startup.ts) 与 `StartCard` 的回退表现，确保不卡死或错指。
- **2.2 `RunsView` 三桶目录、筛选胶囊与权限异常（[runs-catalog.ts](../../../packages/deep-research-pack/src/lib/workspace/runs-catalog.ts)、[RunsView.tsx](../../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx)）**：
  1. 准备同时包含 `.`（含 `delivered` / `reviewed_pass` / `reviewed_fail` / `reviewed_conflict` / `in_progress`）、`archive/`（含已归档 `drt_`）、`_abandoned/`（含停放 `drt_`）与损坏 `drt_bad`（缺少/不可读核心文件）的沙箱工作区；
  2. 依次点击筛选胶囊（全部 / 当前 / 归档 / 停放），校验计数 badge 与列表一致；
  3. 在 `archive` 与 `_abandoned` 态条目上点击打开详情 / 「打开终稿」按钮，检查右侧预览窗是否顺利加载历史终稿，还是在归档路径拼接或会话定位处报找不到文件；
  4. 对 `_abandoned/` 设 `chmod 0000`（测试后复原），验证 `dirErrors` 报错横幅在中文与英文下语义准确、可局部诊断而不崩溃其余目录加载；
  5. 检查 `StartCard` 选目录报错态（`startChooseWorkspaceFailed`）：通过受控测试/故障路径触发目录选择异常，核查错误条布局与二次重选能力。
- **2.3 `DefaultsButton` 视觉与控件盲区（[DefaultsButton.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx)、[DefaultsPanel.tsx](../../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)）**：
  1. 悬停 `DefaultsButton` 观察 **自定义 `<Tooltip>` 与原生 `<button title={tooltip}>` 是否出现双重提示重叠**（重点检查源码同传 `Tooltip label` 与原生 `title` 的表现）；
  2. 分别设置极长受众（40 字无空格连续英文 / 长中文）与超长默认方法名，查看 `DefaultsButton` 胶囊截断（`max-width: 220px`）及内部 `DefaultsPanel` 对齐；
  3. 验证 `DefaultsPanel` 未知字段告警（`research-defaults.json` 含未知 key 时保留告警提示并阻断误清）、多端并发修改触发 `defaultsStale` 刷新提示、以及「清除项目默认设置」两次点击确认态下切换 tab 再回来是否安全复位。

---

### Stage 3 · 流式工具卡、Milestone 卡片与 Agent Team 实时动态

> 填补前两轮未能真机渲染 `MethodLibraryToolCard`、`ResearchMilestoneCard` 与真实 `agent-team` 队员投影的空白。

- **3.1 会话内工具卡与 Milestone 卡片真机渲染**：
  1. 基于隔离沙箱里的**真实 DSH 合法会话格式**（克隆合法夹具结构，绝不瞎造损坏 `.jsonl`）注入含下列事件的会话并在真实浏览器打开对话流：
     - `MethodLibraryToolCard`：`method_library_upsert`（完整参数 + 仅到 `"name": "x"` 的半截流式 JSON 前缀）、`method_library_remove`、`method_library_set_default`（`action: "set"` / `action: "clear"` / 未知 `action`）；
     - `ResearchToolCard`：`spawn_teammate`、`subagent`、`TOOL_OUTCOME_UNKNOWN`、`TOOL_NOT_STARTED` 与失败工具回执；
     - `ResearchMilestoneCard`：`protocol`、`review`、`delivered` 三阶段尾卡，含超长 `drt_` 目录名/终稿路径，分别点击「打开终稿」和「打开研究状态」验证右栏切 tab 与目标文件聚焦；
  2. 分别在 Light / Dark 与 `1280×720` / `480×800` 下核查卡片间距、代码/路径折行、图标对齐与按钮可点性。
- **3.2 `agent-team` 队员动态、四轴停摆与 Graph `WorkerChips` 联动**：
  1. 用含真实 `agent-team` 队员状态快照与子 agent 目录投影的沙箱会话，检验 `ResearchStatusTab` `useMemberActivity` 折叠流：
     - 正在运行（脉冲圆点）/ 待命中 / 已完成三种队友行展示，是否渗出原始内部事件类型名；
     - 触发 **四轴停摆横幅（`stalledBanner`）**，核实四轴提示文本、折叠与恢复状态在 Light/Dark 下的视觉层级；
     - 验证 [ResearchStatusTab.tsx](../../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) `kickoffHold`、`statusPendingBinding`、`receiptIssue`、`planVersionUnknown`、`triageDetails` 折叠展开的可复制话术区；
  2. 打开 `ResearchGraphTab` 验证 [WorkerChips.tsx](../../../packages/deep-research-pack/src/client/research-graph/WorkerChips.tsx)：当某节点挂载 `4+` 个子 agent 时检查前 3 枚 chip + `+N` 溢出的对齐与状态色；点击 `openOwner` 按钮核查对应子 agent 抽屉或对话是否准确打开；
  3. 复验 `delivery-watch` 在活流交付瞬间，若用户此时焦点正落在对话输入区、`MethodLibrary` `<textarea>` 或 `DefaultsPanel` 受众输入框，是否温柔提示而非暴力抢走当前键盘焦点。

---

### Stage 4 · `Final` / `Evidence` / `Graph` / `Config` 深边缘状态矩阵

> 系统过完前两轮尚未进入的单/双文件损坏组合、异常 URL、空图拓扑与异步失败态。

- **4.1 `ResearchFinalTab` 与 `ClaimsAuditView` 组合边缘**：
  1. **`v1.md` + `readable-v1.md` 双坏（atomic clear）**：核查错误条 + 重试按钮完整展现且不残留上一次终稿内容；
  2. **仅 `final.md` 工作稿在场（无 `delivered` 收据 / 无版本 `v1.md`）**：检查草稿态提示横幅、仅读审阅边界与 `FinalFollowupFooter` 在此状态下的禁用/可用逻辑；
  3. **`review/claims.json` 非法 JSON vs `review/verdicts-r1.json` 非法 JSON 组合**：验证 [ClaimsAuditView.tsx](../../../packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx) 局部降级提示、能否切回「读者版」、以及过滤计数在极端长断言列表下的 Sticky/溢出表现；
  4. **连续点击多条 `nextPriorities` 预填按钮**：核查是否礼貌衔接或覆盖确认，避免无声覆盖用户已经手动改写了一半的追问草稿。
- **4.2 `ResearchEvidenceTab` 安全边界与长内容（[ResearchEvidenceTab.tsx](../../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx)）**：
  1. 注入包含 `javascript:alert(1)`、`data:text/html`、`ftp://` 与带复杂查询参数超长 URL 的 `evidence/*.md` 卡片；
  2. 验证 `safeExternalUrl` 拦截后卡片文案与徽章是否降级为纯文本而不呈现失效死链或报错，合法超长 URL 在 `480px` 视口不撑破横向容器。
- **4.3 `ResearchGraphTab` 拓扑边缘与降级（[DagMap.tsx](../../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)、[GraphNotices.tsx](../../../packages/deep-research-pack/src/client/research-graph/GraphNotices.tsx)、[NodeCard.tsx](../../../packages/deep-research-pack/src/client/research-graph/NodeCard.tsx)）**：
  1. **零边纯节点扁平拓扑**（只有 node 无 depends_on 边）：核查 DagMap 布局排列、SVG viewBox 计算、居中/滚动不会坍缩成零高；
  2. **注意力横幅（`GraphNotices`）点击跳定位**：在长图下点击 attention 项验证目标节点平滑滚动进入视口并高亮聚焦；
  3. **`NodeCard` 剪贴板权限拒绝降级**：通过 Playwright 拦截/撤销 `clipboard-write` 权限后点击复制引用，验证 UI 给出可见反馈或降级选中提示，不静默吞错；
  4. **`plan.md` 原始源码 `<details>` 展开 + `snapshots` 状态为 `unreadable` / `invalid`**：核查版本轨（`v1/v2` 与 `diff` 按钮）的诚实报错而非空 diff。
- **4.4 `ResearchConfigTab` 异常回执**：
  1. 触发 `useConfigFeed`（[useConfigFeed.ts](../../../packages/deep-research-pack/src/client/research-config/useConfigFeed.ts)）在目标会话忙/断网/写入超时的失败与超时回执，检查重试入口、按钮解锁与未绑定/只读会话下操作引导的准确度。

---

### Stage 5 · 键盘无障碍、焦点陷阱、竞态压测与视觉终检

> 把浏览器交互放在极端操作节奏和无障碍路径下压出隐藏裂痕。

- **5.1 键盘导航与 Modal / Menu 焦点归位**：
  1. 对 `ResearchHubPanel` 内部模态窗、`MethodLibrary` 详情/删除确认/覆盖确认弹窗、`DefaultsPanel` `SelectMenu`、`ResearchConfigTab` `switchOpen` 全流程仅用键盘操作（`Tab` / `Shift+Tab` / `Enter` / `Space` / `ArrowDown` / `Escape`）；
  2. 核查：① Modal 内按 `Tab` 焦点不逃逸到背后页面；② 按 `Escape` 或关闭按钮后，焦点必须回到打开该弹窗的触发按钮（`document.activeElement` 校验），不得掉回 `<body>`；
  3. 检查 `DagMap` 节点与 `FinalToc` 目录在键盘 `Enter`/`Space` 激活后的焦点反馈与 `focus-visible` 轮廓（Dark & Light）。
- **5.2 竞态与未保存草稿保护**：
  1. **未保存草稿切走护栏**：在 `MethodLibrary` `EditorView` 修改正文且未保存，随后快速尝试切换条目标签、切换顶部子 tab（`库`/`内置参考`）、关闭抽屉或切换左侧 DSH 会话，验证脏草稿确认弹窗或状态保留是否一致、无静默丢稿；
  2. **高速连点会话与页签切替竞态**：1 秒内连续切换 `WS-Rich` 两个不同状态的会话（一个已交付 `delivered`，一个空草稿无 `drt_`），同时快速切 `Status` → `Graph` → `Final` → `Evidence`，核查最终停稳后界面是否出现**上一个会话的残影、错位版本标签或 Console Unhandled Rejection**。
- **5.3 窄屏与暗黑视觉补洞（`Dark` × `480×800px`）**：
  1. 补齐前两轮窄屏未深验的视图截图排查：`ClaimsAuditView` 统计栏 + 表格、`ResearchEvidenceTab` 卡片与筛选条、`GraphVersionRail` diff 面板、`ResearchStatusTab` `QualityRadar` 20×8 矩阵、`ResearchHubPanel` 全 4 页签在 `480×800` 与 `Dark` 主题下的截断、换行、横向溢出（`scrollWidth > clientWidth`）与对比度检查。

---

### Stage 6 · 缺陷台账建卡、证据归集与报告交接

- **执行动作**：
  1. 按真实发现顺序列建所有 `_backlog/bugs/BUG-458+` 卡，同步登记 [_backlog/bugs/README.md](../../bugs/README.md) 活跃表；
  2. 全部临时截图、Console/PageError 日志、DOM 指标报告整理归档在 `runtime/`（确保不污染 git 工作树）；
  3. 执行 `zsh -c 'source tools/env.sh && pnpm verify'` 确保新增 BUG 卡链接与门禁全部洁净通过；
  4. 更新本卡状态与交付摘要（仅实事求是列出 `PASS` / `FAIL(BUG-NNN)` / `NOT-RUN(reason)` 分层结论）。

---

## 验收标准

1. **盲区矩阵逐项落盘**：Stage 0–Stage 5 每个检查子项都有明确可追溯结果（`PASS` / `FAIL → BUG-NNN` / `NOT-RUN（说明原因）`），绝不将未覆盖项记为通过；
2. **`ef5aff1f` 复验与重点深区实证完备**：重启活通道验证通过；全英文与免刷新 `zh <-> en` 切换、双工作区 `ResearchHub` / `RunsView` 三桶目录 / `DefaultsButton`、合法夹具会话工具卡与 `agent-team` 投影、`Final`/`Evidence`/`Graph`/`Config` 深边缘态及键盘焦点陷阱与竞态压测均保留 `runtime/` 截图与日志实证；
3. **缺陷建卡规范零瑕疵**：所有发现问题均建卡于 `_backlog/bugs/` 且登记 `_backlog/bugs/README.md`，运行 `pnpm verify` 全绿；
4. **只读红线零违规**：`packages/deep-research-pack/`、`vendor/dsh/` 与仓内 `research-workspace/` 无任何未授权修改或运行态污染。

---

## 关闭条件

- Stage 0–Stage 6 全部执行完毕并输出结构化核查结果；
- 所有发现的缺陷均已按规范建 `BUG-458+` 卡并附完整复现证据；
- `notes/implemented/2026-11-27-cockpit-ux-ui-round3-verification.md` 落盘记录实跑矩阵与未证边界；
- 经用户确认闭环后，本卡状态翻为 `已结`、`可关闭：是` 并归档至 `_backlog/_archived/settled_issues/`。

---

## 第三轮执行记录（2026-11-27）

> 执行策略：仅建卡上报、零修改 `packages/deep-research-pack/`、`vendor/dsh/` 与仓内 `research-workspace/`；全量实跑证据留存于 `runtime/smoke-workspace/ux-audit-r3-2026-11-27/`。

### 新增缺陷汇总（已全部建卡并登记）

| 编号 | 严重级 | 一句话摘要 | 证据文件 |
|---|---|---|---|
| [BUG-458](../fixed_bugs/BUG-458-final-toc-truncates-markdown-links-with-nested-parens.md) | P2 | `FinalToc` `stripMarkdownInline` 对含嵌套括号 URL 的 Markdown 链接截断于内层 `)`，目录残留多余闭括号 | `batch1.log` / `r3-s0-finaltoc-parens-edge.png` |
| [BUG-459](../fixed_bugs/BUG-459-hub-runs-open-final-fails-expand-and-hardcodes-root-final.md) | P1 | `ResearchHub` 点击「打开终稿」先于 `backToChat()` 调 `openFinal` 抛错、未展开收起的右栏且硬编码 `${rootPath}/final.md` | `batch2.log` / `r3-s2-hub-open-archived-final.png` |
| [BUG-460](../fixed_bugs/BUG-460-final-segmented-control-clips-active-tab-in-narrow-split.md) | P2 | `ResearchFinalTab` `SegmentedControl` 在 `480×800` 分屏（~238px 半栏）下截断当前激活「核查清单」页签文字与白框右圆角 | `r3-s4-evidence-unsafe-url-480.png` |
| [BUG-461](../fixed_bugs/BUG-461-runs-view-copy-path-shows-copied-on-clipboard-reject.md) | P2 | `RunsView`「复制路径」将 `setCopiedPath` 置于 Promise 同步外层，剪贴板被拒仍假绿显示「已复制」 | `batch2.log` |
| [BUG-462](../fixed_bugs/BUG-462-defaults-button-renders-double-tooltip-and-native-title.md) | P2 | `DefaultsButton` 同时套用 `<Tooltip>` 与原生 `title` 属性，悬停同时渲染双浮窗 | `batch2.log` / `r3-s2-defaults-btn-hover.png` |

### Stage 0–Stage 5 逐项核查结果

| Stage / 项 | 结果 | 关键观测与证据 |
|---|---|---|
| `Stage 0.1` L0 基线 + `3083` 活通道重探 | PASS | `pnpm verify && pnpm test`（1680+276 全绿）；清理旧进程与重建 profile 后 `run-driver.mjs up --force-probe` 返回 `GREEN`（`stage0-l0.log`、`stage0-run-driver.log`） |
| `Stage 0.2` `FinalToc` 括号 URL / 代码块 / 滚动 / 切态保持 | FAIL → **BUG-458** (其余 PASS) | 含平衡括号的 `United_Nations_(disambiguation)` Markdown 链接标题在目录渲染为 `参考 United Nations) 说明`；代码块伪标题排除、`scrollTo`（0→371）与切 Audit 归位（371）均 PASS（`batch1.log`） |
| `Stage 0.3` `DefaultsPanel`「方法库 ›」三宿主直达 | PASS | `ResearchConfigTab`、工作台 `Lenses` 及空白工作区下点击均准确跳转 `Methods`（`batch1.log`） |
| `Stage 0.4` 19 条 `switchMenuList` 720p + 同名编辑 vs 撞名新建 | PASS | `19` 条门户菜单底边 `708 <= 720` 内滚（`646 > 312`）；编辑已有同名条目无误报，新建撞名正常提醒覆盖（`batch1.log`、`r3-s0-switchmenu-14items-720p.png`） |
| `Stage 0.5` `480px` 英文 `TrackRail` `↺` 锚点 | PASS | 无横向溢出与重叠（`batch1.log`、`r3-s0-trackrail-reentry-en-480.png`） |
| `Stage 1.1` 全英文静/动态面板遍历 | PASS | `StartCard`、`Config`+`Defaults`、`Graph`、`Final` Reader/Claims、`Hub` 3 页签及 `StatusTab` 绑定态全英文无残缺，零 Console/PageError（`batch1.log`、`focused.log`） |
| `Stage 1.2` 免刷新 `zh <-> en` 热切语言 | PASS（记上游契约） | 去 overlay 锁定后 Settings 切 `English`，`<html lang="en">`、`DefaultsButton`、`Graph`/`Status` 主体即时切英文；`ui-sidebar-right` 按创建时冻结已开 tab 芯片标题（上游行为，`focused.log`） |
| `Stage 2.1` 双工作区 `ResearchHub` / `Lenses` 隔离 | PASS | 切空工作区后 `Runs`/`Methods` 清空，「以此透镜发起研究」新会话正确建入空工作区（`batch2.log`、`r3-s2-hub-empty-ws-isolation.png`） |
| `Stage 2.2` `RunsView` 三桶 / `dirErrors` / 打开终稿 / 复制路径 | FAIL → **BUG-459 / BUG-461** | 三目录桶（8>=5+2+1）与 `chmod 0000 _abandoned` `dirErrors` 正常；点「打开终稿」抛 `no session surface is mounted`（**BUG-459**）；点「复制路径」拒写假绿（**BUG-461**）（`batch2.log`） |
| `Stage 2.3` `DefaultsButton` 双 Tooltip 排查 + Hub 零命中搜索 | FAIL → **BUG-462** (`2.3` 搜索 PASS) | `DefaultsButton` 同时带原生 `title` 与 `[role="tooltip"]` 叠压（**BUG-462**）；`Runs`/`Methods` 零命中搜索均给出空态提示（`batch2.log`、`final-edges.log`） |
| `Stage 2.4` `StartCard` 模板快捷键回填 & 原生目录报错 | PASS(模板) / NOT-RUN(系统弹窗) | 空白工作区点击 `StartCard` 模板按钮真实填入起手式到输入框（`gaps-r2.log`、`r3-s2-startcard-template-filled.png`）；系统 Finder 弹窗拒选报错不可编程触发（由 `start-card.spec.mjs` 覆盖） |
| `Stage 3.1a/b/c` ToolCards + Milestone | PASS | 补齐 v4 结算字段并展开 Turn 8 后：`MethodLibraryToolCard` 四态（写入/设默认/清除/结果未知）、`spawn_teammate`（ok/stopped）与 `ResearchMilestoneCard` 真机全显（`batch3.log`、`final-edges.log`、`r3-s3-toolcards-expanded.png`） |
| `Stage 3.2a/b` 丢失回执（dangling）+ `stalledBanner` + `triageDetails` | PASS | 伪造 `delivered.json` `v99` 后诚实报警「交付回执声明的终稿版本不在盘上」、展现 `⚠️ 运行停摆` 与三种改法折叠区（`batch3.log`、`r3-s3-status-dangling-receipt.png`） |
| `Stage 3.2c` 真模型活 SSE 流与 live `agent-team` | NOT-RUN | 无 `DEEPSEEK_API_KEY` 不可启动真模型生成活流与 teammate 子进程 |
| `Stage 4.1` `Final` 双坏清屏 / 单工作稿 / 损坏 claims+verdicts / 追问保留 | PASS | 双 `chmod 0000` 原子清屏、`final.md` 单草稿正确渲染、`claims.json` 损坏提示重试、`verdicts` 损坏全部如实标 `UNVERIFIED` 且切回审计版正常、追问不覆写草稿（`batch2.log`、`gaps-r2.log`、`r3-s4-final-both-unreadable.png`、`r3-s4-final-working-draft-only.png`、`r3-s4-claims-corrupt-verdict.png`） |
| `Stage 4.2` `Evidence` 安全协议过滤 & `480px` 分屏 | FAIL → **BUG-460** (安全拦截 PASS) | `javascript:`/`data:`/`ftp:` 全部剥链仅留 HTTPS 链接；但 `480×800` 分屏下左侧 `SegmentedControl` 选中「核查清单」被右缘裁成「核查清」（**BUG-460**）（`focused.log`、`r3-s4-evidence-unsafe-url-480.png`） |
| `Stage 4.3` `Graph` 零边扁平 / 不可读 `plan/v1` / 断边 `GraphNotices` / `NodeCard` 拒写 | PASS | 扁平表格渲染快照卡、`plan/v1.md` `chmod 0000` 显示读取失败重试、`NON_EXISTENT_DEP` 列入 `plan 结构提示`、`NodeCard` 拒写不假绿（`focused.log`、`final-edges.log`、`gaps-r2.log`、`r3-s4-graph-flat-and-unreadable-snapshot.png`、`r3-s4-graph-plan-issues-notice.png`） |
| `Stage 4.4` `ConfigTab` 发送 RPC 失败回执 | PASS | 显示「发送失败，草稿已保留」且解锁按钮（`batch2.log`） |
| `Stage 4.5` `DefaultsPanel` 非法值 / 未知字段 / 200 字受众 / 二次清空 | PASS | 红/黄条清晰展现、200 字不撑破容器、清空二次确认（`final-edges.log`、`r3-s4-defaults-invalid-long-audience.png`） |
| `Stage 5.1` 键盘无障碍（Menu / Modal / SVG / `ColumnHandle`） | PASS | 「换一条」Menu Escape 焦点归位；Settings 弹窗 `Tab` 锁闭环；`DagMap` 节点 `Enter` 选中；`ColumnHandle` 方向键调宽（`batch3.log`、`focused.log`） |
| `Stage 5.2` 脏草稿拦截 & 高速切会话 | PASS（记上游竞态报错） | 方法库未保存草稿切「内置参考」弹出拦截且拒后保留；高速切会话右栏未残留旧交付数据，但触发上游 `vendor` `SidebarSessionView.dispose` `Session reference is released`（`batch3.log`） |
| `Stage 5.3` `Dark × 480×800px` 视觉与溢出全扫 | PASS | `Status`(10×8 雷达)、`Graph Diff`、`Claims`(超长无空格断言)、`Evidence`、`Hub`(Runs/Methods/Lenses) 全数 `scrollWidth=480` 且 Console/PageError=0（`batch3.log`、`r3-s5-dark-480-*.png`） |
