# 回合落定判据收成一处：哨兵只认 assistant 文本 + `turn/end` 显式态

> 状态：implemented

## 决定

「canned 回放回合是否走完」的判据从两处各写一份、且消费侧写得比录制侧弱，收成**一处正本 + 两个消费方**：

1. **判据正本 = `scripts/lib/replay-request.mjs` 的三个纯函数**：`assistantTextsOf(logText)`、
   `sentinelInAssistantText(logText, sentinel)`、`turnCompleted(logText)`。
2. **哨兵只认 assistant 文本**：`探针完成` 这类收尾哨兵**写在录制 prompt 里**，用"整份日志 includes"判回合完成，
   会被 `user/message` / `agent/inbox/spliced` 的**回显**满足——判据必须在 `assistant/message` 的文本里找。
   这是录制器 2026-10-13 已经踩过并收紧过的坑（[malformed 风暴复盘](../archived/2026-10-13-llm-stream-malformed-storm.md) 落地件①），
   但**消费侧（snapshot-replay-smoke A 层）没跟上**：同一个坑在冒烟里活了三天。
3. **另加回合结束显式态**：A 层同时要求日志出现 `turn/end` 且 `reason.kind === 'completed'`——
   把"推断回合走完"换成"等显式状态"（scripts/AGENTS「等待显式状态」）；非 completed 即判回放未走通（fail-loud）。
4. **消费方**：`scripts/smoke/snapshot-replay-smoke.mjs`（A 层回合落定）与 `dev/record-role-fixture.mjs`
   （录制收尾）共用本正本——两份抄写消灭，判据不会再单边漂移。

## 输掉的方案

- **修 C 层 / 加宽 BUG-027 的 C0b 就绪谓词**（BUG-030 建档时的假设）：**证伪**——C0b 在失败场照常工作，
  缺的那行不是"没等到"，是**回合根本没产生那条消息**（A 层提前放行 → B/C 在回合在飞时执行 → 场景收尾 kill 掉 web，
  那条行永远不会再来）。修下游等于给症状打补丁。
- **把活动行等待从"两次采样稳定"延长/加强**（C 层现状）：稳定窗 ≠ 就绪——它正是 BUG-027 记过的
  "部分数据已稳定就放行"陷阱；上游放行时刻错了，下游等多久都是赌。
- **只改冒烟、不动录制器**：留着两份抄写，下一次仍然只改一边（本缺陷就是这么来的）。
- **A 层只认哨兵、不加 `turn/end`**：哨兵落在末条 assistant 文本时回合"基本"结束，但"基本"是推断；
  显式态能顺带把死回合（无 `turn/end` 或非 completed）判成红，而不是靠下游超时暴露。

## 实际跑过的验证

- **单元级（keyless，确定性）**：`tests/run/replay-request.test.mjs` 新增三例（哨兵只在 prompt 回显 → 不算落定；
  在 assistant 文本 → 落定；`turn/end` 缺席/非 completed → 未结束）。**先红**（模块不提供该导出）→ 实现 → 44/44 绿。
- **现场级反证（确定性，非概率）**：把冒烟 A 层临时改回全文 `includes` 并在放行点打印回合状态 →
  实测 `回合已完成=false` 即放行（同一跑里 C0b 随即以「挂载 3/4」红）——**上游提前放行可确定性复现**；
  还原修复版 → 放行点回合已完成。两次留档。
- **连绿判据**：连续 **5 次** `snapshot-replay-smoke` 全绿（exit 0 · C5 PASS 各 5/5）——修复前当日实测 4 红 / 6 跑。
- **不静默收窄**：B/C 层断言与渲染金标准 `ui.expected.md` **零改动**（比对器未动，只改"何时放行"）。
- **L0**：`pnpm verify` 全绿、`pnpm test` **471/471**。

## 环境状态

只动 keyless 面（一个 lib 加三个纯函数 + 冒烟 A 层判据 + 录制器改消费共享件 + 契约测试 + 本 Note）；
无 pack 行为改动、无凭据面、无真模型调用。缺陷卡 = [BUG-030](../../_backlog/_archived/fixed_bugs/BUG-030-snapshot-replay-c5-activity-row-flicker-recurrence.md)。
