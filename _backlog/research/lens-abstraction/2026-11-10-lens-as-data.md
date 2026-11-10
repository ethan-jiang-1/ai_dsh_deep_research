---
topic: 研究视角层：把 bias 变成数据
intent: 为 Deep Research 的「不同视角/偏置」给出可落地的抽象——字段、住层、选择、组合与覆盖判据，并说明它为何是 workflow 扇出的前置条件。
---

# 研究视角层：把 bias 变成数据（v2）

> 性质：设计结论 + 证据评审，不是实施。事实段带锚点（`文件:行` / 论文表号 / 实测命令与结果），
> 决定段标「决定」，推断段标「推断」。
> 版本：v2（2026-11-10）。v1 的九字段、外部证据与失败形态保留；本版改掉四处：`blind_spots` 必需、
> lens 不拥有报告骨架、题型默认集按成本收紧、每 topic 子集 + 多 lens 默认独立 activation。
> 消费者：[README](README.md)（题名页）；产出的卡：[lens 数据层](../../_archived/settled_issues/2026-11-10-lens-layer.md)；
> 配套材料：[lens 目录草案](2026-11-10-lens-catalog-draft.md)。

## 0. 结论

**一句话：lens 是「一次研究里，从哪个证据面挖」的数据化契约——一份九字段的 markdown 文件，
不是角色、不是 persona、不是报告模板。它让同一道题可以有 1–4 个可区分、可配对、可检查覆盖的证据面。**

五条支撑：

1. **缺的是正交一维，不是又一个方法。** 题型（P1–P8）回答「这类题怎么派工」，方法预设定
   「整场怎么查」（五种：事实核查/领域地图/主张核查/方案比较/时间线与信号），角色定工具面，
   证据卡只记 `supports: topic`。它们之间没有「同一道题，这次从哪几个面挖」的选择
   （`packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md:57-79`；
   `packages/deep-research-pack/content/manual.md:149-165`）。
2. **外部消融支持「覆盖」而非「大纲」。** STORM 去掉 perspective 后，大纲 heading soft recall
   几乎不动（GPT-3.5 86.26→84.49；GPT-4 92.73→92.39），但唯一来源数从 99.83 腰斩到 54.36
   （论文 Table 3/5；代码默认 `max_num_persona=3`、论文 N=5，见 §8）。perspective 的收益在
   来源/实体的覆盖，不在大纲漂亮——所以覆盖要按「面 × topic」计，不按源数打卡。
3. **persona 是弱杠杆，lens 不能退化成 persona。** Zheng et al. 2024（162 角色 × 4 模型族 ×
   2,410 题）相对无 persona 控制组没有增益；2025 跟进（9 LLM × 27 任务）发现不相关 persona
   细节可造成近 30pp 下降（§8）。lens 的字段必须是可执行的方法动作（找什么/怎么核/不承诺什么），
   不是「你是一个……分析师」。
4. **仓内证据：单源面在真实 run 里很常见。** 本仓 52 个 ≥4 张证据卡的 run 中，13 个的单一
   publisher 占比 ≥70%，5 个 100%；例如 `drt_open-tts-2026-landscape` 76 卡、74% 来自
   huggingface.co，`drt_cn-moe-2026` 75 卡、79% 同样（实测，方法见 §1.1）。这不是「都错了」——
   很多 P1/P2 题天然单官方源；它证明的是：**没有机制阻止所有 topic 都从同一张脸挖**。
5. **成本约束是真实的：计划确认卡已顶格。** 实测 3 张 HITL1 计划卡 = 171/183/200 字，上限 200
   （`research-brief/SKILL.md:49-55`；脚本 `scripts/run-ops/plan-card-stats.mjs`）。因此 v2 的
   选择规则是「**默认隐、偏离显**」：默认 lens 集不逐条上卡，只在偏离默认时写进卡；否则 lens
   会被字数纪律挤成新的违规源（§5.2）。

## 1. 缺口：不是没有方法，是没有「同一道题的多面」

| 层 | 载体 | 回答 | 换 lens 会改吗 |
|---|---|---|---|
| 题型 | `question-patterns/SKILL.md`（P1–P8） | 这是什么题、派谁、多深、topic 怎么拆 | 不改；题型选默认 lens 集 |
| 研究方法 | `research-brief/SKILL.md:57-79` + `question.md` §研究方法 | 整场怎么查、报告什么形态、明确不承诺什么 | 不改；lens 是方法内部的面 |
| 用户方法库 | `research-workspace/method-library.md`（四字段） | 这个用户希望怎么找源/核实/写报告/不承诺 | 不改；库是整场方法偏好，不是 lens 目录 |
| 角色 | `presets/<role>.patch.yml` | 谁做、有什么工具面 | 不改；lens 不是角色 |
| 证据 | `evidence/*.md`（七字段） | 一条证据的出处/质量/归属 topic | **改**：新增 `lens` 字段 |
| **lens（本方向）** | 本文件 + [目录草案](2026-11-10-lens-catalog-draft.md) | **这次从哪几个证据面挖** | — |

**缺口的三种可观察形态**：

- 派工矩阵只能按题型给固定编制，无法表达「同一道对比题，这次加一个监管面」；
- critic 只能按「源数/等级/引用链」审，无法问「这个结论只从官方口径看，反证面覆盖了吗」；
- 报告只能写「我们不知道什么」，无法写「我们**用哪些面看过**、哪个面是空的」。

### 1.1 仓内基线：单一 publisher 占比（实测）

**方法**（可复跑）：遍历 `research-workspace/` 与 `research-workspace/archive/` 的 `drt_*`，
读 `evidence/*.md` 的 `publisher` 字段（取首个分号/逗号前的注册域），只统计 ≥4 张卡的 run；
算每个 run 的最大 publisher 占比。2026-11-10 跑出 55 个有证据的 run，其中 52 个 ≥4 卡。

