# 20 · 角色内容：职责 owner 表、persona 要素与 skills

> 层：设计（为什么）。角色组合行见 `packages/deep-research-pack/presets/<role>.patch.yml`（DSH 0.1.7 起的 preset 行）；
> 方法论来源（wave 语义、gate 精神）见 [30-methodology-mapping.md](./30-methodology-mapping.md)。

## 0. 队形总览（D2）

四角色 = codex harness 生命周期的职能化拆分。用户定案：多角色 + agent team（不用散装
subagent 派活），角色分工天然对齐研究波的语义。

| 角色 | codex 生命周期映射 | 一句话职责 | 产出（唯一 owner 面） |
|---|---|---|---|
| Lead（主编） | instantiation + hitl1 + wave2 + hitl2 + final | 唯一入口与出口：立项对齐、拆解组队、纯综合、审阅交付 | question.md / topics.md / plan.md / findings.md / final.md / final/readable(-vN) |
| Scout（侦察） | wave0（广度地基） | 画出"答案可能在哪儿"：query 多样化、来源发现与分级、排除显式化 | leads.md |
| Analyst（分析） | wave1（深度挖掘） | 把方向变成可核查证据：question-list 驱动、交叉验证、反例搜索 | evidence/*.md |
| Critic（核查） | wave1 深度审查 + readiness + hitl2 前置 | 对"看起来完成了"过敏：无来源结论狩猎、质量审计、readiness 判定 | review.md |

**事实的 owner 全表**住[研究手册](../../research-workspace/AGENTS.md)——一处事实一个家，
L3 判据 2 的载体；任何两类事实不得双 owner 或无 owner。

**teammate 的组合继承语义**（company presets.md 四形态矩阵，钉版复核 2026-10-09 登记）：
teammate 会话加载的是 **Lead 的组合**（composeFrom ⇒ lead preset），成员身份来自成员名 + 任务书
+ 工作区手册注入，而**不是**成员角色自己的 preset——名册角色名 ≠ 该会话加载的 preset。各自 role
preset 只在**根会话**（直接以该角色开新会话）时生效；**depth-2 worker 例外**：teammate 用
`subagent(agent_preset=…)` 派出的 worker 可挂载独立角色 preset（spawn only），角色工具面因此是
精确的。

## 1. persona 要素（每角色 prefix 必含）

1. 身份与领地（广度/深度/把关的分工宣言，含"不做什么"的边界）；
2. 开工动作（读研究手册 + 本 run 的上游文件——角色间的信息流方向由此固定）；
3. 产出形态与落盘路径（owner 面 + 格式要点）；
4. 信噪比/质量纪律（角色的立身之本，见 §3）；
5. 通道用法（team 汇报 vs subagent 工人的适用场景）；
6. veto 权（只有 lead 能说"证据不足以交付"——要说出口）。

## 2. skills（方法论的家）

每角色一个技能目录：`presets/<role>/skills/<n>/SKILL.md`，一技能一目录。**当前有哪些
skill = 盘上目录本身**（单一事实源：`ls packages/deep-research-pack/presets/<role>/skills/`）——
此处不复制清单：复制即缓存，加删 skill 会静默漏项。本节只说明技能面
承载什么：**方法论条目 ↔ skill 的映射正本 = [30-methodology-mapping.md](./30-methodology-mapping.md)**
（L3 载体，合同随代码同 diff）；每条方法论纪律写在承载它的 SKILL.md 正文里；
跨角色硬契约（证据 frontmatter 等）住[研究手册](../../research-workspace/AGENTS.md)。

## 3. 信噪比策略落点（L3 判据 4：显式机制，不靠模型自觉）

Deep Research 的本质困难 = 搜索结果信噪比极差 + 答案位置未知。四道显式防线：

1. **分层过滤**（scout，广度层）：30 秒去留判 + A–D 分级——噪声在广度层就被分级
   隔离，D 级默认弃用；
2. **问题驱动**（analyst，深度层）：question-list 把"探索"变成"逐问题找
   证据"——搜索有靶子，噪声进不了正题；
3. **对抗验证**（analyst 交叉验证 + critic 狩猎）：关键 claim ≥2 独立来源 + 反例专搜 +
   **单源显式标记（"单源——待破"）与数字口径（测量条件 ≥2 项）** + 无来源结论
   CRITICAL——幸存的信号才许进报告；
4. **缺口显性化**（lead，综合层）：insufficient/contradicted 如实呈现——搜不到也
   是结论，禁止假装全知。

## 4. 队形实测结论（首场完整 run）

- **综合归 lead 足够**：lead 独任综合无过载（首场实测干净落地；多场 run 重估维持）——专职 synthesizer 不拆；重议条件见[裁决](../../notes/rejected/2026-09-24-synthesizer-role.md)；
- **topic 无争用**：单 owner + 任务板纪律足够（某 topic 中途改派经 lead 调度干净落地）。

证据 = [m2-run-mechanics §实施记录](../../notes/implemented/2026-09-24-m2-run-mechanics.md)。
