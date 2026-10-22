---
status: 等人拍板
severity: P1
opened: 2026-10-23
---

# BUG-043：图谱把“未映射 task_id”误报成“未执行”

> 严重级别：P1 ｜ 发现：2026-10-23 ｜ 状态：等人拍板
>
> 用户原话（2026-10-23 00:26，session-5b5f6d1f）：“你都做完了吗？你去完了研究图谱，
> 好像里头啥啥都是未执行啊”。同场 Lead 已定位 `plan.md` 的 `task_id` 列全空，并在交付后
> 回填、补完成 task；但产品层的误报仍在。

## 症状

- run 已实际跑完（证据、final、present 都在），一打开「研究图谱」：`W1.1…` 全部显示“未执行 / ○”。
- `drt_eu-us-cn-ai-stack` 是现场：16 个节点、交付已完成；图谱节点状态却全部未执行。
- 队列表里任务实际有完成态；用户无法从图谱看出“哪一步真的在跑/跑到哪”。

## 复现（最小形态）

1. `plan.md` 节点表存在，但 `task_id` 列全空（规划刚写完、尚未回填 Teams 映射）；
2. Team 板其实已有任务（或任务已 complete）；
3. 打开图谱：
   - `taskByPlanId` 只通过 `planNodeOf(plan, task.id)` 建映射；
   - 节点没有 `task_id` → `task === undefined`；
   - `ResearchGraphTab.tsx` 走 fallback `{ text: '未执行', ... }`；
   - 头部只显示 `Team n 任务 · 已映射 k`，没有“plan 有 n-k 个节点未映射”的警告；
   - 用户把“无映射”读成“未执行”。

这不是“刷新 30s/5s”本身：plan 刷新与 Team 投影都在；即使刷新，只要 `task_id` 是空的，
fallback 仍会画成“未执行”。刷新只会让错误状态更稳定。

## 根因（证据确认）

1. **产品层**：`ResearchGraphTab.tsx:434` 把“没有 Team task 映射”的 plan 节点硬编码为
   `未执行`；`mappedCount` / `unmappedTasks` 只统计 Team 任务，没有统计 **plan 节点未映射**。
2. **流程层**：planning skill 要求“把返回的 task-N 回填 plan 的 task_id”，但交付收口没有
   机械检查；Lead 在 `drt_eu-us-cn-ai-stack` 完成交付时 `task_id` 仍全空，直到用户看图
   才发现。Lead 随后回填 16 个 `task_id`、完成 task-9，图谱才具备正确映射。
3. **观察层**：没有“映射覆盖率 / 最后更新时间”的显式提示；用户无法区分
   “未执行”“未映射”“刷新中”。

## 修复方案（建议）

1. **状态语义**：plan 节点没有 mapped task 时，显示 `状态未知（未映射 task_id）` / `?`，
   **绝不显示“未执行”**；只有真实 Team task 的 `pending` 才显示未执行/等依赖。
2. **覆盖率横幅**：头部/图前置显示
   `plan N 节点 · Team M 任务 · 已映射 K · 未映射 N-K`；K<N 时黄色提示
   “图谱无法判断这些节点的进度”，并提供 `刷新` / `最后更新` 时间。
3. **交付前检查**：`research-planning` / `synthesis` 的交付收口增加 task_id 回填检查；
   若某节点是 plan-only，显式写“无 task（plan-only）”，不要留空让图谱猜。
4. **刷新**：保留 plan 5s + Team 投影；补 `最后刷新` 指示，别把“数据缺失”伪装成“状态”。
5. **不自动建 task**：图谱不替 Lead 造任务；观察面只暴露缺口。

## 修复判据

- 固定夹具：`plan` 3 个节点、Team 只有 1 个任务，图谱必须显示
  `已映射 1 / 未映射 2`，未映射节点显示“状态未知”，不得出现“未执行”。
- 回填 `task_id` 后，5s 内（或点刷新）节点状态与 Team 板一致；全部 complete 时显示完成。
- `client-load` 覆盖“plan 有节点、Team 无任务”的负例；不出现假绿/假未执行。
- `research-planning` skill 与交付收口写明“task_id 回填检查”；不新增自动 task 创建。
- 现有 `drt_eu-us-cn-ai-stack` 回填后的 16 个任务在图上正确显示，不重写历史证据。

## 边界

- 不改变 D17 rerun / 交付门 / Team 权限；
- 不在图谱里加“补派任务/调整”动作；
- 不自动迁移旧 plan；已有 `drt_eu` 的 task_id 回填作为现场修复证据保留；
- 与 [rerun 版本面 issue](../issues/2026-10-23-rerun-versioned-graph.md) 分开：本条是
  **plan↔task 映射误报**，不是版本轨问题。

## 证据

- 用户原话与 Lead 修复过程：session-5b5f6d1f（2026-10-23 00:26–00:27）；
- 现场 bundle：`research-workspace/drt_eu-us-cn-ai-stack/plan.md`（现回填 task-1/task-10/… 等 16 个）；
- 代码：[ResearchGraphTab.tsx](../../packages/deep-research-pack/src/client/ResearchGraphTab.tsx)
  的 `taskByPlanId` / fallback `未执行` / `unmappedTasks`；
- 相关契约：[research-planning skill](../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md)
  §4 “回填 task_id”；[设计 40](../../docs/design/40-research-cockpit.md) 图谱观察面。
