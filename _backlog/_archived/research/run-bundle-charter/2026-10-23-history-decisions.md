---
topic: run bundle 宪章的历史决定审计
intent: 为宪章 RFC 提供决定时间线与「可能做错」的七类判断，每条带证据位置
---

# run bundle 宪章：历史决定时间线与「可能做错」清单

> 消费者：[_backlog/issues/2026-10-23-run-bundle-agent-state-and-read-chain.md](../../../_archived/settled_issues/2026-10-23-run-bundle-agent-state-and-read-chain.md)
> ｜ 只读审计（2026-10-23），未改任何文件；日期 = 决定/事故日。
> ｜ 缩写：issue = 上述宪章卡；delivery = `notes/implemented/2026-10-07-delivery-criteria-mechanization.md`；
> rerun = `notes/implemented/2026-10-23-rerun-version-face.md`；graph = `notes/implemented/2026-10-23-graph-mapping-honesty.md`。
> ｜ **`issue:N` = 2026-10-23 初稿行号**；该卡经 2026-10-23 REVIEW 重排后行号已变，引用仅作追溯，
> 当前内容按卡的 §标题 检索（数字校正 = [issue-review-verification](2026-10-23-issue-review-verification.md)）。

## 1. 时间线

| 日期 | 决定 | 内容 | 理由 | 后续修订或矛盾 |
|---|---|---|---|---|
| 09-24 | D17 + 分离 Note | harness 只读、bundle 持全部变量；rerun 三分；present 指当前版；交付后冻结 | 与 DEEP_RESEARCH_HARNESS 概念比对；一方向一身份（`notes/implemented/2026-09-24-run-bundle-drt-separation.md:9-26`） | 当时判「暂无归档需求」（同文:29-30），三天后加 archive/（`docs/decisions.md:27`）；「冻结」被归档续跑推翻（`docs/guides/61-run-playbook.md:209-213`）；present 带版本不成立（rerun:18-19） |
| 09-26 | 事故→契约 | 当前版 final.md 钉 run 根；放进 final/ 会被审计静默跳过（0/0 假象） | 一次真实 run 位置漂移（`notes/implemented/2026-09-27-polish-to-plateau.md:24`） | 09-29 schema-scan 把「位置违约」列为契约（`notes/implemented/2026-09-29-quality-evidence-loop.md:7`）；final/ 从此只放版本账（`research-workspace/AGENTS.md:36-39`） |
| 09-27 | 位置=状态（D17 记日） | 在飞住工作区根，交付后操作侧 mv 到 archive/ | 根只留活跃、观察面用位置判态（`docs/decisions.md:27`） | 与宪章「位置非状态」冲突（issue:51）；archive 又可续跑（`docs/guides/61-run-playbook.md:209-213`） |
| 09-27 | 证据最小契约＋审计 fail-loud | 摘录只放原文／逐段逐字／表格逐格；日期不得凭时间感；source_url 必须真抓 | 八场 run：逐字率 31%→98%，日期五场全错（`notes/implemented/2026-09-27-polish-to-plateau.md:13-30,44-46`） | 审计仍不判注释混入与单元格拆分，靠 critic 人审补位（`research-workspace/AGENTS.md:91`） |
| 09-28 | rerun-loop-live | 在 archive 的已交付 bundle 上做 v2 证据扩张 | 验证 D17 正宗 rerun（`notes/implemented/2026-09-28-rerun-loop-live.md:11-17`） | G8：HITL2 与 present 双缺席，journal 散文先宣称 present（同文:34-41），次日立门②③ |
| 09-29 | NODES + 门②③ | 八节点 I/O；present 须在会话日志；操作侧补齐可 PASS-RELAY | 两场 run 拍板行/present 裸奔（`notes/archived/2026-09-28-node-io-schema.md:13-19`） | NODES:33 把 present 列为交付节点输出，`docs/guides/61-run-playbook.md:38` 却说它不在 bundle；relay 是补丁（`scripts/lib/node-gate-session-gates.mjs:184`） |
| 10-03 | 门④／门L | 版本记账门（vN≥2 须 §Decisions vN 行＋v1 索引）与 leads 交接门 | 回边版本血统与交接质量（`research-workspace/NODES.md:53-59`） | 用全局「契约日」断代，bundle 不记版本（`scripts/lib/node-gate-contracts.mjs:5-19`） |
| 10-06 | 门R＋复审上限 | 同标题≥4 红；复审≤3 轮，超界原样升级 HITL2 | 外部事故 #6452；33 场存量标定（`notes/implemented/2026-10-06-heading-degeneration-gate.md:12-27`） | 门R 本仓零事故也立（同文:25-27）；上限先 2 后 3（`notes/implemented/2026-10-06-review-loop-bound.md:42-45`） |
| 10-07 | 计划确认卡 | HITL1 两段卡；不另立计划文件，question.md 已是方向契约 | 一处事实一个家（`notes/implemented/2026-10-07-plan-review-gate.md:45-46`） | 两周后「计划」改指 plan.md 执行图（`notes/implemented/2026-10-21-dynamic-research-dag-a0.md:17-20`），同名不同物 |
| 10-07/08 | 门A | 交付完整性 = final/ 记账 × readiness × audit CRITICAL=0 | 交付判据在合同／脚本／操作面三方不一致（delivery:7-35） | 7 个归档 bundle 门红以「豁免登记」保留（同文:39-56,106-107）→ archive 内有未按现契约交付者 |
| 10-12 | D25／方法库 | 工作区根 method-library.md；Lead 写，面板只经 session/prompt 中继 | 偏好跨 run 复用；写路径须模型可见（`docs/decisions.md:35`） | 与「harness 只读、变量全在 bundle」冲突；BUG-042 补种子＋三态＋探针（`_backlog/_archived/fixed_bugs/BUG-042-method-library-seed-absent-no-pointer.md:27-30`） |
| 10-15/16 | _abandoned | 13 个未归档 bundle 分 A/B/C；新建停放位，可 mv 回根复活 | 活动区清零，且绝不把红场洗成已交付（`_backlog/_archived/settled_issues/2026-10-15-unclosed-bundles-disposition.md:8-10,56-75`） | 位置二值变三值；手册刻意不写（`research-workspace/.gitignore.example:13-16`）；10-19 又删 16 个（`research-workspace/_abandoned/README.md:21-32`） |
| 10-18 | 门判据放宽 | 门L 剥强调、门③认代答 provenance、门A 认升级路径；readiness 收归单一正本 | 真 run 假红 17 条＋门/UI 判据分叉（`notes/implemented/2026-10-18-node-gate-judgment-widening.md:11-20`） | 改 readiness 会「唤醒」旧 bundle 原本 N/A 的门②③（同文:50）——契约日断代挡不住追溯改判 |
| 10-19 | 终稿页签／交付判据 | present 才是交付；final.md 在场只算「可审」；final/vN 不是交付凭证；路径三位置回退 | 真 run 里 v1 在 HITL2 前就落盘（`notes/implemented/2026-10-19-final-tab-round-close.md:21-24,41-45`） | 交付证据仍住日志（`docs/guides/61-run-playbook.md:38`）；三位置回退是对「位置会变」的补丁（`docs/design/40-research-cockpit.md:71`） |
| 10-21 | DAG A0 | plan.md=lead 过程件，进图谱但不进 schema-scan/node-gate；不加 plan-gate | 不引第二套 store/queue（`notes/implemented/2026-10-21-dynamic-research-dag-a0.md:17-20,45-46`） | 恢复仍靠 plan 的 W 节点重建任务（`research-workspace/AGENTS.md:57-58`）；归档中 plan.md 仅 1/46（issue:99） |
| 10-22 | W<wave>.<index> | Wave 由 deps 算；节点 W2.1，内部 W2.1.1；跨波重编号＋旧号别名；旧 N/flat W 只读 | 用户纠正 W=工作包语义（`notes/implemented/2026-10-22-w-wave-node-identity.md:7-12`） | 一个月内第三套节点命名（N→flat W→W<wave>），旧 plan 不迁移（同文:11-30） |
| 10-23 | rerun 版本面 | 图版本头＋plan/vN 快照＋rerun 行＋final/vN 账；present 无版本号，按账推定 | 版本面只用盘上机器可读事实（rerun:11-21） | 契约版本仍无戳（issue:54）；真实样本头与记录不一致只能「两个都报」（同文:93-96） |
| 10-23 | 图谱映射诚实 | plan↔Team 五态；「未执行」不再由缺映射产生；覆盖率分母=active 节点 | 恢复后 task_id stale 必现（graph:11-23） | 诚实了，但仍不能回答「还剩什么」——缺口只暴露给人/Lead |
| 10-23 | 宪章卡 | 独立／可删／可续；bundle 内=研究状态，外=执行现场；位置非状态 | 五个概念被混用（issue:12-27） | 与现行 D17/design40 未收口；规范仍待 RFC（同文:37,54） |

