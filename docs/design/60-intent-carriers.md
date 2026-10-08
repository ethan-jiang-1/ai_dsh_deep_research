# 60 · 意图载体总图：意图从哪进、从哪出

本页拥有的事实 = 本仓每一类意图载体的 owner / 载什么 / 进门条件 / 出场方式，以及它们之间
怎么衔接。规则正文不在本页——每条规则住它自己的 owner 文件，本页只给总图与指针。
对照物 = DSH SDLC 参考卷 `09-intake-and-work-items.md`（本仓等价物，有意不同构，差异见 §三）。
读入口 = [00-index §文档地图](../00-index.md)。

## 一、载体清单

"进门" = 什么条件下该写它；"出场" = 什么条件下离开它。

| # | 载体 | owner（规则正文） | 拥有的唯一事实 | 进门条件 | 出场方式 |
|---|---|---|---|---|---|
| 1 | [`_backlog/queue.md` §队列 ▶](../../_backlog/queue.md) | [_backlog/README §主干](../../_backlog/README.md) | 次序与"当前"（全仓唯一 `▶`） | 已毕业的条目；行内必标 `等人` 或 `可自主` | 条目交付或放弃 → 删行并移交 `▶`（`queue-pointer-live` 把守至多一行带 ▶） |
| 2 | [`_backlog/plans/`](../../_backlog/plans/README.md) 推敲卡 | 同上 §毕业四门 | 判断材料（该不该做 / 何时 / 次序 / 放弃了什么） | 有需要推敲的设计、分析或调研，且尚不是任务 | 走毕业四门；卡迁 `_done/_closed_plans/`，索引行同撤（`plans-liveness` 对账） |
| 3 | [`_backlog/_postponed_plans/`](../../_backlog/_postponed_plans/README.md) | 同上 | "不做或维持"裁决 + 活触发器 | 有裁决但带复活条件 | 条件满足 → 回 `plans/` 或直接毕业 |
| 4 | [`_backlog/bugs/`](../../_backlog/bugs/README.md) 缺陷卡 | [_backlog/README §缺陷卡边界](../../_backlog/README.md) | 已发现且不当场修的缺陷（当场修掉的不建档） | 缺陷已定性但不当场修 | 修完 → `_done/_fixed_bugs/`；调查过但修复未确认 → `_done/_suspended_bugs/`（编号保留） |
| 5 | [`_backlog/reference/`](../../_backlog/reference/README.md) | 同上 §推敲资料区 | 喂卡片的证据面（调研材料，半成品合法） | 为某活跃卡攒的调研 | 随卡走 → `_done/_reference/`，文件名不变 |
| 6 | [`notes/proposed/`](../../notes/proposed/) RFC | [notes/AGENTS §格式](../../notes/AGENTS.md) | 条目的问题 / 方案 / 输掉的方案 / 验收全文 | 队列条目成立（毕业的唯一门票） | 交付 → `implemented/` 且正文改写为事实体（只改路径 = 未来计划伪装成当前事实，`note-graduation-rewrite` 把守） |
| 7 | [`notes/implemented/`](../../notes/implemented/) | 同上 §毕业与命名 | 已交付的决定与证据（为什么选它 / 放弃了什么） | 条目已交付 | 不再指导未来变更 → `archived/` 冻结（进门条件 = [archived/README](../../notes/archived/README.md)） |
| 8 | `notes/rejected/` · `notes/postmortem/` | [notes/README](../../notes/README.md) | "决定不做"+ 重启条件 · 事故复盘 | — | 唤醒 = 写新 Note 引用旧篇，旧篇不动 |
| 9 | 代码 `TODO` / degraded 观察项 | 所属代码文件 | 就地标注的待办 | 局部，不必进缓冲 | 修掉即删 |
| 10 | 用户直派 | —（无载体，有意如此） | 用户当场给的指令 | 用户直接说 | 落地后按性质回填上述载体 |

## 二、衔接：一条意图的进出路径

