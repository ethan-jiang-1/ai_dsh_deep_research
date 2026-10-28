# 40 · 研究驾驶舱（Research Cockpit）：观察面 client 套件的构成

> 层：设计（现在怎么组成）。本页 = 驾驶舱**当前事实的单一正本**：一页答全"是什么 /
> 构成哪些件 / 数据通道 / 怎么改 / 跑什么验证 / 已知边界"六问；"为什么当初这么选、
> 输掉了什么"的演进史住 notes 树（§7 指针）。套件名 = 研究驾驶舱（Research Cockpit，
> 2026-09-28 用户拍板），命名分层表正本 = 本页 §1；命名决定的历史与输掉的备选 =
> [cockpit-naming 快照](../../notes/archived/2026-09-28-cockpit-naming.md)。
> 读完去哪：运行模型与四类状态 = [50](./50-agent-loop-and-state.md)。

## 1. 定位与命名分层

**一句话**：DSH Web GUI 右栏的观察面 client 套件——多 agent 研究运行期间，人在这里
"看仪表、关键时刻接手"（cockpit 隐喻 = 静默自主期看仪表 + HITL 挂起时接手）。存在理由
（用户点名）：run 期观察分散四处、HITL 等待不可见——"调试的时候让我知道底下在干什么、
它在等我"。它是 [D7](../decisions.md) 纯配置包教义的**有界例外**（[D18](../decisions.md)；另一处 = 抓取回退 provider，[D31](../decisions.md)）。

| 层 | 名 | 指什么 | 改动频率 |
|---|---|---|---|
| 伞 | 观察面 | 驾驶舱 + 仪表盘投影（D18 原语义） | — |
| **套件** | **研究驾驶舱（Research Cockpit）** | `src/client/` 的 React 件全体 | **最频** |
| 折算层 | folds | `src/lib/` 纯函数谓词（keyless 单测；驾驶舱与 HTML 投影共享 HITL/步骤事实适配） | 少 |
| 投影 | 仪表盘（run-dashboard） | `scripts/run-ops/run-dashboard.mjs` 只读 HTML 投影（抛弃型、永不入库） | 少 |

件名保留：「研究状态」页签是驾驶舱**里的一个件**，不与套件名混用；目录名守 DSH 双半
约定 host/client（不叫 `src/cockpit/`），套件名钉 `src/client/index.ts` 入口头注。

## 2. 构成（件 → 文件 → 职责）

