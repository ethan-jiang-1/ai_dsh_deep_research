# UI 观察面（调试可视化）研究——右栏状态页签与相关手段的琢磨稿

> 状态：**已完成（琢磨稿）** · 2026-09-24 · 观察面材料；落点 = D18 观察面 client 面（RFC = [observability-gui](../implemented/2026-09-24-observability-gui.md)）。

> 性质：**研究/琢磨稿**（2026-09-24，起因 = 用户指令：多 agent 跑起来后"调试的时候让我知道
> 底下在干什么"，要 right side pane / tasks 类的直观界面；提早准备；内容先落 notes/research
> 推敲，不当场实施）。来源三方：① 本仓 agent 亲读 company 仓 client 面（index.ts / tabs /
> TasksPanel / use-company-data / tsdown.config / package.json）；② 委派子代理两份考古报告
> （company client-face 全量 11 文件 + vendor client 扩展面——正文档 docs/subsystems/
> slots.md · web-client.md · client-modules.md）；③ 本 session 的 run 实况。子代理报告的
> 承重结论经父代理抽查核实（tsdown 契约、注册形状）。吸收落点：本 note → 用户推敲 →
> 队列条目（草案见文末，未入 roadmap）。

## 0. 需求与术语对齐（你说的东西叫什么）

| 你的话 | 官方名词 | 出处 |
|---|---|---|
| "side view in right side" | **右栏平台页签**：`sidebar.right.pane.tab`（keyed slot）+ `sidebarRightTabs`（tab 类型注册表）；页签可 `float(tabId)` 拖出成浮窗（可移动/缩放/置顶） | vendor `docs/subsystems/slots.md`；company `src/client/company-tabs.tsx` |
| "tasks 类似的更符合我们项目的" | company 的「任务板」页签（TasksTab：成员行 + 任务表）+「在场」页签（成员忙闲 + 协作动态流）——照此做一个「研究 run 状态」页签 | company `TasksPanel.tsx` / `company-tabs.tsx` |
| "加个 tasks"（GUI 里已有什么） | 官方 `client-ui-agent-team` 是**会话头按钮面板**（不是右栏 tab）：roster + 任务板，数据走 `remote.agentTeams.view`。我们 research profile 已带此行（D16 保留 ui-agent-team 观察行）——它显示的是**团队机制状态**（谁/什么任务），不是**研究语义状态**（topics×evidence、gap、A–D 分布） | vendor `packages/experimental/client-ui-agent-team/src/client/mount.ts` |

**鲜活痛点实证（2026-09-24 当天）**：用户的 ad-hoc 队在 `dev/harness-home/runs/` 已写 14 条
evidence，而 HTML 仪表盘显示 `.gitkeep`——它只盯 `research-workspace/runs/`。观察面缺口
不是假设：团队机制面板（官方）不显示研究进度，研究投影（我们的仪表盘）不在 GUI 里、
且只认正规 run 场。

**第二个痛点（用户同日补充，同样当天实证）——HITL 等待不可见**：正规 run 的 HITL1 挂了
一个多小时，用户不知道"它在等我"，也不知道"现在该不该跟它说话"（两点纪律靠对话语境
传达，无界面信号）。用户点名的两个形态：① 醒目位置（如 sidebar）提示"在等你，必须
回答"；② 流程步步推进的状态图/状态 list（HITL1 → 组队 → 侦察 → 挖掘 → 综合 → critic →
HITL2 → final，当前步高亮）。**可行性依据**：等待态可从会话事件推导——open 的
`ask_user_question` tool/call 而无 tool/result 即"等你"（本 session 日志实证：正规 lead 会话
seq 40 的 call 挂起无 result，grep 可判）；右栏 tab 官方有**活标题键**
`sidebar.right.pane.tab.title`（keyed，vendor slots 清单 §B）——"研究状态 · ⏳ 等你拍板"
这种动态标题是官方支持的形态。

## 1. 机制全景（怎么做一个右栏状态页签）

### 1.1 契约三层（vendor 正文档）

1. **package.json**：`dsh: { client: { platform: "web", inject: [<依赖包名>…] } }` +
   `exports["./client"]` 指向浏览器产物。`inject` 边 = 依赖声明（informational only，不排序
   不 gate 加载——company 曾据此误诊而重复挂 remote 砖全 UI，postmortem 0003）。
2. **bundle 导出**：`export const inject = ['slots', …]`（**Cordis 服务名**，非包名）+
   `export async function apply(ctx)`。官方最小样例：vendor `packages/client/ui-jobs/src/client/index.ts`。