```
入口面（半成品合法）                         生产线（实施唯一通道 = notes/）
  问题 / 证据 / 缺陷 / 调研                       ┌─ notes/proposed/ RFC（加工单）
        │                                        │        │ 交付
        ├─ 设计 / 分析推敲 → plans/ ──┐          │        ▼
        ├─ 缓修缺陷       → bugs/    ─┼─ 毕业四门 ┘  notes/implemented/（决定记录）
        └─ 推敲调研       → reference/┘  （唯一门票）     │ 不再指导未来
                                                        ▼
                              _done/ 对应池            notes/archived/（冻结）
                            （位置即状态）
        下游发现的新缺口 ──→ 回 _backlog 立新卡 ── 绝不夹带进 Note 或变更
```

三条硬规矩随主干走（正本 = [_backlog/README §主干](../../_backlog/README.md)）：

1. 无 RFC 不行为——缓冲里任何东西再成熟也不自行变成系统行为；
2. 卡载思考、Note 载决定——卡的状态行指向落地 Note，Note 不复制推敲过程；
3. 回写不夹带——执行中暴露的下一个问题回缓冲立新卡，不做搭车条款。

## 三、与参考卷的差异

| 维度 | 参考卷 `09` | 本仓 | 为什么不同 |
|---|---|---|---|
| Issue 模板 / `.github/` | Issue 表单 + 模板 | 不存在（无 `.github/`） | 单人仓、无远端协作面；载体 = 文件本身 |
| 状态机 | `Inbox→Backlog→Ready→In progress→In review→Done/No action` 六态事件驱动 | 无状态机；状态 = 位置（在池 / 已迁出） | 无事件源。参考卷 `00-index.md:5` 自己写明独立插件仓不继承主仓制度 |
| "当前"指针 | Project 看板视图 | `queue.md` 的 `▶`，全仓唯一（`queue-pointer-live` 把守） | 文件约定；一个事实一个家 |
| 载体清单 | 单一 intake 页 | 10 类载体（见 §一），含本仓特有的推敲场三件 | 本仓把"打磨"与"生产"分成两个物理区 |
| 需求来源 | Issue | 用户直派 + 推敲卡毕业，双入口 | 有推敲场，意图可先于"任务"存在 |

## 四、未决点

是否需要状态机（如 `ready` / `in review` 显式标）。当前判断是不需要——位置即状态已够，
引入标签会得到无人更新的字段。若出现"卡在毕业门前需要区分等待对象"的真实痛点，
此为候选轴。

## 五、分流接口

- "用它"还是"改它" → [00-index §先分流](../00-index.md)；
- 改本仓的开工与收尾程序 → [guides/60](../guides/60-dev-loop.md)（§1/§2 开工，§4 收尾；
  每步契约表 = 该页 §1.1）；
- 队列条目的生命周期（索引行 → RFC → 验收门 → Plan Mode 呈批 → 对抗自审 → 同 diff 收尾）
  → [guides/60 §0](../guides/60-dev-loop.md)；
- 毕业四门（该做 / 该做但不现在 / 不做 / 消化）→ [_backlog/README](../../_backlog/README.md)；
- Note 写入触发 / 取代检查 / 格式 → [notes/AGENTS](../../notes/AGENTS.md)；
- 文档该住哪一层 → [docs/AGENTS §层级归属](../AGENTS.md)。

## 已知限制与延后工作

- 本页的载体清单是手抄索引，无门禁对账——新增载体类型时需人工回改本页
  （登记为限制；候选机械化 = 对 `_backlog/*/` 与 `notes/*/` 目录做存在性对账）；
- §一"出场方式"列与各 owner 文件存在压缩式重述：本页给的是索引粒度的一句话，规则原文仍住
  owner 文件。判读边界 = 本页不写判据细节（不写门禁的具体断言、不写四门各自的判据句）；
  规则变更时以 owner 文件为准并回改本页的索引句；
- §四的"是否需要状态机"未裁定，本轮不引入。
