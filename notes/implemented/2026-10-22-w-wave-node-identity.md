# W<wave>.<index> 节点与 WAVE 层（已落地）

> 状态：implemented
>
> 首提：2026-10-22 ｜ 用户 2026-10-22 纠正语义：W2 是 Wave 2，W2.1/W2.2 是层内节点；
> 设计卡（已结）：[_backlog/_archived/settled_issues/2026-10-22-w-wave-node-identity.md](../../_backlog/_archived/settled_issues/2026-10-22-w-wave-node-identity.md)
> ｜ 历史评审（W=工作包旧版，已降为历史）：[review](../../_backlog/research/dynamic-research-dag/2026-10-22-w-work-package-identity-review.md)

## 决定

**`W<wave>.<index>` 是身份：W2 是 Wave 2 分组，W2.1/W2.2 是层内节点，W2.1.1 是内部拆解。**

- **Wave 计算**：`W2` 是 `deps` 最长路径算出的拓扑层（1-based）；Wave 分组不是任务，不挂
  output/acceptance/task_id。单节点 Wave 也写 `W1.1`。
- **节点**：`W2.1/W2.2/W2.3` 是 Wave 2 的并行节点；`W2.1.1` 的 `parent` = `W2.1`，不升成
  新 Wave。`W2` 可被引用为整层（分组引用，不对应 task）。
- **ID/层一致**：顶层 W 节点 ID 前缀必须等于计算 Wave；`W3.1` 若只依赖 Wave 1 节点，实际在
  Wave 2 → `wave-prefix` 提示。跨 Wave 变化必须**重编号 + 写旧号别名**（`W2.1 → W3.2`），
  不静默保留旧前缀。
- **stage**：由节点 kind 派生（broad-scan→scan、deep-dive→dive、cross-check→check、
  synthesis→synthesis、review→review、gate→gate；未知 `unknown`），不加独立列。
- **lifecycle**：`active / retired / merged_into / superseded_by`；`topLevel` 过滤非 active，
  `byId` 保留墓碑；墓碑不画图。
- **结构提示**：`wave-prefix`、`legacy-flat-w`、`mixed-family`、`child-prefix`、`too-deep`、
  `cross-group-child-dep`、`retired-dep`、`tombstone-without-successor`。
- **Team 映射**：Agent Teams 仍是平铺 DAG，不建 nested Team。每个**节点** W2.1 建一个 task；
  Wave 分组不建 task。复合节点（有 W2.1.1 子节点）用 rollup task，`blocked_by` = 外部依赖
  task + 已建子任务；纯分析子步骤 plan-only；跨 Wave 子依赖禁止并提升。
- **UI**：恢复 `WAVE n` 标签；按 Wave 泳道分组，卡片显示 `W2.1`；复合节点详情显示
  `W2.1.1`；复制 `drt_<slug>/W2.1`；刷新从 30s 降到 5s。
- **兼容**：旧 N（N1…）与旧 flat W（W1…W10，无 `.index`）只读；`legacy-flat-w` 提示；
  新 plan 只用 `W<wave>.<index>`，不与旧形态混写。

## 输掉的方案

- **W=稳定工作包、LAYER=层（上一版）**：把并行节点写成 W2/W3/W4/W5，用户必须自己心算哪几个
  同层；W2.1 才是读者真正想要的名字。已废弃。
- **把 Wave 分组当任务**：Wave 无 output/owner/task；强行挂 task 会让 Team 板出现空壳。
- **W 前缀不随层变化**：`W2.1` 实际在 Wave 3 时前缀说谎；必须重编号+别名。
- **手写 LAYER 表**：与图按 deps 算的 Wave 争同一事实；plan 只写节点/deps，说明性层可标“示意”。
- **旧 flat W 静默迁移**：当前正在跑的 plan/Team task 会断；标 legacy，不自动改写。
- **nested Team / 跨 Wave 子依赖直连**：vendor 不支持 / 顶层 Wave 图会静默丢边。

## 实际跑过的验证

- `pnpm typecheck`：通过；pack client/host 构建通过。
- `pnpm test`：通过；`tests/cockpit/plan-graph.test.mjs` 覆盖 `W1.1/W2.1/W2.2/W2.1.1`、
  `wave-prefix`、legacy flat W、stage、lifecycle。
- `pnpm verify`：全绿（含 `pack-workspace-fresh`、`backlog-liveness`、`md-links`）。
- `preset-smoke`：ALL PASS。
- `client-load-smoke`：ALL PASS（WAVE 文案断言）。
- 临时 Wave plan 浏览器走查：`WAVE 2 · 2 个并行`、`W2.1/W2.2` 并排、无 LAYER；随后恢复 plan。
- **真实 run 现状**：`drt_gha-ubuntu-latest` / `drt_cn-us-ai-models-hardware` 的 plan 是旧 flat W
  （W1/W2…）或旧 N；按本 Note 标 legacy，不冒充 Wave 新格式。新 Wave plan 的完整真实 run 是下一步
  观察项。

**未跑项**：真实新格式 Wave run、真实 B rollup 在多 Wave 下的执行；不得说成已通过。

## 环境状态与已知限制

- 旧 flat W 计划（含正在跑的 `drt_cn-us-ai-models-hardware`）不自动重编号；图显示 `legacy-flat-w`
  提示，Wave 分组以 deps 计算为准。
- `W2` 是分组引用；复制引用到具体节点用 `W2.1`，不要给 Wave 头建 task。
- 手写 Wave/层说明只作“示意/非权威”；计算值归 graph。
