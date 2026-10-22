# W 工作包与 LAYER 层（已落地）

> 状态：implemented
>
> 首提：2026-10-22 ｜ 用户 2026-10-22 批准进入落地 ｜
> 设计卡（已结）：[_backlog/_archived/settled_issues/2026-10-22-w-work-package-identity.md](../../_backlog/_archived/settled_issues/2026-10-22-w-work-package-identity.md)
> ｜ 第二 reviewer：[review](../../_backlog/research/dynamic-research-dag/2026-10-22-w-work-package-identity-review.md)

## 决定

**W 是稳定工作包，LAYER 是计算层，stage 从根 W 的 kind 派生；N 只作旧 plan 的只读兼容。**

- **身份**：`W1 / W1.1 / W1.1.1` 只分配、不重排、不回收；新顶层取下一个空号，不按图上顺序改号。
  `parent` 固定；父 W 的 deps/output/acceptance/用户反馈不变。`task_id` 只是会话映射，不作引用。
- **LAYER**：`levelsOf/wavesOf` 只用于布局/排序；UI 文案为 `LAYER n`/第 n 层，不写进 W id。
  `depth` 的 L0–L3 是研究深度，不是 LAYER。
- **stage 派生**：`broad-scan→scan`、`deep-dive→dive`、`cross-check→check`、`synthesis→synthesis`、
  `review→review`、`gate→gate`；子 W 继承根 W，未知 `unknown`；**不建 stage 列**，避免
  kind/stage 双事实源。
- **lifecycle**：节点表新增 `lifecycle`（active/retired/merged_into/superseded_by）。`planIndex.topLevel`
  只含 active；`byId` 保留墓碑供旧引用解析；墓碑不画图。
- **结构提示**：`planIssuesOf` 在已有重号/悬空 parent/deps/自依赖之上，新增 `mixed-family`、
  `child-prefix`、`too-deep`、`cross-group-child-dep`、`retired-dep`、`tombstone-without-successor`；
  只读提示，不是 node-gate。
- **Team 映射**：Agent Teams 仍是平铺 DAG，不建 nested Team。每个顶层 W 一个平铺 task；复合 W
  用 rollup task（owner Lead），`blocked_by` = 外部依赖 task + 已建子任务；有独立 owner/交付物的
  子 W 才建平铺 task；子任务废弃先清边再 delete。跨组子依赖禁止并提升到父级。
- **UI**：图谱默认画顶层 active W，复合 W 折叠/展开，复制 `drt_<slug>/W3.1`；行标签 `LAYER`；
  详情显示派生的 stage；旧 `WAVE` 文案移除。
- **载体**：`plan-graph.ts`（解析/过滤/校验/派生的唯一正本）、`ResearchGraphTab.tsx`、plan 模板、
  `research-planning` skill、研究手册/NODES、design/30/40、00-index 术语、pack workspace 种子、
  README 同步；A0 的 N1–N4 原样保留为 legacy，不重写。

## 输掉的方案

- **W 直接当拓扑波次**：插入/改依赖会让 W1.1 漂成 W2.1，反馈失效；因此 LAYER 独立计算。
- **继续只用 N 的复合号**：能工作，但用户难把“第几波/哪个工作包/哪个子步”分开说；W 的可读性
  和反馈价值更高。
- **裸 `L` 前缀表示层**：与深度档 L0–L3、评估五面 L0–L4 三重撞车；弃用，统一 `LAYER n`。
- **独立 stage 列**：与 kind 近重复，会出现第二事实源；改为 kind 派生。
- **只给叶子 W 建任务（A）/复合 W 一个任务（C）**：A 丢父层可观察性，C 看不到子层进度；
  选 B rollup，代价是 Team 板多一个汇总任务。
- **跨组子依赖允许画边**：顶层图只画顶层 W，跨组子边会成为静默边；禁止并提升到父级。
- **nested Team**：vendor 不支持，且会把 plan 树和 Team 板变成两套结构。
- **迁移/重写 A0 plan**：旧 N 只读兼容；新 run 才用 W，避免动已交付证据。

## 实际跑过的验证

- `pnpm typecheck`：通过；pack client/host 构建通过。
- `pnpm test`：**627 pass / 0 fail**；`tests/cockpit/plan-graph.test.mjs` 含 W 家族/stage/lifecycle/
  planIssues 与“加依赖只改 LAYER、不改 W id”的 keyless 断言。
- `pnpm verify`：全绿（含 `pack-workspace-fresh`、`backlog-liveness`、`doc-budgets`、`md-links`）。
- `DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs`：**ALL PASS**（4 preset 真挂载）。
- `node --import tsx/esm scripts/smoke/client-load-smoke.mjs`：**ALL PASS**（真浏览器；含图谱/方法库/
  配置页签的既有观察面断言；`LAYER` 文案通过；无页面异常）。
- **W 图谱 UI 走查**：临时把 A0 plan 改成 W 树（4 顶层/7 节点，W3 两个 active 子节点，W5
  `merged_into:W4` 墓碑），真浏览器确认 `LAYER 1` 在场、无 `WAVE`、W3 展开 W3.1/W3.2、
  W5 不进图、stage 显示；随后 `cmp` 恢复 A0 plan 原文件，未改证据。
- `plan-graph` 旧 N 测试仍全绿，验证 legacy 兼容（A0 plan 无 parent 列也可读）。
- **真实 W run（受控）**：`research-workspace/drt_gha-ubuntu-latest`（quick_factual，GitHub Actions
  `ubuntu-latest` → Ubuntu LTS）。Lead 用 W1 复合 + W1.1/W1.2 子节点（5 顶层/7 节点）；Team 板
  task-1（W1 rollup）…task-5 全部 complete；证据 3 卡 + findings/final；critic 首轮 FAIL（M1 记账）
  → 修复后第二轮 PASS；HITL2 代理模拟按现稿定稿。图谱实测 `W1 +2`、`LAYER 1`、W1.1/W1.2 详情；
  截屏 `runtime/research-tmp/w-run-final.png`。这证明真实 run 的 W 命名/复合展示/rollup 任务链成立。
- `client-load` 的会话列表冷启动等待从 5s 提到 11s（测试健壮性，不是产品行为）。

**未跑项（不得说成已通过）**：

- 真实 W run 目前只有一场 quick_factual；多 topic/多层 W1.1.1 的真实 run 未跑。
- 该 run 的 subagent 首派无产出，Lead 改走 teammate 通道；不是 W 命名的问题，但说明执行通道
  仍需观察。

## 环境状态与已知限制

- 新 plan 默认 W；旧 N 原样保留，不迁移、不混写（混写由 `mixed-family` 提示）。
- 墓碑留在表里；`derived_from`/`moved_from` 仍写重写记录，不新造 lifecycle 值。
- LAYER 只在图上显示；plan 表没有 LAYER 列（避免又一个会漂的列）。skill 现明确：不手写 LAYER
  表，若写只作“示意/非权威”；本次真实 run 的 Lead 仍手写了一张 LAYER 表，且 W1 的 LAYER 3 与
  图的顶层 LAYER 1 不一致——这是 plan 文本与图的口径差，图/`levelsOf` 才是计算权威。
- `stage` 是派生标签，不是新的门禁/枚举文件；未知 kind 显示 `unknown`。
- 真实 W run / rollup 已跑过一场 quick_factual；真实多 topic W run 是下一步观察项。
