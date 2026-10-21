# 动态研究 DAG：A0 组合与实施总计划

> 状态：proposed
>
> 首提：2026-10-21 ｜ 关联 issue：[_backlog/issues/2026-10-21-dynamic-research-dag.md](../../_backlog/issues/2026-10-21-dynamic-research-dag.md)
> ｜ 决策 review：[_backlog/research/dynamic-research-dag/2026-10-21-combination-review.md](../../_backlog/research/dynamic-research-dag/2026-10-21-combination-review.md)
> ｜ 用户 2026-10-21 已拍板“按 A0 组合走”；本 RFC 是实施总计划，批准后拆三张实施卡。

## 问题

当前 run 由固定八节点生命周期 + Agent Teams 任务板 + 四个角色 preset 驱动。`topics.md` 的
`depends_on` 与 Team task 的 `blocked_by` 已经能表达局部依赖，但：

- 执行图是隐式的：Lead 不会在 HITL1 后按问题形状写出“宽搜/深搜/交叉/审查”的完整图；
- 宽搜与深搜的“深度”没有显式档位，容易停在浅层；
- 右栏看不到依赖形状、worker 层和卡点，出问题只能翻任务板/会话；
- 搜索底座仍是 Messages 搜索（一次搜索一个模型轮次），宽搜成本高、无 query 操作符。

目标：用 **DSH 原生机制**把“研究执行图”提升为一等过程件，让 Lead 动态设计/重写图，让宽搜/深搜
都有显式深度，让侧栏能看见并快速发起调整；**不引外部插件/第二套 store/workflow**。

## 方案

### 1. 目标态（A0 组合）

| 层 | 载体 | 说明 |
|---|---|---|
| 执行图 | run bundle `plan.md`（lead owner） | 节点表：`id / kind / question / owner_role / deps / output / acceptance / budget / depth / task_id`；可随证据重写 |
| 执行镜像 | Agent Teams 任务板 | 每节点一个 task；`deps → blocked_by`；readiness/CAS/reassign 用原生工具 |
| 调度 | Lead | `wait_agent` → `team_task_list({ready:true})` → `reassign`；失败 `interrupt_agent` + reassign/reopen；journal 记账 |
| 角色 worker | subagent | `maxDepth: 2` + `allowedAgentPresets: [scout, analyst, critic]`；worker 必须带 `agent_preset` |
| 深度 | Scan/Dive/Check cell + L0–L3 | 宽搜=覆盖谱系；深搜=证据链；每 topic 最多 2 轮加深 |
| 观察面 | 右栏「研究图谱」页签 | 纵向 wave DAG + 节点卡 + 队员/worker + attention；只读 + “让 Lead 调整” |
| 搜索 | `deepseek-search-api` + `http` fetch | Search API 直接请求；Fetch 保持本地 HTTP；不切 Fetch API |

### 2. 工作流与依赖

| 工作流 | 内容 | 依赖 | 可并行 |
|---|---|---|---|
| **W1 编排/深度** | preset 基础 + `plan.md` + cell/L0–L3 + skill/手册/NODES | — | W2/W3 可在 Phase 1 后并行 |
| **W2 侧栏图谱** | `plan-graph` 纯函数 + 页签 + attention + “让 Lead 调整” | Phase 1（Team 数据面已可用）；不依赖 plan.md | 与 W1 Phase 2 并行 |
| **W3 搜索底座** | profile `- id: web` 覆盖 + 5–10 query A/B；Fetch A/B | Phase 1（无代码依赖） | 与 W1/W2 并行 |
| **W4 文档/门禁/收口** | docs/40、pack README、NODES/handbook、smoke、issue 拆卡 | 随各工作流同 diff | 贯穿 |

### 3. 阶段计划

| Phase | 产出 | 门/验收 | 规模 |
|---|---|---|---|
| **P0 决策冻结** | 本 RFC + issue 结论 + review 三处修正确认 | 用户批准本 RFC；issue `结论倾向：现在做` | 文档 |
| **P1 预设基础** | lead/scout/analyst `maxDepth: 2` + `allowedAgentPresets`；删 `backgroundMode`；critic 保持无 subagent | L1 preset-smoke 真挂载；三份 preset 结构门禁；小 |
| **P2 plan/深度** | `templates/run/plan.md`；handbook 目录/owner；planning skill（team-assembly 扩或新 skill）；`research-brief` 计划卡；Scout/Analyst/Critic 深度记录段；NODES 一行 | keyless docs/gates + 一场 3 节点小 run（plan→task→Lead 派发→depth-2 worker→evidence/final）；单源触发 cross-check；缺 Depth Record 被 critic 抓 | 中 |
| **P3 侧栏图谱** | `src/lib/plan-graph.ts` + 单测；`ResearchGraphTab.tsx`；keys/index 注册；design/40 更新 | `pnpm test` 纯函数；`client-load-smoke` 合成 `agentTeam` 3 节点 + 1 队员 + 1 worker；空态/attention；真浏览器 | 中 |
| **P4 搜索底座** | profile `- id: web`（search API + http）；5–10 query A/B；pack 默认决策 | A/B 记录延迟/条数/URL 重叠/snippet+date/失败率；`web_search` 走新 provider；key 不入日志；可回退 | 小 |
| **P5 Fetch A/B** | 5–10 页对照（表格/中文/重定向） | 反斜杠/表格/逐字/title/最终 URL；未过保持 `http` | 小 |
| **P6 收口** | 真实 run + docs + issue 归档/拆卡 | `pnpm verify` + `pnpm test`；L1/L2；交付链完整；issue 归档 | 小 |

