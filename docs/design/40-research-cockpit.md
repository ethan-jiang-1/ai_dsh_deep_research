# 40 · 研究驾驶舱（Research Cockpit）：观察面 client 套件的构成

> 层：设计（现在怎么组成）。本页 = 驾驶舱**当前事实的单一正本**：一页答全"是什么 /
> 构成哪些件 / 数据通道 / 怎么改 / 跑什么验证 / 已知边界"六问；"为什么当初这么选、
> 输掉了什么"的演进史住 notes 树（§7 指针）。套件名 = 研究驾驶舱（Research Cockpit，
> 2026-09-28 用户拍板），命名分层表正本 = 本页 §1；命名决定的历史与输掉的备选 =
> [cockpit-naming 快照](../../notes/archived/2026-09-28-cockpit-naming.md)。
> 本页 = 设计合同；§5 是验证索引、§7 是演进链指针——按需读，不是设计正文。
> 读完去哪：运行模型与四类状态 = [50](./50-agent-loop-and-state.md)。

## 1. 定位与命名分层

**一句话**：DSH Web GUI 右栏的观察面 client 套件——多 agent 研究运行期间，人在这里
"看仪表、关键时刻接手"（cockpit 隐喻 = 静默自主期看仪表 + HITL 挂起时接手）。存在理由
（用户点名）：run 期观察分散四处、HITL 等待不可见——"调试的时候让我知道底下在干什么、
它在等我"。它是 [D7](../decisions.md#d7) 纯配置包教义的**有界例外**（[D18](../decisions.md#d18)；另一处 = 抓取回退 provider，[D31](../decisions.md#d31)）。

| 层 | 名 | 指什么 | 改动频率 |
|---|---|---|---|
| 伞 | 观察面 | 驾驶舱 + 仪表盘投影（D18 原语义） | — |
| **套件** | **研究驾驶舱（Research Cockpit）** | `src/client/` 的 React 件全体 | **最频** |
| 折算层 | folds | `src/lib/` 纯函数谓词（keyless 单测；驾驶舱与 HTML 投影共享 HITL/步骤事实适配） | 少 |
| 投影 | 仪表盘（run-dashboard） | `probes/analyze/run-dashboard.mjs` 只读 HTML 投影（抛弃型、永不入库）；核心模型 = `checks/lib/analyze/run-dashboard-core.mjs` | 少 |

件名保留：「研究状态」页签是驾驶舱**里的一个件**，不与套件名混用；目录名守 DSH 双半
约定 host/client（不叫 `src/cockpit/`），套件名钉 `src/client/index.ts` 入口头注。

## 2. 构成（件 → 文件 → 职责）

<a id="cockpit-surface"></a>
### 2.0 出厂面契约（哪些出厂入口在、哪些不在）

研究产品的界面是**一张白名单**，不是「DSH 全量面 + 几个页签」：研究用不到的出厂入口在
`deep-research` profile 里不挂载。取舍结果与边界固定如下，改面先改这张表。

| 面 | 出厂行 | 状态 | 为什么 |
|---|---|---|---|
| 主区 Trajectory 页签 | `ui-trajectory` | 关 | 它展示 harness 内部事件流，不是研究证据；证据在 `drt_<slug>/` 的 plan / findings / final |
| 右栏 New Terminal | `ui-sidebar-terminal` | 关 | 研究产品的逃生口不是 shell；工作区是文件面的 |
| 主区 对话 | `ui-chat` | 留 | 研究的入口与出口 |
| 右栏 文件树 | `ui-sidebar-files` | 留 | 终稿页签读 `workspaceFiles`；砍掉等于让人看不见盘上真东西 |
| 右栏 浏览器 | `ui-sidebar-browser` | 上游关（非 desktop） | DSH 自己就按 profile 关面，本包用同一机制 |

关闭用 Loader 的第一类语义（后置 bundle 层按 id `disabled: true`），不是 CSS 隐藏或改名——隐藏的行
仍在挂载，快捷键、菜单与后续版本仍可能暴露。机器判据 =
[bundle-composition](../../tests/vendor/bundle-composition.vendor.spec.mjs)：按 profile 层序组合出真实 entry 树，
断言零跳过（任何 `- id:` 落空即红：上游改名会让关闭行静默失效）与上表两侧。像素面（页签真的只剩
两个、右栏真的没有终端入口）由真 Web 证据承担，两者不合一。

