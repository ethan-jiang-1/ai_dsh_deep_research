---
topic: 产出/验证分离：独立复核与裁决留痕
intent: 把「验证真的独立于产出」拆成可实现的机制——独立 activation、只读/父级落盘、claim 级 verdict、哈希与覆盖判据，并说明同模相关性的诚实边界。
---

# 产出/验证分离：独立复核与裁决留痕（首版）

> 性质：设计推演。现状段带文件锚点；建议段标「建议」。
> 借镜：company 的 producer/verifier 卡（独立 activation + 只读 + 裁决哈希 + 审计探针）与 review-protocol 的独立性口径。
>
> **后续（2026-11-10）**：契约化版本 = [verdict-contract](2026-11-10-verdict-contract.md)（工件形状、机械门、
> 试点、重议条件）；两份冲突时以它为准。本文件有两处外部数字在复核后被更正，已在 §2 就地标注。

## 0. 一句话

我们已经有 `critic` 角色和 `review.md` 的 readiness，但**验证者并不机制性地独立于产出者**：它读同一份草稿、同一工作区、同一个模型，产出是一篇 prose。要补的不是「再加一个 critic」，而是三件东西：**claim 级的验证单元、typed verdict 工件、可机械复核的落盘与覆盖**。

## 1. 现状：critic 是「角色 + 文件审查」

- critic preset：fs + fs-search + web + session-query + todo + skill；**无 bash、无 subagent**；写 `review.md`。
- 审查三线：无来源结论狩猎、证据质量审计、反例覆盖；终局块 `readiness: PASS|FAIL` 是 HITL2 的前提。
- **已有的事实性独立**：
  - critic 可以是独立会话：`subagent(agentPreset=critic)` 是**真 critic preset**；teammate 则是 Lead 组合 + 派发时读 critic skill（角色保真降一档）；
  - 它会逐条 `web_fetch` 重抓 URL、比对原文（不是只看 URL 出现过）；
  - 只有 critic 能写终局 PASS；Lead 升级必须引用 critic 授权并落**新的**终局块。
- 仍然缺的：
  - **anchoring**：critic 先读草稿，再找证据，容易被叙事带着走；
  - **同模盲区**：同一个模型、同一套训练偏好，会一起信同一个来源；
  - **粒度**：PASS/FAIL 是报告级，不是 claim 级；一条 CRITICAL 与十条 MINOR 可能得到同一个「FAIL」；
  - **留痕**：review.md 是 prose，没有 claim→verdict 的结构化覆盖，也没有防事后改的哈希；
  - **可复核**：审计只能读文字，不能机械回答「每条关键结论都被独立核过吗」。

## 2. 独立性分三层，别把第二层说成第三层

| 层 | 机制 | 解决 | 不解决 | 本仓现状 |
|---|---|---|---|---|
| L1 机械全量重算 | 脚本重抓 URL、sha256、原文覆盖率 | URL 造假、内容被改、引用不存在 | 语义是否支持结论 | 操作侧 `evidence-audit` 部分有 |
| L2 上下文独立复核 | fresh 会话、claim-first、不给草稿叙事 | 锚定、自我评分、注意力稀释 | 同模同源盲区 | critic 会话部分有；claim-first 没有 |
| L3 判断类复核 | 人，或不同模型/不同 provider | 同模盲区、价值判断 | 成本、不可规模化 | 只有 HITL2 的用户 |

诚实口径（借 company review-protocol）：本仓能稳定做到的是 **L2「同模异上下文，独立性有限」**；不要写「独立复核」「第二双眼睛」而不加限定。

**外部证据（这不是杞人忧天）**：GPT-4 在没有外部 verifier 时的 self-critique，把 Graph Coloring 的准确率从 16% 打到 **2%**、Game of 24 从 5% 打到 **3%**（Graph Coloring 的 false-negative 率 95.8%）；换成 sound verifier 才回到 38% / 36%。LLM judge 还偏爱自己的输出——可核的结论是「LLM 能非平凡地识别自己的生成，且自识别能力与自偏爱强度线性相关」。DeepResearch Bench 的 FACT 给四个 deep research agent 的 citation accuracy 是 77.96–90.24%，即 **约 10–22% 的引用不被支持**。

