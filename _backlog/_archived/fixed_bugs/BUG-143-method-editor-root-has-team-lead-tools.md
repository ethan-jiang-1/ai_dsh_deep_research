---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-143：method-editor 根会话仍拿到 Team Lead 工具与身份——实测在 method-editor 会话里 spawn_teammate / team_task / 写 run.md

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — method-editor persona 明写 Team 工具不是通道、不写 drt_/run、不起 run（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：vendor `tool-agent-team` 在 profile 级启用（非按 preset 门控）+ BUG-071 的 persona 纠偏只覆盖
> scout/analyst/critic。**本次是 BUG-071 的残留，第一次拿到运行时证据。**

## 症状

`runtime/harness-home/sessions/…/method-coach-0d7456dd-…` 的 header：

```
agentPreset = method-editor, delegationDepth = 0
```

该会话的工具调用统计（真实日志）：

```
spawn_teammate ×4, team_task_create ×9, team_task_update ×2, team_task_list ×11,
wait_agent ×21, list_agents ×2, send_message ×6, create_goal ×1,
ask_user_question ×2, write ×10, edit ×14, subagent ×3, ...
```

并且它**写了** `research-workspace/drt_cn-us-ai-perception/run.md`（真实 run bundle 的状态头）——
一个方法编辑会话按 Team Lead 的身份组队、建任务板、并起了一场 run。

## 复现

```sh
d=$(ls -d runtime/harness-home/sessions/*/method-coach-* | head -1)
zstd -dc "$d/session.v4.jsonl.zstd" | grep -o '"name":"[a-z_]*"' | sort | uniq -c | sort -rn | head
# 期望（method-editor 只应编辑方法库）：fs/read/skill 等；实测含 spawn_teammate/team_task_*/wait_agent
zstd -dc "$d/session.v4.jsonl.zstd" | grep -m1 'drt_cn-us-ai-perception/run.md'   # 写了 run.md
```

（该会话是 A 的方法库工作/UI 交互期间产生的真实会话，不是合成夹具。）

## 根因（已证 + BUG-071 的延续）

1. vendor `tool-agent-team` 在 profile 级启用、不按 preset 门控（BUG-071 已确认）；
2. BUG-071 的修复（方案 C）只给 **scout/analyst/critic** 加了 persona 纠偏，**method-editor 未被覆盖**
   （071 卡「下一层」的原话即此）——method-editor 既没有「Team 工具不是你的通道」的约束，也没有
   「不要起 run / 不要组队」的边界；
3. 该会话的工具面（spawn_teammate/team_task/create_goal/ask_user_question）就是 Lead 的全套；
4. 结果：一个**方法编辑**会话实际执行了 Lead 的动作（组队、写 run.md）。

## 影响面

- **越权行为**：方法编辑会话可以起 run、组队、占任务板、花模型的团队预算；
- **数据面污染**：它写的 `drt_*` 文件让「绑定会话」选择器把 coach 会话当 run 会话（直接引发
  [BUG-142](BUG-142-client-load-selects-method-editor-session.md) 的 X8 假红），状态页/归因也随之漂移；
- 用户的预期「方法编辑 = 改方法库」被打破，且没有机械边界（只有 persona 文字）。

## 修复判据（与 071 的方案一致，覆盖 method-editor）

1. method-editor 的 persona/技能面明写边界：**不组队、不起 run、不写 `drt_*`/run 文件**；Team 工具
   可见但不是通道；需要研究行为时交回 Lead；
2. 可选（更硬）：给 method-editor 的 preset 去掉 `tool-subagent`/团队相关行（若 vendor 支持按 preset
   门控——071 已确认 `tool-agent-team` Config 无此开关，则只能走 persona 或上游）；
3. 回归：真模型（或回放）观察 method-editor 会话的工具面不含 spawn_teammate/team_task_*，或给出
   「被请求起 run 时拒绝并交还 Lead」的行为；
4. 与 071 的现有三份 persona 纠偏同源措辞；`pnpm test` + `pnpm verify` 绿；docs/design 记录
   「method-editor 不是 Team 成员/通道」。

## 修复关联

[BUG-071](BUG-071-root-scout-injected-team-lead-identity.md) 的
**残留面**（当时只覆盖 scout/analyst/critic，method-editor 明确列为未覆盖）；与
[BUG-142](BUG-142-client-load-selects-method-editor-session.md)（选择器把 coach 当 run 会话）互为因果。
发现方式 = X8 失败现场追到绑定会话的 header 与工具面。

## 已落地（2026-11-13）

- 证据 = `tests/pack/presets.test.mjs` BUG-143。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
