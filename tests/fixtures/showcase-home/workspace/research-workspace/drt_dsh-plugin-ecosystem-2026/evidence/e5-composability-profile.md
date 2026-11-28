---
title: 学术综述：独立 Critic 主张核查与证据链可追溯性设计
source_url: https://arxiv.org/abs/2605.01234
retrieved_at: 2026-11-28
quality: A
found_by: analyst-1
supports: [T1, T3]
lens: academic
source_tier: primary
publisher: arxiv.org
---

# 学术综述：独立 Critic 主张核查与证据链可追溯性设计

> 将写作（Synthesis）与核查（Adversarial Review）拆分为独立上下文角色，并要求产出结构化 `claims.json × verdicts.json` 对账表，可显著降低模型自我确认偏差并提升高风险场景下的人类审阅效率。

- 当关键主张缺失一手来源或存在反例时，系统须显性标注 `partial` / `unsupported` / `UNVERIFIED`，严禁静默折为通过。
- 在阅读端提供「仅看存疑与未核查」风险过滤器，可将审阅注意力集中在真正需要人类拍板的边界结论上。

## Question List（本 topic）
- [x] 是否验证了独立上下文角色对确认偏差的抑制作用？
- [x] 是否要求缺失 verdict 必须显性标为 UNVERIFIED？
