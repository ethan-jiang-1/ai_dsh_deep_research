---
topic: 侧栏「研究图谱」页签
intent: 为 Research Cockpit 的 plan/DAG + 队员/worker 实时表达与“让 Lead 调整”交互提供数据源、布局与验证设计。
---

# 侧栏「研究图谱」页签：把 plan、队员、worker 和异常画出来（2026-10-21）

> 服务 = [_backlog/issues/2026-10-21-dynamic-research-dag.md](../../issues/2026-10-21-dynamic-research-dag.md)。
> 方法 = 读 `docs/design/40-research-cockpit.md`、`src/client/*`、DSH `agentTeam` / `subagentCatalog` /
> session status 投影、`ui-agent-team` 的 TeamAction；只读设计，未写组件。目标 = **反馈强、出问题好调**，
> 且不新造 RPC、不引图库。

## 0. 一句话结论

侧栏右栏新增一个「研究图谱」页签：**纵向分层 DAG（wave）+ 节点卡 + 队员/worker 实时状态 +
“需要你注意”条**。数据全走已有投影（`agentTeam` / `subagentCatalog` / session status）+
`workspaceFiles` 读 `plan.md`；调整动作只发 `remote.session.prompt` 给 Lead（预填建议），
**不直接改 Team 板**。零新依赖、零新 host RPC。

## 1. 为什么放在 side panel

- 右栏已经是观察面：研究状态 / 研究配置 / 终稿三个页签；图谱是第四个自然位置。
- Team 任务板在 `ui-agent-team` 的 header action 里，是“任务粒度”；图谱页签补的是**依赖形状 +
  当前卡点 + worker 层**，不重复任务板（分工不双 home）。
- side panel 宽度有限：**纵向 wave 布局**比横向大画布更可读；节点多时垂直滚动，不横向爆宽。

## 2. 数据源（全部已有）

| 数据 | 来源 | 用途 |
|---|---|---|
| 任务 + 依赖 + owner + ready + revision | `agentTeam` 投影（Lead session） | 节点、边、状态、detail |
| 队员 roster + phase | `agentTeam.members` | owner 名字、队员卡 |
| 队员忙闲 | `useSessionStatus(id).running` | running / inactive / 卡住判断 |
| worker（depth 2） | `projectionsBySession[memberId].values.subagentCatalog` | 每个队员下面的 worker chip |
| worker 忙闲 | `useSessionStatus(childId).running` | worker running/inactive |
| plan 的 kind/depth/acceptance | `workspaceFiles.read(leadSessionId, 'plan.md')` | 节点副标题、深度档、验收摘要 |
| “让 Lead 调整” | `remote.session.prompt({mode:'steer'|'queue'})` | 预填调整建议，Lead 执行 |

- 当前会话若是 teammate，用 `useSession(snapshot => snapshot.subagent?.address.parentSessionId)` 找
  Lead session（`TeamAction` 同款），再读 Lead 的 `agentTeam`；不要只读当前 teammate 的投影。
- `plan.md` 不存在（老 run / 还没写）→ 退化成“只用 Team 任务”的图；节点副标题留空，不报错。
- 任务状态只有 `pending|in_progress|completed|deleted`；**没有 failed**。不要发明 failed：
  - `pending + ready + 无 owner` → 待派（attention）
  - `pending + !ready` → 等前置
  - `in_progress + owner running` → 进行中
  - `in_progress + owner inactive` → **可能卡住**（stalled 启发式，标明“可能”，不是事实）
  - `completed` → 完成
  - owner 会话 `failed` → 失败（roster phase 提供）

## 3. 布局：纵向 wave（不是横向大图）

```text
┌ 研究图谱 ──────────────────────────────┐
│ 3 进行 · 2 待派 · 1 卡住   [让 Lead 调整] │
│                                          │
│ Wave 0                                   │
│  ● N1 侦察  scout · running   [worker 2] │
│  ● N2 侦察  scout · done                 │
│        │                                 │
│ Wave 1                                   │
│  ○ N3 深挖  analyst · 待派 ⚠            │
│  ○ N4 深挖  analyst · 等 N1              │
│        │                                 │
│ Wave 2                                   │
│  ○ N5 综合  lead · 等 N3,N4              │
└──────────────────────────────────────────┘
```

- **level = 最长路径**：`level(n) = max(level(blocker)+1)`；根 = 0。Team 保证无环，仍做 fail-soft
  （缺 blocker 当未完成，环钳在节点数-1——company `dag.ts` 同款）。
- 每个 level 是一段“Wave”分区；节点卡竖排；边用左侧 spine + 小箭头/依赖 chip 表达，不做全 SVG
  曲线（side panel 宽度不够，曲线会糊）。需要更强“图感”时再给“Canvas”开关。
