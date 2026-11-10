---
topic: Wave 执行：把计划图变成可跑的工作流
intent: 判断 wave 子图能否编译成可执行 workflow（固定配方 + args），哪些层必须留在对话里，以及失败/恢复/成本如何不失控。
---

# Wave 执行：把计划图变成可跑的工作流（首版）

> **v2 已修正（2026-11-10）**：本页 §3 的 claim 验证脚本化、§4 的三配方、§10 的未决均被
> [v2 合同](2026-11-10-wave-execution-contract.md)收窄；lens 目录已落地（D43）。最终结论以 v2 为准，
> 本页保留为首版推演记录。
>
> 性质：设计推演。事实（现仓/Wave 语义）与建议分开；未决在末节。
> 相关：[编排原语](../orchestration-primitives/2026-11-10-channel-policy.md)、[lens-as-data](../lens-abstraction/2026-11-10-lens-as-data.md)。

## 0. 一句话

Wave 现在控制的是「并行/依赖的拓扑」，不是「执行」。它的价值在花 token 前就把宽度和深度想清楚；它的失败在**图只活在 `plan.md` 和对话里，执行靠 Lead 手动调度**。下一步不是发明新引擎，而是给 wave 一个执行契约：**同质层编译成固定配方（workflow / 并行 subagent），异质层留在 Team，HITL 只在两层边界**。

## 1. 现状：Wave 控制了三个东西，没控制四个

**控制了**：

- `deps` → 拓扑层：`W2` 是 Wave 2，ID 前缀必须等于计算层（`wave-prefix` 红）。
- 并行宽度：同一层 `W2.1/W2.2/...` 表示可并行。
- 展示/审阅：plan 图、驾驶舱按层画。

**没控制**：

- **谁执行**：`owner_role` 只是列；实际走 Team 还是 subagent 由 Lead 当场决定。
- **何时停/扩**：动态重写（加节点、改边）靠 Lead 判断与 journal，没有触发条件。
- **失败怎么办**：teammate 卡住 → interrupt/reassign；workflow branch 失败 → null；两套语义没有统一账。
- **验收**：plan 有 `acceptance` 列，但没有执行器读它；收活靠 Lead 逐条核。

所以「wave 控制了一个 workflow」目前是**人的纪律**，不是机制。要让它变成机制，得先承认：wave 是**计划层的投影**，执行层可以换。

## 2. 先分清三张图，别让 wave 兼任

| 图 | 回答 | 载体 | 谁写 |
|---|---|---|---|
| 工作图 | 哪些节点、谁先谁后 | `plan.md`（canonical） | Lead |
| 执行图 | 这一刻谁在跑、跑到哪 | Team 任务板 / workflow run | Lead / script |
| 证据图 | 哪条结论由哪张卡支撑 | `evidence/*.md` + `findings.md` | analyst / Lead |

Wave 只是工作图的一个**层号**。它不该兼任执行状态，也不该兼任证据覆盖。把这三张图混在一起，就会得到「plan 一改，执行状态和证据归属全要重算」的脆系统。

## 3. 哪些 wave 可以脚本化

先定两个词：**cell** = 一次可执行单元（topic × lens × depth）；**brief** = objective / output format / tools+sources / boundaries / budget。没有这两个定义，「同质」就无法判断。

判据四条，缺一不可：

1. **同质**：每个 cell 的输入 brief 形状一致、输出 schema 一致；
2. **独立**：cell 之间没有中途协商（不需要「等一下，先看看另一个 cell 的结果」）；
3. **产物自足**：每个 child 自己写一个 artifact（evidence 卡 / verdict），父级只收路径 + 摘要；
4. **无 HITL**：这一层不需要人拍板。

按这个判据切现有生命周期：

| 层 | 典型内容 | 可脚本化？ | 理由 |
|---|---|---|---|
| W0 扫描 | N 个方向/来源族 | **多数可以** | 同质 brief，独立；但方向之间可能互相启发，需要一次汇总 |
| W1 深挖 | N × (topic, lens) cell | **可以** | 每 cell = lens + topic + 证据格式；产物是一张卡 |
| W1.5 验证 | N 条 claim 逐条核 | **可以** | 同一 verdict schema；独立性正是要点 |
| W2 综合 | Lead 写 findings/final | **不可以** | 需要跨 cell 判断、取舍、叙事 |
| W2.5 对抗审查 | critic 按 lens/claim 审 | **部分可以** | 可按 lens 扇出，但 readiness 判定要一个统一视角 |
| W3 交付 | reader 版 + present | **不可以** | 单一 owner、强顺序、人拍板 |

> 注：表里的 `W1.5/W2.5` 只是**示意**。现行 `W<wave>.<index>` 解析器未必接受小数层；落 plan 时用整数 W + `kind=cross-check` / `kind=review`，不要假设小数合法。

一句话：**扇出层可脚本化，汇聚层与拍板层不可**。这也是 Anthropic 的形态——orchestrator 扇出 worker，但 lead 自己做综合与最终判断。

## 4. 配方：固定脚本 + args，而不是每次现写

现写脚本的三个问题：不可审计（每次结构不同）、易犯 schema 错（fatal 杀脚本）、无法回归。固定配方把「过程」变成数据：

- `lens-fanout`：args = `cells[]`（id / topic / question / lens 路径〔目录建成后〕或内联全文〔未建时〕/ 输出路径 / 证据门槛 / 预算）+ `depth`。脚本对每个 cell 跑 `pipeline(mine → extract)`，`parallel` 只在需要全量汇总时用。
- `claim-verify`：args = `claims[]`（id / claim 原文 / 证据路径 / URL 列表）。每个 claim 一个独立 verifier，返回 `{verdict, reason, evidence_ref, rechecked_urls}`。
- `scan-fanout`：args = `directions[]`（方向 / query 家族 / 来源 tier 要求）。只做发现，不下结论。

