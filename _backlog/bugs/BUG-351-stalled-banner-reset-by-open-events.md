---
status: 排查中
severity: P2
opened: 2026-11-21
---

# BUG-351：停摆横幅被「打开会话」注入的生命周期事件清零——watch-run 判停摆，驾驶舱不显示

> 严重级别：P2 ｜ 发现：2026-11-21 ｜ 状态：排查中 — 根因与红证已定位；按用户指令只报不修。
> 现场 = `runtime/e2e/`；合成会话 = `session-293ce364-d1e7-4a80-a2de-12fefc86495c`
> （dev home `research-workspace` 组，runtime 已 gitignore）。

## 症状

一个已经静默 31 分钟、最后回合留下 `TRANSPORT` 错误的 run，用户回到驾驶舱打开它：

- 离线 `watch-run` / `runHealthOf`（读 durable session log）判 `stalled=true`；
- 「研究状态」页签**不显示** BUG-348 新增的「⚠️ 运行停摆」横幅；
- 页签只显示「尚未确认 / 本会话尚未绑定研究 run」和「研究中，暂无可见动作」。
- 用户因此仍然不知道 run 已死，BUG-348 要修的「人回来才知道」场景没有被修好。

这是 BUG-348 的**可达性缺陷**，不是新的体验偏好：判据本身能算对，但驾驶舱拿到的输入
事件集里多出了打开会话时注入的「现在」时间戳。

## 证据

1. **durable log 上判据成立**：合成会话最后事件 = `turn/end` @ `2026-11-21T15:18:04.410Z`，
   之前有 `llm/retry`（`E2E injected transport failure` / `TRANSPORT`）。离线
   `runHealthOf(events, { now: Date.now() })` 输出：

   ```json
   {"quietMin":"31.0","stalled":true,"error":"E2E injected transport failure"}
   ```

2. **真实浏览器不显示**：`node --import tsx/esm runtime/e2e/check-status.mjs '<url>' session-293ce364-...`
   打开该会话并展开「研究状态」页签，`data-research-face = unbound`，页签文本不含「运行停摆」。
   截图 = `runtime/e2e/status-session-293ce364.png`。

3. **浏览器 snapshot 多出生命周期事件**：`runtime/e2e/ws-capture.mjs` 捕获的 follow 快照
   （完整帧 = `runtime/e2e/ws-frames-session-293ce364.json`）在最后的 `turn/end` 之后还有：

   ```
   session/end-seed@2026-11-21T15:45:27.929Z
   permission/preset@2026-11-21T15:45:27.937Z
   sandbox/mode@2026-11-21T15:45:27.938Z
   approval/policy@2026-11-21T15:45:27.938Z
   ```

   对**快照事件**跑同一 `runHealthOf`：

   ```json
   {"quietMin":7.15,"stalled":false,"error":"E2E injected transport failure"}
   ```

4. **两套 oracle 分歧且 durable log 无这些事件**：打开后 durable log 尾部仍是 `turn/end`
   （`tail -5` 实测），上述生命周期事件只在 follow 快照里；所以 `watch-run` 仍判停摆，
   驾驶舱判不成立。同一折叠、不同输入集正是诊断分裂点。

完整取证记录 = `runtime/e2e/evidence-bug351.md`。

## 根因

### 1. 主因：把「会话打开」当成 agent 活动

`packages/deep-research-pack/src/lib/run/health.ts` 的 `runHealthOf` 对**任何带数值
`time` 的事件**更新 `lastActivityAt`，没有区分 agent 回合事件与会话生命周期事件。
服务端在打开历史会话时向 follow 快照注入 `session/end-seed`、`permission/preset`、
`sandbox/mode`、`approval/policy`，时间戳 = 打开时刻；这些事件不落 durable log。
于是：

- 驾驶舱（`useStatusFeed` 折 follow 快照）的 `quietMs` 被清零；
- `watch-run`（读 durable log）仍看到真实静默。

### 2. 次因：观察期间 `now` 被 `useMemo` 冻结

`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`：

```ts
const health = useMemo(
  () => (journalEvents.length === 0 ? null : runHealthOf(journalEvents, { now: Date.now() })),
  [journalEvents],
)
```

`now` 只在 `journalEvents` 变化时取一次。会话打开后若再没有新事件，`health.quietMs`
永远是打开那一刻的值，30 分钟阈值不会在观察期间被跨过——没有 tick，也没有定时重算。
即使修掉主因（过滤生命周期事件），用户盯着页面等 30 分钟仍看不到横幅；必须同时补
「时间推进」的触发面。

## 修法方向（未实施；按用户指令只报不修）

- **活动谓词收窄**：`runHealthOf` 只把 agent 回合事件计入 `lastActivityAt`
  （`turn/start`、`step/*`、`llm/retry`、`tool/*`、`*/message`），显式忽略
  `session/*`、`permission/*`、`sandbox/*`、`approval/*` 等会话生命周期事件；或让
  服务端不在 follow 快照里给这些事件盖「现在」的时间戳。
- **补时间触发**：`useStatusFeed` 增加独立于 journal 的 30s–60s tick（或把
  `runHealthOf` 的 `now` 移出 `useMemo`，以 tick 为依赖），让横幅能在观察期间出现。
- **保持 oracle 同源**：不要为驾驶舱另写第二套静默判据；修完后 `watch-run` 与
  `stalledBannerLine` 必须对同一会话同一时刻给出同一结论。
- 不写 `run.md` 机器事实（沿用 BUG-348 的 derive-only 取向）。

## 修复判据

- 构造一个 durable log 静默 ≥31min、最后回合有 `TRANSPORT` 错误的会话（现有合成件
  `runtime/e2e/rewrite-sessions.mjs` 可复跑）：**打开驾驶舱「研究状态」页签即显示**
  「⚠️ 运行停摆」，无需刷新或等待。
- 负控：最后回合无错误、静默 45min 的会话（同合成件 B）**不显示**横幅。
- 观察期间跨阈值：页面打开时静默 29min，保持 2min 不产生新事件，横幅在 ≤60s tick 内
  出现，且无需 reload。
- `watch-run` 与页签在同一时刻对同一会话的 `stalled` 一致（同输入集回归）。
- 红证：把 `runHealthOf` 的活动谓词改回「任意事件」或将 `now` 固定为常量，上述两条
  各红一次；还原后绿。guard 落点建议 = `tests/cockpit/lib/run/health.spec.mjs`（fold）
  + 浏览器层用例（本卡证据链可升格为 `client-load` 相位或新 entry 用例）。
