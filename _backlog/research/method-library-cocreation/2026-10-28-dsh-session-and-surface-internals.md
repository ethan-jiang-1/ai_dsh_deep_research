---
topic: 方法库页内对话共创的 DSH 会话与嵌入面
intent: 为 2026-10-28-method-library-cocreation 卡提供会话选型、页内嵌入、workspace 归属、preset/skill 与写入回执路径的证据。
---

# 方法库页内对话共创：DSH 会话与嵌入面调研

调研日 2026-10-28。基线 = 本仓 `vendor/dsh`（`dsh-v0.2.1-rc.2`，`687f282e8625c6b8d11ff58211a90524be2e4317`）；
对照 = 本机上游 checkout `deepseek-harness`（`0.2.1-rc.3`，`e3ec3c6`）与其 FAQ 25
（`deepseek-harness/_faq_on_digested/25_workspaces-and-conversations`）。本仓的机制权威仍是 vendor pin；
rc.3 只用来确认「这些缝没有在下一版被堵掉」。

## 0. 结论摘要

| # | 问题 | 结论 | 关键证据 |
|---|---|---|---|
| 1 | 共创对话用哪种 session | **root session，建在同一 workspace**；一个 workspace 一个「方法编辑」会话，懒创建、reuse | §2、§3 |
| 2 | 为什么不用 subagent | 侧栏能藏，但 **live child agent 不能调 `ask_user_question`**——原生选项卡直接没了；而且它不是 Lead 的下属 | §2.3 |
| 3 | 为什么不用当前研究会话 / fork | 当前会话会污染 run 上下文，保存指令变噪音；fork 继承研究历史，且仍可见 | §2.2、§2.4 |
| 4 | 怎么在方法库页里渲染它 | **直接嵌 `conversation.content` 被 vendor 递归门拦死**（spike 实证）；可行解 = 根级 `shell.overlay` + **`createPortal` 把 DOM teleport 进方法库 tab 的右栏**（页内三栏）；固定浮层与右栏 tab 都被 UX 否决 | §4、§14 |
| 5 | 会不会和主会话 composer 打架 | **会**：`conversation.view` 只换正文，不换 composer。spike 实证 chain 的 selector 不随模块级 store 重跑；可行解 = CSS `:has(...):not(:has(> [data-composer-seat] [data-question-key]))` 隐藏外层 composer seat——只对外层 seat **自己的**问卡让位，coach 的问卡在页面里不误触发 | §5、§14 |
| 6 | 方法编辑要不要新 preset | 要。persona 只能由 preset 给；第 5 个 preset 会推翻 D2 的字面，需要新 D 号 | §6、§8 |
| 7 | 谁来写 `method-library.md` | 推荐 **方法编辑写**（闭环在这页）；D25 的「唯一路径 = Lead」需扩成「有库技能的 agent」；面板仍永不直写 | §7 |
| 8 | 加不加 RPC / host 插件 | 不加。全部走现成 `session/create|rename|prompt|follow`、`sessions.retain`、`workspaces.list`、`workspaceFiles.read` | §9 |
| 9 | 版本风险 | rc.2 → rc.3 的 `commands.ts` 零 diff；`tool-ask-user`、`ui-subagent` sidebar chat、`list.ts` 逐字相同；`conversation.content` 契约只有 view 钉选增量 | §1 |
| 10 | spike 实跑 | 直接嵌 **红**；固定浮层机制绿但 **UX 否**；右栏 tab **否**（用户要留在 tab 内）；页内三栏 portal **绿**；CSS 抑制 / coach 问卡 / 外层问卡让位 / 切 tab 重挂 **绿**；chain **红** | §14 |
| 11 | 最终形态 | 方法库 tab 内三栏（库 / 表单 / 方法编辑）；一个可见 composer；主会话不动；用户看不到 portal/session 机制 | §14、[issue](../../issues/2026-10-28-method-library-cocreation.md) |

**一句话**：这不是「在表单旁边放一个聊天框」，而是把**方法库 tab 本身**做成三栏工作台
（我的库 / 表单 / 方法编辑对话）；方法编辑是 workspace 级的独立会话，但用户看到的只是这页右侧的对话面板——
React 树放在根级 `shell.overlay`（外层 `conversation.content` 之外，绕开递归门），`createPortal` 把 DOM
teleport 进页面右栏。直接嵌被递归门拦死、固定浮层被 UX 否决、右栏 tab 被“留在 tab 内”否决（spike 实证）。
再把「对话出稿 → 表单确认 → 方法编辑写库 → 页内回执」闭成一条链。会话必须建在 workspace 里（`workspaceId`），
不是只给 `cwd`——否则会掉进 Ungrouped。

## 1. 版本与基线

| 项 | 值 | 用法 |
|---|---|---|
| vendor pin | `dsh-v0.2.1-rc.2` @ `687f282` | 本仓机制权威；行号按此树 |
| 上游 checkout | `0.2.1-rc.3` @ `e3ec3c6` | 只用于确认缝未被下一版改掉 |
| FAQ 25 | `_faq_on_digested/25_workspaces-and-conversations`（rc.3） | workspace / 会话入组 / Ungrouped 的记录模型 |