配方住哪：放 `presets/lead/skills/wave-recipes/SKILL.md`（模型可见、按需加载）。理由：它不是角色方法，是**执行契约**；放 content 会被每次注入，放 workspace 会变成用户可改的第二事实源。

每个配方必须声明：输入 schema、输出 schema、失败策略、产物路径、预算上限。脚本里不做重试——`agent()` 失败返回 `null`，由父级决定「记 gap / 换通道重跑 / 上报」。

## 5. HITL 边界：只在两层

- **HITL1**：问题、深度、口径、**执行方式**（团队协作 / 脚本扇出）。用户点「脚本扇出」= 满足 workflow 工具「explicit ask」的政策句；这是唯一合法的授权点。
- **HITL2**：定稿/补研究/改说法。
- 脚本运行中**没有 HITL**；需要中途拍板的层，本来就不该脚本化。
- 脚本失败不静默重试：Lead 把失败层退回 Team 或上报用户，journal 记一行。

这条边界保证「两点交互」不被脚本化偷偷扩成 N 点。

## 6. 失败与恢复

| 失败 | 脚本行为 | Lead 的行为 | bundle 留下什么 |
|---|---|---|---|
| 单个 child 失败 | 该 cell = `null` | 记 gap（findings 的 `insufficient` 状态，**不是** verdict 值），不假装有结果 | 其他 cell 的 artifact 仍在 |
| 配方/schema 写错 | fatal，杀整个脚本 | 读错误、修 args、重跑或退回 Team | 无半成品（run 未成立） |
| cap 触顶 | fatal | 缩 cell 数或拆层 | 已跑完的 artifact 仍在 |
| 父 step 取消 | 整个 run 取消、dispose children | 从 bundle 恢复；不假定脚本续跑 | 已写文件是唯一事实 |
| 脚本完成但结果差 | completed | critic/Lead 判质量；不因「脚本绿」算研究绿 | verdict/evidence 是证据 |

**没有 durable 图**：脚本 run 是「一次执行尝试」，不是状态。`plan.md` 仍是 canonical；恢复时按 plan + bundle 重建，不按 workflow run 恢复。

## 7. 成本模型

- workflow child 与 teammate 都是完整 agent，token 成本同量级；脚本省的是**协调 token**（任务板、消息、wait、reassign），不是研究 token。
- Anthropic：multi-agent ≈ 15× chat；BrowseComp 上 token 单独解释 80% 方差。结论：**宽度是主要成本杠杆**，不是「用不用脚本」。
- 因此 plan 的 `budget` 列应写成数值（最多几个 child、每个最多几次工具调用），配方按 args 执行；HITL1 的方法行给「预计宽度 × 深度」。
- 并行只改变墙钟，不改变 token；不要用「并行」当省钱的理由。

## 8. 与外部对齐

- Anthropic 的 lead 同步等每一批 subagent，官方把它列为瓶颈；我们的 wave 屏障同构。**保留屏障、声明屏障**，别把它包装成异步。
- DeerFlow 1.x 的 plan 是 typed step + 一个「故意很笨」的 router，但一次只跑一个 step——**证明了 typed plan 可行，也暴露了没有并行的上限**。我们的 wave 并行是真正的增量。
- Gemini 把计划批准做成显式状态位；我们的 HITL1 计划确认卡已经在做同样的事，缺的是「执行方式」这一档与状态记录。
- GPT-Researcher 2026 改成 harness + subagent，自报收益来自「被委派的工具真的抓取并验证」，不是拓扑。→ 脚本化的价值必须落在 artifact 质量上，否则只是换个方式烧 token。

## 9. 反模式

- 把整场 run 编成一个脚本：丢 HITL、丢动态重写、丢角色保真。
- 每个 wave 让模型现写脚本：不可审计、schema 错误 fatal、无法回归。
- 为了「用上 workflow」把异质层也脚本化：cell 之间需要协商时，脚本只会把协商压成串行等待。
- 脚本绿 = 研究绿：schema 通过只证明格式，不证明内容。
- 隐藏 `null`：把失败 cell 静默从覆盖里删掉，是研究造假的轻量版。

## 10. 未决

1. 配方放 skill 还是 content？skill 按需加载、模型可见；content 每次注入。倾向 skill。
2. args 里传 lens 全文还是路径？倾向路径（child 有 fs），但 child 是否继承 content 注入未核。
3. 一个 wave 内混用 workflow 与 Team（部分 cell 脚本、部分 teammate）是否值得？倾向不混，一层一个通道。
4. `plan.md` 是否加 `engine` 列？v1 不加，写在 `## 剩余工作`/journal；等两个真实 run 再决定。
5. 脚本 run 的 id / args / result 如何进 `journal.md`？倾向一行摘要 + run id，不复制全文。

## 11. 来源

- Anthropic multi-agent（同步屏障 / 15× / 90.2%）: https://www.anthropic.com/engineering/multi-agent-research-system
- DeerFlow typed step + router: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/src/graph/nodes.py
- DeerFlow builder: https://raw.githubusercontent.com/bytedance/deer-flow/main-1.x/src/graph/builder.py
- Gemini 计划批准（cookbook）: https://raw.githubusercontent.com/google-gemini/cookbook/main/quickstarts/Get_started_Deep_Research.ipynb
- LangGraph brief / budget: https://github.com/langchain-ai/open_deep_research/blob/main/src/open_deep_research/deep_researcher.py
- GPT-Researcher deep agents（厂商自报 +89%）: https://docs.gptr.dev/docs/gpt-researcher/multi_agents/deepagents
