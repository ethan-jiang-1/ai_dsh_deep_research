---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-339：启动清理缺少代际身份；原 boot trap 误删主张限于前段与外部换锁条件

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（2026-11-20：实现与局部证据已入工作树，父级最终 checks 待跑；不归档）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状与历史校正

原卡声称“boot-run stale 接管后旧实例完整 body 的 EXIT trap 会删新锁”，范围过大，现缩限：旧 [boot-run](../../tools/channel/boot-run.sh) 在取得裸 `boot-run.lock` 后注册 `trap 'rmdir "$BOOT_LOCK" …' EXIT INT TERM`，但进入仪表盘/服务段后以 `trap cleanup EXIT INT TERM` 覆盖它。后者只杀子进程，不删启动锁；不能沿用原卡对完整 body 生命周期的误删结论。

在前一个 trap 仍有效的准备阶段，如果外部删除/替换锁目录，旧实例的 `rmdir` 没有代际校验，可能删掉后来创建的空目录。旧 bash 入口本身没有自动 stale 回收；此条件不能写成已证正常 stale 接管路径。对有文件的目录，`rmdir` 会失败，也不能夸成递归误删。

另一个已证的同类缺口在旧 [start-lock](../../checks/lib/channel/start-lock.mjs)：release 对路径无条件 recursive rm。第一代正常 release、第二代 acquire 后，再次执行第一代 release，会删除第二代的目录及 owner 文件。该低层行为有独立磁盘反证，不等于完整 shell trap 事故已复现。

## 分诊与授权

- 表面：run 通道 ownership 与清理生命周期；最低证据边界 = 文件系统代际释放 + 公开入口进程组收束。
- 类修关联：[BUG-321](BUG-321-boot-run-stale-lock-no-recovery.md)；历史入口缺口见 [BUG-309](../_archived/fixed_bugs/BUG-309-run-driver-no-up-lock.md)、[BUG-310](../_archived/fixed_bugs/BUG-310-boot-run-no-start-lock.md)。不据此宣称其他活跃卡完成。
- 授权：用户直派更新、按源码收窄历史事实；状态暂保持修复就绪，可关闭：否。

## 根因与复现（已证范围）

根因是按锁路径清理，未把释放权绑定到唯一一次的 owner 身份；旧 shell 的两次 trap 注册还把锁清理与服务清理拆散。旧源码核对依据为本轮修改前的 `HEAD:tools/channel/boot-run.sh`：前段 `trap rmdir` 与服务段 `trap cleanup` 同时存在，后注册覆盖先注册。

`runtime/smoke-workspace/preventive-quality/lock-properties.red.out` 的 release 项先在旧 API 返回 undefined 与新断言 true/false 处失败，不能作为实际误删证明。补充的 `runtime/smoke-workspace/preventive-quality/release-world.baseline.test.mjs` 不比较旧返回值，顺序执行第一代 release → 第二代 acquire → 再执行第一代 release，再检查磁盘目录和 owner。其 `runtime/smoke-workspace/preventive-quality/release-world.red.out` exit 1，直接报 `old release deleted next owner directory`（false !== true）。

## 修法

公开 [boot-run](../../tools/channel/boot-run.sh) 与 [run-driver](../../tools/channel/run-driver.mjs) 统一交给 [start-channel](../../tools/channel/start-channel.mjs) 持有 home/state 两个锁；[body](../../tools/channel/boot-run-body.sh) 仅负责启动实现与 dashboard cleanup，不再拥有旧 `BOOT_LOCK` trap。

[start-lock](../../checks/lib/channel/start-lock.mjs) 每代创建唯一 owner 文件；release 消费一次，只 unlink 自己的文件，再 rmdir 空目录，不 recursive rm，不在 unlink 身份失败后继续删目录。supervisor 等待子进程 close 并确认整个进程组静默后才 release，无法确认则保锁诊断。正常服务交接后仍由 supervisor 持锁。

获批协议不按 TTL/PID/坏 owner 在线接管；在线外部删除或替换活动锁目录不受支持。崩溃残留需要停相关进程并核实后离线处理，不能把 token/唯一文件名夸成对任意恶意目录替换都成立的原子比较删除。

