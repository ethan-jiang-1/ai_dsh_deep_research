# DEEP_RESEARCH_HARNESS 方法论考古报告
> 状态：implemented

<!-- grandfather: 调研报告形态（状态表），非 Note 骨架——内容有效不追改。原状态行：**已完成** · 2026-09-24 · 方法论源头的考古报告；落点 = design/30。 -->



> 归档注（2026-09-24）：本文为 R1 搭建前的消化产物（委派子代理对
> `/Users/bowhead/ai_tool_deepresearch/DEEP_RESEARCH_HARNESS/` 的考古）。吸收落点 =
> `docs/design/30-methodology-mapping.md`（生命周期映射表 §1 / 弃用清单 §2 / 教训落点 §5）。
> 原始出处与证据分级见文内引注。

> 依据：workflows/manifest.json、workflows/transitions.chain.json、workflows/nodes/（instantiation/hitl1/hitl2/wave0/wave1/wave2/readiness/final node）、schema/gate_definitions/（gate-hitl1-recorded、gate-wave1-complete 全文）、schema/contracts/（plan/profile/status/queue.mjs）、command_playbook/（start-research、setup-real-subagents、work-unit-actor-decision）、cli/ 目录清单。注：rb_templates/ 与 shared-*.md 的直接读取被环境拒绝，其内容经 contracts 与各 node 引用交叉复原。

## 1. 研究生命周期全景

manifest.json 定义 11 phase，transitions.chain.json 定义 gate 转移链：`instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness → final`；hitl2 另有 `rerun → 回 seed-topics` 分支（rerun_count 递增）。

| Phase | 输入→输出（职责） | Gate | stop |
|---|---|---|---|
| instantiation | 用户问题 → `dpt_rb_<slug>` bundle（5 个 rb_* 控制文件 + `seed_topics/ reference/ artifacts/ final/ _cache/` 脚手架），只能经 `instantiate-run-bundle.mjs` 创建 | instantiation-complete | no |
| hitl1 | 一句话问题 → topic rewrite（写 `rb_plan.md## Goal`）+ 最小 topic map + research_profile（quick_factual/exploratory_map/claim_verification）+ root_must_answer_set + 可选 User Research Controls；外加 research_access 直接取样探测（gov.cn/gitee/xinhuanet vs wikipedia/github/iana/arxiv 固定样本） | hitl1-recorded | yes |
| setup | bundle → 可执行运行面 | setup-ready | no |
| seed-topics | topic registry → `seed_topics/{slug}.md`（经 `operate-topic-state apply`，Engine 分配不可变 UID/ordinal/slug `NN_名`） | seed-topics-ready | no |
| wave0 | seed topics → 每 topic 基础源元数据 | wave0-complete | no |
| wave1 | wave0 产出 → 每 topic 深挖证据 | wave1-complete | no |
| wave2 | wave1 产出 → 跨 topic 综合 | wave2-complete | no |
| hitl2 | 三波产物 → 证据充分性审查 + 交付 composition 决定（decision-brief + composition_handoff） | hitl2-recorded | yes |
| readiness | 全部产物 → 纯确定性结构预检（显式声明不做语义质量判断，语义归 HITL2） | readiness-passed | no |
| rerun | HITL2 决定 → 按 `## Decisions > Rerun intent revision: N` + seed 的`本轮重跑方向`（rerun_count 匹配当前 profile 才生效）回注 | rerun-ready | no |
| final | readiness → `final/final.md` 发布；此后仅 presentation 打磨（--polish），新证据才走 ReopenResearchPass | 无（terminal） | yes |

**HITL 语义**：HITL1 = 前置对齐（研究什么、什么风格、能否访问源）；HITL2 = 后置审查（证据够不够 + 报告为谁/为何/以何 view 组织）。二者是仅有的 `stop: yes` 交互点；其余 phase 静默自主推进（失败走结构化修复，不浮出提问）。双 loader 分权：`enter-phase` 只加载下一 node（写 current_node），`advance-status` 只同步 source-gate 窗口，二者都不证明目标 phase 完成。

