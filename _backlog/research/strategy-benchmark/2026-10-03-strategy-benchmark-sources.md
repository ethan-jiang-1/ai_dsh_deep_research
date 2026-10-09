---
topic: 深度研究策略对标
intent: 为 strategy-benchmark 决定提供来源与比较证据。
---

# 策略层对标材料——面①（专业 DR 三轴：预算分配/迭代深度/终止条件）

> 服务卡：[pipeline-polish issue](../../_archived/settled_issues/2026-09-28-pipeline-polish.md)（毕业
> Note = notes/implemented/2026-09-28-strategy-benchmark.md）。日期 2026-10-03；全部一手核实
> （本地文件直读 / HTTP 200 取回），二手转述已标注。

## 来源清单

| # | 来源 | 性质 | 获取 |
|---|---|---|---|
| S1 | `ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-profile.md` §research_style_params | 方法论源头仓一手（codex DR harness 参数化策略层） | 本地直读 |
| S2 | Anthropic Engineering《How we built our multi-agent research system》（anthropic.com/engineering/built-multi-agent-research-system） | 一手工程自述 | HTTP 200（代理直取 167KB） |
| S3 | OpenAI《Deep Research System Card》（cdn.openai.com/deep-research-system-card.pdf，2025-02-25） | 一手系统卡 | HTTP 200 PDF（368 万字节，pdftotext 抽取） |
| S4 | OpenAI 产品页（introducing-deep-research / help center） | 一手但 **403 拒取**（直连与代理+UA 均拒） | 未取到——产品级预算数字（时长/搜索次数）缺一手核实，本次不用 |

## S1 源仓：策略层已参数化（research_style_params，12 参数）

- **数值地板**：`wave0_per_topic_source_floor: 12`（每 topic 基础源下限 = gate 的
  count_floor 动态阈值）、`wave0_shared_ref_total: 18`（全局共享总量 = base + per_topic ×
  topic_count，**CLI 计算**）、`wave1_per_topic_ref_floor: 10`、`topic_unique_ratio: 0.5`
  （新源比例下限）；
- **终止条件参数化**：`counterexample_search` / `cross_verification`（Wave1 Stop
  Conditions 5/6 可开关）、`wave2_emergent_search_rounds: 1`（emergent 补搜轮数）、
  `wave2_cross_topic_depth: 2`；
- **质量下限**：`p0p1_independent_backing: 2`（P0/P1 结论最低独立源）、`quality_min_tier` /
  `quality_min_substance`（**Agent guidance，非 gate 强制**——质量口径留散文，数量口径
  才进 gate）；
- **设计原则**：`apply-research-style.mjs` CLI = 参数计算**唯一权威**（Agent 不手写参数）；
  gate 读显式参数做确定性检查；**缺参 fail-loud**（`missing_profile_parameter`，"不得使用
  hidden default"）；参数在 HITL1 由用户风格选择驱动（user_visible 开关）。

## S2 Anthropic：扩缩规则嵌 prompt + token 经济学

- **token 经济**：多代理 ≈ **15× chat tokens**（agents 单体 ≈4×）；BrowseComp 上
  **token 用量单项解释 80% 性能方差**（+工具调用数 + 模型选择 = 三因子 95%）——"spend
  enough tokens to solve the problem"；**模型升级 > 预算翻倍**（Sonnet 4 升级收益大于
  Sonnet 3.7 双倍预算）；
- **扩缩规则嵌 prompt**（与本仓深度→topic 映射同构）：simple fact-finding = 1 agent、
  3–10 tool calls；direct comparison = 2–4 subagents ×10–15 calls；complex = 10+ subagents
  分工明确；
- **并行化**：lead 并行 spawn 3–5 subagents + subagent 并行 3+ 工具 → 复杂查询时间 −90%；
  多代理对单代理（Opus lead + Sonnet workers vs 单 Opus）内部研究评测 **+90.2%**；
- **失败模式**：锚点重叠重复劳动（一 subagent 挖 2021 芯片危机、另两个重复挖 2025 供应链
  ——与 cpu-gap 改派案例同型）；**heuristics over rigid rules**（嵌好启发式而非硬规则）；
  生产 tracing 诊断"not finding obvious information"类失败。

## S3 OpenAI：物种边界

- 系统卡定性：deep research = **end-to-end RL 训练的单模型浏览代理**（early o3 优化
  web browsing，multi-step research on the internet）——无公开编排层/策略参数可对标；
- 对账含义：**同构比较对象只有 S1/S2**（编排式 harness 家族）；OpenAI 是替代架构路线，
  其策略内化在模型权重里，不构成可采纳面。

## 三轴对账表

| 轴 | 源仓 S1 | Anthropic S2 | 本仓现行 | 差距判定 |
|---|---|---|---|---|
| **预算分配** | 每 topic 数值地板（12/10）+ 全局共享总量 CLI 计算 | prompt 扩缩区间（按复杂度）+ token 加权 | 深度→topic 数映射（agent 数扩缩，与 S2 同构）；**无 per-topic 数量地板** | **地板缺失**——critic/audit 查质量与覆盖，"每 topic 至少几张卡"无数值 |
| **迭代深度** | `wave2_emergent_search_rounds: 1` | 无显式轮次（heuristics + 并行压缩） | 纯综合先行 + **只补一轮**（4 场实证）+ 已搜未得 | **收敛**——S1 默认值与我们 4 场实证同值；维持有双源支撑 |
| **终止条件** | Stop Conditions 参数化 + gate 确定性检查 + terminal outcomes 枚举（content/login_required/…/round_budget_not_attempted） | 无硬终止（token 预算 + lead 判断 + tracing 诊断） | readiness PASS（质量终止）+ insufficient/已搜未得/单检索器待破（诚实终止） | **部分缺失**——质量与诚实终止在，数量型终止语义（"达到地板且无未答 = 可停"）无 |

## 采纳候选（带触发条件，不直接改机制）

- **候选 A：per-topic evidence 数量地板**（深度档参数化，挂 node-gate row 4）——触发：
  ① 存量 19 场 run 标定"每 primary topic 卡数"分布（journal 逐场数，零成本）；② 下一场
  run 起 journal 增记该字段；③ 分布实证出现"primary topic 卡数 < 下限且 wave2 返工"的
  场次 → 立门（地板数值由分布定，floor 教训防假牙齿）；
- **候选 B：参数单点计算权威**（S1 的 CLI 模式）——触发 = 候选 A 落地时同 diff（地板参数
  由脚本从深度档计算，门禁只读显式参数，缺参 fail-loud——不得散落 prompt）；
- **不采纳**：S1 的 terminal outcomes 枚举（本仓"未取得≠没有" + 单检索器待破 + gap 四态
  已覆盖同语义）；S2 的 15× token 预算观（架构不同，且 cache hit 98% 的成本面已另册）；
  OpenAI 路线（物种不同）。