| 指标 | 结果 |
|---|---|
| 最大 publisher 占比 = 100% | 5 个 run：`drt_deepseek-chat-price-check`、`drt_e2e-rerun-2026-10-23`、`drt_mistral-api-model-list`、`drt_openai-context-window`、`drt_qwen-dashscope-pricing` |
| 最大 publisher 占比 ≥70% | 13/52 |
| 典型大面积单源 | `drt_open-tts-2026-landscape` 76 卡 / 74% huggingface.co（T1 45 卡 82%、T3 29 卡 59%）；`drt_cn-moe-2026` 75 卡 / 79%（T1 78%、T2 87%、T3 81%） |
| 证据卡规模 | 55 个 run：中位 40 卡，p75 60，p90 76，max 160 |

**读法（重要）**：这不是「单源 = 坏」。P1/P2 题（`drt_qwen-dashscope-pricing` 10/10
help.aliyun.com）单官方源是正确形态；`drt_open-tts` 大量 huggingface.co 也有一部分是
模型卡元数据的正确一手面。它证明的是**机制缺口**：同一 run 的多个 topic 可以无提示地共享
同一张脸，而报告不会因此显性化「我们只看了模型卡，没看一线采用/独立评测」。lens 要补的正是
这个**显性化 + 可选择**，不是强迫每个 topic 多找几个域。

### 1.2 外部基线（细节与校正见 §8）

- **STORM**：perspective 去掉后唯一来源 99.83→54.36，大纲几乎不动；代码默认 3 个 persona +
  1 个 basic fact writer，**没有去重/聚类**（论文 Table 3/5；`persona_generator.py`
  `generate_persona(..., max_num_persona: int = 3)`，`considered_personas = [default_persona] +
  personas.personas[:max_num_persona]`）。这支持「按覆盖计」，也提醒我们补上 STORM 缺的
  **配对/去重**。
- **Persona**：2024 findings 空结果 + 2025 不相关细节 ≈ −30pp；但 2025 也说专家 persona
  「通常正向或不显著」。所以正确结论不是「persona 全无用」，而是「**persona 是弱、不可靠的
  杠杆；不要把方法承诺押在它上面**」。
- **Anthropic multi-agent**：不用详细任务描述时，subagent 会重复工作/留缺口（原文例子：一个
  子代理查 2021 汽车芯片危机，另两个重复查 2025 供应链）；多代理约 15× chat token，
  token 单独解释 80% BrowseComp 方差（§8）。→ 派工必须给「不同的输入」，否则同模同上下文
  会趋同。
- **Anthropic patterns**（2026）：agent 是「低方差」的——同一模型/脚手架/上下文的 agent 会
  做相似动作；prescriptive roles 在游戏建造实验里「没有带来多少差别」；hidden-profile 实验里
  未经指派的信息不会被主动说出（§8）。→ lens 必须落到**不同的来源面/不同的 activation**，
  不能只改一句 persona。

## 2. 抽象边界：lens 是什么、不是什么

**定义（决定）**：lens 是一个**命名证据面**，回答五件事：什么时候用、找哪类源、什么算证明、
这个面系统性高估什么、它看不见什么（以及谁来接住）。它不回答「报告整体长什么样」「这次派谁」
「用什么工具」——那分别归方法预设、题型/组队、角色 preset。

**五条「不是」**（违反即退回 v1 的失败形态）：

1. **不是角色/persona**：条目里不出现「你是……」「你的职责是……」；出现即退回 persona 层，
   因为角色会绑工具面、编制与角色边界（`presets/<role>.patch.yml` 的硬隔离）。
2. **不是方法预设**：方法预设拥有整场调查立场、报告骨架、run 级「明确不承诺」；lens 只在
   **证据面**这一层增补。两者冲突时：用户指令 > 方法预设 > lens 默认。
3. **不是来源清单**：来源清单会腐（URL 会变）；lens 写**来源族 + query 动作 + 验证动作**，
   具体来源由 scout/analyst 发现与分级。
4. **不是报告模板**：`frame` 只描述「本面的证据在所属章节里怎么呈现」，不决定报告分节；
   报告骨架归方法预设与 `synthesis` skill。
5. **不是「多搜几篇」**：没有 `bias`/`blind_spots` 的面不算 lens；覆盖按「cell 有卡或显式
   gap」计，不按总卡数计（§6）。

### 2.1 与既有「研究方法预设」的分工（v1 最大风险）

方法预设的四列（信息源策略/检验策略/综合与呈现/明确不承诺）与 lens 字段天然重叠；
如果不管，仓库会长出**第二套方法目录**。v2 的切法（决定）：

| 归属 | 方法预设 | lens |
|---|---|---|
| 层级 | run 级（整场） | 面级（cell = topic × lens） |
| 拥有 | 调查立场、报告骨架、run 级不承诺、篇幅/节奏 | 来源族、验证动作、本面高估/盲区、本面不能支撑什么 |
| 文本要求 | 保留现有四列作**下限** | 只写「这一面特有」的增量；方法已说的「官方优先」不重复 |
| 冲突 | 方法预设胜（报告骨架/run 级拒绝） | lens 只在方法未指定处生效 |

**未来合并（不是 v1）**：若 pilot 证明方法表的信息源/检验两列从不被单独使用，则把它们折进
lens 集，方法变成「名字 + lens 集 + 报告合同」。触发条件 = 两个 run 的 §Decisions/journal
都未引用方法表文本；见 §13。

## 3. 字段：九字段，前八必需

| # | 字段 | 必需 | 回答 | 谁消费 |
|---|---|---|---|---|
| 1 | `id` / `name` | 是 | 稳定标识（kebab-case，文件名 = id）与中文可读名 | 索引、evidence、review |
| 2 | `when` | 是 | 什么题型/决策下用；什么时候**不该**用 | HITL1、题型矩阵 |
| 3 | `seek` | 是 | 找哪类源、哪些 query 动作（官方域/论坛/财报/变更日志…） | scout / analyst |
| 4 | `verify` | 是 | 什么算证明、独立性怎么判、反例怎么搜 | analyst / critic |
| 5 | `frame` | 是 | 本面证据在所属章节怎么呈现、哪些 claim 优先 | lead（synthesis） |
| 6 | `refuse` | 是 | 本面**不能**支撑什么（防越界，不是 run 级免责） | lead / critic |
| 7 | `bias` | 是 | 本面系统性高估什么（诚实声明，不假装中立） | critic / 报告限制节 |
| 8 | `blind_spots` | 是 | 本面看不见什么 | 组合、critic 覆盖表 |
| 9 | `pairs_with` | 否 | 哪个互补面接住盲区（id 列表） | 选择、覆盖 |

