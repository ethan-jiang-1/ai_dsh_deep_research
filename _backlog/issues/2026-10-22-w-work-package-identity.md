---
status: 推敲中
opened: 2026-10-22
---

# 推敲：研究图谱的 W 工作包命名与 L 拓扑层

> 立卡：2026-10-22 ｜ 状态：推敲中 ｜ 类型：设计 ｜ 结论倾向：现在做（先确认 W/L/执行语义；模板/skill/UI 后续落） ｜ 可关闭：否
>
> 用户 2026-10-22 定调：Nx 不够好；希望用 `W1 / W1.1 / W1.1.1`，动态编排更灵活、反馈更好指。
> 本卡当前是**设计评审稿**，不是实施授权；用户与第二个 reviewer 先审。

## 1. 背景：现在已经有什么

2026-10-21 的 A0 已落地，当前实现事实（不是提案）：

- `plan.md` 节点表已有 `id / parent / kind / question / owner_role / deps / output / acceptance /
  budget / depth / task_id`；`id` 目前以 `N1…N10` 命名，`parent` 已用于复合节点。
- `src/lib/plan-graph.ts`：`planIndex` 解析节点表，`planIssuesOf` 报重号/悬空 parent/deps；`levelsOf`
  按最长路径算层。
- `src/client/ResearchGraphTab.tsx`：默认画**顶层**节点；复合子节点收在父节点详情（图上标 `+N`）；
  节点可复制 `drt_<slug>/N3`；无 plan/无依赖边时诚实降级。
- 图表行当前叫 `WAVE n`，但它是 `levelsOf` 的**计算拓扑层**，不是稳定身份。
- `research-planning` skill、plan 模板、研究手册已有“N 是 ID 不是序号；只分配/不重排/不回收”
  纪律；但前缀仍是 N。
- DSH Agent Teams 是**平铺 DAG**：`blocked_by` 是边，Team 任务没有 parent 字段，也没有 nested
  Team；`task_id` 是当前会话映射，重派/rerun 会变。
- 已有真实 A0 run：`research-workspace/_abandoned/drt_deepseek-v4-status/`，plan 为 N1–N4；
  本卡不要求改写它。

**所以本卡不是从零设计 DAG，而是把“稳定 ID + 复合层级”的前缀从 N 演进为 W，并处理 W 与
现有拓扑层 `WAVE` 的概念冲突。**

## 2. 术语（先消歧，否则 W 会重蹈 N 的覆辙）

| 词 | 含义 | 是否稳定 | 谁拥有 |
|---|---|---|---|
| W（工作包/批次） | 用户可见的工作分组；顶层 W1、子 W1.1、再深 W1.1.1 | **稳定**，只分配不重排 | plan.md |
| L（Layer/拓扑层） | 按 deps 最长路径算出的并行层；只用于布局/排序 | 计算值，会变 | `levelsOf/wavesOf` |
| stage | 研究流程标签：scan / dive / check / synthesis / review（可扩） | 标签稳定，不是身份 | plan.md |
| task_id | 当前会话 Team 任务映射 | 会话级，会变 | Team 板 |
| status/owner | 执行态/负责人 | 执行态，会变 | `agentTeam` 投影 |
| plan_version | 计划重写版本 | 随重写递增 | plan.md |

**W 不表示“第几个 Wave”**。如果 W 跟 L 绑定，插入依赖就会让 W1.1 漂成 W2.1，反馈再次失效。

## 3. 问题

当前 plan 用 `N1…N10` 做节点 id，图谱又用 `WAVE n` 做**按依赖算出的拓扑层**，两套概念混在一起：

- 用户想指“这一步”时，没有稳定的层级名；`N4` 在图上可能和 Wave 2 并列，反馈不好说。
- 如果直接把 W 当拓扑波次，插入/改依赖会让节点从 W1.1 漂到 W2.1——W 又变成会变的序号，
  重蹈 N 的问题。
- DSH Agent Teams 是平铺 DAG；层级不能硬塞进 Team 任务板，否则会出现“plan 是树、Team 是平铺”
  的第二套结构。
- 用户要“W 数量随便编排”，同时“最大流程不变”；需要一个稳定的 W 树 + 独立 stage 标签。

## 4. 提议（待拍板）

**W = 稳定的工作包/工作流组；L = 计算出的拓扑层；stage = 固定研究流程标签。**

- 顶层 `W1/W2/W3…`，子工作 `W1.1/W1.2`，更深 `W1.1.1`。父 W 固定，子 W 可增删。
- `W` 编号**只分配、不重排、不回收**；新工作包取下一个空号；排序/画图按 deps，不按 W 大小。
- `stage` 独立一列，承载“最大流程不变”；W 数量可自由编排。
- 图上的行标签从 `WAVE` 改为 `LAYER`/并行层；层是计算值，不是身份。
- 用户反馈引用 `drt_<slug>/W2.1`；Lead 先读 plan 的 W 行，不按图中顺序猜。父 W 的
  output/acceptance/反馈固定，子 W 只是内部拆解。
