# _done/ · 归档（位置即状态；fresh agent 默认忽略，点名才读）

> 已毕业的推敲卡、已修复的缺陷卡与**暂停件**（暂停非完成）住这里。`git mv` 迁入、
> 文件名不变、内容不重写——迁移时只在卡的状态行补去向指针（暂停不加判断）。**Next BUG
> ID 权威在本文件**（编号权威住归档侧）；各池索引住在子目录 README。规矩手册 =
> [`../README.md`](../README.md)。

## 目录

- [_closed_plans/](_closed_plans/README.md) — 已毕业推敲卡（无编号，按 `YYMMDD-slug` 查）
- [_suspended_plans/](_suspended_plans/README.md) — 暂停的推敲卡（未裁决、非完成，重启条件随卡）
- [_fixed_bugs/](_fixed_bugs/README.md) — 已修复缺陷卡（逐行索引）
- [_suspended_bugs/](_suspended_bugs/README.md) — 暂停缺陷卡（已查明、修复未确认，编号保留）
- [_reference/](_reference/README.md) — 随毕业卡归档的推敲资料（无编号，按 slug 查）

**Next BUG ID: BUG-003**（新号 = 已分配最大号 + 1，活跃 [_fixed_bugs/](_fixed_bugs/README.md)
∪ [bugs/](../bugs/README.md) 一起算）
