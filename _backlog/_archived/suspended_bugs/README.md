# _suspended_bugs/ · 暂停的缺陷卡（已查明、修复未确认）

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入：调查过、**修复未确认**的缺陷卡，
> 编号保留（不释放 BUG id）。文件名不变、内容不重写。规矩手册 =
> [`../../README.md`](../../README.md)；编号权威仍 = [`../README.md`](../README.md)
> （Next BUG ID，活跃 ∪ 全部归档池一起算）。
>
> **纪律**：暂停需有用户明示；重启 = `git mv` 回活跃区，并按记录的重启条件重新判断。

## 索引

| BUG | 标题 | 为何暂停 |
|---|---|---|
| [BUG-022](BUG-022-provider-stream-malformed-turn-kill.md) | 上游流畸形事件当场终结回合——run 停摆主因（previously P1） | 上游只读 seam，本仓修不了；本地已落=有界重试缓解 + 统计仪器 + 恢复工具 + 恢复程序；重启条件见卡内（重试出现但终局不降／换 pin 后未修／新畸形形态） |
