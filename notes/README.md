# notes/ — 本仓开发记忆：状态地图

> 层：时间（为什么/怎么走到这里）。与 `docs/`（当前合同，只写 now）严格分工：
> **docs 说"现在是什么"，notes 说"为什么是它、放弃了什么、跑了什么验证"。**
> 地位的强调（读取/写入触发）= [AGENTS.md §`notes/`](../AGENTS.md)；本文件是**目录的时态地图**。

## 三条时态，各有唯一入口（一眼定位）

| 时态 | 问什么 | 唯一入口 | 状态怎么标 |
|---|---|---|---|
| **将来** | 接下来做什么 | [roadmap.md §队列 ▶](../roadmap.md)（全仓唯一"当前"指针 + 排队条目 + 搁置池） | 队列行序号；▶ = 当前条目 |
| **将来（已开工的设计）** | 这个条目打算怎么做 | [`proposed/`](proposed/README.md) 的 RFC 全文 | RFC 头部状态行 `proposed / approved / superseded` |
| **过去（已交付）** | 当初为什么这么决定、放弃了什么 | [`implemented/`](implemented/README.md) | 目录即状态（文件名 = 首提日期 + 主题） |
| **过去（否决与事故）** | 哪些路别再走、哪些坑踩过 | [`rejected/`](rejected/README.md) · [`postmortem/`](postmortem/README.md) | 目录即状态（rejected 另有结论状态行） |
| **过去（冻结）** | 不再指导当前工作的已交付决定去哪了 | [`archived/`](archived/README.md) | 目录即状态 + 文件内 `> 归档：<日期>` 行（冻结快照，正文永不改） |
| **始终** | 这个项目为什么起、用户下过哪些方向 | [`intents.md`](intents.md) | 追加式，不删 |

**`proposed/` = 在飞队列条目的规划面**：只有 roadmap §队列条目的 RFC 住这里（一文件一条目）。
2026-09-27 用户定调：**搁置即"决定不做"**——搁置条目全文住 [rejected/](rejected/README.md)
并带重启条件，搁置池行直接链它，`proposed/` 不再收搁置条目。下一步看 roadmap ▶，不是看这个
目录。同理，`implemented/` 远厚于队列，也不表示积压：过去的决定层本来就比队列厚。

## 为什么内部按生命周期分，不按时间分

`notes/` 整体是时间维度，内部按**生命周期**分（vendor `.agents/notes/` 同构，且目录名
自带时态）——按时间分目录必然长出"烂尾层"（company D10 教义，见
[00-index §组织原则](../docs/00-index.md)）。**目录名 = 状态**：不熟悉本仓的人扫一眼
`proposed / implemented / archived / rejected / postmortem` 就知道每条记忆处在哪个时态，不必读规则全文
（vendor 教学页原话："目录本身就是流程"）。

## 布局与进出规则

| 路径 | 放什么 | 进门条件 | 出门 |
|---|---|---|---|
| `intents.md` | 初始意图与用户指令存档（为什么起这个项目、原话要点） | 立项/用户给新方向时追加 | 追加式，不删 |
| `proposed/` | **在飞队列条目的 RFC 全文**（一文件一条目：问题/方案/输掉的方案/验收判据） | roadmap §队列须有对应条目（verify 门禁 `proposal-scheduled` 强制） | 队列条目收尾 → 迁 `implemented/`；不再做的条目 → 否决迁 `rejected/`（搁置池行链 rejected/ 文件） |
| `implemented/` | 已落地的决定记录（决定/输掉的方案/实际跑过的验证/环境状态） | RFC 毕业，或用户直派任务的交付（**不必从 proposed/ 起步**） | **活的**：事实随实现维护；逆转另写新 Note 互链 |
| `rejected/` | 被否决的方案——**只保留仍能阻止一次诱人重犯的** | 方案被否决且理由有未来价值 | 不再有防复犯价值 → 直接删（不留空壳） |
| `postmortem/` | 事故复盘（事故叙事的唯一合法层） | 出现值得记的事故 | 事实澄清后仍留（历史记录） |
| `archived/` | 冻结快照：不再指导当前工作的已交付 Note（进门条件与冻结纪律见 [archived/README.md](archived/README.md)） | implemented/ Note 按"未来决策价值"判定搬入（vendor `dsh-archive-agent-notes` 校准：不按年龄字数） | 无出门——冻结；复活 = 写新 Note 引用快照 |
| ~~`research/`~~ | （2026-09-27 清并：五篇调研报告全部完成且落点已落地，**并入 [`implemented/`](implemented/)** 带 grandfather 标注——位置=状态，防误读为待开展课题） | — | — |