已做的版本对照（`diff`）：

- `packages/api/session-controller/src/commands.ts` — **零 diff**（`session.create` / `attachSession` 原样）；
- `packages/interaction/tool-ask-user/README.md` — 逐字相同（含「A live child agent cannot call the tool」）；
- `packages/client/ui-subagent/src/client/sidebar-chat/index.tsx` — 逐字相同（嵌入会话的现成先例）；
- `packages/api/session-controller/src/list.ts` — 逐字相同（无 cwd 冷会话不进列表）；
- `packages/client/ui-conversation/src/client/contract/slots.ts` — 仅新增 View 钉选/More 菜单；`conversation.content`
  的 `variant/phase/hero` 与 `views` 局部槽不变。

结论：本方案按 rc.2 写，rc.3 兼容；本仓 `dshReleases` 已含两版。

## 2. 会话选型：DSH 里到底有哪几种「会话」

### 2.1 会话是唯一的持久实体

DSH 的 `Session` 是 append-only 事件日志；`Conversation` 是打开会话后的装配层，不是第二个实体
（FAQ 25 的「行是 Session；Conversation 是事件装配层」）。所以「独立的对话 session」在实现上就是
**一条独立 Session**，没有「侧对话 / companion / side chat」这种第三态。

Session header 只有这些分类字段：`cwd?`、`origin?: 'subagent'`、`delegationDepth?`、`agentPreset?`
（`vendor/dsh/packages/core/session/src/types.ts` L100-L131）。
没有 `kind: side`、没有 `hidden`、没有 `parent` 之外的旁支类型。

### 2.2 普通 root session（推荐）

- 可见：只要有 `cwd` 且被登记进 workspace 账户，就会出现在左侧；侧栏行就是 Session。
- 能力完整：可以调 `ask_user_question`、可以跑 fs 工具、可以被 `sessions.retain` 后在任何 Slot 里渲染。
- 独立：不依赖研究会话的父链；研究会话归档/结束不影响它。
- 代价：**它会占一行**。root session 没有「隐藏」标志；这是产品事实，不是实现偷懒。

### 2.3 subagent child（排除）

- 侧栏能藏：`tree.ts` 直接 `if (session.origin === 'subagent') return false`
  （`vendor/dsh/packages/client/ui-workspace/src/client/tree.ts` L244），
  只在 header 的 subagent catalog 里出现。
- **但 live child agent 不能调 `ask_user_question`**：`tool-ask-user` README 明写
  「A live child agent cannot call the tool」（`vendor/dsh/packages/interaction/tool-ask-user/README.md` L12）。
  方法共创最值钱的交互恰恰是「点选项」；走 child 就只剩纯文本问句，或者要客户端解析文本自己画选项（脆、且不是原生）。
- 还有父链语义：它会被挂在研究会话的 lineage 里、受归档门影响、计入 subagent 容量；它并不是 Lead 的下属，
  语义也不对。

结论：**不选 child**，除非产品愿意放弃原生选项卡。

### 2.4 fork（排除）

fork 复制父会话的事件前缀，继承 workspace 与上下文
（`vendor/dsh/packages/api/session-controller/src/commands.ts` L227-L300 附近）。
方法编辑不需要研究历史，fork 只会把 run 的上下文带进来；且 fork 仍是可见 root。没有收益。

### 2.5 复用当前研究会话（排除）

用户明确要「独立、不干扰其他」。把方法访谈塞进 Lead 的会话，会让 HITL/run 上下文混入方法讨论，
保存指令也会变成 run 里的噪音；这正是当前页「回执在 Chat」问题的根源（§7.1）。

### 2.6 「隐藏 root」/ 无 cwd（排除）

- `session.create` 总会给 cwd：`workspace?.path ?? request.cwd ?? defaultCwd`
  （`vendor/dsh/packages/api/session-controller/src/commands.ts` L124）；
- 冷会话没有 cwd 时确实不进列表（`vendor/dsh/packages/api/session-controller/src/list.ts` L144-L145），
  但 **live session 仍会进列表**（`if (live !== undefined)` 分支），且没有 cwd 就没有工作区根、
  读不到 `method-library.md` 与 run bundle。不是可用的「隐藏」机制。

### 2.7 空白会话与归档

- 空白会话只在被选中时可见；`session.create` 可用命名 `sessionId` 复用空白
  （`vendor/dsh/packages/api/session-controller/src/commands.ts` L111-L143）；
- 归档会保留账户名额，但归档会话被门禁拦住、不能继续跑
  （`vendor/dsh/packages/api/workspace-controller/src/client/service.ts` L47-L110）。
  所以「用完就归档」不适合活跃草稿；适合交付后的历史。

## 3. 建会话与 workspace 归属（FAQ 25 的关键纠正）

### 3.1 `workspaceId` 是入组门票，`cwd` 不是

FAQ 25 的记录模型：Workspace 是 Host 侧持久记录（uuid + realpath + 标题 + 有序会话账户）；
会话入组只有一个写入口 `attachSession`。`session.create`：

