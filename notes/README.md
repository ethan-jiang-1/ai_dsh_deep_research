# notes/ — 本仓开发记忆：状态地图

> 层：时间（为什么/怎么走到这里）。与 `docs/`（当前合同，只写 now）严格分工：
> **docs 说"现在是什么"，notes 说"为什么是它、放弃了什么、跑了什么验证"。**
> 地位的强调（读取/写入触发）= [AGENTS.md §`notes/`](../AGENTS.md)；本文件是**目录的时态地图**。

## 三个时态 · 各类入口（一眼定位）

| 时态 | 问什么 | 唯一入口 | 状态怎么标 |
|---|---|---|---|
| **授权中的工作** | 当前请求或既有授权要求什么 | 用户请求与会话记录 | 由授权范围与实际工作记录表达 |
| **将来（待评审的决定）** | 需要显式评审的持久决定是什么 | [`proposed/`](proposed/README.md) 的 RFC 全文 | RFC 头部状态行 `proposed / approved / superseded` |
| **过去（已交付）** | 当初为什么这么决定、放弃了什么 | [`implemented/`](implemented/README.md) | 目录即状态（文件名 = 首提日期 + 主题） |
| **过去（否决）** | 哪些路别再走 | [`rejected/`](rejected/README.md) | 目录即状态（另有结论状态行） |
| **过去（事故）** | 哪些坑踩过 | 无独立目录：事故复盘冻结在 [`archived/`](archived/README.md)（§事故复盘） | 文件内 `> 归档：<日期>` |
| **过去（冻结）** | 不再指导当前工作的已交付决定去哪了 | [`archived/`](archived/README.md) | 目录即状态 + 文件内 `> 归档：<日期>` 行（冻结快照，正文永不改） |

## 子目录宪章

每个子目录 README 只写**稳定条款**：时态 / 只收与不收 / 进门与出门 / 状态与形状 / 阅读契约。
**不写当前条目清单、计数、具体机制名**——这些会腐烂；目录树与 `docs/` 才是它们的家。

## 立项来历

2026-09-24 立项：DSH Deep Research 插件——对 harness 要求高（接触大量搜索、结果信噪比
差，仍要探索出最终答案在哪）；工程范式参考 `ai_dsh_company`，方法论参考
`ai_tool_deepresearch`（codex 成熟 harness）；多角色（preset）+ Agent Teams 主通道、
评估先行、八成把握垂直轮为立项当日定调。定调语义已全数落进
[decisions.md 决策台账](../docs/decisions.md)（D 号依据列引原话——**新定调只进 D 号**，不再有
追加式存档文件）；立项原话全文 = git 历史（`notes/intents.md` 2026-10-04 退役——冻结存档
与 D 号台账双载体，噪声大于信息，用户裁定剔除）。

**`proposed/` = 需要显式评审的持久决定提案**：RFC 在决定需实现前形成明确范围、备选和验收时使用；它不是一般执行工作的前置。获授权工作按授权范围执行；多步工作使用会话内 plan/todo。`rejected/` 保留仍有防复犯价值的否决理由，并记录适用范围或重启条件。

## 为什么内部按生命周期分，不按时间分

`notes/` 整体是时间维度，内部按**生命周期**分（vendor `.agents/notes/` 同构，且目录名
自带时态）——按时间分目录必然长出"烂尾层"（company D10 教义，见
[00-index §组织原则](../docs/00-index.md)）。**目录名 = 状态**：不熟悉本仓的人扫一眼
`proposed / implemented / archived / rejected` 就知道每条记忆处在哪个时态，不必读规则全文
（vendor 教学页原话："目录本身就是流程"）。

## 布局与进出规则

| 路径 | 时态 | 宪章（进门/出门/状态/阅读契约） |
|---|---|---|
| [`proposed/`](proposed/README.md) | 将来 | 待显式评审的持久决定 RFC |
| [`implemented/`](implemented/README.md) | 过去·活 | 已交付决定与验证（不是冻结档案） |
| [`rejected/`](rejected/README.md) | 过去 | 有防复犯价值的否决理由 |
| [`archived/`](archived/README.md) | 过去·冻结 | 不再指导未来工作的快照（含事故复盘） |

**进出细节只住各子目录 README**（上表链到的目录宪章）；本表只做导航，不复制会漂移的规则。
事故复盘不设独立目录（规则 = 下节 §事故复盘）。`research/` 已于 2026-09-27 清并，不再是目录。

