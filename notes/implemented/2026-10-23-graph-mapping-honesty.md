# 图谱映射诚实：plan↔Team 五态与覆盖率（已落地）

> 状态：implemented
>
> 首提 2026-10-23 ｜ 缺陷卡 [BUG-043](../../_backlog/_archived/fixed_bugs/BUG-043-graph-unmapped-task-shows-unexecuted.md)（已修）
> ｜ 设计合同 [design/40 §2](../../docs/design/40-research-cockpit.md)（构成与折算层表）｜
> 夹具 [plan-mapping](../../tests/fixtures/plan-mapping/) ｜ 测试 [graph-model.test.mjs](../../tests/cockpit/graph-model.test.mjs)

## 决定

**观察面不允许把“数据缺失”说成“执行状态”。** plan↔Team 映射折算从
`ResearchGraphTab` 内联搬到 `src/lib/graph-model.ts`，词表五态：

- `mapped`：`task_id` / 节点 id 命中 Team 任务 → 状态来自任务；
- `unmapped`：`task_id` 空 → `状态未知（未映射 task_id）`；
- `stale`：`task_id` 有值但当前 Team 板没有该任务（恢复会话重建任务后必现）→ `状态未知（task_id 失效：task-N）`；
- `plan-only`：显式 `plan-only` / `no-task` / `无 task` → `plan-only（无 Team 任务）`，不算缺口；
- `duplicate`：同一 `task_id` 被多个节点声明 → 后声明者 `状态未知（task_id 重复：task-N）`，不误报失效。

`未执行` 不再由“缺少映射”产生。**覆盖率口径**：分母 = active plan 节点（含子节点、不含墓碑），
分子 = mapped；Team 侧多出的任务单列「未进 plan 的 Team 任务」。头部一行
`plan N 节点 · Team M 任务 · 已映射 K · 未映射 N-K`，另有 stale / duplicate / plan-only 才追加；
缺口横幅说「图谱无法判断这些节点的进度」。

跨面同改的四处：`ResearchGraphTab`（头部/横幅/子节点行/最后刷新）、`plan-graph` 的
`planNodeOf` 兼容语义（不动）、`research-planning` §4 与 `synthesis` 的交付收口文案（逐行回填
`task_id` 或显式 `plan-only`，不留空；不自动建 task）、`client-load-smoke` 的覆盖率行断言。

## 输掉的方案

- **保留 `未执行` 兜底，只加警告**：兜底本身就是错误陈述，警告救不回第一眼。
- **覆盖率拿 Team 任务数当分母**：原实现 `mappedCount = taskByPlanId.size` 与「Team M 任务」并排，
  两个分母混一句话，用户算不出缺口。
- **在组件里继续内联 join**：keyless 测不到，只能靠浏览器；抽件后 11 条单测先红后绿。
- **用任务反查（`planNodeOf`）判 stale**：`byTaskId` first-wins，两个节点写同一 `task_id` 时
  第二个被误报「失效」（对抗评审实测抓获）。
- **把投影未就绪当映射缺口**：`planMappingOf(plan, [])` 会把 16 个节点全报 stale，且与
  「还没有团队投影」同屏自相矛盾；现改为节点显示「等待团队投影」，覆盖率与横幅都不渲染。
- **让墓碑吃掉任务**：`byTaskId` 覆盖含墓碑的全部行，墓碑上的 task 若进 `taskByPlanId`，
  它既不上图也不进「未进 plan」——从观察面消失；现只认 active 节点。
- **在 `node-gate` 加覆盖率 INFO 行**：Team 任务不在盘上（投影不进 journal），归档 bundle 也没有
  会话；覆盖率只有观察面一处在算。
- **自动建 task / 迁移旧 plan**：观察面只暴露缺口，Lead 在对话里修。

## 实际跑过的验证

- 基线：`pnpm verify` 全绿、`pnpm test` 628 pass / 0 fail。
- **红**：新测试在 `graph-model.ts` 不存在时 import 失败（1 文件 / 1 fail）；实现后 11 条全绿。
- `pnpm typecheck` 通过；`pnpm test` **639 pass / 0 fail**（净增 11 条）。
- `pnpm build`（pack 双半）通过；`client-load-smoke` ALL PASS，新增断言「研究图谱覆盖率行在场
  （已映射 K / 未映射 N-K）」在绑定会话（`drt_cn-us`，11 个 active 节点）上命中。
- `pnpm verify` 全绿：`cockpit-doc-registry`（本件已登记 design/40）、fixtures taxonomy
  （`plan-mapping/` 组 + 消费者）、`md-links` 均过。
- 浏览器负例：**已有真实现场**——受控 E2E run `drt_e2e-rerun-2026-10-23`（已归档）的 plan
  `task_id` 整列空白；run 通道真渲染显示「映射缺口：图谱无法判断 5 个 plan 节点的进度」、
  逐节点「状态未知（未映射 task_id）」、覆盖率「已映射 0 · 未映射 5」，全程无「未执行」
  （`runtime/scenes/e2e-v2-graph-live.png`）。此前 dev home 确无此现场，空分支才先靠夹具。

## 环境状态

- 旧 bundle 不迁移：`task_id` 空的 plan 显示状态未知（夹具 + 受控 E2E run 两类现场）。
- `drt_gha-ubuntu-latest` 是 `plan-only` 的真实样本；它的 plan 同时是 flat W 旧命名（另案）。
- BUG-043 卡上原「client-load 覆盖 plan 有节点、Team 无任务负例」判据不成立，已改为
  「覆盖率行 + 盘侧节点数对账」；负例归夹具与单测。
- `duplicate` 是评审期新增的第五态：`planIssuesOf` 暂未把重复 `task_id` 列进 plan 结构提示，
  观察面已能说清；要不要升成结构提示由后续真实样本决定。