**v2 的一处收紧**：v1 把 `blind_spots`/`pairs_with` 都列为可选；v2 把 **`blind_spots` 改为必需**，
`pairs_with` 仍可选。理由：这套抽象和「多搜几篇」的唯一分水岭就是「每个面承认自己不是全景」；
一个写不出盲区的条目，事实上就是来源清单或 persona，应该被目录评审打回。`pairs_with` 可以缺，
因为盲区可以用「本面盲区对本题不 material」或「显式接受单镜风险」来接（§5.5），不必强行配对。

**字段写法**：一条 entry ≈ 25–40 行；`seek`/`verify` 各 3–5 个动作，`bias`/`blind_spots` 各 1–2 句；
不写 URL 清单、不写工具用法、不写「你是」。示范（完整草案见 [目录草案](2026-11-10-lens-catalog-draft.md)）：

```markdown
## official — 官方口径
- **when**：状态/价目/规格/规则；不用来判断真实使用效果
- **seek**：主体自己的官方域（文档/定价页/公告/changelog/registry/财报）；先列实体→官方域清单
- **verify**：逐字摘录 + 版本/条款/生效日；同域多页互证；官方自述 ≠ 第三方验证
- **frame**：官方怎么说、何时生效、适用谁；引用给条款/页面/日期
- **refuse**：不推断采用度/动机；不把官方未披露说成不存在；不把营销页当条款
- **bias**：高估「写下来的规则 = 实际执行」
- **blind_spots**：真实使用、隐藏费用、执行偏差、非官方生态
- **pairs_with**：`practitioner`、`quant`
```

## 4. 住层：出厂目录 + Lead 索引，不建第二套用户目录

**决定**：

1. **出厂 lens 目录 = `packages/deep-research-pack/content/lenses/<id>.md`**（随包、只读、
   版本化；`package.json` 的 `files` 已含 `content/**`，`packages/deep-research-pack/package.json:37`）。
2. **索引与题型矩阵 = `presets/lead/skills/question-patterns/SKILL.md`**（HITL1 第一对照面，
   按需加载；只放 id/名/一句 when/配对/默认集，不复制全文）。
3. **研究手册 = 只放契约**：lens 是什么、目录路径、选择/覆盖规则、证据字段（约 8–10 行），
   不放置全套条目——手册每次会话注入，全套会变成常驻 token 税。
4. **不建 workspace `lenses/` 目录**（v1 的「同名条目 = 用户覆盖」撤销）。理由：method-library
   是**整场方法**的四字段偏好，不是九字段证据面；把同名条目当 lens 覆盖，会同时破坏两套契约
   （四字段缺 bias/blind_spots；lens 缺方法级报告承诺）。单场需要自定义面时，在 `topics.md`
   写 `custom:<短名>` + seek/verify/blind_spots 三行，**不落目录**；同一自定义面在 ≥2 个 run
   重复出现，才评估出厂化（或工作区覆盖目录）——触发条件见 §13。
5. **路径**：手册里的 `{{research_pack_root}}` 由 `src/content/index.ts:64` 注册、模板插值
   （`src/content/index.ts:52-70`）；安装态 `PACK_ROOT` = 包根，故
   `{{research_pack_root}}/content/lenses/` 是稳定绝对路径。技能文本不写死路径，统一说
   「手册里的 `research_pack_root` + `/content/lenses/`」，避免 dev 源码态与安装态分叉。

**为什么不放角色 skill**：skill 按 preset 硬隔离；team teammate 一律 composeFrom Lead
（`vendor/dsh/packages/experimental/agent-team/src/roster.ts:264-274` 的 activation 不传
`agentPreset`），拿不到 scout/analyst/critic 的 skill。lens 放 content，任何通道都能按路径读。
**为什么不放 plan schema**：`plan-index.ts` 只解析节点列（id/parent/kind/deps/task_id…），
加列会牵动 `plan-graph`、门禁与驾驶舱；lens 是 cell 属性，不是节点。`topics.md` 未被任何解析器
读（`scripts/lib/schema-scan-core.mjs:218` 只检查在场），加 `lenses:` 是零解析成本。

## 5. 选择与组合

### 5.1 选择发生在 HITL1，不新增交互点

题型给默认集（1–4；**默认 2、上限 4**；P1 允许 1 个 `official` 的已记录例外）。计划确认卡的
「方法行」后接**最多一个短标记**：默认不动；偏离默认时写 `视角：+监管` / `视角：A+B`。
完整集合落 `question.md` §研究方法（`- 本次视角:`）与 `topics.md` 每个 topic 的 `lenses:`。

**默认集（v2，按成本收紧；v1 的 P2/P4/P6 各减 1）**：

| 题型 | 方法（既有） | 默认 lens | 何时加面 |
|---|---|---|---|
| P1 单点事实/状态 | 事实核查 | `official`（1） | 状态/是否判定 → `+adversarial` |
| P2 数据表/价目 | 事实核查 | `official` + `quant`（2） | must_answer 含真实账单/总成本 → `+practitioner` |
| P3 领域全景 | 领域地图 | `structural` + `official` + `practitioner`（3） | 受监管行业 → `+regulatory`（≤4） |
| P4 断言验证 | 主张核查 | `adversarial` + `official`（2） | claim 含数字 → `+quant`；科学主张 → `+academic` |
| P5 多维对比 | 方案比较 | `quant` + `practitioner` + `structural`（3） | 受监管 → `+regulatory`（≤4） |
| P6 尽调/评估 | 方案比较 | `official` + `quant` + `adversarial`（3） | 受监管 → `+regulatory`（≤4） |
| P7 方法/方案 | 方案比较 | `practitioner` + `academic`（2） | 有硬合规约束 → `+regulatory` |
| P8 事态/时间线 | 时间线与信号 | `historical` + `official` + `practitioner`（3） | 有数字趋势 → `+quant` |

