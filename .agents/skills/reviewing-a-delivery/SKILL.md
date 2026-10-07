---
name: reviewing-a-delivery
description: Use when a change is about to be delivered, a queue item is about to graduate, or the user asks for a review — the adversarial self-review layer between mechanical gates and user acceptance, re-reading the live diff against intent, current docs, and evidence selection.
---

# 交付前对抗自审（语义自审层）

本技能是 **guidance，不是 checklist**：按实际 diff 与风险选择检查深度；相关技能：
[`.agents/skills/graduating-a-queue-item`](../graduating-a-queue-item/SKILL.md) ·
[`.agents/skills/writing-a-gate`](../writing-a-gate/SKILL.md)。

## 这一层补的是什么

交付判断有四个角色，各证明不同的东西：**机械检查**（门禁/契约测试——只证明它执行的
断言通过）、**语义自审**（本技能——意图-实现-文档-证据是否说的是同一件事）、**用户批准**
（Plan 呈批/验收——产品取舍归它）、**显式交互**（HITL 等）。本技能承担其中 agent 可自主
完成的角色——收尾绕过它，质量把关就全部压给用户。

## 触发

- 条目收尾前（[guides/60 §4](../../../docs/guides/60-dev-loop.md) 之前、毕业复查时）；
- 用户点名 review / 对质量有疑问时；
- 改动跨面（同时触及 pack、docs、scripts、notes 中多面）时必做。

## 从什么开始

重读**当前**工作树与 diff（`git status` + `git diff`），条目 RFC 的验收判据，受影响面的 owner
文档。不沿用旧 head 或上一轮会话的结论——review 的对象是现在这个 diff。

## 阻塞判据（任何一条答不上 = 未完成，不许收尾）

1. **意图对齐**：实现回答的是 RFC §问题吗？每条验收判据都能指出对应的实际证据（命令 +
   结果），还是只靠"应该没问题"？
2. **docs 同 diff**：改过的语义面，对应合同文档已同步（一个事实一个家）；没有第二份手写
   副本漂移；生成物（overlay / 工作区种子）是重生成而非手改。
3. **断言有效性**：新断言/新门禁在目标回归上真会失败吗（反证跑过吗）？**证据选型**对吗
   ——测试场景是否抓住本次改动的面，还是只是跑过而已（任务型路由表是正本）？
4. **完成判断四分离**：挂载（L1）、行为证据、安装形态（L2）、交付批准四件事分别观察了吗？
   未跑项与通过项分列了吗（"未跑" ≠ "通过"）？值级改动显式写"值级不可证"了吗？
5. **记录判据**：Note 触发判对了吗（只有持久决定理由才写）？毕业时正文改写了吗（计划体
   删干净了吗）？门禁两处同步了吗（gates 数组 + evaluation 台账）？

## 高风险语义扫描（按 diff 涉及面选查）

- 模型可见面（persona/skill/工具行文本）：金标准只许重写不许放宽；run 通道缓存重启了吗；
- 生成物链：pack 源 → overlay → 安装镜像 → 工作区种子，链条上每一环同步了吗；
- live 文档：计数、时变状态、变更叙事有没有混进"只写 now"的层（门禁语义面兜底）；
- 篡改断言迁就实现的情况：断言改动只许随行为/合同真实变化，不许放宽凑绿。

## 产出与边界

- Findings 分 **blocker / suggestion** 两档；blocker 全消或如实上报（含未跑项）才能进收尾；
- 报告只列**实际查过的**面，没查的面写明没查；
- 执行顺序：机械层先跑（`pnpm verify` / `pnpm test`），本层做语义判断，产品取舍交还用户
  呈批——语义判断不可机械化，这是本层以技能而非门禁存在的理由。
