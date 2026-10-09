---
name: graduating-a-queue-item
description: Use when authorized work tracked in the optional queue is completed or stopped and its index row must be updated or removed; graduate a proposed RFC only when one exists and its persistent decision rationale needs retention.
---

# 毕业一个队列条目

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末；相关技能：[`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md) · [`.agents/skills/running-a-research-run`](../running-a-research-run/SKILL.md)。

队列是已授权工作的可选顺序索引，不是授权来源。收尾时只更新该索引行及实际存在、且适用的 RFC/Note；不为队列项补造 RFC。
判据由 `docs/evaluation.md` 与已存在的授权要求或验收记录拥有；本技能只给索引收尾顺序与判断点。

## 1. 先判是否真的可以毕业

按用户授权与改动面确认实际验收要求；若存在 RFC，则逐条对账其 §验收判据并指出实际证据。任何已约定判据只能靠"应该没问题"回答 → 工作未验收，停在这里继续做。

适用的最小真检查（L0/L1/L2/L4）须通过；实际运行证据与未运行项分开记录（"未跑"不是"通过"）。

## 2. RFC 存在时才毕业 Note

只有当该队列工作确有 `notes/proposed/` RFC，且交付后持久决定理由仍需维护时，才把 RFC 改写为已交付事实并迁入 `implemented/`：

- 删除未来时态和迁移计划；未完成的新工作单独记录，避免混入已交付决定；
- 实际验证按要求记录命令、结果和日期；未运行项如实标出；
- 决定与输掉的方案保持在场；遵循 [notes/AGENTS](../../../notes/README.md) 的骨架与取代检查。

若无 RFC，或无需持久决定 Note，不创建替代文档；仅按 [notes/AGENTS](../../../notes/README.md) 判定是否有 Note 义务。

## 3. 更新可选索引与对账

1. 队列中的已完成或停止条目从对应位置移除/更新，保留有效的后续次序；
2. **▶ 仅表示队列内当前顺序项**，不得据此推断未登记的工作未授权或不存在；
3. 若对应 RFC 按 §2 毕业，迁移后修复入站 Markdown 链接；
4. 若条目引入或修改机制：docs 合同面同 diff 更新（`docs/` 只写 now）；
5. 按改动范围运行链接、结构与回归检查；新发现问题归其 owner，不塞入队列历史。

## 4. 收尾验证（完成判据）

按改动面选证据（见 `writing-a-gate` 与 guides/60 §2），至少：

```sh
pnpm verify
pnpm test
```

改了 docs/AGENTS/queue → 追加 `node scripts/probe/entry-chain-probe.mjs`（真模型档）。

适用验收全绿 + 队列索引已更新 + 如有 RFC 已按 §2 收尾 → 条目离队；commit 用窄证据切片说明实际交付与证据。