**为什么 P6 从 v1 的 4 个（quant+adversarial+structural+regulatory）改成 3 个
（official+quant+adversarial）**：尽调的核心是「官方状态/财务数字/红旗」三面，`official`
（filings/主体状态）比 `structural`（竞争位置）更承重；`regulatory` 只在受监管行业加。这样
默认仍是 3，4 个只给真正的监管题。P2/P4 同理：默认 2，第三面只在 must_answer 真的点名时加。

### 5.2 计划卡：默认隐、偏离显（实测字段预算）

实测 3 张计划卡 171/183/200 字，上限 200（`research-brief/SKILL.md:49-55`；命令
`source dev/env.sh && node scripts/run-ops/plan-card-stats.mjs --days 120`）。因此：

- **默认集不进卡**：卡上只写「方法：<名>」；默认视角由题型决定、写全文。用户点「按计划开跑」
  即对默认集拍板；
- **偏离才进卡**：用户加/减面时只写**偏离的那一个短名**（如 `视角：+监管` / `视角：-官方`），
  不列默认全集，并从别处删字保 200；
- **全文指针**已含 `question.md / topics.md / plan.md`，视角明细在这两份里可查；
- 若实测发现用户在 HITL1 反复问「用了哪些视角」→ 触发 §13 的重议（不是直接加字，而是找预算
  来源：把 topic 骨干压成 T1–T4，或把方法行的一句话删短）。

### 5.3 per-topic 子集：不是每个 topic 都上全套

- run 级集合 = 菜单；每个**产出证据的 topic** 写 `lenses:` 子集（1–3 个）；`synthesis` /
  纯汇总 topic 可以 0 个（它消费 findings，不再挖）。
- **cells = Σ(topic × 该 topic 的 lens 数)**，上限 **12**（与 `research-planning/SKILL.md:56`
  的顶层节点 ≤12 同量级）。超了先砍支撑 topic 的面，不砍 primary 的面。
- 默认：primary topic 用 run 级全集；supporting topic 只留 1–2 个最相关的面；`comparison`
  topic 至少 `quant`（若在比数字）。

### 5.4 多 lens 默认独立 activation（否则会趋同）

Anthropic 2026 的「低方差」结论（§8）意味着：同一个 analyst 在同一上下文里顺序跑两个 lens，
很可能用同一批 query/源，只是换了说法。**决定**：

- 同一 topic 有 ≥2 个 lens 时，**至少一个 lens 在独立 activation 执行**（`subagent(agent_preset=analyst)` 或 workflow child；team 里由 topic owner 派 subagent，或 Lead 派）；
- 如果因成本/工具面必须在同一 activation 顺序跑，plan/journal 记一句理由（哪里省、风险是什么）；
- 独立 activation 的 brief 带：topic + lens id + 全文路径 + 三条关键动作（seek/verify/blind_spots）；
- 同一 activation 内**不**把两个 lens 的 query 合并成一轮——先跑完一个面的证据，再换面。

这不是「多派几个人」的硬性编制：cells ≤12，且独立 activation 可以串行；它只保证**不同面
真的在不同上下文里跑**，而不是同一个人换三顶帽子。

### 5.5 配对、盲区与冲突

- **配对**：每个选中 lens 的 `blind_spots` 要有三种处置之一，写进 review 覆盖表：
  ① 选中的另一个 lens 的 `seek`/`verify` 接住它；② 写「本题不 material」+ 理由；
  ③ 写「单镜风险已接受」+ 理由。三者都没有 = MAJOR（覆盖无效）。
- **P1 单镜例外**：`official` 单跑时，①通常不成立；必须 ②或③，且记在 review。不许静默。
- **冲突**：两个 lens 的结论冲突时不取平均；进 `findings.md` 的 `contradicted`，报告呈现
  冲突与各自口径；若冲突是「一面说规则、一面说执行」，这通常不是矛盾，而是两个面的正常分工，
  写法上分开陈述。
- **lens 与题型打架**：lens 要求换深度/换编制 → 回 HITL1 重判型，不在执行中偷偷改（v1 规则保留）。

## 6. 覆盖怎么算（v1 不动 plan、不加新门）

### 6.1 数据改动（三层，均不动解析器）

1. **evidence frontmatter 加 `lens: <id>`**（第七字段 → 第八字段）。**单值**：一卡一面；
   多面证据拆卡（可同 `source_url`，摘录/解读按面写）。理由：`scripts/lib/frontmatter.mjs`
   是扁平 `key: value` 解析器，多值 `[a, b]` 会变成字符串，无法被未来消费方可靠解析；单值也
   防止「一卡打多个勾」的覆盖注水（`scripts/lib/frontmatter.mjs:22-30`）。
2. **topics.md 每个 topic 加 `lenses: [id, …]`**（可选行；0 个 = 该 topic 不挖，仅 synthesis）。
3. **findings.md 每个 F# 加 `lenses: […]` 与 `lens_gaps: […]`**；review.md 终局块加一张
   `topic × lens` 覆盖表；final.md §目前不能判断加一行「视角覆盖：… / 空视角：…」。

**已实测的兼容性**（keyless fixture，2026-11-10）：

- `evidence-audit` 对带 `lens` 的卡片报「frontmatter 契约符合：1 份」——它只查硬五字段
  （`scripts/lib/evidence-audit-core.mjs:212-218`），额外键被 `splitFrontmatter` 收下但不判；
- `schema-scan` 对带 `lenses:` 的 `topics.md` + 带 `lens:` 的 `evidence/` 全绿（它只查核心
  文件在场，`scripts/lib/schema-scan-core.mjs:218`）；
- `method-of-question.ts` 只读 `- 采用:` / `- 来源:` / `- 调查要求:`（`method-of-question.ts:60-84`），
  在研究方法节加 `- 本次视角:` 不会改变驾驶舱的「本次研究」五态；
- 驾驶舱当前只读 plan/task/run 文件，不读 evidence frontmatter（`docs/design/40-research-cockpit.md:107-126`；
  `src/lib/plan-index.ts`），所以覆盖表 v1 由 critic/Lead 填，cockpit 接入是后续。

