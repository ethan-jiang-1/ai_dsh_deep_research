---
topic: 队员动作流数据通道
intent: 为 member-activity-stream 卡未决 1 提供三通道的 vendor 同 pin 实测依据（rc.2 源码锚点）。
---

# 队员动作流数据通道探明（vendor 同 pin 实测）

> 服务 = [member-activity-stream 卡](../../settled_issues/2026-10-09-member-activity-stream.md) 未决 1（供给侧半边）。
> 方法 = 只读源码考古：`git -C vendor/dsh rev-parse HEAD` 实测当轮 pin 的 commit（40 位全文记于当轮环境日志，此处不复述以免与换 pin 后的 pin-agreement 打架）
> （观察时 tag，工作树干净；现 pin dsh-v0.2.1-rc.2）后 grep 定位 → 逐文件读源码取锚；文档仅作旁证并标注"文档"。
> vendor 路径以行内代码标注（相对 `vendor/dsh/`），`pack:` = `packages/deep-research-pack/`；行号 = 该 pin
> 现状，升 pin 后按 [discipline-map 重审触发路径](../../../../docs/discipline-map.md) 复核。
> 本材料只供事实，不做选型决定——选型按卡等真实 run 素材后定。

## 通道一：agentTeam 投影（sessions 座位，rc.2 形态）

- **旧名确认退役**：rc.2 全树 grep `remote.agentTeams` 零命中；现形态 = lead 会话上的 Session 投影键
  `agentTeam`（`packages/experimental/agent-team/src/projection.ts:388-394` 的 `ProjectionDefinition`；
  类型进 `SessionProjectionMap`，`types.ts:120-125`），发布在 **Lead 会话**上（`types.ts:109-113` 原话
  "published to browser clients through the Lead Session's `agentTeam` projection"）；成员表首行恒为
  lead（`projection.ts:344`）。官方面板头注明写 "performs no Team RPC"（
  `packages/experimental/client-ui-agent-team/src/client/mount.ts:24-26`）。
- **成员行字段**（`TeamMemberProjection`，`types.ts:100-107`；schema `projection.ts:312-318`）：
  `id: SessionId`、`name`、`role: 'lead' | 'teammate'`、`phase`（durable：provisioning/active/failed）、
  `error?`。**没有**：忙闲、model/provider、逐成员任务归属、任何动作级事件——忙闲是 client 侧叠加每成员
  会话的 session status 推导（`TeamAction.tsx:82-86`），model 读成员会话自己的 modelSelection 投影（:81）；
  带 status/model 的 `TeamMemberView` 只在宿主侧服务返回（`types.ts:57-68`），不进投影。
  `types.ts:104` 原话 "Turn activity comes from Session status"。
- **任务行字段**（`TeamTaskView`，`types.ts:86-97`）：subject / description / status / blockedBy /
  writeScopes / ownerName（名字非 id）/ ready / writeScopeWarnings / revision——任务粒度。邮箱消息态
  （messages/delivered）是内部 state，不进 wire 视图（`projection.ts:131-138` vs `333-337`）。
- **刷新模型 = 推，无轮询**（`packages/api/session-controller/src/client/sessions/projection-store.ts:1-14`
  头注：host 唯一计算点、client 存整值）。两条推送路径：① 会话 follow 的 snapshot 帧自带 projections
  基线（`packages/api/session-controller/src/types.ts:549-556`）；② 宿主级控制流把每次投影变化广播为
  `{type:'projection', sessionId, key, value, seq}`（`packages/api/session-controller/src/control.ts:22-30`），
  开流 baseline 覆盖 `ctx.sessions.list()` 全部会话（`control.ts:47,55-78`）；client 端 manager 逐帧
  apply / 整段 seed（`.../client/sessions/manager.ts:619-633`）。**未找到任何轮询定时器**——"5s 轮询"
  是旧 API 形态（琢磨稿记载的旧名配套）。另有手动刷新面 `sessions.refreshProjections`（
  `.../client/contract/sessions.ts:99-103`）。
- **粒度天花板**：durable 花名册 + 任务板；turn 级 running 由 session status 通道承载（api-session/status
  等 5 个转发事件，`packages/api/session-controller/src/remote-events.ts:2-7`；client 订阅
  `.../client/index.ts:115-121`）——会话级布尔，不是动作。动作（工具调用）不在此通道。
