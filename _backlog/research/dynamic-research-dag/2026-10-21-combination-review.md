---
topic: A0 组合决策 review
intent: 对用户已拍板的 A0 组合做一致性/风险/改动面评审，给出三处实施前修正、改动清单与验收标准，作为拆实施卡的依据。
---

# A0 组合决策 review（2026-10-21）

> 用户拍板：**按推荐组合走**；本 review 只查一致性/风险，不改代码。
> 对照面：D17 harness/run bundle、D3/D16 Agent Teams、NODES、研究手册、node-gate、
> design/40 驾驶舱、preset 合同、官方 Search/Fetch API 与 DSH provider 实测。
> 结论：**组合整体成立，但有三处必须在实施前修正**；其余是卫生项与验证项。

## 0. 评审结论

| # | 修正 | 为什么 |
|---|---|---|
| **F1** | **Search-only 不能靠 UI 开关**：UI 的“Use the new Web Search API”一次选中 `deepseek-search-api` + `deepseek-fetch-api`，是全有/全无；推荐组合要的是“Search API + 本地 http fetch”，必须用 `- id: web` 配置覆盖（profile trial / pack default 两步走） | UI 控制器把 search/fetch 成对写（`web-search-card-controller.ts:38-39`）；配置层可以混合 |
| **F2** | **`plan.md` 是 run-bundle 过程件，不是 NODES/schema-scan 交付门**：先加进研究手册目录约定 + owner 表 + 模板 + pack 种子；`NODES` 只加一行“lead 过程输出”，不改 `schema-scan`/`node-gate` | 否则老 run 全红，或 plan 变成第二个交付合同；MVP 不需要新门禁 |
| **F3** | **图谱页签是“依赖/worker/attention 视图”，不是任务 CRUD**：不与 `ui-agent-team` 任务板双 home；更新 `design/40` 的构成表与边界；仍只读 + “让 Lead 调整” | 驾驶舱正本说任务粒度归 `ui-agent-team`；新页签必须说清自己不是第二个任务板 |

**小修（同批做）：** 删除 preset 里已失效的 `backgroundMode: one-shot`；Depth Record 先落 Analyst skill/task 描述，不进 evidence frontmatter；L0–L3 映射 HITL1 现有“快慢/标准/深度”，不加新问；Search A/B 只是一 query，pack 默认前要 5–10 query；Fetch 仍不切。

## 1. 被批准的组合（review 的对象）

1. **编排**：A0 最小原生——`plan.md` + Team 任务板 + Lead 调度（`wait_agent` →
   `team_task_list({ready:true})` → `reassign`）+ 二层 worker（`maxDepth: 2` +
   `allowedAgentPresets`）；不引外部插件/workflow/第二套 store。
2. **深度**：Scan/Dive/Check cell + L0–L3；默认 L1、决策关键题 L2；每 topic 最多 2 轮加深。
3. **搜索**：`searchProvider: deepseek-search-api` + `fetchProvider: http`；pack 默认等真实 run。
4. **Fetch**：5–10 页 A/B 通过前不替换 `web-fetch-http`。
5. **观察面**：侧栏「研究图谱」先做任务板视图（`agentTeam`），plan 落地后再叠 depth/kind。
6. **Issue**：本卡伞卡 + 三张实施卡（编排/深度、侧栏图谱、搜索 provider）。

## 2. 一致性矩阵