> **复核更正（2026-11-10，逐表核过）**：16%→2% / 5%→3% / 95.8% / 38%/36% 全部成立（2402.08115 Table 1、Table 2，
> 其中 95.8% 只属 Graph Coloring；Game of 24 的 F.N.R 是 20.7%）。**原文写的「GPT-4 选自己 59.3% vs 选别人 18%」
> 在 2404.13076 正文里检索不到**，已按该论文可核的结论句改写，不引这组数字。FACT 的 78–90% 对四个 DR agent
> 成立（OpenAI 77.96 / Gemini-2.5-Pro 81.44 / Grok 83.59 / Perplexity 90.24），但同表搜索类 LLM 区间是
> 74.42–94.04，不能扩成整表。逐项证据 = [verdict-contract §1](2026-11-10-verdict-contract.md)。

→ 结论：同模 critic **只有在证据接地时才有价值**（逐条重抓、quote 匹配、claim-first）；纯读草稿给意见的同模 critic 可能**降低**准确率。若部署里有第二模型族，claim 验证应换模型；没有则在报告里限定独立性，并用机械重抓补硬。

## 3. 验证的最小单元：claim，不是报告

**建议**：从 `final.md`（或 `findings.md`）抽 claim 表，每条：

```json
{ "id": "C7", "text": "X 在 2026-09 将单价降到 $0.28/M tokens", "evidence": ["evidence/abc.md"],
  "urls": ["https://..."], "critical": true, "lens": "quant" }
```

验证者拿到的是 **claim + 证据路径 + URL**，**不是**草稿叙事。这样它必须自己判断「这段原文是否支持这句话」，而不是顺着作者的论证走。

返回 typed verdict：

```json
{ "claim_id": "C7", "verdict": "supported|partially_supported|unsupported|unverifiable",
  "quote": "原文里支持/反驳的那一句", "reason": "一句话", "rechecked_urls": ["..."],
  "source_tier_ok": true, "independence": "context-independent, same model" }
```

`unverifiable` 是 child 的结论值；聚合状态叫 `UNVERIFIED`——两者不是同义词：前者是「这条我核不了」，后者是覆盖表里的「没有结论性命中」。`critical` = 支撑 must-answer / 进 final 首屏的 claim；由 Lead 标，critic 可加。

父级（Lead）原样落盘；验证者不写 bundle（见 §5）。这样既保住「只读」，又留下「谁在什么上下文里判了什么」。

## 4. 三条验证通道，各管一段

| 通道 | 形态 | 管什么 | 代价 |
|---|---|---|---|
| `subagent(agentPreset=critic)` | 每个 claim（或每批 3–5 条）一个 fresh child，返回 JSON | claim 级「原文是否支持」 | one-shot；父级要逐条落盘 |
| `workflow claim-verify` | 固定配方，并行 N 条 claim | 批量 claim 的通量 | 子代是 Lead 克隆；critic 的 persona 靠 brief 注入 |
| Team 里的 critic | 持久会话，读全文，写 readiness | 跨 claim 冲突、覆盖、整篇判断 | 慢；容易 anchoring；不适合逐条 |

**建议的分工**：

1. **claim 级**：`subagent(agentPreset=critic)` 或 `workflow`，一次 3–5 条，claim-first；产出 verdict JSON。
2. **报告级**：Team 里的 critic 读 verdict + 全文，判 readiness、跨条冲突、lens 覆盖；写 `review.md` 终局块。
3. **价值级**：HITL2 的用户；不外包给模型。

## 5. 只读与落盘：谁写 verdict

三种做法：

- **A. critic 自己写 verdict 文件**：需要 fs 写；与「验证者只读」冲突，且它可能改 evidence。
- **B. 父级写（推荐）**：child 只返回 JSON，Lead 原样写入 `review/verdicts-r<N>.json`；child 不需要写权限。company 的 producer/verifier 就是「验证者只读出裁决，owner 原样落盘」。
- **C. 新建 `verifier` 只读 preset**：`tool-fs` 关 `write`/`edit`，无 bash；最硬，但要动角色名册（D2）与 preset-smoke 计数，成本高。