- **接线成本**：低——数据已推到浏览器，消费入口现成（`useProjection` 系 = ui-session 提供，
  `packages/client/ui-session/src/client/index.ts:169,178`）。**风险**：agent-team 全家 experimental
  （契约可变），但投影词汇有 client 出口 `@deepseek-ai/dsh-experimental-agent-team/client`（
  `packages/experimental/agent-team/src/client.ts:3-10`）。

## 通道二：session.follow 多路聚合

- **API 形状**：`@Remote({mode:'stream'}) follow(request, signal): AsyncIterable<SessionFollowFrame>`，
  service 绑定 `{namespace:'session'}`（`packages/api/session-controller/src/index.ts:99,136,479-482`）。
  帧三型：`snapshot`（header/cursor/records/hasMore/projections 基线）、`event`（SessionEventEntry，
  `types.ts:426-429`）、`assistant-stream`（`types.ts:549-563`）；snapshot = 历史（hasMore 接 backwards
  分页）、event = 实时——与 pack 既有消费一致（`pack:src/client/index.ts:41-50`）。
- **两级声明**：cookbook 明文 "declares both `remote` and `remote.<namespace>` in its `inject`"
  （`docs/cookbook/adding-a-remote-api.md:109`，文档）；vendor 旁证 = session-controller 自己的 client
  face 两级都列（`.../client/index.ts:98-107`）+ shipped 插件 11 处同款；本仓 0.1.7 实证注释
  （`pack:src/client/index.ts:28-30`）。机制成立。
- **传输与并发**：stream 型 remote 走 Gateway 复用 WebSocket `/api/remote.mux`（
  `packages/api/gateway/src/stream-protocol.ts:7`；client 开 socket `.../stream-client.ts:473-479`；
  "逻辑流共享一条连接" = README.zh.md:35，文档）。**并发流上限：未找到**——gateway 源码仅见上行缓冲
  maxBytes（`.../stream-server.ts:319,334-337`），无流数上限常量或文档。旁证：本 pack 现役两条 follow
  （页签 + 活标题，`pack:src/client/index.ts:97-121`）。
- **队员 journal 词表**：tool 事件是 core session 词汇、会话类型无关——`'tool/call': {turn, step,
  callId, name, arguments}`（`packages/core/session/src/types.ts:361`，JSDoc 明示 callId 与 tool/result
  配对），tool/result 同表紧随（:366 起）。lead 与队员同词汇源码级成立；实际记录分布待 run。
- **队员会话 id 发现（接线前置，决定性事实）**：`spawn_teammate` 的 lead journal 返回**没有 id**——
  工具返回 `{ member: modelMember(result.member) }`（
  `packages/experimental/tool-agent-team/src/index.ts:211`），`modelMember` 剥 id 只留
  `{target: name, role, status, ...}`（:63-66，`MEMBER_VIEW_SCHEMA` additionalProperties:false）——
  "从 spawn 返回拿队员 id" 此路不通。**正源 = agentTeam 投影行的 `id`**；官方 UI 即用它打开成员会话
  （`TeamAction.tsx:99` → `mount.ts:38-50` `ctx.uiWorkspace.openSession({parentSessionId, childSessionId,
  mode:'continuable'})`）。次级线索（未深挖）：会话快照 `subagent.address` 反查 lead（`mount.ts:32-35`）
  + `remote.subagents` 命名空间在装配表（`packages/api/remotes/src/client/index.ts:36`）。
- **接线成本**：低-中——follow 闭包已存在，换 sessionId 即可；成本在 UI 聚合与 N 条流的 AbortController
  生命周期。**风险**：每条流首帧 snapshot 全量历史，长队员会话首连数据量与 lead 同阶；多流稳定性未实测。

## 通道三：新 @Remote（host 读模型）

