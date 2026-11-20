---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-309：两个 `run-driver up` 并发时没有互斥——可同时判无通道并起两次 boot

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：run-driver up 原子锁；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

`up` 先读 state/web.log 判存活，再 spawn boot；没有 lock/compare-and-set。两个进程可同时通过判空。

## 根因（已证）

状态检查与启动不是原子。

## 复现

复现状态：稳定（读码/临时 fixture/局部脚本）。

```sh
# 证据见症状与当前源码；临时验证只读，不改仓库
```

## 修法

1. 补字段/图/缓存身份/并发/端口判据；
2. 加正反控与旧场/迁移豁免；
3. 与同类字段共用单一正本。

## 修复判据

- 该缺口有正反控；旧场/合法路径不误伤；
- `pnpm verify` / `pnpm test` 绿。

## 修复落地（2026-11-19）

```json fix-evidence
{
  "changes": [
    "checks/lib/channel/start-lock.mjs",
    "tools/channel/run-driver.mjs",
    "tools/channel/boot-run.sh",
    "tests/checks/channel/start-lock.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/channel/start-lock.test.mjs",
    "exit": 1,
    "output": "not ok 1 - 启动锁：互斥、release、stale 回收（BUG-309 / BUG-310）"
  },
  "green": {
    "command": "node --test tests/checks/channel/start-lock.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/channel/start-lock.test.mjs"
  }
}
```

## 历史补注（2026-11-20；保留原修复记录）

上方 `fix-evidence` 保留为 2026-11-19 当轮记录；其低层测试不能证明两个公开入口共享同一 owner、服务交接后仍持锁或整个进程组退出后才释放。原标题所述“无锁”已由当轮实现处理，但当时 `run-driver-up.lock` 与 bash 的 `boot-run.lock` 仍是两把锁；旧十分钟 stale 回收也会夺取仍存活 owner 的锁。原状态不重开，新增事实由 [BUG-321](../../bugs/BUG-321-boot-run-stale-lock-no-recovery.md) 与 [BUG-339](../../bugs/BUG-339-boot-run-trap-removes-new-lock.md) 跟进，不据此宣称第 9 轮全批完成。

现行工作树的 [run-driver](../../../tools/channel/run-driver.mjs) 与 [boot-run](../../../tools/channel/boot-run.sh) 统一委托 [start-channel](../../../tools/channel/start-channel.mjs)；supervisor 获取规范化 home/state 的 `channel-start.lock` 并跨服务生命周期持有。[start-lock](../../../checks/lib/channel/start-lock.mjs) 使用每代唯一文件与一次 release，取消按 TTL/PID/缺失或损坏 owner 的在线接管，崩溃残留经核实后离线处理。该取向已获用户批准；新卡在父级最终 checks 前仍保持修复就绪。

本次核对的证据范围：

- 低层：`node --test tests/checks/channel/start-lock.test.mjs` exit 0、5 项，见 `runtime/smoke-workspace/preventive-quality/start-lock.green.out`。旧 `runtime/smoke-workspace/preventive-quality/live-owner.red.out` / `runtime/smoke-workspace/preventive-quality/lock-properties.red.out` 为旧 baseline 性质反证；后者部分 release 项先撞返回值接口差异。独立 `runtime/smoke-workspace/preventive-quality/release-world.red.out` 才直接观察到旧 release 删除后来 owner。
- 公开入口：`node checks/smoke/channel-start.e2e.mjs` 的 `runtime/smoke-workspace/channel-start-e2e-yrX2XD/result.json` exit 0、9 项，证明直起→driver 与 driver→直起竞争、漂移/复用、前台 TERM、同 home 异 state 拒绝、独立资源并行、启动失败、driver TERM 取消、body 退出而后代持管道时的收束。旧 `runtime/smoke-workspace/channel-start-e2e-3DyE5k/result.json` exit 0、8 项，不含最后一项。
- 入口反控：同 runner 加 `--mutate=drop-home-lock` 的 `runtime/smoke-workspace/channel-start-e2e-CNezLA/result.json` exit 1（同 home 拒绝断言：23 != 2）；`--mutate=bypass-wrapper` 的 `runtime/smoke-workspace/channel-start-e2e-DJhmFY/result.json` exit 1（忙入口 ownership 断言：1 != 2）。

runner 原样复制当轮生产入口/owner/body，替换外部 vendor CLI、dashboard、lsof/npm/git 等适配面；证明真实进程 ownership，不证明真实 DSH/GUI/模型。最新正控 `runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` 原始 exit 0、12 项，在原九项上补证后台 shutdown diagnostic、caller-relative home/workspace 与 handoff ACK 暂缓交付时 driver TERM（exit 143）的收束。父级最终 `pnpm verify` exit 0（`final-verify.out`），`pnpm test` exit 0（`final-test.out`，1423 + 265 项，零 skip）；生产增量 review 原三项 blocker 已修，无剩余 blocker，源码 SHA 与 h6jRC5 正控匹配。最终版本两项入口反控在默认权限下 exit 2（未跑），保留当轮旧红；本次不扩大权限或重复升权，不称最终版本反控已跑。新卡继续保持修复就绪、不归档，不声明整批完成。
