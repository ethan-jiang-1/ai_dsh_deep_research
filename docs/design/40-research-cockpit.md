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
它在等我"。它是 [D7](../00-index.md) 纯配置包教义的**单点例外**（[D18](../00-index.md)）。

| 层 | 名 | 指什么 | 改动频率 |
|---|---|---|---|
| 伞 | 观察面 | 驾驶舱 + 仪表盘投影（D18 原语义） | — |
| **套件** | **研究驾驶舱（Research Cockpit）** | `src/client/` 的 React 件全体 | **最频** |
| 折算层 | folds | `src/lib/` 纯函数谓词（keyless 单测；驾驶舱与 HTML 投影共享 HITL/步骤事实适配） | 少 |
| 投影 | 仪表盘（run-dashboard） | `scripts/run-ops/run-dashboard.mjs` 只读 HTML 投影（抛弃型、永不入库） | 少 |

件名保留：「研究状态」页签是驾驶舱**里的一个件**，不与套件名混用；目录名守 DSH 双半
约定 host/client（不叫 `src/cockpit/`），套件名钉 `src/client/index.ts` 入口头注。

## 2. 构成（件 → 文件 → 职责）

| 件 | 文件 | 职责 |
|---|---|---|
| 研究状态页签 | [ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) + `src/client/research-status/useMemberActivity.ts` + `src/client/research-status/types.ts` | 右栏页签，自上而下八区（逐区职责见下表）；队员多路 journal 订阅生命周期在页签私有 hook，注入类型在同目录定义 |
| 活标题 | 同上（`ResearchStatusTitle`） | 挂起时页签名变「研究状态 · ⏳ 等你拍板」 |
| 流失败恢复指引 | [stream-failure.ts](../../packages/deep-research-pack/src/lib/stream-failure.ts) + ResearchStatusTab.tsx | 末位回合死于上游流失败（MALFORMED_RESPONSE 族）且无新回合接手 → 人话横幅「等一两分钟发『继续』」；折算纯函数，BUG-023 修复① |
| 品牌（虎鲸 Orca） | [BrandMark.tsx](../../packages/deep-research-pack/src/client/BrandMark.tsx) | 宿主 `sidebar.brand.mark` + `sidebar.brand.name` 两槽的 single occupant（替换内置鱼形 logo 与本地构建标签）——用户定调 2026-10-13 |
| 研究配置页签 | [ResearchConfigTab.tsx](../../packages/deep-research-pack/src/client/ResearchConfigTab.tsx) + [library-fold.ts](../../packages/deep-research-pack/src/lib/library-fold.ts) + [method-of-question.ts](../../packages/deep-research-pack/src/lib/method-of-question.ts) + [receipt-fold.ts](../../packages/deep-research-pack/src/lib/receipt-fold.ts) + [text-fold.ts](../../packages/deep-research-pack/src/lib/text-fold.ts) | 右栏页签（D25 期 1 管理中继面 ＋ 2026-10-18 显式化期）：四区 = ① 本次研究（本次采用＋来源＋换一条，读 question.md 方法节五态）② 内置打法（只读卡：一句话 ＋ 什么时候用它 ＋ 标本位）③ 我的偏好库（`method-library.md` 投影）④ 底线条（六条共同底线 ＋ 两个定制入口）＋ 就地回执三态（已发送／Lead 已回话／已落盘对账）；管理指令经 `session/prompt` 交 Lead（steer→queue 降级）——**面板不直写文件**；显示面与 skill 四处同钉（内置表／推荐映射／共同底线／两入口逐字，tests/library-fold 把守） |
| 终稿页签 | [ResearchFinalTab.tsx](../../packages/deep-research-pack/src/client/ResearchFinalTab.tsx) + [final-target.ts](../../packages/deep-research-pack/src/lib/final-target.ts) | 右栏页签：**接管 `drt_<slug>/final.md` 的文件地址**（`extension` 带；交付卡片、结句内联引用、Files 树落到同一页签）——交付后整篇渲染 run 根 `final.md`。静音条只讲盘上事实（`vN` / `当前版` / `审查未过`；**不写"已交付"**——版本目录不是交付凭证，交付只由⑤ 的 `present` 见证说），`过程 →` 回研究状态。读面是一张定表（`final.md` / `review.md` / `final/`），路径按三位置回退（原位 → `archive/` → `_abandoned/`） |
| 研究语义工具卡 | [ResearchToolCard.tsx](../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) + [tool-card.ts](../../packages/deep-research-pack/src/lib/tool-card.ts) | 对话流卡片：`spawn_teammate` → 组队卡、`web_search` → 检索卡（2 张） |
| 挂起显性化 | [index.ts](../../packages/deep-research-pack/src/client/index.ts)（`revealStatusTab`） | pending false→true 迁移时 `openTab` 右栏自动展开；页签 dock 折叠态保持挂载（观察者常在） |
| keyed 常量 | [keys.ts](../../packages/deep-research-pack/src/client/keys.ts) | 字面量唯一正本（`client-keys` 门禁对账——拼错不报错、永不渲染） |
| host 半 | [src/index.ts](../../packages/deep-research-pack/src/index.ts) | 空壳宿主位（bundle 行 name = 包名；浏览器半经 `exports["./client"]` 装配） |

