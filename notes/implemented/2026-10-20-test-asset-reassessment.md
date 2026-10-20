# 测试资产与门禁聚合形态重估（2026-10-20）

> 状态：implemented

## 决定

维持两项既有形态，不在这轮做结构拆分：

1. **`tests/` 单目录平铺**：命名即层（`*.test.mjs` / `*-smoke` / `*-probe` / `*-gate`）与
   `pnpm test` 的 glob 选中机制不变。2026-10-20 实测 48 个测试文件、全绿约 1.3s；文件名
   逐词可检索，尚未出现"找测试靠猜"的实测痛点。**重估触发**：文件数 ≥60，或已知条目的
   机制名检索失败（要翻目录才知道断言住哪）。
2. **`scripts/verify/verify.mjs` 单文件聚合**：A–F 域内按域分组 + `gates` 数组同序的形态不变。
   2026-10-20 实测 43 门禁、域横幅可导航；`gates-smoke` 与 `gate-ledger-sync` 仍能覆盖。
   **重估触发**：门禁数 ≥55，或同一轮改动需要同时改 ≥3 个门禁块（编辑摩擦可举证）。

`scripts/lib/` 40 个支撑模块同样维持平铺 + `scripts/README` 逐件索引 + `navigability-contract`
覆盖；**重估触发**：索引超过两屏，或单模块被 ≥3 个域消费。

## 输掉的方案

- **现在把 tests/ 分 unit/contract/e2e 子目录**：glob 与 layering 守卫要同步改，且"同一命令
  跑全部 keyless"的简单性会丢；48 个文件尚未到检索失效的实测点（分域是触发式，不是默认）。
- **按域拆 verify.mjs 为 `gates/<name>.mjs` + 注册表**：契约面要同 diff 动 scripts/AGENTS、
  scripts/README、writing-a-gate、tests 对账四处，当前规模收益不抵 churn（2026-10-13 已记录，
  本次复核维持）。
- **scripts/lib 按域分组**：import 与索引全量改，收益是视觉分组；当前"一屏索引 + 消费者列"
  已把平铺转成按需进入，暂不付迁移成本。

## 实际跑过的验证

- `pnpm test`：48 个测试文件全绿（本轮新增 `docs-consistency` / `bundle-date-sanity` /
  `session-events` / `smoke-contract` 断言后实测）；`pnpm verify` 43 门禁全绿。
- `node scripts/smoke/gates-smoke.mjs`：注入案例全绿（含本轮新增 backlog 索引、归档退出值、
  `_abandoned/` 拒收行、`doc-budgets` 的 `_` 前缀路径案例）。
- `navigability-contract`：scripts/dev/fixtures 索引覆盖与 fixtures consumer 零孤儿仍绿。
- 未跑：没有做性能基准或大规模检索耗时测量——触发条件写的是"实测痛点"，不是猜。
