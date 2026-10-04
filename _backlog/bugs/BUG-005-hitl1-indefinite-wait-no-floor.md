# BUG-005：HITL1 ask 带 wait:-1 无限期等待——timed 护栏被模型参数绕过 + 活等待无断连地板，无人值守 run 悬挂 28 分钟

> 严重级别：P1（重要——"用户不在场"这一被文档明确支持的场景整体失效：timed 兜底、文本消息兜底双双落空）｜发现：2026-10-05｜状态：活跃

## 症状

run 通道内（dr_open-weights-swebench-parity）lead 抛出 HITL1 ask 后：

1. **600s timed 兜底未生效**：lead 的 `ask_user_question` 调用显式携带 `wait: -1`
   （无限期等待）——preset 钉的 `mode: timed, timeout: 600`（lead.patch.yml:54-61）只是
   **默认值**，模型一个参数就把护栏整个绕过（timed 分支根本不进，直接走 vendor
   timed.ts 的 indefinite `ask()` 形态）；盘侧 `tool/call` 之后 28+ 分钟无任何
   tool/result（无 pending、无错误）。
2. **文本消息兜底不消费**：按 61 §4"答复作为新消息"语义向会话发应答文本 → 盘侧记为
   `agent/inbox/spliced target:next-turn`（seq 49）——但挂起的 turn 永不收尾，next-turn
   永不到来，消息静躺。61 §4 描述的恢复语义隐含"pending 已发生"前提，对 wait:-1 的活
   等待不成立。
3. **活等待无断连地板**：代答浏览器（hitl-answer 泄漏的僵尸 client，见 BUG-004 放大器）
   死亡、websocket 归零后，宿主侧活等待既不 delegate（无下一个 client）、也不抛
   NO_PROVIDER、也无 deadline——无限期悬挂。只靠人工：新开真浏览器逐题答满（BUG-004
   卡内反证路径）才落盘侧 answer 事件救活 run。

## 根因（假设，三层各占一份）

- **本仓 preset/persona 层**：`wait` 参数（vendor `TIMED_WAIT_PARAMETER`）对模型可见，
  schema 描述写"Use -1 only when an answer is required before proceeding"——HITL1 恰是
  "要先拿到答案才开工"的形态，模型选 -1 **合规但灾难**。persona/run 手册从未告诉 lead
  "无人值守场景禁用 -1"；preset 的 `timeout: 600` 意图（超时放行＋保持可答）被模型单参
  覆盖，两层意图打架时模型赢了。
- **vendor 机制层**：`askTimed` 的 deadline 只在无 client claim 时走时（timed-wait.ts
  `schedule()` 的 `claims.size > 0` 早退）——"有人在看就不超时"的语义合理，但活等待
  （indefinite 形态）连这个 deadline 都没有，client 断连后的孤儿等待没有任何地板
  （不 delegate、不 NO_PROVIDER、不超时）。断连鲁棒性缺口。
- **runbook 层（61 §3/§4）**：文本消息兜底被写成无条件可用，实际只在"pending 已发生"
  时可用（`userQuestions/answer` RPC 也只认 continued 集——活等待直接返回 false）。

## 复现

```sh
# 1. 会话内起 lead，HITL1 问询 → 观察盘侧 ask 调用参数（wait: -1 在场）
# 2. 不作答，等 700s+ → 无 pending 落盘（对照：模型不带 wait 参数时 600s 准时 pending）
# 3. 期间发 session/prompt 文本应答 → 盘侧只记 inbox/spliced(next-turn)，turn 不动
# 4. 连着卡的 client 断开 → 仍无任何结算事件
# 救活：真浏览器打开会话，逐题答满 + Submit（BUG-004 卡内反证路径）
```

## 修复方向（分层）

- **本仓（最小修）**：persona「HITL 两点」行加一句模型可见契约——"ask 不得携带
  `wait: -1`（无人值守的 run 通道必须保留 timed 放行＋保持可答语义）"；或
  guides/61 §3 补"文本兜底仅对 pending 态可用，活等待只能走浏览器"。
- **vendor（正修）**：活等待形态在 client 断连后应 delegate/NO_PROVIDER 落地，而非孤儿
  悬挂；或 timed 模式下服务端 clamp 模型显式 -1 的能力（配置侧 `allowIndefinite: false`）。
- **代驱工具（ hitl-answer）**：BUG-004 修复同 diff 顺带——重试前先判活等待/continued
  两种形态，活等待直接走真浏览器路径，别再降级文本。
