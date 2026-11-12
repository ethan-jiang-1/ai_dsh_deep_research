---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-091：turnCompleted 对整份日志任一 `turn/end completed` 返回 true——后续 failed/open turn 仍被判回放完成

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — `turnCompleted` 只认最后一个 turn/start 之后的末条 turn/end（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`scripts/lib/replay-request.mjs`（`turnCompleted`）。
> 消费 = `snapshot-replay-smoke` A 层、`dev/record-role-fixture` 收尾。

## 症状

`turnCompleted(logText)` 用 `.some()` 扫整份日志，只要**历史上任一** `turn/end` 的
`reason.kind === 'completed'` 就返回 true：

```json
{"label":"singleCompleted","turnCompleted":true}
{"label":"completedThenOpen","turnCompleted":true}
{"label":"completedThenFailed","turnCompleted":true}
```

后两种是「先完成一回合，再开新回合但未结束/失败」——当前回合并未完成，谓词仍 true。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/turn-completed-any-turn.mjs
```

## 影响与触发面

- `snapshot-replay-smoke` A 层：回放日志若包含早期 completed turn、当前 replay 回合 open/failed，
  A 层可能提前放行；配合 `sentinelInAssistantText`（早期 assistant 文本已含哨兵）可假绿；
- `dev/record-role-fixture` 收尾：录制过程中若已有 completed turn、后续新 turn 未完成，
  可能提前判「回合落定」并写 fixture；
- 这是证据链的 fail-open：不是产品 UI 行为，但会让「回放/录制完成」的机械判据失真。

## 根因（已证）

- `turnCompleted` 没有按 turn 序号/时序跟踪，只做全局 `some`；
- 没有要求「最后一个 turn/start 之后有对应 completed turn/end」「日志末尾不在 open turn」；
- 调用方把它当成「当前回合完成」，语义比实现窄。

## 修法候选（未实施）

1. 从后往前/按 turn 状态机：最后一个 turn 必须有 `turn/end` 且 reason completed；若其后还有
   `turn/start` 无 end，返回 false；
2. 或返回最后一条 `turn/end` 的 reason，由调用方判断；
3. 增加负例：completed→open、completed→failed、completed→completed（最后一条为准）。

倾向 1（保持 boolean 合同，按时序取末回合）；本卡不改代码。

## 修复判据

- [ ] `completedThenOpen` 与 `completedThenFailed` 返回 false；`singleCompleted`/末回合 completed 返回 true；
- [ ] `snapshot-replay-smoke` A 层与 `record-role-fixture` 用新谓词后行为符合各自合同；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 replay 日志是否真的会出现多 turn；不证明 sentinel/渲染层组合的完整假绿路径；
- 不证明其它「任一事件」型收尾谓词（turnOpenOf 等）的时序语义。

## 已落地（2026-11-13）

- 证据 = `tests/run/replay-request.test.mjs` BUG-091/106。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
