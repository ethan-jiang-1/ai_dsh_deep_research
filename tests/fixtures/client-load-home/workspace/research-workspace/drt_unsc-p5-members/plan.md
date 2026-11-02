# Plan — drt_unsc-p5-members

图版本：v1

## 执行图（L0 快答：轻 Scan → 单点 Dive → 轻量 Critic）

| id | parent | lifecycle | kind | question | owner_role | deps | output | acceptance | budget | depth | task_id |
|---|---|---|---|---|---|---|---|---|---|---|---|
| W1.1 | — | active | deep-dive | 抓取 UN 官方页面与《联合国宪章》第二十三条原文，逐字摘录五常名单 | analyst | — | evidence/t1-*.md + provenance/t1-*.json | 每条卡 frontmatter 七字段齐 + `> ` 行只含原文 + source_url 由 web_fetch 成功取回 | 1 轮 / ≤6 fetch | L0 | plan-only（subagent 通道，不建 Team 板） |
| W2.1 | — | active | synthesis | 用现存 evidence 写一句话答案 + findings 账本 | lead | W1.1 | findings.md + final.md | 关键结论带 [来源: evidence/xx.md]；口径（截至 2026-11-01）在场 | 1 轮 | L0 | plan-only |
| W3.1 | — | active | review | 对抗核查：来源链、逐字转写、独立信源、口径 | critic | W2.1 | review.md（终局块 readiness） | readiness: PASS/FAIL + CRITICAL/MAJOR 清单 | 1 轮 | L0 | plan-only |
| W4.1 | — | active | gate | HITL2 审阅 → 交付副本 final/v1 + present + 记账 | lead | W3.1 | question.md §Decisions + final/v1.md + delivered 指针 | 拍板行在场 + present 声明 | 1 轮 | L0 | plan-only |

- 组队判断：quick_factual（P1 分派结论）→ **不 spawn teammate**；W1.1 走 one-shot subagent（agent_preset=analyst），W3.1 走 subagent（agent_preset=critic）。
- 深度映射：快答 = L0；L2 触发条件（关键 claim 单源 / 口径缺失）若在 W3.1 命中，加一个 W1.2 定向补搜再回 W3.1（review-r2）。

## 剩余工作

- W1.1 证据抽取：完成（9 卡 + 9 provenance + _failed.md）
- W2.1 综合：完成（findings.md + final.md v0）
- W3.1 critic 第 1 轮：PASS（CRITICAL 0 / MAJOR 1 / MINOR 6）
- W1.2 定向修补（analyst subagent）：补 `un-sc-membership-research-guide.md` 摘录漏项（M1）——进行中
- W2.2 表述修订（lead，版本号不变）：m1/m2/m3/m6 已落 final.md——完成
- W3.2 critic 第 2 轮复核（改稿后必须重审）：待 W1.2 回来
- W4.1 HITL2 + 交付副本 final/v1 + present + 记账