| 面 | 现有合同 | 判定 | 需要的动作 |
|---|---|---|---|
| **D17 harness/run bundle** | harness 只读；run 变量全在 `drt_<slug>/`；Team 板是执行辅助 | **成立，需补家** | `plan.md` 进 handbook 目录约定 + owner 表 + 模板；Team 板仍是执行镜像；`task_id` 是会话映射 |
| **HITL1/HITL2** | 只有两个交互点；HITL1 有深度/篇幅与计划确认卡 | **成立** | plan 在 HITL1 后写；计划卡加“图骨架/波次”摘要；scope 变更仍回 HITL2 |
| **NODES/node-gate** | 八节点 I/O；交付门②③④+L+R+A 不动 | **成立，但 plan 不能变成新门** | NODES 只加“组队节点：lead 写 plan.md（过程件）”一行；`schema-scan`/`node-gate` 不改；后续 drift 再议 plan gate |
| **preset 自包含** | 角色要用的行必须自己声明；`tool-todo` 必填 config | **成立** | lead/scout/analyst 的 `tool-subagent` 加 `maxDepth: 2` + `allowedAgentPresets`；删除 `backgroundMode`；critic 保持无 subagent |
| **teammate 组合继承** | teammate composeFrom Lead，不能带自己的 preset | **已知限制，不阻塞** | 顶层 teammate 仍靠 prompt + skill 文件；二层 worker 用 `agentPreset` 精确组合；不承诺 nested Team |
| **Agent Teams 主通道** | 平面 roster、maxMembers 8、无自动派发 | **成立** | Lead 是调度器；`wait_agent` + re-list；不引自动派发 daemon |
| **驾驶舱 design/40** | 右栏三个页签；任务粒度归 `ui-agent-team`；工具卡只 2 张 | **需更新正本** | 新增「研究图谱」页签；写清“依赖/worker/attention 视图，不是任务 CRUD”；no direct Team mutation |
| **搜索 provider** | base 已挂 `web-deepseek-api`；默认 `deepseek-official`/`http`；UI 开关成对切 | **需修正 F1** | trial 用 profile `- id: web` 覆盖（search API + http）；pack 默认等 5–10 query A/B |
| **深度判据** | Scout/Analyst/Critic skill 已有 query 家族、≥2 独立、反例、口径、方法承诺 | **成立，需组织** | 加 Coverage Record / Depth Record（放现有 leads/解读节）；critic 读记录；不加新 evidence 字段/门禁 |
| **L0–L3** | HITL1 现有快答/标准/深度 | **成立** | 快答=L0、标准=L1、深度=L2；L3 = 用户明确要求或 critic 升级；不新增问卡 |
| **回边/审查** | critic FAIL→修复→复审 ≤3；补搜只一轮 | **成立** | 每 topic 加深 ≤2 轮；复审 ≤3；超界升级 HITL2；版本化节点，不画环 |
| **交付链** | final/review/decisions/present/audit 门不动 | **成立** | plan 不替代任何交付门；`present` 仍是唯一交付见证 |

## 3. 关键发现（按严重度）

### F1（必须修正）Search-only vs UI 全有/全无

- 设置页开关把 `searchProvider` 和 `fetchProvider` 成对写：
  `api` = `deepseek-search-api` + `deepseek-fetch-api`；`messages` = `deepseek-official` + `http`
  （`vendor/dsh/packages/client/ui-settings-web-search/src/client/web-search-card-controller.ts:38-39`）。
- 推荐组合要的是 **Search API + 本地 http fetch**（混合），UI 开关做不到。实施时二选一：
  - **profile 覆盖（trial）**：在 `runtime/harness-home/profiles/research/cordis.patch.yml` 加
    `- id: web` config（`boot-run.sh` 只改 MCP 块，不覆盖其他 patch 行；已在源码核过）；
  - **pack 覆盖（durable，等 A/B）**：在 `packages/deep-research-pack/cordis.patch.yml` 加同名
    `- id: web` config；这是替换 base 行 config，不是新增行。
- 若先用 UI 开关，就必须接受 **Search+Fetch 一起切**，并同时跑 Fetch 的 5–10 页 A/B；不能声称
  “只切 search”。
- **A/B 证据（一 query，10 vs 10）**：Messages 5.9s / 10 条 / 无 snippet+date；Search API
  1.55s / 10 条 / 有 snippet+date；URL 只重叠 2 条（stcn、xinhuanet）。Messages provider 源码
  没把 `maxResults` 传给请求（返回 10 条，忽略 maxResults=3）；Search API 尊重 `count`。
  → 支持“先切 Search”，但**不是质量结论**；pack 默认前跑 5–10 query。

### F2（必须修正）plan.md 的家与门

- `research-workspace/AGENTS.md` 的目录约定/owner 表没有 `plan.md`；`NODES.md` 八节点输出也没有；
  `schema-scan` 查的是 NODES 输出件。若把 `plan.md` 当 required，老 run 全红；若完全不管，它会腐烂。
- **MVP 处置**：
  - handbook 目录约定加 `plan.md`（owner: lead；过程件，不是交付凭证）；
  - owner 表加 lead 一行；
  - `templates/run/plan.md` + pack workspace 种子同步（`dev/sync-pack-workspace.mjs`；
    `pack-workspace-fresh` 把守）；
  - `NODES.md` 只在“组队”行加一句“lead 写 plan.md（过程件，不进门禁）”；`schema-scan`/
    `node-gate` 零改动；
  - 恢复时按 plan 的 `N` 节点重建 Team task，`task_id` 列更新；旧 `task-N` 不是持久身份。