- 带 `workspaceId` → `cwd = workspace.path`，创建后 `attachSession` 前插进账户
  （`vendor/dsh/packages/api/session-controller/src/commands.ts` L111-L143）；
- 只带 `cwd` → 不 attach；会话仍在列表里，但落在 **Ungrouped**（客户端减法桶）；
- attach 失败（目录 realpath 不匹配、目录不在）→ 会话已建好但不进账户，报
  `session/workspace-attach-failed`，随后出现在 Ungrouped。`attachSession` 的五步校验见
  `vendor/dsh/packages/workspace/workspace/src/entity.ts` L110。

**所以**：方法编辑会话必须尽量用当前会话的 `workspaceId` 创建；只有当前会话本身就在 Ungrouped 时，
才退回 `cwd`（这时两者都不在组里，视觉一致）。

### 3.2 客户端怎么找当前会话的 workspace

`workspaces` 客户端服务暴露 `list` 快照，item 带 `sessionIds`
（`vendor/dsh/packages/api/workspace-controller/src/client/service.ts` L47-L110）。
页面用当前 `sessionId` 反查 `workspaceId`/`title`/`path`；查不到再用 `sessions.list` 摘要里的 `cwd`
（`vendor/dsh/packages/api/session-controller/src/types.ts` L178-L192）。

### 3.3 标题与复用

- 会话标题：`session.rename`（remote `session/rename`）**钉住标题**；自动标题只在「无 title」时调度，
  用户 rename 后自动生成被 supersede
  （`vendor/dsh/packages/session/session-title/src/index.ts` L401-L425、L509）。
  所以「建会话 → 立刻 rename 成『方法编辑』→ 再发第一条」能稳定拿到可辨识侧栏行，也省一次自动标题模型调用。
- 复用：**确定性 session id**（`method-coach-<workspaceKey hash>`）做锚——FAQ 26 的零浏览器持久化约束下，
  pack 不写 localStorage；页面先 `sessions.retain(id)`，失败（删除/不可达）再 `session.create({ sessionId, workspaceId, agentPreset })`。
  当前会话本身就是 coach 时直接复用当前 id，不另建（见 §4.6）。
- 一 workspace 一个会话，避免「每新建一次方法就多一行」；草稿是客户端状态，不是会话。若实测发现
  多草稿混在一个 transcript 里难读，再退到「一草稿一会话」（§10 的待拍板项）。

### 3.4 会话行会出现在侧栏

root session 没有 hidden 标志；coach 第一次被发消息后就会在 workspace 下出现一行「方法编辑」。
这是有意的：它是真实会话，可以点开回看；用户也可以归档/删除它（页面下次会重建）。
如果产品不能接受这一行，唯一不丢原生选项卡的替代是「右栏 chat tab」，不是「隐藏 root」。

## 4. 页内嵌入：`conversation.view` + 私有 session 子槽 + `conversation.content`

### 4.1 现成先例：ui-subagent 的右栏 chat

`SidebarChatTab` 做三件事：

1. 用 `useResource` 拿一个 `SessionReference`；
2. `<SessionProvider session={reference}>{renderSlot('sidebar.chat.conversation', {})}</SessionProvider>`；
3. 子槽组件 `ConversationSlotPanel` 调 `renderFactorySlot('conversation.content', { variant: 'embedded', phase, hero }, { slots: { views: FixedChatConversationView } })`。

代码：`vendor/dsh/packages/client/ui-subagent/src/client/sidebar-chat/index.tsx` L126-L165、L197-L201。
测试直接断言了 `renderFactorySlot('conversation.content', { variant: 'embedded', ... })` 与 `SessionProvider` 的绑定
（`vendor/dsh/packages/client/ui-subagent/tests/sidebar-chat.client.spec.tsx` L207-L219）。

### 4.2 私有 session 子槽是拿到 `SessionProvider` 的正规方式

> **⚠ spike 实证（2026-10-28）**：私有子槽 + `SessionProvider` + `conversation.content` 的组合本身成立，
> 但**座位不能在方法库 view 里**——view 本身就在外层 `conversation.content` 的 factory 树内，再渲染同一个
> factory 会触发 `recursive render of factory 'conversation.content'`，子槽挂 `data-slot-error`。
> 座位必须移到 factory 树外（根级 `shell.overlay`）；第三版再用 `createPortal` 把根级树 teleport 进
> 方法库页面的右栏——**React 树在 factory 外、DOM 在页面内**（spike 绿）。详见 §14。

`SessionProvider` 只在「entry 声明了非 root 作用域的子槽」时注入：

```ts
if (Object.values(entry.children).some(spec => spec.scope !== 'root')) {
  kit['SessionProvider'] = scopeAreaProvider(adapter)
}
```

`vendor/dsh/packages/client/ui-renderer/src/client/scoped-slots.tsx` L586-L591。
同时 `renderFactorySlot` 是每个注册组件都有的 framework share
（`vendor/dsh/packages/client/ui-slots/src/index.ts` L498-L499）。

所以方法库 view 可以声明一个自己的 `method.coach.chat`（`{ kind: 'single', scope: 'session' }`），
渲染时 `<SessionProvider session={coachRef}>{renderSlot('method.coach.chat', {})}</SessionProvider>`；
该子槽的组件再渲染 `conversation.content`。这不需要新 RPC，也不需要 host 插件。