页签八区（自上而下）：

| 区 | 职责 |
|---|---|
| ⓪ 业务摘要层 | 五问业务语言（研究什么 / 已确认什么 / 未知什么 / 你现在要不要操作）；折算住 brief-fold，计数不进本层 |
| ① HITL 挂起横幅 | 点名锚点 + 参与指引 |
| ② 流程轨道 | ◆立项确认 + 立项→组队→侦察→挖掘→综合→审查 + ◆交付审阅 + 交付（步序正本 = [NODES](../../research-workspace/NODES.md)；↻ 图例仅在交付审阅锚点到达后出现，不证明已执行 rerun：补研究回挖掘并扩张版本 / 表述修订原位改 / 结构性重构另起新 bundle；显示 v2+ 才是本 bundle 已有证据扩张版的文件证据；交付节点带 `final/` 版本；步态符号 ✓已过 / ●进行中 / ○未到——done 绿字、current 琥珀唯一、回边落点重入描边，与仪表盘同语法） |
| ③④⑤ 现状三件 | ③ 研究问题行 · ④ 人性化活动流 · ⑤ 证据计数 + 交付状态 |
| ⑥ 决策诚实线 | 指路 question.md §Decisions |
| ⑦ 队员动态折叠区 | [member-activity-stream 卡](../../_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)：agentTeam 投影取 roster → 多路 follow 队员会话 → 检索/抓取/出错动作行，每人一节默认折叠 + 计数徽标 |

折算层十二件（`src/lib/`，全部纯函数、fail-soft 永不 throw；journal-wire 为五个入参折算件共享的 wire 解析核）：

