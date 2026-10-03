# Leads — fixture-leads-healthy

## 方向: T1 — 官方通道可达且可定位上一修订

- 状态: 建议挖深
- 支持来源: [https://example.com/a](https://example.com/a)（A）
- 关键线索: 版本页 `The current protocol version is 2026-07-28.`
- 建议 owner: analyst-1（对应 topic: T1）

## 方向: T2 — 总量必须翻页自算

- 状态: 建议挖深
- 支持来源: [https://example.com/b](https://example.com/b)（B）；[https://example.com/c](https://example.com/c)（A）
- 关键线索: 响应顶层 `{"servers":[…]}`，无 total 字段
- 建议 owner: analyst-2（对应 topic: T2）

## 方向: T3 方向 — 第三方聚合站口径混杂

- 状态: 已排除（聚合站非一手，30 秒去留判丢弃）
