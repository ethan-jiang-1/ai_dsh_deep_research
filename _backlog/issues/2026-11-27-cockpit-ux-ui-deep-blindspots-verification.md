---
status: 待落地
opened: 2026-11-27
---

# 推敲：UX/UI 第二轮深度盲区核查计划（交互深水区、实时流、无障碍与极限压力）

> 立卡：2026-11-27 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：implemented — `notes/implemented/2026-11-27-cockpit-ux-ui-deep-blindspots-verification.md`（全轮核查收口并产出缺陷台账后同变更落盘）
> 前置依据：[2026-11-27-cockpit-ux-ui-full-verification](2026-11-27-cockpit-ux-ui-full-verification.md) · [2026-11-27-cockpit-ux-ui-audit-fixes](../../notes/implemented/2026-11-27-cockpit-ux-ui-audit-fixes.md) · [40-research-cockpit](../../docs/design/40-research-cockpit.md)

**问题与期望结果：** 首轮 UX/UI 全量核查定位的 15 项缺陷（BUG-436…450）已在提交 `7191bdb0` 中批量修复归档。但回顾首轮执行面，核查主要集中在“主路径首屏展示 + Light/Dark/EN 静态快照 + 基础故障态”，仍有六大片真实 UI/UX 深水区**历史上从未真机端到端走通、或仅在修复当轮做过窄切片验证**：
1. `BUG-436…450` 修复补丁引入的新交互边界（`FinalToc` 滚动容器定位、分屏控件换行、`HoverCard inline` 表面、`evidence-card` 正文裁剪、`review/claims.json` + `verdicts-r<N>.json` 多轮、以及此前因主机负载未跑的 `client-load.entry.mjs`）；
2. `MethodLibraryView` 与 `ResearchConfigTab` 全套深交互（`ColumnHandle` 拖拽与键盘调节、3 来源建稿、`useRunSourcePicker`、摘要点击跳焦、`MethodCoachPanel` 访谈/表单切换、`useOperationQueue` 覆盖/删除二次确认与 `operationUnknown` 解锁、`本次研究` 七态与「换一条」回执）；
3. 外围接线入口与工作区控制（`Files` 树扩展示例接管与回退、`ResearchTabMenuItem` 跳工作台、`StartCard` 选目录取消/报错、`DefaultsPanel` 其余 6 类输入与禁用/冲突状态）；
4. `Status` / `Graph` / `Final` 未覆盖状态分叉（`useMemberActivity` 真实队员列表、停摆横幅四轴门、无边/环依赖/混合态 DAG 节点、`NodeCard` 复制与 `v1/v2` diff 卡、仅工作稿/单坏回退/30s `staleWatcher`）；
5. 实时流切片与焦点保护（`TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED` 真事件结构、流式半截入参前缀不误判、live `present` 自动开终稿时不抢输入框打字焦点）；
6. 键盘无障碍（Tab 序 / Modal 焦点归位 / SVG 节点键盘选中）与极限压测（长 URL / 20 Topic×8 Lens 矩阵 / 百条 run 与方法条目 / `480px` 已有会话方法库抽屉开关）。

本计划制定“零重复、专攻盲区”的第二轮真浏览器 + 实操压测路线；**沿用“发现即建 BUG 卡、不顺手洗绿或隐瞒”纪律**，把藏在深层交互与极限态里的 UI/UX 缺陷一次性挖净。

**当前情况：**
- `7191bdb0` 已落地并归档 BUG-436…450，新增单测 `test:spec` 已升至 1670 项；
- 上轮修补验证中，因宿主机负载守卫 `client-load.entry.mjs` 尚有 `NOT-RUN` 记录，且 `MethodLibraryView`、`ResearchConfigTab`、`useMemberActivity`、`GraphVersionRail` diff、`Final` 30s watcher、`Files` 树点击路由、流式半截工具卡、键盘无障碍与超长数据压测尚未成体系在真实 DSH Web 壳里过完。

**未决问题：**
1. 若本轮实测需对“非默认目录选择”或“多轮真模型 MethodCoach 访谈”做真机触发，在无人工系统原生文件弹窗环境下，允许哪些受控 Mock / RPC 桩边界（无法自动点击 macOS 原生 Finder 对话框时需诚实记 `NOT-RUN`/半自动边界，不伪造点击）。
2. 若在执行中遇到既有修复（如 `BUG-436…450`）仍有残余回归或边角漏网，仍按新 BUG 独立建卡（引用旧 BUG 号复发/延伸），不改卡凑绿。