- `task_id` 仍只是当前会话 Team 映射，不作引用；**有执行任务的 W 与 Team task 一对一，纯 plan 子步骤可不建 task**，见 §6。

示例（W 树 + 计算 L 是两件事）：

```text
W1 宽搜（stage=scan）
  W1.1 官方域扫描
  W1.2 二手域扫描
W2 深挖（stage=dive）
  W2.1 官方页逐字
    W2.1.1 价格页
    W2.1.2 文档页
W3 交叉核查（stage=check）
W4 综合（stage=synthesis）
W5 审查（stage=review）
```

若 W2.1 新加一个依赖，图上的 L 可能从 L1 变 L2；**W2.1 这个字符串不变**。这正是 W 与 L 必须
分开的原因。

目标节点表（新 plan；`plan_version` 在文件头/重写记录，不塞进每行）：

| id | parent | stage | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 | — | scan | broad-scan | … | scout | — | leads.md | … | … | L1 | task-1 |
| W1.1 | W1 | scan | search | 官方域定位 | scout | — | leads 片段 | 官方 URL | 1 次 | L1 | |
| W2 | — | dive | deep-dive | … | analyst | W1 | evidence/… | … | … | L2 | task-2 |
| W2.1 | W2 | dive | fetch | 逐字摘录 | analyst | — | evidence/… | 七字段 | 1 次 | L2 | task-3 |

`stage` 是标签，不是编号；`depth` 列 = 研究深度 L0–L3，**不是**拓扑层 L；拓扑层不落表，由 graph 计算；`task_id` 可空（plan-only 子步骤）。

## 5. 编号纪律

- 顶层 W 分配一次；已有 W1–W5，新加 W6，即使它画在 W1 旁。
- 子号在父下分配；删了做墓碑（`retired` / `merged_into` / `superseded_by`），不把旧号给新节点。
- 拆分对外结果：父 W 保留或写 `superseded_by: [W7,W8]` + 新 W 的 `derived_from: W2`；不悄悄
  把 W2 改成 W3。
- 换父/改名：保留旧号 + `moved_from` / `renamed_from`，或新建 `derived_from`；不静默换前缀。
- `plan_version` + 重写记录继续保留；**旧号不复用**是硬规则。
- 允许 W 号不连续、在表里不按数字顺序出现；表/图按 stage 或 deps/wave 排，不按 W 大小排。

## 6. 执行映射（Agent Teams 平铺，不能有 nested Team）

这一节是最需要 reviewer 拍板的：**复合 W 在 Team 板上到底长什么样？**

候选形态：

- **A. 只给叶子 W 建任务**：复合 W（如 W2）不建 Team task，只做 plan 分组；子 W2.1/W2.2 各建
  平铺 task；父 W 的 output/acceptance 归 Lead 的综合/审查任务。Team 板只看到叶子任务。
- **B. rollup 任务（推荐候选）**：**每个顶层 W 建一个平铺任务**（叶子 W = 普通 task；复合 W =
  rollup task，subject `W2 · …`，owner Lead）。**有独立 owner/交付物的子 W** 各建平铺 task；
  纯分析子步骤可以 plan-only 不建 task。rollup 的 `blocked_by` = 已建子任务（若有），Lead 在
  子任务完成后 claim/complete；Team 仍是平铺 DAG，父子关系由 plan + `blocked_by` 表达。
- **C. 复合 W 一个任务**：复合 W 只建一个 task，owner 的 teammate 在内部用子 plan/worker 完成；
  子 W 不建 Team task。执行简单，但 Team 板看不到子层进度。

本卡推荐 **B**：它保留“每个 W 可观察”的 UX，又不发明 nested Team；代价是复合 W 多一个 rollup
任务。若 reviewer 认为 rollup 任务污染 Team 板，可退回 A。**C 不推荐**用于需要子层反馈的场景。

约束：

- 子 W 默认只做 plan/观察层；只有确需另一个 owner 并行/独立交付物时才建平铺 task（subject 写 `W1.1 · …`）；此时它按“有 task 的 W”一对一。
- 父 W 的外部依赖在 plan 顶层；子 W 的依赖默认只在同父内。**跨组子依赖**（W1.1 依赖 W2.1）
  需要显式规则：要么提升为父级 W 依赖，要么允许并在图上画跨组边；本卡倾向“提升到父级”，
  避免图层爆炸。待拍板。
- `task_id` 可以出现在叶子/rollup 任务上；**用户永远引用 W，不引用 task_id**。

## 7. DSH 映射

- `plan.md` = W 树 + `stage` + `deps` + output/acceptance；是 canonical 过程件。
- `agentTeam` = 平铺任务（`task_id` 映射 W）+ 状态/owner；`blocked_by` 是执行边。
- `subagentCatalog` = 每个 owner 的 depth-2 worker；复合 W 内部由 owner/worker 做。
- `levelsOf/wavesOf` 只算 L 层用于布局，**不再参与 ID**；子 W 不建 nested Team。
- 若子工作确需另一个 owner 并行：Lead 建平铺 Team task（subject 写 `W1.1 · …`），plan 保留
  parent；Team 不知道层级，plan 知道。