3. **运行时**：`ctx.inject(['sessions','remote.agentTeams','slots','sidebarRightTabs'], cb)`——
   服务齐活才跑 cb，缺席时贡献 PENDING（不崩、不出现）。

### 1.2 加一个右栏 tab 的三步（官方路径，`ui-sidebar-right/README.md` §Extension seats）

1. `ctx.sidebarRightTabs.register({ id, kind, priority: 'extension', title, guide: [{order, title, description, icon}] })`
   —— id = 实现身份（包名是自然值），kind = 页类型；`priority: 'extension'` 让第三方
   outrank 一切 shipped viewer；
2. `ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({ name, key: <同一 id>, inject: () => ({数据面}) }, Body))`
   —— Body 拿槽标准 props（`sessionId` / `useProjection` / `useTabInfo`）+ 注入面；
3. 可选：同 key 注册 `sidebar.right.pane.tab.title`（活标题）、`sidebar.right.tab.menu.item`。

官方活证明（仓外包走公共路径）：`ui-sidebar-files`（结构范本）、`ui-sidebar-documentpreview`。
company 的五个页签（看板/依赖图/在场/用量/任务板）是第三方完整实例。

### 1.3 数据通道（全官方，零自建协议）

| 通道 | API | 适合喂什么 |
|---|---|---|
| 团队态拉式轮询 | `remote.agentTeams.view(leadSessionId)`（5s；TeamView = roster + tasks） | 任务表、成员忙闲、阻塞 |
| 会话事件流 | `remote.session.follow({address}, signal)`（WebSocket；`snapshot` 帧给历史 + `event` 帧实时；AbortController） | journal 流、协作动态（打开即见全程） |
| 标准投影 | `useProjection('tokenUsage' / 'sessionStats')` | 用量、turn/step 统计 |
| 文件系统 | `remote.workspaceFiles`（+ `useResource` / `dsh-resource://`） | **读 `runs/<slug>/` 文件投影** |
| host 自暴露读模型 | host 插件 `@Remote('<name>')`，浏览器端纯声明式拉取 | 我们可在 host 半暴露 run 解析读模型（company 文档明示此路径） |

注意事项：普通转发事件不回放（`API_REMOTE_FORWARDED_EVENTS` 允许清单），团队态无现成
推送流——**轮询 5s 是平台通行节奏**（company 全部面板同款，与我们 HTML 仪表盘的 meta
refresh 5s 一致）。

### 1.4 构建契约（本仓第一段构建代码的形状）

- 双半 tsdown：host 半（esm/node）+ client 半（**cjs/browser，必须包
  `window.__ModuleLoader__.load({id, factory})` 外壳**，否则浏览器加载不了）；
- 外置规则：`react`、`react/jsx-runtime`、`/^@deepseek-ai\/dsh-client-/`、`/^@deepseek-ai\/dsh-api-/`
  留 require（浏览器模块表回答）；**其余依赖必须内联**（留 require 会在浏览器抛错）；
- 三件套对齐：`exports["./client"]` ↔ `dsh.client` ↔ cordis.patch.yml insert 行（行 name = 包名）；
- 范本：company `tsdown.config.ts`（47 行，本仓 agent 亲核）——它自己也是照抄 vendor
  `packages/client/tsdown.client.ts` 的产物契约（vendor 助手按 monorepo 布局找包，仓外包用不了）。

### 1.5 开发体验与稳定性

- **HMR**：跑 `pnpm run dev:web`（watch 写 `lib/client.js`）后 `dsh-client-hmr` 逐插件热换，
  不重启 web 不刷新页（React state 丢、连接/会话保留）——vendor `packages/client/hmr/README.md`；
- **稳定性分层**：client 插件机制（slots/client-modules/hmr/remotes）= **产品正机制**（正文档
  + 全部 shipped UI 在用）；agent-team 全家 = **experimental**（contracts can change）——我们
  的兼容矩阵钉 tag + 升 pin 重校环已覆盖这个风险面。

## 2. company 十二坑精选（与我们直接相关的）

1. keyed slot 的 key 拼错**不报错、永不渲染**（"a typo simply never renders"）→ key 集中常量 +
   keyless 测试钉死（company `tests/client-face.spec.ts` 先例）；
2. 同一 remote 描述符挂第二次 = "already mounted" = **整个 Web UI 砖在 BootPage**（复用官方
   Team Remote 要走服务 inject 等它，别自己 `$mount`）；
