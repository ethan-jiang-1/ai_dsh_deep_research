---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-416：run-kickoff 用 UTC 切片写 §Decisions 日期，本地 00:00–08:00 窗口记账成前一天

> 严重级别：P2 ｜ 发现：2026-11-24 ｜ 状态：已修 — 结论：人读日期统一走 localDateStr（run-kickoff / runtime-clean）；UTC 切片守卫扫 tools/checks；去向：implemented — 批 Note [2026-11-24-encoding-equivalence-and-gate-prerequisites](../../../notes/implemented/2026-11-24-encoding-equivalence-and-gate-prerequisites.md)；审查：agent — 机械门禁（lint / typecheck / spec / checks / verify）+ 定向回归；修复落地记录见下。

## 症状

`tools/channel/run-kickoff.mjs` 在收口时写 HITL 代理代答的 provenance 行，日期取

```js
date: new Date().toISOString().slice(0, 10)
```

在 Asia/Shanghai（UTC+8）本地时间 **00:00–08:00** 之间，UTC 日期是**前一天**：于是

- `question.md §Decisions` 里出现「2026-11-23」的拍板行，而它实际发生在 2026-11-24；
- 与 `hitl-answer.mjs`（同批代答走 `localDateStr()`）写下的行可比时，**append-only 次序被打破**（交付审阅行日期早于立项定稿行）——正是 BUG-017 当初记录的失败形态。

## 分诊与授权

- 严重级：P2 — 人读拍板行日期系统性偏一天（每日有 1/3 的时间窗触发），破坏 §Decisions 的时序可信度；不影响机器时间戳。
- 表面 / 边界：run 通道工具（[run-kickoff.mjs](../../../tools/channel/run-kickoff.mjs)）/ ① 代码（时间口径）。
- DSH 不变量：人读日期 = 系统本地日（本仓正本 = `checks/lib/shared/local-date.mjs` 头注：**不要用 UTC ISO slice 冒充本地日**）。
- 触及面：none — tools + 单测。
- 授权：修复就绪（P1/P2 修理型，根因/修法/判据齐）——本批直接落地；批 = encoding-and-gate-gaps-412-423。
- 批：encoding-and-gate-gaps-412-423。

## 复现

复现状态：稳定 — 固定时刻即可证明两条写法给出不同日期；再用同一 epoch 走 `localDateStr` 对照。

```sh
TZ=Asia/Shanghai node --input-type=module -e '
import assert from "node:assert/strict";
import { localDateStr } from "./checks/lib/shared/local-date.mjs";
const epoch = Date.parse("2026-11-24T00:30:00+08:00");
const utcSlice = new Date(epoch).toISOString().slice(0, 10);
const localDay = localDateStr(new Date(epoch));
console.log("UTC_SLICE=", utcSlice, "LOCAL=", localDay);
assert.equal(utcSlice, localDay);
'
```

实测：`UTC_SLICE= 2026-11-23` / `LOCAL= 2026-11-24`（断言红）。

## 根因（已证）

[run-kickoff.mjs](../../../tools/channel/run-kickoff.mjs)（约第 100 行）：

```js
const row = closingProvenanceRow({ cardKey: closing.cardKey, text: prompt, date: new Date().toISOString().slice(0, 10) })
```

同一仓已有正本 helper [local-date.mjs](../../../checks/lib/shared/local-date.mjs)（`localDateStr()`），且 `hitl-answer.mjs`（同批代答）与 `export-dist.mjs`（打包日期）都在用它——只有 run-kickoff 这一处残留 UTC 切片。

## 牵出的失败类

- 同机制第 2 次（BUG-017 的同类残留实例）｜处置：点修 + 加一条「人读日期不得用 UTC 切片」的机械守卫（源码级：`toISOString().slice(0,10)` 出现在人读日期上下文即红，白名单 = local-date 自己的实现）。

## 修法方向

- 改用 `localDateStr()`（`import { localDateStr } from '../../checks/lib/shared/local-date.mjs'`）；
- 守卫：扫描 `tools/` 与 `checks/`（除 `local-date.mjs`）中的 `toISOString().slice(0, 10)`，命中即红并指向 helper；
- 回归：`TZ=Asia/Shanghai` 下用固定时钟跑一次 closing provenance，断言日期 = 本地日。

## 修复判据

- 复现脚本断言为绿；
- run-kickoff 的 provenance 行在 `TZ=Asia/Shanghai` 的 00:30 时刻写本地日；
- 新守卫在故意写回 UTC 切片时判红（负控）；
- `pnpm verify && pnpm test` 全绿。

## 修复落地（2026-11-24）

红证配方：把 run-kickoff 的 closing provenance 改回 `new Date().toISOString().slice(0, 10)`（runtime-clean 同理）→ 守卫红。

```json fix-evidence
{
  "changes": [
    "tools/channel/run-kickoff.mjs",
    "tools/clean/runtime-clean.mjs",
    "tests/checks/shared/local-date-usage.test.mjs",
    "checks/README.md"
  ],
  "red": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-416' tests/checks/shared/local-date-usage.test.mjs",
    "exit": 1,
    "output": "UTC 切片守卫红（run-kickoff 仍写 toISOString().slice(0, 10)）"
  },
  "green": {
    "command": "node --import tsx/esm --test --test-name-pattern 'BUG-416' tests/checks/shared/local-date-usage.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shared/local-date-usage.test.mjs"
  }
}
```
