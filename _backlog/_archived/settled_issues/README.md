# settled_issues/ · 已有结论的问题

结论已形成并已按卡片关闭条件处理的问题卡。这里记录问题讨论历史，不表示相应实现已通过交付验收；实施证据仍由卡上指向的下游记录负责。

| 卡 | 结论与去向 | 日期 |
|---|---|---|
| [2026-10-28-method-library-cocreation](2026-10-28-method-library-cocreation.md) | 方法库页内共创：三栏 + 方法编辑 preset/草稿回填/保存闭环；真模型 probe + release-smoke + l4-lite 全绿；[调研 §14](../research/method-library-cocreation/2026-10-28-dsh-session-and-surface-internals.md) | 2026-10-28 |
| [2026-10-28-data-plane-hardening](2026-10-28-data-plane-hardening.md) | FAQ 24 数据面收口：D32 原生时钟 + D33 整数契约/创建日 + D34 回执三态/可移植列 + D35 种子三态 + D36 见证边界；自审补 `epochDateOf` 见证下界回归；四角色真模型重录后 snapshot ALL PASS；P2 与 W/D 同路径转触发器；[Note](../../../notes/implemented/2026-10-28-data-plane-hardening.md) | 2026-10-28 |
| [2026-10-27-post-review-hardening](2026-10-27-post-review-hardening.md) | 复核后硬化：run-accept 全链 smoke、数据卡形状、秘密模式扩展；P2.4/P2.5/P3 转触发器 | 2026-10-27 |
| [2026-10-27-release-data-contract](2026-10-27-release-data-contract.md) | 发布前数据契约：FAQ 26 对账 → 数据卡 + 回执相对路径 + 种子 schema/`--clean` + N2 披露 + secret-scan；D1–D4 全采纳；[Note](../../../notes/implemented/2026-10-27-release-data-contract.md) | 2026-10-27 |
| [2026-10-25-run-form-contract](2026-10-25-run-form-contract.md) | 运行形态合同：M1/M2/M3、P/H/W、A+B、per-user、升级/移交/证据矩阵；[guides/65](../../../docs/guides/65-run-forms.md) + [Note](../../../notes/implemented/2026-10-25-run-form-contract.md) | 2026-10-25 |
| [2026-10-25-distribution-contract](2026-10-25-distribution-contract.md) | `engines.dsh` + 团队层钉版 + Node/preflight + 升级/离线/校验和 + 冷启动安装证据；残余见卡 | 2026-10-25 |
| [2026-10-25-workspace-ownership-and-upgrade](2026-10-25-workspace-ownership-and-upgrade.md) | seed.json + `--check/--upgrade` + 方法库保护；残余见卡 | 2026-10-25 |
| [2026-10-25-runtime-data-boundary](2026-10-25-runtime-data-boundary.md) | `dev-runtime-clean` + 可配置数据根 + clean handoff + 两实例；残余见卡 | 2026-10-25 |
| [2026-10-25-standalone-cold-start](2026-10-25-standalone-cold-start.md) | bootstrap + 冷启动 smoke + 两实例 + pack 目录 + 平台/离线；残余见卡 | 2026-10-25 |
| [2026-10-23-readable-final-process](2026-10-23-readable-final-process.md) | 可读终稿流程位：Lead 在 review PASS 后、HITL2 前写 `final/readable.md` → `readable-vN.md`；门C 同版/六节/长度/链接；回执 reader 哈希；终稿页签地址族/双视图；真实 run 全链绿、769 测试；[Note](../../../notes/implemented/2026-10-23-reader-final.md) · [D29](../../../docs/decisions.md) | 2026-10-24 |
| [2026-10-23-run-final-human-readable](2026-10-23-run-final-human-readable.md) | 读者版内容合同：六节、1–3 页、不新增事实/来源、正文无 `[来源:]`/`evidence/`；真实 reader 2,664 字/57 行；用户选择 A 收口；[Note](../../../notes/implemented/2026-10-23-reader-final.md) | 2026-10-24 |
| [2026-10-23-rerun-dissatisfaction-triage](2026-10-23-rerun-dissatisfaction-triage.md) | rerun 不满转接层：L1 `rerun-triage` skill（七类说法→四手段+代价+不变项+五纪律）、L2 HITL2 三选项带后果 + 报告末节两节、L3 状态页⑤/终稿页脚只读折叠块（共用 src/lib 文案）；同批修 persona 交付语义回 final/vN；719 测试 + 四角色重录 + 真模型探针五条全中；[Note](../../../notes/implemented/2026-10-23-rerun-triage-layer.md) | 2026-10-23 |
| [2026-10-23-d28-witness-binding-and-receipts](2026-10-23-d28-witness-binding-and-receipts.md) | D28 落地缺口收口：门③见证绑定 run（写强绑定 + 契约纪元 + present≥HITL2）、回执哈希由门A 复算、run-accept 与 hygiene 分域、手册 final/vN = 交付副本、门④ 不再要 v1 活索引；P0–P3 + 四角色重录，708 测试绿；[RFC 修订](../../../notes/implemented/2026-10-23-run-bundle-charter.md) | 2026-10-23 |
| [2026-10-23-run-bundle-agent-state-and-read-chain](2026-10-23-run-bundle-agent-state-and-read-chain.md) | run bundle 宪章：D28 位置=操作桶、run.md/epoch、presented/user-question-reply 交付链、provenance/manifest、观察只读；P0–P7 落地、P8 收口（正式 lead 盲测 UNATTESTED）；[implemented RFC](../../../notes/implemented/2026-10-23-run-bundle-charter.md) | 2026-10-23 |
| [2026-10-23-rerun-versioned-graph](2026-10-23-rerun-versioned-graph.md) | rerun 版本面：`plan/vN` 快照 + `图版本` 交叉校验 + `> rerun:` 声明 + `RunVersionFace` + 终稿页默认版本账 + 图谱版本轨/最小 diff；受控 v1→v2 E2E 全绿；[Note](../../../notes/implemented/2026-10-23-rerun-version-face.md) | 2026-10-23 |
| [2026-10-19-final-tab-in-sidebar](2026-10-19-final-tab-in-sidebar.md) | 右栏「终稿」：接管 `drt_<slug>/final.md` 的文件地址（`extension` 带）——交付那一刻自动打开一次，⑤ 交付门做回程；`present` 成为交付判据（`final.md` 在场只算"可审"）；三位置回退读；构成正本同 diff 更新；自动打开接线的端到端留待下一场真实 run | 2026-10-20 |
| [2026-10-19-discipline-map-semantic-drift](2026-10-19-discipline-map-semantic-drift.md) | 9 行失真逐条裁决（2 条补门禁被否、改归类/改措辞）+ 新增门禁 `discipline-state-vocab`；两笔遗留：`owns` 截断改存引用锚点、语料基线漂移登记待更新；[Note](../../../notes/implemented/2026-10-19-discipline-map-semantic-drift.md) | 2026-10-19 |
| [2026-09-28-retire-roadmap](2026-09-28-retire-roadmap.md) | 退役 roadmap；[backlog deliberation Note](../../../notes/implemented/2026-09-28-backlog-deliberation-space.md) | 2026-09-28 |
| [2026-09-28-node-io-schema](2026-09-28-node-io-schema.md) | 节点 I/O schema；[Note](../../../notes/archived/2026-09-28-node-io-schema.md) | 2026-09-29 |
| [2026-09-28-hitl2-scope-round](2026-09-28-hitl2-scope-round.md) | 暂缓 HITL2 条件范围轮；复活条件按卡内记录 | 2026-09-29 |
| [2026-09-28-pipeline-polish](2026-09-28-pipeline-polish.md) | 多轮 polish 按分面收口，后续缺口分别有 owner | 2026-10-04 |
| [2026-09-29-dispatch-distillation](2026-09-29-dispatch-distillation.md) | 调度蒸馏与模式库落地；[Note](../../../notes/implemented/2026-09-29-dispatch-distillation.md) | 2026-09-29 |
| [2026-10-02-mcp-client-adoption](2026-10-02-mcp-client-adoption.md) | MCP Playwright 采纳；[Note](../../../notes/implemented/2026-10-02-mcp-playwright-adoption.md) | 2026-10-02 |
| [2026-10-04-fresh-agent-doc-audit](2026-10-04-fresh-agent-doc-audit.md) | 入口文档审计和修复；[Note](../../../notes/implemented/2026-10-04-fresh-agent-doc-audit.md) | 2026-10-04 |
| [2026-10-04-leads-topic-shape](2026-10-04-leads-topic-shape.md) | 门 L 判据收敛；[Note](../../../notes/implemented/2026-10-04-gate-l-invariant.md) | 2026-10-04 |
| [2026-10-05-project-navigability-phase1](2026-10-05-project-navigability-phase1.md) | 项目可导航性第一阶段；[Note](../../../notes/implemented/2026-10-05-project-navigability-phase1.md) | 2026-10-05 |
| [2026-10-05-test-asset-organization](2026-10-05-test-asset-organization.md) | 测试资产组织方式；[Note](../../../notes/archived/2026-10-05-test-asset-organization.md) | 2026-10-05 |
| [2026-10-06-contract-drift](2026-10-06-contract-drift.md) | NODES 与 run playbook 合同对齐 | 2026-10-06 |
| [2026-10-06-oss-dr-lessons](2026-10-06-oss-dr-lessons.md) | 对标结论分档；[材料归档](../research/README.md) | 2026-10-06 |
| [2026-10-07-plan-review-gate](2026-10-07-plan-review-gate.md) | 评审门实施；[Note](../../../notes/implemented/2026-10-07-plan-review-gate.md) | 2026-10-07 |
| [2026-10-07-cockpit-dashboard-merge](2026-10-07-cockpit-dashboard-merge.md) | 暂不合并；观察触发条件见 [triggers](../../triggers.md) | 2026-10-07 |
| [2026-10-08-sdlc-reference-absorption](2026-10-08-sdlc-reference-absorption.md) | 采纳/适配结果见本卡与 [吸收 Note](../../../notes/implemented/2026-10-09-backlog-methodology-absorption.md) | 2026-10-08 |
| [2026-10-09-snapshots-adoption](2026-10-09-snapshots-adoption.md) | 首批四角色 replay 切片落地（含 BUG-018 修复与场景声明消费）；[Note](../../../notes/implemented/2026-10-09-snapshots-adoption.md) | 2026-10-09 |
| [2026-10-09-release-smoke-hardening](2026-10-09-release-smoke-hardening.md) | L2 安装面五件套补齐（形态 B + company 值；含 HEAD pack build 断链真债同修）；[Note](../../../notes/implemented/2026-10-09-release-smoke-hardening.md) | 2026-10-09 |
| [2026-10-09-layering-v2](2026-10-09-layering-v2.md) | layering 四件套 + 三活暴露面结构收口（TS 解析器移植）；[Note](../../../notes/implemented/2026-10-09-layering-v2.md) | 2026-10-09 |
| [2026-10-09-guard-red-record](2026-10-09-guard-red-record.md) | tests 面反证义务机械化（双址 + 留证二选一；存量 14 声明零豁免全留证）；[Note](../../../notes/implemented/2026-10-09-guard-red-record.md) | 2026-10-09 |
| [2026-10-10-egress-mode-probe](2026-10-10-egress-mode-probe.md) | egress 两态自适应 boot 已实施（#1–#3、#5 验收绿，实录在卡内；commit 4083724）；#4 B/C 态现场补证触发 = [triggers](../../triggers.md)；不另立 Note（去向见卡）；2026-10-13 机制整体拆除 = [网络零干预 Note](../../../notes/rejected/2026-10-13-network-vanilla-restore.md) | 2026-10-10 |
| [2026-10-09-member-activity-stream](2026-10-09-member-activity-stream.md) | 队员动作流 4/4 验收绿（2026-10-11 真实 run 首验：subagent follow 持久父地址 + smoke 正例环境 + 断言三修）；[Note](../../../notes/implemented/2026-10-11-member-activity-first-validation.md) | 2026-10-11 |
| [2026-10-11-executive-research-intake-brief](2026-10-11-executive-research-intake-brief.md) | HITL1 业务决策简报落地；真 run 三阶段核验 + 业务读者走查通过；结转 = 计划卡字数升硬门前置（连续 ≥3 场达标） | 2026-10-11 |
| [2026-10-11-executive-research-decision-report](2026-10-11-executive-research-decision-report.md) | 决策摘要首屏六段落地；真实 bundle 三门口 exit 0 + 走查通过；「不矛盾」判据按拍板降格人工判据 | 2026-10-11 |
| [2026-10-11-executive-research-ux-delivery](2026-10-11-executive-research-ux-delivery.md) | 驾驶舱业务摘要层与纠偏路径落地；真浏览器断言 + 构成正本 + 窄门 + 两面一致性核对；结转 = HITL 挂起态实录 waiting | 2026-10-11 |
| [2026-10-11-recovery-action-instrument-gap](2026-10-11-recovery-action-instrument-gap.md) | 文档承诺的恢复动作缺可复跑工具 → 落 `run-kickoff --session`（自带送达对账）+ 冒烟断言 + guides/61 步骤；类级触发登记 triggers.md | 2026-10-11 |
| [2026-10-12-backlog-process-borrow](2026-10-12-backlog-process-borrow.md) | backlog 制度显性化借鉴（loop_advisor @ b43be87）全套落地：入口两张票/缺陷通道含修复就绪自授权/双轨状态生命周期/agent 门牌/门禁收紧；[借鉴 Note](../../../notes/implemented/2026-10-12-backlog-process-borrow.md) | 2026-10-12 |
| [2026-10-12-research-preference-templates](2026-10-12-research-preference-templates.md) | 研究方法配置总卡：四预设 + HITL1 方法行 + run 方法节 + 用户方法库 + 右栏面板（D25）全部落地；快答/普通双 run 走查 + 库保存路径实证；[Note](../../../notes/implemented/2026-10-12-research-method-config.md) | 2026-10-12 |
| [2026-10-12-research-method-run-lifecycle](2026-10-12-research-method-run-lifecycle.md) | 单次闭环：快答全链 + 普通 run 方法节/方法行（session log 原文）；pending/queue/恢复语义实测与 playbook 一致；计划卡留用户 GUI 拍板体验 | 2026-10-12 |
| [2026-10-12-research-method-profile-management](2026-10-12-research-method-profile-management.md) | 长期复用：对话五动词 + 右栏面板 + 详情/分区编辑落地；库保存路径真实走查；期 2 直写 = 不做（暂），重议条件在卡 | 2026-10-12 |
| [2026-10-12-research-preference-detail-ux](2026-10-12-research-preference-detail-ux.md) | 偏好详情/分区编辑 UX（期 1.5）收结：四项用户任务实现 + keyless/browser/真模型走查证据全绿；UX 真人手感按用户拍板显性延后（有问题另开新卡）；[Note](../../../notes/implemented/2026-10-12-research-config-tab.md) | 2026-10-13 |
| [2026-10-15-terminal-readiness-line-form-tolerance](2026-10-15-terminal-readiness-line-form-tolerance.md) | 终局 readiness 窄放宽 (A) 落地：行首判定行的装饰变体读得出（假 FAIL 3 场 + 假 unknown 4 场归零、`null` 收敛到 1 场真无判定），不夺权负例与两侧同判齐备；[规则 Note 已改写](../../../notes/implemented/2026-10-11-review-readiness-terminal-rule.md) | 2026-10-16 |
| [2026-10-15-unclosed-bundles-disposition](2026-10-15-unclosed-bundles-disposition.md) | 未归档 bundle 处置执行完毕：新建 `research-workspace/_abandoned/` 停放位（手册 + 工作区 .gitignore 同 diff），A 类 4 场 + C 类 9 场 + 停摆 1 场共 14 场迁入，活动区清零；逐场缺口与复活条件在卡 | 2026-10-16 |
| [2026-10-16-structure-round3-convergence](2026-10-16-structure-round3-convergence.md) | 第三轮结构收敛全量交付：Phase A（frontmatter/zstd 收单一正本，stash A/B 零行为）· B1（web-harness 三站点）· **B2（五站点**，判定面 5/5 一致，含 client-hitl 既存红根因修复）· D（triggers 两行）；[Note](../../../notes/implemented/2026-10-16-structure-round3-harness-convergence.md) | 2026-10-16 |
| [2026-10-15-hitl-answer-and-test-surface-hardening](2026-10-15-hitl-answer-and-test-surface-hardening.md) | hitl-answer 三条硬化全部落地：侧栏扫描上限错因分离（零上限反证）· library「给用户的一句话」列级断言（漂移注入反证）· `--custom` 升格纯文本作答路径；另同文件修掉 `display:contents` 判据缺陷（client-hitl 既存红根因） | 2026-10-16 |
| [2026-10-18-research-method-preset-mapping](2026-10-18-research-method-preset-mapping.md) | 打法清单与判型映射：P8→时间线与信号入内置（A/B 证方法改行为）、P6 保持 run 级覆写、两个入口走查通过、厚领域示范独立位、同钉含 critic 行；未决池去向见 [triggers](../../triggers.md) | 2026-10-18 |
| [2026-10-18-research-config-panel-explicitness](2026-10-18-research-config-panel-explicitness.md) | 面板显式化：四区＋回执三态＋五态如实＋标签统一＋渲染修复；文案过目走零上下文探针实验（三处高风险错读＋一处真缺陷已修并静态钉） | 2026-10-18 |
| [2026-10-18-research-method-config-ux](2026-10-18-research-method-config-ux.md) | 总卡：T-1（子卡① 关闭）／T-2（子卡② 关闭）／T-3（未决池五项去向入 triggers）；实施证据 = A/B 记录 ＋ 显式化 Note | 2026-10-18 |
| [2026-10-21-dynamic-research-dag](2026-10-21-dynamic-research-dag.md) | 动态研究 DAG A0 组合落地：plan.md/cell/深度、Team 调度 + depth-2 worker、侧栏研究图谱、Search API profile；受控 4 节点 run + L0/L1/client-load 全绿；[Note](../../../notes/implemented/2026-10-21-dynamic-research-dag-a0.md) | 2026-10-21 |
| [2026-10-21-node-identity-composite-dag](2026-10-21-node-identity-composite-dag.md) | 动态 DAG 稳定节点身份与复合节点：N 是 ID 不是序号、N3.1… 折叠、复制 run 引用、plan 结构提示；[research-planning skill](../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md) + [plan 模板](../../../research-workspace/templates/run/plan.md) | 2026-10-21 |
| [2026-10-21-method-library-main-surface](2026-10-21-method-library-main-surface.md) | 方法库管理迁到主界面：conversation.view 第三 tab、四字段编辑、W1 交 Lead 保存；侧栏瘦身为本次研究摘要 + 入口；client-load/keyless 全绿 | 2026-10-21 |
| [2026-10-22-w-wave-node-identity](2026-10-22-w-wave-node-identity.md) | 研究图谱 W<wave>.<index>：W2=Wave 2 分组、W2.1=并行节点、W2.1.1=内部拆解；wave-prefix/legacy-flat-w、WAVE 泳道、重编号+alias；[Note](../../../notes/implemented/2026-10-22-w-wave-node-identity.md) | 2026-10-22 |
