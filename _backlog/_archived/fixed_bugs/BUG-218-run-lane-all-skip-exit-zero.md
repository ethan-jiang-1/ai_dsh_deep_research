---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-218：run-lane 全 SKIP 仍 exit 0——`pnpm test:entry` 作为证据命令会被误读为通过

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行并拍板「全 SKIP = exit 2」） — 结论：全 SKIP = exit 2（verdictOf 三态矩阵），run-lane 头注与 guides/67 同步；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-namespace-move-residual-fixes.md)；审查：agent — 红证回放 + 全量 verify/test（2026-11-17）
>
> 位置：[checks/test/run-lane.mjs](../../../checks/test/run-lane.mjs)（汇总与 `process.exit`）；
> 契约 = [checks/AGENTS.md](../../../checks/AGENTS.md)「verdict 契约：exit 0=全绿 / 1=断言红 / 2=未跑（前置缺席）」；
> 老卡观察 = [2026-11-11 探索卡 §第六/第十轮观察](../settled_issues/2026-11-11-exploratory-test-strategy.md)（「run-lane 全 SKIP 仍 exit 0」）。
> 探索轮 = [2026-11-17 卡](../settled_issues/2026-11-17-exploratory-namespace-move.md) N8/M10。

## 症状

当一个车道的**全部条目都 exit 2（前置缺席/未跑）**时，runner 汇总 `PASS 0 / FAIL 0 / SKIP 1`，
但进程退出码仍是 **0**：

```sh
env -u DSH_HOME node checks/test/run-lane.mjs entry --all --only cold-start
# cold-start.entry: 需要 DSH_HOME…
# SKIP  checks/smoke/cold-start.entry.mjs（exit 2：前置缺席/未跑；0.1s）
# run-lane entry: PASS 0 / FAIL 0 / SKIP 1（0.1s）
# exit=0
```

`pnpm test:entry` 是文档里的证据命令（guides/67 §8 局部重跑、CI/交接的自述）；把 exit 0 当
「车道通过」的调用方会把「一条都没跑」记成绿。runner 的**文字**区分了 SKIP，**退出码**没有。

## 分诊与授权

- 严重级：P2 — 证据语义；不阻断运行，但违反「未跑 ≠ 通过」在机械出口上的承诺。
- 表面 / 边界：车道 runner（诊断面）/ ② 行为（退出码）
- DSH 不变量：fail-loud —— 未跑必须可与通过区分
- 触及面：none（runner 退出码；不改门禁判据）——但**改的是既有契约选择**，故转 `等人拍板`
- 授权：用户 2026-11-17 放行并拍板「全 SKIP = exit 2」→ 修复就绪 = P2 修复授权
- 批：2026-11-17 命名空间搬家探索（N8/M10）；同族 = [BUG-213](BUG-213-usage-exit-code-inconsistent.md)（usage=2）

## 复现

复现状态：稳定（0.1s，无副作用）。

```sh
env -u DSH_HOME node checks/test/run-lane.mjs entry --all --only cold-start; echo $?   # 0（应 2）
# 对照：真跑一件（source tools/env.sh 后 cold-start）→ PASS 1 / SKIP 0 / exit 0
```

## 根因（已证）

`run-lane` 的退出码只由 `FAIL` 数决定（有 FAIL=1，否则 0）；`SKIP` 只进汇总文字。
这是 2026-11-14 第六轮探索的有意取舍（诊断车道「自述未跑 ≠ 通过」），但作为 `pnpm test:entry`
的证据命令时，调用方拿不到机械出口；2026-11-17 的 CI 分层把更多证据推到夜间/手动后，这个
「全 SKIP 的 0」风险变高（本会话就复现了一次：未 source env 的 cold-start 显示 lane 绿）。

## 牵出的失败类

- M10 车道时延 + C7 假绿（汇总文字 ≠ 退出码）：同族 = BUG-213（usage=1）、BUG-215（tier 两义）。
- 这是**旧观察的复发/升级**，不是新机制；新卡引用老卡观察，不重开老卡。

## 修法

用户 2026-11-17 拍板：**选 1（全 SKIP = exit 2）**。

1. **全 SKIP = 2（已选）**：`PASS === 0 && FAIL === 0 && SKIP > 0` → exit 2；混合 PASS+SKIP 仍 0（有证据），
   有 FAIL → 1；
2. **任何 SKIP 且无 PASS = 2**（与 1 等价；未选，留作备选记录）。

已选方案同步更新 `run-lane` 头注与 guides/67 §8 的一句话，加三态矩阵测试（spawn 必定 exit 2 的假条目
或复用 cold-start 的无 env 形态）。

## 修复判据

- 全 SKIP 形态 exit 2；PASS+SKIP 混合 exit 0；有 FAIL exit 1（三态矩阵）；
- `run-lane` 头注/汇总文案与退出码一致；`pnpm test` 绿；
- 负控：把全 SKIP 分支改回 0 → 新测试红。

## 修复关联

与 [BUG-213](BUG-213-usage-exit-code-inconsistent.md) / [BUG-217](BUG-217-run-lane-no-match-lacks-all-hint.md)
同批（车道/证据出口）；建议同一评审决定「全 SKIP 的退出码」。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "checks/lib/shared/cli-exit.mjs",
    "checks/test/run-lane.mjs",
    "tests/checks/cli-exit-contract.test.mjs",
    "checks/smoke/cli-exit.e2e.mjs",
    "docs/guides/67-test-strategy.md"
  ],
  "red": {
    "command": "node checks/smoke/cli-exit.e2e.mjs",
    "exit": 1,
    "output": "run-lane 全 SKIP（未跑 ≠ 通过）: exit 0 ≠ 2"
  },
  "green": {
    "command": "node checks/smoke/cli-exit.e2e.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cli-exit.e2e.mjs"
  }
}
```
