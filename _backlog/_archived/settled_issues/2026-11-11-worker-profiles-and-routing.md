---
status: 已结
opened: 2026-11-11
---

# Worker/wave executor profiles：把 bounded 角色执行移出 Lead 克隆

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 结论：implemented — Worker profiles（research-worker / research-wave）+ 默认 + 路由矩阵 + 角色 skill 载体落地（D47）；L1/L2/L4 与真模型工具面绿。
> 去向：implemented — notes/implemented/2026-11-11-worker-profiles.md

**问题与期望结果：** 本仓把 Team 当多角色主通道，但 DSH 的 teammate 只能 composeFrom
Lead；scout/analyst/critic 的角色 preset 只在 `subagent(agent_preset=…)` 上生效。于是：
（a）一次性角色工作也在 Lead 克隆上跑；（b）`workflow` 挂在所有 analyst 上，普通
analyst 能看到它；（c）`agent_preset` 省略默认继承 Lead；（d）角色 skill 不在 teammate
技能目录，靠 raw read 绝对路径。期望结果 = 一次性角色工作走薄 worker/wave profile，
Team 只保留多轮协调，workflow 只在 wave executor 上，角色 skill 走原生 `skill` 载体，
省略 `agent_preset` 不再落 Lead 克隆。

**当前情况：**

- Phase 1：20 个 teammate 中 7 个一轮、13 个多轮；53 个角色 child 全部一轮；critic
  3–4 轮复审是真实多轮，因此 **Team 不能整体砍**。
- Phase 1：`c91d1525`（quick_factual analyst child）把 `workflow` 当 SHA-256 计算沙箱
  （`meta.name=sha256-slice`，"no agents spawned; pure JS hashing"），未授权且
  `sandbox-unavailable`；证明 workflow 在普通 analyst 上可见会被当计算器。
- Phase 2：临时 overlay 的 `research-worker` / `research-wave` 均 mount 成功；
  `skills/list` 可见 `evidence-extraction` / `adversarial-review` / `claim-verdict` /
  `wave-execution`，看不见 lead 的 `team-assembly`；两个角色 skill 目录挂进
  `customSkillDirs` 可行；技能长度 2518–5019 < 8192。
- Phase 3：真模型 `request/header` 证明 `research-worker` 实际工具面无
  ask/goal/team/spawn/subagent/workflow；`research-wave` 只多一个 `workflow`；两者都
  仍带 host 层 `present` / `working_directory`（preset 无法移除）。
- 机制：`SubagentPresetSelection` 配 `agentPreset: research-worker` 后，省略
  `agent_preset` 解析为 worker；无默认时仍继承父。

**未决问题（RFC 要拍）：**

1. 第六个 preset 会出现在用户选择器（DSH 无 hidden 标志）：接受并命名
   “Research Worker / Research Wave Executor”，还是只在安装域启用、不进产品 roster？
2. Lead 的 `agentPreset` 默认选谁：`research-worker`（安全叶子）还是某个角色；
   省略语义从“Lead 克隆”改为“worker”是否可接受？
3. `present` 的 host 层穿透是否要在 worker 上处理：按手册“非 lead = 过程稿”接受，
   还是 host 层 scoping/disable？
4. 路由矩阵的边界：scout 一轮默认走 worker；analyst 由任务形状决定；critic 多轮留
   Team、claim 级走 critic preset——是否与 D2“多角色 + agent team”冲突，需要 D 号还是
   D2 修订？

**下一步：** 先在本题 research 目录写一份 decision 草案（四问的方案与取舍），
交由用户/阶段边界评审；评审通过后按 §验收标准实施，交付时写
`notes/implemented/2026-11-11-worker-profiles.md`。

## 已知与未决

- 已知：worker/wave 两个 preset 的声明面和 mount 面已过；实际工具面已用真模型
  `request/header` 验证；角色 skill 目录挂载已用 `skills/list` 验证。
- 已知：Team 多轮协作有真实价值；本卡不删 Team，只把 bounded 执行路由到 worker。
- 未决：六号 preset 的产品可见性、默认值、`present` 穿透、D2 是否需要修订。
- 未决：workflow child 继承薄 executor 仍是机制事实 + 声明面，没有真模型 workflow
  child 的 `request/header` 证据；RFC 的 pilot 要补。

## 方案与取舍

**方案 A（推荐）· 两个非研究角色 worker profile + 路由矩阵**

