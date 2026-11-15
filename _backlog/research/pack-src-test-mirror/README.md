---
status: 已定性
opened: 2026-11-15
---

# pack src ↔ 测试：目录名对齐

> 状态：已定性
> 问题：`packages/deep-research-pack/src` 的目录与 `tests/` 的目录如何做到同名对齐，让 agent 从源码路径直接推出测试路径；范围、成本与第一步是什么。
> 消费者：[issue 2026-11-15-pack-src-test-mirror](../../issues/2026-11-15-pack-src-test-mirror.md)
> 产出的卡：[issue 2026-11-15-pack-src-test-mirror](../../issues/2026-11-15-pack-src-test-mirror.md)
> 结论：**目录名对齐优先，家族按 domain 切**（用户 2026-11-15 定调：不按技术形态、不短视）。pack 侧 7 个 domain = `run` / `plan` / `journal` / `method-library` / `review` / `presentation` / `shared`；`src/lib/<domain>/` ↔ `tests/cockpit/lib/<domain>/`、`src/client/<sub>/` ↔ `tests/cockpit/client/<sub>/`、`src/<surface>/` ↔ `tests/pack/<surface>/`；`faces.json` 留根；跨切住 `tests/cockpit/shared/`，合同件住 `tests/pack/contract/`。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-15-pack-src-test-mirror.md](2026-11-15-pack-src-test-mirror.md) | 盘点、跨树 import 成本、客户端/库/产品面三块的建议形状与分步 | 2026-11-15 |