**下一步：** 用户确认本计划并授权启动后，按 **Stage 0（基线与上批修复全回归）→ Stage 1（方法库与配置深交互全闭环）→ Stage 2（壳入口、Files 路由与 Defaults 全控件）→ Stage 3（Status / Graph / Final 边缘状态与 30s Watcher）→ Stage 4（流式半截工具卡、未知中断与焦点保护）→ Stage 5（键盘无障碍、Dark/480px 与极端数据压力）→ Stage 6（缺陷建卡汇总与归档交接）** 顺序静默自主推进。

---

## 核查纪律（沿用首轮不可退让原则）

1. **只查未覆盖深水区与修复后真实回归**：不重复首轮已 100% 绿过的静态快照，除非处于 BUG-436…450 修复面或其组合交互上。
2. **真实 DSH Web 进程 + 真 DOM 交互为唯一裁决**：所有拖拽、键盘输入、定时器等待、文件热改、分屏打开与焦距测试一律跑真实浏览器（Playwright + Chromium）。
3. **发现即建 `BUG-NNN` 卡，绝不擅自修补或放宽判据**：每发现一条新问题，立刻在 [_backlog/bugs/](../bugs/README.md) 建卡（带复现命令、截图/日志路径、预期 vs 实际及涉及源码定位），不顺手改代码洗绿。
4. **原生弹窗 / 环境阻塞诚实标 `NOT-RUN`**：如系统原生目录选择窗、主机高负载或模型额度限流，严格区分“未跑”与“通过”。
5. **只读红线**：不动 `vendor/dsh/`，不污染仓内 `research-workspace/`（隔离沙箱与 `DSH_HOME` 运行）。

---

## 覆盖矩阵（专攻上轮未顾及的 UI / UX 盲区）

### Stage 0 · 修复回归复验与基线对齐（防止旧病未净或补丁引入新 UI 疵瑕）

- **目标**：确认 `7191bdb0` 后全仓基线洁净，并把此前因宿主机负载 `NOT-RUN` 的入口补齐实跑；同时对 BUG-436…450 修复引入的新 UI 路径做真机对抗复核。
- **动作清单**：
  1. 用 `zsh -c 'source tools/env.sh && pnpm verify && pnpm test'` 实测 BUG-450（`zsh` 下直接 `source tools/env.sh` 隔离生效与全量 L0 通过）；
  2. 补跑上轮批注 `NOT-RUN` 的 [client-load.entry.mjs](../../checks/smoke/client-load.entry.mjs) 与全套 `cockpit-truth*` / `cockpit-locale` 门禁，确认 BUG-442 / BUG-443 真实全绿；
  3. 实跑 `node tools/channel/run-driver.mjs up --force-probe`，核验 BUG-441 在真实 Blank Session 通道上的 `statusPaneOpen=true`；
  4. 针对 BUG-436…450 修复点做**对抗性边界检查**：
     - `HoverCard inline`（[ResearchHeaderPill.tsx](../../packages/deep-research-pack/src/client/ResearchHeaderPill.tsx)）在 Light/Dark 下边框、圆角、暗黑文字可读性与视口边缘翻转；
     - `FinalToc`（[FinalToc.tsx](../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx)）面对**同名二级标题**、**带加粗/反引号/链接语法的标题**、以及**在读者版/审计版切换后再点目录**时，能否精准滚到对应正文章节；
     - `evidence-card.ts`（[evidence-card.ts](../../packages/deep-research-pack/src/lib/run/evidence-card.ts)）在 `## Question List` 之后**还有后续其它 `##` 小节**时，裁剪是否仅移除 Question List 而不误吞后文；
     - `review/verdicts-r1.json` + `review/verdicts-r2.json` 同在场时是否正确选取最高轮 r2，且 `insufficient`/`unverifiable` 统计标签正常渲染。

---

### Stage 1 · 「方法库（MethodLibraryView）」与「研究配置（ResearchConfigTab）」深交互闭环

> 首轮只测过只读列表切换与「新建→取消」，本阶段把两块配置大面板的所有写操作、分隔拖拽、弹窗流、教练联动与队列锁全部过一遍。

