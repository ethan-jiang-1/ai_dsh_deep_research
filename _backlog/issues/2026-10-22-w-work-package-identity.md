---
status: 等人拍板
opened: 2026-10-22
---

# 推敲：研究图谱的 W 工作包与 LAYER 拓扑层

> 立卡：2026-10-22 ｜ 状态：等人拍板 ｜ 类型：设计 ｜ 结论倾向：现在做（W=工作包、LAYER=计算层、执行 B 案；待你确认） ｜ 可关闭：否
>
> 用户 2026-10-22 定调：Nx 不够好；希望用 `W1 / W1.1 / W1.1.1`，动态编排更灵活、反馈更好指。
> 第二 reviewer 已评审：[review](../research/dynamic-research-dag/2026-10-22-w-work-package-identity-review.md)。
> 本卡已吸收 B1–B4 / S1–S5 / S7；带“review 结论”的条目仍待用户最终拍板。

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
  本卡不要求改写它；A0 plan 无 parent 列，parser 仍可读，验证“旧 N 只读兼容”成立。

**所以本卡不是从零设计 DAG，而是把“稳定 ID + 复合层级”的前缀从 N 演进为 W，并处理 W 与
现有拓扑层 `WAVE` 的概念冲突。**

## 2. 术语（先消歧，否则 W 会重蹈 N 的覆辙）

| 词 | 含义 | 是否稳定 | 谁拥有 |
|---|---|---|---|
| W（工作包/批次） | 用户可见的工作分组；顶层 W1、子 W1.1、再深 W1.1.1 | **稳定**，只分配不重排 | plan.md |
| LAYER（拓扑层） | 按 deps 最长路径算出的并行层；只用于布局/排序 | 计算值，会变 | `levelsOf/wavesOf` |
| stage | scan / dive / check / synthesis / review / gate；由根 W 的 kind **派生** | 派生标签，不是身份 | plan.md（只读派生） |
| lifecycle | active / retired / merged_into / superseded_by；墓碑载体 | 状态，按重写变化 | plan.md |
| task_id | 当前会话 Team 任务映射 | 会话级，会变 | Team 板 |
| status/owner | 执行态/负责人 | 执行态，会变 | `agentTeam` 投影 |
| plan_version | 计划重写版本 | 随重写递增 | plan.md |

**W 不表示“第几个 Wave”**。如果 W 跟 LAYER 绑定，插入依赖就会让 W1.1 漂成 W2.1，反馈再次失效。

> 消歧（B1）：文档/UI 一律用 **LAYER n / 第 n 层**表示拓扑层，不再用裸 `Ln`。
> `depth` 列的 L0–L3 是**研究深度档**，不是 LAYER；NODES 的 `wave0/1/2` 是生命周期固定段名，
> 也不是 plan 的 LAYER（S5）。

## 3. 问题

当前 plan 用 `N1…N10` 做节点 id，图谱又用 `WAVE n` 做**按依赖算出的拓扑层**，两套概念混在一起：

- 用户想指“这一步”时，没有稳定的层级名；`N4` 在图上可能和 Wave 2 并列，反馈不好说。
- 如果直接把 W 当拓扑波次，插入/改依赖会让节点从 W1.1 漂到 W2.1——W 又变成会变的序号，
  重蹈 N 的问题。
- DSH Agent Teams 是平铺 DAG；层级不能硬塞进 Team 任务板，否则会出现“plan 是树、Team 是平铺”
  的第二套结构。
- 用户要“W 数量随便编排”，同时“最大流程不变”；需要一个稳定的 W 树 + 派生 stage 标签。

## 4. 提议（review 后建议）

**W = 稳定的工作包/工作流组；LAYER = 计算出的拓扑层；stage = 从根 W 的 kind 派生的研究流程标签。**

- 顶层 `W1/W2/W3…`，子工作 `W1.1/W1.2`，更深 `W1.1.1`。父 W 固定，子 W 可增删。
- `W` 编号**只分配、不重排、不回收**；新工作包取下一个空号；排序/画图按 deps，不按 W 大小。
- `stage` **不加独立列**（B3）：由根 W 的 kind 派生，子 W 继承父 stage：
  `broad-scan→scan`、`deep-dive→dive`、`cross-check→check`、`synthesis→synthesis`、`review→review`、
  `gate→gate`；未知 kind 回落 `unknown`。避免 kind/stage 双事实源。
