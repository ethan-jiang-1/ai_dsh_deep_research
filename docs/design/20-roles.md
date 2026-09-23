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

## 2. skills 清单（方法论的家）

| 角色 | skill | 承载的方法论 |
|---|---|---|
| lead | `research-brief` | HITL1：研究类型三分（quick_factual / exploratory_map / claim_verification）、澄清三问带推荐、question/topics 定稿格式 |
| lead | `team-assembly` | 组队矩阵（按研究类型定名单）、通道选择、单 owner 分派纪律、critic 后置进场 |
| lead | `synthesis` | wave2 语义：纯综合先行禁新搜索 → finding gap 定向补搜一轮 → final.md 来源链格式 |
| scout | `lead-mapping` | query 多样化三轮、30 秒去留判、A–D 质量分级、排除显式、URL 必须真实抓取 |
| analyst | `evidence-extraction` | question-list 驱动、证据文件 frontmatter 身份链、摘录/解读分离、交叉验证 ≥2 独立来源、反例搜索必记 |
| critic | `adversarial-review` | 三审查线（无来源狩猎 CRITICAL / 质量审计 MAJOR / 反例覆盖 MAJOR）、review.md 分级格式、readiness 判据清单 |

## 3. 信噪比策略落点（L3 判据 4：显式机制，不靠模型自觉）

Deep Research 的本质困难 = 搜索结果信噪比极差 + 答案位置未知。四道显式防线：

1. **分层过滤**（scout/lead-mapping）：30 秒去留判 + A–D 分级——噪声在广度层就被分级
   隔离，D 级默认弃用；
2. **问题驱动**（analyst/evidence-extraction）：question-list 把"探索"变成"逐问题找
   证据"——搜索有靶子，噪声进不了正题；
3. **对抗验证**（analyst 交叉验证 + critic 狩猎）：关键 claim ≥2 独立来源 + 反例专搜 +
   无来源结论 CRITICAL——幸存的信号才许进报告；
4. **缺口显性化**（lead/synthesis）：insufficient/contradicted 如实呈现——搜不到也
   是结论，禁止假装全知。

## 4. 留待实测的开放点

登记与归宿统一在 [00-index §待定表](../00-index.md)（Q4 专职 synthesizer 拆分 / Q5 多 analyst topic 争用）；本节只留背景：当前综合归 lead、topic 靠单 owner 纪律，两者均待「首个完整研究 run」实测再定。
