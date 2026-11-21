---
status: 修复落地
severity: P2
opened: 2026-11-21
---

# BUG-348：长 run 遇上游流错误后静默停摆数小时，观察面无告警、恢复只能靠人回来

> 严重级别：P2 ｜ 发现：2026-11-21 ｜ 状态：修复落地（2026-11-21）— 判据/证据已记；浏览器复验 NOT-RUN（主机 load 15–20），待复跑（告警面/重试归属与 DSH 重试策略相关）
>
> 现场 = `runtime/e2e-2026-11-20/`；run = `research-workspace/drt_sodium-ion-bess/`；
> 会话 = `session-168734ce-...`。

## 症状

run B（P5 多维对比，24 张证据卡已落）在 2026-11-20 23:38 进入等待 worker 的 idle 回合后，
上游开始间歇失败；此后约 3 小时里按小时级重试，全部 TIMEOUT/TRANSPORT，最终 02:35
`turn 3 end error`。之后**没有任何新事件**，直到 08:47 人工发恢复指令才重新开工。

操作者视角：页面不刷新/不看就完全不知道 run 死了；聊天里没有"需要恢复"的告警，状态页
也没有持续红条（小时级 goal 回合不断产生新 turn，`streamFailure.dead` 的"末回合死亡且无新回合"
条件不成立）。

## 证据

```sh
node --import tsx/esm probes/analyze/stream-diagnostics.mjs --session session-168734ce-cf68-449b-b9d4-05ffa3465428
# 15:28…18:35 UTC 连续失败（TIMEOUT/TRANSPORT），最后一次 turn 3 end error
node --import tsx/esm probes/analyze/session-events.mjs session-168734ce-cf68-449b-b9d4-05ffa3465428 --tail 0
# 02:35 后无事件；08:47 人工唤醒 → turn 4
```

## 根因（待定方向）

1. 重试由 goal round / llm 重试各自负责，失败不落盘为可观察状态（run.md / journal 无标记）；
2. 观察面只识别「末回合死于流错误且无新回合」，小时级重试把该信号冲掉；
3. 没有任何"run 停摆 N 分钟"的判据。

## 修法（需拍板）

- 观察面加「最后活动时间 + 最后回合错误」判据：超过阈值（如 30 min 无事件且最后回合 error）
  显示可行动横幅（含恢复命令/话术）；
- 或在 run.md 写 `phase: stalled` + 原因，让文件事实可见；
- 恢复话术沿用 guides/61 §5（run-kickoff --session），不改机制。

## 修复判据

- 用本卡会话日志重放：02:35–08:47 窗口在状态页显示停摆告警与恢复指引（不冒充"研究失败"）。
- 正常长回合（worker 在飞、无错误）不误报（负控）。
- 人工唤醒后告警消失。


## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/health.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/lib/faces.json",
    "checks/lib/shared/run-state.mjs",
    "probes/analyze/watch-run.mjs",
    "tests/cockpit/lib/run/health.spec.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm --test tests/cockpit/lib/run/health.spec.mjs",
    "exit": 1,
    "output": "注入回归：stalled 只看 quietMs（去掉 lastTurnError 条件）→ 「静默但无错误」例红"
  },
  "green": {
    "command": "node --import tsx/esm --test tests/cockpit/lib/run/health.spec.mjs",
    "exit": 0,
    "output": "6 tests 全过；真日志重放 1795199750749→1795222075086 窗口：stalled=true / quiet=372min / error=DeepSeek Messages transport failed"
  },
  "guard": {
    "path": "tests/cockpit/lib/run/health.spec.mjs"
  }
}
```

未跑项：`client-load.entry --seed` 因主机 load 15–20 判 NOT-RUN（exit 2）——横幅的浏览器渲染未复验；主机负载下降后同命令复跑，绿后再归档。

可关闭：否