- 节点卡：`N3 · 深挖 · T2` + owner + status dot + `deps: N1` + `depth: L2`（来自 plan）+ worker chips。
- 卡片点击展开 detail：subject/description、owner、deps、revision、output/acceptance、最近一条
  journal 活动（复用 member-activity 的 action 行）。
- 顶部“需要你注意”条：`ready 但没人领 > 5m`、`in_progress 但 owner inactive > 5m`、
  `owner failed`、`blocked 超过 15m`（阈值可配置，只提示不裁判）。点击跳到对应节点。

## 4. 交互：只读 + “让 Lead 调整”

- **打开负责人**：复用 vendor 的 teammate 会话导航（`TeamAction` 的 `openTeammate` 同款；或
  `sidebarRight.openResource` 的 subagent 地址）。
- **让 Lead 调整**：节点 detail 里的按钮，按状态预填一句结构化建议，经
  `remote.session.prompt` 发给 Lead（steer 优先，失败 queue——`ResearchConfigTab` 同款回执）：
  - 待派：`N3 已 ready 但无人领取；请指派 owner，或说明为什么等。`
  - 卡住：`N3 owner inactive > 5m；请检查是否 interrupt/reassign/reopen，并 journal 原因。`
  - 阻塞：`N3 被 N1 阻塞超过 15m；请检查 N1 是否卡住，或把 N3 拆小/改依赖。`
  - 重写：`请按当前证据重写 plan.md 并同步 Team 板；说明加了/拆了哪些节点。`
- **不做**：不在面板直接 `reassign`/`complete`/`delete`。Team 的权威在 Lead；面板只发起建议，
  Lead 执行并留痕。这样不会出现“UI 改了但 journal 没记”的第二条控制路径。
- **回执**：发送后显示“已发送 / Lead 已回话”（复用 `receipt-fold` 三态）；不假装已改。
- 可选：节点 detail 提供“复制调整建议”，用户自己粘到 Lead composer；比直接发送更保守。

## 5. 组件与折算分层（照驾驶舱纪律）

- `src/lib/plan-graph.ts`（纯函数，keyless 单测）：
  - `levelsOf(tasks)`：最长路径分层 + 缺 blocker/环 fail-soft；
  - `wavesOf(tasks)`：按 level 分组、组内按 id 数字/创建序；
  - `attentionOf(tasks, memberStatus, now, thresholds)`：待派/卡住/阻塞/failed 的纯谓词；
  - `workerChipsOf(catalogs, statusOf)`：worker entry + running/inactive。
- `src/client/ResearchGraphTab.tsx`：薄渲染；不做布局计算，不直接读 remote；注入面：
  `readFile`（plan.md）、`sendInstruction`（Lead prompt）、`openOwner`（会话导航）。
- 注册：`keys.ts` 加 `RESEARCH_GRAPH_TAB_KEY`/`KIND`；`index.ts` 加 `sidebarRightTabs.register` +
  `RESEARCH_PANE_SLOT` keyed 注册 + guide 胶囊（order 3）。
- 不做新投影、不做新 host RPC；`agentTeam`/`subagentCatalog` 已是标准投影。

## 6. 验证

- keyless 单测：`plan-graph` 的分层/环/缺 blocker/attention/worker chips；
- `client-load-smoke`：注入一个合成 `agentTeam`（3 节点 + 1 队员 + 1 worker）+ 可选 plan.md，
  断言页签渲染、节点数、attention 条、空态（无 team / 无 plan）不炸；
- 真浏览器：切会话、展开/折叠、点击节点、发送调整建议的回执；不新增真模型档（发送动作可 mock）；
- 观察面纪律：失败降级 null + console.error，不把“数据面不可达”画成“没有任务”。

## 7. 已知限制

- side panel 宽度有限：默认纵向 wave；真正的横向大图/缩放留作后续 Canvas。
- Team task 无 failed：卡住是启发式，文案必须写“可能卡住”；不要伪装成事实。
- worker 的 `label` 可能为空（one-shot）：chip 显示“worker”+ role 推断，不编造名字。
- `plan.md` 可能缺席：图退化为任务板；不因此报错。
- 投影推送有延迟；不做轮询，30s 只重读 plan.md 文件（任务靠投影推）。
- 面板不直接改 Team 板：这是有意的权限边界，不是未完成。

## 8. 最小落地顺序

1. 纯函数 `plan-graph.ts` + 单测（无 UI，先把图算对）。
2. 页签 + 只读图 + 节点 detail（数据用 `agentTeam`；plan.md 可选）。
3. worker chips + attention 条（`subagentCatalog` + session status）。
4. “让 Lead 调整”预填消息 + 回执。
5. 真浏览器 smoke + 一场真实 run 的观察验收。
