---
status: 已定性
opened: 2026-11-10
---

# 研究视角层：把 bias 变成数据

> 状态：已定性
> 问题：Deep Research 的「不同 bias / 视角」应该抽象成什么——字段、目录、选择规则、组合与覆盖判据；它与 question-patterns（题型）、method-library（用户偏好）、topics（问题图）、evidence（证据卡）各自的分工是什么。
> 消费者：本轮 presets 设计推演（用户 2026-11-10 直派）；落地产出 = [lens 数据层](../../_archived/settled_issues/2026-11-10-lens-layer.md)。
> 产出的卡：[2026-11-10-lens-layer.md](../../_archived/settled_issues/2026-11-10-lens-layer.md)（已结，`implemented`）
> 结论：lens = 可选、可配对、可检查覆盖的**证据面数据**（九字段文件，前八必需），不是角色/persona/报告模板；住 pack `content/lenses/` + Lead 索引，HITL1 按题型给 1–4 个默认面（默认 2），per-topic 子集、cells ≤12，证据卡加单值 `lens`，覆盖用 review 表（无新门）。[详见 v2](2026-11-10-lens-as-data.md)。

## 研究问题

1. 一个 lens 最少要哪几个字段，才能既指导搜索、又约束写作、还能被 critic 检查？（找来源 / 怎么核实 / 报告怎么写 / 不承诺 / 偏置 / 盲区 / 配对）
2. lens 住哪层：pack content（随包、只读、版本化）、workspace `method-library.md`（用户所有）、还是角色 skill？四槽（人 / 流程 / 方法 / 政策）与寿命—成本判据怎么落？
3. lens 与题型（P1–P8）是正交还是替代？同一题型换 lens 会改变什么（来源、证据门槛、报告骨架、反例）？
4. 组合规则：一次研究选几个 lens、谁和谁配对、如何保证「盲区被另一个 lens 覆盖」而不是「多搜几篇」？
5. 覆盖怎么算：evidence 加 `lens` 字段即可，还是要动 plan schema？驾驶舱能否只读推导？
6. 失败形态：lens 太多导致成本爆炸、lens 退化成 persona 换皮、lens 与题型互相打架。

## 边界

- 不改四角色身份；lens 是方法层，不是第五个角色。
- 不把 `method-library` 变成第二套 lens 目录；两者关系必须写清。
- 外部 perspective / persona 研究归 `../external-landscape/`，这里只收设计结论。

## 本方向上下文

- **问题**：DR 的「不同 bias/视角」抽象成什么；字段、住层、选择、组合、覆盖。
- **当前结论（v2，2026-11-10 定稿）**：lens = 数据不是角色；九字段（前八必需，
  `pairs_with` 可选）；出厂目录 `content/lenses/` + Lead 索引 + 手册契约；题型给默认集
  （默认 2、上限 4；P1 可单 `official`，已记录例外）；per-topic 子集、cells ≤12；多 lens 同
  topic 默认独立 activation；evidence 加单值 `lens`（一卡一面）；覆盖 = review `topic × lens`
  表 + findings `lens_gaps`；v1 不动 plan schema、不加新门。
- **口径（v2 修正了 v1 四处）**：
  - 四轴 = 人 / 流程 / 方法 / 政策 + 实例（run）；不是「人/流程/方法/实例」四选一。
  - **方法预设 vs lens 分层**：方法预设拥有整场调查立场/报告骨架/run 级不承诺；lens 只拥有
    证据面（seek/verify/frame/refuse/bias/blind_spots）。冲突时：用户 > 方法预设 > lens。
  - `blind_spots` **必需**（v1 说可选）；`pairs_with` 可选，但每个选中 lens 的盲区必须有
    「配对 / 本题不 material / 单镜风险已接受」三选一，缺 = MAJOR。
  - method-library 保持四字段；**同名条目不再覆盖 lens**；单场自定义视角写
    `topics.md` 的 `custom:<名>`（不落目录），同一自定义面 ≥2 run 才评估出厂化。
  - 题型默认集按成本收紧：P2 2 个、P4 2 个、P6 3 个（v1 是 3/3/4）。
  - 计划卡「默认隐、偏离显」：默认集不上卡，偏离才写 `视角：+X`（实测卡 171/183/200 字，
    上限 200）。