- **后续**：若真实 run 出现 plan/task 漂移，再加只读 `plan-gate`（无环/RQ 覆盖/owner 合法）或
  company 式 `dependencyDrift`；不是 MVP 前置。

### F3（必须修正）图谱页签的边界

- `design/40` 明确：任务粒度归 `ui-agent-team`，驾驶舱工具卡只 2 张，团队观察由任务板承担。
  新页签必须定位为 **“依赖形状 + worker 层 + 异常注意力”**，不是第二个任务 CRUD 板。
- 数据面成立：`sidebar.right.pane.tab` 是 session-scoped keyed 槽；标准 props 含
  `useSession`/`useProjection`（session）与 `useSessions`/`useSessionStatus`（global）
  （`vendor/dsh/packages/client/ui-session/src/client/index.ts:158-185`）；`TeamAction` 已用
  `useSessions`/`useSessionStatus` 读 Lead 的 `agentTeam`。
- 交互边界：只读 + `remote.session.prompt` 给 Lead 发预填建议；**不直接** `reassign`/
  `complete`/`delete`。这与驾驶舱“观察面”定位一致。
- 必须同 diff 更新 `docs/design/40` 的构成表 + 页签区 + 限制；`client-keys` 门禁对新 key 逐处对账。

### F4（需组织）Depth Record 的家

- 现有 evidence 契约是七字段 frontmatter + 摘录/解读 + Question List；**没有** Depth Record 字段。
- MVP 不加 frontmatter 字段、不动 `evidence-audit`：Depth Record 放 Analyst 证据卡的 `解读` 节
  （claim → 一手链、独立来源、反例 query/结果、口径、清单状态）；Coverage Record 放 Scout 的
  `leads.md` 单元（query 家族/检索器/tier/负结果/未覆盖）。
- Critic 在 method commitment / 证据质量审查里读这两段；缺 = MAJOR。若将来要机械判，再加字段/
  gate，不在 MVP。

### F5（需验证）A/B 的边界

- 只跑了一个 query，不能得出“Search API 质量更好”；只能说“更快、带 snippet/date、尊重 count”。
- Messages 返回的 10 条里有一条 api-docs updates，Search API 的 10 条里有更多国际源；
  覆盖是**互补**，不是一方全面胜出。
- pack 默认前跑 5–10 个 query（含 `site:`/`lang:`/`after:`），记录延迟、条数、URL 重叠、
  snippet/date 可用率、失败率。

### F6（卫生）stale `backgroundMode`

- 三份 preset 的 `tool-subagent` 还带 `backgroundMode: one-shot`；当前 pin 的 Config 没有该字段
  （`tool-subagent/src/index.ts:90-98`），不报错也不生效。改 preset 时一并删除，别把它当护栏。

### F7（已知限制）teammate 工具面越权

- teammate 继承 Lead 组合，仍有 `ask_user`/`present`/`goal`；`maxDepth`/allowlist 只影响它派
  worker，不改变自身工具面。靠 prompt 纪律；worker 用 `agentPreset` 是精确的。不要为此引入 nested
  Team（vendor 不支持）。

### F8（恢复）task_id 是会话映射

- Team 板在 Lead session log；新 Lead 会话不会带旧 `task-N`。plan 的 `N` 节点是 canonical；
  恢复时按 `N` 重建 task 并更新 `task_id`，journal 记账。

### F9（Fetch）保真未过

- Fetch API 价格页 226–387 个反斜杠 / 3,250–4,055 字；provider 层同样；`statusCode=200`、
  URL=请求 URL、title 被丢弃。继续 `http`；5–10 页逐字/表格对照通过再议。

### F10（漂移）plan vs Team 板

- 双写会漂；MVP 用 `task_id` 映射 + journal + “重写图必须更新 plan”纪律；不加门禁。
- 出现真实漂移再加只读检查；不要提前造 gate。

## 4. 改动面清单（按工作流）

