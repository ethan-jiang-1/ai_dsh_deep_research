# guard-ledger/ · 守卫的 oracle 与红配方台账

> 组宪章：本组是 S1/S3 的**上升闸**——每条旧账/新卡的守卫必须登记：
> 机制、guard 路径、`oracleType`、状态、红配方（或 deferred 的 reason + trigger）。
> 消费 = [guard-ledger.test.mjs](../../checks/guard-ledger.test.mjs)。

## 为什么

“有没有测试”只能证在场；本仓的反复失败是**自指 oracle**（实现、测试、期望同一心智模型）。
本台账把 oracle 类型显式化，让 `self-referential` 永远是**临时态**（必须带 trigger），
并让“哪些旧账还没沉淀”一眼可数。

## 字段

| 字段 | 含义 |
|---|---|
| `mechanism` | 要守的机制（一句话，不抄卡标题） |
| `guard` | 守卫路径；deferred 必须为 null |
| `oracleType` | `structured` / `external` / `canonical` / `self-referential` / `smoke-only` / `none` |
| `status` | `closed` / `partial` / `provisional` / `deferred` |
| `redRecipe` | 怎么让它红（非 deferred 必填） |
| `reason` / `trigger` | partial/deferred 必填；self-referential 必填 trigger |

## 覆盖与冻结

- v1 覆盖 = 普查 D-1 的 24 张 + 批次 D（187–190... 即 184–190）；扩批时同 diff 加条目，
  缺条目 = `guard-ledger.test` 红。
- 台账可手改，但**改条目必须同步测试/守卫**；`closed` 的 guard 路径必须存在。
- `self-referential` 只许临时：S2b 的录制式 CI oracle 落地后，184/187/190 三条改为 external。