## 2. 可能把宪章做错的七类决定

### 2.1 把续跑/交付必需状态放到 bundle 外（已发生，且被写成原则）

- 交付唯一见证 present 住会话日志：NODES:33 把它当第 8 节点输出，`docs/guides/61-run-playbook.md:38`
  明说「不在 bundle 文件里（门②查 lead 会话日志）」，`docs/design/50-agent-loop-and-state.md:35`
  又把它算进「文件事实链」——三处口径不同；**38/46 归档 journal 提到 present，但那只是声明，
  不是原始事件**（原始事件 = 日志里的 `deliverables/presented`）。
- 交付节点三个「输出」里，present 住日志、audit.md 由操作侧脚本写，只有 final/ 记账是 Lead 在
  bundle 内写的（NODES:33；`research-workspace/AGENTS.md:126`）。
- 日志有损：通道死亡丢尾部（`docs/guides/61-run-playbook.md:194-196`）；归档后门②不可复跑，
  才发明 PASS-RELAY（`scripts/lib/node-gate-session-gates.mjs:184`）。
- 在飞 HITL、goal、Team 板同样在外且恢复不了（`docs/guides/61-run-playbook.md:192-193,197-203`；issue:178）。
- 宪章若只写「研究事实在 bundle、执行现场可丢」，会把「交付态不可自证」合法化；而 issue:23
  又要求「交付态必须由 bundle 自己说清」——两条必须合成一条：**双见证**。

