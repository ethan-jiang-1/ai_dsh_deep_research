---
status: 已修
severity: P1
opened: 2026-10-11
---

# BUG-022：上游流畸形事件当场终结回合——run 停摆的主因（本仓修不了，可数可恢复）

> 严重级别：P1（重要——2026-10-11 一天内多次打断交付链，含挖掘波整队失效）｜发现：2026-10-11｜状态：已修（2026-10-20 归档：由 BUG-024 socket 隔离修复；原根因假设撤回，见 §撤回与后继）

## 症状

模型回合在**第一步**即被终结，日志形态 = `assistant/attempt` 只有 finish chunk（`kind: "error"`）→ `step/end`
→ `turn/end.reason = { kind: "error", error: { message: "DeepSeek Messages stream: event precedes message_start",
code: "MALFORMED_RESPONSE" } }`。**会话不被终局化**（无 `end-seed`），但这一回合的工作就此停止——lead 侧
的表现就是"干到一半不动了"（操作侧一度读作"模型空响应/模型不会做"）。同族还有
`TRANSPORT: DeepSeek Messages transport failed`。

## 根因（假设）

上游流事件顺序违约（`event precedes message_start`：`message_start` 之前先到了别的事件）。发生在
**vendor 只读层**，本仓无法修——vendor 是 pinned submodule（只读铁律），模型客户端不归本仓。

## 撤回与后继（2026-10-20 审计）

**原根因假设撤回**：本卡 2026-10-11 的"上游流事件顺序违约"是当时未取证的解释。2026-10-13
[postmortem](../../../notes/postmortem/2026-10-13-llm-stream-malformed-storm.md) 用受控实验与字节取证
把根因定到**上游边缘对长命复用连接的相位性故障**（200 + 零响应头 + 未声明压缩体；同进程按会话分层），
修复 = [BUG-024](BUG-024-direct-path-malformed-storm-recurrence.md) 的 socket 隔离
（`dev/llm-socket-isolation.cjs`，boot-run 预载；LLM 流与 web_search 每请求一次性连接、永不复用）。
隔离 soak 832 响应 3 命中且 1 次重试自愈、22 会话零死亡（见 postmortem 与 BUG-024 卡）。

**后继**：本卡由 BUG-024 覆盖后归档；复发 = 新卡引用本卡（不重开）。仍值得盯的窗口：① socket
隔离被摘除/失效；② 隔离下再现 `event precedes message_start` 风暴；③ 新畸形形态。前两者先读
postmortem 与 [_backlog/triggers.md](../../triggers.md) 的对应触发行。

## 复现与分母（可复跑）

```sh
source dev/env.sh && node scripts/run-ops/provider-error-stats.mjs --days 3
```

2026-10-11 实测（判据 = "一次事故 = 一个被错误终结的回合"，抽取住
`scripts/lib/provider-errors.mjs`）：近 3 天 **17 个会话 / 46 次**（44 × `MALFORMED_RESPONSE` +
2 × `TRANSPORT`），跨 10-10 / 10-11 两天；命中面含 **lead 会话与队员会话**（如续跑会话
`session-96444dd5` 单场 5 次；09:50–09:56 的密集簇对应挖掘波整队失效那一段）。

## 恢复程序（已实测；工具自带送达对账）

1. **通道活着、只是回合停摆**（本卡形态）→ 不必新开：
   `node dev/run-kickoff.mjs --port 3083 --token <t> --session <会话 id> --prompt <恢复指令>`
   （exit 0 = 会话日志已出现这条 `user/message`；1 = 未对账 → 该会话多半已终局化，走第 2 条）；
2. **通道已死** → 重跑 `dev/boot-run.sh` + 新开 lead 会话（[guides/61 §5](../../../docs/guides/61-run-playbook.md)）；
3. **诊断纪律**：遇到"跑着跑着不动了"，先跑上面的统计命令确认是不是本卡形态，再决定恢复路径——
   不要先归因"模型不会做"。

## 牵出的失败类

**外部边界的单点失败放大成整场停摆**：一个 wave 的产出可能因一次畸形事件全废（本轮实测：队员集体
失败、evidence 5 卡在盘而 findings 未写，靠"文件即真相"续跑救回）。值得横切的问题是**部分产出的
落盘纪律**——哪些 wave 必须做到"任意时刻中断都能凭盘上文件续跑"，而不是靠回合不被打断。

## 修复关联

**已修（由 BUG-024 的 socket 隔离修复；本卡 2026-10-11 的"上游事件顺序违约"根因假设撤回，见 §撤回与后继）**——原记录的"未修（上游 seam）"不再为真；本仓侧四件仍有效：

- **可数**：`scripts/run-ops/provider-error-stats.mjs`（跨场分布）+ `scripts/lib/provider-errors.mjs`
  （抽取唯一语义源，`tests/run/provider-errors.test.mjs` 6 用例钉住"只认 turn/end、不双算 attempt"）；
- **可恢复**：`dev/run-kickoff.mjs --session`（续跑唤醒，自带 journal 送达对账），冒烟断言在
  `scripts/smoke/cdp-ask-smoke.mjs` 阶段②；
- **可诊断**：本节恢复程序 + guides/61 §5 步骤。
- **可缓解（事前拦截）**：pack bundle 层把 `MALFORMED_RESPONSE` 并入 `llm-deepseek` 的**有界**重试
  （`mode: normal` / `maxRetries: 5` / 出厂五项 + 该码；出厂集**不含**它，故此前一次畸形即终结）。
  组合正证据 = `dsh --profile web --patch dev/research.overlay.yml --dump-config` 可见该策略；
  理由与"未运行项（畸形流真被重试无现场证据）" = [Note](../../../notes/implemented/2026-10-11-provider-malformed-response-retry.md)。
  **生效时点** = 下一次通道启动（profile 镜像由 `boot-run.sh` 漂移检测重建）。

**复发即更新**：分母随每次复发由上述命令重算，不抄历史数字（口径正本 = 抽取模块 + 本卡）。

**归档与回归（2026-10-20）**：本卡已从暂停池迁入 fixed 池；复发 = 新卡引用本卡（不重开）。仍值得盯的窗口：① socket
隔离被摘除或失效；② 隔离下再现 `event precedes message_start` 风暴；③ 新畸形形态。前两者先读 postmortem
2026-10-13 与 [_backlog/triggers.md](../../triggers.md) 的对应触发行，不在本卡重开。
