# _backlog · 规划面（推敲 + 次序一个家，分半区）

> 性质：**唯一规划面**（2026-09-28 用户裁决 roadmap.md 退役，D20）。两个半区：
> **推敲半区**（plans/ · bugs/）——点子进入 RFC / 队列 / 实施之前的思考加工层，「该不该做、
> 何时做、次序如何、是否放弃」四问在这里成熟；**次序半区**（[queue.md](queue.md)）——已批准
> 条目的有序索引 + 搁置池，全仓唯一"当前"指针。**推敲卡只载判断材料（问题、证据、候选、
> 取舍），不载次序与授权**：次序唯一 = queue.md §队列，授权唯一 =
> [guides/60](../docs/guides/60-dev-loop.md)。company D23 教训：plans 层一旦开始排任务就会
> 长成第二个队列——推敲半区永远不做调度。来源：借鉴 `ai_dsh_company` `_backlog`（D31，其
> 源头 = `ai_deerflow_deep_research_v2`）；**2026-10-03 二轮借鉴** = `ai_dsh_loop_advisor/
> _backlog`（其 trunk 框架 / reference 区 / suspended 池又借自 `ai_deerflow_dr_v3/_backlog`
> 同日版本）——主干框架、reference/ 资料区、暂停池语义、宪章/账本分离、回写规矩本轮采纳
> （登记 = [borrow Note](../notes/implemented/2026-10-03-backlog-governance-borrow.md)）；
> 判定、取舍与本仓裁定（根目录 / 全三件 / plans 卡日期编码 / 规划面单一化）=
> [毕业 Note](../notes/implemented/2026-09-28-backlog-deliberation-space.md)。

## 主干：缓冲 → 毕业 → 生产线 → 回写（2026-10-03 借鉴，一次说全）

`_backlog/` 是**机加工前的打磨场**；[notes/](../notes/README.md) 是**生产线**（RFC =
加工单，implemented = 决定记录）。一条主干：

```
入口面（半成品合法——缓冲收问题、证据、缺陷、原始调研）
  ├─ 设计/分析推敲        → plans/    （背景 → 已知/未决 → 候选 → 毕业门）
  ├─ 缓修缺陷             → bugs/     （症状 → 根因 → 牵出类 → 修复关联）
  └─ 推敲过程中攒的调研   → reference/（喂上面两类的证据面）

毕业——从缓冲进生产线的唯一门票（四门判断，见下）

生产线——实施的唯一通道是 notes/
  notes/proposed/ RFC → 评审 → implemented → 变更落地

回写与回填
  已毕业卡 → _done/ 对应池（位置即状态，见铁律）
  未裁决暂停卡（用户明示、无毕业判断） → _done/_suspended_{plans,bugs}/——暂停非完成
  服务过卡片的研究材料 → _done/_reference/（git mv 随卡走）
  下游发现的新缺口 → 回本处立新卡——绝不夹带进 Note 或变更里
```

三条硬规矩随主干走：**无 RFC 不行为**（本目录里任何东西再成熟也不自行变成系统行为，
实施只走 notes/proposed/）；**卡载思考、Note 载决定**（一处事实一个家：卡的状态行指向
落地的 Note，Note 不复制推敲过程）；**回写不夹带**（毕业卡执行中暴露的下一个问题回缓冲
立新卡，不做 Note 的搭车条款）。

## `_` 前缀语义（借 deerflow；`_` 只表示「不在活跃队列」，不表示禁读）

- **归档件**（会关闭；fresh agent 默认忽略，点名才读）：`_done/`。
- **活跃件**住无前缀处（`queue.md`、`plans/`、`bugs/`）。

## 目录