### 2.2 把位置当状态（archive=delivered、_abandoned=parked）

- 三处正本仍写死：`docs/decisions.md:27`、`docs/design/40-research-cockpit.md:107-109`、
  `docs/design/50-agent-loop-and-state.md:25`；宪章卡却说「位置非状态」（issue:51）——
  先收口这一条，否则宪章一落地就与 D17 打架。
- archive 不是交付证明：7 个归档 bundle 保留红门（delivery:39-56,106-107）；archive 还能被继续
  rerun（`docs/guides/61-run-playbook.md:209-213`）→ 同一位置同时是「已交付」和「在飞」。
- 10-15 卡把 13 个积压全判成「在飞」，真正原因是停摆/未闭环（card:10,37）；加停放位后工具面
  被迫认第三位置（`notes/implemented/2026-10-16-structure-round3-harness-convergence.md:70-77`）。
- 按 `docs/guides/61-run-playbook.md:35-39`，当前 4 个活动 bundle 全属 (b)「交付线已在盘、未归档」
  （final/v1＋终局 PASS）——「已交付未归档」是常态，位置无法表达状态。

### 2.3 plan.md 定为非契约，却让它承载「还剩什么」

- 三处明确非契约：NODES:37-39、`research-workspace/AGENTS.md:23-30`、DAG note:45-46；却又被
  恢复/观察依赖：`research-workspace/AGENTS.md:57-58` 按 plan 的 W 重建 Team 任务，
  `docs/design/40-research-cockpit.md:37,64` 用 plan 判进度，恢复后 task_id 必 stale（graph:16）。
- 数据反证：归档中 plan.md 仅 1/46；在飞 eu-us plan 从 v1 重写到 v6（+ W3.2–W3.6 五个节点；`plan/vN` 全库仅 1 个）。
- 根因：D4/D11/D20 拒绝仓库任务队列（`docs/decisions.md:14,21,30`），「剩余工作」没有第二个家，
  只能挤进 plan/journal——宪章不能只说「plan 不是契约」，必须给「还剩什么」一个新家。

### 2.4 删除／归档／停放语义

- 三值位置靠 mv 维护：archive=交付过、_abandoned=未交付且不再投入、根=在飞
  （`research-workspace/_abandoned/README.md:5-7,45,50-51`）。
- 删除无契约但已发生：2026-10-19 删 16 个 bundle，凭据只剩本地 README 与 /tmp 快照
  （同文:21-35）。
- 手工登记会腐：README 写「当前 2 个」，盘上 3 个（同文:14）。
- 宪章「可删=删目录」（issue:15,51）方向对，但缺「删前留什么、删后门/审计怎么不误报」；
  当前唯一硬规则是「不许洗成已交付」（同文:45）。

### 2.5 契约版本化（bundle 不记自己产自哪版 NODES/templates/手册）

- issue:54 明说「契约版本戳待 RFC」；`research-workspace/templates/run/question.md:1-8` 与
  `templates/run/plan.md:1-16` 均无版本字段。
- 现行替代是全局契约日＋交付日断代（`scripts/lib/node-gate-contracts.mjs:5-19`）；判据一改旧
  bundle 会被追溯改判（`notes/implemented/2026-10-18-node-gate-judgment-widening.md:50`）——
  日期模型不是稳定边界。
