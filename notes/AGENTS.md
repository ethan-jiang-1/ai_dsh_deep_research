# AGENTS.md — Agent Note 常设指令

本文件拥有 `notes/` 的**常设指令**（每轮都适用）；目录时态、状态标记与与上游的差异由
[notes/README.md](README.md) 拥有。上游对应物 = DSH `.agents/notes/AGENTS.md`
（`vendor/dsh/.agents/notes/AGENTS.md`，机制权威）。

## 什么时候必须写 Note

**只有承载持久决定理由的变更需要 Note**——代码/测试/现有文档解释不了的"为什么选它、
主动放弃了什么"。机械与局部编辑豁免（含本地 UI 呈现与交互改动）。写入触发 = **同一变更**（不是事后补）。

## 每新增一篇 Note：取代检查（硬触发）

搜活动树里覆盖同一决定或机制的旧 Note，然后三选一：

- 已有 owner 拥有同一决定 → **更新它**，不新建重复；
- **部分取代** → 双方保留并在相对 Markdown 链接里互链，更新仍然有效的事实；
- **完整取代** → 新 Note 吸收旧 Note 全部独有的决定理由/输掉的方案/验证/环境状态后，
  旧 implemented Note 才可删除。

## 格式（note-format 门禁机械强制）

- 头部状态行：`> 状态：<值>`，值 ∈ `proposed | approved | superseded | implemented |
  rejected`，**与所在目录互验**；状态里不带日期与括号（日期在文件名 = 主题首提日期）；
- implemented 骨架（`note-format` 门禁强制前三节）：`## 决定` + `## 输掉的方案`
  （"没记击败了什么的决定会重开讼"）+ `## 实际跑过的验证`（**无证据的"完成"不算完成**；
  标题含 验证/检查/验收/实录/记录/实证/探针/全绿/复验/证据 任一即认，容忍历史命名变体）；
- proposed RFC：状态行 + 问题/方案/输掉的方案/验收；
- 章节名映射（本仓 ↔ 上游 canonical）：问题 ↔ `## Problem` · 决定 ↔ `## Decision` ·
  输掉的方案 ↔ `## Alternatives considered` · 验证 ↔ `## Verification`/`## Testing` ·
  环境状态 ↔ `## Consequences`；
- 遗留形态（门禁生效前、无法重建骨架）标 `<!-- grandfather: … -->`，内容有效不追改。

## 毕业与命名

- 毕业 = **正文改写**（计划体 → 已交付事实体，删未来时态与迁移计划）+ 迁
  `implemented/` + 删 _backlog/queue.md 队列行；只改路径不改正文 = 未来计划伪装成当前事实；
- 毕业 Note 不再指导未来工作时 → 搬 `archived/` 冻结（进门条件与纪律 =
  [notes/archived/README.md](archived/README.md)；vendor `dsh-archive-agent-notes` 校准：
  按未来决策价值判定，不按年龄字数；红证/台账引用/负知识/复活条件在身者留活跃）；
- 文件名日期 = 主题**首提日期**（不是实现或归档日期）；
- 互链只用相对 Markdown 链接（`md-links` + `md-anchors` 门禁可检）。
