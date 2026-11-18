---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-243：`boot-run.sh` 直起不做非默认 profile 守卫——`DSH_RUN_PROFILE=research` 绕过漂移门

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：boot-run 直起非默认 profile fail-loud（DSH_ALLOW_STALE_PROFILE=1 逃生）；静态契约 + 真入口红证；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-move-residuals-ii.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 三干净室入口
>
> 位置：[tools/channel/boot-run.sh](../../../tools/channel/boot-run.sh) 第 21 行（`PROFILE="${DSH_RUN_PROFILE:-deep-research}"`）；
> 守卫只存在于 [tools/channel/run-driver.mjs](../../../tools/channel/run-driver.mjs)（见 [BUG-242](BUG-242-run-driver-profile-flag-bypasses-guard.md)）。
> 探索轮 = [搬家残差 II](../settled_issues/2026-11-18-move-residuals.md) B。

## 症状

`run-driver` 对非默认 profile 有 `staleProfileMessage` 守卫（BUG-237）；但 `boot-run.sh` 是独立的
文档化启动路径（`bash tools/channel/boot-run.sh`、`pnpm` 启动说明），**不引用** profile-guard：

```sh
DSH_RUN_PROFILE=research bash tools/channel/boot-run.sh
# PROFILE=research；旧的 0.3.1 mirror 被直接起；无任何 stale 拒绝
```

守卫的覆盖率 = `run-driver` 的 up/probe，而不是「所有起通道的入口」。`boot-run` 还自己设
`DSH_RUN_PROFILE`，与 `run-driver` 的环境变量模型重叠；两者应共用同一份判据。

## 分诊与授权

- 严重级：P2 — 运行态/旧镜像；文档化入口可绕过 237 的修复。
- 表面 / 边界：run 通道入口 / ② 行为（shell + profile）
- DSH 不变量：fail-loud；守卫必须在所有入口生效，而不是一个包装器
- 触及面：none（shell 守卫 + 测试）
- 授权：自授权（P2 修理型）
- 批：搬家残差 II（B）

## 复现

复现状态：稳定（读码；不需要真起）。

```sh
grep -n 'PROFILE=\|profile-guard\|stale' tools/channel/boot-run.sh | head
DSH_RUN_PROFILE=research bash tools/channel/boot-run.sh   # 无 stale 拒绝，直起
```

## 根因（已证）

BUG-237 的修法只把 `staleProfileMessage` 接进 `run-driver`；`boot-run.sh` 是 bash 独立入口，
没有共享判据；`profile-guard.mjs` 没有 shell 侧消费。`checks/AGENTS` 的入口测试也不覆盖 boot-run 的
profile 选择。

## 牵出的失败类

- 运行态 C5/C7（旧镜像 + 守卫只覆盖一个入口）；与 242 同族，但入口不同。
- 类级方向 = profile 守卫是**启动层**判据，所有启动路径共用；或者 boot-run 只接受 run-driver 传入的
  已校验 profile。

## 修法

1. `boot-run.sh` 在 `PROFILE` 解析后调用同一判据：`node -e` 引入 `staleProfileMessage`，非默认且无
   `--allow-stale-profile`/`DSH_ALLOW_STALE_PROFILE=1` → exit 2；
2. 或把 boot-run 收为 run-driver 的子调用，禁止直接执行非默认 profile；
3. 测试：`DSH_RUN_PROFILE=research bash tools/channel/boot-run.sh` → exit 2；默认/显式放行 → 进入；
4. `run-driver` 与 boot-run 的文案同源（profile-guard）。

## 修复判据

- 直起非默认 profile → exit 2；显式 `--allow-stale-profile`/env 放行；
- 默认 `deep-research` 行为不变；`pnpm test` / 入口契约绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "tools/channel/boot-run.sh",
    "checks/lib/channel/profile-guard.mjs",
    "tests/checks/channel/profile-guard.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/channel/profile-guard.test.mjs",
    "exit": 1,
    "output": "not ok 3 - boot-run 直起守卫契约在场…（删掉守卫后契约用例红）"
  },
  "green": {
    "command": "node --test tests/checks/channel/profile-guard.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/channel/profile-guard.test.mjs"
  }
}
```
