# 30 · 方法论映射：codex Deep Research harness 内核 → DSH 载体

> 层：设计（为什么）。这是 [evaluation.md](../evaluation.md) L3 领域面的核心载体：
> 读完去哪：角色内容与信噪比防线落点 = [20](./20-roles.md)；观察面构成 = [40](./40-research-cockpit.md)。
> 生命周期每一环节在本插件的落点，或带证据的弃用理由。考古来源 =
> [deep-research-harness-analysis（考古报告）](../../notes/implemented/2026-09-24-deep-research-harness-analysis.md)
> （codex harness 11-phase 生命周期 / wave 语义 / gate 体系 / 证据四层 / 8 条实证教训）。
> 原则（用户定案 + company D13）：**不发明**——codex 因宿主缺原语自建的机制，在 DSH 上
> 一律换原生载体；每个自建残留须有"DSH 载体不可用"的证据。

## 1. 生命周期映射表（L3 判据 1）

| codex 环节 | codex 载体 | 本插件 DSH 载体 | 状态 |
|---|---|---|---|
| instantiation（建 run bundle） | `instantiate-run-bundle.mjs` CLI + rb_* 控制文件脚手架 | lead 收到请求 → 建 `drt_<slug>/`（从 templates/run/ 起步）+ question.md（定稿 + Purpose/RQ 分解/Scope/Constraints 四节 + Decisions append-only） | 照搬语义，载体 = 目录约定 + 研究手册 |
| **HITL1（立项对齐）** | hitl1 phase（stop:yes）+ rb_profile 写入 | lead preset 的 `tool-ask-user` + `research-brief` skill（研究类型三分 + 澄清三问带推荐 + **计划确认卡**〔两段卡第二段：定稿先呈再开工，quick_factual 豁免——超出 codex 源面的本仓扩展〕） | **原生**（ask_user_question 即 DSH 的 stop 面） |
| setup / seed-topics | enter-phase + operate-topic-state（UID/ordinal 物化） | lead 写 topics.md（must_answer 问题列表 2–5 问 + scope_role + depends_on） | 简化：topic 身份 = markdown 锚点，不建 registry 机制 |
| **wave0（广度地基）** | dpt-source-intake 工作单元 + source.yaml + floor 门禁 | **scout 角色**（lead-mapping skill：query 多样化 + A–D 分级 + leads.md） | **角色化**（floor 数值门禁弃用，分级与排除显式化承担质量下限） |
| **wave1（深度挖掘）** | question-list 契约 + depth-review + 反例/交叉验证参数 | **analyst 角色**（evidence-extraction skill：question-list + 交叉验证 ≥2 + 反例必记） | **角色化**（深度参数不进 profile，进 skill 纪律） |
| **wave2（综合）** | 纯综合禁新搜 → finding gap 定向补搜 + finding-index | **lead 的 synthesis skill**（findings.md 的 gap 四态：supported/needs_search/contradicted/insufficient） | **skill 化**（只补一轮 = 参数纪律进 skill 文本） |
| **hitl2（审阅）** | hitl2 phase（stop:yes）+ composition_handoff | lead 的 `tool-ask-user`（审阅建议 = 证据充分性判断 + 交付/补研究推荐） | **原生** |
| readiness（确定性预检） | readiness phase + 10 gate definition JSON | **critic 角色**（adversarial-review skill：readiness 判据清单 + review.md 的 PASS/FAIL） | **角色化**（确定性 schema 检查降格为 skill 清单——诚实取舍，见 §4 之 3） |
| final（交付） | final/final.md + presentation 反馈 | final.md + `tool-present`（lead preset 独有声明权） | **原生** |
| rerun（重跑） | ReopenResearchPass + rerun_count 血统 | 同 bundle 版本演进（D17）：证据扩张 → `final/` 下一版（表述修订 polish 原位改、版本号不变；结构性另起才开新 bundle，sibling 预检）+ question.md `## Decisions` append-only 修订记录（delta 类型/受影响 topics/agent interpretation/用户原话 verbatim，最新在上） | 简化：不做血统机制，final/ 版本化 + Decisions/journal 记录承担 |

**两点交互纪律**（codex "静默自律" spec 的移植）：HITL1 与 HITL2 之间所有角色静默自主
推进，不问"要不要继续"、不汇报中间进度；用户主动发消息直接回答但不改变既定方向——
写进[研究手册](../../research-workspace/AGENTS.md) §交互纪律。

## 2. 弃用清单（codex 特定 → 为什么弃 + DSH 原生等价物）

