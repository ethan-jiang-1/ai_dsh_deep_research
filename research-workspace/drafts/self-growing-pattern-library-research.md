# 自增长问题模式库 — 外部调研设计要点

只采一手来源（论文 / 官方文档 / 官方工程博客）。OpenAI custom instructions/playbooks 的官方页面本轮抓取失败，未能核实，故不转述任何二手内容。

检索时间：2026-09-29（`date` 核对）。服务对象：`question-patterns.md` 库尾节增长协议设计。

## 一、自增长技能/知识库的成熟范式

**Anthropic Agent Skills**（与"结构化条目+触发"形态最贴）：
- 条目骨架：`SKILL.md` = YAML 头（`name` ≤64 字符；`description` ≤1024 字符、第三人称、必须写清"做什么 + 何时用 + 触发关键词"——它是唯一预载进系统提示的触发面）+ 正文；正文 <500 行，超限拆成按需加载的子文件，引用只深一层。渐进披露：启动只预载全库 metadata，命中才读正文——库可以变大而不吃上下文预算。
- 何时新增 vs 泛化兜底：默认假设"模型本来就会"，只写模型不知道的增量，每段自问"值不值这些 token"；按任务脆弱度分级给自由度（易碎流程给精确步骤，开放任务给启发式）。
- 生长闭环：先无库跑基线记录真实失败 → 针对缺口建 ≥3 个评测场景 → 写最小内容 → "作者实例写条目 / 使用者实例真用"，观察失败回流迭代——晋升的门槛形态 = **真实失败证据 + 评测通过**，而非预先设想。
- 过时内容收进 "old patterns" 折叠段，不留在正文。来源：<https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>

**Voyager**：技能 = 经执行反馈 + 自检验证过的可执行代码，配自动生成描述（embedding 检索），可组合复用、免重训——"可验证才入库"的样板。<https://arxiv.org/abs/2305.16291>

**Agent Workflow Memory (AWM)**：条目 =（目标描述 + 步骤序列，每步含状态/推理/动作）；**只从评估器判成功的轨迹归纳**入库；把具体值抽象成参数（`{product-name}`）以跨任务泛化；旧条目作子目标滚雪球合成复杂条目；并明示条目会误导，需给 agent"何时偏离条目"的自由。<https://arxiv.org/abs/2409.07429>

**MemGPT / Letta**：分层记忆（上下文内 core memory / 会话检索 recall / 向量 archival），agent 以工具自编辑；Letta 2.0 把记忆编辑权交给独立的 sleep-time agent，空闲期持续重写记忆，**且 sleep-time 可挂更强模型**（不吃在线延迟预算）——与"强模型沉淀、弱模型照走"同构。<https://arxiv.org/abs/2310.08560> ；<https://www.letta.com/blog/sleep-time-compute>

**Stanford 系**：STORM 本体没有库生长机制（核心是多视角提问 + 信息策展）<https://arxiv.org/abs/2402.14207>；同校可借鉴的是 Generative Agents：检索分 = relevance × recency × importance，"反思"把多条底层记忆合成高阶条目回灌记忆流——即它的晋升机制。<https://arxiv.org/abs/2304.03442>

## 二、CBR 用于 LLM agent

- **综述**（arXiv 2504.06943）给出字段与门槛的形式化：案例 `c = (P, S, O, M)`——问题特征 / 解法动作 / 结果指标 / 元数据（时间、环境、来源）；**保留门槛：入库 iff U = α·新颖度 + β·有效性 + γ·可泛化性 ≥ δ**；检索带相似度下限 τ；混合检索 = 语义 + 特征 + 结构。<https://ar5iv.labs.arxiv.org/html/2504.06943>
- **DS-Agent**（ICML'24）：开发期跑完整 4R 循环（检索→复用→修正→保留），部署期简化为"检索成功案例→适配生成"。<https://dl.acm.org/doi/10.5555/3692070.3692738>（机制转述自上述综述）
- **ExpeL** 的 CBR 化实现：经验池 = 向量库，top-k 相似**成功**轨迹作 few-shot（retrieve/reuse）；洞察条目由成败对对比提取（revise/retain），配 ADD/EDIT/UPVOTE/DOWNVOTE 算子。<https://arxiv.org/abs/2308.10144>
- **Memp**：双粒度条目（逐步轨迹 + 抽象脚本，两者结合效果最优）；**强模型构建的过程记忆迁移给弱模型仍大幅涨分**——直接支撑"强沉淀 / 弱照走"。<https://arxiv.org/abs/2508.06433>
- **Dannenhauer'24**：案例 = 自然语言问题 + 可执行代码对，作动态 few-shot，显著减少函数误调用 / 漏调用 / 顺序错误等失败模式（经上述综述转述）。

## 三、防膨胀 / 防失效

- **入库门（防垃圾）**：Voyager / AWM = 可验证成功才入库；Anthropic = 真实失败缺口 + 评测先行；CBR 综述 = 效用函数 ≥ δ。
- **计数淘汰（防失效）**：ExpeL 洞察初始重要度 = 2，UPVOTE/EDIT +1、DOWNVOTE −1，**归零删除**——新条目"留察"，差评自然出局；EDIT 兼作去重合并。
- **更新三算子**：Memp 的 U = Add ⊖ Del(过时) ⊕ Update(按执行反馈)，明确指出"只增不合"会让库与性能双退化；Mem0 用"抽取→更新"两阶段管线对增量做冲突消解。<https://arxiv.org/abs/2504.19413>
- **离线压实**：Letta sleep-time——增量记忆会"变脏变乱"，由空闲期 agent 持续重写为干净简洁版，且可挂强模型。
- **检索侧衰减 + 写入约束**：Generative Agents 的 recency 因子让旧条目自动降温；Anthropic 禁止时间敏感信息入条目；AWM 按站点分组保持每组库小而相关。

**落地组合**：条目六字段之上补 `O`(结果指标) + `M`(来源/版本/最近命中时间) 供淘汰用；晋升 = 运行时未命中兜底记录 → 强模型复盘成候选条目 → 验证（参照 Anthropic ≥3 场景 + ExpeL 初始计数 2）→ 入库后计数留察、长期未命中降权；每条目设 token 预算上限，定期 sleep-time 式压实合并。