3. `ctx.inject` 回调必须**返回 disposer 数组**（返回 void 是 tsc 红 + 注册无效）；
4. slot priority（升序小者渲染）与 tab band（extension > builtin > fallback）是两个概念，别混；
5. 样式只用平台令牌 `--dsw-*`（feature 包禁写字面颜色）；注入式 `<style>`（幂等 id）；
6. `openTab` 落位对 `active()` 可见性有延迟 → 宏任务重试（50ms×10）+ kind 守卫；
7. 写 UI 前对槽位目录：运行中 `cordis_inspect what:"client"`，源码侧 `gen-client-catalog`。

## 3. 我们的选项（推敲面）

| 选项 | 内容 | 成本 | 收益 | 风险 |
|---|---|---|---|---|
| **A 现成面组合**（现状） | 官方团队面板（header 按钮）+ 各会话实时流 + deliverables 面 + HTML 仪表盘（已落地） | 0 | 分散在四处；仪表盘不在 GUI 内；只认 research-workspace | 用户已实证"不够看" |
| **B 右栏「研究状态」页签** | `sidebar.right.pane.tab` 新 tab：topic×evidence 矩阵 / gap 四态 / A–D 分布 / journal 流 / review readiness——数据 = `remote.workspaceFiles` 读 run 文件（或 host 半 `@Remote` 暴露 `run-dashboard.mjs` 纯解析函数的读模型）+ `remote.agentTeams.view` 任务板 + `follow` 动态 | **破 D7**：首段构建代码（tsdown 双半 + ModuleLoader 外壳）+ React 组件 | GUI 内一屏看全研究语义状态；调试反馈闭环（用户原话的目的） | keyed key 静默失效；experimental API 漂移；构建链引入 |
| **C 工具卡定制**（可与 B 组合） | `tool.call.toolview` 给 spawn_teammate / team_task_* / web_search / present 等渲染研究语义卡片（company TeamToolCard 同款；纯函数展示模型 + 薄渲染，keyless 可测） | 同破 D7，但组件面小 | "底下在干什么"的**最细粒度**：每个工具调用一张直观卡 | key 与 wire 工具名逐字一致（拼错静默） |
| **D 仪表盘增强**（零 client 代码） | HTML 仪表盘加：多 run 场扫描（含 dev/harness-home/runs——今天痛点的直接解药）、团队任务板数据、会话 deep-link | 小（纯 node，现有架构内） | 不破 D7；今天就能用 | 仍在 GUI 外（浏览器另开一页） |

**渐进路径（company 同款生长序，可拆成多条目）**：
`D（立即可做，不破教义）→ B-min（一个 journal 流页签验通构建链）→ B-full（矩阵/页签全量）→ C（工具卡）`。
company 自己就是"第 0 天零 UI → 品牌一槽 → 工具卡 → 驾驶舱 → 五平台页签"长出来的。

### 3.1 新增需求落点：流程状态图 + HITL 等待醒目化（用户 2026-09-24 点名）

两个需求在各选项里的落点：

| 需求 | D 仪表盘增强（零 client 代码） | B 右栏页签（client 面） |
|---|---|---|
| 流程状态 list | 步骤条从 **run 文件推导**（question→topics→leads→evidence 计数→findings→review→final 的在场性/计数——`buildModel` 已有全部素材），当前步高亮 | 同一折算渲染进页签顶部（数据层共用 lib） |
| "在等你"醒目化 | 顶部横幅"⏳ 等你拍板（HITL1/HITL2）"+ HTML `<title>` 变化（浏览器标签页可见）——检测 = 读 lead 会话日志找 open 的 `ask_user_question`（call 无 result） | ① 活标题键 `sidebar.right.pane.tab.title`："研究状态 · ⏳ 等你拍板"；② 会话头按钮 badge；③ 检测 = `session.follow` 事件流（快照+实时，company 在场页签同款） |
| "该不该说话"的焦虑 | 横幅写明："现在轮到你 / 团队静默自主中（勿打扰，看进度即可）" | 同文案进页签 |

实现注记（D 路）：读会话日志需解压——候选 `node:zlib` 的 zstd（Node v22.15+ 实验性，本仓
node v22.23.1 在位）保持纯 fs 无子进程；不通则降级 = 只靠文件步骤条（HITL 等待态不显示）。
实施时定，不阻塞琢磨。

## 4. 与现有教义的张力（如实摆出，用户拍板）

1. **D7**（"首版 = 纯配置包：零自写 JS、零构建、无 client 面"）：B/C 需要**修订 D7**（登记
   D 号 + 证据：用户明确需求 + 本考古的机制完备性 + company 同款生长序先例）。这不是违反，
   是教义随阶段演进——company 也从零 UI 起步。