- 图上的行标签从 `WAVE` 改为 `LAYER`/并行层；层是计算值，不是身份。
- 用户反馈 canonical = `drt_<slug>/W2.1`；chat 里的 `@W2.1` 是当前 run 上下文简写（S2）。
  Lead 先读 plan 的 W 行，不按图中顺序猜。父 W 的 output/acceptance/反馈固定，子 W 只是内部拆解。
- `task_id` 仍只是当前会话 Team 映射，不作引用；**有执行任务的 W 与 Team task 一对一，纯 plan 子步骤可不建 task**，见 §6。

示例（W 树 + 计算 LAYER 是两件事）：

```text
W1 宽搜（kind=broad-scan → stage=scan）
  W1.1 官方域扫描
  W1.2 二手域扫描
W2 深挖（kind=deep-dive → stage=dive）
  W2.1 官方页逐字
    W2.1.1 价格页
    W2.1.2 文档页
W3 交叉核查（kind=cross-check → stage=check）
W4 综合（kind=synthesis → stage=synthesis）
W5 审查（kind=review → stage=review）
```

若 W2.1 新加一个依赖，图上的 LAYER 可能从 1 变 2；**W2.1 这个字符串不变**。这正是 W 与
LAYER 必须分开的原因。

目标节点表（新 plan；`plan_version` 在文件头/重写记录，不塞进每行）：

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 | — | active | broad-scan | … | scout | — | leads.md | … | … | L1（深度） | task-1 |
| W1.1 | W1 | active | search | 官方域定位 | scout | — | leads 片段 | 官方 URL | 1 次 | L1（深度） | |
| W2 | — | active | deep-dive | … | analyst | W1 | evidence/… | … | … | L2（深度） | task-2 |
| W2.1 | W2 | active | fetch | 逐字摘录 | analyst | — | evidence/… | 七字段 | 1 次 | L2（深度） | task-3 |

`stage` 不在表里（派生）；`depth` 列 = 研究深度 L0–L3，**不是** LAYER；`task_id` 可空（plan-only
子步骤）。**墓碑载体（B2）**：`lifecycle` 列是唯一权威——`active` 才进图；`retired`/`merged_into`/
`superseded_by` 仍留在表里供 `byId` 解析，但不画图。`planIndex.topLevel` 过滤非 active；
`byId` 保留全部；活跃节点依赖 retired 时报 `retired-dep`（见 §9）。`derived_from`/`moved_from`
写重写记录，不新造状态。

## 5. 编号纪律

- 顶层 W 分配一次；已有 W1–W5，新加 W6，即使它画在 W1 旁。
- 子号在父下分配；删了做墓碑（`lifecycle: retired` / `merged_into:W4` / `superseded_by:W7,W8`），
  不把旧号给新节点；`byId` 保留可查。
- 拆分对外结果：父 W 保留或写 `superseded_by: [W7,W8]` + 新 W 的 `derived_from: W2`；不悄悄
  把 W2 改成 W3。
- 换父/改名：保留旧号 + `moved_from` / `renamed_from`，或新建 `derived_from`；不静默换前缀。
- `plan_version` + 重写记录继续保留；**旧号不复用**是硬规则。
- 允许 W 号不连续、在表里不按数字顺序出现；表/图按 stage 或 deps/LAYER 排，不按 W 大小排。

## 6. 执行映射（Agent Teams 平铺，不能有 nested Team）

**review 结论：B 案（rollup 任务）**，补齐 S1：

- **A. 只给叶子 W 建任务**：复合 W 不建 Team task，只做 plan 分组；子 W 各建平铺 task；父 W 的
  output/acceptance 归 Lead 的综合/审查任务。Team 板只看到叶子任务。
- **B. rollup 任务（采纳）**：**每个顶层 W 建一个平铺任务**（叶子 W = 普通 task；复合 W =
  rollup task，subject `W2 · …`，owner Lead）。**有独立 owner/交付物的子 W** 各建平铺 task；
  纯分析子步骤 plan-only 不建 task。rollup 的 `blocked_by` = **外部依赖的 task + 已建子任务**；
  Lead 在子任务完成后 claim/complete。Team 仍是平铺 DAG，父子关系由 plan + `blocked_by` 表达。
