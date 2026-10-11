---
status: 推敲中
opened: 2026-10-11
---

# 实施：在 HITL1 生成业务决策简报

> 立卡：2026-10-11 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 可关闭：否

**问题与期望结果：** 现有立项卡主要让用户选择研究类型、深度/篇幅和时间口径。企业决策者更关心这次研究支持什么决定、比较哪些选项、谁会使用、何时需要、有哪些约束。实现一层业务决策简报，让 Lead 先把用户的业务问题翻译成可确认的研究目标，再把研究类型、深度和口径作为系统执行参数呈现，减少高管理解 DSH 术语的负担。

**交付物：** 修改 Lead 的 research-brief skill 与 run question/plan 模板，使 HITL1 在信息不足且会改变研究范围时，补充收集业务决策字段；在计划确认卡中展示业务简报。保留当前固定三问为默认基线，按已有 question-patterns 的困惑信号追加澄清，不把业务字段机械升级成固定第四问。

## 次序与依赖

三卡落地次序 = ①本卡 → ②决策报告 `2026-10-11-executive-research-decision-report.md` → ③驾驶舱 `2026-10-11-executive-research-ux-delivery.md`。本卡无前置依赖，且是后两者的数据上游：question.md 的业务字段同时喂报告的「建议与适用条件」与驾驶舱的「当前目标」。

## 实施范围（四处对账面 + 镜像，同 diff 联动）

HITL1 语义由 `tests/presets.test.mjs`「HITL1 两段卡」四处对账测试钉住（persona + research-brief + 手册 + 模板），改动必须四处联动，漏一处即红：

- `packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md`：业务决策简报字段（决策对象 / 待决定事项 / 比较选项 / 截止时间 / 成功标准与约束）的采集规则并入既有第四问触发机制——已提供不重复问，缺项仅在会改变研究范围时随第四问追问，未知标 open；计划确认卡要点改从 question.md 业务字段生成（决定 / 比较范围 / 输出形式 / 主要未知 / 研究投入影响），三种计划动作与一轮制不变。
- `research-workspace/templates/run/question.md`：HITL1 Alignment Snapshot 增业务决策简报字段；不写入敏感信息，owner 不变。
- `packages/deep-research-pack/presets/lead.patch.yml`（persona）：第一段「三问固定为」契约句保持为真；仅在第四问触发句需涵盖业务决策澄清时同 diff 补句；「HITL1 零例外」「ask 调用硬约束」等既有契约句原样保留。
- `research-workspace/AGENTS.md` §交互纪律：仅在两段卡描述需提及业务简报时同 diff 补句；「HITL1 = 两段卡」「quick_factual 豁免」合同句保持为真。
- 镜像不手改：`node dev/sync-pack-workspace.mjs` 从 research-workspace 正本同步进 `packages/deep-research-pack/workspace/templates/run/question.md`，`pack-workspace-fresh` 把守。
- 不改变 HITL1 两段结构、quick_factual 豁免、HITL1 永不重开、topic 编制或团队调度。

## 验收标准

| 判据 | 行为类 | 检查方式与证据 owner | 负例 / 互补 |
|---|---|---|---|
| question.md 模板含业务决策简报字段（决策对象 / 待决定事项 / 比较选项 / 期限 / 成功标准与约束 / open 显式标注） | 确定性 | `tests/presets.test.mjs` 新增契约断言（沿「HITL1 两段卡」四处对账先例，先红后绿；tests/ 契约测试无 evaluation.md 登记面——该台账只登记 verify.mjs 门禁）；`sync-pack-workspace` 后 `pack-workspace-fresh` 绿 | 删任一字段测试变红；quick_factual 豁免样例计划卡仍免发（互补态） |
| 采集按信息充分性触发：已提供不重复问，未知标 open 不脑补 | 模型行为 | L4-lite 或定向 run 观察 lead 实际提问，走查记录含分母与用户原话 | 样例含用户已答字段仍被追问 = 负例命中 |
| 四类输入样例（信息充分 / 缺不影响范围 / 缺会改变范围 / 命中困惑信号）各有明确的问与不问清单 | 模型行为 | 人工走查四份样例，逐份记录出现与不出现 | 命中困惑信号样例只叠加模式库澄清问，不变成固定第四问 |
| 计划卡业务语言：业务读者能说出决定、比较选项、交付物、最大未知，无需理解 `quick_factual` 等 token | 模型行为 + 人工判据 | 真实计划卡文案走查，人工判据单独记录 | 文案露出内部 token 或术语 = 负例 |
| 合同不扩张：无第三个 HITL 点、无固定第四问、无 `[ACCEPTED]` 协议；修订仍一轮制附加进 Decisions | 确定性 | `tests/presets.test.mjs` 禁词断言（`[ACCEPTED]` doesNotMatch + 「不设固定第四问」positive 钉，注入反证先红后绿）+ L1 挂载 | — |

