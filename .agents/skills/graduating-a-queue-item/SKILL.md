---
name: graduating-a-queue-item
description: Use when a roadmap queue item is delivered or abandoned and must leave the queue — moving its RFC from notes/proposed/ to notes/implemented/, rewriting the plan voice into shipped facts, deleting the roadmap line, and closing the gates.
---

# 毕业一个队列条目

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择动作，完成判据在各步末；相关技能：[`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md) · [`.agents/skills/running-a-research-run`](../running-a-research-run/SKILL.md)。

条目收尾是一次**原子移动**：队列行、RFC 位置、正文时态、门禁、台账同一步完成。
判据由 `docs/evaluation.md` 与该条目的 RFC §验收 拥有；本技能只给执行顺序与判断点。

## 1. 先判是否真的可以毕业

打开 RFC 的 §验收判据，逐条指出**跑过的命令或读过的文件**。任何一条只能靠"应该没问题"
回答 → 条目未完成，停在这里继续做。

判据至少包含：该面的最小真检查（L0/L1/L2/L4 中适用者）全绿；实际跑过的验证有记录；
未运行项如实分开（"未跑"不是"通过"）。

## 2. 毕业 = 正文改写，不是改路径

把计划体改写成已交付事实体：

- 未来时态、迁移计划、待办清单删除——它们若仍有效，属于新条目而非本 Note；
- 每条 §验收判据对应一段"实际怎么验的"（命令 + 结果 + 日期）；
- 决定与输掉的方案保持在场（`note-format` 门禁断言 `## 决定` + `## 输掉的方案`）；
- 遗留形态（门禁生效前、无法重建骨架的旧 Note）标 `<!-- grandfather: … -->` 注释，不追改。

只 `git mv` 不改正文 = 未来计划伪装成当前事实；`note-format` 不查这一点，靠这一步。

## 3. 移动、删行、对账

1. `git mv notes/proposed/<file>.md notes/implemented/<file>.md`；
2. 删 roadmap §队列 的条目行；后续条目重编号；**▶ 指针必须恰好一个**（`entry-chain` 门禁）；
3. 若条目引入或修改了机制：docs 合同面同 diff 更新（`docs/` 只写 now）；
4. 全仓清扫指回旧路径的链接（`md-links` + `md-anchors` 门禁）；
5. 条目产生的新事实（新坑、新机制）→ 新条目或事实进 Note，不入队列历史。

## 4. 收尾验证（完成判据）

按改动面选证据（见 `writing-a-gate` 与 guides/60 §2），至少：

```sh
node scripts/verify.mjs
node --test tests/*.test.mjs
```

改了 docs/AGENTS/roadmap → 追加 `node scripts/entry-chain-probe.mjs`（真模型档）。

全绿 + RFC 正文已改写 + 队列行已删 → 本条目毕业；commit 用窄证据切片，正文写清
"条目离队 + 判据如何闭"。