### 4.3 `conversation.content` 的输入契约

`variant: 'main' | 'embedded'`、`phase: 'settling' | 'hero' | 'active'`、`hero: boolean`
（`vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` L535-L540）。
`active` 时正文 + composer 都在；`embedded` 用专门的 body 宽度/滚动规则
（`vendor/dsh/packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css` L393-L399）。
`views` 局部槽固定为 Chat（`renderSlot('conversation.session', { view: 'chat' })`）。

### 4.4 方法页面里怎么摆

- view 自己的布局：左侧库列表 + 右侧「表单（可滚） + 底部 chat（固定高、可拖/可收）」；
- chat 子槽的容器给 `display:flex; height:100%; min-height:0`；`conversation.content` 自己会撑满；
- 聊天标题/空态/起始 chips 由方法库页画，不去改 conversation 的 header；
- 空白会话的 `phase:'hero'` 不要：直接传 `phase:'active', hero:false`，避免在页里再出现一个 New Session hero。

### 4.5 问卡为什么能工作

`ui-user-questions` 把问题卡注册进 `conversation.composer` chain
（`vendor/dsh/packages/client/ui-user-questions/src/client/index.ts` L382-L390），
chain 的 owner 带 `{ sessionId, session, pendingInteraction }`
（`vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` L511-L520）。
嵌入 occurrence 的 composer 是同一个 chain，`SessionProvider` 把 session 绑到 coach，问卡自然会落在 coach 的 composer 位。
这是 subagent 方案拿不到的能力。

### 4.6 当前会话就是 coach 时

页面可以比较 `currentSessionId === coachSessionId`：是则直接 `sessions.retain(currentSessionId)`，不再建第二个。
外层 view 是方法库、内层 chat 是同一个会话——不是递归渲染（内层 occurrence 不渲染 view tabs），只是同一会话的另一个视图；
可以作为允许态，不必特判报错。

## 5. 双 composer：一个从截图里看不出来的坑

`conversation.view` 只替换正文；`conversation.content` 的 composer 仍在 `scrollBody` 里、位于 view 之后
（`vendor/dsh/packages/client/ui-conversation/src/client/skeleton/ConversationContent.tsx` L138-L215）。
截图里方法库页底部没有 composer，不是因为它不存在，而是它在折下/被页面高度挤到视口外。

于是「页内再加一个 chat」会出现两个 composer：主会话的（研究 Lead）+ 页内 coach 的。必须显式处理：

> **⚠ spike 实证（2026-10-28）**：chain 的 `select` 是 owner props 的纯函数，模块级激活标记变化不会让外层
> composer 重跑；且 `overlay:true` 的 fallback 始终在 DOM（elected 时 `display:none`），DOM 里仍有 input。
> 可行解 = CSS `:has` 规则，且只对外层 seat **自己的**问卡让位（coach 的问卡在页面里，不误触发）；
> spike 绿。详见 §14。

- **第一版尝试（spike 推翻）：`conversation.composer` chain 抑制**。注册一个 chain entry，selector 读一个由方法库 view 维护的
  「当前 view 是方法库」标记（按 sessionId 记），条件 = 标记命中 **且** `owner.pendingInteraction === undefined`；
  命中时组件返回 `null`。chain 语义是「首个非 null match 渲染、全 null 走 fallback」——但 selector 不随模块级 store 重跑，
  激活后外层 composer 不会重新选一次；且 `overlay:true` 的 fallback 仍以 `display:none` 留在 DOM。
- **spike 可行解（推荐）**：CSS 结构规则
  `[data-conversation-scroll]:has([data-spike-root]):not(:has([data-question-key])) > [data-composer-seat]{display:none}`——
  方法库 view 在场且无外层问卡时隐藏；外层问卡出现时 `:not(:has(...))` 自动让位；`shell.overlay` 里的 coach composer 不受影响。
- **pending 例外**：研究会话有待答问题时 CSS 规则自然不命中，`ui-user-questions` 的问卡照常出现
  （不能为了页面好看把 Lead 的 HITL 藏掉）。
- 备选：右栏 chat tab；没有双 composer，但不在「底下」，是 fallback（§4.1 的同款机制）。

这个点必须先 spike，不能等页面写完才发现两个输入框。

## 6. 方法编辑 preset：为什么是第 5 个

### 6.1 persona 只能由 preset 给

`session.create` 只接受 `agentPreset`，没有 per-session system prompt。要让模型「只做方法访谈、不做研究」，
只有两条路：新 preset，或复用 Lead 的 persona + 首条消息里强行改角色。后者会被 Lead 的
「任何研究请求先发 HITL1 三问 / 不代跑搜索 / 组队」等硬规则拉扯，且工具面太重（web/team/subagent 全在）。
新 preset 是干净解。

### 6.2 新增 preset 的治理面（会推翻 D2 的字面）

D2 = 「角色 = 4 个」+「增删角色 = 推翻本条，先登记新 D 号」
（[decisions.md L15](../../../docs/decisions.md)）。方法编辑不是研究角色，但它仍是 `presets/*.patch.yml`
的一员，这些机械面会一起动：

