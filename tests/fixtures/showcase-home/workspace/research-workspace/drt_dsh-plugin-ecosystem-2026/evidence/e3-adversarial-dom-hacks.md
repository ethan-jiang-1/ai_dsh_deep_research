---
title: 对抗复盘：侵入式 CSS Hack 与跨会话状态串台事故
source_url: https://engineering.example.org/postmortems/plugin-css-fragility
retrieved_at: 2026-11-28
quality: B
found_by: scout-2
supports: [T1, T2]
lens: adversarial
source_tier: secondary
publisher: engineering.example.org
---

# 对抗复盘：侵入式 CSS Hack 与跨会话状态串台事故

> 多起真实插件升级故障表明，依赖全局 `:has(...)` 隐藏宿主主输入框或直接借用当前活跃 `sessionId` 打开历史归档报告，会在宿主小版本升级或跨题切换时触发隐蔽崩溃与串台。

- 脆弱模式一：用全局选择器压盖宿主输入框，一旦宿主调整 DOM 层级即大面积失效。
- 脆弱模式二：工作台打开另一场研究终稿时未先切回所属会话，导致“A 题对话配 B 题报告”的认知混乱。

## Question List（本 topic）
- [x] 是否复核了至少两类具体生产脆性故障？
- [x] 是否给出了对应正统替代路径（`main` 面板 + Host 投影反查）？
