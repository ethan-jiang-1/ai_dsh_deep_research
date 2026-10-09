# 推敲：有了 `_backlog` 之后，roadmap.md 是否退役

> 状态：毕业（2026-09-28 用户裁决：退役——规划面单一化）｜毕业门判断 = 该做（退役；用户裁决推翻本卡初版"倾向保留"，反证论据随正文永久保留）｜去向 = [毕业 Note](../../../notes/implemented/2026-09-28-backlog-deliberation-space.md)（D19/D20，同变更执行本卡裁决）

## 背景 / 触发

2026-09-28 `_backlog/` 落地会话中用户提出：有了推敲空间，roadmap.md 似乎不再必要、把流程
搞复杂了。立卡来源 = 用户对话（「值得推敲但未到裁决」）。

## 已知与未决

已核实（带出处）：

- `_backlog/` 红线（[规矩手册](../../README.md)）：只载判断材料，**不载次序与授权**——次序唯一 =
  roadmap §队列。删 roadmap 则"次序唯一"无家，`_backlog` 被迫客串调度器 = company D23
  病因复发（plans 层长成第二个队列）。
- roadmap 独有职责：▶ 当前指针（[入口链](../../../AGENTS.md)第 3 步 +
  [guides/60 §7 中断恢复](../../../docs/guides/60-dev-loop.md) 的首位真相 +
  `entry-chain-probe` 的真值锚）、已批条目有序索引、可执行性标注（等人/可自主 → 取题 vs
  开工）、parked 态、搁置池行、`proposal-scheduled` 与 `queue-pointer-live` 的配对归宿面。
- 借鉴源 company 在 D31 立 `_backlog` 的同日**保留** ROADMAP.md 并加防误取句——两层互补
  是借鉴源的选择（采纳度为信号）。
- 本仓队列当前很薄——"roadmap 显得重"的体感主要来自队列条目少，不是层冗余。

未决：roadmap 头部机制是否可精简；搁置池表达是否可更轻（候选 D 的余量）。

## 候选与取舍

- **A 保留两层（当前倾向）**：互补非冗余——`_backlog` 管"该不该"，roadmap 管"何时与当前"；
  门禁网挂载其上，拆除成本远大于维护成本。
- **B 删 roadmap、队列并入 `_backlog`**：违反 `_backlog` 红线，第二个队列复发；中断恢复
  失去 ▶ 锚。
- **C 删 roadmap、▶ 移入根 AGENTS.md**：会腐烂的状态进每轮常驻的预算文件，status rots
  与行数预算双输。
- **D 保留但精简头部/搁置池**：真正的可推敲余量；若做须同 diff 重校
  `entry-chain` / `queue-pointer-live` / `proposal-scheduled` 三面。

## 毕业门

- **保留（消化）**：用户对本倾向点头 → 本卡关闭迁 `_done/_closed_plans/`，结论并入
  `_backlog/README.md` 红线（红线已在，消化 = 补确认句）。
- **退役**：须先证 ▶ / 可执行性 / parked / 搁置池 / 两道配对门禁各有新家，且全部反证跑绿
  ——目前一项都不成立。
