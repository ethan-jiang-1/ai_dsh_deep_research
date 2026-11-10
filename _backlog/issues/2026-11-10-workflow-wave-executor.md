---
status: 待落地
opened: 2026-11-10
---

# 推敲：编排通道落地——workflow 只做同质 wave 执行器

> 立卡：2026-11-10 ｜ 状态：待落地 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：否
> 去向：proposed — `notes/proposed/` 下的 RFC（文件名在成立时定，首提日期 = 2026-11-10）；业务验收：用户
> 审查：自审 2026-11-10 — 机制锚点逐条核（vendor rc.5）；P1 真挂载绿/红复现并复原；P2–P4 标明源码级、live 待证；P5 实测；`pnpm verify` 全绿、`pnpm test` 1052/1052。业务验收仍归用户。
>
> **2026-11-10 深挖后分工**：wave 执行切片已由 [wave-execution-lens-fanout](2026-11-10-wave-execution-lens-fanout.md)
> 承接；该卡按新事实把挂点从 A（独立 `wave-runner`）改判 **B（analyst 承载）**，并把范围收窄为
> deep-dive 的 `lens-fanout`。本卡继续持有 channel-policy 记录、8 槽/HITL 约束与 goal pause/resume
> 缺陷（`GOAL_TOOL_RESUME_PAUSED`），不因新卡关闭。

**问题与期望结果：** 当前研究 run 是「Lead 会话 + Team 板 + 少量 subagent」，`workflow` 完全没挂，
`goal` 只做记账；四个研究角色该把哪类工作交给哪条原语，只靠 persona 散文，没有机制级选型表，
也没有算过 8 槽共享池的账。期望：把「按工作形状选通道」落成一份可评审的决定（RFC），给出
workflow 的挂点、容量合同、HITL 授权方式与证据/失败合同，并在评审通过后按试点计划实施；本轮
**不直接改 pack 行为**。

**当前情况：** 研究结论与探针见 [channel-policy v2](../research/orchestration-primitives/2026-11-10-channel-policy.md)
与 [探针记录](../research/orchestration-primitives/2026-11-10-channel-probes.md)。已确证（同 pin）：

- 只有 in-process **spawn** 能钉独立 `agentPreset`；workflow child 与 teammate 都加入调用者/Lead 的
  **当前 preset 修订**（同一棵 generation），不是复制。因此「workflow 子代是 Lead 克隆」只在
  Lead 挂点成立；挂 analyst 或独立薄 preset 会保留那一层的 persona/skill/工具面。
- web-app 在 root 层同时 disable `workflow-ptc` 与 `tool-workflow`；**只往 preset 插 tool 不够**，
  实测得到 `waiting for workflowEngine`、preset 标 broken。正确形状 = engine + tool 同 group，
  `isolate: workflowEngine: true`（真挂载已绿）。
- `maxActiveSubagents`（默认 8）是**每个 root 的全体活子代共享池**：teammate、subagent worker、
  workflow child 一起抢；超限 `ACTIVATION_LIMIT_REACHED`，不排队；workflow 侧把它包成
  `AGENT_START` fatal，整脚本失败。workflow child 不经过深度闸，depth 只 stamp `parent+1`。
- team profile 在 root 层 disable `tool-subagent` 四行，但**不覆盖 preset 自己的同名行**（源码 +
  D16 差分；vendor README 明说 preset 仍可在自己的 scope 挂 continuable 控制）。因此 persona 的
  「用 subagent 生 worker」机制上成立；只是全局 `send_message` 被 team profile 关了、Team 版只
  寻址 roster，subagent child 在本组合里实际退化为 one-shot。
- 目标子代不能 `ask_user_question`（`DELEGATED_CALLER`）；workflow 无 HITL 钩子、无 pause/resume、
  无 durable 图，可取消。goal 的 phase 持久、activation 进程内；goal-round-driver **不守**
  pending timed ask，本包靠 persona「ask 前 pause」补偿。**但这条补偿自身有缺陷**：
  `update_goal action=pause` 后模型再 `resume` 会被 `GOAL_TOOL_RESUME_PAUSED` 拒绝（只有用户能
  resume durable paused goal，`tool-goal/src/index.ts:278-285`），而 lead persona 写的是
  「拿到答案后 resume」（`presets/lead.patch.yml:33`）——HITL1 后 goal 会停在 paused、自动续轮
  失效。这是本卡要求 RFC 一并裁决的相关缺陷。
