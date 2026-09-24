# notes/ — 本仓开发记忆（DSH 流程核心数据）

> 层：时间（为什么/怎么走到这里）。与 `docs/`（当前合同，只写 now）严格分工：
> **docs 说"现在是什么"，notes 说"为什么是它、放弃了什么、跑了什么验证"。**
> 地位的强调（读取/写入触发）= [AGENTS.md §`notes/`](../AGENTS.md)；本文件只定目录规则。

## 为什么不按"时间"再分子目录

`notes/` 整体是时间维度，但内部按**生命周期**分（vendor `.agents/notes/` 同构）——
按时间分目录必然长出"烂尾层"（company D10 教义，见 [00-index §组织原则](../docs/00-index.md)）。

## 布局

| 路径 | 放什么 | 进门条件 | 出门 |
|---|---|---|---|
| `intents.md` | 初始意图与用户指令存档（为什么起这个项目、原话要点） | 立项/用户给新方向时追加 | 追加式，不删 |
| `proposed/` | **队列条目的 RFC 全文**（一文件一条目：问题/方案/输掉的方案/验收判据） | roadmap §队列须有对应条目（verify 门禁 `proposal-scheduled` 强制） | 条目收尾 → 迁 `implemented/`，队列行删除 |
| `implemented/` | 已落地的决定记录（决定/输掉的方案/实际跑过的验证/环境状态） | RFC 毕业，或非队列条目的整治轮收尾 | **活的**：事实随实现维护；逆转另写新 Note 互链 |
| `rejected/` | 被否决的方案——**只保留仍能阻止一次诱人重犯的** | 方案被否决且理由有未来价值 | 不再有防复犯价值 → 直接删（不留空壳） |
| `postmortem/` | 事故复盘（事故叙事的唯一合法层） | 出现值得记的事故 | 事实澄清后仍留（历史记录） |
| `research/` | 外部研究/考古报告（仍在被引用的） | 研究产出并被 docs 或决定引用 | 不再被引用 → 删或并入 |

细则：`proposed/` 见 [proposed/README.md](proposed/README.md)；`rejected/` 与
`postmortem/` 见各自 README（`postmortem/` 当前为空——本仓尚未发生需复盘的事故，
第一个事故按该 README 落档）。

## 与 vendor 原生规则的差异（本仓适配，勿回写成 DSH 一手规则）

| 维度 | vendor `.agents/notes/` | 本仓 |
|---|---|---|
| 第二轴 | 生命周期 + **class 子目录**（feature/bug-fix/simplification/architecture/process/testing），closed set 由门禁脚本校验 | **无 class 层**——当前规模用文件名主题即可分辨；class 化随「dsh-discipline 全量枚举」条目重估 |
| 冻结层 | `archived/`（implemented 可归档，归档树永久冻结） | **暂不设**——无归档需求；引入条件 = `implemented/` 出现"未来指导价值低"的存量 |
| 格式骨架 | `## Problem` / `Decision` / `Alternatives considered` / `Verification` 强制，`verify-agent-note-format` 门禁 | 中文骨架：决定 / 输掉的方案 / 实际跑过的验证 / 环境状态（guides/60 §4），**无格式门禁**（断言对象是自控文本，首版零依赖原则） |
| 集中索引 | 明文禁止建 INDEX.md | 同（不建） |

**原生权威**（机制核对一律走它）：`.agents/notes/README.md`、
`.agents/notes/implemented/AGENTS.md`、`.agents/notes/archived/AGENTS.md`——在 vendor 树
（`/Users/bowhead/ai_dsh_company/vendor/dsh/`，钉 tag `dsh-v0.1.5-rc.2`，只读）。
