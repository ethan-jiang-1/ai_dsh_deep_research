# 20 · 角色内容：职责 owner 表、persona 要素与 skills

> 层：设计（为什么）。角色组合行见 `packages/deep-research-pack/presets/<role>/agent.cordis.yml`；
> 方法论来源（wave 语义、gate 精神）见 [30-methodology-mapping.md](./30-methodology-mapping.md)。

## 0. 队形总览（D2）

四角色 = codex harness 生命周期的职能化拆分。用户定案：多角色 + agent team（不用散装
subagent 派活），角色分工天然对齐研究波的语义。

| 角色 | codex 生命周期映射 | 一句话职责 | 产出（唯一 owner 面） |
|---|---|---|---|
| Lead（主编） | instantiation + hitl1 + wave2 + hitl2 + final | 唯一入口与出口：立项对齐、拆解组队、纯综合、审阅交付 | question.md / topics.md / findings.md / final.md |
| Scout（侦察） | wave0（广度地基） | 画出"答案可能在哪儿"：query 多样化、来源发现与分级、排除显式化 | leads.md |
| Analyst（分析） | wave1（深度挖掘） | 把方向变成可核查证据：question-list 驱动、交叉验证、反例搜索 | evidence/*.md |
| Critic（核查） | wave1 深度审查 + readiness + hitl2 前置 | 对"看起来完成了"过敏：无来源结论狩猎、质量审计、readiness 判定 | review.md |

**事实的 owner 全表**住研究手册（research-workspace/AGENTS.md）——一处事实一个家，
L3 判据 2 的载体；任何两类事实不得双 owner 或无 owner。

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
此处不复制清单：复制即缓存，加删 skill 会静默漏项（基础整治 C8）。本节只说明技能面
承载什么：**方法论条目 ↔ skill 的映射正本 = [30-methodology-mapping.md](./30-methodology-mapping.md)**
（L3 载体，合同随代码同 diff）；每条方法论纪律写在承载它的 SKILL.md 正文里；
跨角色硬契约（证据 frontmatter 等）住研究手册（research-workspace/AGENTS.md）。

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

## 4. 留待实测的开放点

登记与归宿统一在 [00-index §待定表](../00-index.md)（Q4 专职 synthesizer 拆分 / Q5 多 analyst topic 争用）；本节只留背景：当前综合归 lead、topic 靠单 owner 纪律，两者均待「首个完整研究 run」实测再定。