## 2. Wave 结构语义

- **wave0（广度/地基）**：`dpt-source-intake` 为每 topic 写 `artifacts/wave0/{topic}/source.yaml`（ReferenceMetadata）；floor 来自 profile 的 `wave0_per_topic_source_floor`/`wave0_shared_ref_total`；Phase Agent 事后从 submitted backing 物化共享参考 `reference/00-shared-*.md`。
- **wave1（深度）**：`dpt-evidence-extractor` 写 `evidence-summary.md` + `question-list.md`（固定四节：Topic Investigation Targets / Question Reconciliation / Emergent Question Protocol / Exploration-Exploration Decision）+ `depth-review.yaml`；新源 floor（`wave1_per_topic_ref_floor`、`topic_unique_ratio`），Wave0 URL 只算上下文不算新证据；须覆盖 mechanism / trend / limitation-dispute 维度及 `counterexample_search`/`cross_verification`。
- **wave2（综合）**：先纯综合（synthesis 任务内禁止新搜索）产出 `synthesis.md`/`cross-topic-ledger.md`/`finding-index.yaml`（W2F-xxx finding 带 gap_status），再仅对 `needs_search` 的 finding 派 targeted evidence work unit；参数含 `wave2_cross_topic_depth`、`wave2_emergent_search_rounds`。

**派活回路**：Phase Agent 写 queue demand card（queue_item_id / kind / producer_rule / priority_class P0–P6 / task_brief / writes_to / required_receipts / verification.engine+agent / done_condition / failure_route）→ `operate-work-unit claim`（`claim_count = min(独立需求, delegated_concurrency_cap 默认12, 剩余容量)`；同目标写冲突被 `wave0_source_target_conflict` 显式拒绝）→ 子代理读 task.md/_beacon.json/result.schema.json 产出 → **dry-submit 结构化违规修复循环** → formal submit 写入 ledger → `timeout-preflight` 的 `recommended_action`（submit/repair/wait/inspect/block/timeout，配 recommendation_basis: candidate/progress/lease/integrity）决定终态（fail/timeout/abandon/replace）。actor 决策（work-unit-actor-decision.md）：inspect 队首角色 → 一次真实 native probe → 带 observation（available/unavailable/unknown）claim；probe 失败才 `phase_agent_fallback` 且只 claim 1 个。

## 3. Gate 体系

10 个 gate 定义于 `schema/gate_definitions/gate-*.definition.json`。结构：`{gate, description, rules[]}`；每条 rule：`id`、`check`（file_exists/dir_exists/count_floor/pattern_match/semantic_sections/trace_event_present/cache_coverage/work_unit_ledger_exists/work_unit_output_coverage/delegated_bypass_suspected/phase_queue_drained/depth_review_contract/reference_format/reference_index_coverage/ledger_coverage…）、`target`（支持 `{topic}` 模板展开）、`threshold`+`threshold_source`（如 `rb_profile.yaml#/research_style_params/wave1_per_topic_ref_floor`，阈值永不硬编码）、`failure_message`、`finding{source: definition|checker, blocking_basis: required_structure|required_floor|recorded_human_decision|binding_integrity|authority_integrity}`、`repair{kind, write_to}`、`degradation_eligible`。

`repair_kind` 五类：agent_action（修授权文件）/ engine_operation（只能跑指定 CLI，禁手改 status/trace/ledger/hash）/ user_decision（仅 HITL owner 可决）/ external_action / missing_contract（暴露边界，不发明替代路径）。hitl1-recorded 展示 recorded_human_decision 类规则（research_profile≠not_selected、must_answer 非空、hitl1.status=recorded、status 窗口绑定）；wave1-complete 展示 floor+provenance 类（per_topic_ref_md_count_floor、ledger_coverage、question_list_has_four_sections、source_url_present、no_example_com_ref_url 反占位、delegated_bypass_suspected）。`degradation_eligible` 的 floor 未达标可 degraded pass，但携带 `degraded_rules` 质量债显式记账。

## 4. 证据管理