- **1.1 方法库双宿主深度交互**（分别在 **活跃会话左侧 `Methods` tab** 与 **Global `Research Hub` 方法库 tab** 实操）：
  1. **`ColumnHandle` 拖拽与键盘调节**：读取左右列宽 → 鼠标拖动分隔手柄向右/左拖 120px → 断言左列宽真实变化且不超 min/max 夹断；再用焦点落到 `ColumnHandle` 按 `ArrowRight` / `ArrowLeft` / `Home` 验证键盘调节与 `aria-valuenow` 同步；
  2. **三来源建稿路径全走通**：
     - 路径 ①「从零开始」填 4 字段保存；
     - 路径 ②「基于内置参考」点「以此为基础开始」检查预填内容（zh 下中文预填，en 下英文投影预填，不泄漏另一语种）；
     - 路径 ③「**基于已完成 run（`useRunSourcePicker`）**」打开 run 选择器列表，筛选并预览历史 run 提取的 4 字段，核查无 run 时空态与读 `question.md` 失败态；
  3. **摘要视图 ↔ 表单视图与教练联调**：
     - 在 [MethodSummaryView](../../packages/deep-research-pack/src/client/method-library/views.tsx) 点击单个字段直接跳转到 `EditorView` 并确认对应 `<textarea>` 获得焦点（`document.activeElement`）；
     - 切换「访谈（`MethodCoachPortal`）」↔「检查表单」：检查 `[data-method-coach-host]` 高度裁剪、`CoachChat` 滚动条可用、切换过程中外层对话 composer（`installCoachComposerStyles`）在回到对话/Hub 返回/开新会话时均不残留 `display:none`；
     - **流式/异常故障注入**：在编辑中触发 `coach` 报错/断流提示降级（表单仍可手改）；触发 **重名覆盖二次确认（`overwriteConfirm`）**、**删除二次确认**、以及队列挂起/未知态 `operationUnknown`（确认发送中锁定按钮、点击刷新恢复且提示不自动重发）；
     - 验证 **`selectedName` 跨切换清洁**：编辑中途切到 `内置参考` 再切回 `我的库`，不残留幽灵高亮与脏草稿误显示。
- **1.2 「研究配置（ResearchConfigTab）」全路径**：
  1. 实测 `本次研究` 七态（已有 `method` 已定稿 / `pending` 待确认 / 未绑定 / `question.md` 读失败独立 `retryLink`）；
  2. 点击「换一条（`switchOpen`）」弹窗：搜索过滤、选一条发出 `use-now` 指令，核对回执从 `sending` → `delivered` / `failed` 文案与样式；
  3. 弹窗细节：打开较长的条目详情弹窗（读/编辑模式），检查 `.modalBody` 在 `720px` 高视口下内滚有效、标题栏关闭按钮始终不被挤出视口，点 `⋯` rowMenu 触发 `设为默认` / `编辑` / `删除` + `confirmDelete` 二次弹窗与 `Escape` 关闭。

---

### Stage 2 · 壳级接线入口、`Files` 文件树路由、`StartCard` 与 `DefaultsPanel` 全控件

- **2.1 `Files` 树与资源扩展接管边界**：
  1. 在已绑定 run 的会话中打开右侧 `Files` 面板，真实点击文件树条目：
     - `drt_*/evidence/e1.md` → 断言打开「证据卡（`ResearchEvidenceTab`）」而不是普通文本预览；
     - `drt_*/final/v1.md` 与 `drt_*/final/readable-v1.md` → 断言由「终稿（`ResearchFinalTab`）」接管，且显示对应版本状态；
     - `drt_*/evidence/_failed.md`、`drt_*/drafts/final.md`、工作区根非 bundle 的 `final.md` → 断言**不误接管**，正确回退到 DSH 默认文本/Markdown 预览；
  2. 测试非法或手工拼接的 `dsh-resource://` 证据地址 → 验证渲染 `evidenceInvalidAddress` 提示而非白屏报错。
- **2.2 右栏页签菜单 `ResearchTabMenuItem` & Hub 跨跳转**：
  1. 打开右栏任意研究页签（Status / Graph / Final / Config），定位宿主页签溢出菜单或右键菜单中的「打开研究工作台」（[ResearchTabMenuItem.tsx](../../packages/deep-research-pack/src/client/ResearchTabMenuItem.tsx)），真实点击后断言切到 `ResearchHubPanel`；
  2. 在 Hub `RunsView` 点击某已完成 run 的「打开终稿」，断言自动切回对话并打开该 run 终稿；在 `LensesView` 展开「展开口径与边界」全部 8 条明细，点击「以此透镜发起研究」断言回到对话并在输入框填入带透镜名的提示词草稿（**不自动发送**）；点 Hub 顶部「发起新研究」验证创建新空白会话并聚焦。
