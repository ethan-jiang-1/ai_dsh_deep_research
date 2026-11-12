---
status: 已定性
opened: 2026-11-12
---

# 项目研究默认：每个项目起来时按哪套偏好跑

> 状态：已定性
> 问题：公司仓 `2026-11-12-startup-settings-landing.md`（composer 入口 + 右栏「项目策略」）能否、该怎样启发本仓？本仓已有的 setting 是什么？「项目级研究偏好」缺什么、值不值得做、最小形状是什么？
> 消费者：用户 2026-11-12 点名研究（本会话）；潜在消费者 = 后续 issue 卡（未建）
> 产出的卡：[2026-11-12 项目研究默认](../../settled_issues/2026-11-12-project-research-defaults.md)（已交付；D50）
> 结论：**落地形状已定：workspace `research-defaults.json`（只存 depth/output/source）+ `/research-defaults` host command（唯一写路径）+ `research:defaults` 每次 assembly 活求值的短 prompt + composer 状态按钮 + 现有「研究配置」页签的「项目默认」块；方法默认继续住方法库、面板只读；HITL1 三问不变，项目默认只作首推。** 这同时修掉「方法库默认没人消费」的 0/58 缺口。落地需新 D50（修订 D40 工作区形状与 D25 写路径）；方法行是否可在面板内直接改，是唯一需要用户拍板的 UX 取舍（本文建议只读，写入仍归方法库）。
> 证据评审：机制事实逐条在 pin 内复核（file:line 见材料）；交付证据见 Note。
> 归档：2026-11-12

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-12-settings-inventory.md](2026-11-12-settings-inventory.md) | 本仓五层设置/偏好载体现状、消费链、机制可行性（composer 槽/右栏/活求值 provider/workspace 读写边界）与已定决定边界 | 2026-11-12 |
| [2026-11-12-project-defaults-design.md](2026-11-12-project-defaults-design.md) | 落地蓝图（数据层 + 界面层）：文件/schema、`/research-defaults` command、`research:defaults` 注入、composer 按钮、配置页签面板、实现清单、验收、D50 草案 | 2026-11-12 |
| [ux/](ux/)（[主界面 SVG](ux/2026-11-12-project-defaults-main.svg) / [PNG](ux/2026-11-12-project-defaults-main.png)；[状态板 SVG](ux/2026-11-12-project-defaults-states.svg) / [PNG](ux/2026-11-12-project-defaults-states.png)） | 视觉稿：composer 状态按钮 + 右栏「项目默认」面板；入口四态/下拉「自动」/失效与回执/方法行只读 | 2026-11-12 |

## 一句话回答

**每个项目起来时，本仓先用该工作区方法库的 `〔默认偏好〕`（若有）+ `research-defaults.json` 里的 depth/output/source；其余维度「自动」，由 HITL1 三问现场确认。** 项目默认只做「短、显式、可偏离」的先验，不做启动必答项或硬策略；原因不是保守，是本仓自己的外部证据（澄清 2.81 问最优、个性化伤事实、偏好遵循 10 轮即崩）与 0/58 的方法库消费现状都指向同一结论。
