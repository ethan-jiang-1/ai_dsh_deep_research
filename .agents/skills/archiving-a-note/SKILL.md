---
name: archiving-a-note
description: Use when archiving, deleting, merging, or auditing Agent Notes in this repo — classifies each note by future decision value, proves the absorbing owner exists, applies the mechanical archive move and pointer registry, and reconciles the batch report against the diff.
---

# 归档、删除与合并 Note（判断校准层）

本技能是 **guidance，不是 checklist**：按实际语料与风险选择深度；相关技能 =
[`reviewing-a-delivery`](../reviewing-a-delivery/SKILL.md)（交付自审）、
[`writing-a-gate`](../writing-a-gate/SKILL.md)（把能机械判的部分下沉）。

## 目标

**缩减活跃决定语料，但不擦掉仍能指导工作的历史。** 判每一篇的**未来决策价值**；
字数、年龄、配额是发现线索，**永远不是归档判据**。批量归档前先问一句：

> 这条理由，还会不会指导我们**下一次**要改的机制？

（本仓 2026-11-10 两批归档用的就是这句；原文在 `8822e48d` / `2bfc17c7` 的提交说明里。）

## 先读合同（不要凭记忆）

- 时态与清理规则：[notes/README.md](../../../notes/README.md) §主动清理、§决定覆盖与取代检查；
- 收件与写入时机：[notes/AGENTS.md](../../../notes/AGENTS.md)；
- 冻结层的进门条件与冻结纪律：[notes/archived/README.md](../../../notes/archived/README.md)；
- 活跃层维护义务：[notes/implemented/README.md](../../../notes/implemented/README.md)。

规则正文住上述 owner，本技能只给判断顺序与校准样例，不复制条文。

## 五类处置（先分类，再动手）

按"还指不指导当前工作"分，不按年龄：

| 处置 | 判据 | 边界 |
|---|---|---|
| **原地更新** | 决定仍有效，只是路径/名称/默认值漂移 | 只改事实，不改决定；不追加变更史 |
| **历史注记 + 互链** | 结论被推翻，但仍会被搜到 / 被 docs 引用 | 头部加 `> 历史注记：…；现行看哪`，与新 owner 互链 |
| **合并到 owner** | 同一决定多个 owner / 重复记账 | 新 owner 吸收旧篇全部独有的理由、输掉的方案、验证、环境状态后才删旧 |
| **删除** | 纯机械 / 小 UI 记录；或完整取代后无独有内容 | 先于"保留/归档"判定；本地 bug fix、性能、新能力不因实现小而删 |
| **归档** | 完整交付、理由不再指导未来、但仍有历史价值 | 冻结后正文不再改；`rejected/` 与 `proposed/` **永不归档**——过时提案驳回，否决条只在还能防重犯时保留 |

`rejected/` 的保留条件：输掉的方案仍是**诱人的、有意义的错误**，且这篇说明它为什么输；
否则整篇删。`proposed/` 过时 → 加一句理由驳回，不进归档。

## 取证程序（判断"未来价值"之前）

1. **读当前世界**：代码、配置、包/手册、门禁台账、更新的 Note；
2. **grep 全部 live 面**：`docs/`、`_backlog/`、`scripts/`、`tests/`、`packs/`——
   找真实引用，不只看同目录邻居；
3. **确认承接 owner**：理由是被 code / gate / skill / docs / 新 Note **完整**承接，
   还是只"看起来有承接文件"？后者不算（2026-10-08 体检的 8/8 反例就是这种）；
4. **查入链**：活面→冻结件的 Markdown 链接必须在 `scripts/archived-note-pointers.json`
   登记（`archived-note-pointer` 门禁会红）；归档前能改指现行权威的，改指而不是登记。

## 校准样例（规模与判定方向无关）

| 判定 | 实例 | 规模 | 为什么 |
|---|---|---:|---|
| 留活跃 | [run-bundle-charter](../../../notes/implemented/2026-10-23-run-bundle-charter.md) | 425 行 | 有活测试解析其 §未决；**大不是删的理由** |
| 留活跃 | [project-navigability-phase1](../../../notes/implemented/2026-10-05-project-navigability-phase1.md) | 59 行 | evaluation 红证出处；**小不是留的理由** |
| 归档 | [notes-consistency-sweep](../../../notes/archived/2026-10-30-notes-consistency-sweep.md) | 110 行 | 规则已吸收进 notes/README + AGENTS；历史价值保留 |
| 归档 | [vendor-pin-bump-020rc2](../../../notes/archived/2026-09-30-vendor-pin-bump-020rc2.md) | 131 行 | 被新 pin 取代；机制已不在 |
| 删 | 2026-10-08 体检的严格轮候选 | — | 看起来完整、承接不完整的 8/8 反例：**"承接文件存在" ≠ "唯一理由已被承接"** |
| 边界 | hitl-docking-polish / node-topology-procedure | — | 先补可复核面再归档；"边界个案用判断并留档" |

## 一次归档的最小动作

1. `git mv`（或等价移动）整篇到 `notes/archived/<原文件名>`；**不改文件名的日期**
   （日期 = 主题首提日，不是归档日）；
2. 唯一正文编辑 = 在 `> 状态：<值>` 下插一行 `> 归档：YYYY-MM-DD`（与状态行三行内；
   允许空引用行）；正文其余零改动；
3. 活面入链：改指现行权威，或按 `archived-note-pointer` 登记为历史指针（带理由）；
4. 跑 `pnpm verify`，先看 `md-links` / `archived-note-pointer` / `note-format` 红，
   修到绿——本仓两批归档都是"红→绿"推进的；
5. 不在冻结件里检修出链，不把归档件当现行权威引用。

## 报告（没有对账就不算完成）

批量归档/删除结束时给出：

- 保留 / 归档 / 删除各多少，**每篇一行的理由**；
- 边界个案单列，写清为什么难判、最后怎么判；
- 报告名单与本轮 `git diff --name-status` **逐条对账**——2026-11-10 两批的报告出现过
  "列进归档示例但实际仍在 implemented"的漂移；对不上就不算完成；
- 残余：未处理的候选、需要另卡的更大动作、需要用户拍板的取舍。

## 已知边界

- 归档判断本身**不可机械判定**；机械面只保证形状、元数据与入链可见性
  （`note-tree` / `note-format` / `archived-note-pointer`）。
- 冻结层出链当前**仍被**链接门禁扫描；因此仓库级改名可能逼你改冻结件。遇到时按
  `notes/archived/README.md` 的边界与交付自审处理，不要擅自检修历史——是否把出链排除出
  链接门禁是 P1 的独立决定（研究 = `_backlog/research/notes-discipline-borrow/`）。
- 本技能不替代用户对"删/留"的业务判断；技术证据归 agent，业务验收归用户。