问题澄清与执行分开：[_backlog/](../_backlog/README.md) 收录待澄清问题、查证材料、缺陷和按需方法；它不是实施许可或前置门（唯一带日期的范围例外 = 修复就绪缺陷卡的 P1/P2 有界修复，[D24](../docs/00-index.md)）。结论进入 notes 的收件规则 = [notes/AGENTS](AGENTS.md)（§从 backlog 进来的结论），决定程序 = [结论去向](../_backlog/methods/issue-to-note.md)。`proposed/` 仅承载需要显式评审的持久决定提案。

## 事故复盘（不是目录）

事故叙事**不设独立时态层**。达到“bug 到达了不该到达的地方”（真实用户 / 已合并提交 / 一次交付）
时，以**三十秒摘要**起手（什么坏了 / 影响了谁 / 根因一句话），再按五节写：症状 / 为什么没早发现 /
根因 / 修复 / 新增防线；结案后作为**历史证据冻结进** [`archived/`](archived/README.md)，不再作为
活跃层维护。

新增防线落 [evaluation](../docs/evaluation.md)（门禁）或 [_backlog/triggers](../_backlog/triggers.md)
（复发观察）才算闭环。防复发的现行入口 = `reviewing-a-delivery` / `reproducing-a-failure` 技能与
triggers；事故原文只作证据。

## proposed → implemented 的执行纪律（门牌）

从 RFC 到毕业不是"写完再补证据"——**判据可检验化先行、红绿循环推进、真证据才毕业**。流程正本（一个家，不在此复述）= [guides/60 §0 验收门](../docs/guides/60-dev-loop.md)：验收判据逐条绑定检查方式（机械门禁 / 契约测试 / 对账命令 / 人工判据四型），能机械的先立红（判据在实现前必须能失败）；实施期按红→实现→绿循环；收尾逐条对账——**未验项不得写 implemented**，被阻断的检查如实写「阻断 + 原因」。决策登记 = [00-index D23](../docs/00-index.md)；首个完整闭环 = [项目可驾驭性 Phase 1](implemented/2026-10-05-project-navigability-phase1.md)。外部同源参照（同日同定调的姊妹仓落地形态）= `ai_dsh_assitant` notes/README §二之三（钉版登记见 [00-index §外部研究材料](../docs/00-index.md)）。

## 决定覆盖与取代检查（DSH SDLC reference 01 吸纳，2026-09-24）

来源：`/Users/bowhead/deepseek-harness/_agent_ready_development/sdlc-reference/01-agent-note-lifecycle.md`
（DSH 官方 SDLC 参考，点状吸纳不推翻——本仓既有规则不变，下列为增量；吸纳 Note =
[2026-09-24-note-lifecycle-absorption](implemented/2026-09-24-note-lifecycle-absorption.md)）。

- **Note 义务边界 = 持久决定理由**（代码/测试/现有文档解释不了的"为什么"）；机械/局部编辑
  豁免。**不必从 proposed/ 起步**：决定已做出并随当前变更交付 → 直接进 `implemented/`
  （proposed/ 只服务需要显式评审的持久决定，不由任务大小或是否排队决定）。
- **每新增或修订一篇 Note / 每修订一个 D 号触发取代检查**（搜活动树同决定/同机制）：
  - 已有 owner 拥有同一决定 → **更新它**，不建重复 Note；
  - **部分取代** → 双方保留 + 相对 Markdown 链接互链，旧篇头部加 `> 历史注记：…；被谁取代 / 现行看哪`
    （格式见 [notes/AGENTS](AGENTS.md)），更新仍有效的事实（"逆转写新 Note 互链"现行规则的推广）；
  - **完整取代** → 新 Note 吸收旧 Note 全部独有的决定理由/输掉的方案/验证/环境状态之后，
    旧 implemented Note 才可删除。