| 折算 | 输入 → 输出 | 要点 |
|---|---|---|
| [hitl-fold](../../packages/deep-research-pack/src/lib/hitl-fold.ts) | journal 事件 → 挂起态 + 流程锚点三态 | 末位 ask 状态机保留 timed pending；匹配的非 pending result 或 user/message 关闭挂起；`deriveAnchors` 按问卡内容签名与文件事实定锚，中途确认如实显示 |
| [journal-wire](../../packages/deep-research-pack/src/lib/journal-wire.ts) | wire 入参/正文 → 解析共享核 | 「JSON 字符串或对象 + 截断容错」的单一正本 + queries / content text 归一；各消费方保留自己的失败哨兵（null / undefined / false / 0 / 'unknown'），本件只供解析核 |
| [run-fold](../../packages/deep-research-pack/src/lib/run-fold.ts) | bundle 文件在场性 → 步骤条 | 驾驶舱与 HTML 仪表盘共用七步三态折算与最高版本号解析（仪表盘经 `deriveStep` 适配内容模型后复用；矩阵折算归仪表盘 `run-dashboard-core.mjs` 自持） |
| [activity-fold](../../packages/deep-research-pack/src/lib/activity-fold.ts) | journal 事件 → 活动行 | 🔍 检索 / 👥 派出与队员作业中（wait_agent，连续折叠）/ 💬 成员 / 📦 交付；markdown 源标记与原始事件类型名不出正文（噪音过滤，尾部 30 行） |
| [bundle-bind](../../packages/deep-research-pack/src/lib/bundle-bind.ts) | journal 事件 → 本会话绑定的 run slug + 绑定强度 | 只认 `tool/call` 参数路径里的 `drt_<slug>/`；**写强读弱**——write/edit 命中直接定绑，仅读命中兜底（立项预检读旧 bundle 的错绑防线，2026-09-28 首跑实证） |
| [tool-card](../../packages/deep-research-pack/src/lib/tool-card.ts) | call/result 切片 → 卡片状态 | running / ok / error / stopped |
| [final-target](../../packages/deep-research-pack/src/lib/final-target.ts) | journal 交付事件 / 文件地址 / 终稿路径 → 本次交付 + 会话文件 + 读面定表 + 自动打开判据 | `present`（`deliverables/presented`）是交付的机械判据（node-gate 门②）；`final.md` 在场只说明"有终稿可审"（综合步就落盘），不是交付。地址认领只收三个位置（根 / `archive/` / `_abandoned/`），`drafts/final.md` 与绝对域全拒；交付记录的位置失效时按三位置回退（`finalCandidates`）；自动打开 = `shouldOpenFinal`（有交付 / `callId` 未开过 / 焦点不在可编辑元素） |
| [member-activity](../../packages/deep-research-pack/src/lib/member-activity.ts) | 队员 journal 事件 → 检索/抓取/出错动作行 + 全量计数 | 粒度定夺 = [member-activity-stream 卡](../../_backlog/_archived/settled_issues/2026-10-09-member-activity-stream.md)（2026-10-10 用户三问：文件读写不入流）；失败行剥 "Error: " 工程前缀；行截尾窗与 activity-fold 同款 |
| [brief-fold](../../packages/deep-research-pack/src/lib/brief-fold.ts) | 既有事实源投影 → 业务摘要五问 | 输入面**不含**证据计数与工具调用数（计数在类型层面进不了完成态文案，keyless 禁词单测钉）；九态优先级 = 挂起 > 立项预检窗 > 未绑定 > 审查 FAIL > 已交付 > 推进中；派生不出的状态显式缺省，不虚构 |
| [review-readiness](../../packages/deep-research-pack/src/lib/review-readiness.ts) | review.md 全文 → 终局 readiness 三态 | 只认**行首**判定行、取最后一条：文末附录保留的轮次血统（如首轮 `readiness: FAIL`）是行内引用，不得夺权；空模板 `PASS \| FAIL`、无判定行或输入畸形 → `null`（不猜）。驾驶舱、仪表盘与 client-load-smoke 直接消费；node-gate 在纯 `.mjs` 边界镜像同一规则并由 `gateBundle` 回归覆盖 |
| [text-fold](../../packages/deep-research-pack/src/lib/text-fold.ts) | markdown 行内文本 → 可进纯文本节点的文本 | 剥 `**` 与反引号 ＋ 压空白 ＋ 截断补省略号；状态页签与配置页签曾各写一遍同款逻辑（发现 11：`**` 字面星号上卡面、长摘要拉爆列表）——本件是唯一正本 |
| [method-of-question](../../packages/deep-research-pack/src/lib/method-of-question.ts) | question.md 文本 ＋ bundle 在场性 → 「本次研究」区五态 | 无 run／文件缺／未记录／无法判定／已记录；**判不了就说判不了**——绝不回落成默认打法名（旧 run 未记录 = 合法形态，不回填）；读方法节须显式足额 limit（模板第 32–40 行卡默认 40 行，BUG-026 同族） |
| [receipt-fold](../../packages/deep-research-pack/src/lib/receipt-fold.ts) | 发送结果 ＋ 回话信号 ＋ 库前后快照 → 回执三态与 diff | 已发送（prompt ok）／Lead 已回话（发送**之后**的 assistant 事件）／已落盘（回读对账出 diff：`把「找来源」从 A 改成 B`）；对账读不出变化就退到已回话，不冒充落地（发现 4） |

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
- **会话绑定**：渐进面只显示**本会话自己的** run bundle（不显示别家数据）；位置=状态
  两个位置都认（工作区根 = 在飞、`archive/` = 已交付）；未绑定如实提示；写强读弱 +
  挂起期抑制仅读绑定的渐进面（预检读取不算"本会话的 run"）。

## 5. 验证面与改动路由

| 面 | 命令 | 断言什么 |
|---|---|---|
| keyless 真浏览器 | `client-load-smoke` | 插件零失败 + 页签渲染 + 渐进面与**磁盘真值对账**（证据计数 / 交付态〔= `present` 见证〕/ 问题行）+ 锚点轨道与诚实线对账（盘侧独立重算）+ 未绑定负样本 + 终稿页签端到端（⑤ 交付门 → 正文与盘侧首标题对账） |
| 真模型档 | `client-hitl-smoke` | 活标题翻转 + 横幅 + 挂起迁移 → 右栏自动展开（端到端） |
| keyless 单测 | `pnpm test` | 折算谓词纯函数（§2 所列折算各有测试文件） |

改动路由（怎么改、按什么次序）= [guides/60 §2 任务型路由表](../guides/60-dev-loop.md)
「改驾驶舱」行：`src/client/` + tsconfig include + `dsh.client.inject` + keyed 字面量进
`keys.ts` → `pnpm build` → `client-load-smoke`（改挂起显性化再跑 `client-hitl-smoke`）。

## 6. 已知边界

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
  实测即撞上 `drt_anthropic-claude-release-line-timeline` 已归档）；
- 自动打开只在**现场**交付事件上触发（回放不触发），keyless 冒烟无真模型交付：该路径的接线
  只有 `shouldOpenFinal` 的 keyless 证据，端到端观察留待下一场真实 run；
- 从未开过页签的会话无 dock 观察者——挂起信号由 vendor 侧栏 Answer 徽标兜底；
- 版本兼容面窄：只声明 `dsh-v0.2.1-rc.2`。

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