- **2.3 `StartCard` 选工作区与 `DefaultsPanel` 全字段交互**：
  1. `StartCard`（[StartCard.tsx](../../packages/deep-research-pack/src/client/StartCard.tsx)）：测试 `选择项目目录` 点击交互与目录选择取消/RPC 拒绝报错 `errorDetailOf`（若浏览器端无原生 Electron dialog 桥，验证降级/报错文案清晰不卡死 `choosing` 按钮锁态），验证切换会话后 `chooseError` 瞬态自动清零；
  2. `DefaultsPanel`（[DefaultsPanel.tsx](../../packages/deep-research-pack/src/client/defaults/DefaultsPanel.tsx)）：逐一实操上轮未动的 6 组控件——
     - 输出形态 `defaults-output-shape`（SelectMenu）+ 字数区间 `min`/`max` 输入与非法数值边界（负数/min>max）；
     - 来源家族 `defaults-source-<family>` 多选 `Pill` 切换与 `defaults-source-auto` 一键恢复自动；
     - 权威级别 `authority`、时效窗 `recency`、语言 `language`、目标读者 `defaults-audience`（输入中英文长文本）；
     - 写入混合未知键 + 合法字段的 `research-defaults.json` 触发 `defaults-warnings` 黄色提醒条，确认保存防覆盖保护或提示行为；
     - 验证运行中 / 只读条件的 `disabled` 交互锁定与 `defaults-clear` 半途切换另一会话时 `confirmClear` 自动重置。

---

### Stage 3 · `Status` / `Graph` / `Final` 边缘状态组合与 30s `staleWatcher` 实机验证

- **3.1 `ResearchStatusTab` 未测状态组合**：
  1. **队员动态折叠区（`useMemberActivity`）**：构造带 `agent_team` 活成员与历史成员工具事件的会话日志（含 `busy`/`idle`/`done`/报错诊断/长角色名），验证折叠区展开/收起、`StateDot`、不溢出；
  2. **停摆横幅四轴门 & 流失败恢复横幅**：构造「已绑定 × 未交付 × 未挂起 × 静默且末回合含错」触发停摆提醒，对比「已交付/挂起中/刚有活动」三轴拆一不误显；构造末回合断流错，验证流失败恢复引导横幅；
  3. **`review` 多态交互与全链路跳链**：构造 `已交付 × review FAIL`、`review/readiness.json` 与 `review.md` 结论冲突、`review/readiness.json` 缺失三态，校验红/橙警戒条；依次实点击 `ResearchMilestoneCard`（「查看状态」「阅读终稿」）、`ResearchHeaderPill`（进行中→Status，已交付→Final）验证全部直达正确页签。
- **3.2 `ResearchGraphTab` & `DagMap` 极端与动态场景**：
  1. **无边纯平行平面图**（4 节点无 `deps`）：断言降级提示与网格节点卡片不互相重叠；
  2. **Team 任务全态映射 + 复制引用**：写入带 `in_progress` / `completed` / `blocked` / `failed` / `plan-only` / `stale` 混合状态的 Team 任务文件与 `plan.md`，核对各色圆点、`WorkerChips` 摘要、点击节点展 `NodeCard` 并点击「复制引用」按钮显示「已复制」状态且无异常；
  3. **多版本 `plan/v1` vs `plan/v2` Diff 卡视觉**：打开版本轨切换「看 v1 旧图」与「看差异」，截图核查 Light/Dark 下新增/删除/变更节点的色彩、文本对比与折行；
  4. **图谱异常处理**：构造环形依赖（`W1 -> W2 -> W1`）、悬空 `deps`（`W99` 不存在）与超节点阈值截断提示，确认 SVG 不死循环、不崩溃，清晰提示图异常。
