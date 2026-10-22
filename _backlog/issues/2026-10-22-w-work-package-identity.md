---
status: 推敲中
opened: 2026-10-22
---

# 推敲：研究图谱的 W 工作包命名与 L 拓扑层

> 立卡：2026-10-22 ｜ 状态：推敲中 ｜ 类型：设计 ｜ 结论倾向：现在做（先确认 W/L 语义；模板/skill/UI 后续落） ｜ 可关闭：否
>
> 用户 2026-10-22 定调：Nx 不够好；希望用 W1 / W1.1 / W1.1.1，动态编排更灵活，反馈更好指。

## 问题

当前 plan 用 `N1…N10` 做节点 id，图谱又用 `WAVE n` 做**按依赖算出的拓扑层**。两套概念混在一起：

- 用户想指“这一步”时，没有稳定的层级名；`N4` 在图上可能和 Wave 2 并列，反馈不好说。
- 如果直接把 W 当拓扑波次，插入/改依赖会让节点从 W1.1 漂到 W2.1——W 又变成会变的序号，
  重蹈 N 的问题。
- DSH Agent Teams 是**平铺 DAG**（`blocked_by` 边，无 parent task、无 nested Team）；层级不能
  硬塞进 Team 任务板。

## 提议（待拍板）

**W = 稳定的工作包/工作流组；L = 计算出的拓扑层；stage = 固定研究流程标签。**

- 顶层 `W1/W2/W3…`，子工作 `W1.1/W1.2`，更深 `W1.1.1`。父 W 固定，子 W 可增删。
- `W` 编号**只分配、不重排、不回收**；新工作包取下一个空号；排序/画图按 `deps`，不按 W 大小。
- `stage`（scan / dive / check / synthesis / review）独立一列，承载“最大流程不变”；W 数量可自由编排。
- 图上的行标签从 `WAVE` 改为 `LAYER`/并行层；层是计算值，不是身份。
- 用户反馈引用 `drt_<slug>/W2.1`；Lead 先读 plan 的 W 行，不按图中顺序猜。父 W 的
  output/acceptance/反馈固定，子 W 只是内部拆解。
- `task_id` 仍只是当前会话 Team 映射，不作引用；W 与 Team task 一对一，子号默认不另建 nested Team。

示例：

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

## 编号纪律

- 顶层 W 分配一次；已有 W1–W5，新加 W6，即使它画在 W1 旁。
- 子号在父下分配；删了做墓碑（retired / merged_into / superseded_by），不把旧号给新节点。
- 拆分对外结果：父 W 保留或写 `superseded_by: [W7,W8]` + 新 W 的 `derived_from: W2`；不悄悄
  把 W2 改成 W3。
- 换父/改名：保留旧号 + `moved_from` / `renamed_from`，或新建 `derived_from`；不静默换前缀。
- `plan_version` + 重写记录继续保留。

## DSH 映射

- `plan.md` = W 树 + `stage` + `deps` + output/acceptance；是 canonical 过程件。
- `agentTeam` = 平铺任务（`task_id` 映射 W）+ 状态/owner；`blocked_by` 是执行边。
- `subagentCatalog` = 每个 owner 的 depth-2 worker；复合 W 内部由 owner/worker 做。
- `levelsOf/wavesOf` 只算 L 层用于布局，**不再参与 ID**；子 W 不建 nested Team。
- 若子工作确需另一个 owner 并行：Lead 建平铺 Team task（subject 写 `W1.1 · …`），plan 保留
  parent；Team 不知道层级，plan 知道。

## 兼容

- 新 plan 用 W；旧 plan 的 N 原样保留为 legacy（只读也能画），不强制迁移。
- 解析器接受任意稳定 id；`parent/deps` 按新规则；`planIssuesOf` 增加 W 层级校验。
- 模板、`research-planning` skill、研究手册同步；已有 A0 run 不改写。

## 待拍板

1. **W=工作包，L=拓扑层**（推荐）还是 W 直接当拓扑波次？后者会让 W1.1 随依赖漂移。
2. 顶层 W 是固定 stage 别名（W1=scan/W2=dive…），还是自由工作包 + stage 列？推荐后者。
3. `WAVE` 文案是否改为 `LAYER`/并行层？（推荐是。）
4. 子号深度是否限制 2–3 层（推荐展示 2 层，更多折叠）？

## 验收标准

- 新 plan 的 W 树在模板/skill 中可写；`planIndex` 读 `parent`/W id，`planIssuesOf` 能报重号/悬空 parent/deps。
- 图谱默认画顶层 W，复合 W 折叠/展开，复制 `drt_<slug>/W2.1`；WAVE 行改 LAYER。
- 旧 N plan 只读兼容；不引入 nested Team、不改 NODES 八节点契约、不加数值 floor。
- 真实 run 里用户 `@W2.1` 能被 Lead 解析，拆分/合并有墓碑可追溯。

## 去向

- 本卡先承载设计与待拍板项；批准后按“模板/skill → parser/结构提示 → 图谱层级/复制引用 → 真实
  run 走查”落。
- 实现完成后，按 [notes/AGENTS.md](../../notes/AGENTS.md) 的 implemented 骨架（决定 / 输掉的
  方案 / 实际跑过的验证）沉淀为 Note，而不只是把本卡改路径。
- 相关：[plan 模板](../../research-workspace/templates/run/plan.md)、[research-planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)、
  [研究图谱设计](../../docs/design/40-research-cockpit.md)、[DSH 编排机制盘点](../research/dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md)。
