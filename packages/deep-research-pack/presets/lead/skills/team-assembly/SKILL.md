---
name: team-assembly
description: 组队决策方法论：这次研究需要谁、不需要谁、走哪条通道（spawn_teammate vs subagent）
---

# team-assembly — 组队

topic 图定稿后、任何 spawn 之前加载。**名单定下来之前不 spawn 任何 teammate**；名单里没有的职能一个都不叫——超编与漏编都是你的失败。

## 组队矩阵

| 研究类型 | 组队 |
|---|---|
| `quick_factual` | subagent 单点查证 + **轻量 critic ×1**（草稿成型后进场，单条 review.md，只查数字转写与出处链）——主编亲自核证据**不能替代对抗审查**：自检与"审计自证"同构，你查不出你自己没看见的错 |
| `exploratory_map` | scout ×1（铺方向）+ analyst ×1–2（按 primary topic 数）+ critic ×1 |
| `claim_verification` | scout ×1 + analyst ×1（反例权重最高）+ critic ×1（必须有，验证类报告最容易自嗨） |

## 通道选择

- **spawn_teammate（团队通道，主通道）**：需要持续对话、任务板、多轮往返的协作——scout 汇报方向后 analyst 接力挖、critic 审查后 analyst 补证据，都是多轮往返，走团队。
- **subagent（一次性 worker）**：单点快捷查证（"去把这个数字查实"），前台等结果，不进任务板。

## 分派纪律

- 每个 topic 单一 owner（一个 analyst 负责的 topic 不重叠）；
- 每份派发（spawn prompt 与任务板 description 同标准）写全四件——任务板没有 reviewed/evidence 字段，验收约定不会被 service 自动解释，只认描述文本：①读哪些文件（question.md/topics.md/leads.md）；②产出什么文件；③验收判据；④怎么验证（可执行检查：evidence frontmatter 齐全、final 引用链真实、口径字段在场）；
- 任务完不成时派发里带修订动作（缺口的处理路径：定向补搜 / 降级标 gap / 上报重派），收"完成"只认文件事实与验证结果，不认 teammate 自报；
- critic 在草稿成型后才进场（提前进场没有可审对象，浪费一轮）。

## 事中调度（改派与加派）

- **锚点重叠改派**：开挖后发现两个 topic 的可行锚点同源（双人会重复钻同一批来源）→ 合并给一个 owner，另一个转纯 topic 或接新 task——改派走任务板 reassign + journal 记账（cn-us-cpu-gap 实证：T1/T2 锚点同源，task-3 中途 reassign analyst-hardware，market 专注 T4）；
- **补搜独立任务**：gap 补搜走任务板独立 task（写明补哪个 gap、什么算找到——范围锁定），不混进原挖掘任务（实证两场：cn-llm-pricing 专派 analyst-b 三项同 gap、cn-llm-infra task-6 W2-B 补搜）；
- 收"补完"只认文件事实（新证据卡落 evidence/ + findings.md 更新），不认 teammate 自报。

## 反模式

- 全员到齐再开工（scout 可以先行，analyst 等 leads.md）；
- 把团队通道当广播用（每个 teammate 的任务都要点名，不发"大家看看"）。
