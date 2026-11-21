---
status: 等人拍板
severity: P2
opened: 2026-11-20
---

# BUG-346：ps 不可读时 start-channel 保留启动锁——漂移后的标准恢复路径第二次必失败

> 严重级别：P2 ｜ 发现：2026-11-20 ｜ 状态：等人拍板（进程组静默判据换实现，属启动 owner 合同）
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

复现（沙箱内）：

```sh
node -e "const{spawnSync}=require('node:child_process');const r=spawnSync('ps',['-axo','pid=,pgid=,stat=']);console.log(r.status,r.error?.code)"  # null EPERM
```

## 修法（需拍板）

1. 进程组判据改用不依赖 `ps` 的原语：`process.kill(-pgid, 0)`（ESRCH=已静默，EPERM=仍在）；
2. `childClosed` 且信号探测为 ESRCH 时释放；`ps` 不可读只作诊断，不作唯一判据；
3. 失败路径的恢复提示补一句「若锁残留，核实无进程后删除两个锁目录」。

## 修复判据

- 注入一个永远失败的 `ps`（PATH shim）后，正常 body 退出仍释放两把锁；真孤儿进程仍保留锁（负控）。
- 本卡现场：删 profile 后 `run-driver up` 不再被自身残留锁拦。
- `tests/checks/channel/start-lock.test.mjs` 与 `checks/smoke/channel-start.e2e.mjs` 覆盖该分支。

可关闭：否