| codex 自建机制 | 为什么在 codex 存在 | DSH 原生等价物（弃用依据） |
|---|---|---|
| markdown 控制面（phase node + manifest + transitions.chain） | codex 无会话内状态载体 | preset persona + skill（组合即控制面）；goal 系统（跨轮目标） |
| CLI 文件状态机（enter-phase/advance-status/queue/work-unit 操作） | 宿主无调度原语 | agent-team 任务板（spawn_teammate/派活/收活）+ todo_write（轮内任务面） |
| rb_status/rb_trace 审计流 | 需要 append-only 证据链对抗伪造 | 会话日志即真相（DSH event-sourced；DSH 研发流程研究 §一之 4 同哲学）；关键交接落 run bundle（drt_<slug>/）文件 |
| work-unit ledger / dry-submit→submit 两阶段 / receipt_nonce | 委派完整性（防提交漂移） | DSH subagent 生命周期 + 团队任务板状态；提交前验证降格为 critic 狩猎（§4 之 2） |
| queue.json P0–P6 手工调度 | 无队列原语 | agent-team 任务板 + topics.md 单 owner 纪律 |
| 五反馈面（attempt_disposition/recovery_action）| 工作单元恢复需要结构化反馈 | DSH 会话原生错误反馈 + steer；不重建恢复词汇表 |

## 3. 自建残留（唯一保留：证据身份链）

**为什么唯一**：DSH 没有任何载体承载"研究报告的结论 → 来源文件"的可核查链——web_search
的返回不落盘、会话日志可读但不是角色间契约面。研究手册的证据 frontmatter 契约
（`source_url / retrieved_at / quality / found_by / supports / source_tier / publisher`——七字段）+ **口径最小契约**（数字/
规格类摘录带测量条件 ≥2 项；单源关键数字显式标"待破"）+ final.md 的
`[来源: evidence/xx.md]` 引用格式 + critic 的逐条狩猎 = 轻量等价物：

- codex 教训 1（"LLM 会伪造看起来完成的产物"）→ 我们的等价防线：完成判定锚定**文件事实**
  （final.md 存在 + 引用链真实），critic 按文件对照不采信口头保证；
- codex 教训 7（结构检查与语义审查分权）→ readiness 的确定性部分我们降格为 skill 清单
  （诚实代价，见下），语义部分归 critic + HITL2；
- 不做 CLI 引擎、不做 ledger、不做 gate JSON——**文件契约 + 角色纪律**承担，伪造的
  发现权在 critic（对抗角色）而非机械门禁。

## 4. 诚实取舍账（弱化了什么，靠什么补）

1. **floor 数值门禁弃用**（wave0 每题源数下限等）：参数化质量下限换成 skill 纪律文本，
   失去机械强制性。补偿：critic 的 readiness 判据清单含"关键结论证据 ≥ A/B 级"硬项；
   多场 run 实证 critic 散文审查无滑坡（数值 floor 有假绿风险）——**维持**；
   其机械核验范围为 source_url 成功抓取、摘录对 web 语料的覆盖率、final 引用链；`retrieved_at` 只核字段在场，不校准日期。日期质量与摘录结构仍由 critic 按研究手册契约审阅；
   重议须同时出现质量下降与 evidence-audit 证据不足，详见[裁决](../../notes/rejected/2026-09-24-floor-gates.md)。
2. **提交前验证降格**：codex 的 dry-submit schema 校验换成 critic 狩猎。代价：critic 也
   是 LLM，可能漏。补偿：readiness 判据清单逐条勾选格式 + lead 的 veto 纪律。
3. **确定性 readiness 降格为语义审查**：失去"纯结构、零语义"的预检层。补偿：模板文件
   结构固定（templates/run/），偏差在 critic 审查线上可见。

## 5. 精神内核的直接移植（不改载体只改措辞的）

来自考古报告 §8 的 8 条教训，逐条落点：

| 教训 | 落点 |
|---|---|
| 完成判定锚定文件事实而非账本外观（codex 教训 1 的反转落地；D5） | 研究手册 §完成判据（verify the world 三条） |
| repair_kind 责任分派 | 角色 owner 表 + veto 纪律（谁处置什么，无死路） |
| 先写持久状态再问人 | HITL1 对齐快照写进 question.md（先落盘后推进） |
| margin ≠ threshold | 质量下限（A/B 支撑关键结论）与搜索策略（补搜一轮）分层在 skill |
| 同目标写冲突显式拒绝 | topics/文件单 owner 表（手册 §事实的 owner） |
| 结构检查与语义审查分权 | critic 三线审查 vs HITL2 人类语义审阅 |
| gate 结果只信 JSON 不信 prose | review.md 固定格式（readiness: PASS + 判据勾选清单）+ **口径纪律**（数字带测量条件、单源标"待破"——"只信机器可判事实"的数据版） |
| retry 上限防疲劳循环 | 补搜只一轮、澄清只三问、gap 定向补搜纪律 |

## 6. 与 L3 四判据的对账

| evaluation.md L3 判据 | 本文落点 |
|---|---|
| 1. 生命周期映射完整 | §1 表的每个环节都有落点或弃用理由 |
| 2. 角色单一职责 | 20-roles §0 owner 表 + 手册 owner 全表 |
| 3. 证据可追溯载体 | §3 证据身份链（frontmatter + 引用格式 + 狩猎） |
| 4. 信噪比策略显式 | 20-roles §3 四道防线 |