**并行建议**：P1 完成后，P2（plan/深度）与 P3（图谱）可并行；P4/P5 独立，可随时插入。
P6 必须等 P2/P3/P4/P5 至少各有一个绿色证据。

### 4. 文件级改动

| 工作流 | 文件 | 类型 |
|---|---|---|
| W1 | `packages/deep-research-pack/presets/{lead,scout,analyst}.patch.yml`：加 `maxDepth: 2`/`allowedAgentPresets`，删 `backgroundMode` | 配置 |
| W1 | `presets/lead/skills/team-assembly/SKILL.md`（或新 `research-planning` skill）；`research-brief`；Scout/Analyst/Critic skill 各一段 | 文本 |
| W1 | `research-workspace/templates/run/plan.md`（新）；`packages/deep-research-pack/workspace/templates/run/plan.md`（种子同步）；`research-workspace/AGENTS.md`；`research-workspace/NODES.md` 一行 | 文档/模板 |
| W2 | `src/lib/plan-graph.ts` + 单测；`src/client/ResearchGraphTab.tsx`；`src/client/keys.ts`；`src/client/index.ts` | 代码 |
| W2 | `docs/design/40-research-cockpit.md`（构成/边界/限制） | 文档 |
| W3 | `runtime/harness-home/profiles/research/cordis.patch.yml`（trial `- id: web`）；pack `cordis.patch.yml`（P4 通过后） | 配置 |
| W4 | pack README、guides/61（若操作面变化）、`_dist/安装手册`（发布时）、issue/研究笔记 | 文档 |

**不新增依赖**：`agentPreset`/`allowedAgentPresets`、`agentTeam`/`subagentCatalog`、`session.prompt`、
`workspaceFiles`、`web-deepseek-api` 均为现有 DSH 包；无 third-party 图库/store。

### 5. 三处实施前修正（review F1–F3）

- **F1 Search-only 用配置覆盖**：UI “Use the new Web Search API” 会把 search+fetch 成对切；A0 要
  “Search API + http fetch”，用 `- id: web` 配置覆盖。trial 写 profile patch；pack 默认等 A/B。
- **F2 plan.md 是过程件**：进 handbook 目录/owner + 模板 + pack 种子；NODES 只加一行；不改
  `schema-scan`/`node-gate`；`task_id` 是会话映射，恢复按 `N` 重建。
- **F3 图谱是依赖/worker/attention 视图**：不是任务 CRUD；更新 `design/40`；只读 + “让 Lead 调整”，
  不直接改 Team 板。

### 6. 边界（不做什么）

- 不引 `dsh-tool-orchestrate`、`agent-dag-workflow`、`dsh-agent-board` 等外部插件；
- 不用 `workflow` 当控制面（角色组合/durable 图/HITL 都不合适）；
- 不建第二套 store/queue/ledger；
- MVP 不加 `plan-gate`、不改 `schema-scan`、不发明数值 floor；
- 不做 nested Team、不自动派发 daemon、不让图谱直接 reassign/complete/delete；
- P4 前不把 Search API 作为 pack 默认；P5 前不切 Fetch API；
- 不把 `backgroundMode` 当护栏（已失效，顺手删）。

### 7. 风险与回退

| 风险 | 缓解 | 回退 |
|---|---|---|
| Lead 调度循环模型行为不稳 | skill 写死“wait→list ready→assign”；小 run 先验；必要时 Lead 手动 | 退回 Lead 手动派工，不依赖循环 |
| plan 与 Team 板漂移 | `task_id` 映射 + journal；重写图必须更新 plan；后续可选 drift 检查 | 以 Team 板为准重建 plan，或反之 |
| teammate 工具面越权 | prompt 纪律；worker 用 `agent_preset`；不承诺 nested Team | 只让 Lead 派 worker |
| roster 8 人上限 | 节点预算 ≤12；复用成员；worker 承担叶级 | 拆 run / 串行 |
| Search API 质量波动 | 5–10 query A/B；保留 Messages 回退 | `searchProvider: deepseek-official` |
| Fetch Markdown 保真 | 继续 `http`；5–10 页 A/B | 不切 |
| UI 开关全有/全无 | profile 配置覆盖；文档写明 | 改回 `messages` 对 |
| pack 默认影响所有用户 | 先在 profile 验证；A/B 通过再进 pack | 回退 pack 行 |