### 6.2 覆盖判据（语义，critic 执行）

对每个**产出证据的** topic T 与 T 的每个选中 lens L：

- **有卡**：≥1 张 `supports: T` 且 `lens: L` 的卡；关键 claim 要 A/B（C 只能做背景，按现有
  证据质量纪律）。
- **显式 gap**：没有卡，但 review 表写 `gap：<原因；已试渠道>`；这是合法状态，**前提是该面不是
  关键 claim 的唯一支撑**——若是，claim 本身走 `unverifiable`（readiness 只能 FAIL）。显式 gap
  必须在 final「目前不能判断」里出现。
- **静默空格**：没有卡、也没有 gap 记录 = **MAJOR + readiness FAIL**（契约违例，不是研究缺口）。
- **盲区覆盖**：§5.5 的三选一；没写 = MAJOR。
- **UNVERIFIED 不混用**：claim 级 `unverifiable`（第三态）与 lens 覆盖缺口是两件事；前者按
  quality-loop 的规则聚合为 `UNVERIFIED`，后者是「这一面没挖/没挖到」。两者都要显性，但不能
  互相代替。

**覆盖表格式（review.md 终局块）**：

```markdown
| topic | official | adversarial | practitioner |
|---|---|---|---|
| T1 | 3 卡（A2/B1） | 2 卡（A1/B1） | — gap：已搜社区，未得 |
| T2 | 1 卡（A1） | — n/a：本题不做状态判定 | 2 卡（B2） |
```

**v1 不加新门**：覆盖是语义判断，机械门只能查「表在场/格式」，查不出「这个面真的挖过」；
先让 critic 填两个 run，若出现连续 2 次静默空格（无人发现/无人记），再评估
`evidence-audit` 的 lens 覆盖 INFO/MAJOR（触发条件见 §13）。这与 quality-loop「机械门只查工件
完整性」的结论一致（`_backlog/research/quality-loop/2026-11-10-claim-verdicts.md:101-118`）。

## 7. 通道：同一份 lens 在三条委派通道都能跑

| 通道 | 角色保真 | 怎么拿 lens | 适合 |
|---|---|---|---|
| `subagent(agent_preset=analyst/scout/critic)` | 真 preset（唯一能钉 preset 的通道） | 派发 brief 内联 seek/verify + 全文路径 | claim/cell 级独立验证；多 lens 同 topic 的「换一双眼睛」 |
| Agent Teams（`spawn_teammate`） | 队友一律 composeFrom Lead（`roster.ts:264-274` 不传 preset；`tool-subagent/README.md:70` 说明省略 preset = join parent revision） | 派发第五件「方法论装载」：先 read 自己的 skill，再 read lens 文件；brief 内联三条动作 | 持久协作、跨轮、改派 |
| `workflow` | child 继承父 preset revision（`workflow-ptc/src/host.ts:203-219` 的 `startActivation` 不传 preset） | args/brief 内联 lens 全文或路径；child 有 Lead 的 fs 工具面 | 同质 cell 扇出（`lens-fanout`）；需要用户显式授权 |

**关键机制事实**（v2 复核）：

- `workflow` 的 `agent()` 不能选 preset；子代是 Lead 的组合（`workflow-ptc/src/host.ts:203-219`）。
  这正是 v1 §7 的判断：**方法若绑在角色 skill 上，workflow 扇出必丢方法**；lens 是数据 + brief，
  所以能保住方法保真（角色保真降一档）。
- `workflow` 工具的政策句是「仅用户显式要求」（`tool-workflow/src/index.ts:329`）；HITL1 的
  「执行方式」是唯一合法授权点（wave 方向已论证）。本文的 pilot 用 subagent，不强依赖 workflow；
  lens 是 workflow 的**前置条件**，不是它的替代。
- `research-content` 的 systemPrompt context 是 host 级注册；in-process spawn / workflow child
  在同一 host 内应继承手册与 `research_pack_root`（推断；`src/content/index.ts:52-70` +
  `subagent-spawn-in-process` 的 `inheritsParentContext=false` 只表示子代不复用父上下文，不表示
  不拿 host 级注入）。**实施前必须做一次探针**：让 workflow child 读
  `{{research_pack_root}}/content/lenses/official.md`，读不到就把全文内联进 brief（§14）。

**派发五件不增加第六件**：lens 属于第五件「方法论装载」——派发里写「本次视角 = <id>；先 read
<路径>；关键动作 = seek … / verify … / blind_spots …」。如果 child 读不到文件，brief 已内联
三条动作，不会静默丢方法。

## 8. 外部校准（2026-11-10 逐一核过）

### 8.1 STORM（arXiv 2402.14207）

- **消融数字**：Table 3 大纲 heading soft recall：GPT-3.5 STORM 86.26 vs w/o Perspective 84.49；
  GPT-4 92.73 vs 92.39。Table 5 唯一来源数：STORM 99.83 vs w/o Perspective 54.36（w/o
  Conversation 39.56）。论文 §4.4：N=5、M=5；代码
  `knowledge_storm/storm_wiki/modules/persona_generator.py` 的 `generate_persona(...,
  max_num_persona: int = 3)`，且 `considered_personas = [default_persona] +
  personas.personas[:max_num_persona]`——**没有去重/聚类**。
- **读法**：perspective 的收益在覆盖；大纲几乎不动。**注意**：论文的 perspective 是 zero-shot
  2024 系统，不是 2026 的 agentic search；把「unique refs 腰斩」直接外推成「我们的 lens 一定
  提升覆盖」是推断，不是事实。pilot 要测的是**本仓语料里的面分离**，不是复现 STORM。
- **对我们的两条设计约束**：① 覆盖按「面 × topic」计，不按卡数；② 必须补 STORM 没有的
  **配对/去重**（否则三个 analyst 用三种说法挖同一批源）。

### 8.2 Persona（Zheng et al. 2024；Luz de Araujo et al. 2025）

