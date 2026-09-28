# _backlog · 规划面（推敲 + 次序一个家，分半区）

> 性质：**唯一规划面**（2026-09-28 用户裁决 roadmap.md 退役，D20）。两个半区：
> **推敲半区**（plans/ · bugs/）——点子进入 RFC / 队列 / 实施之前的思考加工层，「该不该做、
> 何时做、次序如何、是否放弃」四问在这里成熟；**次序半区**（[queue.md](queue.md)）——已批准
> 条目的有序索引 + 搁置池，全仓唯一"当前"指针。**推敲卡只载判断材料（问题、证据、候选、
> 取舍），不载次序与授权**：次序唯一 = queue.md §队列，授权唯一 =
> [guides/60](../docs/guides/60-dev-loop.md)。company D23 教训：plans 层一旦开始排任务就会
> 长成第二个队列——推敲半区永远不做调度。来源：借鉴 `ai_dsh_company` `_backlog`（D31，其
> 源头 = `ai_deerflow_deep_research_v2`）；判定、取舍与本仓裁定（根目录 / 全三件 / plans 卡
> 日期编码 / 规划面单一化）=
> [毕业 Note](../notes/implemented/2026-09-28-backlog-deliberation-space.md)。

## `_` 前缀语义（借 deerflow；`_` 只表示「不在活跃队列」，不表示禁读）

- **归档件**（会关闭；fresh agent 默认忽略，点名才读）：`_done/`。
- **活跃件**住无前缀处（`queue.md`、`plans/`、`bugs/`）。

## 目录

```
_backlog/
├── README.md            # 本文件（规矩手册）
├── queue.md             # 次序半区：队列（▶ = 当前指针，parked 态合法）+ 搁置池——零判断材料
├── plans/               # 推敲卡：设计 / 分析 / 调研（文件名 YYMMDD-slug，日期 = 立卡日）
├── bugs/                # 缺陷卡：已发现、不当场修的缺陷（当场修掉的不建档）
└── _done/               # 归档（位置即状态）：_closed_plans/ + _fixed_bugs/
```

## 推敲卡（plans/）的生命周期：毕业四门

每张卡首部带状态行（格式见 [plans/README.md](plans/README.md)，机械门禁 `plans-liveness`
强制）。推敲的产出是**一个毕业判断**，不是开工。四条出路：

| 判断 | 出路 | 卡的去向 |
|---|---|---|
| 该做（现在/近期） | RFC 落 [notes/proposed/](../notes/proposed/README.md) + [queue.md](queue.md) §队列行（小修可不设 RFC——直接进队列当小条目） | 关闭迁 `_done/_closed_plans/`，状态行记去向指针 |
| 该做但不现在（待触发） | queue.md §搁置池行（满足其准入判据） | 同上 |
| 不做（证伪/否决） | 结论并入 owner Note「输掉的方案」，防复犯价值高的迁 [notes/rejected/](../notes/rejected/README.md) | 同上 |
| 不用单独记（消化） | 结论已并入某 Note/合同 | 同上，状态行记消化落点 |

**边界**：推敲卡 ≠ 提案——卡可以只有问题没有方案；RFC 必须有问题/方案/验收三件。
推敲未到 RFC 程度时卡停在活跃区继续熟，状态行写「下一步 + 触发」。

## 缺陷卡（bugs/）的边界

**当场修掉的不建档**（保持轻）；**发现时决定不当场修的必须建档**（症状 / 根因假设 /
复现 / 严重级 / 修复关联），否则缺陷散在轮次 Note 里不可检索、无 triage 状态。已有归宿
的旧缺陷（搁置池行、走查不修清单）不迁移。把每个 bug 当**契约探针**——一个具体缺陷
往往牵出一类失败，顺藤摸瓜值得横切排查（借 deerflow 口径）。

## 铁律（借 deerflow 搬迁规矩）

- **位置即状态**：`git mv` 过去、文件名不变、**内容不重写**——推敲过程本身就是证据；
  毕业/关闭只在状态行加去向指针。
- **README 永不删除**，只更新索引行。
- **编号权威住归档侧**：`_done/_fixed_bugs/` 持有 Next BUG ID（新号 = 已分配最大号 + 1，
  活跃 ∪ 归档一起算，权威值 = [_done/README.md](_done/README.md)）；plans 卡无编号，
  文件名 `YYMMDD-<slug>` 自带立卡日期——归档后日期流可读（本仓裁定，company 原样为纯 slug）。
- **半区互斥**：queue.md 只载次序与归宿、零判断内容；plans/ 卡只载判断材料、零调度——
  互越界即回归 D23 病（第二个队列）。

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
| `_suspended_*` 桶 | queue.md §搁置池已是悬挂事实家（准入判据 + 复活条件齐全）；另立 = 第二个搁置池 |
| `_reference/` 桶 | [notes/archived/](../notes/archived/README.md) + [00-index §外部研究材料](../docs/00-index.md) 已覆盖留存参考语义 |
| 复盘卡 | [notes/postmortem/](../notes/postmortem/README.md) 已有（事故复盘 ≠ 设计推敲，别混） |
| deerflow 的三处索引一致性 / `_` 目录声明 / 编号撞号门禁 | 「有压力再借」判据：错误在本仓复发过才升格；当前登记在案，复发即加 |

## 机械门禁

- **现在**：`plans-liveness`（每张活跃推敲卡自带状态行户口）——清单唯一源 =
  [scripts/verify.mjs](../scripts/verify.mjs)，台账 = [evaluation.md §L0](../docs/evaluation.md)；
  次序半区挂 `proposal-scheduled` / `queue-pointer-live` / `entry-chain`（▶ 唯一 + parked 态）。
- **有压力再借**：见「明确不借」表末行。