| 面 | 现状 | 新增后 |
|---|---|---|
| 数量哨兵 | `assert.equal(ROLES.length, 4)`（[presets.test.mjs L26-L33](../../../tests/pack/presets.test.mjs)） | 改为 5（或研究角色 4 + 工具 preset 1 的表述） |
| `preset-structure` 时钟行 | 每个 preset 恰一条 `time-context`（[b-pack.mjs L33-L38](../../../scripts/verify/gates/b-pack.mjs)） | 新 preset 必须挂 `@deepseek-ai/dsh-time-context` |
| `bundle.patch` | 盘上每个 patch 必须登记（`pack-bundle-compat`） | 加 `./presets/method-editor.patch.yml` |
| `role-list-sync` | 盘上 preset 名都算「角色」 | 新名字会被纳入检测；文档 roster 同步 |
| `l4-lite` | 盘上每个角色必须有 `PROMPTS`（[l4-lite-smoke.mjs L108-L125](../../../scripts/smoke/l4-lite-smoke.mjs)） | 加 `method-editor` 标记 prompt |
| snapshot replay | 每个角色的 request 组装有 fixture | 新 preset 需录 fixture / 更新 expected |
| 文档 | pack README 写「4 research roles」；`docs/design/20-roles.md` | 改成「4 研究角色 + 1 方法编辑（非研究）」 |

推荐：**接受第 5 个 preset，登记 D37（或下一个空号）**，把 D2 扩成「研究角色 4 个；另有非研究 preset」。
若 D2 必须保持字面 4，唯一不动的办法是把方法编辑拆成第二个包/第二个 bundle——部署面更大，不推荐。

### 6.3 persona 与工具行（建议）

- `persona`：方法库编辑；只做「把用户的做法问清楚、写成库条目」；不做研究、不检索、不组队；
  一次一问；能给选项就给；改稿保留用户原话；只在明确保存指令或用户明确说「存」时写库。
- `skill-filesystem`（`customSkillDirs: presets/method-editor/skills`，`includeDefaultRoots: false`）。
- `tool-skill`、`tool-ask-user`（blocking；不挂 timed）、`tool-fs`（read/write/edit）、`tool-fs-search`（glob/grep）、
  `time-context`（provenance 日期，同时满足 `preset-structure` 的时钟行）。
- **不挂** `tool-web`、`tool-subagent`、`tool-goal`、`tool-present`、`tool-session-query`、`agent-instructions`
  （研究手册不该进方法编辑会话；它会让模型以为自己在跑 run）。

### 6.4 skill 契约

核心 `method-interview`：

1. 四字段的「够用」判据（不是词义解释）：找来源要能回答「冲突时信谁」；怎么核实要有一条能失败的检查；
   报告要能说出第一屏答案与结构；不承诺至少一条真不做的事。
2. 每字段的 `ask_user_question` 选项集（官方域优先 / 官方+一手 / 学术一手 / 全网红黑榜；两条独立来源 /
   数字回原表复算 / 只做逻辑一致性……）。
3. 转换模式：模糊→具体、习惯→规则、抱怨→不承诺、上次的坑→核实动作。
4. 输出契约：变了才发，发就发**完整**库条目（`## 名称（来源）` + 四行）；客户端用 `foldLibrary` 折回；
   保留用户原话；结尾提议名字。
5. 库意识：先读 `method-library.md`；撞名/相似先问「新建还是改旧」；拿已有条目当风格样例
   （截图里的「格局调研」就是最好的 few-shot）。
6. 写入规则：读后再写；保留其他条目与文件头/变更记录；一个库至多一条〔默认偏好〕；旧格式不擅自动。
7. 反模式：一次问两问、四格一次填满、写「要严谨」这种空话、编造用户偏好、没让保存就写文件。
8. 停手条件与保存交接。

按需 `method-from-run`：读 `question.md` 的方法/Decisions、`final.md` 的结构、`evidence/` 的来源分布，
推四字段并标「观察到的 / 推断的」；文件缺失如实说。

skill 的模型可见文本会进 snapshot；新增 preset 的 fixture 要录。keyless 侧建议加一条
「skill 四标签 == `library-fold.ts` 的 `SECTION_LABELS`」的对钉，和现有显示名一致性测试同款。

### 6.5 对话如何携带草稿

- 线程开始（新建/编辑）：首条 user 消息带一个紧凑的「当前草稿」块（库条目格式）；空草稿就明说空。
- 用户手改后：下一条 user 消息前附一行「我手改了 X：…；其余不变」；没改就不附，保持聊天干净。
- 保存：发一个**完整条目**的保存封套（新建/更新 + 名称 + 四行 + provenance），不是旧版
  `saveInstruction` 的短句——方法编辑可以逐字写库，不靠猜。
- 客户端只解析最终 assistant 消息里的 `method-draft` 围栏；解析失败保留原表、不覆盖；不解析流式半截。

## 7. 写入与回执

### 7.1 现状的问题