- 计划卡 200 字实测已顶格（171/183/200）；正文加「脚本扇出」会超，加选项不超。

**未决问题：**

1. **挂点选 A 还是 B**：A = 独立薄 `wave-runner` preset（推荐；只有 wave 会话付 workflow schema
   成本、child 工具面干净）；B = 挂 analyst（不新增 preset、方法保留，但每个 analyst 请求都付
   schema、child 还带 subagent/workflow）。C = 挂 Lead 已否决。**2026-11-10 新卡已按新事实裁决 B；
   A 留 fallback（见上「深挖后分工」）。**
2. **容量**：试点用「team 2 人 + wave-runner 1 + child 4 = 7 槽」，还是把 `maxActiveSubagents`
   提到 12（host 设置、产品面变更）？本轮建议先按 8 槽做试点，不先改全局。
3. **live 证据**：P2（child 是否继承 `research:manual`）、P3（Lead 工具表里 `subagent` 是否真在）、
   P4（真实并发槽位会计时）都只有源码答案；试点第一场要补 request header / 峰值 live children。
4. **模型行为**：模型是否遵守 workflow 的 explicit-ask、是否会在 child 里递归起 workflow——只能
   靠试点观察，不能靠源码。
5. **跨方向口径**：lens 材料 §7 的「workflow 子代是 Lead 克隆」只在 C 成立；wave-execution 的
   「HITL1 执行方式」与本卡的「计划卡正文点名、选项不动」需要统一成一句。

**下一步：** wave 执行 = [新卡](2026-11-10-wave-execution-lens-fanout.md)（B + `lens-fanout`，按
P0→P5 落地）；本卡只保留 channel-policy 记录与 goal `GOAL_TOOL_RESUME_PAUSED` 缺陷的裁决。若仍需
RFC，只覆盖通道政策与 goal 语义，不覆盖 wave 执行实施；RFC 未批准前不动 preset / plan 模板。

## 已知与未决

**已知（可作为 RFC 的事实底座）：**

