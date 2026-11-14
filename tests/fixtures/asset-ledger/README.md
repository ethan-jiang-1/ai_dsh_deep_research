# asset-ledger/ · 测试资产组合账

> 组宪章：`ledger.json` 由 [dev/record-asset-ledger.mjs](../../../dev/record-asset-ledger.mjs) 生成，
> 消费 = [asset-ledger.test.mjs](../../checks/asset-ledger.test.mjs)（重算对账，漂移 = 红）。

## 口径

每个 `tests/**/*.spec.mjs` + `tests/checks/*.test.mjs` 一条：
`path / domain / lane / claim / oracleType / sunset`。

- `claim` = 头注首个非「负例留证」注释行；没有则取首个 test 标题。
- `oracleType`：`external`（真实工具/录制 oracle）、`structured`（结构化字段/编译器/VM）、
  `canonical`（规范形/源合同）、`self-referential`（例子测试，默认）。
  显式覆盖表在 `scripts/lib/asset-ledger.mjs` 的 `OVERRIDES`；验证层资产不得默认自指。
- `sunset` 默认「随被测模块删除」；smoke 的 sunset 仍由 `scripts/smoke/registry.json` 拥有。

## 冻结

增删测试或改头注 → 重跑生成器；`--check` 只比对不写。不要手改 JSON 来凑绿。

## 当前读数（2026-11-14）

208 个资产：`self-referential` 194、`canonical` 5、`structured` 7、`external` 2。
自指占比高不是失败，是**下一轮迁移面**——组合账让它可见，不再靠猜。