四层金字塔：`_cache/waveN/primary/{topic}/` 叶子缓存 → `artifacts/` 原始产物 → `reference/` 消费者投影（`00-shared-*` 共享、`{topic}-{source}` 每题、`00-cross-*` 跨题）→ wave2 finding-index。reference 文件强制 8 字段 metadata block + 可解析 source_url + `_INDEX.md` 行（`source_layer: wave0_shared/wave1_topic`）+ 经 `operate-artifact-persistence persist`（staging→committed|blocked）后 `sync-reference-index`。可追溯性靠 work-unit 身份链：claim 的 work_id/receipt_nonce → schema 校验的 result.json → submit ledger 行 → 投影文件体内携带 `<work_id>/<ordinal>` 提交坐标。**孤儿文件不算 coverage**：无 submitted backing 的 artifacts 被 `delegated_bypass_suspected` 抓获；不能用 URL 相等或裸 work ID 反选 backing。

## 5. run bundle 控制文件

- **rb_plan.md**：frontmatter `topic_registry`（topic_uid / slug `NN_名` / must_answer / scope_role `primary|synthesis|comparison|supporting` / depends_on_topic_uids / previous_layouts）+ 正文 `## Goal`（Purpose/Research Questions/Scope/HITL1 Alignment Snapshot）、`## Constraints > User Research Controls`（不可变 HITL1 基线）、`## Decisions > Rerun intent revision: N`。
- **rb_profile.yaml**：research_profile、root_must_answer_set、research_access（直接取样观测）、research_style_params（各波 floor/unique_ratio/反例/交叉验证/quality tier）、delegated_concurrency_cap、rerun_count、human_decision_checkpoints（hitl1/hitl2 的 status/user_decision/composition_handoff——reader.familiarity、intended_use、primary_focus、foreground+compress 优先级、delivery{language BCP47/length/evidence_exposure/appendix}）。
- **rb_status.json**：current_mode=execution、state、current_gate/next_gate 窗口、current_node（唯一 phase 加载坐标）。
- **rb_queue.json**：queue.v2；active_window（≤20）/refill_pool/delegated_in_flight 三段 + demand item 全字段。
- **rb_trace.jsonl**：逐事件审计流（phase START/END、gate_attempt.passed、silent_degradation、waveN_completion、readiness_check）。
- **rb_output_declarations.jsonl**：Engine 在首次成功 submit 惰性创建的 work-unit ledger。

## 6. 质量机制

cli/ 下：`validate-bundle`（schema）、`inspect-bundle`（结构）、**`audit-phase-status`**（完整性审计，输出 premature_final_present / plan_progress_tamper_suspected / status_drift / manual_bypass_suspected / missing_witness / failed_gate_downstream_status；宣告"研究完成"必须 terminal status + integrity passed 双事实）、`inspect-wave0/1/2-output`（无副作用 gate 前收敛检查，先于 gate）、`validate-phase-templates/playbook/workflow-package/work-unit-hygiene`（框架自身回归）。

## 7. 可移植方法论 vs codex 特定机制

**方法论本质（任何 deep research 系统都该有，DSH 重建时保留）**：
1. 生命周期分解：对齐(HITL1)→广度→深度→综合→审查(HITL2)→确定性预检→交付，两个语义清晰的 HITL 锚点；
2. topic 分解为带 must_answer/scope_role/依赖的显式图，而非扁平关键词；
3. 证据分层 + 身份链可追溯（每个消费级引用能回溯到一次提交的采集行为）；
4. 来源数量下限、unique_ratio、反例搜索、交叉验证作为**可调 profile 参数**而非硬编码；planning margin（预留抓取失败缓冲）与 gate threshold 严格分离；
5. 多轮搜索策略：wave0 地基 → wave1 深挖（question-list 驱动 emergent questions + exploration/exploitation 决策记录）→ wave2 按 finding gap 定向补搜；
6. gate 式质量门：声明式规则、阈值引用 profile、repair_kind 责任分派、degradation_eligible 质量债；
7. 反伪造机制：反占位 URL 检查、snippet≠evidence、孤儿产物≠coverage、bypass 检测、完成宣告需审计事实；
8. rerun 的 reuse/new/supplement 分类 + rerun_count 绑定方向（既不重复劳动也不让过期指令泄漏）；
9. HITL 决策持久化：先写 pending_user 再提问；推荐先行（完整默认 + 快捷选项，只在 ≥2 取值实质改变交付时才追问）；
10. composition handoff 作为显式契约（读者/用途/前景化/语言/证据暴露度）而非自然语言氛围。

