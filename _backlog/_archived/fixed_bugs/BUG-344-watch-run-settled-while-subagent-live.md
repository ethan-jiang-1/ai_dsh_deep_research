---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-344：watch-run 在子代理仍在飞时误报 RUN-SETTLED

> 严重级别：P2 ｜ 发现：2026-11-20 ｜ 状态：已修（2026-11-21）— 结论：runSettled 追加「无在飞子代理」；子会话日志不可读 = 未知不落定；watch-run 读子会话；审查：agent — 注入红回归；去向：none — 机械修复
>
> 现场 = `runtime/e2e-2026-11-20/`；run = `research-workspace/drt_pg-latest-stable/`。

## 症状

lead 在 21:58:29 派出 critic subagent，21:58:45 结束当前 turn（等 subagent 回包）。21:59:05
`watch-run` 打印：

```text
STATE: RUN-SETTLED（⚠ present 声明缺席——偏差，需记档）
```

而 critic 直到 22:02:00 才完成，lead 在 22:02:30 左右被唤醒继续。操作者若相信 settled 会
停止盯场，HITL2 到达时无人应答（HITL2 是 indefinite wait）。

## 根因

`checks/lib/shared/run-state.mjs` 的谓词：

```js
runSettled: readable === true && turnOpen === false && finalWritten === true
```

不看会话里是否仍有在飞 subagent。DSH 的 subagent 完成会唤醒父会话开新 turn，所以「turn 关闭」
不等于「run 停」。

## 复现

```sh
node --import tsx/esm probes/analyze/watch-run.mjs session-93752db0-e400-4ec3-bf9a-de7641f76184
# 21:58:45 turn 关闭 → 立即 RUN-SETTLED；子会话 89387e7a… 当时仍在跑
```

## 修法

`runSettled` 追加「无在飞子代理」条件：从会话事件的 `subagent/catalog`（spawn）与完成/终局
信号求差集，或退化为「turn 关闭且日志静默 ≥N 秒」。判据住 `run-state`，watch-run 只消费。

## 修复判据

- 夹具：spawn + turn 关闭 + final.md，子代理未完成 → **不** settled；补完成事件后 → settled。
- 真场重放：本卡 run 的 21:59 时刻不再判 settled；22:10 交付后判 settled。
- `pnpm test` 的 run-state 矩阵通过；`probes/analyze/watch-run.mjs` 行为同步。


## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/run-state.mjs",
    "probes/analyze/watch-run.mjs",
    "tests/run/shared/run-state.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/shared/run-state.spec.mjs",
    "exit": 1,
    "output": "注入回归：删掉 liveSubagents 条件 → 父回合结束+final 在场即报 settled（1 例红）"
  },
  "green": {
    "command": "node --test tests/run/shared/run-state.spec.mjs",
    "exit": 0,
    "output": "28 tests 全过：catalog 在飞 false、子回合未终 false、子会话终局才 true"
  },
  "guard": {
    "path": "tests/run/shared/run-state.spec.mjs"
  }
}
```

可关闭：是