方法库页的保存 = 给**当前会话的 Lead** 发一条 `session/prompt`，页面回执「已交给 Lead 保存；它写入后点「刷新」回读」
（[MethodLibraryView.tsx L204-L234](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx)）。
Lead 的回复在 Chat tab，用户在方法库页看不到；要切过去看回话，再切回来点刷新——这正是「跳来跳去」。
文案也写死了「交给 Lead 写入库；本页不直接改文件」
（[views.tsx L103](../../../packages/deep-research-pack/src/client/method-library/views.tsx)）。

### 7.2 三个选项

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| A（推荐） | 方法编辑写库 | 闭环在这页；不碰研究会话；方法库是 workspace 级，本来就不该依赖某个 run | D25 的「唯一路径 = Lead」要扩；方法编辑要有 fs 写权限与写政策 |
| B | 仍交当前 Lead，页面 `follow` 当前会话把回执显示在页内 | D25 字面不动 | 必须在一个研究会话里；Lead 的 run 上下文被塞管理指令；方法编辑只读 |
| C | 加一个窄 host 工具 `method_library_upsert`，Lead 与方法编辑共用 | 写政策单点、可校验 | 多一个 host 面；本轮「不加 host 插件」破功 |

A 的「面板永不直写」不变：页面只发 prompt，写的是模型可见、日志留痕的 agent。D25 的理由（模型可见、
会话日志留痕、面板不直写）全部保留，只是把「Lead」扩成「有库技能的 agent」——研究时的管理仍归 Lead。
建议登记 D37 记录这次扩展；若用户要保 D25 字面，选 B，并把页内回执做出来。

### 7.3 回执三态

1. **已发送**：`session/prompt` 被接受；
2. **已回话**：coach 的该轮 `turn/end`；消息里可能是一个问句（名称还缺、要确认），不一定是「已写」；
3. **已落盘**：页面回读 `method-library.md`，`foldLibrary` 后确实有该名称、四字段与草稿一致。
   一致才显示「✓ 已落盘」；回话但读不到就如实说「已回话，但库里没读到这条」。

写失败/权限拒绝/模型只回问句，都要停在前一态，不假装成功。落盘后刷新左侧库列表（当前是 1.5s 后 `load()`，
可以改成在 turn/end 后读一次，失败再重试一次）。

### 7.4 并发与权限

- 写是 read-modify-write；Lead 同时被用户要求改库时存在竞态（文件无锁，D34 已说「run 活跃时不手改」）。
  v1 接受：方法编辑读后写、保留其他条目；回读校验能发现覆盖。
- `tool-fs` 写可能触发会话权限确认；这是一次原生 approval，不额外造 UI。若用户嫌烦，再评估「窄工具」。
- 删除/设默认同路：页面发管理指令给方法编辑；「换一条（use-now）」仍发研究 Lead。

## 8. 与现行决定的冲突面

| 决定 | 现文 | 本方案要动的字面 | 是否动理由 |
|---|---|---|---|
| D2 | 角色 = 4 个 | +1 非研究 preset（方法编辑） | 不动「研究角色 4 个」的理由；需新 D 号 |
| D25 | 面板不直写，业务写入唯一路径 = Lead | 扩成「有库技能的 agent；方法库页 = 方法编辑」 | 理由（模型可见、日志留痕、面板不直写）不变 |
| D18 | 驾驶舱 = client 套件 | 新增一个 view 内的私有子槽与 coach 会话装配 | D18 边界内（观察面 client），不新增 host 面 |
| design/40 §2.7 | 「无写权限、无新 RPC」 | 仍无新 RPC；写仍由 agent 执行；页面新增「发起 coach 会话」的装配 | 需更新页签描述与已知限制 |

## 9. 客户端改动面与门禁

- `src/client/index.ts` 的 `inject` 加 `sessions`、`workspaces`；`scoped.inject([...])` 同步。
- `keys.ts` 加 `METHOD_COACH_SLOT`（私有子槽名）与 `METHOD_COACH_PRESET`（`method-editor`）；
  `client-keys` 门禁要求 key 字面量只住 keys.ts、`slots.inject`/`register` 用导出常量
  （[b-pack.mjs L177+](../../../scripts/verify/gates/b-pack.mjs)）。
- 所有注册包 `scoped.effect`（`client-effect-wrap`）。
- `SessionReferenceSourceMap` 增 `methodCoach: unknown`（同 ui-subagent 的 `sidebarChat`）。
- `dsh.client.inject`：`sessions`/`workspaces` 是 Cordis 服务，不是运行时模块 import；类型 import 走
  `@deepseek-ai/dsh-api-session-controller/client` 与 `.../workspace-controller/client`，加 devDependencies 即可，
  不需要新增 client 模块条目（除非构建期报缺）。
- `docs/design/40-research-cockpit.md` §2.7 的件表要登记新文件（`method-library/coach.tsx` 等），
  `cockpit-doc-registry` 会咬。
- 测试/冒烟：client-load smoke（页内嵌入渲染）、preset-smoke（新 preset 挂载）、l4-lite（新角色标记）、
  snapshot replay（persona/skill 文本）、`pnpm verify`。

## 10. 未决与风险