- **C. 复合 W 一个任务**：owner 的 teammate 在内部用子 plan/worker 完成；子 W 不建 Team task。
  执行简单，但 Team 板看不到子层进度，不用于需要子层反馈的场景。

约束：

- 子任务废弃要先 `set_dependencies` 清掉依赖边再 delete（Team 对有依赖者的 delete 拒绝；S1）。
- 父 W 的外部依赖在 plan 顶层；**跨组子依赖禁止并提升到父级**（review 结论；顶层图不画跨组
  子边，放行即静默边）。跨组需求 = 给父 W 加 dep，或拆成新顶层 W。
- `task_id` 可以出现在叶子/rollup 任务上；**用户永远引用 W，不引用 task_id**。
- 子号深度限制：展示 2 层，plan 最多 3 层；超过报 `too-deep`，不硬崩（review 结论）。

## 7. DSH 映射

- `plan.md` = W 树 + 派生 stage + `deps` + output/acceptance；是 canonical 过程件。
- `agentTeam` = 平铺任务（`task_id` 映射 W）+ 状态/owner；`blocked_by` 是执行边。
- `subagentCatalog` = 每个 owner 的 depth-2 worker；复合 W 内部由 owner/worker 做。
- `levelsOf/wavesOf` 只算 LAYER 用于布局，**不再参与 ID**；子 W 不建 nested Team。
- 若子工作确需另一个 owner 并行：Lead 建平铺 Team task（subject 写 `W1.1 · …`），plan 保留
  parent；Team 不知道层级，plan 知道。
- 不引 workflow/第二 store/外部 DAG runtime；W 树是 plan 文档结构，不是新服务。

## 8. 图与反馈 UX

- 顶层只画 W1…Wn，复合 W 标 `内部 N`/`+N`；展开看 W1.1/W1.1.1；每个 W 可复制
  `drt_<slug>/W2.1`（只复制，不发送）。
- 行标签：`LAYER 1 · 3 个并行`，不是 `WAVE`；W 组内子层用缩进/组内“第 n 层”，不混用全局
  LAYER 编号。
- 节点详情显示 `W id / stage（派生）/ owner / deps / output / acceptance / task / plan_version`。
- 反馈：用户在 chat 写 `@W2.1 …`（简写）或粘贴 `drt_<slug>/W2.1`；Lead 读 plan；复合 W 先确认
  “整体还是子节点”；记 `node_id + plan_version` 到 journal/question §Decisions；拆分/合并用
  墓碑/`derived_from`。
- 空态：无 plan/无依赖边仍诚实说“没有可画的 DAG”，不画假 Wave。

## 9. 校验与迁移

`planIssuesOf` 的新 issue kinds（S3；分家族，旧 N plan 不误报）：

- 既有：`duplicate-id` / `missing-parent` / `dangling-dep` / `self-dependency`。
- 新：`mixed-family`（同一 plan 混 W/N，legacy 例外）、`child-prefix`（W2 子必须 W2.x）、
  `too-deep`（>3）、`cross-group-child-dep`（子依赖跨父）、`retired-dep`（活跃节点依赖 retired）、
  `tombstone-without-successor`（retired 无 merged/superseded）。
- `stage` 不单独校验（派生自 kind）；未知 kind 只显示 `unknown`，不报硬错。

迁移：

- 新 plan 用 W；旧 plan 的 N 原样保留为 legacy（只读也能画），不强制迁移。
- 同一 plan 不建议混 W/N；混用报 `mixed-family`，不自动改写。
- 模板、`research-planning` skill、研究手册同步；**NODES 八节点契约**（B4）：不动 I/O 行与既有
  schema-scan/node-gate 判据；行内 N 字样与列描述同 diff 同步，验收不再写“不改 NODES”。
- 模板改动走生成物链：pack workspace 种子重生成（`pack-workspace-fresh` 把守）+ overlay/镜像
  三处一致（S4）。
- 新 run 何时开始默认 W：由模板/skill 版本决定；旧 run 不追溯。

## 10. 相对现行 skill 的 delta（S7）

现行 `research-planning` §0/§4 写“拆并行执行单元 = Lead 追加**新的顶层节点**”。B 案允许
**子 W 直接上板（平铺任务）**，这是本卡最大的行为变更。实施 diff 必须同处替换 skill §0 的
复合节点段与 §4 规则 1，不能新旧纪律同页并存。

