# _backlog · 问题、证据与交接

这里记录尚待弄清的问题、缺陷与依据；卡片承载问题边界、查证结果、判断和必要交接。它不是实施授权，也不是所有开发任务的前置门。用户直派且已授权的工作按授权范围执行；需澄清、查证或持久交接时再使用对应载体。

**与 notes 的边界。** backlog 负责提出问题、形成有依据的结论和按需申请后续处理；[notes](../notes/README.md) 负责决定是否需要持久决定记录以及如何处理。不是每张 issue 都成为 Note。申请已提交并记录接收方后，卡可按关闭条件归档，不等待下游接受或加工。RFC 仅用于需要显式评审的持久决定，不要求关联 queue 行，也不是实施工作的普遍前置。

## 工作路径

1. **入口与范围：** 找到相关 [issue](issues/README.md)；确认是缺陷且本次不修的，使用 [bug](bugs/README.md)。没有合适的记录才新建。直派实现任务可直接按用户授权执行。
2. **澄清与证据：** 缺事实时读代码、查来源或做可逆试验；缺用户判断时提交清楚的选择与影响。短结论回卡，较长依据放 [research](research/README.md)。方法步骤见 [methods](methods/README.md)。
3. **综合：** 记录真实考虑过的选项、取舍、结论、范围与关闭条件。决定做的事项写可核验验收标准；延后或不做的事项记录条件或理由，不伪造实现计划。
4. **交接或关闭：** 需要下游处理时，在卡上写明申请内容、日期与接收方；默认在本轮回复中提交卡片链接，用户已指定接收方时按指定去处处理。已有结论足以答复且无需继续处理时，留来源链接即可。

状态、结论、候选步骤和交接申请都不授予实施权限。已经获得授权的工作不因 backlog 卡片而重新请批。已授权且确需跨步骤/跨会话排序时，可以把有效 issue 或 proposed RFC 登记到可选 [queue](queue.md)；queue 不授权，也不代表全部当前工作。

## 关闭与归档

关闭是一项**推敲/交接状态**，不是实施验收：结论明确、需要的用户确认已获得、下游申请已提交并记录去向，或结论已可直接回答且留有依据，方可关闭。若实施仍在进行或尚待技术验收，卡片须明确保留该缺口；不得用归档暗示交付已验收。

| 结果 | 处理 |
|---|---|
| 有结论 | 迁至 [_archive/settled_issues](./_archive/settled_issues/README.md)，保留文件名与讨论正文，补状态、去向并更新索引 |
| 用户明确叫停但尚无结论 | 迁至 [_archive/suspended_issues](./_archive/suspended_issues/README.md)，重新讨论需新的明确决定 |
| 缺陷已修 | 迁至 [_archive/fixed_bugs](./_archive/fixed_bugs/README.md) |
| 缺陷确认但未修 | 迁至 [_archive/suspended_bugs](./_archive/suspended_bugs/README.md) |
| 不再有活跃消费者的研究 | 迁至 [_archive/research](./_archive/research/README.md) |

搬迁用 `git mv`，保留历史正文，修复必要的相对链接并更新来源和目标索引。旧记录不为适配新模板而重写。研究仍被活跃 issue、bug 或已授权工作消费时，留在活跃 research 并登记消费者。

## 载体导航

| 载体 | 用途 | 主要约定 |
|---|---|---|
| [issues](./issues/README.md) | 未结束的问题及决定过程 | 新卡 `YYYY-MM-DD-<slug>.md`；活跃状态与可关闭边界见模板 |
| [bugs](./bugs/README.md) | 已知但决定不当场修复的缺陷 | `BUG-<NNN>-<slug>.md`；保留编号与严重级 |
| [research](./research/README.md) | 服务卡片的较长证据材料 | `topic`、一行 `intent`；不设 status |
| [methods](./methods/README.md) | 澄清、查证、综合、验收与交接方法 | 按当前缺口选择，不默认每卡走完整流程 |
| [triggers](./triggers.md) | 会自然遇到、可能改变旧决定的具体观察 | 可选短索引，完整理由留 owner |
| [_archive](./_archive/README.md) | 已离开活跃区的卡片与研究 | 按结果分池并维护各自索引 |

新 issue frontmatter 顺序为 `status`、`opened`；bug 为 `status`、`severity`、`opened`；research 为 `topic`、`intent`，不可带 `status`。历史归档可保留旧形态。各 README 是对应文件清单；`pnpm verify` 的结构检查只证明被检查的形状，不证明卡片判断、证据质量、用户授权或实施验收。

状态行标有 🔒 的触发条件只能由用户判定。归档默认不展开阅读；从索引或来源卡片按需进入。
