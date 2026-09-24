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

## 决定覆盖与取代检查（DSH SDLC reference 01 吸纳，2026-09-24）

来源：`/Users/bowhead/deepseek-harness/_agent_ready_development/sdlc-reference/
01-agent-note-lifecycle.md`（DSH 官方 SDLC 参考，点状吸纳不推翻——本仓既有规则不变，
下列为增量；吸纳 Note = [2026-09-24-note-lifecycle-absorption](implemented/2026-09-24-note-lifecycle-absorption.md)）。

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
  改写目标）——只改路径不改正文 = 未来计划伪装成当前事实。
- 互链只用相对 Markdown 链接（md-links 门禁可检），不用裸文字或编号；文件名日期 = 主题
  **首提日期**（不是实现/归档日期）。
- **遗留形态 grandfather 条款**：note-format 门禁生效前无法对齐骨架的既有 Note，标注固定
  注释 `<!-- grandfather: ... -->`（内容有效不追改）；新篇一律按骨架写。

## 与 vendor 原生规则的差异（本仓适配，勿回写成 DSH 一手规则）

| 维度 | vendor `.agents/notes/` | 本仓 |
|---|---|---|
| 第二轴 | 生命周期 + **class 子目录**（feature/bug-fix/simplification/architecture/process/testing），closed set 由门禁脚本校验 | **无 class 层**——当前规模用文件名主题即可分辨；class 化随「dsh-discipline 全量枚举」条目重估 |
| 冻结层 | `archived/`（implemented 可归档，归档树永久冻结） | **暂不设**——无归档需求；引入条件 = `implemented/` 出现"未来指导价值低"的存量 |
| 格式骨架 | `## Problem` / `Decision` / `Alternatives considered` / `Verification` 强制，`verify-agent-note-format` 门禁 | 中文骨架：决定 / 输掉的方案 / 实际跑过的验证 / 环境状态（guides/60 §4）+ **轻量门禁 `note-format`**（状态行与目录互验 + 骨架在场 regex 断言 + grandfather 条款——SDLC reference 01 吸纳） |
| 取代检查 | 子树 AGENTS.md 硬触发：每新增 Note 搜同决定/同机制，完整取代同 PR 归档旧 triplet | 同（2026-09-24 吸纳：更新 owner / 部分互链 / 完整吸收后才删旧——见上节） |
| 集中索引 | 明文禁止建 INDEX.md | 同（不建） |

**原生权威**（机制核对一律走它）：`.agents/notes/README.md`、
`.agents/notes/implemented/AGENTS.md`、`.agents/notes/archived/AGENTS.md`——在 vendor 树
（`/Users/bowhead/ai_dsh_company/vendor/dsh/`，钉 tag `dsh-v0.1.5-rc.2`，只读）。
