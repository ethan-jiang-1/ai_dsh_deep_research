# _backlog · 问题、证据与去向

这里记录尚待弄清的问题、缺陷与依据；卡片承载问题边界、查证结果、判断和去向。它不是实施授权，也不是所有开发任务的前置门。用户直派且已授权的工作按授权范围执行；需澄清、查证或持久记录时再使用对应载体。子树指令门牌 = [AGENTS.md](AGENTS.md)（状态机/frontmatter 正本）；本页 = 工作路径、关闭/归档与载体导航。

**与 notes 的边界。** backlog 负责问题、证据与结论；结论是否需要持久记录、进入哪个载体，按 [结论去向](methods/issue-to-note.md) 选择，[notes](../notes/README.md) 按收件规则落地。不是每张卡都成为 Note；RFC 只在需要显式评审时使用。`去向` 行是去向记录：`proposed` 卡在 RFC 成立时关闭，`implemented` 卡留到交付并与 Note 同变更关闭；不另设收件箱/队列。结论去向不改变质量责任：issue 的业务验收、bug 的产品可接受性（P0/触面例外由用户拍板）归用户；严重级分诊与技术证据归 agent。

## 工作路径

1. **入口与范围：** 找到相关 [issue](issues/README.md)；确认是缺陷且本次不修的，使用 [bug](bugs/README.md)——当场修掉的不建档（边界细则见该页「边界」节）。没有合适的记录才新建。直派实现任务可直接按用户授权执行。
2. **澄清与证据：** 缺事实时读代码、查来源或做可逆试验；缺用户判断时提交清楚的选择与影响。短结论回卡，较长依据放 [research](research/README.md)。方法步骤见 [methods](methods/README.md)。
3. **综合与定性：** 记录真实考虑过的选项、取舍、结论、范围与关闭条件。`现在做` 写非空 `## 验收标准`，票齐后翻 `待落地`（准备进开发，**不是授权**）；延后或不做的事项记录条件或理由，不伪造实现计划。
4. **去向与关闭：** 在 `待落地` 按 [结论去向](methods/issue-to-note.md) 选 `去向`（`proposed` RFC / `implemented` Note；`none`/`deferred`/`rejected` 为关闭出口），在卡上记一行 `去向：` 与目标。交接期目标写计划路径（inline code），关闭/载体成立时换 live link；`implemented` 留到交付并与 Note 同变更关闭，满足关闭条件后归档。

## 入口两张票

两条轨道共用同一道加工入口票，随格式承载、缺一不入：

1. **问题清楚**——问题、范围、排除项与当前情况写在卡上，与假设和建议分开；
2. **验收手段在场**——issue 卡结论倾向为「现在做」时写 `## 验收标准`（[验收设计](methods/validation-design.md)，翻 `待落地` 前非空）；缺陷卡翻「修复就绪」前写 `## 修复判据`（[bugs](bugs/README.md)）。

## 缺陷修复通道

延后建档的缺陷卡沿固定通道走到已修，每一站是 frontmatter `status` 的一个值（翻转表 = [bugs](bugs/README.md)）：**排查中 → 修复就绪 → 修复落地 → 已修**。

翻到**修复就绪**（根因有证据确认 + 修法选定 + `## 修复判据` 写就）即两张票齐，该翻转同时是修复授权（用户裁定 2026-10-12）：P1/P2 修理型修复可凭卡自授权落地，当轮交付记录即落地凭证；**P0 缺陷，或修复触及入口链、门禁与验收合同、文档合同、pack 公共行为或已记录决定（D 号）的，不自授权**——卡转 `等人拍板`，修复按用户指示或随 issue RFC 落地。`修复落地` = 修复已进树、`## 修复判据`/证据/审查未过；`已修` = 修复判据满足且证据已记录，与归档同次变更。`修复就绪/修复落地` 的判据非空由门禁检查。修复后回归 = 引用旧卡的新卡，不重开已修卡。

**根因纪律。** 模板里的根因是假设，直到证据确认（session bundle、git 历史、对照实验）；被证伪的假设连撤回记录一起留在卡上——撤回本身是证据。severity 同时是通道边界：P0 永不自授权。

## 状态生命周期

状态机、frontmatter 与翻转守卫 = [AGENTS](AGENTS.md)（唯一正本）。本页只记工作路径与关闭/归档：目录只分活跃/归档；`status` 单值、状态行镜像、沉默不翻转、退出值随归档翻转、已结/已修永不重开。

## 关闭与归档

关闭是一项**推敲/去向状态**，不是实施验收：结论明确、需要的用户确认已获得、`去向` 已记录且载体成立，或结论已可直接回答且留有依据，方可关闭。`proposed` 卡在 RFC 成立时关闭；`implemented` 卡留到交付，Note 与卡关闭同变更；`待落地` 不是授权。若实施仍在进行或尚待技术验收，卡片须明确保留该缺口；不得用归档暗示交付已验收。

| 结果 | 处理 |
|---|---|
| 有结论 | 迁至 [_archived/settled_issues](./_archived/settled_issues/README.md)，保留文件名与讨论正文，补状态、去向并更新索引 |
| 用户明确叫停但尚无结论 | 迁至 [_archived/suspended_issues](./_archived/suspended_issues/README.md)，重新讨论需新的明确决定 |
| 缺陷已修 | 迁至 [_archived/fixed_bugs](./_archived/fixed_bugs/README.md) |
| 缺陷确认但未修 | 迁至 [_archived/suspended_bugs](./_archived/suspended_bugs/README.md) |
| 不再有活跃消费者的研究题 | 整目录迁至 [_archived/research](./_archived/research/README.md)（题名页补归档行） |

搬迁用 `git mv`，保留历史正文，修复必要的相对链接并更新来源和目标索引。旧记录不为适配新模板而重写。研究题仍被活跃 issue、bug 或已授权工作消费时，留在活跃 research 并登记消费者；研究题整目录搬迁，不拆材料。

## 载体导航

| 载体 | 用途 | 主要约定 |
|---|---|---|
| [issues](./issues/README.md) | 未结束的问题及决定过程 | 新卡 `YYYY-MM-DD-<slug>.md`；活跃状态、结论倾向与可关闭边界见模板 |
| [bugs](./bugs/README.md) | 已知但决定不当场修复的缺陷 | `BUG-<NNN>-<slug>.md`；保留编号与严重级 |
| [research](./research/README.md) | 服务卡片的较长证据材料 | 按研究题分目录；题名页记状态 / 问题 / 消费者 / 结论 / 产出的卡 / 材料；材料 `topic`、一行 `intent`，不设 status |
| [methods](./methods/README.md) | 澄清、查证、综合、验收与结论去向方法 | 按当前缺口选择，不默认每卡走完整流程 |
| [triggers](./triggers.md) | 会自然遇到、可能改变旧决定的具体观察 | 可选短索引，完整理由留 owner |
| [_archived](./_archived/README.md) | 已离开活跃区的卡片与研究 | 按结果分池并维护各自索引 |
| [_done](./_done/README.md) | 改名兼容指针（旧归档入口 → `_archived/`） | 自述页，不新增内容 |

新 issue frontmatter 顺序为 `status`、`opened`；bug 为 `status`、`severity`、`opened`；research 题名页为 `status`、`opened`（模板 = 各 README），材料为 `topic`、一行 `intent`，不可带 `status`。历史归档可保留旧形态。各 README 是对应文件清单；`pnpm verify` 的结构检查只证明被检查的形状，不证明卡片判断、证据质量、用户授权或实施验收。

状态行标有 🔒 的触发条件只能由用户判定。归档默认不展开阅读；从索引或来源卡片按需进入。