- **3.3 `ResearchFinalTab` 回退、30s `staleWatcher` 与 `ClaimsAuditView`**：
  1. **无读者版 / 仅工作稿分叉**：验证缺 `readable-v*` 时自动落审计版、无 `final/` 时落 `final.md` 工作稿且提示条显性标「当前工作稿」，不冒充已交付；
  2. **单坏互补回退与双坏清屏**：分别损坏 `readable-v1.md`（保留好 `v1.md`）和同时损坏两者，断言前者可见提示并切至好版本、后者清正文走错误恢复屏；
  3. **真实 30s `staleWatcher` 热检测**：打开 `readable-v1.md` 在屏静止等候一个检测周期后，修改 `readable-v1.md` 内容 → 验证仅当前观看件弹出「文件已更新，点此刷新」条、点刷新消除并显示新正文；另外修改未展示的 `v1.md` 时，当前读者版视图不应误弹 stale 提示；
  4. **`ClaimsAuditView` 全 verdict 色谱 + 证据跳链**：覆盖 `supported` / `partially_supported` / `unsupported` / `unverifiable` / `UNVERIFIED` 五种标签（含 `critical` 标记）与正文长引用折行，点击 claim 卡片底部 `evidence/*.md` Pill 验证分屏打开对应 `ResearchEvidenceTab`；展开页脚「还不满意？三种改法」逐个点预填，验证写入主输入框不自动发送。

---

### Stage 4 · 实时流事件、`TOOL_OUTCOME_UNKNOWN` 与 `delivery-watch` 焦点保护

- **4.1 工具卡流式切片与中断未知态（真实 wire 事件形态）**：
  1. 在合成/回放 session 日志中按 DSH 真实 `ToolResultNode`（`vendor/dsh/packages/client/ui-conversation/src/client/contract/records.ts`）线协议（错误对象放在 `tool/result` event 的 `data.error`，而非 `data.message.error`）构造 **`TOOL_OUTCOME_UNKNOWN`** 与 **`TOOL_NOT_STARTED`**，确认 `ResearchToolCard` 渲染 `data-tool-state="stopped"`、琥珀 `StateDot` 与「结果未知（可重试）」文案（绝不标红 failed）；
  2. 验证 `PreparingToolCall` / 流式半截 JSON 参数前缀（如 `method_library_set_default` 参数半截 `{"name": "xx"` 尚未到达 `action` 字段，或 `web_search` 尚未完整 `queries` 数组）渲染「正在运行」通用文案，不把未知半截入参误读成默认破坏性动作；
  3. 点击所有工具卡 `DisclosureRow` 展开详情 `<pre>`，检查超长参数（如 600 字长 JSON）折行与窄屏不撑爆对话流。
- **4.2 实时推送与 `delivery-watch` 不打断输入焦点（真 WebSocket 活流 / CDP 实测）**：
  1. 启动真 Web + Playwright，构造流式推送（或运行受控短 research / `deliverables/presented` 实时到达事件）：
     - Case A（用户不在打字，焦点在页面空白处）：流中到达 `deliverables/presented` → `delivery-watch` 自动在右栏打开终稿页签，且同一路径二次推送不重复打开/闪跳；
     - Case B（**用户正聚焦在主输入框 `[data-composer-seat] [contenteditable="true"]` 输入草稿**）：流中到达 `deliverables/presented` → 验证后台页签正确挂载或温和提示，而 **`document.activeElement` 仍稳稳留在主输入框且正在输入的文字零丢失、光标不跳**。

---

### Stage 5 · 键盘无障碍、Dark / `480px` 深度响应式与极端压力巡检

- **5.1 全路径键盘无障碍（Accessibility & Focus Management）**：
  1. 仅用键盘（`Tab` / `Shift+Tab` / `Enter` / `Space` / `Arrow` / `Escape`）走通主路径：`StartCard` 模板键选 → `DefaultsButton` 弹出 → `SelectMenu` 方向键选值 → `ResearchHubPanel` 分段标签左右切换 → `MethodLibraryView` 列表行上下选中（校验 `focus-visible` 外框，不吞焦点）→ `ColumnHandle` 方向键调宽 → `ResearchConfigTab` 打开/Escape 关闭弹窗（校验关闭后焦点回到触发按钮）→ `DagMap` SVG 节点 Tab 聚焦与 Enter 选中 → `FinalToc` Enter 跳滚；
  2. 检查关键交互组件无 `role`/`aria-expanded`/`aria-label` 缺失或失效，无隐形遮罩拦截点击。
