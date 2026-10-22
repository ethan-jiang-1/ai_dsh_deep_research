---
name: research-planning
description: HITL1 后设计研究执行图：W<wave>.<index> 节点、Wave 泳道、plan.md 节点表、Scan/Dive/Check cell、L0–L3 深度、Team 任务物化与调度重写
---

# research-planning — 执行图与调度

适用：HITL1 拍板后、组队/侦察前。目标 = 把 topic 图落成**可执行、可重写**的 DAG；主干 =
NODES 的研究流程（立项 → … → 交付），不因动态展开改写。执行图写 `drt_<slug>/plan.md`（lead
owner，过程件）；Team 任务板是当前会话的执行镜像。

## 0. 节点身份：W<wave>.<index>

- **Wave 是拓扑层**：`W2` = Wave 2（按 `deps` 最长路径算出的并行层）；**Wave 分组不是任务**，
  不挂 output/acceptance/task_id。
- **Wave 内的节点**：`W2.1/W2.2/W2.3` 是 Wave 2 的并行节点；单节点 Wave 也写 `W1.1`。
  `W2.1.1` 是 W2.1 的内部拆解，不升成新 Wave。
- **ID 前缀必须等于计算 Wave**：`W3.1` 若只依赖 Wave 1 节点，实际在 Wave 2 → `wave-prefix`
  红；必须重编号为 `W2.x`，并在重写记录写旧号别名（`W3.1 → W2.1`）。不静默保留旧前缀。
- **Wave 是计算值**：由 deps 算；不得手写 LAYER 表，plan 只写节点/deps。若为说明写层，标
  “示意/非权威”。UI 文案用 `WAVE`。
- **`stage` 派生**：由根节点 kind 派生（broad-scan→scan、deep-dive→dive、cross-check→check、
  synthesis→synthesis、review→review、gate→gate；未知=unknown）；子节点继承，不建独立列。
- **内部拆解**：`W2.1.1` 的 `parent` = `W2.1`；Wave 内的节点 `parent` 为空。父节点的
  deps/output/acceptance/反馈是外部契约，内部拆解不改它。
- **lifecycle**：`active`（默认）/ `retired` / `merged_into:W4.1` / `superseded_by:W7.1,W7.2`；
  墓碑留在表里供 `byId` 解析，但不进图；旧号不复用。`derived_from`/`moved_from` 写重写记录。
- **Team 平铺，不建 nested Team**：每个**节点**（W2.1）建一个平铺 task；Wave 分组不建 task。
  复合节点 W2.1 有内部拆解时用 rollup task（owner Lead），`blocked_by` = 外部依赖 task + 已建
  子任务；纯分析子步骤 plan-only。跨 Wave 的子依赖禁止——提升到父节点/顶层节点依赖。
- **深度**：展示 2 层，plan 最多 3 层（W2.1.1）；超过 `too-deep` 提示，不硬崩。
- `task_id` 只是当前会话映射，不作用户引用。canonical 反馈引用 = `drt_<slug>/W2.1`；
  chat `@W2.1` 是当前 run 简写；`W2` 可引用整层（无 task）。先读 plan 的 id 行，不按图中顺序猜；
  journal/question §Decisions 记 `node_id + plan_version`。
- **旧 N / 旧 flat W**：N 与旧 `W1/W2…`（无 `.index`）只读兼容；新 plan 用 `W<wave>.<index>`，
  不与旧形态混写。

## 1. 写 plan.md

节点表每行至少：`id / parent / lifecycle / kind / question / owner_role / deps / output /
acceptance / budget / depth / task_id`。

- `id`：`W<wave>.<index>`（如 `W2.1`）；Wave 由 deps 算，ID 前缀必须一致。
- `parent`：Wave 内顶层留空（`—`）；只有内部拆解写父节点 id（`W2.1.1` 的 parent = `W2.1`）。
- `lifecycle`：`active` 或墓碑值（见 §0）；墓碑保留可查、不画图。
- `kind`：`broad-scan` / `deep-dive` / `cross-check` / `synthesis` / `review` / `gate`；子节点
  可用 `search` / `fetch`，stage 继承根节点。
- `owner_role`：`lead` / `scout` / `analyst` / `critic`；一个节点一个 owner。
- `deps` 用节点 id（`W1.1` / `W2.1`），不是 topic id；图必须无环；跨 Wave 子依赖禁止。
- `output` 写 run bundle 相对路径；`acceptance` 写可判条件；`budget` 写最多 worker/搜索轮次。
- `depth` 写 L0–L3（见 §2），不是 Wave。
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

1. **每个节点 W2.1 建一个平铺 task**：subject `W2.1 · kind · 标题`；description 写读哪些文件/
   产出/验收/方法装载；`blocked_by` = deps 的 task 映射；`write_scopes` = output。Wave 分组
   `W2` 不建 task。
2. **复合节点 W2.1**（有 W2.1.1 等内部拆解）用 rollup task，owner Lead；`blocked_by` = 外部
   依赖 task + 已建子任务；子任务废弃先 `set_dependencies` 清依赖再 delete。
3. 把返回的 `task-N` 回填 plan 的 `task_id`，**回填后逐行核对**：每个节点要么有真实
   `task-N`，要么显式写 `plan-only`（内部拆解等不挂任务的节点）——**不留空白**。留空的节点在
   研究图谱上是「状态未知（未映射 task_id）」，既不是未执行也不是完成；恢复会话重建任务后旧
   `task_id` 会失效，按同一规则重绑。**task_id 只是当前会话映射**；canonical 引用始终是 `W2.1`。
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

- 加节点：未知子域 → scout；单源/冲突 → cross-check；证据缺口 → 定向补搜。新节点按
  `W<当前 Wave>.<下一个空号>`；不改旧号；不把 Wave 头当任务。
- 改边导致 Wave 变化：**重编号 + 别名**（`W2.1 → W3.2` 写重写记录）；`wave-prefix` 红必须消，
  不静默保留旧前缀。
- 拆节点：节点内部多个独立问题时，优先加 `W2.1.1/W2.1.2` 内部子号（parent 保留）；确实要拆
  多个对外结果时，新增 `W6.1/W6.2` 并写 `derived_from: W2.1`、旧节点做墓碑。
- 并节点：保留一个主号，另一个写 `merged_into: W4.1` 后墓碑；不复用旧号。
- 改边：`set_dependencies`；重派：`reassign`；完成：owner `complete`。
- 回边用**版本化节点**（`repair-r1` / `review-r2`）——这是 id 后缀而非 Wave 序号；不画环；
  复审 ≤3 轮。
- 每次重写更新 plan 的节点表 + `plan_version` + journal 一行；**scope 变更**（超出 question.md
  §Scope）回 HITL2，图内重写自主。用户点名 W 时，先读 plan 的 id 行；`W2` 是整层，
  `W2.1` 是节点；反馈记 `node_id + plan_version`。

## 7. 深度验收

- 每个 Dive 的 `解读` 节要有**深度记录**：claim → 一手链 / 独立来源 / 反例 query+结果 / 口径 /
  清单状态；没有就标“未取得，渠道…”，不静默。
- 每个 Scan 交稿要有**覆盖记录**：query 家族 / 检索器 / tier 分布 / 已排除 / 未覆盖子域。
- Critic 读两段记录；缺 = MAJOR，有记录但内容空 = 仍 MAJOR。**不发明数值 floor**；深度是结构化
  证据 + 语义审查，不是“≥N 源”打卡。