| # | 未决 | 影响 | 处理 |
|---|---|---|---|
| 1 | 嵌套 `conversation.content` 在 `conversation.view` 里是否稳定（高度/滚动/问卡/卸载） | 决定方案生死 | **先做半天 spike**；失败退右栏 chat tab |
| 2 | 双 composer 抑制 chain 是否可靠（含 pending 例外） | 决定「页内 chat」是否成立 | spike 内一起验 |
| 3 | 一 workspace 一会话 vs 一草稿一会话 | 侧栏行数 vs transcript 清晰度 | 先一 workspace；实测再拍 |
| 4 | 第 5 个 preset / D2 | 治理面 | 用户拍板 |
| 5 | 方法编辑写库 / D25 | 治理面 + 安全 | 用户拍板；B 是保字面的退路 |
| 6 | 模型是否稳定出 `method-draft` 块 | 表单更新可靠性 | skill 约束 + 解析兜底 + 真模型 probe |
| 7 | 写权限确认、并发写 | 摩擦/覆盖 | 回读校验；必要时窄工具 |
| 8 | 会话行出现在侧栏 | 产品观感 | 标题「方法编辑」+ 可归档；不接受则右栏 |

## 11. 证据表

| # | 断言 | 证据 |
|---|---|---|
| 1 | Session header 只有 cwd/origin/parent/depth/preset 分类字段 | `vendor/dsh/packages/core/session/src/types.ts` L100-L131 |
| 2 | `session.create` 的 workspaceId/cwd 互斥、cwd 取 workspace.path、创建后 attach | `vendor/dsh/packages/api/session-controller/src/commands.ts` L111-L143 |
| 3 | attach 五步校验，cwd 必须 realpath 等于工作区路径 | `vendor/dsh/packages/workspace/workspace/src/entity.ts` L110 |
| 4 | 冷会话无 cwd 不进列表；live 会话仍进 | `vendor/dsh/packages/api/session-controller/src/list.ts` L132-L146 |
| 5 | 侧栏排除 subagent | `vendor/dsh/packages/client/ui-workspace/src/client/tree.ts` L244 |
| 6 | live child 不能调 `ask_user_question` | `vendor/dsh/packages/interaction/tool-ask-user/README.md` L12 |
| 7 | 用户 rename 钉住标题、抑制自动标题 | `vendor/dsh/packages/session/session-title/src/index.ts` L401-L425、L509 |
| 8 | `sessions.create` 客户端契约 | `vendor/dsh/packages/api/session-controller/src/client/contract/sessions.ts` L88-L99 |
| 9 | `sessions.retain` 取引用 | `vendor/dsh/packages/api/session-controller/src/client/contract/sessions.ts` L58 |
| 10 | `workspaces.list` 带 sessionIds；archive 语义 | `vendor/dsh/packages/api/workspace-controller/src/client/service.ts` L47-L110 |
| 11 | `conversation.view` 是 session 作用域 list | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` L258 |
| 12 | `conversation.content` 输入 = variant/phase/hero | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` L535-L540 |
| 13 | 声明 session 子槽即注入 `SessionProvider` | `vendor/dsh/packages/client/ui-renderer/src/client/scoped-slots.tsx` L586-L591 |
| 14 | ui-subagent 用 `SessionProvider` + embedded factory 渲染另一个会话 | `vendor/dsh/packages/client/ui-subagent/src/client/sidebar-chat/index.tsx` L126-L165 |
| 15 | 同一模式的单测断言 | `vendor/dsh/packages/client/ui-subagent/tests/sidebar-chat.client.spec.tsx` L207-L219 |
| 16 | composer 始终渲染，view 只换正文 | `vendor/dsh/packages/client/ui-conversation/src/client/skeleton/ConversationContent.tsx` L138-L215 |
| 17 | 问卡走 `conversation.composer` chain | `vendor/dsh/packages/client/ui-user-questions/src/client/index.ts` L382-L390 |
| 18 | chain owner 带 pendingInteraction | `vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts` L511-L520 |
| 19 | 方法库页当前保存路径与回执 | [MethodLibraryView.tsx L204-L234](../../../packages/deep-research-pack/src/client/MethodLibraryView.tsx) |
| 20 | 库格式与四标签 | [library-fold.ts L31-L95](../../../packages/deep-research-pack/src/lib/library-fold.ts) |
| 21 | Lead 的方法库政策（格式/管理动词） | [research-brief SKILL.md L87-L105](../../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md) |
| 22 | D2 / D25 现文 | [decisions.md L15](../../../docs/decisions.md) / [L38](../../../docs/decisions.md) |
| 23 | 新 preset 的机械面（数量哨兵/时钟/冒烟） | [presets.test.mjs L26-L33](../../../tests/pack/presets.test.mjs) · [b-pack.mjs L33-L38](../../../scripts/verify/gates/b-pack.mjs) · [l4-lite-smoke.mjs L108-L125](../../../scripts/smoke/l4-lite-smoke.mjs) |
| 24 | client key/effect 门禁 | [b-pack.mjs L177+](../../../scripts/verify/gates/b-pack.mjs) |

## 12. 验证计划（按顺序，先证伪再实现）

