# backlog 五段流水线：研究 → 定性 → 落地 → 审查 → 归档

> 状态：implemented

> 来源：用户 2026-11-02 请求——`_backlog/AGENTS.md` 与根 `AGENTS.md` 配合，状态驱动研究、定性、落地、
> 审查（可跳）与归档；全局决定 = `/tmp/D001-agent-work-item-lifecycle.md`（D001）。规则正文 =
> [_backlog/AGENTS.md](../../_backlog/AGENTS.md)（状态机）、[_backlog/README.md](../../_backlog/README.md)
> （工作路径/关闭）、[notes/AGENTS.md](../AGENTS.md)（收件/写入时机）、
> [issue-to-note](../../_backlog/methods/issue-to-note.md)（去向）。本篇只记为什么与验证。

## 决定

1. **五道门，三轨词汇。** 共享 `研究 → 定性 → 落地 → 审查/验收 → 归档`；issue 用
   `推敲中 → 待落地 → 已结`（+ `等人拍板`/`叫停`），bug 保持 `排查中 → 修复就绪 → 修复落地 → 已修`，
   research 题名页用 `调研中 → 已定性`（归档靠目录，不设 `已归档`）。不统一三轨状态名——bug 的
   `修复就绪` 同时是 P1/P2 修复授权，改名会丢授权边界。
2. **状态命名「已过哪道门」，不是「正在做什么」。** issue 不设 `落地中`：卡是判断记录，不是任务追踪器；
   `待落地` 期间就是落地，交付与 Note、归档同变更。执行可见性归会话 plan/todo（D19/D20）。
3. **`待落地` = ready，不是授权。** 守卫 = `结论倾向：现在做` + 非空 `## 验收标准` + `去向`
   （`proposed`/`implemented`）+ 方案；只用于 `现在做`。实施仍以用户请求/授权为准。
4. **审查是分层守卫，不是状态。** 机械门禁/测试不跳；语义自审按风险（入口链/门禁与验收合同/
   文档合同/pack 公共行为/D 号/P0-P1 必审）；用户验收按重要性。issue 不设 `待审`——需要用户时用
   `等人拍板`，否则状态行记 `审查：跳过 — 理由`；bug 的 `修复落地` 已是审查/证据位；research 的
   `已定性` 含证据评审。`审查：跳过` 不写成 verified。
5. **载体在 ready 门选择，Note 在交付时写。** `待落地` 只选去向：`proposed` RFC 与卡关闭同变更
   （卡已结 ≠ 批准，毕业才进 implemented）；`implemented` 卡留到交付，Note 与卡关闭同变更；
   `none`/`deferred` 不进 notes；`rejected` 仅有防复犯价值时进 `notes/rejected/`。交接期 `去向`
   目标写计划路径（inline code），载体成立时换 live link——否则 `md-links` 红。
6. **模板与初始 frontmatter 归各 README。** issue 的 `status: 推敲中`/`opened` 与 issue 模板在
   [_backlog/issues/README.md](../../_backlog/issues/README.md)；bug 的 `status: 排查中`/`severity`/
   `opened` 与 bug 模板在 [_backlog/bugs/README.md](../../_backlog/bugs/README.md)；research 题名页的
   `status: 调研中`/`opened`/`> 状态：`/`> 结论：` 在 [_backlog/research/README.md](../../_backlog/research/README.md)。
   `_backlog/AGENTS.md` 只拥有跨轨状态机与守卫，不复述模板。
7. **门禁补上已知缺口。** `backlog-liveness` 增：`待落地` 的 `结论倾向：现在做`、非空
   `## 验收标准`、`去向：proposed|implemented`；`修复就绪/修复落地` 的非空 `## 修复判据`；
   活跃 research 题名页的 `status`/`opened`/`> 状态：` 镜像、`已定性` 的非空 `> 结论：`。
   这正是此前注释里登记为 under-pressure 的 acceptance-presence 族。

## 输掉的方案

- **issue `落地中`**：把判断记录变成第二套任务追踪器，撞 D19/D20；执行状态归会话 plan/todo。
- **issue `待审`**：与 `等人拍板` 重叠，模糊「谁能移动/谁能验收」；审查是守卫不是状态。
- **research `待定性/已归档`**：前者没有独立动作、易滞留；后者与目录重复，正是
  [2026-10-30 Note](2026-10-30-backlog-research-threads.md) 反对的第二个位置状态。
- **给 research 材料加 status**：一份证据一个状态，制造第二状态源；材料的状态 = 题的状态。
- **统一三轨状态名**：丢掉 bug `修复就绪` 的授权边界。
- **backlog 变实施前置门**：撞 D19/D11；用户直派应直接执行。
- **`待落地` 写 implemented Note**：计划伪装成已交付事实。
- **`去向` 直接链未来 Note/RFC**：`md-links` 红；交接期用 inline code，关闭期换 live link。
- **把 `审查：跳过` 写成 verified**：完成定义失真。

## 实际跑过的验证

- **门禁红→绿**：先加 `tests/contracts/backlog-liveness.test.mjs` 新契约，跑出 3 个红
  （`待落地` invalid status、`修复就绪` 缺 `## 修复判据`、research 题名页缺 frontmatter）；扩
  `scripts/lib/backlog-liveness.mjs` 后 20/20 绿。
- **门禁自测**：`node scripts/smoke/gates-smoke.mjs` 全绿（对照组零注入全 PASS + 101 个注入案例
  均被点名报红）；新增 ready-issue / ready-bug / research-topic 控件与 4 个注入案例。
- **全量回归**：`pnpm test` 970/970 通过；`pnpm verify` 全绿（含 `md-links` 对新 Note 的 tracked
  要求——新 Note 已 `git add`；`md-anchors`/`note-format`/`doc-budgets` 均绿）。
- **入口链探针**：`source dev/env.sh && node scripts/probe/entry-chain-probe.mjs` 第一次 Q2 FAIL——
  模型答「RFC 只在出现‘需要显式评审的持久决定’时…」，语义正确但词面判据只认「持久决定…显式评审」
  的语序。按既有 lexical-recall 口径补反向语序 + 负例测试，第二次 ALL PASS；留档
  `runtime/smoke-workspace/entry-chain-probe-2026-11-02T14-39-59-711Z.md`。
- **预算**：`AGENTS.md` 138/140；`_backlog/AGENTS.md` 48/48；`notes/AGENTS.md` 52/52（50→52
  已在 `doc-budgets.json` 登记理由）。
- **不迁移**：归档卡与两张活跃 issue 未改状态；新状态由契约测试与门禁证明，首张自然卡再校准。
