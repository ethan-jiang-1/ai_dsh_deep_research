# Plan — <run slug>

> 执行图（lead owner，过程件）。节点表是 canonical；Team task 是当前会话的执行镜像；`task_id` 只是
> 映射，不是持久身份。图必须无环；审查回边用版本化节点（`repair-r1` / `review-r2`）。
> 深度档：L0 快答 / L1 标准 / L2 深挖 / L3 穷尽（`depth` 列是研究深度，不是 LAYER 拓扑层）。
> 全文 = question.md / topics.md / plan.md。
>
> **编号纪律：W 是 ID，不是序号。** 只分配、不重排、不回收；新增节点取下一个空号（W6），不把
> W4 改成 W5。W1/W2… 是稳定工作包；子工作 W3.1/W3.1.1，父节点 W3 保留，外部
> deps/output/acceptance/反馈都挂 W3。`stage` 由根 W 的 kind 派生（scan/dive/check/synthesis/
> review/gate；未知 = unknown），不单独建列。图上的拓扑层叫 **LAYER**（计算值），不是 W。
> 拆分/合并/删除只做墓碑（`lifecycle` = retired / merged_into / superseded_by），墓碑留在表里
> 供 byId 解析但不画图；旧号不复用。图版本：v1（每次重写递增）。

## 节点表

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1 | — | active | broad-scan | <宽搜证据可能在哪儿> | scout | — | leads.md §T1 | 覆盖记录齐 + 每个 primary topic 有建议挖深 | 3 query 家族 | L1 | |
| W2 | — | active | deep-dive | <深挖哪个 claim> | analyst | W1 | evidence/t1-*.md | 深度记录齐 + ≥2 独立或显式单源 + 反例 | 2 轮 | L1 | |
| W3 | — | active | cross-check | <单源/矛盾/反例> | analyst | W2 | evidence/t1-cross-*.md | 反例 query+结果 + 口径 | 1 轮 | L2 | |
| W4 | — | active | synthesis | <综合成 findings/final> | lead | W2,W3 | findings.md + final.md | 每个 finding 有 [来源:] + gap 四态 | — | L1 | |
| W5 | — | active | review | <对抗审查> | critic | W4 | review.md | readiness 判据逐条 + 回边 ≤3 | — | L1 | |

<!-- 复合节点示例（按需加行，不重排父号）：
| W3.1 | W3 | active | search | <W3 内部的官方页定位> | analyst | — | leads 片段 | 官方 URL | 1 次 search | L2 | |
| W3.1.1 | W3.1 | active | fetch | <逐字摘录> | analyst | — | evidence/t1-*.md | 七字段 + 口径 | 1 次 fetch | L2 | |
-->

## 重写记录

<!-- append-only，最新在上；每次加/扩/拆/并/改边/重派一行：
- 日期 / 图版本 vN / 动作（加节点|扩复合子图|拆对外节点|并节点|改边|重派）/ 节点 id / 原因 / journal 指针
- 生命周期：lifecycle = active|retired|merged_into:W4|superseded_by:W7,W8；derived_from/moved_from 写在重写记录
- 旧号不复用；新顶层 W 追加新号，不按图上顺序重排
-->