- **毕业 = 正文改写**：计划体 → 已交付事实体（删未来时态/迁移计划；guides/60 §4 骨架即
  改写目标）——只改路径不改正文 = 未来计划伪装成当前事实。载体分工（规则/Skill/门禁/Note
  各回答什么）见 [discipline-map §载体分工](../docs/discipline-map.md#载体分工)。
- 互链只用相对 Markdown 链接（`md-links` + `md-anchors` 门禁可检），不用裸文字或编号；
  文件名日期 = 主题**首提日期**（不是实现/归档日期）。
- **遗留形态 grandfather 条款**：note-format 门禁生效前无法对齐骨架的既有 Note，标注固定
  注释 `<!-- grandfather: ... -->`（内容有效不追改）；新篇一律按骨架写。

## 主动清理：把"隔一阵子清一次"变成同 diff 动作

**判定只看"还指不指导当前工作"，不看年龄。** 一条 Note 过时后按五类处置：

| 情况 | 处置 |
|---|---|
| 决定仍有效，只是路径/数字/名称漂移 | **原地更新**（「实际跑过的验证」按当时原样保留） |
| 结论被后续决定推翻，但仍会被搜到 / 被 docs 引用 | **留 implemented + 头部 `> 历史注记：<阶段>；<被谁取代 / 现行看哪>` + 互链** |
| 同一决定多个 owner / 重复记账 | **合并到一个 owner**；其余按完整取代吸收后删除 |
| 纯推敲，无独有决定理由 / 输掉的方案 / 证据 | **删**（archived 不是垃圾桶） |
| 完整交付、不再指导未来、历史价值低 | **archive**（冻结；此后正文不再补说明） |

**三个触发点（主动，不等体检）：**

1. **写时**：新增或修订 D 号、换 pin、改角色/机制的同 diff——搜同机制旧 Note；被取代者加
   历史注记，docs 里的指针改指现行；完整取代先吸收再删。
2. **审时**：[reviewing-a-delivery](../.agents/skills/reviewing-a-delivery/SKILL.md) 的跨面自审加一条：
   这次决定是否让某篇旧 Note 的现在时结论变假？是则同 diff 标历史 / 互链。
3. **发布前 / 换 pin 后**：按机制名抽查旧 Note（不按年龄、不通读），只处理"现在时结论已假"的。

**为什么不一刀切 archive**：archived **冻结后正文永不修改**——需要解释"被谁取代"的旧结论留在
implemented 才能补历史注记；归档只收"不再指导未来、且不需要再解释"的惰性件。

## 与 vendor 原生规则的差异（本仓适配，勿回写成 DSH 一手规则）

| 维度 | vendor `.agents/notes/` | 本仓 |
|---|---|---|
| 路径 | `.agents/notes/`（隐藏、agent 面） | `notes/`（顶层、人机共面）——人验收时直接看得到；`.agents/skills/` 已按 vendor 约定落地，notes 留在顶层是**登记的偏离**（代价：与 vendor 路径不同构；收益：人类可发现性） |
| 第二轴 | 生命周期 + **class 子目录**（feature/bug-fix/simplification/architecture/process/testing），closed set 由门禁脚本校验 | **无 class 层**（2026-10-10 阈值重估维持）：文件名 = 首提日期 + 主题已承载检索面——机制名检索实测逐词命中（2026-10-12 时点；篇数以 `ls notes/implemented` 为准）；class 五类对吸收/审计类为主的构成分辨力低，且批量搬家 = 全仓链接与登记簿重写的审阅噪声（超过 50 篇的计数阈值已越过而检索未失效，计数本身不构成触发）。**引入条件（可判定）**：机制名检索实测失败（已知存在的条目搜不到），或出现按类别批量审阅/浏览的常态工作流 |
| 冻结层 | `archived/`（implemented 可归档，归档树永久冻结） | **已设**（2026-09-27 用户指令激活）：单语单文件 + `> 归档：<日期>` 行，等价上游 triplet+hash seal 的本仓落地；判定 = vendor `dsh-archive-agent-notes` 的"未来决策价值"校准 |
| 格式骨架 | `## Problem` / `Decision` / `Alternatives considered` / `Verification` 强制，`verify-agent-note-format` 门禁 | 中文骨架：决定 / 输掉的方案 / 实际跑过的验证 / 环境状态（guides/60 §4）+ **轻量门禁 `note-format`**——**前 3 节机械强制**（含验证节，2026-10-08 补齐；词表容忍历史命名变体），`环境状态` 暂只由 guides/60 §4 声明、无门禁 |
| 取代检查 | 子树 AGENTS.md 硬触发：每新增 Note 搜同决定/同机制，完整取代同 PR 归档旧 triplet | 同（2026-09-24 吸纳：更新 owner / 部分互链 / 完整吸收后才删旧——见上节） |
| 集中索引 | 明文禁止建 `INDEX.md`（目录树即清单） | **同构**：各目录不建手抄索引（`note-status` 门禁只强制各子目录 README 在场） |
| 状态标记 | `Status: <status>` 头三行之第三行，裸值、无日期括号，目录互验（格式门禁） | 同构：`> 状态：<值>` 裸值 + 目录互验（`note-format` 门禁）；`archived/` 另有 `> 归档：<日期>` 行（冻结标记，vendor `Archived:` 行等价） |

**原生权威**（机制核对一律走它）：`vendor/dsh/.agents/notes/README.md`、
`vendor/dsh/.agents/notes/implemented/AGENTS.md`、`vendor/dsh/.agents/notes/archived/AGENTS.md`
（钉 tag 与只读铁律的正本 = [根 AGENTS.md §DSH 源码](../AGENTS.md)——此处不复述，防漂移）。
