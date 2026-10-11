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

**挂账现状（2026-10-11）**：run 观察与人工走查被环境阻断——外网 egress 不可达（`drt_cn-moe-2026` journal 实证 12 主机 29 抓 0 成，本日复测 github/example/arxiv 同阻）；定向 kickoff 已备 `runtime/kickoff-ux-verify.md`（gitignored），通道恢复即可开跑核验。

**真实 run 阶段一核验（2026-10-11，`drt_deepseek-model-upgrade`）**：通过——四问卡 `wait` 参数缺席（timed 护栏在位）、推荐置首带说明、判型真实命中模式库 P5 并注明；**业务决策简报五字段由题面直接落格 Snapshot、零重复追问**（question.md 澄清记录显式写明「五项用户在题面已给全，未重复问」）。未观察到：计划确认卡（第二段）——lead turn 2 写盘后遭模型空响应终止（`assistant/attempt` 无消息 → `turn/end`），通道重启将会话终局化（`end-seed`），恢复发送失效；该观察 + 人工走查维持挂账。**核验暴露的合同缺口已修**：第四问被 lead 用作归档预检（正确行为）但合同未授权该形态——research-brief skill 补「归档预检问可并入第一段卡（第四问位）」钉面（同 diff 契约断言，persona 不动避免 fixture 重录）。

**真实 run 阶段二核验（2026-10-11，重开会话 `drt_deepseek-default-upgrade`）**：通过——**计划确认卡构成实测**：卡上含业务决策简报行（决定/比较/输出/主要未知）、三选项形态、`wait` 缺席，lead 并自然引用②的新结构（「判决落 final §决策摘要」）；拍板落账走通。**实测违纪一处**：计划卡正文 461 字，超 ≤200 字纪律——模型遵守率数据点（skill 有纪律、执行超限），按「试点场次遵守率决定是否升格机械门」挂账，不当场改措辞。**附带兑现**：hitl-answer 加固路径端到端走通（无 `--session` 默认发现成功）+ provenance 延迟补记机制被工具显式提示。运行中断与恢复（队员失败通知、lead turn 空响应停滞、通道重启、bundle 文件续跑审计）显性记账于 run journal round 2；操作侧续推工具缺陷另立 [BUG-021](../bugs/BUG-021-cdp-probe-ask-send-fail.md)。

## 关闭条件

实现已落在 skill、模板及其种子镜像，结构化输入和计划卡能按上述样例工作，测试与对账通过；若实施中需要改变两点交互合同，另建持久决定评审，不在本卡扩大范围。
