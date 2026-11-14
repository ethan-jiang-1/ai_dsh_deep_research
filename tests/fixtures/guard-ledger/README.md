# guard-ledger/ · 守卫的 oracle 与红配方台账

> 组宪章：本组是 D55 的**上升闸**——每张入账缺陷卡必须登记：
> 机制、`guard` 路径、`oracleType`、状态与红配方（或 `deferred` 的 `reason` + `trigger`），并与 [asset-ledger](../asset-ledger/README.md) 双向对账。
> 消费 = [guard-ledger.test.mjs](../../checks/guard-ledger.test.mjs)。

## 为什么

「有没有测试」只能证文件在场；本仓曾反复出现的漏检来自**自指 oracle** 或「台账手工填一套 `oracleType`、资产账填另一套」。
本台账要求：
1. 每个 `tests/` 守卫文件的 `oracleType` **必须与 `asset-ledger` 的 AST 推导值严格全等**（零矛盾）；
2. 该守卫文件内必须真有声明对应 `BUG-nnn` 的 `test()` 标题（同时受 `guard-red-record` 门禁约束必须给出 `// 负例留证` 或 `// 夹具留证`）；
3. `self-referential` 若存在，只允许标为 `provisional` 且必须携带 `trigger`。

## 字段

| 字段 | 含义 |
|---|---|
| `mechanism` | 要守的机制（一句话，不照抄卡标题） |
| `guard` | 守卫测试路径；`deferred` 必须为 `null` |
| `oracleType` | `external` / `canonical` / `structured` / `self-referential` / `smoke-only` / `none` |
| `status` | `closed` / `partial` / `provisional` / `deferred` |
| `redRecipe` | 怎么让它变红（非 `deferred` 必填） |
| `reason` / `trigger` | `partial` / `deferred` 必填；`self-referential` 必填 `trigger` |

## 覆盖与冻结

- 覆盖范围 = 失败类普查 D-1 + D-2 + 探索批 A–D（`BUG-160..190`）全量闭集；缺条目、路径失效、未绑定 `test()` 标题或与 `asset-ledger` 的 `oracleType` 失配 = `guard-ledger.test` 红。
- 新增已修卡若纳入本账，须同 diff 补测试标题声明、留证块与台账条目。