v1 选 **B**：不新增角色，靠「任务形状」实现只读——child 根本不需要写。等出现「child 必须自己跑测试」的需求，再评估 C。

## 6. 裁决留痕：hash + append-only + 覆盖

- 文件：`review/verdicts-r<N>.json`（机器）+ `review.md` 里的覆盖表（人读）。
- 写入：Lead 把 child 的最终消息**原文**写入；同时记 `sha256`（canonical JSON）与 `session_id`。
- 防改：审计重算文件 hash，与 `delivered.json` 里记录的值比对；不一致 = 红。
- 轮次：`r1`、`r2`……新轮新文件；旧文件不改；`review.md` 当前终局块指向最新 `rN`。
- 覆盖：每条 `critical: true` 的 claim 必须有 verdict；没有 = `UNVERIFIED`（第三态，不是 PASS 也不是 FAIL），永不被静默放行。

**hash 证明什么、不证明什么**：证明「文件在写入后没被改」，不证明「verdict 判得对」。别把完整性当正确性。

## 7. 机械可查 vs 语义判断

**可以机械查**：

- 每条 critical claim 有 verdict 行；
- 每条 verdict 有 `quote` 与 `rechecked_urls`；
- 文件 hash 与记录一致；
- evidence 文件存在、frontmatter 齐全、`source_url` 成功抓取（现有 evidence-audit）；
- 覆盖计数：claims × lenses 的矩阵没有空格。

**只能语义判**：

- quote 是否真的支持 claim；
- source tier 是否配得上结论；
- 反例是否被认真找过；
- readiness 的整篇判断。

建议：机械门只查**工件完整性**，不查「结论对不对」；语义审留给 critic 与用户。不要造一个「语义门禁」——它会把判断变成打卡。

## 8. 与 HITL2 的关系

- critic 的 PASS 是**前提**，不是替代；用户仍然签字。
- HITL2 摘要必须写：独立性层级（L2，同模异上下文）、未闭合 CRITICAL 数、UNVERIFIED 数、覆盖缺口。
- 若 PASS 但 verdict 覆盖 < 100%，摘要必须显示缺口；不能因为「review.md 写了 PASS」就把它当全绿。
- 用户点「定稿」后，Lead 把拍板行写进 `question.md §Decisions`，再落 `final/vN` 与 `delivered.json`。

## 9. 失败形态

- 验证者先读草稿 → anchoring；必须 claim-first。
- 验证者写 evidence/final → 利益冲突；只读或父级落盘。
- verdict 是 prose → 不可机械复核；必须 typed。
- 有 hash 没覆盖 → 只证明「不完整集合没被改」。
- 同模说成「独立」→ 过度声称；必须限定。
- FAIL 后自动重试到 PASS → 验证者采购；复审 ≤2 轮，每轮记录，不无限刷。
- 把 MINOR 堆成 PASS 的理由 → readiness 要看 critical 覆盖，不看条数。

## 10. 未决

1. claim 抽取由谁做：Lead、critic，还是 workflow 的一个 extract 阶段？倾向 Lead + critic 复核。
2. verdict 粒度：每条 claim 都验，还是只验 critical？倾向 critical 全验，non-critical 抽验并记抽样率。
3. `UNVERIFIED` 是否允许交付？v1：readiness 只能 FAIL；用户可在 HITL2 选「带缺口交付」，但产物必须标 FAIL + 缺口清单，不能写成 PASS。
4. 是否新建 `verifier` 只读 preset？等 v1 跑两个 run，看「父级落盘」是否够硬。
5. hash 记在哪：`delivered.json` 还是 `review.md` 头？倾向 `delivered.json`（回执正本），review 头只记 `rN` 与文件路径。

## 11. 来源

- 同模 self-critique 掉点: https://arxiv.org/html/2402.08115v2
- LLM judge 自偏爱: https://arxiv.org/html/2404.13076v1
- DeepResearch Bench FACT（citation accuracy / judge-human agreement）: https://arxiv.org/html/2506.11763v1
- Anthropic rubric（20 query、source quality）: https://www.anthropic.com/engineering/multi-agent-research-system
- Elicit quote-per-decision + 审计: https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit
