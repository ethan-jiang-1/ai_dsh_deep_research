# 40 · 研究驾驶舱（Research Cockpit）：观察面 client 套件的构成

> 层：设计（现在怎么组成）。本页 = 驾驶舱**当前事实的单一正本**：一页答全"是什么 /
> 构成哪些件 / 数据通道 / 怎么改 / 跑什么验证 / 已知边界"六问；"为什么当初这么选、
> 输掉了什么"的演进史住 notes 树（§7 指针）。套件名 = 研究驾驶舱（Research Cockpit，
> 2026-09-28 用户拍板），命名分层表正本 = 本页 §1；命名决定的历史与输掉的备选 =
> [cockpit-naming 快照](../../notes/archived/2026-09-28-cockpit-naming.md)。

## 1. 定位与命名分层

**一句话**：DSH Web GUI 右栏的观察面 client 套件——多 agent 研究运行期间，人在这里
"看仪表、关键时刻接手"（cockpit 隐喻 = 静默自主期看仪表 + HITL 挂起时接手）。存在理由
（用户点名）：run 期观察分散四处、HITL 等待不可见——"调试的时候让我知道底下在干什么、
它在等我"。它是 [D7](../00-index.md) 纯配置包教义的**单点例外**（[D18](../00-index.md)）。

| 层 | 名 | 指什么 | 改动频率 |
|---|---|---|---|
| 伞 | 观察面 | 驾驶舱 + 仪表盘投影（D18 原语义） | — |
| **套件** | **研究驾驶舱（Research Cockpit）** | `src/client/` 的 React 件全体 | **最频** |
| 共用层 | 折算层（folds） | `src/lib/` 纯函数谓词（keyless 单测；驾驶舱与仪表盘共用） | 少 |
| 投影 | 仪表盘（run-dashboard） | `scripts/run-dashboard.mjs` 只读 HTML 投影（抛弃型、永不入库） | 少 |

件名保留：「研究状态」页签是驾驶舱**里的一个件**，不与套件名混用；目录名守 DSH 双半
约定 host/client（不叫 `src/cockpit/`），套件名钉 `src/client/index.ts` 入口头注。

## 2. 构成（件 → 文件 → 职责）

| 件 | 文件 | 职责 |
|---|---|---|
| 研究状态页签 | [ResearchStatusTab.tsx](../../packages/deep-research-pack/src/client/ResearchStatusTab.tsx) | 右栏页签，自上而下六区：① HITL 挂起横幅（点名锚点 + 参与指引）② 流程轨道 = ◆立项确认 + 七步（立项→拆解→侦察→取证→综合→审查→交付）+ ◆交付审阅 ③ 研究问题行 ④ 人性化活动流 ⑤ 证据计数 + 交付状态 + rerun 三分静线 ⑥ 决策诚实线（指路 question.md §Decisions） |
| 活标题 | 同上（`ResearchStatusTitle`） | 挂起时页签名变「研究状态 · ⏳ 等你拍板」 |
| 研究语义工具卡 | [ResearchToolCard.tsx](../../packages/deep-research-pack/src/client/ResearchToolCard.tsx) + [tool-card.ts](../../packages/deep-research-pack/src/lib/tool-card.ts) | 对话流卡片：`spawn_teammate` → 组队卡、`web_search` → 检索卡（2 张） |
| 挂起显性化 | [index.ts](../../packages/deep-research-pack/src/client/index.ts)（`revealStatusTab`） | pending false→true 迁移时 `openTab` 右栏自动展开；页签 dock 折叠态保持挂载（观察者常在） |
| keyed 常量 | [keys.ts](../../packages/deep-research-pack/src/client/keys.ts) | 字面量唯一正本（`client-keys` 门禁对账——拼错不报错、永不渲染） |
| host 半 | [src/index.ts](../../packages/deep-research-pack/src/index.ts) | 空壳宿主位（bundle 行 name = 包名；浏览器半经 `exports["./client"]` 装配） |

折算层五件（`src/lib/`，全部纯函数、fail-soft 永不 throw）：

| 折算 | 输入 → 输出 | 要点 |
|---|---|---|
| [hitl-fold](../../packages/deep-research-pack/src/lib/hitl-fold.ts) | journal 事件 → 挂起态 + 流程锚点三态 | 尾扫跳过 `session/*` 元数据，末位回合事件 = 未答的 `ask_user_question` 即挂起；`deriveAnchors` 按 ask 序数定锚（第 1 次=立项确认、第 2 次=交付审阅，超额=中途确认如实显示），已答 = ask 后存在回合事件 |
| [run-fold](../../packages/deep-research-pack/src/lib/run-fold.ts) | bundle 文件在场性 → 步骤条 / 矩阵 | 与 run-dashboard 投影**共用单一正本**（防两处漂移） |
| [activity-fold](../../packages/deep-research-pack/src/lib/activity-fold.ts) | journal 事件 → 活动行 | 🔍 检索 / 👥 派出与队员作业中（wait_agent，连续折叠）/ 💬 成员 / 📦 交付；markdown 源标记与原始事件类型名不出正文（噪音过滤，尾部 30 行） |
| [bundle-bind](../../packages/deep-research-pack/src/lib/bundle-bind.ts) | journal 事件 → 本会话绑定的 run slug + 绑定强度 | 只认 `tool/call` 参数路径里的 `drt_<slug>/`；**写强读弱**——write/edit 命中直接定绑，仅读命中兜底（立项预检读旧 bundle 的错绑防线，2026-09-28 首跑实证） |
| [tool-card](../../packages/deep-research-pack/src/lib/tool-card.ts) | call/result 切片 → 卡片状态 | running / ok / error / stopped |

## 3. 数据通道与接线

- **两条官方通道，零自建协议**：`remote.session.follow`（WebSocket journal 流：snapshot
  帧 = 历史、event 帧 = 实时）喂活动流 / HITL 谓词 / 会话绑定；`remote.workspaceFiles`
  （会话工作区文件）喂 bundle 渐进面（失败降级 null + `console.error` 便于冒烟抓取）；
- **0.1.7 实证坑**：remote 命名空间**两级都要声明**（`remote` + `remote.session`），
  只声明一级必炸；
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
| keyless 真浏览器 | `client-load-smoke` | 插件零失败 + 页签渲染 + 渐进面与**磁盘真值对账**（证据计数/交付态/问题行）+ 锚点轨道与诚实线对账（盘侧独立重算）+ 未绑定负样本 |
| 真模型档 | `client-hitl-smoke` | 活标题翻转 + 横幅 + 挂起迁移 → 右栏自动展开（端到端） |
| keyless 单测 | `pnpm test` | 折算五件纯函数（hitl/run/activity/bundle-bind/tool-card 各有测试文件） |

改动路由（怎么改、按什么次序）= [guides/60 §2 任务型路由表](../guides/60-dev-loop.md)
「改驾驶舱」行：`src/client/` + tsconfig include + `dsh.client.inject` + keyed 字面量进
`keys.ts` → `pnpm build` → `client-load-smoke`（改挂起显性化再跑 `client-hitl-smoke`）。

## 6. 已知边界

- **会话必须建在研究工作区里**才有渐进面（workspaceFiles 读的是会话工作区根）；建在
  别处的会话只显示活动流（详见 [pack README 已知限制](../../packages/deep-research-pack/README.md)）；
- **队员动作不进页签活动流**：活动流只 follow lead 会话（scout/analyst 的检索与取证在各自
  会话）——`wait_agent` 的"队员作业中"行缓解全静；团队任务细节 = `ui-agent-team` 任务板
  （队员流接入需新数据通道，后续候选）；
- **工具卡只 2 张**：`team_task_*` 等协调类工具不进对话渲染流（harness 排除），团队观察
  由 `ui-agent-team` 任务板承担；
- 活标题与页签体各开一条 follow 流共用 WebSocket 数据面（v1 接受，合流是后续优化）；
- 从未开过页签的会话无 dock 观察者——挂起信号由 vendor 侧栏 Answer 徽标兜底；
- 版本兼容面窄：只声明 `dsh-v0.1.7-rc.2`。

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