细则见各子目录 README（每个子目录都有 README，`note-status` 门禁强制在场）。

## 决定覆盖与取代检查（DSH SDLC reference 01 吸纳，2026-09-24）

来源：`/Users/bowhead/deepseek-harness/_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`
（DSH 官方 SDLC 参考，点状吸纳不推翻——本仓既有规则不变，下列为增量；吸纳 Note =
[2026-09-24-note-lifecycle-absorption](implemented/2026-09-24-note-lifecycle-absorption.md)）。

- **Note 义务边界 = 持久决定理由**（代码/测试/现有文档解释不了的"为什么"）；机械/局部编辑
  豁免。**不必从 proposed/ 起步**：决定已做出并随当前变更交付 → 直接进 `implemented/`
  （proposed/ 只服务"重大工作未构建、需先评审" = 本仓队列 RFC）。
- **每新增一篇 Note 触发取代检查**（搜活动树同决定/同机制）：
  - 已有 owner 拥有同一决定 → **更新它**，不建重复 Note；
  - **部分取代** → 双方保留 + 相对 Markdown 链接互链，更新仍有效的事实（"逆转写新 Note
    互链"现行规则的推广）；
  - **完整取代** → 新 Note 吸收旧 Note 全部独有的决定理由/输掉的方案/验证/环境状态之后，
    旧 implemented Note 才可删除。
- **毕业 = 正文改写**：计划体 → 已交付事实体（删未来时态/迁移计划；guides/60 §4 骨架即
  改写目标）——只改路径不改正文 = 未来计划伪装成当前事实。载体分工（规则/Skill/门禁/Note
  各回答什么）见 [discipline-map §载体分工](../docs/discipline-map.md#载体分工)。
- 互链只用相对 Markdown 链接（`md-links` + `md-anchors` 门禁可检），不用裸文字或编号；
  文件名日期 = 主题**首提日期**（不是实现/归档日期）。
- **遗留形态 grandfather 条款**：note-format 门禁生效前无法对齐骨架的既有 Note，标注固定
  注释 `<!-- grandfather: ... -->`（内容有效不追改）；新篇一律按骨架写。

## 与 vendor 原生规则的差异（本仓适配，勿回写成 DSH 一手规则）

| 维度 | vendor `.agents/notes/` | 本仓 |
|---|---|---|
| 路径 | `.agents/notes/`（隐藏、agent 面） | `notes/`（顶层、人机共面）——人验收时直接看得到；`.agents/skills/` 已按 vendor 约定落地，notes 留在顶层是**登记的偏离**（代价：与 vendor 路径不同构；收益：人类可发现性） |
| 第二轴 | 生命周期 + **class 子目录**（feature/bug-fix/simplification/architecture/process/testing），closed set 由门禁脚本校验 | **无 class 层**——当前规模用文件名主题即可分辨；引入条件 = `implemented/` 超过约 50 篇，或检索开始靠猜 |
| 冻结层 | `archived/`（implemented 可归档，归档树永久冻结） | **已设**（2026-09-27 用户指令激活）：单语单文件 + `> 归档：<日期>` 行，等价上游 triplet+hash seal 的本仓落地；判定 = vendor `dsh-archive-agent-notes` 的"未来决策价值"校准 |
| 格式骨架 | `## Problem` / `Decision` / `Alternatives considered` / `Verification` 强制，`verify-agent-note-format` 门禁 | 中文骨架：决定 / 输掉的方案 / 实际跑过的验证 / 环境状态（guides/60 §4）+ **轻量门禁 `note-format`** |
| 取代检查 | 子树 AGENTS.md 硬触发：每新增 Note 搜同决定/同机制，完整取代同 PR 归档旧 triplet | 同（2026-09-24 吸纳：更新 owner / 部分互链 / 完整吸收后才删旧——见上节） |
| 集中索引 | 明文禁止建 `INDEX.md`（目录树即清单） | **同构**：各目录不建手抄索引（`note-status` 门禁只强制各子目录 README 在场） |
| 状态标记 | `Status: <status>` 头三行之第三行，裸值、无日期括号，目录互验（格式门禁） | 同构：`> 状态：<值>` 裸值 + 目录互验（`note-format` 门禁）；`archived/` 另有 `> 归档：<日期>` 行（冻结标记，vendor `Archived:` 行等价） |

**原生权威**（机制核对一律走它）：`vendor/dsh/.agents/notes/README.md`、
`vendor/dsh/.agents/notes/implemented/AGENTS.md`、`vendor/dsh/.agents/notes/archived/AGENTS.md`
（钉 tag `dsh-v0.1.7-rc.2`，只读铁律）。
