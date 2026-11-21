---
status: 已修
severity: P2
opened: 2026-11-20
---

# BUG-346：ps 不可读时 start-channel 保留启动锁——漂移后的标准恢复路径第二次必失败

> 严重级别：P2 ｜ 发现：2026-11-20 ｜ 状态：已修（2026-11-21）— 结论：静默判据改 `kill(-pgid,0)`，harness 同步去 ps 依赖；审查：agent — 红证 + 13 项 e2e；去向：none — 机械修复
>
> 现场 = `runtime/e2e-2026-11-20/`（含锁目录副本与 boot 日志）；环境 = DSH 沙箱（process-info 被拒）。

## 症状

1. 通道因镜像漂移启动失败（正常、可修复的失败），boot 日志给出修复：
   「pack 漂移检测红——修复：rm -rf profiles/deep-research 后重跑本脚本重建」。
2. 同一次退出后，supervisor 打印
   `start-channel: process group is not proven quiet; ownership retained, recover offline`
   并保留 `runtime/harness-home/channel-start.lock` 与 `runtime/smoke-workspace/channel-start.lock`。
3. 按日志删掉 profile 再 `run-driver up` → exit 2：
   「另一实例持锁或异常残留…禁止在线删除，先停相关进程并核实后离线恢复」。
   文档化的漂移恢复步骤没有包含删锁，用户被卡住。

## 根因

`tools/channel/start-channel.mjs` 的 `groupQuiet()` 用 `spawnSync('ps', ['-axo', 'pid=,pgid=,stat='])`；
在 agent 沙箱里 `ps` 返回 EPERM，函数返回 `null`（「未知」），`stop()` 把未知当作不静默 →
不释放锁。body 已退出、端口无监听、无子进程残留时也一样。

同一依赖还有第二现场：`checks/smoke/channel-start.e2e.mjs` 的 liveness 探针、pgid 断言与启动前置都
要求 `ps`；沙箱下整件 runner 直接 NOT-RUN，导致该家族长期缺少真进程证据。

## 复现

```sh
PARENT=$(mktemp -d); mkdir -p "$PARENT/bin"
printf '#!/usr/bin/env bash\nexit 1\n' > "$PARENT/bin/ps"; chmod +x "$PARENT/bin/ps"
PATH="$PARENT/bin:$PATH" node checks/smoke/channel-start.e2e.mjs
# 修复前：ps unreadable 场景保留两把锁 → exit 1；更早的版本在启动前置就 NOT-RUN（spawnSync ps EPERM）
```

## 修法

1. 静默判据改 `process.kill(-pid, 0)`：ESRCH = 整组已静默；EPERM/成功 = 仍有成员；其它错误 = 未知（保留锁）。
2. `childClosed` 且 ESRCH 才释放；`ps` 不再参与判定。
3. 失败诊断补上被保留的锁路径与离线恢复步骤（停相关进程 → 核实 → 删锁目录）。
4. harness 同步去 ps：liveness 用 `kill(pid,0)`、启动前置不再要求 ps；pgid 断言改由「组存在 + 后续 TERM/KILL 行为」证明。

## 修复判据

- 注入一个永远失败的 `ps`（PATH shim）后，正常 body 退出仍释放两把锁；真孤儿进程仍保留锁（负控 = 继承管道用例在 holder 死前不释放）。
- 失败诊断含两个锁路径与离线恢复步骤。
- `node checks/smoke/channel-start.e2e.mjs` 在沙箱内可跑且全绿（13 项）。

## 修复落地（2026-11-21）

```json fix-evidence
{
  "changes": [
    "tools/channel/start-channel.mjs",
    "checks/smoke/channel-start.e2e.mjs"
  ],
  "red": {
    "command": "node checks/smoke/channel-start.e2e.mjs",
    "exit": 1,
    "output": "旧 groupQuiet（ps）下：start-channel: process group is not proven quiet; ownership retained；release 断言 1 !== 0；更早版本前置 spawnSync ps EPERM → NOT-RUN"
  },
  "green": {
    "command": "node checks/smoke/channel-start.e2e.mjs",
    "exit": 0,
    "output": "13 checks：含 ps unreadable（PATH 假 ps 后仍释放两锁）、body exit / inherited pipe（holder 死前保锁）"
  },
  "guard": {
    "path": "checks/smoke/channel-start.e2e.mjs"
  }
}
```

可关闭：是
