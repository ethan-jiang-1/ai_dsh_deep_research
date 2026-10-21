---
status: 已结
opened: 2026-10-21
---

# 推敲：动态 DAG 的稳定节点身份与复合节点

> 立卡：2026-10-21 ｜ 状态：已结 ｜ 类型：设计 ｜ 结论倾向：现在做（已落地）
>
> 用户 2026-10-21 定调：**最大流程不变，变的是一个节点内部**；N3 可扩 N3.1/N3.1.1，但 N3 固定。

## 问题

动态 DAG 里 `N1…N10` 目前是计划行号。Lead 插入/展开/重写计划时会重排编号，用户说“N4 这里多了/少了”
就失去稳定指代；`task_id` 又是当前会话映射，重派/rerun 会变。需要一个**用户可引用、跨改写不漂移**的
节点身份，同时允许一个节点内部是复杂子图、对外仍是一个结果节点。

## 决定（已写入 [plan 模板](../../../research-workspace/templates/run/plan.md) 与
[research-planning skill](../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)）

- **N 是 ID，不是序号**：只分配、不重排、不回收；新增节点取下一个空号（N11），不把 N4 改成 N5；
  排序按 deps/wave，不按编号。
- **主干固定**：顶层流程 = NODES 研究流程；动态展开发生在节点内部/以新号追加，不改写主干、不改旧号。
- **复合节点**：顶层 `N3` 是外部契约（deps/output/acceptance/用户反馈都挂 N3）；内部子节点
  `N3.1/N3.1.1` 只做执行/观察细节。子节点默认不建独立 Team task（不嵌套 Team）；父节点一个任务。
- **拆分/合并只做墓碑**：`retired` / `merged_into` / `derived_from` / `superseded_by`；旧号不复用。
- **反馈引用**：用户在使用 `run_slug/N3`（内部 `run_slug/N3.2`）；Lead 先读 plan 的 id 行，
  复合节点先确认“整体/子节点”，反馈记 `node_id + plan_version`。`task_id` 不作引用。
- **plan_version**：每次重写递增，重写记录写“加了/拆了/并了哪个号”。

## 实施结果（2026-10-21）

1. **plan-graph**：`PlanNode.parent`；`planIndex` 解析 `parent` / `图版本` / `topLevel` /
   `childrenByParent`；新增 `planIssuesOf`（重号 / 悬空 parent / 悬空 dep / 自依赖）。
2. **图谱**：默认只画顶层节点；复合子节点收在父节点详情（图上标 `+N`）；节点详情提供
   `复制引用`（`drt_<slug>/N3`，只复制不发送）；plan 结构提示只读展示。
3. **模板/skill/手册**：plan 模板加 `parent`/图版本/墓碑与编号纪律；research-planning 加
   「N 是 ID」节；工作区手册同步；pack workspace 种子由生成器同步。
4. **验证**：`pnpm typecheck`；`pnpm test` **622 pass / 0 fail**；`pnpm verify` 全绿；
   `preset-smoke` ALL PASS；`client-load-smoke` ALL PASS（图谱页签体含顶层 DAG/计划计数）。
5. **边界**：不引入 nested Team、不改 NODES 八节点契约、不加数值 floor；复合 UI 只读，
   面板不提供调整动作。

## 验收标准

- 旧号在插入/展开/重写后不变；`N3` 扩成 `N3.1/N3.1.1` 后仍能指 N3。
- 图默认显示顶层 DAG；复合节点可展开；复制引用带 run slug。已由 keyless tests + client-load 覆盖。
- 用户 `@N3` 能落到同一 plan 行；拆分/合并有墓碑可追溯（模板/skill 约束；真实 run 走查留后续）。
- 不引入 nested Team、不改 NODES 八节点契约、不加数值 floor。
