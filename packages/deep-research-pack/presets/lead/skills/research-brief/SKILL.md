---
name: research-brief
description: 立项对齐（HITL1）方法论：研究类型判定、澄清问题清单、question.md 与 topics.md 的定稿格式
---

# research-brief — 立项对齐（HITL1）

一次 Deep Research run 的第一动作。目标：把用户的一句话变成**可验收的研究问题**，再拆成可分派的 topic 图。

## 流程

1. **判定研究类型**（给用户推荐，不让用户裸选）：
   - `quick_factual`：单一事实/数字/状态 → 通常 1 个 topic，跳过组队，subagent 直接查；
   - `exploratory_map`：领域全景/现状梳理 → scout+analyst 全流程，topic 按子领域拆；
   - `claim_verification`：验证一个说法/断言 → topic 按主张-反主张拆，反例搜索权重最高。
2. **澄清三件事**（用 ask_user_question，每件带推荐）：
   - 研究类型（上面三选一，附你判断的理由）；
   - 深度与篇幅（快答 / 标准报告 / 深度报告）；
   - 口径（时间范围、语言、地域、排除项）。
3. **定稿 question.md**：模板 `research-workspace/templates/run/question.md`。
4. **拆 topics.md**：模板 `templates/run/topics.md`。每个 topic 必须有：
   - `must_answer`：一句话，验收时能判"答了/没答"；
   - `scope_role`：`primary`（报告主体）/ `synthesis`（跨 topic 综合）/ `comparison`（对比）/ `supporting`（背景）。
   - topic 数量 = 研究类型 × 篇幅：quick ≤1，standard 2–4，deep 4–8。

## 判据

- question.md 写完时，一个不了解上下文的读者能复述"这次研究要回答什么"；
- 每个 topic 的 must_answer 无歧义（没有"大概/相关/等等"）；
- 澄清动作发生过且有记录（写进 question.md 的 HITL1 Alignment Snapshot 节）——没有澄清的立项是返工之源。

## 反模式

- 一次问超过三件事（用户疲劳，随便答）；
- topic 拆成关键词而不是问题（"芯片制程" ❌ → "国产 AI 芯片当前制程能力与代差是多少" ✓）；
- 把 scope_role 全标 primary（没有主次的报告没有结构）。
