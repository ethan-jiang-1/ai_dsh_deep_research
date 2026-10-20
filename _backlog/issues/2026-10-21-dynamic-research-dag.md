---
status: 推敲中
opened: 2026-10-21
---

# 推敲：动态研究 DAG 与多层 subagent 编排

> 立卡：2026-10-21 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** 现在四角色 + Agent Teams + 八节点文件契约能跑，但执行图是隐式、模板化的：
`topics.md` 的 `depends_on` 与 Team task 的 `blocked_by` 只被局部使用，Lead 不会按问题形状现场
设计"宽搜 / 深搜 / 交叉验证 / 多层 worker"的图。期望：Lead 在 HITL1 后产出一份可审阅的执行图
（节点类型、依赖、owner、深度、预算），用 DSH 原生机制执行；图可随证据重写，但 HITL、证据链、
审查与交付不变量不破。

**当前情况：** 已确证的事实（同 pin 源码与真实 run 资产）：

- DSH 没有通用动态 DAG 执行器；最接近的是 Agent Teams 的共享任务图（`blocked_by` + 环校验 +
  readiness），但 roster 是平面的（只有 Lead 能创建直属 teammate，无 nested Team），且 readiness
  不会自动唤醒 owner。见 [机制盘点](../research/dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md)。
- subagent 支持 `maxDepth` 与 `agentPreset` / `allowedAgentPresets`，可以按角色组合派 one-shot
  worker 并递归；当前四 preset 未设 `maxDepth`（Host 默认 1），也未开 preset 选择，所以第二层
  现在走不通。
- `workflow` 工具在 base 层存在，但四个 preset 都没声明；且该 pin 的 `agent()` 不能选 preset，
  子代默认继承父组合（Lead 克隆）——它与"角色硬隔离"冲突，不能直接当主编排器。
- 真实 run 已经出现过 topic DAG（如 T4→T1、T5→T2/T3、T6→全量）与 task DAG（critic task-4
  blocked_by task-2/3）；缺的是把这张图提升为一等 plan 工件并系统化重写，而不是从零发明 DAG。
- 生态侧已有多种做法（声明式 DAG 工具、持久 DAG runtime、可视化编排器、任务板+调度器、递归
  planner/worker preset、固定研究循环），但没有一个同时满足本仓的 Team 板 + 角色 preset +
  run bundle + 两点 HITL；可借鉴的工程护栏见[生态实践](../research/dynamic-research-dag/2026-10-21-dsh-plugin-dag-practices.md)。

**未决问题：**

1. 执行图的家：新增 `plan.md`（canonical）并把 Team task 当执行镜像，还是扩 `topics.md`？
2. 多层：只做"多层工作图"（平面 roster + 任务依赖），还是也要"多层 agent 树"（subagent 递归）？
3. 角色保真：teammate 仍继承 Lead 组合（vendor 机制），是否接受子层只用 `agentPreset` worker 来
   补角色？要不要为 worker 固定多个 tool 实例？
4. 生命周期：八节点哪些是必须保留的不变量，哪些降为可实例化的节点类型？
5. 门禁：是否新增 `plan-gate`（只查结构：唯一 id、依赖存在、无环、RQ 覆盖、终局节点），还是先
   靠 critic/HITL？
6. 是否向上游提 `workflow.agent()` 的 preset 选择能力，还是本仓只把它留给同质叶级 fan-out？

**下一步：** 用户先读机制盘点，拍板第 1–3 个方向；方向定了再进 `notes/proposed/` RFC 或直接立
实施卡。

## 已知与未决

- 已确证：Team task board 是真正的 DAG（依赖校验、CAS、claim/complete、reassign/reopen），但
  无自动调度、无 nested Team、无 OR/条件边、无环。
- 已确证：subagent 可递归且可带 preset；Team teammate 不能带自己的 preset（composeFrom Lead）。
- 未决：动态重写图的粒度与预算（节点上限、并发、深度、重写次数）是否要机械化。
- 未决：plan 与 `topics.md` / `question.md §Scope` 的边界，避免三处各说一套。

## 方案与取舍

候选 A（推荐方向）：Team 任务板 = 动态工作图，Lead 写 `plan.md`；子层用带 `agentPreset` 的
subagent（`maxDepth: 2`）；workflow 暂不主编排。取舍 = 原生、durable、可观察；代价 = roster 平面、
第二层不可见任务板、Lead 是唯一调度者。

候选 B：`workflow` 当主编排器。取舍 = 任意控制流、并发强；代价 = 子代继承 Lead 组合、无 Team 板、
无 durable 图、HITL 与恢复语义要另造——与本仓角色隔离和文件事实链冲突。

候选 C：纯 subagent 递归树。取舍 = 角色保真、深度灵活；代价 = 无共享任务板、跨分支依赖只能靠
父级编排与文件。

完整对照与源码证据见[机制盘点](../research/dynamic-research-dag/2026-10-21-dsh-orchestration-primitives.md)。

## 验收标准

（方向拍板后补。当前倾向未定，不写未来检查清单。）

## 关闭条件

用户对"执行图的家 / 多层形态 / 角色保真"三项给出方向，且结论落成 RFC 或实施卡。