### 8. 决策登记与 Issue

- 建议登记 **D28**（RFC 批准后进 [decisions.md](../../docs/decisions.md)）：A0 组合 = plan.md +
  Team 板 + Lead 调度 + `maxDepth: 2` + 侧栏图谱 + Search API（Fetch 暂留 http）；零外部依赖。
- 本 RFC 批准后：issue 拆三张实施卡（W1/W2/W3），伞卡归档。
- 每张实施卡引用本 RFC + 对应 research note；验收判据逐条绑定检查方式（D23）。

## 输掉的方案

- **workflow 当主编排器**：子代继承 Lead 组合、无 Team 板/durable 图/中途 HITL；与角色隔离和
  文件事实链冲突。
- **外部 DAG runtime（agent-dag-workflow / dsh-tool-orchestrate）当控制面**：第二套 store/DSL，
  与 D17 冲突；声明式 DAG 工具不能选 `agentPreset`；只适合叶级子图。
- **thin auto-dispatch daemon**：MVP 不需要；Lead 就是调度器，少一个生命周期/并发/恢复责任。
- **现在加 plan-gate**：漂移尚未在真实 run 出现；先纪律 + journal，出现再只读检查。
- **现在切 Fetch API**：Markdown 反斜杠转义（价格页 226–387 个）会污染逐字/表格证据。
- **用 UI 开关做 Search-only**：开关成对切 search+fetch，做不到“只切 search”。
- **nested Team**：vendor 不支持；平面 roster + worker 是边界。
- **数值 floor 门禁**：本仓已否决；用结构化记录 + critic 语义审查。
- **图谱直接改 Team 板**：绕过 Lead 权威与 journal 留痕；只发建议。

## 验收

验收按 D23 四型绑定：机械门禁 / 契约测试 / 对账命令 / 人工判据；每条在实施卡里落具体命令或走查。

### P1 预设基础

- [ ] `pnpm verify` 绿；L1 `preset-smoke` 真挂载三份 preset，`maxDepth: 2`/`allowedAgentPresets`
      生效，`backgroundMode` 已删；critic 无 subagent（机械）。
- [ ] 三份 preset 结构门禁 + `row-deps` + `role-list-sync` 不回归（机械）。

### P2 plan/深度

- [ ] HITL1 后 `plan.md` 在场；3 节点小 run：Lead 建 task → 派发 → teammate 用
      `agent_preset=scout|analyst` 派 depth-2 worker → evidence/final 链完整（人工 + 文件对账）。
- [ ] 单源 claim 触发 cross-check 节点；缺 Depth Record → critic MAJOR；每 topic 加深 ≤2 轮
      （人工判据 + critic 记录）。
- [ ] `node-gate` 交付链不回归；`schema-scan` 零改动（机械）。
- [ ] handbook 目录/owner、模板、pack 种子同步（`pack-workspace-fresh`）。

### P3 侧栏图谱

- [ ] `plan-graph` 单测：分层/缺 blocker/环/attention/worker chips（`pnpm test`）。
- [ ] `client-load-smoke`：合成 `agentTeam` 3 节点 + 1 队员 + 1 worker，页签渲染、attention 条、
      空态不炸；`client-keys` 对账；无新 RPC、不直接改 Team 板（机械 + 人工）。
- [ ] 真浏览器：切会话/展开/点击节点/“让 Lead 调整”回执（人工走查）。

### P4 搜索底座

- [ ] 5–10 query A/B（Messages vs Search API）：延迟、条数、URL 重叠、snippet+date 可用率、
      失败率（对账记录）。
- [ ] profile `- id: web`（search API + http）生效；`web_search` 走新 provider；key 不入日志；
      可一键回退（机械 + 人工）。
- [ ] pack 默认只在 A/B 通过且用户点头后加（人工判据）。

### P5 Fetch A/B

- [ ] 5–10 页（表格/中文/重定向）对照反斜杠/表格/逐字/title/最终 URL；未通过保持 `http`
      （对账记录 + 人工）。

### P6 收口

- [ ] 一场真实 run：HITL1 → plan → Team → worker → 综合 → critic → HITL2 → present；
      `final/review/decisions/present/audit` 链完整（L4 人工 + 门禁）。
- [ ] `pnpm verify` + `pnpm test` 全绿；L1/L2 按改动面跑；docs/design/40、pack README、
      NODES/handbook 同 diff；issue 归档/拆卡（机械）。
