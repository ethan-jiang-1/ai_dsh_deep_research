# archived/ — 冻结快照（过去时：不再指导当前工作的已交付决定）

> **时态：过去（冻结）**。本目录是 [implemented/](../implemented/README.md) 的冷层：
> 完整交付但**不太可能再指导未来工作**的 Note 搬到这里永久封存。原生对应物 = vendor
> `.agents/notes/archived/`；归档判定流程 = vendor skill `dsh-archive-agent-notes`
> （本仓无 triplet/hash 基础设施，按"单文件 + 归档行"等价落地——见 [notes/README](../README.md) 差异表）。

## 进门条件（vendor 校准：按未来决策价值，不按字数与年龄）

一条 implemented Note 满足**全部**三条才搬入：

1. 决定完整交付（无未兑现承诺）；
2. 它的 rationale / alternatives / 反保证 / 所有权边界**不再可能指导未来变更**
   （对照面：红证证据链、D 号台账引用、负知识、复活条件、现行指南引用者一律**留活跃**）；
3. 历史理由仍值得保留（纯机械/小 UI 记录按 vendor 判据应**直接删**，不进这里）。

不为凑数归档；边界个案用判断并留档。

## 冻结纪律

- **正文永不修改**：不重排版、不更新事实、不补链接、不删除——快照就是快照；
- 搬移时唯一的机械编辑 = 在 `> 状态：implemented` 行下插一行 `> 归档：<日期>`（vendor
  `Archived: YYYY-MM-DD` 的单语等价物）；
- **不检修档案的出链**（vendor 原话：do not inspect or repair links out of archived
  notes）——已知限制：本仓 `md-links` 门禁仍扫 archived 文件的出链，目标将来移位导致红时，
  处置走门禁侧豁免（届时按 writing-a-gate 程序改 md-links 作用域），**不回改档案**。
  边界：搬移当时因路径变更产生的出链重定向（仅改相对路径、不动任何内容）属于归档变更
  本身，不算检修；此后冻结。
- 活跃文本指向本目录的入链在搬移时重定向（改指现行权威，或显式引用历史快照时指到本路径）。

## 出门

无。复活 = 写**新** Note 引用本目录快照，档案本体不动（冻结层不参与取代检查的"更新 owner"
分支——取代动作发生在活跃区）。