```
_backlog/
├── README.md            # 本文件（规矩手册——宪章；活卡/计数/现值一律进各账本）
├── queue.md             # 次序半区：队列（▶ = 当前指针，parked 态合法）+ 搁置池——零判断材料
├── plans/               # 推敲卡：设计 / 分析 / 调研（文件名 YYYY-MM-DD-slug，与 notes 树同一种日期格式——2026-10-03 定调对齐）
├── postponed/           # 搁置卡：毕业四门产出"不做/维持"裁决但带活触发器（复活条件写进索引行——per-run 检查义务，2026-10-08 新设）
├── bugs/                # 缺陷卡：已发现、不当场修的缺陷（当场修掉的不建档）
├── reference/           # 推敲资料区：喂活跃卡的调研材料（随卡毕业迁 _done/_reference/）
└── _done/               # 归档（位置即状态）：_closed_plans/ + _suspended_plans/ +
                         # _fixed_bugs/ + _suspended_bugs/ + _reference/
```

## 推敲卡（plans/）的生命周期：毕业四门

每张卡首部带状态行（格式见 [plans/README.md](plans/README.md)，机械门禁 `plans-liveness`
强制）。推敲的产出是**一个毕业判断**，不是开工。四条出路：

| 判断 | 出路 | 卡的去向 |
|---|---|---|
| 该做（现在/近期） | RFC 落 [notes/proposed/](../notes/proposed/README.md) + [queue.md](queue.md) §队列行（小修可不设 RFC——直接进队列当小条目） | 关闭迁 `_done/_closed_plans/`，状态行记去向指针 |
| 该做但不现在（待触发） | queue.md §搁置池行（满足其准入判据） | 同上 |
| 不做（证伪/否决） | 结论并入 owner Note「输掉的方案」，防复犯价值高的迁 [notes/rejected/](../notes/rejected/README.md) | 无触发器终局 → 同上；**带活触发器的**（复活条件 = 未来证据/点名）→ [postponed/](postponed/README.md)（2026-10-08 新设——位置即状态，触发器保持 per-run 可见） |
| 不用单独记（消化） | 结论已并入某 Note/合同 | 同上，状态行记消化落点 |

**边界**：推敲卡 ≠ 提案——卡可以只有问题没有方案；RFC 必须有问题/方案/验收三件。
推敲未到 RFC 程度时卡停在活跃区继续熟，状态行写「下一步 + 触发」。**未裁决暂停不是
毕业门**（2026-10-03 借鉴 loop_advisor 的 refined 语义）：用户明示「先放一放、没到裁决」
的卡走暂停池（`_done/_suspended_{plans,bugs}/`，暂停非完成，重启条件随卡）；已裁决的
「该做但不现在」是另一回事——它的家 = queue.md §搁置池行（裁决型，复活条件在池行与
rejected Note），两者不混。暂停是队列级决定（跟随用户明示或状态行已记 parked），代理
不得仅凭「觉得不活跃」就挂起一张卡；重启需用户新的优先级决定。

## 缺陷卡（bugs/）的边界

**当场修掉的不建档**（保持轻）；**发现时决定不当场修的必须建档**（症状 / 根因假设 /
复现 / 严重级 / 修复关联），否则缺陷散在轮次 Note 里不可检索、无 triage 状态。已有归宿
的旧缺陷（搁置池行、走查不修清单）不迁移。把每个 bug 当**契约探针**——一个具体缺陷
往往牵出一类失败，顺藤摸瓜值得横切排查（借 deerflow 口径）。

## 推敲资料区（reference/）：喂卡片的证据面

打磨卡片会攒下调研——证据走读、综述、机制笔记——它们的家既不是卡（卡只载判断材料）
也不是 notes/（那边是决定记录）。`reference/` 就是这个家（2026-10-03 二轮借鉴采纳，
登记 = [borrow Note](../notes/implemented/2026-10-03-backlog-governance-borrow.md)）。
要点（完整契约 = [reference/README.md](reference/README.md)）：

- **喂活跃卡**：推敲时攒的、被卡引用的、喂毕业判断的证据材料；半成品合法。
- **随卡走**：卡毕业时 `git mv` 到 `_done/_reference/`，文件名不变、内容不重写；服务完
  最后一张卡的不滞留。
- **无状态行、无逐文件门禁**：纯约定；唯一的文件级检查是索引交叉对账（本区文件必须被
  本区 README 的索引点名，plans/bugs 同规）。
