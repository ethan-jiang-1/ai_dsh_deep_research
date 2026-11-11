> 状态：implemented
>
> 历史注记：D45 的 “analyst 作 executor” 由 D47 改为 `research-wave` worker；D45 的
> `lens-fanout` 固定配方不变。

# Worker profiles：把 bounded 角色执行移出 Lead 克隆（D47）

## 决定

新增两个**非研究角色**的 worker profile，住 `packages/deep-research-pack/workers/`：

- `research-worker`：fs / fs-search / skill / todo / web；无 Team / goal / ask-user /
  present / subagent / workflow。一次性取证、写卡、检索的默认叶子。
- `research-wave`：叶子 + workflow engine/tool（4/8 caps、无后台）；同质 wave executor，
  child 继承此薄组合（因此不会再长成 analyst 克隆去递归 workflow/subagent）。

配套决定：

- **默认 worker**：Lead / Scout / Analyst 的 `tool-subagent` 设 `agentPreset:
  research-worker`，allowed 加 `research-worker` / `research-wave`（Lead 可显式派 wave；
  Scout/Analyst 不可派 wave）。省略 `agent_preset` 不再落 Lead 克隆。
- **路由矩阵**（`team-assembly`）：一次性 scout/analyst/claim → `subagent(agent_preset=…)`；
  多轮 critic 复审 / analyst 接力 → Team；同质 wave → `research-wave`；Team 只做协调镜像。
- **角色 skill 载体**：Lead 的 `customSkillDirs` 加 scout/analyst/critic 技能目录；worker/
  wave 也挂角色技能目录。teammate composeFrom Lead 后可用 `skill` 加载角色方法论，
  raw `read` 只作 fallback。
- **workflow 搬家**：从 `analyst.patch.yml` 移除；只留 `research-wave`。`wave-execution`
  skill 改称 research-wave 执行器；`research-planning` §5.6 / `team-assembly` 的 executor
  从 analyst 改为 research-wave。
- **研究角色仍是 4 个**（D2）；`workers/` 不计入 `presets/` 角色清单。D47 登记在
  [decisions](../../docs/decisions.md#d47)。

## 输掉的方案

- **只做合同纠偏、不加 worker**：G3/G4 仍靠文本；`workflow` 在所有 analyst 上可见，
  `c91d1525` 的 SHA 计算误用还会发生。不选。
- **砍 Team，全部走 subagent**：20 个 teammate 中 13 个多轮、critic 3–4 轮复审；会丢
  持久协作。不选。
- **给 `spawn_teammate` 加 preset / 自定义 provider**：需要 vendor seam 或第二引擎，
  违反“不发明”；复活条件 = DSH 给 `spawn_teammate` 加 `agentPreset`（2026-10-04 Note
  的搁置方案）。
- **第六个 preset 藏起来**：DSH 无 hidden 标志；选择器会显示。接受并命名清楚，不造
  client 过滤层。

## 实际跑过的验证

- `node dev/render-overlay.mjs`：overlay 含 workers；`overlay-fresh` 绿。
- `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`：5 角色 + 2 worker 真挂载
  ALL PASS；Lead 看见角色 skills；worker/wave 看见角色 skills；研究角色仍只看见自己的。
- `node scripts/smoke/release-smoke.mjs --install-only`：安装域 7 个 preset 全挂；
  `dsh plugin remove` 后无残留。
- `node scripts/smoke/l4-lite-smoke.mjs`：全角色响应 + scout 工具调用 ALL PASS。
- 真模型 `request/header`（production overlay）：
  - `research-worker` = edit/glob/grep/present/read/read_image/skill/todo_write/
    web_fetch/web_search/working_directory/write；无 ask/goal/team/spawn/subagent/workflow。
  - `research-wave` = 同上 + `workflow`；无 ask/goal/team/spawn/subagent。
  - `analyst`（L4 真会话）= `present` / `subagent`；**无 workflow**（SHA 误用的工具面
    已消失）。
- `SubagentPresetSelection` keyless 检查：`agentPreset: research-worker` 时
  `resolve({}) = research-worker`；无默认时仍继承父。
- `pnpm test`：1165 pass / 0 fail（含 `tests/pack/workers.test.mjs` 六条、
  `presets-wiring` 的 Lead 多技能例外、`presets.test` 的“研究角色不挂 workflow”）。
- `node scripts/dist/export-dist.mjs`：0.3.1 tarball 含 workers；`dist-tarball` 绿。

## 残余风险

- 两个 worker 会出现在用户选择器；产品命名已做，但 UI 是否要按 id 过滤是后续产品决定。
- `present` 是 host 层工具，worker 仍看得到；按手册“非 lead present = 过程稿”接受，
  preset 无法移除。
- workflow child 继承薄 executor 仍是机制事实 + 声明面；没有真模型 workflow child 的
  `request/header` 证据（本轮未跑 wave pilot）。
- `c91d1525` 的 SHA 误用根因是 provenance 合同；由
  [provenance-hash-contract](../../_backlog/_archived/settled_issues/2026-11-11-provenance-hash-contract.md)
  修，worker 只是把 workflow 从普通 analyst 上拿走。
