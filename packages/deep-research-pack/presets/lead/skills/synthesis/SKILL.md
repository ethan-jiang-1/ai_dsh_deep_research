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
6. **交付前机械自审（2026-09-27 新增）**：HITL2 前派一个 subagent 跑溯源审计——
   `cd <仓库根> && node scripts/evidence-audit.mjs research-workspace/<本 slug>`。**CRITICAL 与
   `source_url 未抓取` MAJOR 必须处置后才能交付**（回抓该 URL、或换真实抓取过的来源、或在卡片
   frontmatter 降级说明）；其余分档（复合/转写不符/仅域名可溯源）属审计已知限制，**如实带入
   review.md，不硬凑零**。实测依据：critic 的散文审查在 40–57 卡规模下会漏 2–3 张未抓取的
   source_url（第五/七场），机械审计补上这道门。

## 判据

- findings.md 里没有 `contradicted` 被静默忽略（矛盾证据必须呈现）；
- 每条关键结论的 [来源: …] 指向真实存在的 evidence 文件（critic 会逐条猎）；
- 报告呈现了"我们不知道什么"（insufficient 清单），不是假装全知。

## 反模式

- 边写边搜（写作与搜索混流 = 证据碎片化，永远写不完）；
- 抹平分歧（两个来源打架时各打五十大板或取其一而不呈现冲突）；
- 把 C/D 级来源当关键支撑。