- **越过所有卡的留存语义**仍归 docs 索引（[00-index §外部研究材料](../docs/00-index.md)）。

## 铁律（借 deerflow 搬迁规矩）

- **位置即状态**：`git mv` 过去、文件名不变、**内容不重写**——推敲过程本身就是证据；
  毕业/关闭只在状态行加去向指针。
- **README 永不删除**，只更新索引行。
- **编号权威住归档侧**：`_done/_fixed_bugs/` 持有 Next BUG ID（新号 = 已分配最大号 + 1，
  活跃 ∪ 归档一起算，权威值 = [_done/README.md](_done/README.md)）；plans 卡无编号，
  文件名 `YYYY-MM-DD-<slug>` 自带立卡日期（与 notes 树同格式——2026-10-03 定调对齐，替代首借 YYMMDD 裁定）。
- **半区互斥**：queue.md 只载次序与归宿、零判断内容；plans/ 卡只载判断材料、零调度——
  互越界即回归 D23 病（第二个队列）。
- **宪章与账本分离**（2026-10-03 借鉴）：本手册是**宪章**——只记制度（布局、门、规矩、
  不借清单），且只在制度级决定时动（借用、改门、改铁律，各自落 Note）；凡点名某张活卡、
  某个计数、某个当前值的都是**账本**（plans/bugs/_done 各 README 的索引行、queue.md 的
  行）——账本随卡动、随节奏动，检验法：「这句话点名了活卡/计数/现值吗？」点名了就进账本，
  永不进本文件。主干三条硬规矩见「主干」节，此处不重复。

## 谁写、谁读、何时读

- **写**：收割 / 走查 / 升 pin 重校 / 用户对话 / 自主探索中出现「值得推敲但未到裁决」的
  思考时立卡。**不成熟的思考不许进 proposed/ 或队列**（那边有归宿门禁）。
- **读**：① 立新卡前先检索（防重复推敲，同 Note 生命周期「新增触发取代检查」精神）；
  ② 用户点名继续推敲某卡；③ 队列空（parked 态）的打磨轮可把「把一张卡成熟到毕业判断」
  当输入源（产出 = 呈批，不是开工——[guides/60 §0](../docs/guides/60-dev-loop.md)）。
- fresh agent 开工照旧只读 [queue.md](queue.md) ▶（[根 AGENTS.md](../AGENTS.md) §入口链
  第 3 步）：**推敲卡不是任务**。

## 明确不借（负知识：重新提出前先读理由）

| 不借项 | 理由 |
|---|---|
| `todos/` 桶 | [queue.md](queue.md) §队列已是 todo/次序的家；另立 = 重蹈 company D23 废除的 plans 层 |
| 独立 roadmap 文件 | 规划面单入口（D20 用户裁决）：两个规划入口 = 双份指针纪律 + 入口链分叉；次序半区已住 queue.md |
| 复盘卡 | [notes/postmortem/](../notes/postmortem/README.md) 已有（事故复盘 ≠ 设计推敲，别混） |
| deerflow 的三处索引一致性 / `_` 目录声明 / 编号撞号门禁 | 「有压力再借」判据：错误在本仓复发过才升格；当前登记在案，复发即加（索引交叉对账已本轮前置采纳，见机械门禁） |

## 机械门禁

- **现在**：`plans-liveness`（每张活跃推敲卡自带状态行户口 **+ 索引交叉对账**：plans/bugs/
  reference/ 与 _done/ 各池里的每个文件必须被其 README 索引点名——孤儿卡即红；反方向
  （索引行点名不存在的文件）= md-links 门禁的职责）——清单唯一源 =
  [scripts/verify.mjs](../scripts/verify/verify.mjs)，台账 = [evaluation.md §L0](../docs/evaluation.md)；
  次序半区挂 `proposal-scheduled` / `queue-pointer-live` / `entry-chain`（▶ 唯一 + parked 态）。
- **有压力再借**：见「明确不借」表末行。