- 不引 workflow/第二 store/外部 DAG runtime；W 树是 plan 文档结构，不是新服务。

## 8. 图与反馈 UX

- 顶层只画 W1…Wn，复合 W 标 `内部 N`/`+N`；展开看 W1.1/W1.1.1；每个 W 可复制
  `drt_<slug>/W2.1`（只复制，不发送）。
- 行标签：`LAYER 1 · 3 个并行`，不是 `WAVE`；W 组内子层用缩进/组内 L 标注，不混用全局 L。
- 节点详情显示 `W id / stage / owner / deps / output / acceptance / task / plan_version`。
- 反馈：用户在 chat 写 `@W2.1 …`；Lead 读 plan；复合 W 先确认“整体还是子节点”；记
  `node_id + plan_version` 到 journal/question §Decisions；拆分/合并用墓碑/`derived_from`。
- 空态：无 plan/无依赖边仍诚实说“没有可画的 DAG”，不画假 Wave。

## 9. 兼容与迁移

- 新 plan 用 W；旧 plan 的 N 原样保留为 legacy（只读也能画），不强制迁移。
- 解析器接受任意稳定 id；`parent/deps` 按新规则；`planIssuesOf` 增加 W 层级校验。
- 同一 plan 不建议混 W/N；若混，报结构提示，不自动改写。
- 模板、`research-planning` skill、研究手册同步；已有 A0 run 不改写。
- 新 run 何时开始默认 W：由模板/skill 版本决定；旧 run 不追溯。

## 10. 风险与取舍

- **W 号不连续/不按顺序**：用户可能期待 W1 在 W2 前；缓解 = stage 徽标、搜索、复制引用、图按
  deps 排；不能为了顺序重排编号。
- **W 与 Wave 混淆**：UI 必须写“工作包”和“LAYER”，不要把 W 叫 Wave；卡名保留 W 只是前缀。
- **rollup 任务**：Team 板上多一层任务，可能被误读为 nested；文案要写“rollup/汇总，不是子板”。
- **跨组子依赖**：先禁/提升到父级；否则图层和反馈都会复杂。
- **旧 N plan**：只读兼容，不能保证旧 N 用户自然用 W 引用；文档说明 legacy。
- **长号**：W1.1.1 在窄侧栏要截断/折叠，详情显示全号。

## 11. 待拍板（reviewer 请逐条给结论）

1. **W=工作包，L=拓扑层**（推荐）还是 W 直接当拓扑波次？后者会让 W1.1 随依赖漂移。
2. 顶层 W 是固定 stage 别名（W1=scan/W2=dive…），还是自由工作包 + stage 列？推荐后者。
3. `WAVE` 文案是否改为 `LAYER`/并行层？（推荐是。）
4. 子号深度是否限制 2–3 层（推荐展示 2 层，更多折叠）？
5. 复合 W 执行形态选 A（只叶子任务）/ **B（rollup 任务，推荐）** / C（一个任务）？
6. 跨组子依赖：禁止并提升到父级（推荐）还是允许画跨组边？
7. `stage` 用固定枚举（scan/dive/check/synthesis/review）还是自由标签？推荐固定枚举 + 未知标签兜底。
8. 旧 N plan 是否只读兼容、不迁移（推荐）？

## 12. 验收标准

- 新 plan 的 W 树在模板/skill 中可写；`planIndex` 读 `parent`/W id，`planIssuesOf` 能报重号/悬空 parent/deps。
- **W/L 分离可证**：给 W2.1 加一个依赖，L 从 L1 变 L2，W2.1 字符串不变。
- 图谱默认画顶层 W，复合 W 折叠/展开，复制 `drt_<slug>/W2.1`；行标签 `LAYER`。
- 旧 N plan 只读兼容；不引入 nested Team、不改 NODES 八节点契约、不加数值 floor。
- 真实 run 里用户 `@W2.1` 能被 Lead 解析，拆分/合并有墓碑/`derived_from` 可追溯。
- 执行映射（A/B/C）落地后，Team 板仍是平铺 DAG，父子只存在于 plan + rollup `blocked_by`。

## 13. 去向

- 本卡先承载设计与待拍板项；批准后按“模板/skill → parser/结构提示 → 图谱层级/复制引用 → 真实
  run 走查”落。
- 实现完成后，按 [notes/AGENTS.md](../../notes/AGENTS.md) 的 implemented 骨架（决定 / 输掉的
  方案 / 实际跑过的验证）沉淀为 Note，而不只是把本卡改路径。
- 相关证据：[plan 模板](../../research-workspace/templates/run/plan.md)、
  [research-planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)、
  [研究图谱设计](../../docs/design/40-research-cockpit.md)、
  [DSH 编排机制盘点](../research/dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md)、
  [A0 实施 Note](../../notes/implemented/2026-10-21-dynamic-research-dag-a0.md)。
