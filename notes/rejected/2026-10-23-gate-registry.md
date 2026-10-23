# 门禁 registry（停在定向扫描，未做全量重构）

> 状态：rejected
>
> 首提 2026-10-23 ｜ 测量对象 [verify.mjs](../../scripts/verify/verify.mjs) ·
> [gates-smoke.mjs](../../scripts/smoke/gates-smoke.mjs) ｜ 台账 [evaluation §L0](../../docs/evaluation.md)

## 原方案

把 43 条门禁抽成 `{ name, why, check() → findings[] }` 的 descriptor + runner，支持
`--gate <name>` / `--json`；`gates-cases` 的 77 个注入案例只跑目标门禁 + 对照，而不是每个案例
spawn 整账；`gates` 数组、evaluation 表、`CASES`、`verify-gates` 静态对账从四处收成一处。
先抽 5 条验证，再决定是否全量。

## 否决理由

- **测量不支持**：2026-10-23 定向扫描落地后，`verify` 暖跑中位 **1.42s**（改前 3.5s）；
  `gates-smoke` **2m28s**（77 案例 + 4 对照），只在改门禁时跑，不在 pre-commit 热路径。
  真正的全树 walk 成本已在 P2 用 `walkMany` + 惰性 `allFiles` 消掉。
- **风险不对称**：43 条门禁 / 1712 行是当前最强的安全网；registry 是一次大爆炸式重排，
  收益是“加门禁少改两处 + 案例跑得快”，代价是可能把门禁本身改红。
- **半吊子 `--gate` 不划算**：不先做 registry 的话，要让 43 个匿名块逐个加条件，仍是 43 处编辑；
  做了 registry 又等于全量重构。中间态没有足够杠杆。
- **注册漂移已有机械对账**：`gate-ledger-sync`（数组 ↔ evaluation 表）与 `verify-gates`
  （案例 ↔ 数组）已经拦住主要漂移；尚未出现这两道没拦住的真实事故。

## 复活条件

- 门禁数增长到 > 60，或 `gates-smoke` 超过 5 分钟、被纳入每次提交；
- 出现一次真实的注册面漏改事故（evaluation 表 / `CASES` / 数组不同步）且现有对账门禁没拦住；
- 需要单门禁 CI、JSON 报告或第三方消费门禁结果。
