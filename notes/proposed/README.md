# proposed/ — RFC 停机坪（将来时：在飞队列条目的设计）

> **时态：将来**（设计稿，尚未交付）。放 **[_backlog/queue.md](../../_backlog/queue.md) §队列
> 条目的全文 RFC**（一文件一条目：
> 问题/方案/输掉的方案/验收判据）。队列行（queue.md §队列）只有排序与指针，发现与状态分家。
> **搁置条目不住这里**（2026-09-27 用户定调：搁置即"决定不做"，全文住
> [rejected/](../rejected/README.md) 并带重启条件，搁置池行直接链它）。

## 空目录 = 没有在飞条目（少见）

本目录与 [_backlog/queue.md](../../_backlog/queue.md) §队列双向挂链（`proposal-scheduled` 门禁
强制：每份 RFC 在 §队列有归宿；孤儿提案红）。接下来做什么仍只看
[queue.md §队列 ▶](../../_backlog/queue.md)（全仓唯一"当前"指针）。三个时态各住哪里，见
[notes/README](../README.md) 的时态表。

## 规则

1. 进门条件：[_backlog/queue.md](../../_backlog/queue.md) §队列有对应条目（verify 门禁
   `proposal-scheduled` 强制）；
2. 毕业：条目收尾时 RFC 迁 `notes/implemented/`（日期+主题命名），队列行删除——**毕业 =
   正文改写**（计划体 → 已交付事实体，见 [guides/60 §4](../../docs/guides/60-dev-loop.md)）；
   不再做的条目 → 否决迁 `rejected/`；
3. 状态行写在 RFC 自己头部，**裸值**（`> 状态：proposed` / `approved` / `superseded`，不带日期括号——
   其余 provenance 落正文），不写进队列索引；
4. 落地次序住队列行：多条 RFC 服务同一队列条目时，次序登记在该队列行——本目录按
   文件管理，文件名不携带次序（从名字看不出先后，以队列行为准）；
5. 用户直派的任务**不必**先进这里：决定已作出并随当前变更交付 → 直接进 `implemented/`；
6. 验收判据可检验化（[guides/60 §0 验收门](../../docs/guides/60-dev-loop.md)，D23）：每条
   判据绑定检查方式（机械门禁 / 契约测试 / 对账命令 / 人工判据四型），能机械的先立红再
   实现到绿；实施记录载实际跑过的红绿证据——无证据的"完成"不算毕业。