- Zheng et al. 2024（Findings EMNLP）：162 角色、6 类人际、8 领域、4 模型族、2,410 事实题；
  persona 相对无 persona 控制组**没有增益**；自动挑最佳 persona 也不比随机好。
- Luz de Araujo et al. 2025（EMNLP）：9 个 SOTA LLM × 27 任务；专家 persona「通常正向或不显著」；
  **不相关 persona 细节造成近 30pp 下降**；缓解策略只对最大模型有效。
- **读法**：persona 不是「零收益」，是「弱且不可靠」；lens 若退化成 persona 形容词，会落进
  这个分布。条目评审要能通过「删掉人格句，方法动作还在不在」的测试。

### 8.3 Anthropic 两篇（工程 + 研究）

- 工程篇：multi-agent 比单 agent Claude Opus 4 高 **90.2%**（内部 research eval）；多代理约
  **15×** chat token；BrowseComp 上 token 单独解释 **80%** 方差；不用详细任务描述时，subagent
  会重复工作/留缺口（原文：一个子代理查 2021 汽车芯片危机，另两个重复查 2025 供应链）。
- 研究篇（2026）：agent 是「低方差」——同一模型/脚手架/上下文会做相似动作；prescriptive roles
  在游戏建造实验里「没有带来多少差别」；hidden-profile 实验里，未被指派的信息不会被主动说出；
  协调型 swarm 与独立并行各有互补（共同发现只有 12 个漏洞）。
- **读法**：lens 的独立 activation + 不同 brief 是「不同的输入」；只改 persona/角色名，按这两篇
  的证据，收益接近零。Anthropic 也说明「subagent 输出到文件系统」能减少传话损耗——我们的
  evidence 文件正是这个形态。

### 8.4 其他（弱证据，仅作 table stakes）

- **Co-STORM**（arXiv 2408.15232）：用动态 mind map 组织「未覆盖的信息」，用户可旁观/steer；
  这支持「覆盖缺口要显性化」的观察面，但它不是 lens 分类法。
- **Elicit systematic review**：Setup 页在跑之前把每一步/每个设置放一处（search/screening/
  extraction/report、Fast/Thorough、dual review、PRISMA 审计与 kappa）；这是「pre-run 参数块」
  的产品证据，支持 HITL1 一次选清，而不是跑起来再加。
- **GPT-Researcher enum**：`ReportType` / `ReportSource` / `Tone` / `PromptFamily`——产品把
  「报告类型/来源/语气」做成 typed 参数，但没有「证据面」维度。这是 table stakes，不是差异化。

## 9. 备选与否决（至少两个；实际考虑过八个）

| 备选 | 否决理由 |
|---|---|
| A. 每个视角一个 persona/角色（STORM 式） | persona 弱杠杆（§8.2）；角色绑工具面/编制/硬隔离；team max 8；换视角要改 preset |
| B. 新增第五个研究角色（Perspective Analyst） | 推翻 D2 角色清单；角色哨兵/roster/l4-lite 全要动；lens 是方法层，不是人 |
| C. 加进 plan schema（节点列/新 kind） | `plan-index`/`plan-graph`/门禁/驾驶舱连锁；lens 是 cell 属性，不是节点；topics.md 零解析成本 |
| D. 建 workspace `lenses/` 第二目录 | 与 method-library 语义打架；用户可改出厂方法集，版本/审计漂移；v1 明确警告过 |
| E. 把全套 lens 注入 manual | manual 已 18.8KB；8 条 × 25–40 行会成为每次会话的常驻 token 税；只放契约 + 路径 |
| F. v1 就上机械覆盖门 | 覆盖是语义判断；机械只能查表在场，查不出「面真的挖过」；先让 critic 填两个 run，连续 2 次静默空格再升门 |
| G. 用「≥N 源 / ≥N 域」当覆盖 | 可打卡、可注水；STORM 的数字说明来源数是结果不是判据；域多 ≠ 面不同 |
| H. 直接替换五种方法预设为 lens 集 | 公共行为变更太大；用户方法库/方法编辑/HITL1 全要重写；先并存、按证据再合并（§2.1） |

## 10. 决策表

| 决策 | 选择 | 为什么 | 代价 | 触发重议 |
|---|---|---|---|---|
| 单元 | 数据文件，不是角色/persona | 三通道可读；不绑工具面；STORM/persona 证据 | 需要一处目录与索引 | 新 pin 让 workflow child 能选 preset（也不改变数据层价值） |
| 字段 | 9 个；前 8 必需，`pairs_with` 可选 | blind_spots 是分水岭；pairs 可缺省但要有替代处置 | 条目略长（25–40 行） | 两个 run 的条目都写不出 blind_spots 的差异化 → 说明面划分错了 |
| 住层 | `content/lenses/` + lead skill 索引 + manual 契约 | 出厂只读、版本化；任意通道可读；不常驻全文 | 多一次 read；路径依赖 | 安装态路径读不到（探针红）→ 改为 manual 内联短条目 |
| 选择 | HITL1；默认 2、上限 4；默认隐/偏离显 | 题型给先验；200 字卡实测顶格；用户只需对偏离拍板 | 默认不被逐条确认 | 用户反复问「用了哪些视角」→ 找卡预算或改交互 |
| 粒度 | run 级集合 + per-topic 子集；cells ≤12 | 成本可控；synthesis topic 不挖；支撑 topic 不必上全套 | Lead 要填 topics.md | 多数 run 都全 topic 全集 → 说明默认集太宽 |
| 证据 | 单值 `lens`；一卡一面；多面拆卡 | 扁平 frontmatter 可解析；防一卡多勾注水 | 同源可能两张卡 | 单值导致大量重复卡（>1.3×）→ 评估 `also_supports` |
| 独立 | 同 topic ≥2 lens 默认独立 activation | Anthropic 低方差/隐藏信息证据 | token/协调成本 | 独立 activation 成本 >1.5× 且面分离无提升 → 退回顺序并记录 |
| 覆盖 | review 表 + findings gaps；无新门 | 语义判断；先观察两次 | 依赖 critic 纪律 | 连续 2 次静默空格 → evidence-audit 加 INFO/MAJOR |
| 报告 | 方法骨架胜；lens 只在章节内影响呈现 | 防止报告碎成三份小报告 | 综合难度略升 | 读者反馈「看不出视角差异」→ 把覆盖表提到报告首屏 |
| 用户自定义 | 单场 `custom:<名>` 内联；不建目录 | 避免第二目录；先观察重复 | 不能复用 | 同一自定义面 ≥2 run → 出厂化或工作区覆盖 |
| 门禁 | v1 不加；catalog 形状用 keyless test 守 | 目录形状可机械；覆盖语义不行 | 手填表可能走形式 | 见上「连续 2 次静默空格」 |

