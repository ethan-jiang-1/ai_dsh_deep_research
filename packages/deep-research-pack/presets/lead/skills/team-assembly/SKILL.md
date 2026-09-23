---
name: team-assembly
description: 组队决策方法论：这次研究需要谁、不需要谁、走哪条通道（spawn_teammate vs subagent）
---

# team-assembly — 组队

topic 图定稿后、任何 spawn 之前加载。**名单定下来之前不 spawn 任何 teammate**；名单里没有的职能一个都不叫——超编与漏编都是你的失败。

## 组队矩阵

| 研究类型 | 组队 |
|---|---|
| `quick_factual` | 不组队。subagent 单点查证，主编亲自核证据后直接交付 |
| `exploratory_map` | scout ×1（铺方向）+ analyst ×1–2（按 primary topic 数）+ critic ×1 |
| `claim_verification` | scout ×1 + analyst ×1（反例权重最高）+ critic ×1（必须有，验证类报告最容易自嗨） |

## 通道选择

- **spawn_teammate（团队通道，主通道）**：需要持续对话、任务板、多轮往返的协作——scout 汇报方向后 analyst 接力挖、critic 审查后 analyst 补证据，都是多轮往返，走团队。
- **subagent（一次性 worker）**：单点快捷查证（"去把这个数字查实"），前台等结果，不进任务板。

## 分派纪律

- 每个 topic 单一 owner（一个 analyst 负责的 topic 不重叠）；
- 每个 teammate 的第一份任务写清：读哪些文件（question.md/topics.md/leads.md）、产出什么文件、验收判据是什么；
- critic 在草稿成型后才进场（提前进场没有可审对象，浪费一轮）。

## 反模式

- 全员到齐再开工（scout 可以先行，analyst 等 leads.md）；
- 把团队通道当广播用（每个 teammate 的任务都要点名，不发"大家看看"）。