| 工作流 | 文件/面 | 备注 |
|---|---|---|
| **预设基础** | `presets/{lead,scout,analyst}.patch.yml`：`maxDepth: 2`、`allowedAgentPresets`、删 `backgroundMode` | 配置改动；L1 preset-smoke |
| **plan/深度** | `presets/lead/skills/team-assembly/SKILL.md`（或新 `research-planning` skill）；`research-workspace/templates/run/plan.md`；`research-workspace/AGENTS.md`；`NODES.md` 一行；`presets/lead/skills/research-brief/SKILL.md`；Scout/Analyst/Critic skill 各一段 | 大部分是文本；pack 种子同步 |
| **驾驶舱** | `src/client/keys.ts`、`src/client/index.ts`、`src/client/ResearchGraphTab.tsx`、`src/lib/plan-graph.ts` + 单测；`docs/design/40` | 纯函数 + 页签；`client-keys`/`client-load-smoke` |
| **搜索** | `runtime/harness-home/profiles/research/cordis.patch.yml`（trial）或 pack `cordis.patch.yml`（durable）；A/B 5–10 query | 配置；无新包 |
| **Fetch** | 无代码；5–10 页 A/B 记录 | 继续 `http` |
| **Issue** | 本卡 + 三张实施卡 | 验收标准见 §5 |

**不新增依赖**：`agentPreset`/`allowedAgentPresets`、`agentTeam`/`subagentCatalog`、`session.prompt`、
`workspaceFiles`、`web-deepseek-api` 都是现有 DSH 包；没有第三方库/图库/store。

## 5. 验收标准（拆卡用）

**编排/深度卡**
- L1 preset-smoke：三份 preset 真挂载，`maxDepth: 2` + `allowedAgentPresets` 生效，`backgroundMode`
  已删；critic 仍无 subagent。
- 一场 3 节点小 run：HITL1 后 `plan.md` 在场；Lead 建 Team task；ready 任务被 assign；一个
  teammate 用 `agent_preset=scout|analyst` 派 depth-2 worker；worker 结果回父；evidence/final 链
  完整；`node-gate` 不回归。
- 深度：单源 claim 触发 cross-check 节点；缺 Depth Record → critic MAJOR；每 topic 加深 ≤2 轮；
  L0–L3 与 HITL1 深度选择对得上。

**侧栏图谱卡**
- `plan-graph.ts` keyless 单测：分层/缺 blocker/环/attention/worker chips。
- `client-load-smoke`：合成 `agentTeam` 3 节点 + 1 队员 + 1 worker，页签渲染、attention 条、
  空态不炸；`client-keys` 对账；无新 RPC；不直接改 Team 板。
- 真浏览器：切会话/展开/点击节点/“让 Lead 调整”回执；不加真模型档。

**搜索 provider 卡**
- 5–10 query A/B（Messages vs Search API）：延迟、条数、URL 重叠、snippet/date 可用率、失败率。
- profile 覆盖 `- id: web`（search API + http）生效；`web_search` 工具走新 provider；key 不出现在
  日志/输出；429/失败有可读错误；可一键回退 Messages。
- pack 默认只在 A/B 通过且用户点头后加。

**Fetch A/B**
- 5–10 页（表格/中文/重定向）对照：反斜杠、表格、逐字、title/最终 URL；未通过则保持 `http`。

**全局**
- `pnpm verify` + `pnpm test` 全绿；L1/L2 按改动面跑；docs/design/40、pack README、NODES/handbook
  同 diff 更新；issue 归档/拆卡。

## 6. 实施顺序

1. **确认本 review 的三处修正**（F1/F2/F3），把 issue 结论倾向改为“现在做”。
2. **预设基础**（maxDepth/allowlist/删 backgroundMode）→ L1 preset-smoke。
3. **plan/深度**（模板 + handbook + skill + persona）→ keyless docs/gates + 小 run。
4. **侧栏图谱**（纯函数 → 页签 → client-load-smoke）→ 真浏览器观察。
5. **搜索**（profile 覆盖 + 5–10 query A/B）→ pack 默认决策。
6. **Fetch**（5–10 页 A/B）→ 保持 http 或切换。
7. **真实 run + 文档/issue 收口**。

## 7. 证据

- 机制：[DSH 原生机制盘点](./2026-10-21-dsh-orchestration-primitives.md)。
- 生态：[DSH 插件生态与外部实践](./2026-10-21-dsh-plugin-dag-practices.md)。
- 深度：[宽搜/深搜研究单元](./2026-10-21-breadth-depth-research-cells.md)。
- 搜索：[DeepSeek Search/Fetch API + provider](./2026-10-21-deepseek-search-fetch-api.md)。
- 观察面：[侧栏研究图谱](./2026-10-21-cockpit-plan-graph.md)。
- 本次 A/B：Messages provider 5.9s/10 无 snippet+date；Search API 1.55s/10 有 snippet+date；
  URL 重叠 2；Messages provider 源码未传 `maxResults`。