- 语料漂移靠加宽解析器吸收：终局 readiness 兼容 13 场装饰形态
  （`notes/implemented/2026-10-11-review-readiness-terminal-rule.md:12-32`）；plan 版本头被
  模板样板/注释夺权后才修（rerun:80-87）。
- 6 件核心 46/46 只是文件集稳定，不是语义稳定（review 45、gate 44）；宪章应把「契约戳」列为必备字段，
  而不是留待 RFC。
- final/ 还留一个洞：「vN 是交付时忠实副本」只是假设（rerun:41-44），polish 又允许原位改当前版、
  版本号不变（`research-workspace/NODES.md:55-56`）→ 交付后无法保证还原交付字节。

### 2.6 method-library 等 workspace 共享可变文件 vs「harness 只读」

- D17 说 harness 只读、零 per-run 状态（`docs/decisions.md:27`；
  `docs/design/10-architecture.md:25-29`），但 method-library.md 住工作区根、Lead 在 run 中写
  （`research-workspace/AGENTS.md:47-51`），且被定性为「用户数据，非 harness 纪律文件」
  （`notes/implemented/2026-10-12-research-method-config.md:34`）。
- question-patterns.md 也在归档时被收割写入（`docs/guides/61-run-playbook.md:232-244`）——
  run 收尾会改共享库。
- 后果：同一 bundle 不同时间 rerun 读到的偏好/判型不同，「独立、可删、可复现」都被打折；
  BUG-042 的修法（种子＋三态＋探针，BUG-042:27-30）仍是补丁。
- 宪章需新增第三类「共享可变库」（既非 harness 也非 bundle），规定 append-only、版本/摘要、
  bundle 记录本次读到的条目；`research-workspace/AGENTS.md:48-49` 已有「采用库条目 X」记账位，
  可扩成摘要。

### 2.7 打补丁式修订清单（为单个事故加规则，而非不变量）

- 门R：外部事故 #6452 移植，本仓零事故也立（heading:25-27）。
- 复审上限 2→3：因一场四轮收敛改参数（`notes/implemented/2026-10-06-review-loop-bound.md:42-45`）。
- 门L/门③/门A 三处同日放宽：因一场代理代答连续踩坑（node-gate:11-20）。
- 终稿三位置回退：因归档后原路径失效（`docs/design/40-research-cockpit.md:71`；final-tab:41-45）。
- `_abandoned` 约定刻意不写进手册，只为不触发 fixture 重录
  （`research-workspace/.gitignore.example:13-16`）——操作侧语义与模型侧合同正式分叉，
  最该在宪章里禁止。
- 判据：以上每条局部都合理，但没有一条是「不变量」；宪章若以它们为地基，会把事故形状固化。

## 3. 如果重来，哪 4 个决定会做得不一样

先声明：不推翻 D17 的主体——6 件核心 46/46、review 45/46、node-gate 44/46，单写者 owner 表是真接口，应保留（核验见 §5.2）。

1. **交付回执进 bundle，present 降为外部佐证（不是取消）。** 保留反自证：gate 仍认外部 present；
   但 bundle 必须有 `delivery: vN @ time · by …` 的 journal/§Decisions 行，使归档后、日志丢失后
   仍能回答「交付到哪一步」。证据：present 在日志、日志丢尾、relay 已先例、G8 双缺席、
   「present 一半在外」。
2. **bundle 自带状态头＋契约戳，位置只做存储。** 状态头 3–5 行（phase／last decision／open risks／
   next action／delivered version）；契约戳 `pack@x · nodes@date · templates@date`。证据：D13 禁文档
   状态被误读成「任何地方都不写状态」，才用位置代偿；位置已三值且互相矛盾。
3. **plan.md 要么进契约，要么退出恢复链。** 选进契约：只要求机器可读的「未完成节点＋owner＋
   下一步」小节（不要求全图），schema-scan 只查这一节，Team 重建不再依赖整张图。证据：plan 1/46、
   v1→v6（+5 个节点）、stale 必现，而恢复又靠它。
4. **共享可变库单列并版本化；删除/归档/停放改为 bundle 内终态＋操作回执。**
   method-library/question-patterns 作为 workspace 级 append-only 库，bundle 记读到的条目与摘要；
   archive/_abandoned/delete 用状态行＋回执，不只靠 mv。证据：D17 只读被方法库破坏、手工表已腐、
   删除已发生但无契约。

**最该先做**：收口 2.2 的「位置非状态」与 D17/design40/design50 三处旧句
（`docs/decisions.md:27`；`docs/design/40-research-cockpit.md:107-109`；
`docs/design/50-agent-loop-and-state.md:25`），否则宪章会与现行正本并存两套状态模型。
