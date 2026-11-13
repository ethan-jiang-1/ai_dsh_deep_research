> 状态：implemented

# HITL2 改为开放回合：goal 不再 pause/resume

## 决定

Lead 的 goal 生命周期改成「创建后保持 active，直到交付 complete」，**不再用 pause/resume
挡 ask**：

- **HITL1**（三问 + 计划确认卡）在 `create_goal` 之前，沿用默认 600s 的 timed ask。超时返回
  pending = **未批准**：只做不依赖答案的准备，不建组、不开工；用户答复作为新消息送达。
- **HITL2**（定稿/补研究/改说法）在 goal 创建之后，`ask_user_question` **显式传
  `timeout: -1`**。工具调用保持开放回合，goal-round-driver 不能在等待期间起新轮；答案未到
  就不进交付。timed 工具 schema 明说 `-1` 只用于「答案未到不能往下走」，HITL2 正是这个场景。
- **不 pause**：`update_goal action=pause` 与 `resume` 都要求当前 root turn 里有直接人工消息
  （`tool-goal/src/authority.ts` 的 `requireDirectHuman`），而 HITL2 常常由 teammate/subagent
  完成通知或 goal 轮触发，模型没有这个权限；即使 pause 成功，模型再 `resume` 也会被
  `GOAL_TOOL_RESUME_PAUSED` 拒绝（只有用户能 resume durable paused goal）。
- **resume 的唯一合法用法**：会话恢复/重开/fork 后 goal 是 active-but-disarmed；用户说「继续」
  时是直接人工 turn，模型可用 `update_goal action=resume` rearm。paused 不在本流程中产生。
- `complete` 在 active/blocked/paused 上都合法；交付时正常 `update_goal action=complete`。

参数名是 `timeout`；旧写法 `wait: -1` 不存在于本 pin 的 timed 工具 schema。

## 输掉的方案

- **保留「ask 前 pause、答后 resume」**：两半都非法（pause 需要直接人工 turn；resume durable
  paused 只归用户）。旧 persona 因此是一句假指令，HITL2 后 goal 会停在 paused、自动续轮失效。
- **只在 timed ask 返回 pending（超时）时 pause**：pause 同样受 `requireDirectHuman` 约束，
  在 goal 轮里照样失败；而且 pause 后仍需用户 resume，等于把同一个坑延后。
- **host 小插件自动 pause/resume**：可以让服务层绕过工具权限，但那是**替用户行使 goal 生命
  周期**，与 DSH「durable paused 归用户」的权限分割相反；还要新增 host 面（D7 例外）与
  ask/goal 关联状态。ask 工具已经提供 `timeout: -1`，不需要再造一个 mechanism。
- **去掉 tool-goal / 不再用 goal**：能绕开矛盾，但丢掉会话恢复后的 rearm、GoalBar 与中断续轮；
  问题不在 goal 本身，而在 pack 的用法。
- **HITL1 也用 `timeout: -1`**：HITL1 之前没有 goal，不存在空转；timed 600s 的 pending 兜底
  对无人值守更安全，保留。
- **继续把 ask 当普通工具、不区分两段**：HITL1 和 HITL2 的生命周期位置不同（goal 前/后），
  这正是旧指令失败的原因；分开写是必要的。

来源卡：[workflow wave 执行器](../../_backlog/_archived/settled_issues/2026-11-10-workflow-wave-executor.md)；
研究依据：[channel-policy v2](../../_backlog/_archived/research/orchestration-primitives/2026-11-10-channel-policy.md) §4/§7。

## 实际跑过的验证

- **红先**：新增/改写的 `tests/pack/presets.spec.mjs`「lead persona 钉 ask 硬约束」在旧
  persona 上红（17 pass / 1 fail：缺分档句、缺 `timeout: -1`、旧 `update_goal action=pause`
  仍在）；改 persona 后 **18/18 绿**。
- `pnpm verify`：全绿（含 `overlay-fresh`、`preset-structure`、`backlog-liveness`）。
- `pnpm test`：**1083 pass / 0 fail**。
- `DSH_SMOKE_REAL=1 node scripts/smoke/preset.e2e.mjs`：5 个 preset 全部真挂载
  **ALL PASS**（lead roster / session/create / skills 隔离）。
- `node scripts/smoke/snapshot-replay.entry.mjs`：改 persona 后 lead **B·persona 红 = 已捕获**；
  重录 lead fixture（`codeAnchor=cc492a18`、`vendor=b830ec95`、`recordedAt=2026-11-10T10:14:09Z`）
  并更新 `snapshot.json` 后 **4 场景 ALL PASS**（A 回放 + B 组装 diff + C 金标准）。
  C5 活动行金标准有一行因新录制的模型措辞重写（旧「dshbase.com…」→ 新「8 条结果…」），
  人审后接受；其余渲染面未变。
- `node scripts/smoke/l4-lite.e2e.mjs`：全角色（含 method-editor）assistant 响应 + scout
  `web_search` 工具调用 **ALL PASS**。
- 录制品人审：fixture 的 system/message 含新 persona 的 `HITL2 必须显式 timeout: -1` 与
  `GOAL_TOOL_RESUME_PAUSED` 句；`snapshot.json` 的 lead source 已更新，未改比对规则。

## 残余风险

- **HITL2 无人值守会保持 pending**：这是有意的（不烧模型调用、不越过交付拍板）；用户回来答完
  即续，或显式取消。旧 timed 600s 的「超时后 goal 继续跑」在交付拍板上是错误行为，不再保留。
- **模型是否遵守 `timeout: -1` 只有 prompt 级证据**：`l4-lite` 不覆盖 HITL2；wave 执行卡的
  P4 真 run 应在 HITL2 的 `tool/call` 参数里确认 `timeout: -1`。若模型漏传，plan/journal 应
  如实记「HITL2 用了 timed」，不声称已验证。
- **HITL1 pending = 未批准**：同样是 prompt 级约束；无机械闸。现有 HITL1 计划卡/决策记录是
  审计面。
- **pause 工具仍在**：pack 只是不再 instruct；模型若自发 pause 仍会成功（在有直接人工 turn
  时），之后只能由用户 resume。这是 DSH 的权限分割，不是本仓可改的。

## 环境状态

- 改：`packages/deep-research-pack/presets/lead.patch.yml`、`tests/pack/presets.spec.mjs`、
  `docs/guides/61-run-playbook.md`、`dev/research.overlay.yml`（生成物）。
- 录制品：`snapshots/replay/research-face/session.v4.jsonl`、`snapshot.json` lead source、
  `ui.expected.md` C5 一行。
- run 通道 mirror：`$DSH_HOME/profiles/research` 的 lead preset 已同步（录制用）；完整通道
  重启后生效（web 缓存 boot 时文本）。
