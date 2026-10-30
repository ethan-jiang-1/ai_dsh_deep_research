# 动态研究 DAG：A0 组合（已落地）

> 状态：implemented
>
> 首提：2026-10-21 ｜ 用户 2026-10-21 批准“按 A0 组合走，全力推进” ｜
> 伞卡（已结）：[_backlog/_archived/settled_issues/2026-10-21-dynamic-research-dag.md](../../_backlog/_archived/settled_issues/2026-10-21-dynamic-research-dag.md)
> ｜ 决策 review：[_backlog/_archived/research/dynamic-research-dag/2026-10-21-combination-review.md](../../_backlog/_archived/research/dynamic-research-dag/2026-10-21-combination-review.md)

## 决定

**A0 组合 = 全部 DSH 原生、零外部插件/零第二套 store。** 当前事实：

- **预设基础**：lead / scout / analyst 的 `tool-subagent` 统一 `maxDepth: 2` +
  `allowedAgentPresets: [scout, analyst, critic]`；已删除失效的 `backgroundMode`；critic 仍无
  subagent。teammate 仍 composeFrom Lead（vendor 限制），depth-2 worker 用 `agentPreset` 取
  精确角色组合。
- **执行图**：`plan.md` 是 run bundle 的 lead 过程件（节点表 `id/kind/question/owner_role/deps/
  output/acceptance/budget/depth/task_id` + 重写记录）；进研究手册目录/owner、`templates/run/`、
  pack workspace 种子；`NODES.md` 仅在“组队”行登记为过程件，`schema-scan`/`node-gate` 不检查它。
  Team 任务板是当前会话的执行镜像，`deps → blocked_by`，`task_id` 只是会话映射。
- **规划/调度 skill**：新增 `research-planning`（cell、L0–L3、触发器、停止规则、Team 物化与
  `wait_agent → team_task_list({ready:true}) → reassign` 调度循环、版本化回边）；Lead persona 与
  `research-brief` 计划卡接入；Scout 加覆盖记录、Analyst 加深度记录、Critic 在方法承诺核查里读
  两段记录。**不新增 evidence 字段/门禁/数值 floor。**
- **侧栏「研究图谱」**：新增 `ResearchGraphTab` + `src/lib/plan-graph.ts` + keys/index 注册；
  数据走 `agentTeam` / `subagentCatalog` / session status / `workspaceFiles`；顶部 SVG DAG
  （顶层 plan 节点优先，边 = plan deps / Team `blocked_by`，同层并行横排）+ 节点详情 + plan 原文；
  复合子节点 W2.1.1… 在父节点详情折叠、可复制 `drt_<slug>/W2.1` 引用；重号/悬空 parent/deps 只读提示；
  **只读观察**，不提供调整动作（调整回对话/rerun），无 plan/无依赖边时明确「没有可画的 DAG」。
  构成正本 `docs/design/40` 已登记，任务粒度仍归 `ui-agent-team`。
- **搜索底座**：research profile 的 `cordis.patch.yml` 用 `- id: web` 覆盖为
  `searchProvider: deepseek-search-api` + `fetchProvider: http`；pack 默认仍保持
  `deepseek-official` + `http`，等更广 A/B 后再定（**2026-10-27 已翻默认**，search →
  `deepseek-search-api`、fetch 仍本地——见 [后续 Note](./2026-10-27-deepseek-search-api-retrieval.md)）。
  Fetch API 暂不用于证据（Markdown 转义未过“逐字/表格”保真）。
- **不引**：workflow 主编排、外部 DAG runtime/任务板插件、第二套 store/queue/ledger、nested Team、
  自动派发 daemon、MVP 阶段的 plan-gate。

## 输掉的方案

- **workflow 当主编排器**：子代继承 Lead 组合、无 Team 板/durable 图/中途 HITL；与角色隔离和文件
  事实链冲突。只适合同质叶级 fan-out，A0 不用。
- **外部 DAG runtime（agent-dag-workflow / dsh-tool-orchestrate）当控制面**：第二套 store/DSL，
  与 D17 冲突；声明式 DAG 工具不能选 `agentPreset`。
- **thin auto-dispatch daemon**：MVP 不需要；Lead 就是调度器，少一个生命周期/并发/恢复责任。
- **先加 plan-gate**：真实 run 尚未出现 plan/task 漂移；先用 `task_id` 映射 + journal 纪律，
  出现漂移再加只读检查。
- **现在切 Fetch API**：5 页抽样全部带反斜杠转义（1.6%–11.1%），会污染逐字/表格证据。
- **用 UI 开关做 Search-only**：开关成对切 search+fetch；A0 用 profile `- id: web` 覆盖。
- **nested Team / 数值 floor / 图谱直接改 Team 板**：vendor 不支持 / 本仓已否决 / 绕过 Lead 权威。

## 实际跑过的验证

- `pnpm verify`：全绿（含 `cockpit-doc-registry`、`client-keys`、`pack-workspace-fresh`、
  `backlog-liveness`、`proposed-pointer-live`）。
- `pnpm test`：**620 pass / 0 fail**；`pnpm typecheck`：通过；pack client/host 构建通过。
- `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`：**ALL PASS**（4 preset 真挂载；
  `maxDepth: 2`/`allowedAgentPresets` 结构测试在场）。
- `node --import tsx/esm scripts/smoke/client-load-smoke.mjs`：**ALL PASS**（含「研究图谱」guide
  胶囊 + 空态渲染、active-row=绑定 session id；状态页签 agentTeam 改按 sessionId 取，切会话不再
  复用上一条 roster）。
- **受控 A0 run**（`research-workspace/_abandoned/drt_deepseek-v4-status/`，`MECHANISM-TEST.md`）：
  `plan.md` 四节点 N1 scout → N2 analyst（含 depth-2 worker）→ N3 lead 综合 → N4 critic；
  Team task `task-1..4` 用 `blocked_by` 串联；Lead 走 `wait_agent`/`team_task_list`/`reassign`；
  teammate `analyst-v4` 派 worker `a9d2f4d5…`：`delegationDepth=2`、`agentPreset=analyst`；
  critic `review.md` readiness PASS；HITL2 代理模拟；`present` + `update_goal complete`。
- **Search A/B**（5 query，Messages vs Search API）：平均 **6,004ms vs 986ms**；snippet/date
  **0/50 vs 50/50**；单 query URL 重叠 2/10；profile `- id: web` 经真实 loader `--dump-config`
  验证为替换行（非 insert）。
- **Fetch 5 页**：DS Fetch 全部为带反斜杠转义的 Markdown（1.6%–11.1%）；不替换 `http`。

## 已知限制与延后工作

- **pack 默认搜索**：本条已由 2026-10-27 的工作翻默认（search → `deepseek-search-api`，fetch 仍本地 `http`），见上；证据与残余 = [后续 Note](./2026-10-27-deepseek-search-api-retrieval.md)。
- **Fetch API**：不用于证据；工具级文本 A/B（含表格/重定向）待做。
- **plan gate**：MVP 不加；出现 plan/task 漂移再加只读结构检查或 company 式 dependencyDrift。
- **右栏 pane 会话绑定**：vendor pane 可能仍钉在上一会话（`docs/design/40 §6` 已登记）；
  收起/重开右栏可重绑，修复归 vendor。
- **teammate 工具面越权**：teammate 继承 Lead 组合（含 ask_user/present/goal），靠 prompt 纪律；
  worker 用 `agentPreset` 是精确的。
- **真实用户委托 run**：本卡只验证受控 3 节点机制；下一场真实研究 run 仍需观察 Lead 是否自然按
  plan/cell 调度。