- **5.2 `480px` 超窄视口与 `Dark` 主题剩余面补全**：
  1. 在 **已有会话** 上缩至 `480×800`，关闭右栏切到左侧「方法库」tab，真机点击 **`[data-method-library-toggle]`** 抽屉按钮（上轮因在空白无会话页未测出），检验「库列表 ↔ 工作台」两屏切换与编辑态无溢出；
  2. 在 `480×800` 下逐个打开 `Hub`（Runs/Methods/Lenses）、`DefaultsPanel` 弹框、`ResearchConfigTab` Modal 弹窗、`Status` / `Final` 分屏（或标签切换）、`Graph` 选节点卡，全部断言 `scrollWidth <= clientWidth + 1`、关闭按钮全可达、无按钮文字贴边重叠或截断；
  3. `Dark` 主题复测：`StartCard` 模板按钮选中态、`DefaultsPanel` 警告条/下拉浮层、`MethodLibraryView` 编辑区/分隔条、`GraphVersionRail` diff 块、`EvidenceTab` 卡片与代码块、HITL 问卡 `1280px` 窄列实机（复查对比度与纯白背景残影）。
- **5.3 极端内容压力测试（Stress & Overflow）**：
  1. **超长文与畸形文本**：300 字无空格英文/URL 证据链接、包含 XSS 危险文本/Markdown 表格与 20 层代码块终稿、超长方法名（80 字符）、超长 run 问题标题；
  2. **高密度规模**：**20 个 Topic × 8 个 Lens** 的超宽 `QualityRadar` 矩阵（验证滚动/折行不把右侧栏撑穿）、**30 节点多层宽幅 DAG SVG**（验证缩放/容器内滚不溢出外框）、**60 个 `drt_*` run** 的 `RunsView` + **40 条条目** 的 `MethodLibraryView`。

---

### Stage 6 · 缺陷汇总建卡、经验回流与交付验收

- **输出物**：
  1. **新增缺陷卡**：本轮发现的所有真实 UI/UX 缺陷（按 `P0 / P1 / P2` 分级）全部按规范在 [_backlog/bugs/](../bugs/README.md) 建独立 `BUG-NNN-<slug>.md` 卡（`status: 等人拍板`，附精确可复现命令、境界、截图与日志证据路径），同步更新 [_backlog/bugs/README.md](../bugs/README.md) 并确保 `pnpm verify` 全绿；
  2. **盲区核查报告表**：输出「覆盖单元 × 验证手段 × 实跑结论（PASS / FAIL → BUG-NNN / NOT-RUN）× 证据文件」全表与优先修复建议，并保留整套截图与日志到 `runtime/smoke-workspace/` 隔离审计目录；
  3. **守卫/夹具补缺建议**：说明哪些盲区（例如 `MethodLibrary` 抽屉、长文矩阵溢出、30s `staleWatcher`、`delivery-watch` 焦点保护）建议后续收编进常规冒烟或单测。

---

## 方案与取舍

- **分批增量建沙箱 vs 写死单一大种子**：方法库写操作、30s `staleWatcher` 文件修改、20×8 超大矩阵压测互有状态污染风险——采用隔离多沙箱/分场景清理写回，互不干扰。
- **合成 Wire 事件补流式/异常窗口 vs 全靠真实 LLM 等待**：`TOOL_OUTCOME_UNKNOWN`、流式半截 JSON 参数、4 轴停摆门、30 节点 DAG 等极难由一次真模型自然撞全——采用对照 `vendor/dsh` 线协议精确回放/增量推流验证 UI 真实反应，真模型通道聚焦活流 HITL 与全角色响应。

---

## 判据形状

- **不适用**（本卡为第二轮 UX/UI 盲区全面核查计划，不直接改动生产代码或新增结构门禁；若排查出需要补齐的门禁判据，在对应修复卡或后续计划中单独立写）。

---

## 验收标准

1. **盲区清单逐项落地**：Stage 0–Stage 5 每个小项都有明确落盘结果（`PASS` / `FAIL → BUG-NNN` / `NOT-RUN（说明原因）`），零“未跑当通过”；
2. **修复回归与新盲区双确认**：`BUG-436…450` 全部关键交互通过实机对抗复核，`480px` 方法库抽屉、`ColumnHandle`、`Files` 树、`Graph` diff、30s `staleWatcher`、`delivery-watch` 焦点保护、键盘走查与高密度压力全部留有日志/截图实证；
3. **缺陷建卡规范零瑕疵**：所有发现问题均建卡于 `_backlog/bugs/` 且 `pnpm verify` 通过；
4. **干净无污染**：`vendor/dsh/` 与仓内 `research-workspace/` 无任何污损。

