---
status: 已定性
opened: 2026-11-15
---

# pack src ↔ 测试：目录名对齐

> 状态：已定性
> 问题：`packages/deep-research-pack/src` 的目录与 `tests/` 的目录如何做到同名对齐，让 agent 从源码路径直接推出测试路径；范围、成本与第一步是什么。
> 消费者：[issue 2026-11-15-pack-src-test-mirror](../../issues/2026-11-15-pack-src-test-mirror.md)
> 产出的卡：[issue 2026-11-15-pack-src-test-mirror](../../issues/2026-11-15-pack-src-test-mirror.md)
> 结论：沿用 owner 轴（已由 [implemented Note](../../../notes/implemented/2026-11-15-test-source-mirror.md) 定案），pack 侧按「源码相对路径」镜像：`src/lib/<family>/` ↔ `tests/cockpit/lib/<family>/`、`src/client/<sub>/` ↔ `tests/cockpit/client/<sub>/`、`src/<surface>/` ↔ `tests/pack/<surface>/`；跨切 spec 住 `tests/cockpit/shared/`；零源码改名的第一步 = 只给 `src/lib` 分家族目录并同步测试。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-15-pack-src-test-mirror.md](2026-11-15-pack-src-test-mirror.md) | 盘点、跨树 import 成本、客户端/库/产品面三块的建议形状与分步 | 2026-11-15 |
