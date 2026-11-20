---
status: 修复就绪
severity: P2
opened: 2026-11-19
---

# BUG-321：boot-run 启动锁缺少可核对的 ownership 与崩溃残留处理合同

> 严重级别：P2 ｜ 发现：2026-11-19 ｜ 状态：修复就绪（2026-11-20：实现与局部证据已入工作树，父级最终 checks 待跑；不归档）
>
> 探索轮 = [低置信区 20 卡（第 9 轮）](../issues/2026-11-19-low-confidence-40.md)。

## 症状与历史校正

旧 [boot-run](../../tools/channel/boot-run.sh) 使用 `$STATE_DIR/boot-run.lock` 的裸 `mkdir`，没有 owner 记录；SIGKILL 不执行 trap。源码还存在另一条残留路径：前段注册的 `rmdir` trap 在服务段被 `trap cleanup EXIT INT TERM` 覆盖，所以不能把残留只归因于崩溃。

原卡把“必须自动 stale 接管”当作修复方向，现撤回。2026-11-20 用户批准的合同是：**不按 TTL、PID 存活或 owner 缺失/损坏自动接管；崩溃残留先停相关进程，核实 home/state 锁及其进程组后离线处理。** 不自动接管属于获批处理取向，不作为未修漏洞；也不通过放宽旧断言宣称已修。

## 分诊与授权

- 表面：开发 run 通道；最低边界分为文件系统 ownership 性质与公开入口真实进程生命周期。
- 同机制类修：与 [BUG-339](BUG-339-boot-run-trap-removes-new-lock.md) 共用启动 owner；历史入口缺口见 [BUG-309](../_archived/fixed_bugs/BUG-309-run-driver-no-up-lock.md)、[BUG-310](../_archived/fixed_bugs/BUG-310-boot-run-no-start-lock.md)。仅记录本卡，不代表本批其他卡完成。
- 授权：用户直派更新本卡并批准上述无在线接管合同；状态暂保持修复就绪，可关闭：否。

## 根因（已证）

旧 bash 锁与 [start-lock](../../checks/lib/channel/start-lock.mjs) 是两套协议；后者旧实现按十分钟 TTL 或坏 owner 删除重建锁，前者缺 owner 且 trap 被覆盖。单纯给 bash 增加时间回收会继承旧低层实现的活 owner 被夺权问题。

旧实现快照及性质反证保留在运行区：`runtime/smoke-workspace/preventive-quality/start-lock.baseline.mjs`、`runtime/smoke-workspace/preventive-quality/live-owner.red.out`、`runtime/smoke-workspace/preventive-quality/lock-properties.red.out`。前者红因是活 owner 超龄后第二次 acquire 返回 true；性质组第三项是空 owner 残留被自动接管。两者均指向 online takeover，不证明完整 boot-run 的 SIGKILL 恢复行为。

## 修法

[boot-run](../../tools/channel/boot-run.sh) exec 到 [start-channel](../../tools/channel/start-channel.mjs)；[run-driver](../../tools/channel/run-driver.mjs) 也将启动交给该 supervisor。它规范化 home/state 路径并按固定顺序获取两个 `channel-start.lock`，在 prepare/服务生命周期内持有；独立 home/state 可并行，同 home 换 state 仍拒绝。旧 `boot-run.lock` / `run-driver-up.lock` 残留阻止启动并要求离线核实。

[start-lock](../../checks/lib/channel/start-lock.mjs) 每代写唯一 owner 文件，记录 pid/时间但不据此夺权；owner 写失败回滚自己的空目录，release 只消费自己的身份一次，禁止递归清理。supervisor 在子进程 close 且整个进程组已证静默后释放；未证静默则保锁并报离线恢复。`--drift-only` 不获取服务锁，持锁通道仍可接受漂移检查。

## 修复判据

- 活 owner 超龄不失权；缺失、损坏或死亡 owner 的残留均拒绝在线接管，诊断给出离线恢复方向。
- owner 写入失败不报成功、不留可自行清掉的空锁；未知内容保留，旧 release 不触碰后来 owner。
- 公开入口双向竞争在进入 body/改写日志前拒绝；同 home 异 state 拒绝、独立资源并行；取消/失败先收束进程组再释放。
- 最终生产版本与 runner 复跑、`pnpm verify` / `pnpm test` 由父级最终 checks 确认，未过前不翻状态。

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
    "command": "node --test runtime/smoke-workspace/preventive-quality/start-lock.baseline.test.mjs",
    "exit": 1,
    "output": "lock-properties.red.out: 活 owner 超龄被接管；缺失 owner 的残留被接管。其余部分红因先撞旧 release 返回值差异，不计实际误删证据。"
  },
  "green": {
    "command": "node --test tests/checks/channel/start-lock.test.mjs",
    "exit": 0,
    "output": "start-lock.green.out: 5 tests / 5 pass，包括缺失、损坏或死亡 owner 的残留拒绝在线接管。"
  },
  "guard": {
    "path": "tests/checks/channel/start-lock.test.mjs",
    "entryPath": "checks/smoke/channel-start.e2e.mjs"
  }
}
```

红在旧源码快照上运行、绿在当前生产模块上运行，命令路径不同，未声称它们是同一文件未经变更的复跑。低层五项由本次聚焦检查 exit 0 留在 `runtime/smoke-workspace/preventive-quality/start-lock.green.out`。

真实入口 runner `node checks/smoke/channel-start.e2e.mjs` 的 `runtime/smoke-workspace/channel-start-e2e-yrX2XD/result.json` 为 exit 0、9 项：直起→driver、漂移/复用、前台 TERM、driver→直起、同 home、独立资源、启动失败、driver TERM 取消、body 退出而后代持管道。早版 `runtime/smoke-workspace/channel-start-e2e-3DyE5k/result.json` 为 exit 0、8 项，只作历史对照。

入口反控：`node checks/smoke/channel-start.e2e.mjs --mutate=drop-home-lock` 的 `runtime/smoke-workspace/channel-start-e2e-CNezLA/result.json` exit 1；同 home 异 state 未被 ownership 拒绝，进入 vendor 后 exit 23，违背期望 exit 2。`--mutate=bypass-wrapper` 的 `runtime/smoke-workspace/channel-start-e2e-DJhmFY/result.json` exit 1；忙入口掉到 body 端口检查 exit 1，违背期望 ownership exit 2。这些反控证明 runner 能抓入口绕锁，不是 stale 崩溃场景的红证。

## 未证边界与收尾

- 上述 runner 原样复制当轮生产入口/owner/body，替换外部 vendor CLI、dashboard、lsof/npm/git 等适配面；证明真实进程 ownership，未跑真实 DSH、浏览器或模型，也未证明任意跨平台行为。
- 最新正控 `runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` 原始 exit 0、12 项，除原九项外，补证后台 shutdown diagnostic、caller-relative home/workspace、handoff ACK 暂缓交付时 driver TERM（exit 143）收束。最终版本两项入口反控在默认权限下 exit 2（未跑），保留当轮旧红；本次不扩大权限或重复升权，不称最终版本反控已跑。
- 未做完整公开入口 SIGKILL 故障注入；崩溃后离线核实与处置未实演。不据此承诺在线自动恢复。
- 收尾：父级最终 `pnpm verify` exit 0（`final-verify.out`），`pnpm test` exit 0（`final-test.out`，1423 + 265 项，零 skip）。生产增量 review 原三项 blocker 已修，无剩余 blocker，源码 SHA 与 h6jRC5 正控匹配；最终版反控仍未跑，保持修复就绪、不归档。
