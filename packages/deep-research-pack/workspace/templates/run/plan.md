# Plan — <run slug>

> 执行图（lead owner，过程件）。节点表是 canonical；Team task 是当前会话的执行镜像；`task_id` 只是
> 映射，不是持久身份。图必须无环；审查回边用版本化节点（`repair-r1` / `review-r2`）。
> 深度档：L0 快答 / L1 标准 / L2 深挖 / L3 穷尽（`depth` 列是研究深度，不是 Wave）。
> 全文 = question.md / topics.md / plan.md。
>
> **编号纪律：`W<wave>.<index>`。** `W2` 是 Wave 2（按 deps 算出的拓扑层，分组标题，不是任务）；
> `W2.1/W2.2` 是 Wave 2 内的节点；`W2.1.1` 是节点内部拆解，不是新 Wave。单节点 Wave 也写
> `W1.1`。Wave 由 deps 计算，不手写 LAYER 表；ID 前缀必须与计算 Wave 一致。跨 Wave 变化 =
> **重编号 + 重写记录旧号别名**（`W2.1 → W3.2`），不静默保留旧前缀。
> `stage` 由根节点 kind 派生（scan/dive/check/synthesis/review/gate；未知=unknown），不单独建列。
> 拆分/合并/删除只做墓碑（`lifecycle` = retired / merged_into / superseded_by），墓碑留在表里
> 供 byId 解析但不画图；旧号不复用。图版本：v1（每次重写递增）——**重写前先把当前
> `plan.md` 复制到 `plan/v<被取代的版本>.md`**（只读旧图快照）；`plan.md` 始终是唯一当前版。

## 节点表

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1.1 | — | active | broad-scan | <宽搜证据可能在哪儿> | scout | — | leads.md §T1 | 覆盖记录齐 + 每个 primary topic 有建议挖深 | 3 query 家族 | L1 | |
| W2.1 | — | active | deep-dive | <深挖哪个 claim> | analyst | W1.1 | evidence/t1-*.md | 深度记录齐 + ≥2 独立或显式单源 + 反例 | 2 轮 | L1 | |
| W2.2 | — | active | deep-dive | <并行的第二条深挖> | analyst | W1.1 | evidence/t2-*.md | 同上；与 W2.1 独立来源 | 2 轮 | L1 | |
| W3.1 | — | active | cross-check | <单源/矛盾/反例> | analyst | W2.1,W2.2 | evidence/t1-cross-*.md | 反例 query+结果 + 口径 | 1 轮 | L2 | |
| W4.1 | — | active | synthesis | <综合成 findings/final> | lead | W3.1 | findings.md + final.md | 每个 finding 有 [来源:] + gap 四态 | — | L1 | |
| W5.1 | — | active | review | <对抗审查> | critic | W4.1 | review.md | readiness 判据逐条 + 回边 ≤3 | — | L1 | |

<!-- 组内拆解示例（不升成新 Wave）：
| W2.1.1 | W2.1 | active | fetch | <W2.1 内部的逐字摘录> | analyst | — | evidence/t1-*.md | 七字段 + 口径 | 1 次 fetch | L2 | |
-->

## Wave 分组（计算值，不写进 id/表）

- Wave 1：W1.1
- Wave 2：W2.1、W2.2（并行；都只依赖 W1.1）
- Wave 3：W3.1
- Wave 4：W4.1
- Wave 5：W5.1

> 不手写 LAYER 表；若为说明写层，标“示意/非权威”。Wave 分组不是任务，不挂 output/task_id。

## 重写记录

<!-- append-only，最新在上；每次加/扩/拆/并/改边/重派一行：
- 日期 / 图版本 vN / 动作 / 节点 id / 原因 / journal 指针（版本号与头部 `图版本：vN` 必须一致）
- 跨 Wave 重编号必须写旧号 → 新号别名（例：`W2.1 → W3.2`）；旧号不复用
- 生命周期：lifecycle = active|retired|merged_into:W4.1|superseded_by:W6.1,W6.2；derived_from/moved_from 写在重写记录
-->
