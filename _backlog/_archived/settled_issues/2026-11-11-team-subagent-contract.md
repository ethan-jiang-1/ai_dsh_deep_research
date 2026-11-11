---
status: 已结
opened: 2026-11-11
---

# Team/subagent 控制合同纠偏：one-shot 语义与角色边界

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Feature ｜ 结论倾向：现在做 ｜ 可关闭：是
> 结论：implemented — Team/subagent 合同纠偏落地；one-shot / 角色边界 / 全 run 8 槽写入模型可见面；L1/L2/L4-lite 与 snapshot B 绿，行为探针记录残余。
> 去向：implemented — notes/implemented/2026-11-11-team-subagent-contract.md

**问题与期望结果：** 本仓的 Lead 同时挂 Team 与 `subagent`；Lead 看到的 `subagent` 工具
描述承诺 "child 用 `send_message` 回报、可 steer/continue"，但 Team 组合把全局
`send_message` 换成了 Team-scoped 工具（只寻址 Team 成员），角色 child 又没
`send_message`。真模型探针已复现：Lead 按描述把 subagent id 传给 `send_message`，得到
`Error: active teammate "<id>" not found`。同时 `design/10 §4` 仍把 critic 预设的
“无 ask/subagent”说成“工具面即职责边界的机器表达”，而 critic teammate 实际看得到这些
工具。期望结果 = 模型可见合同与真实组合一致；Lead 不再把 subagent 当可 steer 的 Team
成员；teammate 的角色边界在派发合同里显式；8 槽公式覆盖普通 worker。

**当前情况：**

- 机制：`spawn_teammate` 无 preset 字段；teammate composeFrom Lead；Team profile 禁用
  `tool-subagent-control` / `list-agents`；role child（critic/analyst）无 `send_message`。
- 证据：`_backlog/_archived/research/orchestration-alignment/2026-11-11-behavior-evidence.md` §2
  （Lead `subagent` → `started subagent eaff47b0…` → `send_message` target 同 id →
  `active teammate "eaff47b0…" not found`；child 结果经 settlement notice 到达）。
- 证据：同页 §3（critic teammate 在被 prompt 邀请 `ask_user_question`/`subagent` 时
  零工具调用，明确援引 HITL 只由 Lead 发起——G1 是潜伏，不是已越界）。
- 证据：`_backlog/_archived/research/orchestration-alignment/2026-11-11-session-evidence.md` §2
  （20 个 teammate：7 个一轮 / 13 个多轮；零边界调用）、§5（峰值并发 5，未撞 8）。
- 文本矛盾：`docs/design/10-architecture.md §4` “critic 刻意无 ask-user/subagent——工具面
  即职责边界的机器表达”；`docs/design/20-roles.md §0` 已写 teammate 加载 Lead 组合，
  但 `design/10` 没带限定；D16 / `design/10 §3` 仍说“subagent 强制 one-shot”，而当前 pin
  已无 `backgroundMode`，实际是“provider 可续但控制面不可达”。

**未决问题：** 无阻塞性选择；本卡只改模型可见合同、docs 与测试，不改组合、不加 preset。
唯一可选项 = 是否同时加一个“subagent 控制面审计”（扫描 Lead 对 child id 的
`send_message` / `TEAM_MEMBER_NOT_FOUND`），建议作为验收证据而非新门禁。

**下一步：** 按 §方案改 `team-assembly` / Lead persona / `design/10` / D16 措辞；
重录 snapshot B；跑 Phase 3 的 `subagent-steer` 探针作行为验收；`pnpm verify` 绿后
写 Note 并关闭。

## 已知与未决

- 已知：Team `send_message` 按成员名解析；subagent child 不是成员；role child 没有
  `send_message`；settlement notice 是 child 结果的实际到达通道。
- 已知：角色边界文本在本探针中有效；不要因为“工具可见”就升级为“必须改主通道”。
- 未决：是否把“Lead 对 subagent child 调 send_message”做成 run 级审计；本卡默认
  只做合同 + 行为探针，审计另议。

## 方案与取舍

1. **合同（必做）**：`team-assembly` 增加“Team 组合里的 subagent”块：
   - subagent child 不是 Team 成员；Team `send_message` / `interrupt_agent` 不能寻址它；
   - 不要对它调 `send_message`；以 settlement notice 为结果通道；
   - 在本组合里把它当 **one-shot**；provider 的 continuable 能力不等于控制面可达。
   Lead persona 的“单点快捷查证用 subagent”后加一句指向该块。
2. **角色边界（必做）**：`team-assembly` 的派发模板加一段角色边界：
   teammate 不是 Lead，不得调用 `ask_user_question` / `create_goal` / `present` /
   `spawn_teammate`；`subagent` 只在任务明确要求时用；需要拍板写 gap 给 Lead。
3. **docs 纠偏（必做）**：`design/10 §4` 区分 root preset 与 teammate 会话；
   `design/10 §3` / D16 把“强制 one-shot”改成“provider 可续但控制面不可达 → 实际
   one-shot”；`design/20` 的“名册角色名 ≠ 会话 preset”保持并加一句“角色边界靠派发
   合同 + 人工验收，不靠 preset”的限定。
4. **槽公式（必做）**：`team-assembly` 的 8 槽公式从“有脚本层时”扩展到全 run：
   team 成员 + 所有 subagent worker + executor + workflow child ≤ 8；每次派工前更新
   `plan.md` 的 budget 注记。
5. **证据（必做）**：重录 snapshot B（persona/skill 文案变）；用现有
   `probe-behavior.mjs subagent-steer` 作行为验收；可加一个 keyless 文本断言（合同块
   在场），不新增语义门禁。

**不选**：从 Lead 移除 `tool-subagent`（会切断 D44 claim 复核的唯一通道）；
改 vendor 工具描述（不可控）；为这个合同加中心调度器（违反 DSH 原生）。

## 验收标准

1. `team-assembly` 含“Team 组合里的 subagent”块（namespace + one-shot + settlement
   notice + 不调 send_message），Lead persona 指向它；文本可被 grep 到。
2. `team-assembly` 的派发模板含角色边界四禁（ask/goal/present/spawn_teammate）与
   “subagent 仅在任务要求时用”；一份真 run 的 spawn prompt 抽样符合。
3. `design/10 §4` 不再对 teammate 声称“工具面即职责边界的机器表达”；
   `design/10 §3` / D16 的“强制 one-shot”改为“provider 可续、控制面不可达”。
4. `team-assembly` 的槽公式覆盖全 run（team + worker + executor + workflow child ≤ 8），
   不再只写在“有脚本层时”。
5. 行为验收：`probe-behavior.mjs subagent-steer` 中 Lead 不再把 child id 当 Team
   target；若仍尝试，session 证据显示它被合同纠正；不再出现
   `active teammate "<id>" not found` 作为“预期路径”。
6. snapshot B 重录；`pnpm verify` 全绿；`pnpm test` 相关测试绿；Note
   `notes/implemented/2026-11-11-team-subagent-contract.md` 记录证据。

## 关闭条件

- 上述 1–6 全绿；Note 与卡同一变更归档；卡状态 `已结`。
- 若行为探针显示模型仍稳定撞 namespace，但合同文本已正确：不静默关，转
  `等人拍板`（是否加 run 级审计/是否接受“模型偶尔试错”）。

## 证据

- [Phase 3 行为证据](../research/orchestration-alignment/2026-11-11-behavior-evidence.md)
- [Phase 1 会话证据](../research/orchestration-alignment/2026-11-11-session-evidence.md)
- [研究总材料](../research/orchestration-alignment/2026-11-11-orchestration-alignment.md)