必跑面（任务型路由「改 persona / skill / 手册文本」行）：L0 + `render-overlay` 先于 L1（skill 文本）+ `pack-workspace-fresh`（模板）。模型行为证据走 L4-lite 或真实 run 观察，无凭据时如实标注「未运行项」；业务读者复述属人工判据，技术绿不替代。

### 在办行（2026-10-11 按 `methods/validation-design` 补全字段）

> 上表保留为可读判据；下列行是**紧接着要执行的面**，每行字段 = 行为 · 类 · 输入/状态 · 判定与失败信号 · 负例/互补 · 证据 owner（能证什么 / **不能证什么**） · 人工判据。

**①-a 四类输入样例材料（材料缺席是走查的前置阻塞）——2026-10-11 已落**
- 行为：存在覆盖四类输入的样例集——信息充分 / 缺不影响范围 / 缺会改变范围 / 命中困惑信号——每类带**问与不问的逐项清单**，供人照单走查。
- 类：确定性（材料在场 + 形状可检）。
- 输入/状态：`research-workspace/drafts/` 现有四份草稿（含 ② 的报告样例），**无本项材料**（2026-10-11 实测）；互补态 = 只有一两类、或只有样例没有清单。
- 判定与失败信号：四类齐 + 每类问/不问清单齐；**失败信号 = 缺类或缺清单**（走查开口即空转）。
- 负例/互补：快速事实类的豁免态必须出现在样例里（quick_factual 不问业务字段仍成立）。
- 证据 owner：`research-workspace/drafts/2026-10-11-hitl1-intake-samples.md`（五类节 + 每类三块 + 走查记录表）+ 形状契约测试 `tests/hitl1-intake-samples.test.mjs`（能证：类/块/条目/表格不烂；**不能证**：模型真实提问行为与文案业务可读性——那要看 ①-b）
- 人工判据：无（材料写作本身不是判据；判据是 ①-b 的走查）。

**①-b 四类样例走查 + 业务读者复述（人工判据批次）**
- 行为：业务读者能照 ①-a 的清单判断每类「问了什么/没问什么」，并复述计划卡里的决定、比较选项、交付物、最大未知，**无需理解 `quick_factual` 等内部 token**。
- 类：模型行为 + 人工判据。
- 输入/状态：①-a 材料齐；计划卡真实文案用 `drt_deepseek-default-upgrade` 已交付的那张（阶段二实测在案，461 字违纪数据点同源）。
- 判定与失败信号：逐类记录「出现/不出现」+ 复述要点齐；**失败信号 = 该问未问、不该问却问（重复追问）、或复述时露出内部 token**。
- 负例/互补：命中困惑信号的样例只叠加模式库澄清问，**不得**变成固定第四问。
- 证据 owner：人工走查记录（**不能证**：真实 run 的提问行为分布——那要 L4-lite 或真 run 观察，属模型行为面）。
- 人工判据：**是**——唯一 owner 是业务读者（你）；agent 只准备材料与记录模板。

**①-c 计划卡 ≤200 字：遵守率 → 机械门候选（存量标定已完成）**
- 行为：HITL1 第二段计划确认卡的**问题正文** ≤200 字（skill 与 persona 的既有纪律），交付时被机械检出而非靠自觉。
- 类：模型行为（生成）+ 确定性检出。
- 输入/状态：存量标定 = 近 30 天 612 场会话扫描，命中计划卡 **2 张：461 字 / 246 字 → 2/2 超限**（2026-10-11 实测，扫描器 `runtime/scan-plan-cards.mjs`）；互补态 = 合规卡（<200 字）应放行。
- 判定与失败信号：新 run-gate 在 bundle 会话日志里量该正文；超限 → 门红；**失败信号 = 超限却门绿（漏检）**。
- 负例/互补：**先证负例**——注入一张 461 字卡 → 门必红，再算门成立（`writing-a-gate` 程序）；合规卡 → 绿。
- 证据 owner：候选 = `scripts/run-gates/`（run 期行为，**不能塞进 `verify.mjs`**——那是仓库结构门）或 node-gate 新门（判据核心入 `lib/node-gate-core.mjs`，fixtures 入 `tests/`）；**不能证**：文案是否业务可读（属 ①-b）。
- 人工判据：无。**已定（2026-10-11 用户拍板）= 先落 WARN 级检出 + 收紧措辞**：门只记账不拦交付（2/2 超限下硬门会拦下每一场），同 diff 收紧 persona/skill 的计划卡字数句；待遵守率改善后再评估升硬门（升格条件写进卡，不靠记忆）。

**①-d 记账修正：阶段一引用的 bundle 不在盘**
- 行为：卡面不再引用无法回溯的证据源。
- 类：确定性（记录一致）。
- 输入/状态：上文阶段一段引用 `drt_deepseek-model-upgrade`；`research-workspace/`（在飞区）与 `archive/`（已交付区）全无，全仓仅本卡一处提及，`drt_*` 非 git 跟踪对象故无历史可查（2026-10-11 实测）。
- 判定与失败信号：卡面补「不可回溯」说明或删该引用；**失败信号 = 卡面仍当作可回溯证据引用**。
- 负例/互补：不适用。
- 证据 owner：本卡自身 + `md-links`（能证：链接可解析；**不能证**：所引 bundle 是否真存在过）。
- 人工判据：无。

