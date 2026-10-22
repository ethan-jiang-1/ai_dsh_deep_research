---
name: research-planning
description: HITL1 后设计研究执行图：W 工作包/LAYER/stage、plan.md 节点表、Scan/Dive/Check cell、L0–L3 深度、Team 任务物化与调度重写
---

# research-planning — 执行图与调度

适用：HITL1 拍板后、组队/侦察前。目标 = 把 topic 图落成**可执行、可重写**的 DAG；主干 =
NODES 的研究流程（立项 → … → 交付），不因动态展开改写。执行图写 `drt_<slug>/plan.md`（lead
owner，过程件）；Team 任务板是当前会话的执行镜像。

## 0. 节点身份：W 是 ID，不是序号

- **W 是稳定工作包**：顶层 `W1/W2…`，子工作 `W1.1/W1.2`，再深 `W1.1.1`。只分配、不重排、
  不回收；新顶层取下一个空号（W6），即使它画在 W1 旁。排序按 `deps`，不按 W 大小。
- **LAYER 是计算层**：按 deps 最长路径算出的并行层，只用于布局/排序；文档和 UI 写
  `LAYER n` / 第 n 层，不写进 W id。`depth` 列的 L0–L3 是研究深度，不是 LAYER。
- **stage 派生**：由根 W 的 kind 派生（broad-scan→scan、deep-dive→dive、cross-check→check、
  synthesis→synthesis、review→review、gate→gate；未知=unknown）；子 W 继承父 stage，
  不建独立 stage 列。
- **LAYER 不手写进 plan**：层由图按 deps 计算；plan 只写 W/deps。若为说明写层，必须标“示意/非权威”，
  不得让手写层与图争同一事实。
- **父 W 是外部契约**：W3 的 deps/output/acceptance/用户反馈固定；W3.1/W3.2 只是内部拆解。
- **lifecycle**：`active`（默认）/ `retired` / `merged_into:W4` / `superseded_by:W7,W8`；
  墓碑留在表里供 `byId` 解析，但不进图；旧号不复用。`derived_from`/`moved_from` 写重写记录。
- **Team 平铺，不建 nested Team**：每个顶层 W 建一个平铺 task（叶子=普通 task；复合 W=rollup
  task，owner Lead）；有独立 owner/交付物的子 W 才建平铺 task（subject `W3.1 · …`），纯分析
  子步骤 plan-only。rollup 的 `blocked_by` = 外部依赖 task + 已建子任务；子任务废弃先
  `set_dependencies` 清边再 delete。**跨组子依赖禁止**——提升到父 W 依赖或拆新顶层 W。
- **深度**：展示 2 层，plan 最多 3 层（W1.1.1）；超过写 `too-deep` 提示，不硬崩。
- `task_id` 只是当前会话执行映射，不作用户引用。canonical 反馈引用 = `drt_<slug>/W3.1`；
  chat 里的 `@W3.1` 是当前 run 简写。用户点名 W 时先读 plan 的 id 行，不按列表顺序猜；
  复合 W 先问“整体还是子节点”，journal/question §Decisions 记 `node_id + plan_version`。
- **旧 N plan**：只读兼容，不迁移；新 plan 用 W，不在同一 plan 混 W/N。

## 1. 写 plan.md

节点表每行至少：`id / parent / lifecycle / kind / question / owner_role / deps / output /
acceptance / budget / depth / task_id`。

- `parent`：顶层留空（`—`）；复合节点的子节点写父节点 id（`W3`），父节点本身仍在表里。
- `lifecycle`：`active` 或墓碑值（见 §0）；墓碑保留可查、不画图。
- `kind`：`broad-scan`（宽搜）/ `deep-dive`（深搜）/ `cross-check`（交叉/反例）/ `synthesis` /
  `review` / `gate`（条件决策）；子节点可用 `search` / `fetch` 等，stage 继承根 W。
- `owner_role`：`lead` / `scout` / `analyst` / `critic`；一个节点一个 owner。
- `deps` 用节点 id（`W1` / `W3.1`），不是 topic id；图必须无环；跨组子 dep 禁止。
- `output` 写 run bundle 相对路径；`acceptance` 写可判条件；`budget` 写最多 worker/搜索轮次。
- `depth` 写 L0–L3（见 §2）。
- 先覆盖 `question.md` 的每个 RQ：每个 RQ 至少一个证据生产节点 + 终局 synthesis/review。
- 编制先验 = `team-assembly` 矩阵 + `question-patterns` 分派结论；**它们是默认，不是判决**——按
  问题形状偏离时在 plan 的“重写记录”/journal 写一句理由。
- 预算：顶层节点 ≤12、关键路径 ≤6、每 topic 加深 ≤2 轮；超了就拆/合并/问用户，不硬堆。

## 2. 深度档 L0–L3