## 修复判据

- 第一代 release 重复调用不改变第二代 owner 文件或锁目录；未知内容不被递归删除。
- 锁 owner 写失败不报成功且仅回滚自己的空目录；其他参与者不能通过另一公开入口绕锁。
- 退出、失败、TERM、body 先退而后代仍持管道时，均先收束进程组，再释放 ownership；服务交接后继续持锁。
- 原 shell 前段 trap 的外部换目录条件未作完整入口实演，不能以低层绿冒充该历史场景的端到端绿。最终 runner、`pnpm verify` / `pnpm test` 待父级确认。

## 修复落地（2026-11-20，局部证据；状态未翻转）

```json fix-evidence
{
  "changes": [
    "checks/lib/channel/start-lock.mjs",
    "tools/channel/start-channel.mjs",
    "tools/channel/boot-run.sh",
    "tools/channel/boot-run-body.sh",
    "tools/channel/run-driver.mjs",
    "tests/checks/channel/start-lock.test.mjs",
    "checks/smoke/channel-start.e2e.mjs"
  ],
  "red": {
    "command": "node --test runtime/smoke-workspace/preventive-quality/release-world.baseline.test.mjs",
    "exit": 1,
    "output": "release-world.red.out: old release deleted next owner directory; false !== true。只证明旧共享模块重复释放删除后来 owner，未证明完整 shell trap 场景。"
  },
  "green": {
    "command": "node --test tests/checks/channel/start-lock.test.mjs",
    "exit": 0,
    "output": "start-lock.green.out: 5 tests / 5 pass；旧 release 重复调用不触碰后来取得者、未知目录内容保留。"
  },
  "guard": {
    "path": "tests/checks/channel/start-lock.test.mjs",
    "entryPath": "checks/smoke/channel-start.e2e.mjs"
  }
}
```

红检查旧源码快照且兼容旧无返回值 API，绿由永久守卫检查当前实现；路径不同，未宣称完整 shell trap 场景已有同命令红绿。低层绿日志 = `runtime/smoke-workspace/preventive-quality/start-lock.green.out`。

入口正控 `node checks/smoke/channel-start.e2e.mjs`：`runtime/smoke-workspace/channel-start-e2e-yrX2XD/result.json` exit 0、9 项，包含前台 TERM、启动失败、driver TERM 取消、body 先退而后代持管道时 TERM→KILL 后才释锁。旧 `runtime/smoke-workspace/channel-start-e2e-3DyE5k/result.json` exit 0、8 项，未含最后一项。

入口反控：`--mutate=drop-home-lock` 的 `runtime/smoke-workspace/channel-start-e2e-CNezLA/result.json` exit 1（同 home 异 state 入 vendor exit 23，违背 ownership 期望 exit 2）；`--mutate=bypass-wrapper` 的 `runtime/smoke-workspace/channel-start-e2e-DJhmFY/result.json` exit 1（绕 owner 掉到忙端口 exit 1，违背期望 exit 2）。它们验证入口 guard 会咬绕锁，不是旧 trap 换锁误删的反证。

## 未证边界与收尾

- runner 原样复制当轮生产入口/owner/body，只替换外部 vendor CLI、dashboard、lsof/npm/git 等适配面；未跑真实 DSH、GUI、模型或任意平台矩阵。
- 最新正控 `runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` 原始 exit 0、12 项，新增覆盖后台 shutdown diagnostic、caller-relative home/workspace、handoff ACK 暂缓交付时 driver TERM（exit 143）的完整收束。最终版本两项入口反控在默认权限下 exit 2（未跑），保留当轮旧红；本次不扩大权限或重复升权，不称最终版本反控已跑。
- 无完整公开入口 stale/外部替换锁后的旧 shell trap 事故实演；活动目录外部删除/替换不在新协议保证内。
- 收尾：父级最终 `pnpm verify` exit 0（`final-verify.out`），`pnpm test` exit 0（`final-test.out`，1423 + 265 项，零 skip）。生产增量 review 原三项 blocker 已修，无剩余 blocker，源码 SHA 与 h6jRC5 正控匹配；最终版反控仍未跑，保持修复就绪、不归档。