- **机制（源码锚定，四步）**：① host 半 service class 扩展 `TypertRemoteService`，`super(ctx, serviceKey,
  {namespace})` 绑定 wire 命名空间，方法标 `@Remote('name')` / `@Remote({mode:'stream'})`（
  `packages/typert/protocol/src/index.ts:166-181,198-232`；vendor 实例先例 =
  `packages/schedule/schedule/src/index.ts:289-303` 等十余处）；② build 产出
  `lib/typert.host.js` + `lib/typert.remote-client.js`，manifest 声明 exports `./typert` + `./remote`
  （cookbook `adding-a-remote-api.md:94-103`）；失败契约 = 单一 `RemoteError` + 域 code 合并进
  `RemoteErrorDetailsMap`（cookbook :53-60）；③ 浏览器半挂载：in-tree 由 api-remotes 装配逐个
  `ctx.remote.$mount(contribution)`（`packages/api/remotes/src/client/index.ts:189`）；**插件自己挂的
  vendor 先例** = client-ui-voice-input（`packages/experimental/client-ui-voice-input/src/client/mount.ts:56-66`，
  `$mount` 后两级 inject `remote.speech`）；④ 消费声明仍两级，类型 = 生成 d.ts + `RemoteResult<T>` 按
  code 分支。
- **仓外现状**：本仓驱动过同一生成器——`dev/vendor-typert-emit.mjs` 经 vendor WorkspaceTypertGenerator
  按导出过滤生成，但**只对 vendor 包跑过**；仓外包（我们的 pack）的生成入口本 pin 上 vendor 无现成路径。
- **接线成本**：三通道最高——host 半要从空壳（`pack:src/index.ts`）长出真 service class + 双 export +
  client 半挂载 + 契约测试。**风险**：仓外插件先例 = 0（voice-input 是 vendor 内包）；@Remote 默认一元
  拉取、不自带推送，"流"须自己 `mode:'stream'` 实现；对"动作粒度"它不新增数据源，只是折算下沉的
  架构选项（而本仓折算纪律 = `src/lib` 纯函数 keyless 可测，[design/40 §4](../../../../docs/design/40-research-cockpit.md)）。

## 对未决问题 1 的映射

| 卡上的选项 | 对应通道 | 今天这个 pin 上 |
|---|---|---|
| follow 各队员会话（多 follow 聚合） | 通道二 | **能**直接回答动作粒度：任意会话 id 可 follow（队员 id 从投影行拿——spawn 返回已证无 id）；帧词汇与 lead 同（tool/call、tool/result）；无已知并发上限。待 run：队员 journal 实际形状/量级、N 流稳定性 |
| agentTeam 投影（sessions 座位） | 通道一 | 能回答"谁在场 / 谁在跑（叠加 session status）/ 任务板"，**不能**回答动作粒度——投影行无动作级字段，源码级天花板（`types.ts:100-118`）。定位 = 动作流的**补充源**（roster + 忙闲 + **id 发现**），不是动作流本体 |
| 新 @Remote | 通道三 | 机制完备、vendor 内先例链完整；但仓外插件零先例、生成管线对 pack 未验证，且它是读模型不是事件源。对"队员动作流"非直达通道；价值在 host 半自定义折算（若走此路才考虑） |

供给侧事实已齐；**选型决定仍按卡等 run 素材**——需求侧定"多痛、要什么粒度"后才定接不接、接多少。

## 遗留不确定性（诚实清单）

1. **队员 journal 真实形状**：已核到事件类型定义与 follow 帧机制（同词汇，源码锚定）；差一场真实 run
   抓队员会话 journal 样本——web_search call/result 实际分布、ignorable 事件占比、首连 snapshot 体量。
2. **多 follow 并发上限**：已核到 gateway 无流数上限（仅上行 maxBytes，`stream-server.ts:337`）+ 逻辑流
   共享 mux；差 N 队员 + lead + 控制流同开的实跑观察。
3. **投影运行时行为**：行字段与消费面已锚死；差 run 期观察 provisioning→active 推送时延与 failure
   分支真实呈现。
4. **通道三仓外可行性**：已核到生成器被本仓驱动过（仅 vendor 包）+ vendor 内插件侧 `$mount` 先例；
   差给 pack 声明 `./typert`+`./remote` 跑一次生成的试验。
5. **两级声明的失败报错文本**：机制成立（cookbook 文档 + vendor 11 处 inject 旁证 + 本仓 0.1.7 实证）；
   vendor 端报错路径未逐行追。