| 档 | 图 | 适用 |
|---|---|---|
| L0 快答 | 轻 Scan → 单点 Dive → 轻量 Critic | quick_factual |
| L1 标准 | Scan → Dive → Cross-check → Critic | 全景/对比默认 |
| L2 深挖 | Scan → Dive → 反例 → Targeted Scan → 二次 Dive → Cross-check → Critic | 决策关键、单源/矛盾/未知子域 |
| L3 穷尽 | 多波 Scan + 多 Dive + 对抗审查 + gap 台账 | 尽调/争议题，用户明确要求 |

映射 HITL1：快答=L0、标准=L1、深度=L2；L3 只在用户明确要求或 critic 升级时用。
L2 触发（任一）：关键 claim 单源/只有二手、口径缺失、矛盾、子域空白、时效可能过期、critic 发现
方法要求未兑现。

## 3. Cell：宽搜/深搜/审查的最小单元

- **Scan**：query 家族（同义/语言/视角）→ 来源矩阵（官方/二手/行业/社区）→ 覆盖/负结果对账
  → `leads.md`。宽搜加深 = 覆盖谱系，不是多翻页。
- **Dive**：question-list → 证据（一手/逐字/口径）→ 交叉验证（≥2 独立或显式单源）→ 反例 →
  清单闭合 → `evidence/*.md`。深搜加深 = 证据链，不是多抓页。
- **Check**：critic 三线审查 → `review.md`；readiness PASS 才进 HITL2。
- 一个 topic 至少 Scan + Dive + Check；简单题可退化。cell 内步骤可由 owner 自己做，也可派
  depth-2 worker；worker 必须带 `agent_preset`（scout/analyst/critic），结果回父级，由 owner 写
  evidence。**不建 nested Team**；需要另一个 owner 就找 Lead 加 teammate（≤8）。

## 4. 物化到 Team

1. **每个顶层 W 建一个平铺 task**：叶子 W = 普通 task；复合 W = rollup task（subject `W3 · …
   · rollup`，owner Lead）。`blocked_by` = 外部依赖 task + 已建子任务；`write_scopes` = output。
2. **有独立 owner/交付物的子 W** 才另建平铺 task（subject `W3.1 · …`）；纯分析子步骤 plan-only，
   不为了层级而建任务。子任务废弃先 `set_dependencies` 清依赖再 delete。
3. 把返回的 `task-N` 回填 plan 的 `task_id`。**task_id 只是当前会话映射**；恢复时按 W 重建。
4. 把所有 ready 且无 owner 的 task `team_task_update action=reassign` 给 owner；owner 不在线就
   `send_message` 唤醒。

## 5. 调度循环（Lead 的常驻动作）

1. 建/改图后立即派发所有 ready 任务。
2. `wait_agent`（60–120s）；返回后 `team_task_list({ready:true})`。
3. 有新的 ready → 回到派发；没有 ready 但有 running → 回到等待；没有 ready 也没有 running →
   做 Lead 自己的 synthesis/收口。
4. teammate 失败/卡住 → `interrupt_agent` + `reassign`（或 reopen）；journal 记原因。
5. 交付前不结束回合、不问“要不要继续”、不汇报中间进度；只有 HITL1/HITL2 两个交互点。

## 6. 重写图（动态编排）

- 加 W：未知子域 → scout；单源/冲突 → cross-check；证据缺口 → 定向补搜。**取下一个空号**
  （W6），或作为复合父节点的子号（W3.3）；不改已有 W 号。
- 拆 W：节点内部有多个独立问题时，优先扩成**复合节点子图**（W3.1/W3.2，父 W3 保留，
  外部 output/acceptance 不变）；确实要拆成多个**对外结果**时，新增 W7/W8 并写
  `derived_from: W3`、父 W `superseded_by: [W7, W8]` 后墓碑。
- 并 W：保留一个主号，另一个写 `merged_into: W4` 后墓碑；不复用旧号。
- 改边：`set_dependencies`；重派：`reassign`；完成：owner `complete`。
- 回边用**版本化节点**（`repair-r1` / `review-r2`）——这是 id 后缀而非序号；不画环；复审 ≤3 轮。
- 每次重写更新 plan 的节点表 + `plan_version` + journal 一行；**scope 变更**（超出 question.md
  §Scope）回 HITL2，图内重写自主。用户点名 W 时，先读 plan 的 id 行；复合节点先确认整体/子节点，
  反馈记 `node_id + plan_version`。

## 7. 深度验收

- 每个 Dive 的 `解读` 节要有**深度记录**：claim → 一手链 / 独立来源 / 反例 query+结果 / 口径 /
  清单状态；没有就标“未取得，渠道…”，不静默。
- 每个 Scan 交稿要有**覆盖记录**：query 家族 / 检索器 / tier 分布 / 已排除 / 未覆盖子域。
- Critic 读两段记录；缺 = MAJOR，有记录但内容空 = 仍 MAJOR。**不发明数值 floor**；深度是结构化
  证据 + 语义审查，不是“≥N 源”打卡。
