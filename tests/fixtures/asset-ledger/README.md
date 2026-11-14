# asset-ledger/ · 测试资产组合账

> 组宪章：`ledger.json` 由 [dev/record-asset-ledger.mjs](../../../dev/record-asset-ledger.mjs) 生成，
> 消费 = [asset-ledger.test.mjs](../../checks/asset-ledger.test.mjs) 与 [guard-ledger.test.mjs](../../checks/guard-ledger.test.mjs)（双向对账，漂移或矛盾 = 红）。

## 口径

每个 `tests/**/*.spec.mjs` + `tests/checks/*.test.mjs` 一条：
`path / domain / lane / class / cost / uniqueClaim / oracleType / sunset`。

- `class`：`check-gate`（`tests/checks/`）、`vendor-compat`（`tests/vendor/`）、`contract`（`tests/contracts/`）、`unit-pure`（其余进程内单测）。
- `cost`：进程内 keyless 资产统一为 `fast-inproc`；慢资产（`*.e2e.mjs` / `*.entry.mjs`）归 [scripts/smoke/registry.json](../../../scripts/smoke/registry.json) 记账。
- `uniqueClaim` = 头注首个非「负例留证 / 夹具留证」注释行；没有则取首个 `test()` 标题。
- `oracleType` 由 [asset-ledger.mjs](../../../scripts/lib/asset-ledger.mjs) 基于 TypeScript AST import 图与语法节点自动推导（**禁手写 `OVERRIDES` 覆盖字典**）：
  - `external`：直接引入外部语法/规范编译器或共享外部 AST 适配层（`typescript`、`mdast-util-from-markdown`、`yaml`、`keyless-imports`、`workspace-parsers`、`ci-workflow`）；
  - `canonical`：核验盘上规范正本、契约层或跨模块双读者/编解码一致性；
  - `structured`：经受控运行时 / VM / 假 DOM / 临时文件系统 / JSON 事件流或协议信封核验；
  - `self-referential`：仅对单一被测模块喂入内联样例的测试（显式可见的下一轮迁移面）。
- `sunset`：按车道与领域给定退役触发条件；smoke 资产的 `sunset` 由 `scripts/smoke/registry.json` 拥有。

## 冻结

增删测试、改头注或改 import 结构 → 重跑 `node dev/record-asset-ledger.mjs`；`--check` 只比对不写。禁止手改 JSON 凑绿。