## 11. 失败形态（先写死）

- **lens 变成第五个角色**：条目出现「你是/你的职责」→ 退回 persona；目录评审直接打回。
- **lens 爆炸**：一次 >4、单 topic >3、cells >12；成本线性涨、协调熵增。
- **lens 退化成来源清单**：只有 `seek`，没有 `bias`/`blind_spots`/`refuse` → 就是「多搜几篇」。
- **lens 与方法预设打架**：lens 要求改报告骨架/改编制 → 回 HITL1 重判型；方法预设胜报告合同。
- **覆盖表打卡**：只写 ✓ 不写卡数/质量/缺口，或所有格子都填「有」→ critic 要能指出对应卡；
  抽查任意一格，找不到卡 = 表造假。
- **同 activation 假多面**：一个 analyst 顺序跑三个 lens，query 合并成一轮 → 面分离为 0；
  pilot 的 face-separation 指标要能抓到。
- **静默 gap**：没卡、没 gap、没 n/a，readiness 仍 PASS → 必须 FAIL；这是最轻量的研究造假。
- **自定义面蔓延**：每个 run 都写 `custom:`，从不复现 → 说明出厂目录缺面；按 §13 处理。
- **把 lens 当 workflow 的借口**：lens 没数据化就上 workflow → 子代是 Lead 克隆，只产出
  「Lead 味的泛泛研究」；顺序反了。

## 12. pilot plan（一场真 run）

**形状**：P5 对比或 P6 尽调；3–4 个 topic（至少 2 个 primary）；2–3 个 lens（至少一组配对，
如 official ↔ practitioner 或 adversarial ↔ official）；Team 主通道 + 至少一个 cell 用独立
subagent；不强制 workflow（未挂；它是后续执行器）。

**指标与判据**：

| # | 指标 | 怎么测 | 通过线 | 失败信号 |
|---|---|---|---|---|
| 1 | 面分离 | 每个 ≥2 lens 的 topic：每个 lens 至少 1 个 publisher 域是另一个 lens 没有的；critic 再抽查两面的问题清单/关键 claim 不重合（域只是代理，同域不同页可能合法） | 所有此类 topic 成立 + claim 分离成立 | 两面的域集合相同/包含，且 claim 集合重合 → lens 是装饰 |
| 2 | 覆盖完整 | 覆盖表：evidence-producing topic × lens 每格 = 卡数或显式 gap/n-a | 静默空格 = 0 | 任意静默空格 |
| 3 | gap 动作 | 至少 1 个 gap 被补搜或显性披露 | ≥1 个 gap 且有处置 | 0 个 gap（且面分离也弱）→ 题太窄/面太像 |
| 4 | 成本 | 证据卡数 vs 同类历史 run；计划卡字数；派发字节 | 卡数 ≤1.5×；卡 ≤200 字；派发 +≤30% | >2× 或卡超限 |
| 5 | critic 可用 | critic 只看文件能否填满表；是否要问 Lead | 填满且 0 次追问 | 追问 >1 次 → 合同不清 |
| 6 | 读者价值 | final「目前不能判断」是否点名空面；用户能否答「缺哪一面」 | 点名 ≥1 个空面/风险 | 读者看不出差别 |

**通过**：硬线（1 面分离、2 静默空格 0、4 卡 ≤200）全过；六指标里至少 4 项达标（硬线计入）。
**失败**：静默空格 >0、面分离 = 0、成本 >2×，任一即停，回 §13 重议。
**产物**：`drt_<slug>/`（evidence 带 `lens`、topics 带 `lenses`、review 覆盖表、final 覆盖行）
+ issue 卡上的 pilot 记录（指标读数、失败/通过、下一步）。

**基线**：优先选同类历史 run（本仓 52 个 ≥4 卡 run 的 publisher 分布可作对照）；没有同类就
在同一题上先用 1 个 lens 跑一个 topic 作对照，再换 2 个 lens 跑同 topic——成本翻倍，只在
关键题上用。

## 13. 什么会改变结论

1. **新证据说 perspective 不提升覆盖**（agentic search 的复现失败）→ lens 从「默认层」降为
   「可选检查表」，甚至并入方法预设。
2. **pilot 面分离 = 0**：两个 lens 挖同一批域 → 说明面划分不成立或独立 activation 没做到；
   先改面/改 activation，再失败就退回方法预设的来源策略。
3. **成本 >2× 且无覆盖增益** → 默认集减到 1–2 个，或只在 P6/P3 用。
4. **用户反馈 HITL1 太啰嗦/看不懂视角** → 把 lens 完全藏进方法预设，只保留 review 覆盖表。
5. **DSH 新机制让 workflow child 能选 preset** → lens 仍可作数据层，但「角色 + lens」的组合
   空间变大；需重新评估「第五角色」是否又划算。
6. **方法预设被重构/移除** → lens 的「不拥有报告骨架」前提变了；合并方案（§2.1）提前。
7. **驾驶舱开始读 evidence/topics** → 覆盖矩阵可自动推导，手工表的必要性下降；可把 v1 的表
   降为审计副本。
8. **同一自定义面在 ≥2 run 复现** → 出厂化或允许工作区覆盖目录；这会改变 §4 的「不建第二目录」。
9. **新 pin 改变 systemPrompt context / subagent 继承语义** → 路径/内联策略要重验。

## 14. 实施前要验的（不是设计未决）

1. **workflow child 是否拿到 manual + `research_pack_root`**：起一个 workflow，子代 read
   `{{research_pack_root}}/content/lenses/official.md`；读不到 → brief 内联全文（§7）。