1. **spike A（已跑，2026-10-28）**：直接嵌 `conversation.content` **红**（递归门）；根级 `shell.overlay` + `createPortal` 进页面右栏 + 私有子槽 **绿**（页内三栏）。证据 = §14。
2. **spike B（已跑）**：`conversation.composer` chain 抑制 **红**（selector 不随模块级 store 重跑）；CSS `:has` 抑制 **绿**，且只对外层 seat 自己的问卡让位 **绿**。证据 = §14。
3. **原型（假回复/真表单）**：跑三个起手式（从零/照内置/从 run）+ 手改 + 保存回执，给人看 flow。
4. **preset + skill**：接入真方法编辑；keyless 钉格式/标签；录 fixture；l4-lite；真模型 5 种人 probe
   （很模糊 / 过度指定 / 「不知道」 / 贴一段旧做法 / 从 run 沉淀）。
5. **收口**：`pnpm verify` + client-load smoke + preset-smoke + snapshot + L4；更新 design/40、pack README、D2/D25/D37。

## 13. 边界

- spike 已跑（2026-10-28，源码域 web + Playwright + 真模型）：直接嵌红、固定浮层 UX 否、右栏 tab 否、**页内三栏 portal 绿**、CSS 抑制/问卡/重挂绿；证据 = §14 与 `runtime/spike-embed/artifacts/`（gitignored）。
- 没有做真模型访谈质量评估；skill 的效果要等 probe。
- FAQ 25 是 rc.3 口径的本机 digest；本仓机制以 vendor rc.2 为准，行号按 rc.2 树。
- 没有做 GUI 像素级验证；「截图里 composer 在折下」是从 `ConversationContent` 结构与截图推断，spike 时以实际 DOM 为准。
- 没有实测并发写 `method-library.md` 的覆盖行为。

## 14. Spike 实跑结果（2026-10-28）

分支 `spike/method-coach-embed`（最终 commit `09bba8a`，不合并 master；`--no-verify` 理由 = 临时实验件不登记
`docs/design/40`）。脚本 `runtime/spike-embed/spike.mjs`（gitignored）；最终绿证据 =
`runtime/spike-embed/artifacts/2026-10-28T05-58-46-583Z/`（01–04 截图 + page.html + result.json）。
通道 = 源码域 `--profile web --patch dev/research.overlay.yml` + Playwright + 真模型（外层 standard / coach lead）。

最终形态 = **方法库 tab 内三栏**（库 / 表单 / 方法编辑）。coach 的 React 树在根级 `shell.overlay`
（`main` 的兄弟分支，在外层 `conversation.content` 之外），`createPortal` 把 DOM teleport 进页面右栏；
页面布局、分栏、滚动、composer 位置全是普通 React/CSS。

| 断言 | 结果 | 说明 |
|---|---|---|
| 聊天格在页面内 | **绿** | `[data-spike-chat-host]` 在 `[data-spike-root]` 内，`position: static`；不是浮层/右栏 tab |
| 根级树 portal 进页面 | **绿** | `[data-spike-chat-host] [data-spike-portal]` 在场；session 绑定正确 |
| 独立 coach session | **绿** | id ≠ 外层；主会话 transcript/上下文未变 |
| 页面聊天格渲染 conversation.content | **绿** | 原生消息/composer/问卡 |
| 页面内 composer 可见 | **绿** | 页面只有一个可见 composer |
| 页面表单仍在 | **绿** | 名称 + 四字段（5 个 input/textarea） |
| 主 composer 抑制 | **绿** | 外层 seat 不可见；外层 pending 问卡出现时让位（CSS 只认外层 seat 自己的卡） |
| 切 Chat 再回来 | **绿** | 页面重挂；coach 问卡仍在（会话历史） |
| 26 条断言 | **全绿** | 脚本输出 + result.json |

**前两版（保留为证据）**：

- 直接嵌 `conversation.content`：**红** —— `recursive render of factory 'conversation.content'`；
- 根级固定浮层：**机制绿 / UX 否** —— 压在页面上的盒子；空会话/问卡态 composer 停在浮层上部；
- 右栏 chat tab：**机制现成 / UX 否** —— 用户要留在「方法库」tab 内；
- `conversation.composer` chain 抑制：**红** —— selector 是 owner props 的纯函数，模块级 store 变化不重跑；
  `overlay:true` 的 fallback 以 `display:none` 留在 DOM。

**关键结论**：portal 是同时满足「留在 tab 内」和「独立会话」的 UI 技巧；用户看到的只是页面右栏的
方法编辑面板，主会话完全不动。CSS 抑制必须把「外层 seat 自己的问卡」和「页面里 coach 的问卡」分开，
否则 coach 的问卡会让主 composer 意外出现。

**内容缺口（下一阶段）**：spike 的 coach 是 lead 替身，右侧出现 Think/Read/Glob/研究 HITL——真实方法编辑
必须不研究、一次一问、不展示研究工具卡；草稿回填/保存回执/库刷新尚未接。布局作为实现基线冻结。

**未覆盖**：方法编辑 preset/skill 的真实访谈质量；方法库写路径；主会话与 coach 的并发/权限。
