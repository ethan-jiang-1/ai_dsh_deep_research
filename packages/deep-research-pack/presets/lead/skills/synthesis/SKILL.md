---
name: synthesis
description: 综合写作（wave2 语义）方法论：纯综合先行、finding gap 定向补搜、final/ 当前版的来源链格式
---

# synthesis — 综合

证据回来后的写作纪律。核心：**先纯综合，后定向补搜**——一次性把已有证据榨干，再决定值不值得再搜。

## 流程

1. **纯综合（禁止新搜索）**：通读本 run bundle（drt_<slug>/）的 evidence/ 全部文件与 topics.md，写 findings.md——每个 finding 一行：结论 + 支撑证据文件 + gap 状态（`supported` / `needs_search` / `contradicted`）。
2. **gap 定向补搜**：只对 `needs_search` 的 finding 派一次定向任务（给 analyst 或 subagent，说清找什么、什么算找到）。补完更新 findings.md，**只补一轮**——补了还缺就把该 finding 标 `insufficient` 并在报告里如实呈现。
3. **写 final/ 当前版**（首版 v1.md）：结构 = 结论先行（TL;DR）→ 按 topic 的主体论述 → 反例与争议（不抹平）→ 证据缺口（insufficient 的如实列出）→ 来源清单。
4. **来源链格式**：每条关键结论后附 `[来源: evidence/<file>.md]`；来源清单节列出全部 evidence 文件（路径 + 一句话说明）。
5. **交 critic**：review.md 拿到 readiness: PASS 后，才向用户提交审阅建议（HITL2）。
   HITL2 卡片的**审阅摘要 ≤ 200 字**（约 4 行）——完整分析进 report 正文或 journal，卡片题干只留
   判决所需（结论一句话 + readiness 状态 + 最大残留）。实测依据（八场 77 张卡）：HITL1 卡全部
   ≤ 400 字无事故；6 张超长卡全是 HITL2（最长 1280 字），把选项挤出视口、人要滚动才能答题。
6. **交付前溯源自审（2026-09-27 定稿）**：出处链审查交给 critic 的**独立重抓**——对关键
   `source_url` 逐个 `web_fetch` 重新取回、逐格核对内容真实支撑（第六/八场实测这是比脚本更强的
   判据：验证的是内容，不只是"URL 出现过"；第八场 critic 重抓 23 URL、比对 340 格，0 误差）。
   **角色会话内没有任何命令执行能力**（无 bash/node，2026-09-27 实测：审计脚本在会话内跑不了，
   子代理也一样——别派"跑脚本"的任务）；机械审计 `scripts/evidence-audit.mjs` 由**操作侧**在
   交付后运行，发现落 bundle 的 `audit.md`。

## 判据

- findings.md 里没有 `contradicted` 被静默忽略（矛盾证据必须呈现）；
- 每条关键结论的 [来源: …] 指向真实存在的 evidence 文件（critic 会逐条猎）；
- 报告呈现了"我们不知道什么"（insufficient 清单），不是假装全知。

## 反模式

- 边写边搜（写作与搜索混流 = 证据碎片化，永远写不完）；
- 抹平分歧（两个来源打架时各打五十大板或取其一而不呈现冲突）；
- 把 C/D 级来源当关键支撑。