2. **计划卡「视角：+X」是否真的能压在 200 字内**：用 `plan-card-stats.mjs` 的口径，在真实
   HITL1 卡上数字符；压不下 → 改用「默认隐、偏离只写一个词」或从 topic 骨干删字。
3. **critic 能否只凭文件填覆盖表**：用 fixture bundle（含 `lens`/`lenses`/review 表）让 critic
   跑一次；要追问就补合同措辞，不加字段。
4. **evidence-audit 的额外键行为**：已做 keyless fixture（§6.1）；实施后在新 run 上再跑一次
   `--write`，确认「契约符合」计数不因 `lens` 下降。
5. **lens 文件形状的可机械性**：目录 test 解析 frontmatter（id/pairs）+ 必需字段行（when/seek/
   verify/frame/refuse/bias/blind_spots）；先写红（缺字段行/坏 pair/带「你是」），再实现到绿。

## 15. 证据评审

**证据等级**：

- **实测（本仓，可复跑）**：52/55 run 的 publisher 分布（§1.1）；3 张计划卡 171/183/200（§5.2）；
  keyless fixture 的 evidence-audit/schema-scan 兼容性（§6.1）；`method-of-question` 解析面
  （§6.1）。
- **源码（vendor 本 pin）**：workflow child 不传 preset、team activation 不传 preset、
  `tool-subagent/README.md:70` 的「省略 preset = join parent revision」、workflow 政策句
  （§7）；`content/index.ts` 的 `research_pack_root`（§4）。
- **论文/产品页（已核）**：STORM Table 3/5 + 代码默认值；Zheng 2024 / Luz de Araujo 2025；
  Anthropic 工程/研究两篇；Co-STORM 摘要；Elicit Setup 页；GPTR enum（§8）。**未读全文**：
  Co-STORM 正文（只读摘要）；STORM 的 human eval 细节（与 lens 设计无关）。
- **推断（标了）**：workflow child 继承 host 级 content 注入（§7，需探针）；STORM 的覆盖收益
  外推到本仓（§8.1）；独立 activation 能提升面分离（§5.4，pilot 测）。

**已校正 v1 的地方**：

- v1「`blind_spots`/`pairs_with` 可选」→ v2 `blind_spots` 必需（§3）。
- v1「method-library 同名条目 = 用户覆盖」→ v2 不建第二目录，单场 `custom:`（§4）。
- v1「lens 的 `frame` 管报告组织」→ v2 方法骨架胜，lens 只在章节内（§2.1）。
- v1 P2/P4/P6 默认 3/3/4 → v2 2/2/3（§5.1），按成本与 must_answer 加面。
- v1「覆盖表可只写有/无」→ v2 要卡数+质量+gap/n-a，静默空格 FAIL（§6.2）。

**冷读自检**：本文件只依赖题名页 + 共享底座 + 本目录两份材料即可继续；所有 claim 有文件/行、
论文表号或实测命令；无「待补 URL」的承重 claim。未跑 pilot 属「待执行」，不是上下文阻塞
（按 research-shelf §10 口径）。

## 16. 来源

**本仓（源码/合同）**

- `packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md:49-55`（计划卡 200 字）、`:57-79`（方法预设五条）
- `packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md:19-178`（P1–P8）
- `packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md:56`（顶层节点 ≤12）、`:71-80`（cell）
- `packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md:28-41`（派发五件/方法论装载）
- `packages/deep-research-pack/content/manual.md:149-165`（证据七字段现状；实施后加 `lens` 为八字段）、`:177-180`（独立性）、`:199-204`（完成判据）
- `packages/deep-research-pack/content/templates/run/{topics,evidence-entry,findings,final}.md`
- `packages/deep-research-pack/src/content/index.ts:52-70`（手册注入 + `research_pack_root`）
- `packages/deep-research-pack/src/lib/method-of-question.ts:60-84`（只读方法节三字段）
- `packages/deep-research-pack/src/lib/plan-index.ts:1-15`（只解析 plan 节点列）
- `packages/deep-research-pack/package.json:37`（`files: content/**`）
- `scripts/lib/evidence-audit-core.mjs:212-218`（硬五字段）
- `scripts/lib/schema-scan-core.mjs:218`（topics 在场级）
- `scripts/lib/frontmatter.mjs:22-30`（扁平标量）
- `scripts/run-ops/plan-card-stats.mjs`（计划卡字数投影）
- `docs/design/40-research-cockpit.md:107-126`（驾驶舱读面：plan/task/run，不读 evidence）
- `research-workspace/method-library.md`（四字段实例）

**vendor/dsh（本 pin）**

- `vendor/dsh/packages/subagent/tool-subagent/README.md:70`（省略 preset = join parent revision）
- `vendor/dsh/packages/subagent/subagent-spawn-in-process/src/index.ts:46`（`inheritsParentContext=false`）
- `vendor/dsh/packages/experimental/agent-team/src/roster.ts:264-274`（team activation 不传 preset）
- `vendor/dsh/packages/workflow/workflow-ptc/src/host.ts:203-219`（workflow child startActivation）
- `vendor/dsh/packages/workflow/tool-workflow/src/index.ts:329`（workflow 政策句）

**外部（2026-11-10 核过）**

- STORM paper: https://arxiv.org/abs/2402.14207 ；ar5iv: https://ar5iv.labs.arxiv.org/html/2402.14207
- STORM persona generator（默认 3）: https://raw.githubusercontent.com/stanford-oval/storm/main/knowledge_storm/storm_wiki/modules/persona_generator.py
- Zheng et al. 2024: https://aclanthology.org/2024.findings-emnlp.888/
- Luz de Araujo et al. 2025: https://aclanthology.org/2025.emnlp-main.1364/
- Anthropic multi-agent engineering: https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic multiagent patterns: https://www.anthropic.com/research/multiagent-systems
- Co-STORM: https://arxiv.org/abs/2408.15232
- Elicit systematic reviews: https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit
- GPT-Researcher enum: https://raw.githubusercontent.com/assafelovic/gpt-researcher/master/gpt_researcher/utils/enum.py