| 件 | 文件 | 一句话 | 详情 |
|---|---|---|---|
| 研究状态页签 | ResearchStatusTab.tsx | 右栏主观察面 | [§2.1](#cockpit-1) |
| 活标题 | ResearchStatusTitle | 挂起时改页签名 | [§2.2](#cockpit-2) |
| 流失败恢复指引 | stream-failure.ts | 流畸形死亡的人话横幅 | [§2.3](#cockpit-3) |
| 品牌（虎鲸 Orca） | BrandMark.tsx | 两个品牌槽 | [§2.4](#cockpit-4) |
| 面板数据面 | config-tables.ts | 两页签共用的纯常量 | [§2.5](#cockpit-5) |
| 研究配置页签 | ResearchConfigTab.tsx | 右栏摘要页签 | [§2.6](#cockpit-6) |
| 方法库主 tab | MethodLibraryView.tsx | 主界面第二 tab | [§2.7](#cockpit-7) |
| 研究图谱页签（装配） | ResearchGraphTab.tsx | 右栏只读 DAG | [§2.8](#cockpit-8) |
| 终稿页签 | ResearchFinalTab.tsx | 终稿地址族读面 | [§2.9](#cockpit-9) |
| 浏览器 RunSource 适配器 | run-source-browser.ts | workspaceFiles → RunSource | [§2.10](#cockpit-10) |
| 研究图谱页签体 | ResearchGraphTab.tsx | 头部 / 版本轨 / 详情 | [§2.11](#cockpit-11) |
| 研究图谱注入面 | research-graph/types.ts | 三条闭包的类型面 | [§2.12](#cockpit-12) |
| 研究语义工具卡 | ResearchToolCard.tsx | 组队卡 + 检索卡 | [§2.13](#cockpit-13) |
| 挂起显性化 | index.ts | 挂起时自动展开 | [§2.14](#cockpit-14) |
| keyed 常量 | keys.ts | 字面量唯一正本 | [§2.15](#cockpit-15) |
| host 半 | src/index.ts | 空壳宿主位 | [§2.16](#cockpit-16) |
| 产品首屏起步卡 | StartCard.tsx | 首屏指引 + 选目录 | [§2.17](#cockpit-17) |
| 启动工作区恢复 | startup.ts | 选/切产品工作区 | [§2.18](#cockpit-18) |
| 会话流装配 | `src/client/session-follow.ts` | journal 帧 → 领域帧（follow / 首帧探测 / coach 流） | [§2.1](#cockpit-1) |
| 启动期工作区动作 | `src/client/workspace-boot.ts` | 选目录 / 恢复记忆 / workspaceOf | [§2.18](#cockpit-18) |
| 页面级样式 | `src/client/styles.ts` | 问卡窄列 + 教练 composer 抑制 | [§2.1](#cockpit-1) |
| CSS Modules 类型声明 | `src/client/css-modules.d.ts` | `*.module.css` 模块类型声明 | [§2.1](#cockpit-1) |
| UI 字典（中文） | `src/client/locales/zh.ts` | 中文文案与键集正本（`t()` 的 zh 侧） | [§2.1](#cockpit-1) |
| UI 字典（英文） | `src/client/locales/en.ts` | 英文文案（键集与占位符由 zh 侧约束） | [§2.1](#cockpit-1) |
| UI 字典（折层中文） | `src/client/locales/zh-fold.ts` | 七步/摘要/图谱等数据面文案（zh） | [§2.1](#cockpit-1) |
| UI 字典（折层英文） | `src/client/locales/en-fold.ts` | 数据面文案（en） | [§2.1](#cockpit-1) |
| UI 字典（驾驶舱扩展中文） | `src/client/locales/zh-cockpit.ts` | 起步模板、契约雷达、证据卡与工作台文案（zh） | [§2.1](#cockpit-1) |
| UI 字典（驾驶舱扩展英文） | `src/client/locales/en-cockpit.ts` | 驾驶舱扩展文案（en） | [§2.1](#cockpit-1) |
| 折层翻译桥 | `src/lib/shared/i18n.ts` | 纯折算函数接受 `t` 的类型与缺省插值 | [§2.1](#cockpit-1) |
| 方法编辑模型指令 | `src/client/method-library/coach-prompts.ts` | 发给 Method Editor 的内部 prompt（非 UI） | [§2.7](#cockpit-7) |
| 方法编辑工具指令 | `src/client/method-library/operation-prompts.ts` | 写库操作的内部指令（非 UI） | [§2.7](#cockpit-7) |
| 四字段 UI 标签 | `src/client/research-config/section-labels.ts` | 四字段标题/提示的 locale 投影 | [§2.6](#cockpit-6) |
| 内置内容显示投影 | `src/client/builtin-display.ts` | canonical 内置打法/领域示范 → 当前 locale 的显示名/摘要/四字段/推荐规则（canonical 不动） | [§4](#cockpit-4) |
| 方法编辑会话 | `src/client/coach-sessions.ts` | 每草稿一会话（retain/create）+ 发送 | [§2.7](#cockpit-7) |
| 文件读闭包 | `src/client/workspace-files.ts` | listDir / readLibrary / readPreview（失败降级合同） | [§2.1](#cockpit-1) |
| 交付监听 | `src/client/delivery-watch.ts` | live present → 打开终稿（去重/不打断/在屏） | [§2.9](#cockpit-9) |
| 管理指令发送 | `src/client/lead-prompt.ts` | steer 优先、queue 降级、两态回执 | [§2.6](#cockpit-6) |
| 方法库纯模型 | `src/client/method-library/model.ts` | 状态/操作形状与无 UI 判据（可单测） | [§2.7](#cockpit-7) |
| 方法库分隔条 | `src/client/method-library/ColumnHandle.tsx` | 拖动/方向键调宽 | [§2.7](#cockpit-7) |
| 方法库读取状态 | `src/client/method-library/useLibraryData.ts` | 文本/加载/筛选/选中（无 UI） | [§2.7](#cockpit-7) |
| 方法库 run 来源 | `src/client/method-library/useRunSourcePicker.ts` | run 列表/候选预览/eligible 判定 | [§2.7](#cockpit-7) |
| 方法库草稿状态 | `src/client/method-library/useDraftState.ts` | 草稿/revision/回填/来源字段/工作台导航（无 UI） | [§2.7](#cockpit-7) |
| 方法库写操作队列 | `src/client/method-library/useOperationQueue.ts` | claim/结算/保存·默认·删除·刷新（状态面 + 行为面两出口） | [§2.7](#cockpit-7) |
| 配置页签模型 | `src/client/research-config/config-model.ts` | 四字段执行面表 / 标本骨架 / 详情三态 | [§2.6](#cockpit-6) |
| 项目默认状态机 | `src/client/defaults/store.ts` | 按 session 读 `research-defaults.json` + 方法库、经 host command 写、按钮与面板共用快照 | [§2.6](#cockpit-6) |
| 项目默认按钮 | `src/client/defaults/DefaultsButton.tsx` | composer 左侧状态按钮（自动 / 方法 X / 已设 N 项 / 需检查） | [§2.6](#cockpit-6) |
| 项目默认面板 | `src/client/defaults/DefaultsPanel.tsx` | 研究配置页签顶部「项目默认」块（方法只读；深度/输出/来源用 DSH `Menu` 选单；无保存） | [§2.6](#cockpit-6) |
| 项目默认菜单控件 | `src/client/defaults/SelectMenu.tsx` | 基于 `ui-primitives` `Menu` 的弹出单选按钮 | [§2.6](#cockpit-6) |
| 项目默认显示投影 | `src/client/defaults/labels.ts` | canonical id → 字典 key（按钮/面板共用；不翻译数据） | [§2.6](#cockpit-6) |
| 配置页签取数 | `src/client/research-config/useConfigFeed.ts` | 库读四态 / journal 绑定 / 方法节七态（含 question 读失败/空）/ 发送回执三态（视图只消费） | [§2.6](#cockpit-6) |
| 状态流纯状态机 | `src/client/research-status/status-state.ts` | 状态页签状态机 `reduceStatusFeed` 与数据驱动警告列表 `collectStatusNotices`（可无浏览器单测） | [§2.1](#cockpit-1) |
| 研究契约卡 | `src/client/research-status/ProtocolCard.tsx` | HITL1 结构化契约（protocol.json）只读摘要与降级提示 | [§2.1](#cockpit-1) |
| 证据质量雷达 | `src/client/research-status/QualityRadar.tsx` | Topic×Lens 覆盖矩阵与信源分层/质量分级统计 | [§2.1](#cockpit-1) |
| 证据卡阅读页签 | `src/client/ResearchEvidenceTab.tsx` | 认领 `evidence/*.md`，展示 8 字段与 Question List | [§2.9](#cockpit-9) |
| 终稿核查清单视图 | `src/client/research-final/ClaimsAuditView.tsx` | claims×verdicts 逐条核查视图与证据卡分屏入口 | [§2.9](#cockpit-9) |
| 终稿续研页脚 | `src/client/research-final/FinalFollowupFooter.tsx` | 解析「下一版优先项」预填按钮与「三种改法」折叠引导 | [§2.9](#cockpit-9) |
| 终稿章节目录 | `src/client/research-final/FinalToc.tsx` | 终稿 H1–H3 折叠目录 | [§2.9](#cockpit-9) |
| 右栏页签上下文菜单项 | `src/client/ResearchTabMenuItem.tsx` | `sidebar.right.tab.menu.item` 上下文动作：仅研究类页签注入「打开研究工作台」 | [§2.7](#cockpit-7) |
| 共享会话流合流 | `src/client/session-stream-store.ts` | 按 `sessionId` refcount 复用单条 `follow` 流 | [§2.1](#cockpit-1) |
| 顶栏进度胶囊 | `src/client/ResearchHeaderPill.tsx` | `session.header.actions` 进度胶囊 + HoverCard 摘要 | [§2.1](#cockpit-1) |
| 回合里程碑折叠 | `src/client/research-turn.ts` | Turn 级关键节点累积 Definition（`uiConversation`） | [§2.1](#cockpit-1) |
| 回合里程碑卡 | `src/client/ResearchMilestoneCard.tsx` | `chat.turnTail` 结构化里程碑卡 + 直达入口 | [§2.1](#cockpit-1) |
| 研究档案与透镜折算 | `src/lib/workspace/runs-catalog.ts` | 三位置 `drt_*` 扫描与 8 透镜目录 | [§2.7](#cockpit-7) |
| 全局研究工作台面板 | `src/client/ResearchHubPanel.tsx` | `sidebar.panellist` + `main` 全局 Hub（Runs / 方法库 / 透镜） | [§2.7](#cockpit-7) |
| 工作台 Runs 视图 | `src/client/research-hub/RunsView.tsx` | 三位置研究档案卡片与跳转 | [§2.7](#cockpit-7) |
| 工作台透镜视图 | `src/client/research-hub/LensesView.tsx` | 8 条研究透镜与起草预填 | [§2.7](#cockpit-7) |
| 图谱流纯状态机 | `src/client/research-graph/graph-state.ts` | 研究图谱页签状态机 `reduceGraphFeed`（绑定/plan/快照转移纯函数，可无浏览器单测） | [§2.8](#cockpit-8) |

页签八区（渲染顺序，自上而下；条件区在括号里标注）：

| 区 | 职责 |
|---|---|
| ① HITL 挂起横幅（条件：有挂起） | 点名锚点 + 参与指引——"怎么参与"在需要那一刻说清 |
| 流失败恢复横幅（条件：末位回合死于上游流失败） | 人话恢复路径「等一两分钟发『继续』」，不虚构"研究失败"；折算 = `stream-failure.ts` |
| ⓪ 业务摘要层 | 五问业务语言（研究什么 / 已确认什么 / 未知什么 / 你现在要不要操作）；折算住 brief-fold，计数不进本层 |
| ② 流程轨道 | ◆立项确认 + 立项→组队→侦察→挖掘→综合→审查 + ◆交付审阅 + 交付（步序正本 = [NODES](../../packages/deep-research-pack/presets/lead/skills/nodes-contract/SKILL.md)；↻ 图例仅在交付审阅锚点到达后出现，不证明已执行 rerun：补研究回挖掘并扩张版本 / 表述修订原位改 / 结构性重构另起新 bundle；显示 v2+ 才是本 bundle 已有证据扩张版的文件证据；交付节点带 `final/` 版本；步态符号 ✓已过 / ●进行中 / ○未到 / ?待定（读失败）——done 绿字、current 琥珀唯一、unknown 琥珀 `?` 且不给 ✓、回边落点重入描边，与仪表盘同语法） |
| ⑥ 决策诚实线（条件：已过停靠点） | 指路 question.md §Decisions |
| ③ 研究问题行 | 本场研究问题（读 question.md） |
| ⑤ 证据与交付 | 证据计数（`ok` 时只计**有效卡**：排除 `_failed.md`/`_` 前缀、0 字节/frontmatter-only；`unreadable` → 「证据读取失败」+ 重试，不显示 0；只有失败登记/空卡 → 「没有有效证据卡」+ 挖掘 unknown）+ 交付状态（present 见证；回执 `unreadable/empty/invalid` → 「交付回执读取失败/不合法」+ 重试，不显示「交付未见证」）+ rerun 版本面一行（`run-version`：已交付版本/rerun 声明/HITL2 待审）；已交付后追加只读折叠块「还不满意？三种改法」 |
| ④ 活动流 | 人性化活动行（检索 / 派出 / 成员 / 交付）；原始事件类型名不出正文 |
| ⑦ 队员动态折叠区（条件：有队员） | [member-activity-first-validation](../../notes/archived/2026-10-11-member-activity-first-validation.md)：agentTeam 投影取 roster → 多路 follow 队员会话 → 检索/抓取/出错动作行，每人一节默认折叠 + 计数徽标 |

折算层（`src/lib/`，全部纯函数、fail-soft 永不 throw；全量清单 = 盘上目录；下表为核心折算件，`library-fold` / `stream-failure` 见上表组件行；journal-wire 为五个入参折算件共享的 wire 解析核）：

| 折算 | 输入 → 输出 | 要点 |
|---|---|---|
| [hitl-fold](../../packages/deep-research-pack/src/lib/events/hitl-fold.ts) | journal 事件 → 挂起态 + 流程锚点三态 | 末位 ask 状态机保留 timed pending；匹配的非 pending result 或 user/message 关闭挂起；`deriveAnchors` 按问卡内容签名与文件事实定锚，中途确认如实显示 |
| [journal-wire](../../packages/deep-research-pack/src/lib/events/journal-wire.ts) | wire 入参/正文 → 解析共享核 | 「JSON 字符串或对象 + 截断容错」的单一正本 + queries / content text 归一；各消费方保留自己的失败哨兵（null / undefined / false / 0 / 'unknown'），本件只供解析核 |
| [run-fold](../../packages/deep-research-pack/src/lib/run/run-fold.ts) | bundle 文件在场性 → 步骤条 | 驾驶舱与 HTML 仪表盘共用七步四态折算（done / current / pending / unknown——unknown = 读失败，不被后续在场步线性推断抹成 done）与最高版本号解析（仪表盘经 `deriveStep` 适配内容模型后复用；矩阵折算归仪表盘 `run-dashboard-core.mjs` 自持） |
| [artifact-content](../../packages/deep-research-pack/src/lib/run/artifact-content.ts) | 非空之后的内容谓词 | `hasBodyText`/`hasQuestionBody`/`hasPlanBody`/`isEvidenceCardName`；标题/空小节/frontmatter-only 不算正文；`_failed.md`/`_` 前缀是失败登记 sentinel，不是证据卡 |
| [artifact-read](../../packages/deep-research-pack/src/lib/run/artifact-read.ts) | 文本工件 Outcome + policy → 五态 | `ok / absent / unreadable / empty / invalid`；question/review/readiness/receipt/final body/reader/plan/vN/leads/findings/evidence 卡的 nonEmpty/JSON 策略；唯一 `view.read` 入口（状态页/终稿/图谱/配置只消费事实）；`StatusReads` 含 bundle/question/review/readiness/evidence/plan/leads/findings/final/receipt；空 ≠ 缺席 ≠ 读失败 ≠ 非法 |
| [run-context](../../packages/deep-research-pack/src/lib/run/run-context.ts) | slug/ref ＋ 工作区文件事实 → 已定位 run 的读面 | 三位置发现（D28：位置只用于发现）、同名根优先、空根不让位、canonical 文本/JSON 工件读到 eof（64 页安全上限）、plan 限 800 行、其余 40 行、missing/unreadable 区分；I/O 由 `RunSource` 注入（浏览器/Node 各一适配器） |
| [graph-model](../../packages/deep-research-pack/src/lib/plan/graph-model.ts) | `plan.md` 节点表 ＋ Team 任务 → 四态映射（mapped / unmapped / stale / plan-only）＋ 覆盖率 | 没有 mapped task 的节点显示「状态未知」，绝不回落「未执行」；`task_id` 有值但 Team 板没有该任务（恢复会话重建任务后必现）= stale，与未映射分开报；显式 `plan-only` 不算缺口；覆盖率分母 = active 节点（墓碑不算），Team 侧多余任务单列 |
| [run-version](../../packages/deep-research-pack/src/lib/run/run-version.ts) | `plan.md` 头/重写记录 + `plan/vN` 快照 + `final/vN` 版本账 + present 见证 + question.md 的 `> rerun:` 行 → 版本面一行 | 版本只取机器可读声明（`图版本：vN` / `图版本 vN`），头与记录不一致两个都报；`present` 不带版本号，已交付版本按版本账推定且 >1 时标「推定」；无 present 不说已交付 |
| [health](../../packages/deep-research-pack/src/lib/run/health.ts) | journal 事件 → 最后活动时间 / 最后回合错误 / 停摆判定 | 只派生、不写文件；静默 ≥30min **且** 最后回合有错误才判停摆（正常长回合不误报）；驾驶舱横幅与 watch-run 共用同一 fold |
| [rerun-triage](../../packages/deep-research-pack/src/lib/run/rerun-triage.ts) | 常量 → 交付后只读出口文案（三种改法） | 补研究 / 改说法 / 另起一个 bundle 的用户语言 + 版本后果 + 可复制的一句话；状态页 ⑤ 与终稿页脚共用同一常量（两处各抄必漂移）；**无动作面**——观察面只给话术，不按钮化 rerun（D18） |
| [plan-diff](../../packages/deep-research-pack/src/lib/plan/plan-diff.ts) | 旧图快照 ＋ 当前 plan 的节点表 → 结构 diff（新增/退役/保留/重编号/依赖变化） | 只比 id/lifecycle/deps 三件；重编号只认 `superseded_by:`/`merged_into:` 结构化后缀，不解析重写记录散文；alias 目标不算新增；墓碑不进 active 集合 |
| [plan-graph](../../packages/deep-research-pack/src/lib/plan/plan-graph.ts) | Team 任务板 + 队员状态 → 分层/波次/attention/计数/worker chips | 最长路径分层；**不发明 failed**（Team 只有 pending/in_progress/completed/deleted，失败只以 owner 会话 failed 出现）；卡住是启发式（文案写「可能卡住」）；缺 since 不编造年龄；成环钳在节点数−1 |
| [plan-index](../../packages/deep-research-pack/src/lib/plan/plan-index.ts) | `plan.md` 节点表 → 节点索引 + 只读结构提示 | 解析 id/parent/kind/deps/task_id；根 W 的 kind 派生 stage；`planIssuesOf` 报重号/悬空 parent/悬空 dep/自依赖/wave 前缀与坏表诊断（不是 node-gate）；文本缺席 = absent 空索引（合法），在场无表/空表/畸形/多表 = invalid + 行定位诊断，gate 自行判 RED |
| [activity-fold](../../packages/deep-research-pack/src/lib/events/activity-fold.ts) | journal 事件 → 活动行 | 🔍 检索 / 👥 派出与队员作业中（wait_agent，连续折叠）/ 💬 成员 / 📦 交付；markdown 源标记与原始事件类型名不出正文（噪音过滤，尾部 30 行） |
| [bundle-bind](../../packages/deep-research-pack/src/lib/run/bundle-bind.ts) | journal 事件 → 本会话绑定的 run slug + 绑定强度 | 只认 `tool/call` 参数路径里的 `drt_<slug>/`；**写强读弱**——write/edit 命中直接定绑，仅读命中兜底（立项预检读旧 bundle 的错绑防线，2026-09-28 首跑实证）；可信性政策 = binding-trust |
| [binding-trust](../../packages/deep-research-pack/src/lib/run/binding-trust.ts) | journal 事件 → 可信绑定三态（bound / unbound / suppressed） | write 永远可信；read 在 HITL 挂起 / 立项信号下抑制并带 reason（pending / kickoff）；其余 read 可信。三页签只消费结论，不再各自解释 raw binding；状态页另暴露 `data-research-face` 机器标记（cdp-probe 读，供 `--require-data` 正向判绑定） |
| [tool-card](../../packages/deep-research-pack/src/lib/events/tool-card.ts) | call/result 切片 → 卡片状态 | running / ok / error / stopped |
| [start-card](../../packages/deep-research-pack/src/lib/workspace/start-card.ts) | blank Session 事实（用户消息 + 工作区根条目）→ 首屏起步卡显隐 | 有用户消息或 `drt_*` 就收起；纯函数，keyless 钉 |
| [final-target](../../packages/deep-research-pack/src/lib/run/final-target.ts) | journal 交付事件 / 文件地址 / 终稿路径 → 本次交付 + 会话文件 + 读面定表 + 地址目标版本 + 自动打开判据 | `present`（`deliverables/presented`）是交付的机械判据（node-gate 门②）；`final.md` 在场只说明"有终稿可审"（综合步就落盘），不是交付。地址认领终稿族（根 / `archive/` / `_abandoned/` 三位置 + `final/` 下 `vN.md`、`readable.md`、`readable-vN.md`），`drafts/final.md` 与绝对域全拒；`final/vN` / `readable-vN` 地址点名的版本是正文身份（缺失即失败，版本账最高号不得覆盖）；`final.md` / 通用地址才回退最高版本/工作稿；交付记录的位置失效时由 run-context 的 `openRun` 按三位置回退；`finalViewOf`（body/reader × ok/absent/unreadable/empty/invalid × 请求视图）决定展示哪一版，互补回退必须带提示，双坏 → 空/失败态；`watchTargetOf` 让 stale watcher 盯当前显示件（reader/audit/draft），不是固定 audit；自动打开 = `shouldOpenFinal`（有交付 / `callId` 未开过 / 焦点不在可编辑元素），present 同时带 reader 与 vN 时优先打开 reader |
| [member-activity](../../packages/deep-research-pack/src/lib/events/member-activity.ts) | 队员 journal 事件 → 检索/抓取/出错动作行 + 全量计数 | 粒度定夺 = [member-activity-first-validation](../../notes/archived/2026-10-11-member-activity-first-validation.md)（2026-10-10 用户三问：文件读写不入流）；失败行剥 "Error: " 工程前缀；行截尾窗与 activity-fold 同款 |
| [brief-fold](../../packages/deep-research-pack/src/lib/run/brief-fold.ts) | 既有事实源投影 → 业务摘要五问 | 输入面**不含**证据计数与工具调用数（计数在类型层面进不了完成态文案，keyless 禁词单测钉）；优先级 = 挂起 > 立项预检窗 > 未绑定 > **bundle 读失败** > **已交付 × 审查 FAIL（两事实共存）** > **审查未定** > **审查冲突** > 审查 FAIL（未交付政策） > 已交付 > 推进中；`questionIssue`（含 `body-empty`）覆盖目标行、`reviewUnconfirmed`/`reviewConflict` 覆盖审查行；`ArtifactState` 五态（ok/absent/unreadable/empty/invalid）由 `artifact-read` 单一映射；派生不出的状态显式缺省，不虚构 |
| [workspace-title](../../packages/deep-research-pack/src/lib/workspace/workspace-title.ts) | 工作区目录名 → 产品标题 | 前缀单一正本（client 的 startsWith 过滤与 host 的登记标题共用）；空名 = `Deep Research` |
| [review-readiness](../../packages/deep-research-pack/src/lib/review/review-readiness.ts) | review.md 全文 → 终局 readiness 三态 | 只认**行首**判定行、取最后一条：文末附录保留的轮次血统（如首轮 `readiness: FAIL`）是行内引用，不得夺权；空模板 `PASS \| FAIL`、无判定行或输入畸形 → `null`（不猜）。驾驶舱、仪表盘与 client-load.entry 直接消费；node-gate 在纯 `.mjs` 边界镜像同一规则并由 `gateBundle` 回归覆盖 |
| [markdown-mask](../../packages/deep-research-pack/src/lib/shared/markdown-mask.ts) | Markdown 全文 → 剥离块级代码与 HTML 注释后的逐行正文 | 处理引用块与列表缩进容器、围栏代码、缩进代码、反斜杠转义、行内代码跨度及同行/跨行 HTML 注释；由 `review-readiness`、`note-scan` 与 `fix-evidence` 共用同一实现 |
| [text-fold](../../packages/deep-research-pack/src/lib/shared/text-fold.ts) | markdown 行内文本 → 可进纯文本节点的文本 | 剥 `**` 与反引号 ＋ 压空白 ＋ 截断补省略号；状态页签与配置页签共用本件（`**` 字面星号上卡面、长摘要拉爆列表——唯一正本在本件） |
| [error-detail](../../packages/deep-research-pack/src/lib/shared/error-detail.ts) | 任意失败值 → 可读详情文本 | `Error → message(name 兜底)`；字符串原样；`{message}`/`{code}` 取可读项；其它非 null 值 `String()`；null/undefined → fallback。消费方 = 起步卡、方法库写队列、抓取回退编排（`(error as Error).message` 曾把非 Error 拒绝值渲染成字面量 `undefined`，BUG-410） |
| [method-of-question](../../packages/deep-research-pack/src/lib/method-library/method-of-question.ts) | question.md 文本 ＋ bundle 在场性/读取态 → 「本次研究」区七态 | 无 run／文件缺／question 读失败／question 空／未记录／无法判定／已记录；**判不了就说判不了**——绝不回落成默认打法名（旧 run 未记录 = 合法形态，不回填）；读方法节须显式足额 limit（模板第 32–40 行卡默认 40 行，BUG-026 同族） |
| [receipt-fold](../../packages/deep-research-pack/src/lib/run/receipt-fold.ts) | 发送结果 ＋ 回话信号 ＋ 库前后快照 → 回执三态与 diff | 已发送（prompt ok）／Lead 已回话（发送**之后**的 assistant 事件）／已落盘（回读对账出 diff：`把「找来源」从 A 改成 B`）；对账读不出变化就退到已回话，不冒充落地 |
| [research-defaults](../../packages/deep-research-pack/src/lib/workspace/research-defaults.ts) | `research-defaults.json` 文本 → typed 值 / problems；patch 合并/删除/序列化；按钮粗状态；command 结果解析 | 缺席 = auto（不写 sentinel、不物化默认）；六个 output shape = HITL1 面（protocol 的 literature_review 不在本层）；source families/authorities 与 protocol-core 对账 |
| [protocol-fold](../../packages/deep-research-pack/src/lib/run/protocol-fold.ts) | `protocol.json` → `ProtocolContract`（强类型 + 五态） | `decodeProtocol` + `readProtocolContract` 走 `readArtifact`；缺 `schema`/`status` 即 `invalid` |
| [evidence-matrix](../../packages/deep-research-pack/src/lib/run/evidence-matrix.ts) | `topics.md` + `evidence/*.md` → Topic×Lens 矩阵与质量分布 | 解析 8 字段 frontmatter；`unreadable`/`invalid` 卡不折成 0 |
| [claims-verdicts](../../packages/deep-research-pack/src/lib/run/claims-verdicts.ts) | `claims.json` + `verdicts.json` → 逐条核查视图模型 | 缺 verdict 显性标 `UNVERIFIED`；五态降级不冒充通过 |
| [evidence-card](../../packages/deep-research-pack/src/lib/run/evidence-card.ts) | `evidence/*.md` + 资源地址 → 证据卡正文/元数据与认领谓词 | `isEvidenceAddress` / `evidenceAddressOf` 仅认领三位置 `evidence/*.md` |
| [citation-linkify](../../packages/deep-research-pack/src/lib/run/citation-linkify.ts) | 终稿 Markdown → 内存预转可点证据引用链接 | 跳过围栏代码块与行内代码；绝不改写磁盘 `final*.md` |

---

<a id="cockpit-1"></a>
### 2.1 研究状态页签与顶栏/回合胶囊

**文件**：
- [ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) · [TrackRail.tsx](../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx)（`StateDot(appearance="step")` + CSS Modules + `data-step-*`）
- [ProtocolCard.tsx](../../packages/deep-research-pack/src/client/research-status/ProtocolCard.tsx) · [QualityRadar.tsx](../../packages/deep-research-pack/src/client/research-status/QualityRadar.tsx)
- [useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts) · `src/client/research-status/useMemberActivity.ts` · `src/client/research-status/types.ts`
- [ResearchHeaderPill.tsx](../../packages/deep-research-pack/src/client/ResearchHeaderPill.tsx) · [ResearchMilestoneCard.tsx](../../packages/deep-research-pack/src/client/ResearchMilestoneCard.tsx) · [session-stream-store.ts](../../packages/deep-research-pack/src/client/session-stream-store.ts) · [run-version.ts](../../packages/deep-research-pack/src/lib/run/run-version.ts)

右栏页签按 §2 渲染序展示：HITL 挂起/流失败恢复 → ⓪ 业务摘要 → ② `TrackRail` 流程轨道 → **研究契约卡**（`protocol.json`）→ ③ 研究问题 → **证据质量雷达**（`topics.md × evidence/*.md` Topic×Lens 矩阵与 Tier/Quality 分布，缺口显性提示）→ ⑤ 证据与交付 + `rerun` 版本面 + 三种改法只读卡 → ④ 活动流 → ⑦ 队员折叠区。同会话的 `ResearchHeaderPill`（`session.header.actions` + `HoverCard`）、`ResearchMilestoneCard`（`chat.turnTail`）与状态/图谱页签共用 `session-stream-store` 单路 refcounted `follow` 流。

<a id="cockpit-2"></a>
### 2.2 活标题

**文件**：同上（`ResearchStatusTitle`）

挂起时页签名变「研究状态 · ⏳ 等你拍板」

<a id="cockpit-3"></a>
### 2.3 流失败恢复指引

**文件**：[stream-failure.ts](../../packages/deep-research-pack/src/lib/events/stream-failure.ts) + ResearchStatusTab.tsx

末位回合死于上游流失败（MALFORMED_RESPONSE 族）且无新回合接手 → 人话横幅「等一两分钟发『继续』」；折算纯函数，BUG-023 修复①

<a id="cockpit-4"></a>
### 2.4 品牌（虎鲸 Orca）

**文件**：[BrandMark.tsx](../../packages/deep-research-pack/src/client/BrandMark.tsx)

宿主 `sidebar.brand.mark` + `sidebar.brand.name` 两槽的 single occupant（替换内置鱼形 logo 与本地构建标签）——用户定调 2026-10-13；品牌名随 locale（zh `Orca 深度搜索` / en `Orca Deep Research`，字典 `brandName`），name 槽注册声明 `locale: 'deepResearchPack'`。

<a id="cockpit-5"></a>
### 2.5 面板数据面

**文件**：[config-tables.ts](../../packages/deep-research-pack/src/lib/shared/config-tables.ts)

两个页签共用的**纯常量**：内置偏好（skill 方法预设的投影）、判型→打法映射、六条底线、四分区标签、领域示范、两个定制入口指令逐字。住在 lib 而非视图（数据/展示分层；keyless 测试直接 import，不再 AST 扒 TSX）

<a id="cockpit-6"></a>
### 2.6 研究配置页签

**文件**：[ResearchConfigTab.tsx](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) + [LegacyManagementPane.tsx](../../packages/deep-research-pack/src/client/research-config/LegacyManagementPane.tsx)（`COMPACT=false` 的四区回滚面，D25）+ [method-of-question.ts](../../packages/deep-research-pack/src/lib/method-library/method-of-question.ts)

右栏**摘要页签**（2026-10-21 管理迁移后）：只留 ① 本次研究（采用＋来源＋「换一条」，读 question.md 方法节五态）与「方法库（本工作区）→ 顶部 tab」入口；库列表/内置卡/领域示范/术语/管理回执移入主界面「方法库」tab。「本次研究/方法库入口」指令仍经 `session/prompt` 交 Lead；项目默认块（D50）经 `/research-defaults` host command，不直写盘。

**项目默认块（D50）**：页签顶部；方法行只读（库默认/按题型），深度/输出/来源可改；首项「自动」= 字段省略 = Lead 按题型判断（不是系统默认）；无保存按钮，面板经 `/research-defaults` host command 写 workspace 文件；按钮与面板共用 `src/client/defaults/store.ts`。

<a id="cockpit-7"></a>
### 2.7 全局研究工作台与方法库（`ResearchHubPanel` + `MethodLibraryView`）

**文件**：
- 全局工作台：[ResearchHubPanel.tsx](../../packages/deep-research-pack/src/client/ResearchHubPanel.tsx) · [RunsView.tsx](../../packages/deep-research-pack/src/client/research-hub/RunsView.tsx) · [LensesView.tsx](../../packages/deep-research-pack/src/client/research-hub/LensesView.tsx) · [runs-catalog.ts](../../packages/deep-research-pack/src/lib/workspace/runs-catalog.ts)
- 方法库视图与交互：[MethodLibraryView.tsx](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) · [views.tsx](../../packages/deep-research-pack/src/client/method-library/views.tsx) · [coach.tsx](../../packages/deep-research-pack/src/client/method-library/coach.tsx) · [styles.ts](../../packages/deep-research-pack/src/client/method-library/styles.ts) · [locales.ts](../../packages/deep-research-pack/src/client/locales.ts) · [MethodLibraryToolCard.tsx](../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)
- 方法库折算与写链：[library-fold.ts](../../packages/deep-research-pack/src/lib/method-library/library-fold.ts) · [method-draft.ts](../../packages/deep-research-pack/src/lib/method-library/method-draft.ts) · [method-library-write.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-write.ts) · [method-library-operation.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-operation.ts) · [method-library-commands.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-commands.ts) · [method-library-events.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-events.ts) · [method-library-hash.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-hash.ts) · [method-library-operation-state.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-operation-state.ts) · [method-library-read.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-read.ts) · [method-library-source.ts](../../packages/deep-research-pack/src/lib/method-library/method-library-source.ts)

除 `conversation.view` 内的「方法库」tab 外，经 DSH `sidebar.panellist` + `main` 注册全局「研究工作台」：即使无 active conversation / 在空白首屏也可随时打开，使用 `SegmentedTabs` 切换 **Runs（三位置 `drt_*` 研究档案）/ 方法库 / 研究透镜（8 条内置透镜 + 工作区 `DefaultsPanel` 项目默认）**；并在 `sidebar.right.tab.menu.item` 为 5 个研究类右栏页签注入「打开研究工作台」菜单项，且各页签均通过 `tab.actions.bindCommands({ refresh })` 响应右栏原生的刷新命令。方法编辑走 D37 第 5 个 preset（`shell.overlay` portal；因仍保留 `conversation.view` 快捷入口，按 M6-3 在 `index.ts` 保留最小 `installCoachComposerStyles`）。`useLibraryData` 支持切到「内置参考」时保留选定模板，细节弹窗支持「以此为基础开始」带入新建向导。

<a id="cockpit-8"></a>
### 2.8 研究图谱页签

旧图快照读取走 `readArtifact('plan/vN.md')`，状态机含 `empty` / `invalid` / `missing` / `unreadable`；`DagMap.tsx` 采用 CSS Modules + `--dsw-*` 语义令牌，支持点击节点高亮上下游依存边，并在有依赖边时把选中节点详情聚焦置于图下方、其余节点收进「查看全部节点」折叠块（消减"图 + 下方全量卡片"双倍占位冗余）。

**文件**：
- [ResearchGraphTab.tsx](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) · [DagMap.tsx](../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx) · [useGraphFeed.ts](../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts) · [NodeCard.tsx](../../packages/deep-research-pack/src/client/research-graph/NodeCard.tsx)
- [GraphVersionRail.tsx](../../packages/deep-research-pack/src/client/research-graph/GraphVersionRail.tsx) · [GraphNotices.tsx](../../packages/deep-research-pack/src/client/research-graph/GraphNotices.tsx) · [state-note.ts](../../packages/deep-research-pack/src/client/research-graph/state-note.ts) · [styles.ts](../../packages/deep-research-pack/src/client/research-graph/styles.ts)
- [WorkerChips.tsx](../../packages/deep-research-pack/src/client/research-graph/WorkerChips.tsx) · [format.ts](../../packages/deep-research-pack/src/client/research-graph/format.ts) · `src/client/research-graph/types.ts` · [graph-model.ts](../../packages/deep-research-pack/src/lib/plan/graph-model.ts)

右栏**只读观察面**：顶层 plan 节点 / `agentTeam` 任务画成交互式 SVG DAG（节点 + 依赖边 + 同层并行 + 状态色）；复合节点收在父节点详情（图上标 `+n`）；节点详情可复制 `drt_<slug>/W3.1` 引用；无 plan/blocked_by 时明确「没有可画的 DAG」，不画假图、不提供调整动作。

<a id="cockpit-9"></a>
### 2.9 终稿页签与证据卡阅读页签

**文件**：
- 终稿页签：[ResearchFinalTab.tsx](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) · [ClaimsAuditView.tsx](../../packages/deep-research-pack/src/client/research-final/ClaimsAuditView.tsx) · [FinalFollowupFooter.tsx](../../packages/deep-research-pack/src/client/research-final/FinalFollowupFooter.tsx) · [FinalToc.tsx](../../packages/deep-research-pack/src/client/research-final/FinalToc.tsx) · [citation-linkify.ts](../../packages/deep-research-pack/src/lib/run/citation-linkify.ts) · [final-target.ts](../../packages/deep-research-pack/src/lib/run/final-target.ts)
- 证据卡页签：[ResearchEvidenceTab.tsx](../../packages/deep-research-pack/src/client/ResearchEvidenceTab.tsx) · [evidence-card.ts](../../packages/deep-research-pack/src/lib/run/evidence-card.ts)

右栏终稿页签认领 `drt_<slug>/` 终稿地址族，顶部使用 DSH `SegmentedControl` 在 **读者版 / 审计版 / 核查清单（`claims.json × verdicts.json`）** 三态间切换，并带「分屏对照」按钮；正文配备折叠目录 `FinalToc`（H1–H3）与内存 `linkifyEvidenceCitations` 引用转换（不改盘上 `final*.md`），点击 `[来源: evidence/xx.md]` 或核查清单里的证据标签通过 `MarkdownDelegateProvider.openFile` → `openResource(..., { preferNewPane: true })` 在右栏分屏打开 `ResearchEvidenceTab`，完整展示证据卡 8 字段 frontmatter 与 Question List；页脚由 `FinalFollowupFooter` 从 `final*.md` 解析「下一版优先项」生成点击预填按钮（经 `inputActions.insertText` 不自动发送），与「三种改法」折叠卡共同守住 D18 只读边界。

<a id="cockpit-10"></a>
### 2.10 浏览器 RunSource 适配器

**文件**：[run-source-browser.ts](../../packages/deep-research-pack/src/client/run-source-browser.ts)

`remote.workspaceFiles` → run-context 的 `Entry` / `Page` / `version` 映射；`workspace-file/not-found` → missing，其它错误 → unreadable；位置/读策略/翻页归 lib，本件不重复

<a id="cockpit-11"></a>
### 2.11 研究图谱页签体

**文件**：[ResearchGraphTab.tsx](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)

页签体：头部（「只读观察」标记 + plan/task 计数）+ 正文首行版本轨（`plan/vN` 快照 → 「当前图 / 看 vN 旧图 / 看差异」，结构 diff 折算住 [plan-diff](../../packages/deep-research-pack/src/lib/plan/plan-diff.ts)；无快照如实「无旧图快照，不能 diff」）+ 覆盖率（`已映射 K / 未映射 N-K`，另有失效与 plan-only 才追加）+ 最后刷新时刻；映射缺口横幅说「图谱无法判断」，不说「未执行」；SVG DAG 小图（`wavesOf` 分层、同层横排、边 = plan deps / Team `blocked_by`）+ 顶层节点列表 + 选中详情（description 高度上限、复合子节点展开、复制引用）+「需要你注意（只读）」+ plan 结构提示；底部 `plan.md` 原文折叠与 plan↔task 映射计数；无依赖边时只显示任务快照并说明原因

<a id="cockpit-12"></a>
### 2.12 研究图谱注入面

**文件**：[research-graph/types.ts](../../packages/deep-research-pack/src/client/research-graph/types.ts)

「研究图谱」页签的注入面类型（`runSource` / `follow` / 可选 `openOwner` 三条闭包，数据面全部复用既有 remote，无新 RPC）；`follow` 只用于 `bindingTrust` 找可信的 `drt_<slug>/`，页签只读，不注入发送通道

<a id="cockpit-13"></a>
### 2.13 研究语义工具卡

**文件**：[ResearchToolCard.tsx](../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) + [tool-card.ts](../../packages/deep-research-pack/src/lib/events/tool-card.ts)

对话流卡片：`spawn_teammate` → 组队卡、`web_search` → 检索卡（2 张）

<a id="cockpit-14"></a>
### 2.14 挂起显性化

**文件**：[index.ts](../../packages/deep-research-pack/src/client/index.ts)（`revealStatusTab`）

pending false→true 迁移时 `openTab` 右栏自动展开；页签 dock 折叠态保持挂载（观察者常在）

<a id="cockpit-15"></a>
### 2.15 keyed 常量

**文件**：[keys.ts](../../packages/deep-research-pack/src/client/keys.ts)

字面量唯一正本（`client-keys` 门禁对账——拼错不报错、永不渲染）

<a id="cockpit-16"></a>
### 2.16 host 半

**文件**：[src/index.ts](../../packages/deep-research-pack/src/index.ts)

空壳宿主位（bundle 行 name = 包名；浏览器半经 `exports["./client"]` 装配）

<a id="cockpit-17"></a>
### 2.17 首屏起步卡

**文件**：[StartCard.tsx](../../packages/deep-research-pack/src/client/StartCard.tsx)（D38 启动面的首屏件）

`conversation.input.dock` 的全宽起步卡：首屏告诉用户这是什么、当前工作区、三步起步
（问一个问题 → Lead 先问三问/计划确认 → 右栏研究状态与终稿）、凭据提示与「选择项目目录」按钮。
只在 blank Session、工作区根没有 `drt_*`、且会话还没有用户消息时显示；工作区文件读失败仍显示
（不阻塞 composer）。「选择项目目录」按钮走 `uiWorkspace.pickDirectory` → `workspaces.create` →
写 `dsh.deep-research.workspaceId.v1`（设备级提示）→ 开 Lead 会话；不写 session event / storage
domain。它是 Client 渲染，不进模型请求。

<a id="cockpit-18"></a>
### 2.18 启动工作区恢复

**文件**：[startup.ts](../../packages/deep-research-pack/src/client/startup.ts)（D40）

`index.ts` 在挂载后调用一次：列表 ready 后按「保存的 workspaceId → 唯一 `Deep Research — ` 标题」
选用户工作区；读 `dsh.sessions.current` 判断当前会话是否已在该目录，不在则
`uiWorkspace.startSession`。谓词纯函数（`readCurrentSessionId` / `pickProductWorkspace` /
`needsProductSwitch`）由 keyless 测试钉住；浏览器只写两个提示键，不做本地账本。

<a id="cockpit-19"></a>
### 2.19 项目默认按钮

**文件**：[DefaultsButton.tsx](../../packages/deep-research-pack/src/client/defaults/DefaultsButton.tsx) + [store.ts](../../packages/deep-research-pack/src/client/defaults/store.ts)

composer 左侧 `conversation.input.left` 的状态按钮（有 session 才渲染）：文案 = 自动 / 方法 X / 已设 N 项 / 需检查；点击打开「研究配置」页签。tooltip 列生效值；按钮不写盘，写只经面板/命令。无 session 不渲染，不新增 StartCard 入口。

## 3. 数据通道与接线

- **项目默认写通道（D50）**：面板 → `remote.commands.execute('/research-defaults …')` → host command 原子写 `<workspace>/research-defaults.json`；读走 `workspaceFiles`，写不走（只读），也不走 session/prompt。命令事件进会话日志；文件内容随后被 `research:defaults` 注入。
- **两条官方通道，零自建协议**：`remote.session.follow`（WebSocket journal 流：snapshot
  帧 = 历史、event 帧 = 实时）喂活动流 / HITL 谓词 / 会话绑定；`remote.workspaceFiles`
  （会话工作区文件）喂 bundle 渐进面（失败降级 null + `console.error` 便于冒烟抓取）；
- **0.1.7 实证坑**：remote 命名空间**两级都要声明**（`remote` + `remote.session`），
  只声明一级必炸；
- **交付判据口径**：终稿的"已交付"只认 `present` 见证（`deliverables/presented`，门②）；`final.md`
  在场是"可审"不是"已交"——⑤ 的措辞与门都按此分流（`brief-fold` 的 `delivered` 输入同步改用交付事实）；
- **交付监听（终稿的出现时机）**：插件层跟随**在屏会话**（`sidebarRight.mounted`）的 journal，
  只认 **live 帧**里的 `deliverables/presented`（开场快照是回合窗口，回放触发 = 每次重载都弹）；
  指向终稿 → `openResource(文件地址)` 一次。`callId` 去重（关掉不再弹）、焦点在可编辑元素时不打断、
  只对在屏会话动作——这是本包唯一一处"替用户打开东西"；
- **接线三件套**：`package.json` 的 `dsh.client`（platform: web + 平台 inject）↔
  `exports["./client"]` ↔ [cordis.patch.yml](../../packages/deep-research-pack/cordis.patch.yml)
  的 `research-client` insert 行；
- **双半构建**：client 半 = cjs/browser + `window.__ModuleLoader__.load({id, factory})`
  外壳，react / `@deepseek-ai/dsh-client-*` 外置、其余内联——契约细节 =
  [guides/62](../guides/62-plugin-authoring.md)。

## 4. 分层纪律

- **折算进 `src/lib` 纯函数 + keyless 单测；组件薄渲染**（数据/展示分层——折算可回放可
  断言，组件只画）；
- **keyed 字面量单一正本** `keys.ts`（`client-keys` 门禁逐处对账）；
- **界面文案 day-one 双语**：任何用户可见文本必须同时有 zh/en——chrome（页签/按钮/空态/提示）住
  `src/client/locales/{zh,en}.ts`；数据面折层输出住 `{zh,en}-fold.ts`，函数接受 `PackTranslate`、UI 传
  `props.t`；产品文案（内置打法/领域示范等 canonical 表）**不翻译 canonical 本身**，UI 经显示投影取词，
  动作/库格式/模型 prompt 继续用 canonical；模型面 prompt 与用户内容/技术标识不翻译。守卫 =
  `tests/cockpit/client/builtin-display.spec.mjs`、`tests/cockpit/client/locales/client-locale.spec.mjs`、
  `tests/cockpit/client/method-library/locales.spec.mjs`、`tests/cockpit/shared/i18n.spec.mjs`、
  `tests/checks/repo/cjk-source.test.mjs`；新增/修改文案步骤 =
  [changing-ui-copy](../../.agents/skills/changing-ui-copy/SKILL.md)。
- **默认语言 = 中文**（D49）：bundle patch 把 `locale.preference` 钉到 `zh`，装包即中文、不跟随浏览器
  语言；用户显式选择住 profile patch 层，仍可切 English。
- **页签自带滚动口**：vendor `.tabBody` 是定高 flex 列且 `overflow: hidden`——页签体必须自己开内
  滚动区（根 `flex: 1; minHeight: 0`，内容区 `overflowY: auto`），否则长内容被裁且滚不动（2026-10-12
  状态页、2026-10-20 终稿页各踩一次；`client-load.entry` 断言终稿滚动口可动）；
- **会话绑定**：渐进面只显示**本会话自己的** run bundle（不显示别家数据）；位置只用于发现，
  三个位置都认（根 / `archive/` / `_abandoned/`），状态从内容读（D28）；未绑定如实提示；写强读弱 +
  挂起期抑制仅读绑定的渐进面（预检读取不算"本会话的 run"）。
- **页签内区块归属**：每个页签的头部/正文/底部以 §2 的页签行为准；新增块先在该行写归属区
  （图谱：头部 = 只读标记 + plan/task 计数；正文首行 = 版本轨；其下 = 覆盖率 + 刷新时刻），不另立第二套布局说明。
- **发现规则单源**：驾驶舱 client 的三位置发现实现 = `src/lib/run/run-context.ts`；机械侧 = `run-context-single-source`（`src/client` 非注释 `_abandoned` 即红；`src/lib` 的终稿地址校验不在词法门禁范围）。`tools/channel/hitl-answer` 与 `tools/channel/run-kickoff` 的盘侧路径枚举、`run-dashboard` 投影与 `client-load-reference.support` oracle 各自保留，不在此行。

## 5. 验证面与改动路由（索引，非正文）

| 面 | 入口 | 断言什么 |
|---|---|---|
| keyless 真浏览器 | [client-load.entry](../../checks/smoke/client-load.entry.mjs) | 装配零失败 + 页签渲染 + 渐进面与**磁盘真值对账** + 未绑定负样本 + 终稿端到端（细则以脚本为准） |
| 真模型档 | [client-hitl.entry](../../checks/smoke/client-hitl.entry.mjs) | 活标题翻转 + 横幅 + 挂起迁移 → 右栏自动展开 |
| keyless 单测 | `pnpm test` | §2 所列折算各有测试文件 |

命令与改动次序 = [guides/60 §2](../guides/60-dev-loop.md)「改驾驶舱」行；判据 = [evaluation](../evaluation.md) §L0/L1/L4。本页不复述命令表。

<a id="defensive-redlines"></a>
### 5.1 防御式与契约红线（`vendor/dsh/docs/defensive-patterns/` 本地化）

对应上游 `general.md` / `client-components.md` / `remote-and-api.md` / `conversation-and-session.md`，驾驶舱与 `src/lib/` 编码与评审必须满足下表，并由静态/契约测试机检兜底（免人肉重查）：

| 上游规则 | 本仓落点与具体禁止 | 机检防线 |
|---|---|---|
| One value states one fact | `ArtifactState` / `StepSignal` / `BriefInputs` 等强判别联合；禁止用 `null`/`undefined` 同时代指「未查询 / 缺席 / 读失败 / 非法」 | `semantic-guardrails.test.mjs`（`CLOSED_UNION_LITERALS` / `CLOSED_TAGGED_KINDS` 穷举）+ `tsc` |
| Honor public contracts on BOTH sides | `readArtifact` 是唯一 `RunView.read` 入口且 JSON 工件强制传 `{ decoder }`（禁止裸 `json: unknown`）；Skill / 运行模板样例与门禁 parser 共享结构约束 | `semantic-guardrails.test.mjs`（`LEGACY_RUNVIEW_CALLS` 清零）+ `skill-parser-contract.spec.mjs` |
| Identity, initial state & disposal | Hook 异步状态统一收进纯 Reducer（`status-state.ts` / `graph-state.ts`）与单次 `reset-session` 原子复位；函数内创建的 `AbortController` 必须有 `.abort()` 回收；`catch` 不允许静默吞错或只写日志（除非标注 `@silent-catch: <理由>`） | `semantic-guardrails.test.mjs` + `status-state.spec.mjs` / `graph-state.spec.mjs` + `status-feed-behavior.spec.mjs` / `graph-feed-behavior.spec.mjs` |
| Narrow injection face / Timing correctness | 页签组件通过 `*Injected` 窄接口注入宿主能力（不传整包 Cordis context）；状态流转靠显式 action 与 `dispatch`，不依赖 `setTimeout`/微任务时序担保 | `client-keys` / `client-effect-wrap` + 组件/Hook 行为测试 |

## 6. 已知限制与延后工作

- **项目默认只存 depth/output/source**：方法默认仍在方法库（面板只读）；lens/参考目录/输出语言/用户级跨 workspace 默认 = v2；protocol 的 `literature_review` 不在面板六种内（单源对账另案）。

- **启动空会话不复用**：带 `DEEP_RESEARCH_WORKSPACE` 的每次启动按首屏语义 mint 一个 blank Lead
  会话（settings 源才记 sessionId）；不自动复用已有 blank 会话。真实使用出现会话堆积时再实现
  复用（触发 = [_backlog/triggers.md](../../_backlog/triggers.md)）。

- **run-dashboard / client-load-reference.support oracle 保留独立**：dashboard 是同步 HTML 投影，oracle 的价值在独立（复用生产实现会掩盖漂移）；两者不复用 run-context，边界见 [run-context Note](../../notes/implemented/2026-10-23-run-context.md)。

- **G6 编辑卡片跨会话串联（vendor UI，待查）**：操作侧改动曾混进 run 会话视图；lead journal
  核实无 harness 写入，归 vendor UI 归属问题；历史根因链 = [归档中国 cockpit-flow-face](../../notes/archived/2026-09-28-cockpit-flow-face.md)。

- **问卡窄列布局修复（本包注入，2026-10-21）**：右栏展开后聊天列变窄，vendor `ui-user-questions`
  的卡头（`space-between` + 右侧动作区 nowrap/不收缩 + 左侧 `min-width: 0`）会把标题塌成一字一行
  （1280 视口实测：卡片 353px、标题 24px 宽 × 946px 高）。本包 client 在 `src/client/index.ts` 注入
  一条**按 vendor 稳定钩子 `data-question-key` 限定**的规则（卡头允许换行 + 标题 14em 弹性基准），
  宽列不受影响；vendor 若删该钩子，规则只是不再命中（fail-soft，不波及其它组件）。
  **移除条件**：vendor 卡头自带换行/最小宽后，删该 effect 与本条目。

- **失败态与空态必须可分（2026-10-27 BUG-045）**：读不到数据 ≠ 没有数据。图谱的 journal 绑定
  读取失败曾有与「本会话尚未绑定 run」同形的渲染，一次瞬断就被读成"这个会话还没开始研究"；
  现在失败走独立文案「绑定状态读取失败」+ 有界重试（3 次 / 2s），恢复后自动补上。状态页的
  bundle / question / review / readiness / evidence / receipt 各持 `ArtifactState`
  （ok / absent / unreadable / empty / invalid），空 ≠ 缺席 ≠ 读失败 ≠ 非法；读失败/空显式
  提示 + 重试，步骤条标 `?`，不折成「研究推进中」「尚未确认」「✓ 审查」「证据 0 份」；终稿
  地址点名的版本缺失 = 失败态，不拿别的版本/工作稿冒充；reader↔audit 互补回退必须提示。新增观察面读取路径时同守此条：
  catch 里不许只 `console.error` 后落回"空"态。

- **版本账 ≠ 交付凭证**：`final/vN.md` 是版本记账（听 HITL2 前模型就会先落 v1），
  「已交付」只由状态页 ⑤ 的 `present` 见证说；终稿页签因此只标「vN（版本账）/当前工作稿」。
  旧 run 没有 `plan/vN` 快照时，图谱如实显示「无旧图快照」，不重建旧图。

- **`task_id` 空白的 plan 节点**：图谱显示「状态未知（未映射 task_id）」并计入覆盖率缺口——
  不把缺口读成「未执行」。凭证 = 夹具 `tests/fixtures/plan-mapping/` + 受控 E2E run
  `archive/drt_e2e-rerun-2026-10-23`（整列 `task_id` 空白时现场显示「状态未知」与覆盖率缺口）。
  Lead 回填后 5s 内与 Team 板对齐；不自动建 task、不改历史 plan。投影未就绪时显示
  「等待团队投影」，不预设缺口。

- **方法库双入口**：`conversation.view` 方法库 tab 在空白 New Session hero 时隐身，现由全局「研究工作台」（`sidebar.panellist` + `main`）在任意会话甚至空白首屏兜底打开（Runs / 方法库 / 研究透镜）；`conversation.view` 页签本身语义不变。

- **右栏 pane 仍可能钉在上一会话（vendor 面板会话绑定，2026-10-21 实测）**：主视图切到绑定会话 A
  后，右栏仍显示会话 B 的页签内容（client-load.entry 实测：active row = d47b…，面板仍是
  1392… 的 Rerun8 团队/2 subagents）。收起/重开右栏可重绑；状态/图谱页签以 **pane 的 session**
  为准，不把 pane 内容当主视图真值。修复归 vendor 的 pane 会话绑定，不归本页签。

- **会话必须建在研究工作区里**才有渐进面（workspaceFiles 读的是会话工作区根）；建在
  别处的会话只显示活动流（详见 [pack README 已知限制](../../packages/deep-research-pack/README.md)）；
- **队员动态折叠区（member-activity-stream，2026-10-10 落地）**：lead 活动流照旧只折 lead 会话；
  队员动作走**每人折叠区**（agentTeam 投影发现队员会话 id——spawn 返回不带 id，通道探明实证；
  多路 follow 各自会话）→ member-activity 折算**检索/抓取/出错**粒度（文件读写不入流，用户
  定夺）。边界：① 有团队正例首验 = 下一场真实 run（投影不进 journal，keyless 回放不可造；
  无团队负例已入 client-load.entry 常驻断言，spawn 名 ↔ roster 对账断言已编码、届时自动生效）；
  ② 每队员 follow 首帧 = 全量历史（量级 ≈ lead 同阶）；③ 分工不双 home——任务粒度归
  `ui-agent-team` 任务板，本区只答动作粒度；
- **组队步无独立文件**：轨道的组队步在场性随立项（cursor 在"立项完成 → 侦察交付"窗口停靠
  组队——该窗口即组队+侦察进行段，活动流区分两者）；HTML 步骤条通过适配器消费同一 `deriveSteps`。
- **工具卡只 2 张**：`team_task_*` 等协调类工具不进对话渲染流（harness 排除），团队观察
  由 `ui-agent-team` 任务板承担；
- 同会话观测面（状态页签 / 图谱页签 / 顶栏进度胶囊 / 回合里程碑 / 活标题）已由 `session-stream-store` 按 `sessionId` refcount 合流复用单条 `follow` 流；
- **左栏会话行徽标延后**：`sidebar.session.row.leading` 因缺 Host 级聚合态而不按行订阅 `session.follow`，后续需等上游或 pack Host 侧提供统一摘要投影再接入；
- 终稿页签的标题固定「终稿」（不做活标题）：同一会话先后跑两场研究会有两个同名页签，靠静音条的
  run 路径（hover）与正文 H1 区分——真咬到再升活标题；
- 交付门的判据是 `present` 事件在 journal 窗口内（回合窗口 ≈ 最近 50 条消息）：窗口外的老交付
  只显示承诺行、不显示「✅ 已交付」——宁可少说，不虚报；
- 终稿路径按三位置回退读（交付记录的是当时位置，bundle 归档/停放后原路径失效——首条端到端
  实测即撞上某次已归档 run）；
- 自动打开只在**现场**交付事件上触发（回放不触发），keyless 冒烟无真模型交付：该路径的接线
  只有 `shouldOpenFinal` 的 keyless 证据，端到端观察留待下一场真实 run；
- 从未开过页签的会话无 dock 观察者——挂起信号由 vendor 侧栏 Answer 徽标兜底；
- 版本兼容：`engines.dsh` = `>=0.2.1-rc.2 <=0.2.1-rc.5`（只声明有安装/首屏/客户端证据的版本带）；已测基线 = `0.2.1-rc.2` + `0.2.1-rc.3` + `0.2.1-rc.5`（rc.5：真实用户形态安装 + product-boot 首屏 + client-load 全绿）；`rc.4` 在区间内但未单独取证。

## 7. 演进链（指针，不是设计合同）

选型与输掉的方案住 notes，逐篇含实测：琢磨稿
[ui-observability-surfaces](../../notes/archived/2026-09-24-ui-observability-surfaces.md) →
RFC [observability-gui](../../notes/implemented/2026-09-24-observability-gui.md)（`client-keys` 红证出处）→
[research-status-ui](../../notes/archived/2026-09-25-research-status-ui.md) →
[bundle-face-wiring](../../notes/archived/2026-09-26-bundle-face-wiring.md) →
[right-pane-ux-debt](../../notes/archived/2026-09-28-right-pane-ux-debt.md) →
[cockpit-naming](../../notes/archived/2026-09-28-cockpit-naming.md) →
[cockpit-ux-ui-native-upgrade](../../notes/implemented/2026-11-26-cockpit-ux-ui-native-upgrade.md)。门禁台账引用 = [evaluation §L0](../evaluation.md)。
