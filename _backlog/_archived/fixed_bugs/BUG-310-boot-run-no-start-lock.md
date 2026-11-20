---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-310：两个 boot-run 同时过端口检查后可竞争同一端口/状态根

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-19）— 结论：boot-run 启动锁；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-low-confidence-30.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e
>
> 探索轮 = [低置信区 20 卡（第 8 轮）](../settled_issues/2026-11-18-low-confidence-30.md)。

## 症状

boot-run 先 lsof 检查端口，再启动；两个进程可同时看到空闲并竞争同一 PORT/STATE_DIR。

## 根因（已证）

端口检查与 bind 不是原子。

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

上方 `fix-evidence` 保留为 2026-11-19 当轮记录；其共享模块测试不能替代 bash 入口与 run-driver 的真实竞争证据。当轮 bash 另有裸 `boot-run.lock`，没有 owner，也没有自动 stale 接管。其前段 `trap rmdir` 在仪表盘/服务段被 `trap cleanup EXIT INT TERM` 覆盖；后者只杀子进程，不删锁。不能把“旧实例完整服务退出会删新锁”当作当轮已证事实；精确边界见 [BUG-339](../../bugs/BUG-339-boot-run-trap-removes-new-lock.md)。残留处置与现行获批合同见 [BUG-321](../../bugs/BUG-321-boot-run-stale-lock-no-recovery.md)。旧卡不重开，新增卡不据此归档。

现行工作树的 [boot-run](../../../tools/channel/boot-run.sh) exec 到 [start-channel](../../../tools/channel/start-channel.mjs)，[body](../../../tools/channel/boot-run-body.sh) 成为内部实现；[run-driver](../../../tools/channel/run-driver.mjs) 使用同一 supervisor。它统一取得规范化 home/state 的 `channel-start.lock`，持锁直到服务进程组已证静默；旧锁残留拒绝在线迁移。底层 [start-lock](../../../checks/lib/channel/start-lock.mjs) 每代唯一文件、release 一次消费，不 recursive rm；无 TTL/PID/坏 owner 接管，崩溃残留先停进程核实后离线处理。此处理取向已获用户批准，新卡在父级最终 checks 前仍保持修复就绪。

本次核对的实际证据：

- 低层：`node --test tests/checks/channel/start-lock.test.mjs` exit 0、5 项，见 `runtime/smoke-workspace/preventive-quality/start-lock.green.out`。`runtime/smoke-workspace/preventive-quality/live-owner.red.out` 与 `runtime/smoke-workspace/preventive-quality/lock-properties.red.out` 是旧 baseline 性质红证，不能充当完整 shell trap 场景红证；部分项先撞旧 release API 返回值差异。`runtime/smoke-workspace/preventive-quality/release-world.red.out` 独立观察旧共享模块重复 release 删除后来 owner。
- 真实公开入口 runner `node checks/smoke/channel-start.e2e.mjs`：`runtime/smoke-workspace/channel-start-e2e-yrX2XD/result.json` exit 0、9 项，包含两方向竞争、持锁下漂移/复用、前台 TERM、同 home 异 state、独立 home/state 并行、启动失败、driver TERM 取消及 body 先退出但后代持管道时 TERM→KILL 后才释锁。旧 `runtime/smoke-workspace/channel-start-e2e-3DyE5k/result.json` exit 0、8 项，不含持管道案例。
- 同 runner 反控：`--mutate=drop-home-lock` 的 `runtime/smoke-workspace/channel-start-e2e-CNezLA/result.json` exit 1（同 home 候选进入 vendor exit 23，违反 ownership 期望 exit 2）；`--mutate=bypass-wrapper` 的 `runtime/smoke-workspace/channel-start-e2e-DJhmFY/result.json` exit 1（忙入口落到 body 端口检查 exit 1，违反 ownership 期望 exit 2）。

runner 原样复制当轮生产入口/owner/body，外部 vendor CLI、dashboard、lsof/npm/git 等以适配面替换；证明真实进程 ownership，未跑真实 DSH/GUI/模型、SIGKILL 残留离线恢复或完整历史换锁 trap 事故。最新正控 `runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` 原始 exit 0、12 项，新增覆盖后台 shutdown diagnostic、caller-relative home/workspace 及 handoff ACK 暂缓交付时 driver TERM（exit 143）收束。父级最终 `pnpm verify` exit 0（`final-verify.out`），`pnpm test` exit 0（`final-test.out`，1423 + 265 项，零 skip）；生产增量 review 原三项 blocker 已修，无剩余 blocker，源码 SHA 与 h6jRC5 正控匹配。最终版本两项入口反控在默认权限下 exit 2（未跑），保留当轮旧红；本次不扩大权限或重复升权，不称最终版本反控已跑。新卡继续保持修复就绪、不归档，不声明整批完成。