- **必读增量**：
  - v2 正文：[2026-11-10-lens-as-data.md](2026-11-10-lens-as-data.md)（五件：结论+锚点 /
    备选与否决 / decision table / pilot / 什么会改变结论）。
  - 目录草案：[2026-11-10-lens-catalog-draft.md](2026-11-10-lens-catalog-draft.md)（8 条面 +
    配对图 + 文件格式）。
  - `presets/lead/skills/question-patterns/SKILL.md`（P1–P8 分派结论；默认集要落这里）
  - `presets/lead/skills/research-brief/SKILL.md`（HITL1 方法行 + 200 字卡）
  - `content/manual.md` §证据文件契约/信源分级（现七字段 → 八字段）§完成判据
  - `content/templates/run/{topics,evidence-entry,findings,final}.md`
  - `research-workspace/method-library.md`（四字段实例）
  - `src/lib/method-of-question.ts`（只读方法节三字段，加「本次视角」不改五态）
  - `content/templates/run/question.md`（§研究方法 / §HITL1 Snapshot）
- **读取面 / 门 / 落点**：
  - review 终局块与覆盖检查 = `presets/critic/skills/adversarial-review/SKILL.md` +
    `content/manual.md` §交付/审查终局；
  - evidence/topics 机械门 = `scripts/run-gates/evidence-audit.mjs` / `schema-scan.mjs`；**已实测**
    带 `lens`/`lenses:` 的 fixture 不改契约判定（extra key 被 `splitFrontmatter` 收下但不判；
    schema-scan 只查在场）；
  - 驾驶舱当前只读 plan/task/run，**不读 evidence/topics frontmatter**；v1 覆盖表由 critic/Lead
    填，cockpit 接入是后续；
  - lens 目录提议 `content/lenses/<id>.md`（未建）；`package.json` 的 `files` 已含 `content/**`；
    路径用 `{{research_pack_root}}/content/lenses/`（`src/content/index.ts:52-70` 注册）；
  - method-editor 契约 = `presets/method-editor/skills/method-interview/SKILL.md` +
    `presets/method-editor.patch.yml`（v1 不动四字段）。
- **外部证据（2026-11-10 核过）**：
  - STORM paper（Table 3/5：86.26 vs 84.49、92.73 vs 92.39、99.83 vs 54.36）:
    https://arxiv.org/abs/2402.14207 ；代码默认 3、无去重：`persona_generator.py` 的
    `max_num_persona: int = 3`；
  - persona 空结果（162 角色 × 4 模型族 × 2,410 题）:
    https://aclanthology.org/2024.findings-emnlp.888/ ；
  - persona 跟进（9 LLM × 27 任务，不相关细节 ≈ −30pp）:
    https://aclanthology.org/2025.emnlp-main.1364/ ；
  - Anthropic 工程篇（90.2% / 15× / 重复工作例）:
    https://www.anthropic.com/engineering/multi-agent-research-system ；
  - Anthropic 2026 研究篇（低方差 / prescriptive roles 无大差别 / hidden profile）:
    https://www.anthropic.com/research/multiagent-systems ；
  - Co-STORM（mind map 未覆盖信息）: https://arxiv.org/abs/2408.15232 ；
  - Elicit pre-run Setup 页:
    https://support.elicit.com/en/articles/14759154-systematic-reviews-in-elicit ；
  - GPTR 类型枚举: https://raw.githubusercontent.com/assafelovic/gpt-researcher/master/gpt_researcher/utils/enum.py 。
- **未决（实施前探针，不是设计未决）**：
  1. workflow child 是否继承 host 级 manual + `research_pack_root`（读不到就内联全文）；
  2. 计划卡「视角：+X」能否压进 200 字（用 `plan-card-stats.mjs` 口径实测）；
  3. critic 能否只凭文件填满覆盖表（fixture 试跑）；
  4. lens 目录 test 的红例（缺节/坏 pair/「你是」）先写红。
- **完成判据**：8 条 lens 草案（含 seek / verify / frame / refuse / bias / blind_spots /
  pairs_with）+ 题型×lens 矩阵 + evidence 字段改动计划 + 一场 run 试点。前 3 项已在本目录
  完成；试点 = 实现卡 §验收标准 的 pilot 项（未跑，属「待执行」，不是上下文阻塞）。
- **共享底座**：见 [../README.md](../README.md) 的「共享上下文（所有方向必读）」节。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-lens-as-data.md](2026-11-10-lens-as-data.md) | v2 深挖：九字段、住层、选择/组合、覆盖判据、备选、decision table、pilot、什么会改变结论 | 2026-11-10 |
| [2026-11-10-lens-catalog-draft.md](2026-11-10-lens-catalog-draft.md) | 8 条出厂 lens 草案（九字段）+ 配对图 + 文件格式/目录 test 硬约束 | 2026-11-10 |
