---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-106：sentinelInAssistantText 扫全部 assistant 消息——早期回合的哨兵会让当前 open/failed 回放被当完成

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 收尾哨兵只扫当前回合 assistant 文本，历史哨兵不夺权（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`scripts/lib/replay-request.mjs`（`sentinelInAssistantText` / `assistantTextsOf`）。
> 消费 = `snapshot-replay-smoke` A 层、`dev/record-role-fixture` 收尾。

## 症状

`sentinelInAssistantText(logText, '探针完成')` 对整份日志的所有 assistant 消息做
`some(text.includes(sentinel))`：

```json
{"label":"currentDone","sentinel":true}
{"label":"oldDoneThenOpen","sentinel":true}
{"label":"oldDoneThenFailed","sentinel":true}
```

后两种是「早期回合已有哨兵，当前回合还没结束/失败」——当前回合没有哨兵，谓词仍 true。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/sentinel-any-history.mjs
```

## 影响与触发面

- `snapshot-replay-smoke` A 层用「turnCompleted + sentinel」判回放完成；早期 sentinel 会让
  A 层在当前回合失败/未结束时提前放行；
- `dev/record-role-fixture` 同样用哨兵判回合落定，可能提前写 fixture；
- 与 BUG-091（turnCompleted any-turn）是**配对**的两个 any-history 谓词；修一个另一个仍可假绿；
- 函数名/用途是「收尾哨兵」，语义应是**当前/最后一回合**的 assistant 文本。

## 根因（已证）

- `assistantTextsOf` 取全部 assistant/message；
- `sentinelInAssistantText` 用 `.some` 全局扫描，没有按 turn/最后 user prompt 限定；
- A 层/录制器没有额外校验哨兵属于最后一个回合。

## 修法候选（未实施）

1. 只检查最后一个 `turn/start` 之后的 assistant 文本；
2. 或只检查最后一条 assistant 消息（收尾哨兵应在最后回合末尾）；
3. 与 BUG-091 共用「当前回合」折算：找最后 turn 状态 + 其 assistant 文本。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] `oldDoneThenOpen` / `oldDoneThenFailed` 返回 false；`currentDone` 返回 true；
- [ ] A 层与录制器用新谓词后，多 turn 回放不提前放行；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 replay 日志多 turn 的真实分布；不证明 turnCompleted 的修复（BUG-091）能单独闭合假绿；
- 不证明渲染层 C 与 sentinel 的组合路径。

## 已落地（2026-11-13）

- 证据 = `tests/run/replay-request.test.mjs` BUG-106。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