## 11. 风险与取舍

- **W 号不连续/不按顺序**：用户可能期待 W1 在 W2 前；缓解 = stage 徽标、搜索、复制引用、图按
  deps 排；不能为了顺序重排编号。
- **W 与 Wave 混淆**：UI 必须写“工作包”和“LAYER”，不要把 W 叫 Wave；卡名保留 W 只是前缀。
- **rollup 任务**：Team 板上多一层汇总任务，可能被误读为 nested；文案要写“rollup/汇总，不是子板”。
- **跨组子依赖**：禁止并提升到父级；否则顶层图静默丢边。
- **旧 N plan**：只读兼容，不能保证旧 N 用户自然用 W 引用；文档说明 legacy。
- **长号**：W1.1.1 在窄侧栏要截断/折叠，详情显示全号。

## 12. 八问结论（review 后，待用户拍板）

1. **W=工作包，LAYER=拓扑层**：采纳（不再用裸 L）。
2. 自由工作包 + 派生 stage（不加 stage 列）：采纳（B3）。
3. `WAVE` → `LAYER`/并行层：采纳。
4. 子号深度：展示 2 层、plan 最多 3 层；超深 `too-deep`：采纳。
5. 复合 W 执行：**B（rollup）**；补齐外部依赖 + 子任务清边：采纳。
6. 跨组子依赖：**禁止并提升到父级**：采纳。
7. stage：固定枚举（scan/dive/check/synthesis/review/gate）+ 未知 `unknown` 兜底；由 kind 派生：采纳。
8. 旧 N：只读兼容、不迁移；`mixed-family` 分家族：采纳。

## 13. 验收标准

- 新 plan 的 W 树在模板/skill 中可写；`planIndex` 读 `parent`/W id/lifecycle，`planIssuesOf` 能报
  §9 的重号/悬空 parent/deps/家族/前缀/跨组/墓碑问题。
- **W/LAYER 分离可证**：给 W2.1 加一个依赖，LAYER 从 1 变 2，W2.1 字符串不变。
- 墓碑：`lifecycle: retired` 留在表里、不画图、`byId` 可解析；活跃节点依赖 retired 报 `retired-dep`。
- 派生 stage：kind→stage 映射与 gate/unknown 兜底可测；无独立 stage 列。
- 图谱默认画顶层 W，复合 W 折叠/展开，复制 `drt_<slug>/W2.1`；行标签 `LAYER`；旧 `WAVE` 文案
  与相关测试同 diff 改（review 未查项）。
- 旧 N plan 只读兼容；不引入 nested Team、不动 NODES I/O 行/既有门、不加数值 floor。
- 真实 run 里用户 `@W2.1`/`drt_<slug>/W2.1` 能被 Lead 解析，拆分/合并有墓碑/`derived_from` 可追溯。
- 执行映射 B 落地后，Team 板仍是平铺 DAG，父子只存在于 plan + rollup `blocked_by`；rollup 的
  `blocked_by` 覆盖外部依赖 task + 子任务。
- 文档链：00-index 术语映射、design/40、NODES/研究手册的行内 N 字样与列描述、pack 种子/overlay
  三轮同步（S4/B4）。

## 14. 去向

- 本卡先承载设计与待拍板项；用户拍板后按“模板/skill → parser/结构提示 → 图谱层级/复制引用 →
  真实 run 走查”落。
- 实现完成后，按 [notes/AGENTS.md](../../notes/AGENTS.md) 的 implemented 骨架（决定 / 输掉的
  方案 / 实际跑过的验证）沉淀为 Note，而不只是把本卡改路径。
- 相关证据：[第二个 reviewer 的评审](../research/dynamic-research-dag/2026-10-22-w-work-package-identity-review.md)
  （事实核对 + B1–B4 + S1–S7 + 八问）、[plan 模板](../../research-workspace/templates/run/plan.md)、
  [research-planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)、
  [研究图谱设计](../../docs/design/40-research-cockpit.md)、
  [DSH 编排机制盘点](../research/dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md)、
  [A0 实施 Note](../../notes/implemented/2026-10-21-dynamic-research-dag-a0.md)。