- 通道能力矩阵、深度/容量/失败/观察语义 = [channel-policy v2 §1](../research/orchestration-primitives/2026-11-10-channel-policy.md)。
- 五个探针的命令、输出、边界与补证清单 = [探针记录](../research/orchestration-primitives/2026-11-10-channel-probes.md)。
- 当前 pack 的工具面与 team 组合 = [D16](../../docs/decisions.md#d16)、
  [10-architecture §3](../../docs/design/10-architecture.md)、
  [team-assembly](../../packages/deep-research-pack/presets/lead/skills/team-assembly/SKILL.md)。
- workflow 政策句原文 = `vendor/dsh/packages/workflow/tool-workflow/src/index.ts:326-330`；
  计划卡口径 = `scripts/lib/plan-card.mjs`（200 字，WARN）。

**未决（RFC 必须回答，或明确标为试点待证）：**

- A/B 的最终选择；若选 A，新 preset 的 id/name/description、是否出现在 roster/UI、是否被
  `presetRoles` 与测试自动纳入。
- 容量：8 槽内试点，还是改 host 设置；改的话理由与回滚。
- HITL：计划卡正文的具体措辞与删字方案；是否需要在 plan 模板加 `channel` 列（v1 建议不加，
  先用 `budget`/`kind` 表达同质层）。
- 证据：child 的证据文件命名与 schema；脚本返回的 `ok/failed/missing` 形状；fatal 的记账。
- 试点：哪一类同质层、N 多少、与 team-only 基线的比较口径（token/墙钟/覆盖/失败率）。

## 方案与取舍

| 方案 | 形状 | 优点 | 代价 | 裁决 |
|---|---|---|---|---|
| **A. 独立 `wave-runner` preset** | 薄 preset：fs / skill / web（按需）/ time-context / `workflow-ptc` + `tool-workflow`；无 subagent / ask / present / goal | 只有 wave 会话付 workflow schema；child 工具面干净；角色边界明确；不把 HITL 工具带进脚本 | 多一个 preset（roster/UI/测试）；方法必须由 brief 携带（lens 目录未建前内联） | **推荐** |
| **B. 挂 analyst** | analyst preset 内加 engine + tool | 不新增 preset；child 直接继承 analyst persona + evidence-extraction skill | 每个 analyst 请求都付 workflow schema；child 还带 subagent（depth 2 时被机械拒绝）与 workflow（递归只能靠合同挡） | 退路 |
| **C. 挂 Lead** | Lead preset 内加 engine + tool | 不改 roster | child 是 Lead 克隆：带 ask/present/goal 工具面、丢 analyst/scout 方法；HITL 语义最脏 | **否决** |

**容量合同（试点）：** `teammates + 1 (wave-runner) + N (workflow children) ≤ 8`；试点取
team = scout + critic（2）+ wave-runner 1 + N=4 = 7 槽；workflow 的 `maxConcurrentAgents` 显式
压到剩余槽。N 写进 plan 的 `budget` 列，不写「2 轮」这种模糊值。

**HITL 授权：** 计划卡正文点名「W2 脚本扇出 ×N（workflow）」，用户点「按计划开跑」= explicit
ask；不新增第四问、不新增选项；正文删字保持 ≤200。若 RFC 认为必须加选项，只允许标签级
「按计划开跑（含脚本扇出层）」，并单独评审。

**证据/失败合同：** 每个 child 自己写 `evidence/<cell>.md`（七字段）；脚本返回
`{ok, failed, missing}`；`null` 不得静默丢弃；fatal 不重试，Lead 记「该 wave 未执行」或退回
Team/subagent；child 需要拍板 → 写 gap，wave 结束后由 Lead 统一问。

**与既有决定的关系：** 不改 D16（team profile 归 vendor 层）；不改 D40（content 注入仍 host 级）；
不改两点交互；不新增调度器；不改 vendor。若 RFC 选择 A，新增 preset 属于 pack 公共行为，须在
RFC 里单列并请用户批准。

## 验收标准

本卡交付的是 **RFC + 探针证据**，不是实现。RFC 成立时，以下逐条可核：

1. RFC 成立于 `notes/proposed/` 下（文件名在成立时定），含：channel 表、A/B/C 裁决、
   容量公式与试点数值、HITL 措辞、证据/失败合同、试点配方、`什么会改变结论`。
2. RFC 引用 [channel-policy v2](../research/orchestration-primitives/2026-11-10-channel-policy.md)
   与 [探针记录](../research/orchestration-primitives/2026-11-10-channel-probes.md)；P1 的
   「engine+tool 绿 / tool-only 红」原始输出可复跑；P2–P4 的「源码已答 / live 待证」标签不混。
3. RFC 明确 A 或 B；若 A，给出新 preset 的 id/name/description、roster/UI 影响、测试面
   （`preset-smoke` / `preset-structure` / `role-list-sync`）与回滚；若 B，给出 workflow schema
   常驻 analyst 的成本评估。
4. RFC 给出试点配方：同质层、N、team 编制、槽位账、成功/失败判据、与 team-only 基线的比较口径；
   试点本身可另卡，但配方必须可直接执行。
5. RFC 统一三处口径：lens §7（Lead 克隆只在 C 成立）、wave-execution 的「执行方式」、本卡的
   「计划卡正文点名」；不一致处逐条说明取舍。
6. 未批准前没有 preset / plan 模板 / skill 的行为改动；`pnpm verify` 绿，`md-links` 不红。
7. RFC 对 goal pause/resume 矛盾给出裁决：改 persona（不 pause / 换守卫）、承认由用户
   `/goal resume`（并说明对两点交互的影响）、或另开 bug 卡；不得把「model 能 resume paused」
   写成事实。

## 关闭条件

- RFC 成立并链接在本卡 `去向`；本卡按 `proposed` 归档（卡已结 ≠ RFC 批准）。
- RFC 被用户否决 → 本卡回 `推敲中`，按否决理由改 A/B/C 后重提；不静默归档。
- 实施与试点不在本卡：RFC 批准后另开实施卡/试点卡；本卡不冒充交付验收。
