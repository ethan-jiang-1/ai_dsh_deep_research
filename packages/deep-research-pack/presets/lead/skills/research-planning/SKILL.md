---
name: research-planning
description: HITL1 后设计研究执行图：plan.md 节点表、Scan/Dive/Check cell、L0–L3 深度、Team 任务物化与调度重写
---

# research-planning — 执行图与调度

适用：HITL1 拍板后、组队/侦察前。目标 = 把 topic 图落成**可执行、可重写**的 DAG；主干 =
NODES 的研究流程（立项 → … → 交付），不因动态展开改写。执行图写 `drt_<slug>/plan.md`（lead
owner，过程件）；Team 任务板是当前会话的执行镜像。

## 0. 节点身份：N 是 ID，不是序号

- **只分配、不重排、不回收**：已有 N 号永不改号；新增节点取下一个空号（N1–N10 之后是 N11），
  即使它在图上排在 N2 后面。排序按 `deps`/wave，不按编号大小。
- 顶层节点 = `N<k>`；**复合节点**在内部展开为 `N3.1 / N3.2`（再深 `N3.1.1`）。父节点 `N3`
  保留：外部依赖、`output`、`acceptance`、用户反馈都挂 `N3`；子节点只是内部执行/观察细节。
- 复合节点的子节点**默认不单独建 Team task**（不建 nested Team）：父节点一个任务，内部由该
  owner 自己做、或派 depth-2 worker；确实要拆成多个并行执行单元时，由 Lead 追加**新的顶层节点**
  （新号 + 新任务），不改旧号、不嵌套 Team。
- 拆分/合并/删除只做**墓碑**：`retired` / `merged_into: N4` / `derived_from: N3` /
  `superseded_by: [N11, N12]`；旧号不复用。用户仍能用旧号查到它变成了什么。
- `task_id` 只是当前会话执行映射，不是用户引用。反馈引用 = `run_slug/N3`（内部 `run_slug/N3.2`）。
- 重写时 `plan_version` 递增，重写记录写 `vN: 加了/拆了/并了哪个号`；用户点名 Nx 时先读
  plan 的 id 行，不按列表顺序猜；Nx 是复合节点时先问“指整体还是哪个子节点”，并在
  journal/question.md §Decisions 记 `node_id + plan_version`。

## 1. 写 plan.md

节点表每行至少：`id / parent / kind / question / owner_role / deps / output / acceptance / budget / depth / task_id`。

- `parent`：顶层留空（`—`）；复合节点的子节点写父节点 id（`N3`），父节点本身仍在表里。
- `kind`：`broad-scan`（宽搜）/ `deep-dive`（深搜）/ `cross-check`（交叉/反例）/ `synthesis` /
  `review` / `gate`（条件决策）。
- `owner_role`：`lead` / `scout` / `analyst` / `critic`；一个节点一个 owner。
- `deps` 用节点 id（`N1` / `N3.1`），不是 topic id；图必须无环。
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

1. **顶层节点 / 复合父节点**才建 Team task：subject `N1 · kind · 标题`；description 写读哪些文件/
   产出/验收/方法装载；`blocked_by` = 顶层 deps 映射；`write_scopes` = output 路径。子节点
   `N3.1…` 默认不建独立 Team task（内部由 owner 执行/派 depth-2 worker）。
2. 把返回的 `task-N` 回填 plan 的 `task_id`。**task_id 只是当前会话映射**；恢复时按 `N` 重建。
3. 把所有 ready 且无 owner 的 task `team_task_update action=reassign` 给 owner；owner 不在线就
   `send_message` 唤醒。

## 5. 调度循环（Lead 的常驻动作）

1. 建/改图后立即派发所有 ready 任务。
2. `wait_agent`（60–120s）；返回后 `team_task_list({ready:true})`。
3. 有新的 ready → 回到派发；没有 ready 但有 running → 回到等待；没有 ready 也没有 running →
   做 Lead 自己的 synthesis/收口。
4. teammate 失败/卡住 → `interrupt_agent` + `reassign`（或 reopen）；journal 记原因。
5. 交付前不结束回合、不问“要不要继续”、不汇报中间进度；只有 HITL1/HITL2 两个交互点。

## 6. 重写图（动态编排）

- 加节点：未知子域 → scout；单源/冲突 → cross-check；证据缺口 → 定向补搜。**取下一个空号**
  （N11），或作为复合父节点的子号（N3.3）；不改已有 N 号。
- 拆节点：节点内部有多个独立问题时，优先扩成**复合节点子图**（N3.1/N3.2，父节点 N3 保留，
  外部 output/acceptance 不变）；确实要拆成多个**对外结果**时，新增 N11/N12 并写
  `derived_from: N3`、`superseded_by: [N11, N12]`，N3 做墓碑。
- 并节点：保留一个主号，另一个写 `merged_into: N4` 后墓碑；不复用旧号。
- 改边：`set_dependencies`；重派：`reassign`；完成：owner `complete`。
- 回边用**版本化节点**（`repair-r1` / `review-r2`）——这是 id 后缀而非序号；不画环；复审 ≤3 轮。
- 每次重写更新 plan 的节点表 + `plan_version` + journal 一行；**scope 变更**（超出 question.md
  §Scope）回 HITL2，图内重写自主。用户点名 Nx 时，先读 plan 的 id 行；复合节点先确认整体/子节点，
  反馈记 `node_id + plan_version`。

## 7. 深度验收

- 每个 Dive 的 `解读` 节要有**深度记录**：claim → 一手链 / 独立来源 / 反例 query+结果 / 口径 /
  清单状态；没有就标“未取得，渠道…”，不静默。
- 每个 Scan 交稿要有**覆盖记录**：query 家族 / 检索器 / tier 分布 / 已排除 / 未覆盖子域。
- Critic 读两段记录；缺 = MAJOR，有记录但内容空 = 仍 MAJOR。**不发明数值 floor**；深度是结构化
  证据 + 语义审查，不是“≥N 源”打卡。
