# 60 · 意图载体总图：意图从哪进、从哪出

本页拥有的事实 = 本仓意图载体的 owner、用途、适用条件与出场方式。规则正文住各自 owner，本页只给总图与指针。
对照物 = DSH SDLC 参考卷 `09-intake-and-work-items.md`（仓外语料，钉版登记 = [external-materials.md](../external-materials.md)，仓内不可解析）；本仓按单人文件工作流适配，不承接其 GitHub Issue/Project 状态机。
读入口 = [00-index §文档地图](../00-index.md)。

## 一、载体清单

| 载体 | owner（规则正文） | 拥有的唯一事实 | 适用条件 | 出场方式 |
|---|---|---|---|---|
| [`_backlog/issues/`](../../_backlog/issues/README.md) 问题卡 | [_backlog/README](../../_backlog/README.md) | 问题、目标、已知与未决、结论和去向 | 需要跨轮澄清或留存问题判断；不是实施前置 | 按 [结论去向](../../_backlog/methods/issue-to-note.md) 选择载体后归档 |
| [`_backlog/bugs/`](../../_backlog/bugs/README.md) 缺陷卡 | [_backlog/README](../../_backlog/README.md) | 已发现但本次不修的缺陷 | 确认暂不修（当场修的无需建卡）；翻「修复就绪」即自带 P1/P2 修理型修复授权（[D24](../00-index.md) 唯一例外——P0 与触面例外走等人拍板） | 修复或查明未修后归档；修复承载持久决定时按结论去向记 `去向` 与载体 |
| [`_backlog/research/`](../../_backlog/research/README.md) 调研 | [_backlog/README](../../_backlog/README.md) | 被活跃问题引用的长篇证据与研究材料 | 需要保留并服务问题判断 | 最后一张活跃问题卡离开时归档 |
| [`_backlog/methods/`](../../_backlog/methods/README.md) 方法 | [_backlog/README](../../_backlog/README.md) | 需求澄清、查证、验收设计、结论去向、证据路由与判断的按需方法 | 只加载当前问题所需方法；不是实施授权 | 随实践维护，不载具体问题进度 |
| [`_backlog/triggers.md`](../../_backlog/triggers.md) | [_backlog/README](../../_backlog/README.md) | 工作中可直接观察到的重议条件 | 仅当遗漏会导致重犯，且触发能在正常工作中遇到 | 条件到场后按新决定重进；否则由 owner 保留结论 |
| [`notes/proposed/`](../../notes/proposed/) RFC | [notes/AGENTS](../../notes/AGENTS.md) | 需要显式评审的持久决定提案 | 该决定需在实现前持久化并评审；不是所有问题或工作都需要 | 经批准实施后正文改写并迁 `implemented/`；否决则按 notes 规则处理 |
| [`notes/implemented/`](../../notes/implemented/) | [notes/README](../../notes/README.md) | 已交付决定理由及验证 | 持久决定理由不能由代码、测试或现有文档说明 | 不再指导未来变更时冻结归档 |
| `notes/rejected/` | [notes/README](../../notes/README.md) | 有防复犯价值的否决决定 | 需要保留的否决理由 | 复活通过新 Note 引用旧篇；历史保持不变 |
| 代码 `TODO` / degraded 观察项 | 所属代码文件 | 局部实现缺口 | 具体、局部且不需要跨轮问题分析 | 修复后移除 |
| 用户直派 | 当前请求 | 当轮授权范围 | 用户明确提出工作 | 按授权范围交付；持久决定按 notes 规则记录 |

## 二、衔接：结论去向

```
用户请求 ── 已授权 ─────────────────────────────→ 按范围直接执行
     │
     └─ 需澄清/查证/比较/留存 ─→ issues/ ←→ research/ methods/ bugs/
                                          │
                                          └─ 结论确定 → 选择去向（[方法](../../_backlog/methods/issue-to-note.md)）
                                               ├─ 决定本身是交付物 → implemented Note → 卡归档
                                               ├─ 决定绑定实施 → 卡留活跃 → 交付变更 → implemented Note → 卡归档
                                               ├─ 需实施前评审 → proposed RFC → 毕业 → implemented
                                               ├─ 不做 → rejected（有防复犯价值）/ none
                                               └─ 延后 → deferred（triggers.md / owning note / 明确 none）
```

Backlog 不是实施前置门，RFC 不是普遍实施要求；未裁决的推敲留在 backlog。结论去向只决定理由住哪，不转移质量责任：issue 的业务验收、bug 的产品可接受性（P0/触面例外由用户拍板）归用户；严重级分诊与技术证据归 agent。notes 的收件规则 = [notes/AGENTS](../../notes/AGENTS.md)。

## 三、与参考卷的适配

| 维度 | 参考卷 | 本仓适配 |
|---|---|---|
| Issue 与远端协作 | GitHub Issue / Project / PR 状态 | 单人仓文件卡；不引入远端协作系统 |
| 需求整理 | 问题澄清、查证、综合与结论去向方法 | `issues/` + 按需 `methods/` + 消费者导向 `research/` |
| 执行顺序 | tracker 状态机 | 会话内 plan/todo，仅组织已授权工作，不设仓库任务队列 |
| 计划与提案 | 会话内计划与仓库决策记录分开 | DSH Plan Mode 仍是会话内呈批；RFC 只用于需要显式评审的持久决定 |
| 验收 | 条件化证据判断 | 复用本仓证据 owner 与命令；详见 [guides/60](../guides/60-dev-loop.md) 和验收合同 |

## 四、分流接口

- 用户意图路由 → [00-index §先分流](../00-index.md)；
- 问题卡、方法、research 与触发条件 → [_backlog/README](../../_backlog/README.md)；
- 结论去向（none / rejected / proposed / implemented / deferred）→ [_backlog/methods/issue-to-note.md](../../_backlog/methods/issue-to-note.md)；
- 开工、证据与收尾 → [guides/60](../guides/60-dev-loop.md)；
- Note 写入、收件规则、RFC 适用条件与生命周期 → [notes/AGENTS](../../notes/AGENTS.md) + [notes/README](../../notes/README.md)；
- 文档该住哪一层 → [docs/AGENTS §层级归属](../AGENTS.md)。

## 已知限制与延后工作

- 本页是载体索引而非机械目录生成物；新增 owner 时需同步本页与 [00-index](../00-index.md)。