**codex 特定（因宿主无原生调度而自建，DSH 用原生机制替换）**：
1. **markdown 控制面**：phase node .md + manifest.json + transitions.chain.json 文件路由 → DSH 用 skill/goal phase 原生表达；
2. **CLI 引擎**（instantiate/enter-phase/advance-status/operate-queue/operate-work-unit/operate-topic-state/gates/check-*）：用文件状态机仿真调度器 → DSH 有原生 subagent/goal/团队机制；
3. **run bundle 文件树 + rb_* 控制文件 + _beacon.json**：为无状态会话做的崩溃恢复持久化 → DSH 可用 goal 状态 + 精简文件面；
4. **work-unit ledger / receipt_nonce / dry-submit→submit 两阶段提交 / supersession 血缘**：仿真事务编排 → DSH subagent 原生生命周期可承担调度，但**提交前验证与 provenance ledger 仍值得保留**；
5. **queue.json P0–P6 优先级调度**：手工调度器 → 原生任务队列替代；
6. **.claude/agents/*.md + .codex/agents/*.toml 生成 6 个角色代理**（"DPT managed" 标记防覆盖）→ DSH 原生 agent-team 角色；
7. **actor probe / phase_agent_fallback**（因宿主子代理可用性不确定）→ DSH 子代理可靠，可简化为直接派发 + 单一降级路径。

## 8. 最有价值的设计教训（实证注释提炼）

1. **LLM 会伪造"看起来完成"的产物**：no_example_com_ref_url、orphan source.yaml 不算 coverage、premature_final_present（提前写 final 会阻断所有 wave gate）——完成判定必须锚定提交账本而非文件系统外观。
2. **repair_kind 分派责任，stop 决定交互位置**：`stop: no` phase 里任何失败都不得转化为向用户提问；可静默降级的（如 bundle 名冲突→hex6 后缀）记 silent_degradation 日志继续走，不可降级的保持 failed checkpoint。混谈两者会破坏自主性边界。
3. **先写持久状态再问人**：HITL2 展示 prompt 前必须落 `hitl2.status: pending_user`，崩溃恢复才能知道"用户还没答"。
4. **margin ≠ threshold**：为抓取失败预留的规划缓冲不得侵蚀 gate floor，也不得发明 profile 外的新阈值——质量下限与规划启发式必须分层。
5. **同目标写冲突要显式拒绝**（wave0_source_target_conflict + named owner）：两个并行代理写同一 source.yaml 的竞态靠目标级所有权而非事后合并解决。
6. **dry-submit → formal submit 两阶段**：先结构化验证再提交，提交被拒时回 dry-submit checkpoint 而非换身份重试；mutable fact drift 在提交口被拦截。
7. **结构检查与语义审查分权**：readiness 只做确定性结构校验，语义质量归 HITL2 人类——避免机器 gate 越权做内容判断，也避免人类被结构琐事打扰。
8. **gate 结果只信 JSON 不信 prose**（"禁止把 gate console confidence 当作 verdict"）+ retry 上限防疲劳循环（默认 3 次，--attempt N 递增报告）——所有跨 agent 边界的判定必须机器可读。

**给 DSH 重建的一句话总结**：保留"两 HITL 锚点 + 三波研究 + 证据身份链 + 声明式质量门 + 反伪造审计"的方法论内核；把 markdown 状态机、CLI 编排、手工队列与 ledger 替换为原生 subagent/goal/skill 机制，但把 provenance（提交前验证 + 产物-来源绑定）作为唯一必须自建的残留物。