1. 新增 `research-worker`（叶子：fs / fs-search / skill / todo / web /
   agent-instructions；无 ask/goal/present/team/spawn/subagent/workflow）与
   `research-wave`（叶子 + workflow engine/tool，`maxConcurrentAgents: 4`、
   `maxTotalAgents: 8`、无后台）。
2. 两个 preset 的 `skill-filesystem.customSkillDirs` 加
   `presets/analyst/skills` + `presets/critic/skills`；Lead 也加这些目录，让 teammate
   能用 `skill` 而不是 raw read（G5）。
3. Lead 的 `tool-subagent` 设 `agentPreset: research-worker`；角色任务显式传
   `agent_preset=scout/analyst/critic`。
4. `team-assembly` 写路由矩阵：
   - 一次性 scout 宽搜 / analyst 单批取证 / claim 级复核 → `subagent(agent_preset=…)`；
   - 多轮 critic 复审 / analyst 补搜（需要上下文）→ Team；
   - 同质 wave → Lead 派 `research-wave` executor；
   - Team 任务板仍只做镜像，plan 仍 canonical。
5. 更新 `design/10` / `design/20` / D2 角色口径：研究角色仍是四个；worker 是
   worker profile，不是第五个研究角色；roster/UI/tests 按此区分。

**方案 B · 只做合同，不加 preset**：成本最低，但 G3/G4/G5 只能靠文本；`workflow` 仍
在普通 analyst 上可见，SHA 误用还会发生。不推荐作为终点，可作 A 的过渡。

**方案 C · 砍 Team，全部走 subagent**：能让角色边界变成机器边界，但 13/20 多轮
teammate、critic R2/R3 复审会失去持久会话；与 D2 冲突。不推荐。

**方案 D · 给 Team 自定义 provider/扩展**：让 `spawn_teammate` 按名挂 preset——需要
vendor seam 或自造第二引擎，违反“不发明”；不选（复活条件 = DSH 给
`spawn_teammate` 加 `agentPreset`）。

## 验收标准

1. `research-worker` / `research-wave` 在源码 overlay 与安装域 profile 都能
   `session/create`；`agentPresets/list` 无 `broken`；README/roster/测试同步。
2. 真模型 `request/header` 证明：worker 无 ask/goal/present/team/spawn/subagent/
   workflow；wave 只有 workflow；`present` 的 host 穿透有明确处置（接受并文档化，或
   host 层 scoping）。
3. Lead `agentPreset` 默认 = `research-worker`；省略 `agent_preset` 的子会话
   `agentPreset` 是 worker，不是 Lead；显式 scout/analyst/critic 仍正常。
4. `skills/list` 在 worker/wave/Lead 会话可见角色技能；`skill` 加载
   `evidence-extraction` / `adversarial-review` 成功；当前长度下无 8192 截断。
5. `team-assembly` 有路由矩阵；`research-planning` 的 wave 节指向
   `research-wave`；`design/10` / `design/20` / D2 口径同步；D 号/决定登记。
6. Pilot（一场真 run 或等价 fixture）：至少一个一次性 scout/analyst 任务走
   worker preset，至少一个多轮 critic 留 Team；plan/task board/cockpit 不破；
   workflow 只由 `research-wave` 调用。
7. `pnpm verify` 全绿；`pnpm test` 相关测试绿；安装域 `preset-smoke` / `l4-lite`
   按改动面跑；Note/RFC 同变更。

## 关闭条件

- 上述 1–7 全绿；RFC 成立（`proposed` → `implemented` 或拒绝后回退）；卡与 RFC/Note
  同变更归档。
- 若六号 preset 的产品可见性无法接受：回退到“只做合同 + 保留 analyst 内的
  workflow”并明确登记为接受限制；卡转 `已结` 并指向 triggers。

## 证据

- [Phase 1 会话证据](../research/orchestration-alignment/2026-11-11-session-evidence.md)
- [Phase 2 组合证据](../research/orchestration-alignment/2026-11-11-composition-evidence.md)
- [Phase 3 行为证据](../research/orchestration-alignment/2026-11-11-behavior-evidence.md)
- 原型 = [worker.overlay.yml](../research/orchestration-alignment/prototypes/worker.overlay.yml)
- [研究总材料](../research/orchestration-alignment/2026-11-11-orchestration-alignment.md)