2. **搁置池「UI 皮肤」条目**（复活条件 = run 通过 + demo 需求）：那条是**品牌皮肤**（表现层）；
   本 note 说的是**观察/调试面**（开发工具层）——目的不同、复活条件不同。若采纳 B/C，
   建议新开独立队列条目（debug-observability-ui），皮肤条目留在池里不动。
3. **时机张力**：教义精神是"核心流未稳别做表现层"；但用户判断"提早准备对下面要做的事有
   好处"（看到界面才能给好反馈、早发现问题）——且这是 debug 面不是皮肤。两个时机选项：
   **now**（正规 run 开跑前落地 B-min，run 期间就能用）vs **after-run**（先跑完 M2，观察面
   需求由 run 实测确认后再做——与皮肤复活条件同节奏）。用户定。

## 5. 数据层复用（我们已有的资产）

- `scripts/run-dashboard.mjs` 的纯解析函数（parseTopics/parseEvidenceDir/parseFindings/
  parseReview/topicEvidenceMatrix/gapStats——fail-soft 永不 throw）**就是页签的数据层**：
  client 侧经 `remote.workspaceFiles` 读文件后喂同一套折算（需抽到共享 lib），或 host 半
  `@Remote` 暴露折算结果（浏览器零轮询逻辑）；
- 展示/数据分层纪律（company 同款）：折算进 `src/lib/` 纯函数 → keyless 单测进 `pnpm test`；
  组件薄渲染 → 真浏览器 `client-load-smoke` 当完成定义（apply 抛错 = 砖全 app，必须真检）。

## 6. 开放问题（请用户推敲）

1. 时机：B-min 现在（run 前）还是 run 后？（建议：**D 现在做**——今天痛点直接解；B/C 的
   时机看你对 run 观察的急迫度）；
2. 范围：第一笔只做「journal 流 + run 头部」小页签验通构建链，还是直接上矩阵全量？
   （建议：小笔验链，company 生长序）；
3. 数据面走 `remote.workspaceFiles`（浏览器直读文件 + 复用解析函数）还是 host `@Remote`
   读模型？（建议：前者起步——零 host 面改动；折算逻辑抽 lib 共享）；
4. D7 修订的形状：整体放开 client 面，还是限定"观察面用途 + 构建产物只此一件"？
   （建议：限定用途修订，教义演进留痕）。

## 7. 队列条目（2026-09-24 用户拍板：D 入队不做（run 收口后实施，roadmap 条目 3）；B+C 押后 run 后立项（roadmap 条目 4））

- **debug-dashboard-plus**（卫生/小 feature，零 client 代码，**今天痛点的直接解药**）：
  ① 多 run 场扫描（research-workspace/runs + dev/harness-home/runs——ad-hoc 场不再裸奔）；
  ② **流程步骤条**（文件推导 + 当前步高亮）；③ **HITL 等待横幅**（读 lead 会话日志检测
  open ask_user_question：顶部"⏳ 等你拍板——现在轮到你"+ 静默期反向提示"团队自主中，
  看进度即可"）+ 浏览器标签 `<title>` 联动；④ 会话 deep-link；
- **client-face-bootstrapping**（feature）：D7 修订（限定观察面用途）+ 双半构建链落地
  （tsdown 契约照抄 company）+ `sidebar.brand.name` 验通 + client-load-smoke 完成定义 +
  keyless key 守卫——B/C 的地基；
- **run-status-tab**（feature）：右栏「研究状态」页签——顶部流程步骤条 + 活标题"等你拍板"
  （HITL 挂起时）+ journal 流 → 矩阵 → review 渐进 + 可选工具卡（C）。

## 8. 收拢结论（2026-09-24 用户拍板定案）

1. **D（debug-dashboard-plus）入队不做**——run 收口后实施（roadmap 条目 3）。run 期间的
   过渡解：观察靠会话流/任务板 + HTML 仪表盘现状，HITL 等待由驱动侧（我）在对话里主动
   报告——UX 短板记在案，横幅落地后销；
2. **B+C 观察面 GUI 化押后 run 后**（roadmap 条目 4）——D 接住 run 期间观察需求，构建链
   成本让 run 实测说话；C（工具卡）随 B 一起议，不单独排队；
3. **D7 修订只在 B 立项时发生**（限定"观察面用途 + 构建产物只此一件"），现在不动教义；
4. 搁置池「UI 皮肤」条目不动（品牌皮肤 ≠ 观察面，边界已辨析）；
5. 本 note 的两个当天实证痛点（ad-hoc 裸奔 / HITL 等待不可见）即条目 3 的验收场景。