| 件 | 文件 | 一句话 | 详情 |
|---|---|---|---|
| 研究状态页签 | ResearchStatusTab.tsx | 右栏页签，自上而下八区（逐区职责见下表） | [§2.1](#cockpit-1) |
| 活标题 | ResearchStatusTitle | 挂起时页签名变「研究状态 · ⏳ 等你拍板」 | [§2.2](#cockpit-2) |
| 流失败恢复指引 | stream-failure.ts | 末位回合死于上游流失败（MALFORMED_RESPONSE 族）且无新回合接手 → 人话横幅「等一两分钟发『继续』」 | [§2.3](#cockpit-3) |
| 品牌（虎鲸 Orca） | BrandMark.tsx | 宿主 `sidebar.brand.mark` + `sidebar.brand.name` 两槽的 single occup… | [§2.4](#cockpit-4) |
| 面板数据面 | config-tables.ts | 两个页签共用的**纯常量**：内置偏好（skill 方法预设的投影）、判型→打法映射、六条底线、四分区标签、领域示范、两个定制… | [§2.5](#cockpit-5) |
| 研究配置页签 | ResearchConfigTab.tsx | 右栏**摘要页签**（2026-10-21 管理迁移后）：只留 ① 本次研究（采用＋来源＋「换一条」，读 question.m… | [§2.6](#cockpit-6) |
| 方法库主 tab | MethodLibraryView.tsx | 主界面 `conversation.view` 第三 tab（Chat/Trajectory 同排）：我的库搜索/列表、内置参… | [§2.7](#cockpit-7) |
| 研究图谱页签 | ResearchGraphTab.tsx | 右栏**只读观察面**：顶层 plan 节点 / `agentTeam` 任务画成 SVG DAG（节点 + 依赖边 + 同层… | [§2.8](#cockpit-8) |
| 终稿页签 | ResearchFinalTab.tsx | 右栏页签：**认领 `drt_<slug>/` 的终稿地址族**（`final.md` / `final/vN.md` / `… | [§2.9](#cockpit-9) |
| 浏览器 RunSource 适配器 | run-source-browser.ts | `remote.workspaceFiles` → run-context 的 `Entry` / `Page` / `ver… | [§2.10](#cockpit-10) |
| 研究图谱页签体 | ResearchGraphTab.tsx | 页签体：头部（「只读观察」标记 + plan/task 计数）+ 正文首行版本轨（`plan/vN` 快照 → 「当前图 / … | [§2.11](#cockpit-11) |
| 研究图谱注入面 | research-graph/types.ts | 「研究图谱」页签的注入面类型（`runSource` / `follow` / 可选 `openOwner` 三条闭包，数据面… | [§2.12](#cockpit-12) |
| 研究语义工具卡 | ResearchToolCard.tsx | 对话流卡片：`spawn_teammate` → 组队卡、`web_search` → 检索卡（2 张） | [§2.13](#cockpit-13) |
| 挂起显性化 | index.ts | pending false→true 迁移时 `openTab` 右栏自动展开 | [§2.14](#cockpit-14) |
| keyed 常量 | keys.ts | 字面量唯一正本（`client-keys` 门禁对账——拼错不报错、永不渲染） | [§2.15](#cockpit-15) |
| host 半 | src/index.ts | 空壳宿主位（bundle 行 name = 包名；浏览器半经 `exports["./client"]` 装配） | [§2.16](#cockpit-16) |

页签八区（自上而下）：

| 区 | 职责 |
|---|---|
| ⓪ 业务摘要层 | 五问业务语言（研究什么 / 已确认什么 / 未知什么 / 你现在要不要操作）；折算住 brief-fold，计数不进本层 |
| ① HITL 挂起横幅 | 点名锚点 + 参与指引 |
| ② 流程轨道 | ◆立项确认 + 立项→组队→侦察→挖掘→综合→审查 + ◆交付审阅 + 交付（步序正本 = [NODES](../../research-workspace/NODES.md)；↻ 图例仅在交付审阅锚点到达后出现，不证明已执行 rerun：补研究回挖掘并扩张版本 / 表述修订原位改 / 结构性重构另起新 bundle；显示 v2+ 才是本 bundle 已有证据扩张版的文件证据；交付节点带 `final/` 版本；步态符号 ✓已过 / ●进行中 / ○未到——done 绿字、current 琥珀唯一、回边落点重入描边，与仪表盘同语法） |
| ③④⑤ 现状三件 | ③ 研究问题行 · ④ 人性化活动流 · ⑤ 证据计数 + 交付状态（present 见证）+ rerun 版本面一行（`run-version`：已交付版本/rerun 声明/HITL2 待审） |
| ⑥ 决策诚实线 | 指路 question.md §Decisions |
| ⑦ 队员动态折叠区 | [member-activity-stream 卡](../../_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)：agentTeam 投影取 roster → 多路 follow 队员会话 → 检索/抓取/出错动作行，每人一节默认折叠 + 计数徽标 |

折算层（`src/lib/`，全部纯函数、fail-soft 永不 throw；全量清单 = 盘上目录；下表为核心折算件，`library-fold` / `stream-failure` 见上表组件行；journal-wire 为五个入参折算件共享的 wire 解析核）：

| 折算 | 输入 → 输出 | 要点 |
|---|---|---|
| [hitl-fold](../../packages/deep-research-pack/src/lib/hitl-fold.ts) | journal 事件 → 挂起态 + 流程锚点三态 | 末位 ask 状态机保留 timed pending；匹配的非 pending result 或 user/message 关闭挂起；`deriveAnchors` 按问卡内容签名与文件事实定锚，中途确认如实显示 |
| [journal-wire](../../packages/deep-research-pack/src/lib/journal-wire.ts) | wire 入参/正文 → 解析共享核 | 「JSON 字符串或对象 + 截断容错」的单一正本 + queries / content text 归一；各消费方保留自己的失败哨兵（null / undefined / false / 0 / 'unknown'），本件只供解析核 |
| [run-fold](../../packages/deep-research-pack/src/lib/run-fold.ts) | bundle 文件在场性 → 步骤条 | 驾驶舱与 HTML 仪表盘共用七步三态折算与最高版本号解析（仪表盘经 `deriveStep` 适配内容模型后复用；矩阵折算归仪表盘 `run-dashboard-core.mjs` 自持） |
| [run-context](../../packages/deep-research-pack/src/lib/run-context.ts) | slug/ref ＋ 工作区文件事实 → 已定位 run 的读面 | 三位置发现（D28：位置只用于发现）、同名根优先、空根不让位、review/final 读到 eof、plan/question 限行、missing/unreadable 区分；I/O 由 `RunSource` 注入（浏览器/Node 各一适配器） |
| [graph-model](../../packages/deep-research-pack/src/lib/graph-model.ts) | `plan.md` 节点表 ＋ Team 任务 → 四态映射（mapped / unmapped / stale / plan-only）＋ 覆盖率 | 没有 mapped task 的节点显示「状态未知」，绝不回落「未执行」；`task_id` 有值但 Team 板没有该任务（恢复会话重建任务后必现）= stale，与未映射分开报；显式 `plan-only` 不算缺口；覆盖率分母 = active 节点（墓碑不算），Team 侧多余任务单列 |
| [run-version](../../packages/deep-research-pack/src/lib/run-version.ts) | `plan.md` 头/重写记录 + `plan/vN` 快照 + `final/vN` 版本账 + present 见证 + question.md 的 `> rerun:` 行 → 版本面一行 | 版本只取机器可读声明（`图版本：vN` / `图版本 vN`），头与记录不一致两个都报；`present` 不带版本号，已交付版本按版本账推定且 >1 时标「推定」；无 present 不说已交付 |
| [rerun-triage](../../packages/deep-research-pack/src/lib/rerun-triage.ts) | 常量 → 交付后只读出口文案（三种改法） | 补研究 / 改说法 / 另起一个 bundle 的用户语言 + 版本后果 + 可复制的一句话；状态页 ⑤ 与终稿页脚共用同一常量（两处各抄必漂移）；**无动作面**——观察面只给话术，不按钮化 rerun（D18） |
| [plan-diff](../../packages/deep-research-pack/src/lib/plan-diff.ts) | 旧图快照 ＋ 当前 plan 的节点表 → 结构 diff（新增/退役/保留/重编号/依赖变化） | 只比 id/lifecycle/deps 三件；重编号只认 `superseded_by:`/`merged_into:` 结构化后缀，不解析重写记录散文；alias 目标不算新增；墓碑不进 active 集合 |
| [plan-graph](../../packages/deep-research-pack/src/lib/plan-graph.ts) | Team 任务板 + 队员状态 → 分层/波次/attention/计数/worker chips | 最长路径分层；**不发明 failed**（Team 只有 pending/in_progress/completed/deleted，失败只以 owner 会话 failed 出现）；卡住是启发式（文案写「可能卡住」）；缺 since 不编造年龄；成环钳在节点数−1 |
| [plan-index](../../packages/deep-research-pack/src/lib/plan-index.ts) | `plan.md` 节点表 → 节点索引 + 只读结构提示 | 解析 id/parent/kind/deps/task_id；根 W 的 kind 派生 stage；`planIssuesOf` 报重号/悬空 parent/悬空 dep/自依赖/wave 前缀（不是 node-gate）；缺文件/无表 = 空索引，不是错误 |
| [activity-fold](../../packages/deep-research-pack/src/lib/activity-fold.ts) | journal 事件 → 活动行 | 🔍 检索 / 👥 派出与队员作业中（wait_agent，连续折叠）/ 💬 成员 / 📦 交付；markdown 源标记与原始事件类型名不出正文（噪音过滤，尾部 30 行） |
| [bundle-bind](../../packages/deep-research-pack/src/lib/bundle-bind.ts) | journal 事件 → 本会话绑定的 run slug + 绑定强度 | 只认 `tool/call` 参数路径里的 `drt_<slug>/`；**写强读弱**——write/edit 命中直接定绑，仅读命中兜底（立项预检读旧 bundle 的错绑防线，2026-09-28 首跑实证）；可信性政策 = binding-trust |
| [binding-trust](../../packages/deep-research-pack/src/lib/binding-trust.ts) | journal 事件 → 可信绑定三态（bound / unbound / suppressed） | write 永远可信；read 在 HITL 挂起 / 立项信号下抑制并带 reason（pending / kickoff）；其余 read 可信。三页签只消费结论，不再各自解释 raw binding |
| [tool-card](../../packages/deep-research-pack/src/lib/tool-card.ts) | call/result 切片 → 卡片状态 | running / ok / error / stopped |
| [final-target](../../packages/deep-research-pack/src/lib/final-target.ts) | journal 交付事件 / 文件地址 / 终稿路径 → 本次交付 + 会话文件 + 读面定表 + 自动打开判据 | `present`（`deliverables/presented`）是交付的机械判据（node-gate 门②）；`final.md` 在场只说明"有终稿可审"（综合步就落盘），不是交付。地址认领终稿族（根 / `archive/` / `_abandoned/` 三位置 + `final/` 下 `vN.md`、`readable.md`、`readable-vN.md`），`drafts/final.md` 与绝对域全拒；交付记录的位置失效时由 run-context 的 `openRun` 按三位置回退；自动打开 = `shouldOpenFinal`（有交付 / `callId` 未开过 / 焦点不在可编辑元素），present 同时带 reader 与 vN 时优先打开 reader |
| [member-activity](../../packages/deep-research-pack/src/lib/member-activity.ts) | 队员 journal 事件 → 检索/抓取/出错动作行 + 全量计数 | 粒度定夺 = [member-activity-stream 卡](../../_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)（2026-10-10 用户三问：文件读写不入流）；失败行剥 "Error: " 工程前缀；行截尾窗与 activity-fold 同款 |
| [brief-fold](../../packages/deep-research-pack/src/lib/brief-fold.ts) | 既有事实源投影 → 业务摘要五问 | 输入面**不含**证据计数与工具调用数（计数在类型层面进不了完成态文案，keyless 禁词单测钉）；九态优先级 = 挂起 > 立项预检窗 > 未绑定 > 审查 FAIL > 已交付 > 推进中；派生不出的状态显式缺省，不虚构 |
| [review-readiness](../../packages/deep-research-pack/src/lib/review-readiness.ts) | review.md 全文 → 终局 readiness 三态 | 只认**行首**判定行、取最后一条：文末附录保留的轮次血统（如首轮 `readiness: FAIL`）是行内引用，不得夺权；空模板 `PASS \| FAIL`、无判定行或输入畸形 → `null`（不猜）。驾驶舱、仪表盘与 client-load-smoke 直接消费；node-gate 在纯 `.mjs` 边界镜像同一规则并由 `gateBundle` 回归覆盖 |
| [text-fold](../../packages/deep-research-pack/src/lib/text-fold.ts) | markdown 行内文本 → 可进纯文本节点的文本 | 剥 `**` 与反引号 ＋ 压空白 ＋ 截断补省略号；状态页签与配置页签共用本件（`**` 字面星号上卡面、长摘要拉爆列表——唯一正本在本件） |
| [method-of-question](../../packages/deep-research-pack/src/lib/method-of-question.ts) | question.md 文本 ＋ bundle 在场性 → 「本次研究」区五态 | 无 run／文件缺／未记录／无法判定／已记录；**判不了就说判不了**——绝不回落成默认打法名（旧 run 未记录 = 合法形态，不回填）；读方法节须显式足额 limit（模板第 32–40 行卡默认 40 行，BUG-026 同族） |
| [receipt-fold](../../packages/deep-research-pack/src/lib/receipt-fold.ts) | 发送结果 ＋ 回话信号 ＋ 库前后快照 → 回执三态与 diff | 已发送（prompt ok）／Lead 已回话（发送**之后**的 assistant 事件）／已落盘（回读对账出 diff：`把「找来源」从 A 改成 B`）；对账读不出变化就退到已回话，不冒充落地 |

---

<a id="cockpit-1"></a>
### 2.1 研究状态页签

**文件**：[ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) + [TrackRail.tsx](../../packages/deep-research-pack/src/client/research-status/TrackRail.tsx)（流程轨道：取色/步态符号/回边几何）+ [useStatusFeed.ts](../../packages/deep-research-pack/src/client/research-status/useStatusFeed.ts)（数据装配：journal follow / bundle 扫描 / 绑定可信性 / 锚点与版本面）+ `src/client/research-status/useMemberActivity.ts` + `src/client/research-status/types.ts` + [run-version.ts](../../packages/deep-research-pack/src/lib/run-version.ts)

右栏页签，自上而下八区（逐区职责见 §2 开头的「页签八区」表）；⑤ 另带 rerun 版本面一行（`v1 已交付 · v2 证据扩张 rerun · HITL2 待审`）+ 已交付后的只读折叠块「还不满意？三种改法」（`rerun-triage` 文案）；队员多路 journal 订阅生命周期在页签私有 hook，注入类型在同目录定义

<a id="cockpit-2"></a>
### 2.2 活标题

**文件**：同上（`ResearchStatusTitle`）

挂起时页签名变「研究状态 · ⏳ 等你拍板」

<a id="cockpit-3"></a>
### 2.3 流失败恢复指引

**文件**：[stream-failure.ts](../../packages/deep-research-pack/src/lib/stream-failure.ts) + ResearchStatusTab.tsx

末位回合死于上游流失败（MALFORMED_RESPONSE 族）且无新回合接手 → 人话横幅「等一两分钟发『继续』」；折算纯函数，BUG-023 修复①

<a id="cockpit-4"></a>
### 2.4 品牌（虎鲸 Orca）

**文件**：[BrandMark.tsx](../../packages/deep-research-pack/src/client/BrandMark.tsx)

宿主 `sidebar.brand.mark` + `sidebar.brand.name` 两槽的 single occupant（替换内置鱼形 logo 与本地构建标签）——用户定调 2026-10-13

<a id="cockpit-5"></a>
### 2.5 面板数据面

**文件**：[config-tables.ts](../../packages/deep-research-pack/src/lib/config-tables.ts)

两个页签共用的**纯常量**：内置偏好（skill 方法预设的投影）、判型→打法映射、六条底线、四分区标签、领域示范、两个定制入口指令逐字。住在 lib 而非视图（数据/展示分层；keyless 测试直接 import，不再 AST 扒 TSX）

<a id="cockpit-6"></a>
### 2.6 研究配置页签

**文件**：[ResearchConfigTab.tsx](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) + [LegacyManagementPane.tsx](../../packages/deep-research-pack/src/client/research-config/LegacyManagementPane.tsx)（`COMPACT=false` 的四区回滚面，D25）+ [method-of-question.ts](../../packages/deep-research-pack/src/lib/method-of-question.ts)

右栏**摘要页签**（2026-10-21 管理迁移后）：只留 ① 本次研究（采用＋来源＋「换一条」，读 question.md 方法节五态）与「方法库（本工作区）→ 顶部 tab」入口；库列表/内置卡/领域示范/术语/管理回执移入主界面「方法库」tab。指令仍经 `session/prompt` 交 Lead（面板不直写文件）

<a id="cockpit-7"></a>
### 2.7 方法库主 tab

**文件**：[MethodLibraryView.tsx](../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) + [views.tsx](../../packages/deep-research-pack/src/client/method-library/views.tsx)（三种视图，纯展示）+ [coach.tsx](../../packages/deep-research-pack/src/client/method-library/coach.tsx)（新建/编辑态右栏「方法编辑」面板；根级 portal + store）+ [styles.ts](../../packages/deep-research-pack/src/client/method-library/styles.ts) + [library-fold.ts](../../packages/deep-research-pack/src/lib/library-fold.ts) + [method-draft.ts](../../packages/deep-research-pack/src/lib/method-draft.ts)（`method-draft` 围栏解析 → 表单回填）+ [method-library-write.ts](../../packages/deep-research-pack/src/lib/method-library-write.ts)（库条目 upsert 纯函数）+ [method-library-tool.ts](../../packages/deep-research-pack/src/method-library-tool.ts)（host 窄工具 `method_library_upsert`）+ [MethodLibraryToolCard.tsx](../../packages/deep-research-pack/src/client/MethodLibraryToolCard.tsx)（写库工具卡）

主界面 `conversation.view` 第三 tab（Chat/Trajectory 同排）：我的库搜索/列表、内置参考只读、四字段编辑/新建/删除；新建/编辑态为页内三栏（我的库 / 表单 / 方法编辑）——方法编辑是 D37 的第 5 个 preset（非研究；工具面不含 web/fs）的独立 root session，React 树在根级 `shell.overlay`、`createPortal` 进页面右栏；表单每格带人话提示与「来自对话/手改/待定」标记、设默认偏好勾选，撞名保存前确认，读态「和编辑聊聊」/「删除…」（删除走方法编辑 `method_library_remove`，不直发 Lead）；起手式含从零/照内置/从最近 run 沉淀（run 上下文只读 question.md/final.md）；页面激活时外层主 composer 由 CSS 隐藏（外层问卡让位）。保存走方法编辑：页面发保存封套 → 方法编辑调 host 窄工具 `method_library_upsert` 写 `method-library.md` → 页面读回对账 → 三态回执；面板不直写文件；工具只碰 `method-library.md`（D25 2026-10-28 修订）

<a id="cockpit-8"></a>
### 2.8 研究图谱页签

**文件**：[ResearchGraphTab.tsx](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx) + [DagMap.tsx](../../packages/deep-research-pack/src/client/research-graph/DagMap.tsx)（DAG 小图，几何/交互只读它）+ [useGraphFeed.ts](../../packages/deep-research-pack/src/client/research-graph/useGraphFeed.ts)（数据装配：journal 绑定 / plan.md 与快照读取）+ [NodeCard.tsx](../../packages/deep-research-pack/src/client/research-graph/NodeCard.tsx)（节点卡与展开详情）+ [GraphVersionRail.tsx](../../packages/deep-research-pack/src/client/research-graph/GraphVersionRail.tsx)（版本轨与旧图快照）+ [GraphNotices.tsx](../../packages/deep-research-pack/src/client/research-graph/GraphNotices.tsx)（plan 结构提示 / 需要你注意）+ [state-note.ts](../../packages/deep-research-pack/src/client/research-graph/state-note.ts)（降级说明的纯映射）+ [styles.ts](../../packages/deep-research-pack/src/client/research-graph/styles.ts)+ [WorkerChips.tsx](../../packages/deep-research-pack/src/client/research-graph/WorkerChips.tsx) + [format.ts](../../packages/deep-research-pack/src/client/research-graph/format.ts) + `src/client/research-graph/types.ts` + [plan-graph.ts](../../packages/deep-research-pack/src/lib/plan-graph.ts)（Team 任务图）+ [plan-index.ts](../../packages/deep-research-pack/src/lib/plan-index.ts)（plan.md 解析/结构提示）+ [graph-model.ts](../../packages/deep-research-pack/src/lib/graph-model.ts)

右栏**只读观察面**：顶层 plan 节点 / `agentTeam` 任务画成 SVG DAG（节点 + 依赖边 + 同层并行 + 状态色）；复合节点 W3.1… 默认收在父节点详情，图上标 `+n`（内部节点数）；`plan.md` 提供 parent/lifecycle/kind/stage（派生）/depth/acceptance、版本与重写记录；节点详情可复制 `drt_<slug>/W3.1` 引用；重号/悬空 parent/deps/墓碑/跨组显示只读结构提示；无 plan/无 blocked_by 时明确「没有可画的 DAG」，不画假图；不提供调整动作

<a id="cockpit-9"></a>
### 2.9 终稿页签

**文件**：[ResearchFinalTab.tsx](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) + [final-target.ts](../../packages/deep-research-pack/src/lib/final-target.ts)

右栏页签：**认领 `drt_<slug>/` 的终稿地址族**（`final.md` / `final/vN.md` / `final/readable.md` / `final/readable-vN.md`；`extension` 带；交付卡片、结句内联引用、Files 树落到同一页签）——正文**有读者版默认看读者版**，否则看 `final/` 版本账最高版（`审计版 vN`）；可切「看审计版 / 看读者版」，没有版本账才直接读 `final.md`。静音条只讲盘上事实（`读者版 vN` / `审计版 vN` / `当前工作稿` / `审查未过`；**不写"已交付"**——版本目录不是交付凭证，交付只由⑤ 的 `present` 见证说），`过程 →` 回研究状态；正文末尾同款只读折叠块「还不满意？三种改法」。读面是一张定表（`final.md` / `final/vN` / `final/readable*` / `review.md` / `final/`），经 run-context 按三位置解析；review.md 读到 eof（终局判定在文末）

<a id="cockpit-10"></a>
### 2.10 浏览器 RunSource 适配器

**文件**：[run-source-browser.ts](../../packages/deep-research-pack/src/client/run-source-browser.ts)

`remote.workspaceFiles` → run-context 的 `Entry` / `Page` / `version` 映射；`workspace-file/not-found` → missing，其它错误 → unreadable；位置/读策略/翻页归 lib，本件不重复

<a id="cockpit-11"></a>
### 2.11 研究图谱页签体

**文件**：[ResearchGraphTab.tsx](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)

页签体：头部（「只读观察」标记 + plan/task 计数）+ 正文首行版本轨（`plan/vN` 快照 → 「当前图 / 看 vN 旧图 / 看差异」，结构 diff 折算住 [plan-diff](../../packages/deep-research-pack/src/lib/plan-diff.ts)；无快照如实「无旧图快照，不能 diff」）+ 覆盖率（`已映射 K / 未映射 N-K`，另有失效与 plan-only 才追加）+ 最后刷新时刻；映射缺口横幅说「图谱无法判断」，不说「未执行」；SVG DAG 小图（`wavesOf` 分层、同层横排、边 = plan deps / Team `blocked_by`）+ 顶层节点列表 + 选中详情（description 高度上限、复合子节点展开、复制引用）+「需要你注意（只读）」+ plan 结构提示；底部 `plan.md` 原文折叠与 plan↔task 映射计数；无依赖边时只显示任务快照并说明原因

<a id="cockpit-12"></a>
### 2.12 研究图谱注入面

**文件**：[research-graph/types.ts](../../packages/deep-research-pack/src/client/research-graph/types.ts)

「研究图谱」页签的注入面类型（`runSource` / `follow` / 可选 `openOwner` 三条闭包，数据面全部复用既有 remote，无新 RPC）；`follow` 只用于 `bindingTrust` 找可信的 `drt_<slug>/`，页签只读，不注入发送通道

<a id="cockpit-13"></a>
### 2.13 研究语义工具卡

**文件**：[ResearchToolCard.tsx](../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) + [tool-card.ts](../../packages/deep-research-pack/src/lib/tool-card.ts)

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


## 3. 数据通道与接线

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
- **页签自带滚动口**：vendor `.tabBody` 是定高 flex 列且 `overflow: hidden`——页签体必须自己开内
  滚动区（根 `flex: 1; minHeight: 0`，内容区 `overflowY: auto`），否则长内容被裁且滚不动（2026-10-12
  状态页、2026-10-20 终稿页各踩一次；`client-load-smoke` 断言终稿滚动口可动）；
- **会话绑定**：渐进面只显示**本会话自己的** run bundle（不显示别家数据）；位置只用于发现，
  三个位置都认（根 / `archive/` / `_abandoned/`），状态从内容读（D28）；未绑定如实提示；写强读弱 +
  挂起期抑制仅读绑定的渐进面（预检读取不算"本会话的 run"）。
- **页签内区块归属**：每个页签的头部/正文/底部以 §2 的页签行为准；新增块先在该行写归属区
  （图谱：头部 = 只读标记 + plan/task 计数；正文首行 = 版本轨；其下 = 覆盖率 + 刷新时刻），不另立第二套布局说明。
- **发现规则单源**：驾驶舱 client 的三位置发现实现 = `src/lib/run-context.ts`；机械侧 = `run-context-single-source`（`src/client` 非注释 `_abandoned` 即红；`src/lib` 的终稿地址校验不在词法门禁范围）。`dev/hitl-answer` 与 `dev/run-kickoff` 的盘侧路径枚举、`run-dashboard` 投影与 `client-load-reference` oracle 各自保留，不在此行。

## 5. 验证面与改动路由

| 面 | 命令 | 断言什么 |
|---|---|---|
| keyless 真浏览器 | `client-load-smoke` | 插件零失败 + 页签渲染 + 渐进面与**磁盘真值对账**（证据计数 / 交付态〔= `present` 见证〕/ 问题行）+ 图谱覆盖率行（已映射/未映射）+ 锚点轨道与诚实线对账（盘侧独立重算）+ 未绑定负样本 + 终稿页签端到端（⑤ 交付门 → 默认版本账正文与盘侧首标题对账 + 版本切换在场） |
| 真模型档 | `client-hitl-smoke` | 活标题翻转 + 横幅 + 挂起迁移 → 右栏自动展开（端到端） |
| keyless 单测 | `pnpm test` | 折算谓词纯函数（§2 所列折算各有测试文件） |

改动路由（怎么改、按什么次序）= [guides/60 §2 任务型路由表](../guides/60-dev-loop.md)
「改驾驶舱」行：`src/client/` + tsconfig include + `dsh.client.inject` + keyed 字面量进
`keys.ts` → `pnpm build` → `client-load-smoke`（改挂起显性化再跑 `client-hitl-smoke`）。

## 6. 已知限制与延后工作

- **run-dashboard / client-load-reference oracle 保留独立**：dashboard 是同步 HTML 投影，oracle 的价值在独立（复用生产实现会掩盖漂移）；两者不复用 run-context，边界见 [run-context Note](../../notes/implemented/2026-10-23-run-context.md)。

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
  现在失败走独立文案「绑定状态读取失败」+ 有界重试（3 次 / 2s），恢复后自动补上。新增观察面
  读取路径时同守此条：catch 里不许只 `console.error` 后落回"空"态。

- **版本账 ≠ 交付凭证**：`final/vN.md` 是版本记账（听 HITL2 前模型就会先落 v1），
  「已交付」只由状态页 ⑤ 的 `present` 见证说；终稿页签因此只标「vN（版本账）/当前工作稿」。
  旧 run 没有 `plan/vN` 快照时，图谱如实显示「无旧图快照」，不重建旧图。

- **`task_id` 空白的 plan 节点**：图谱显示「状态未知（未映射 task_id）」并计入覆盖率缺口——
  不把缺口读成「未执行」。凭证 = 夹具 `tests/fixtures/plan-mapping/` + 受控 E2E run
  `archive/drt_e2e-rerun-2026-10-23`（整列 `task_id` 空白时现场显示「状态未知」与覆盖率缺口）。
  Lead 回填后 5s 内与 Team 板对齐；不自动建 task、不改历史 plan。投影未就绪时显示
  「等待团队投影」，不预设缺口。

- **研究图谱页签（2026-10-21）**：只读观察面，不是任务 CRUD、也不是操作台；数据 =
  `agentTeam` / `subagentCatalog` / session status / `plan.md`。顶部 SVG DAG（顶层 plan 节点优先，
  边 = plan deps / Team `blocked_by`；同层并行横排），下方节点详情与 `plan.md` 原文；复合节点
  W3.1… 默认收在父节点详情（图上标 `+n`），节点可复制 `drt_<slug>/W3.1` 引用；重号/悬空 parent/deps/墓碑/跨组
  显示只读结构提示。无 plan/无依赖边时明确说「没有可画的 DAG」，只显示任务快照。调整回对话或
  rerun，侧栏不发“让 Lead 调整”这类不知道调什么的指令。任务粒度仍归 `ui-agent-team`。

- **方法库主 tab 只在 active conversation 出现**：DSH 的空白 New Session hero 不渲染
  `conversation.view` tabs（Chat/Trajectory 也没有）；管理库需打开一个有历史的会话。后续若要让
  新会话也能进库，应在 hero/左栏补入口，不改 `conversation.view` 本身。

- **右栏 pane 仍可能钉在上一会话（vendor 面板会话绑定，2026-10-21 实测）**：主视图切到绑定会话 A
  后，右栏仍显示会话 B 的页签内容（client-load-smoke 实测：active row = d47b…，面板仍是
  1392… 的 Rerun8 团队/2 subagents）。收起/重开右栏可重绑；状态/图谱页签以 **pane 的 session**
  为准，不把 pane 内容当主视图真值。修复归 vendor 的 pane 会话绑定，不归本页签。

- **会话必须建在研究工作区里**才有渐进面（workspaceFiles 读的是会话工作区根）；建在
  别处的会话只显示活动流（详见 [pack README 已知限制](../../packages/deep-research-pack/README.md)）；
- **队员动态折叠区（member-activity-stream，2026-10-10 落地）**：lead 活动流照旧只折 lead 会话；
  队员动作走**每人折叠区**（agentTeam 投影发现队员会话 id——spawn 返回不带 id，通道探明实证；
  多路 follow 各自会话）→ member-activity 折算**检索/抓取/出错**粒度（文件读写不入流，用户
  定夺）。边界：① 有团队正例首验 = 下一场真实 run（投影不进 journal，keyless 回放不可造；
  无团队负例已入 client-load-smoke 常驻断言，spawn 名 ↔ roster 对账断言已编码、届时自动生效）；
  ② 每队员 follow 首帧 = 全量历史（量级 ≈ lead 同阶）；③ 分工不双 home——任务粒度归
  `ui-agent-team` 任务板，本区只答动作粒度；
- **组队步无独立文件**：轨道的组队步在场性随立项（cursor 在"立项完成 → 侦察交付"窗口停靠
  组队——该窗口即组队+侦察进行段，活动流区分两者）；HTML 步骤条通过适配器消费同一 `deriveSteps`。
- **工具卡只 2 张**：`team_task_*` 等协调类工具不进对话渲染流（harness 排除），团队观察
  由 `ui-agent-team` 任务板承担；
- 活标题与页签体各开一条 follow 流共用 WebSocket 数据面（v1 接受，合流是后续优化）；
- 终稿页签的标题固定「终稿」（不做活标题）：同一会话先后跑两场研究会有两个同名页签，靠静音条的
  run 路径（hover）与正文 H1 区分——真咬到再升活标题；
- 交付门的判据是 `present` 事件在 journal 窗口内（回合窗口 ≈ 最近 50 条消息）：窗口外的老交付
  只显示承诺行、不显示「✅ 已交付」——宁可少说，不虚报；
- 终稿路径按三位置回退读（交付记录的是当时位置，bundle 归档/停放后原路径失效——首条端到端
  实测即撞上某次已归档 run）；
- 自动打开只在**现场**交付事件上触发（回放不触发），keyless 冒烟无真模型交付：该路径的接线
  只有 `shouldOpenFinal` 的 keyless 证据，端到端观察留待下一场真实 run；
- 从未开过页签的会话无 dock 观察者——挂起信号由 vendor 侧栏 Answer 徽标兜底；
- 版本兼容：`engines.dsh` = `>=0.2.1-rc.2 <0.3.0-0`（`-0` 排除 0.3 预发布）；已测基线 = `0.2.1-rc.2` + `0.2.1-rc.3`。

## 7. 历史指针（"为什么当初这么选"——notes 树）

演进链（每篇含输掉的方案与实测战果）：琢磨稿
[ui-observability-surfaces](../../notes/archived/2026-09-24-ui-observability-surfaces.md)
（选项推敲 + company 十二坑考古）→ RFC
[observability-gui](../../notes/implemented/2026-09-24-observability-gui.md)（马拉松
Stage 0–3；留活跃：`client-keys` 门禁红证出处）→
[research-status-ui](../../notes/archived/2026-09-25-research-status-ui.md)（UI 优先改版）→
[bundle-face-wiring](../../notes/archived/2026-09-26-bundle-face-wiring.md)（渐进面接通根因链）→
[right-pane-ux-debt](../../notes/archived/2026-09-28-right-pane-ux-debt.md)（挂起显性化 +
会话绑定）→ [cockpit-naming](../../notes/archived/2026-09-28-cockpit-naming.md)（定名）。
门禁台账对它的引用 = [evaluation.md §L0](../evaluation.md)。