**挂账现状（2026-10-11）**：run 观察与人工走查被环境阻断——外网 egress 不可达（`drt_cn-moe-2026` journal 实证 12 主机 29 抓 0 成，本日复测 github/example/arxiv 同阻）；定向 kickoff 已备 `runtime/kickoff-ux-verify.md`（gitignored），通道恢复即可开跑核验。

**真实 run 阶段一核验（2026-10-11，`drt_deepseek-model-upgrade`〔⚠ 该 bundle **不在盘**：在飞区与 archive 全无、`drt_*` 非 git 跟踪对象故无历史——本段结论的分母与用户原话**不可回溯**，引用时按降级证据对待〕）**：通过——四问卡 `wait` 参数缺席（timed 护栏在位）、推荐置首带说明、判型真实命中模式库 P5 并注明；**业务决策简报五字段由题面直接落格 Snapshot、零重复追问**（question.md 澄清记录显式写明「五项用户在题面已给全，未重复问」）。未观察到：计划确认卡（第二段）——lead turn 2 写盘后遭模型空响应终止（`assistant/attempt` 无消息 → `turn/end`），通道重启将会话终局化（`end-seed`），恢复发送失效；该观察 + 人工走查维持挂账。**核验暴露的合同缺口已修**：第四问被 lead 用作归档预检（正确行为）但合同未授权该形态——research-brief skill 补「归档预检问可并入第一段卡（第四问位）」钉面（同 diff 契约断言，persona 不动避免 fixture 重录）。

**真实 run 阶段二核验（2026-10-11，重开会话 `drt_deepseek-default-upgrade`）**：通过——**计划确认卡构成实测**：卡上含业务决策简报行（决定/比较/输出/主要未知）、三选项形态、`wait` 缺席，lead 并自然引用②的新结构（「判决落 final §决策摘要」）；拍板落账走通。**实测违纪一处**：计划卡正文 461 字，超 ≤200 字纪律——模型遵守率数据点（skill 有纪律、执行超限），按「试点场次遵守率决定是否升格机械门」挂账，不当场改措辞。**附带兑现**：hitl-answer 加固路径端到端走通（无 `--session` 默认发现成功）+ provenance 延迟补记机制被工具显式提示。运行中断与恢复（队员失败通知、lead turn 空响应停滞、通道重启、bundle 文件续跑审计）显性记账于 run journal round 2；操作侧续推工具缺陷另立 [BUG-021](../_archived/fixed_bugs/BUG-021-cdp-probe-ask-send-fail.md)。

**真实 run 阶段三核验（2026-10-11，续跑至交付 `drt_deepseek-default-upgrade`）**：run 已交付——run 根 `final.md` v1 当前版 + `final/v1.md` 版本记账 + `present` 声明 + `question.md` §Decisions HITL2 拍板行，四步齐；HITL2 由用户经 GUI 实拍「按现稿定稿」（ask 20:13:37 → 答 20:14:26，**49 秒**，非 600s 超时自动落定，也不是操作侧代答）。本阶段**未产生新计划卡**（HITL1 在续跑前已完成），故 ≤200 字遵守率**无新数据点**，461 字违纪数据点仍为唯一观测。三道机械门对真实 bundle（`source dev/env.sh` 后跑，报告落 bundle 内 `audit.md` / `node-gate.md`）：`evidence-audit` exit 0 —— CRITICAL 0 / MAJOR 0 / INFO 1、URL 溯源 70/70、`source_url` 真抓过 11/11、摘录回溯 452/453（不符 0）、final 引用链 57/57；`node-gate` exit 0 —— 门① HITL 锚点 / 门③ §Decisions 拍板行 / 门② present 声明 / 门L leads 交接 / 门R / 门A 全 PASS，门④ N/A（无扩张 rerun，显式标注）；`schema-scan` exit 0 —— 核心 schema 全齐。
**仍缺（人工判据）**：四类输入样例的问/不问清单走查（材料本身尚未制作）；业务读者复述计划卡。
**记账修正（2026-10-11 已落）**：上文所引阶段一 bundle `drt_deepseek-model-upgrade` **不在盘**（`research-workspace/` 在飞区与 `archive/` 已交付区全无；全仓仅本卡一处提及；`drt_*` 非 git 跟踪对象故无历史可查）。处置 = 在引用处**原位标注不可回溯并降级为降级证据**（不删段：删掉会把一次真实核验的历史一并抹去）。

## 关闭条件

实现已落在 skill、模板及其种子镜像，结构化输入和计划卡能按上述样例工作，测试与对账通过；若实施中需要改变两点交互合同，另建持久决定评审，不在本卡扩大范围。