---

## 关闭条件

- Stage 0–Stage 6 全部完成并输出结构化核查报告；
- 所有发现问题已按规范建 `BUG-NNN` 卡（或经用户后续授权修复收口）；
- `notes/implemented/2026-11-27-cockpit-ux-ui-deep-blindspots-verification.md` 落盘记录实跑矩阵与未证边界；
- 经用户确认闭环后，状态翻为 `已结`、`可关闭：是` 并归档至 `_backlog/_archived/settled_issues/`。

---

## 第二轮执行记录（2026-11-27）

- **沙箱现场**：`runtime/smoke-workspace/ux-audit-r2-2026-11-27/`（日志：`stage0-l0.log`、`stage0-entries.log`、`batch-a.log`、`batch-b.log`、`delta.log`、`deep-hunt.log`、`final-verify.log`；截图 20+ 张于 `screenshots/`）。
- **Stage 0 基线全绿**：
  - `zsh -c 'source tools/env.sh && pnpm verify'`：PASS（确认 `BUG-450`）；
  - `pnpm test`：`test:spec` 1670/1670 PASS、`test:checks` 273/273 PASS；
  - `node tools/channel/run-driver.mjs up --force-probe`：`GREEN`（确认 `BUG-441`）；
  - `DSH_CLIENT_LOAD_ALLOW_UNHEALTHY=1 node --import tsx/esm checks/smoke/client-load.entry.mjs --seed tests/fixtures/client-load-home`：ALL PASS（补齐首轮 `NOT-RUN`）；
  - `cockpit-truth-residuals.entry.mjs`（28/28 PASS，含 30s `staleWatcher` S17 & `DefaultsPanel` S21）与 `cockpit-truth-substance.entry.mjs`（19/19 PASS）全绿。
- **Stage 0.4–Stage 5 盲区实跑发现 7 张新缺陷卡**（均已独立建卡 `status: 等人拍板`，未擅自修改产品源码）：
  - [BUG-451](../_archived/fixed_bugs/BUG-451-hub-lens-start-research-drops-initial-prompt.md)（P1）：ResearchHub「以此透镜发起研究」将 `initialPrompt` 错传给 `uiWorkspace.startSession`，提示词被静默丢弃；
  - [BUG-452](../_archived/fixed_bugs/BUG-452-defaults-panel-method-library-link-non-interactive.md)（P1）：`DefaultsPanel`「方法库 ›」伪链接 Styled 为导航蓝字却无 `onClick` 与键盘焦点；
  - [BUG-453](../_archived/fixed_bugs/BUG-453-final-toc-exposes-raw-markdown-links-and-fails-scroll.md)（P2）：`FinalToc` 未剥离 Markdown 链接语法，裸露原始 URL 且点击无法跳转滚动；
  - [BUG-454](../_archived/fixed_bugs/BUG-454-config-switch-menu-clips-below-720p-viewport.md)（P2）：`1280×720` 视口下「研究配置」面板「换一条」下拉菜单溢出底部视口 `72px` 被裁切；
  - [BUG-455](../_archived/fixed_bugs/BUG-455-config-ui-strings-render-raw-markdown-asterisks.md)（P2）：研究配置纯文本提示槽 `configMethodHint`/`configDetailCreateDesc` 裸露 `**...**` 星号；
  - [BUG-456](../_archived/fixed_bugs/BUG-456-method-summary-shows-empty-incomplete-fields-on-name-issue.md)（P2）：`MethodSummaryView` 在 `methodNameIssue` 禁用保存时渲染空后缀「还需补齐：」，且 `methodNameIssue` 放行前导 `#`；
  - [BUG-457](../_archived/fixed_bugs/BUG-457-track-rail-rerun-arrow-misaligned-from-reentry-step.md)（P2）：`TrackRail` 复盘回边箭头 `▲` 固定左偏 `3px` 指向「立项确认 / 审查」而非重入节点「挖掘」。
- **诚实标记 `NOT-RUN` 项**：无 API key 下真实 LLM 活流推入 `deliverables/presented` 的焦点保护与完整 `MethodCoach` 多轮问答交互（纯函数 `shouldOpenFinal` / `draftInProgress` 已由 L0 单测覆盖，活流推流与 `StartCard` 跨空白组实机路径受限于无真模型 key/合成日志索引，未报假 PASS）。
