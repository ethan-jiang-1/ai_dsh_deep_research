---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-073：run-lock 的建锁不是原子的——目录先于 owner.json 可见，并发者会接管并把属主覆盖成失效 pid

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 建锁原子化：候选目录先写 owner.json 再 rename；目录已存在但属主暂缺给 3×50ms 宽限，仍缺才按陈旧；rename 后回读复核属主；释放只动自己的锁。client-load 也迁到共享 run-lock。先红后绿（2026-11-12，去向：none — dev 工具修复，审查：agent 自审 + 机械门禁）。

## 症状

[`scripts/lib/run-lock.mjs`](../../../scripts/lib/run-lock.mjs) 的 `acquireRunLock` 是「先 `mkdirSync` 再写
`owner.json`」两步。两步之间，锁目录**已存在但没有 owner.json**，此时任何并发者调用
`lockOwnerPid()` 都会读到 `null`（坏 JSON / 不存在 → null），于是把一个**正在创建中的锁**当成
**陈旧锁**：`rm -rf` 后自己重建，并写入自己的 pid。

随后创建者恢复执行、写回自己的 `owner.json` —— 覆盖掉新属主的文件。结果：

- **两者都认为自己拿到了锁**（并发双跑，正是这个锁要防的事）；
- `owner.json` 变成创建者的 pid；若该 pid 对第三方已不可见/已死，锁看起来又是「陈旧」的 →
  **第三个进程可以再次接管**；
- Web 端口/dev home 争用回到锁之前的状态。

## 复现（确定性演示；创建者的「暂停」用显式步骤模拟）

```sh
rm -rf /tmp/lockdemo2 && mkdir -p /tmp/lockdemo2
node --import tsx/esm -e "
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { acquireRunLock, lockOwnerPid } from './scripts/lib/run-lock.mjs';
const lock='/tmp/lockdemo2/snapshot-replay.lock';
mkdirSync(lock);                                                  // A：mkdir 完成，尚未写 owner.json
const ok = acquireRunLock({ lockDir: lock, onBusy: () => {} });   // B：并发者视角
console.log('B acquired =', ok, 'owner =', lockOwnerPid(lock));    // → true（接管了 A 的半成品锁）
writeFileSync(lock + '/owner.json', JSON.stringify({ pid: 99999, at: new Date().toISOString() })); // A 恢复写入
console.log('after A write: owner =', lockOwnerPid(lock), 'file =', readFileSync(lock + '/owner.json','utf8'));
"
```

实测输出：

```
B acquired = true owner = 31082
after A write: owner = null file = {"pid":99999,...}
```

即：B 拿到锁后，A 的写入把属主改成 99999（一个不存在的 pid）→ `lockOwnerPid` 返回 **null**，锁又变成
「可接管」状态。真实代码里 A 的写入发生在 `mkdirSync` 之后微秒级，窗口很窄——但窗口是**结构性**的，
不是概率传说：任何两条系统调用之间都可能被调度。

## 根因（已证）

1. **非原子建锁**：`mkdir` 与 `writeFileSync(owner.json)` 是两个操作，中间状态 = 「目录在、属主不可读」；
2. **陈旧判据过宽**：`lockOwnerPid` 把「owner.json 读不到」直接归为「属主已死」→ 接管；
3. **接管后不复核**：创建者写回自己的 owner.json 时没有校验「我是否仍是属主」，覆盖别人也就无从发现。

同类先例：client-load 自带的锁也是这个形状（本轮之前一直是观察项），现在 `run-lock` 被
`snapshot-replay` 与 `client-load` 共用，影响面变成两个冒烟族。

## 影响面

- 两场同族冒烟并发 → 双跑（端口 3103/3109 争用、共享 dev home、检索 API 互相干扰）——锁的存在意义被抵消；
- 三方接管时更糟：`owner.json` 已死 pid，后续任何实例都能再接管，可能连续多开；
- 症状会表现为「偶发 boot 超时 / 端口占用 / 会话互杀」，与真正的主机问题难以区分（和 BUG-064 的归因问题叠加）。

## 修复判据

1. **原子化建锁**（推荐）：先在临时目录写 `owner.json`，再 `rename` 成锁目录（POSIX 下目标非空会
   `ENOTEMPTY`，天然互斥）；或 mkdir 后**宽限读**（如 3×50ms 重读 owner.json 仍读不到才判陈旧）；
2. **写后复核**：创建者写完 owner.json 后回读，若不是自己的 pid → 视为未拿到锁（onBusy/exit 2），
   不许带锁继续；
3. **陈旧判据收紧**：`owner.json` 不可读时，先看锁目录 mtime 是否年轻（如 < 2s）→ 视为在位等待，
   不立即接管；测试用伪 pid/坏 JSON 覆盖「真陈旧」与「创建中」两态；
4. 先红后绿：模拟「目录在、owner.json 缺席」→ 修复后不得接管（或宽限后才接管）；模拟「owner.json
   为已死 pid」→ 仍可接管；
5. `pnpm test` + `pnpm verify` 绿（新增测试按 layering 规则）。

## 修复关联

已落地（2026-11-12）：
- `scripts/lib/run-lock.mjs` 重写：候选目录 `<lock>.tmp-<pid>-<rand>` 内写 owner.json → `rename` 成锁目录（非空目标原子失败）；目录已存在时 `ownerPidWithGrace` 3×50ms 等创建者，仍无属主才移除；rename 后回读 owner.pid 复核；`releaseRunLock` 只释放自己的锁（属主是别的存活 pid 时不动）。
- `scripts/smoke/client-load-smoke.mjs` 删除私有锁，改用共享 `run-lock`（同一原子语义）。
- 证据 = `tests/run/run-lock.test.mjs` 四例：原子出现/二次拒绝、死 pid 接管、创建窗口宽限 ≥100ms、释放不删他人锁；全量 `pnpm test` 1237 绿、`pnpm verify` 全绿。
- 去向 = none — dev 工具修复。

原始处置（留档）：P2 dev 工具修理型，可凭本卡自授权落地。与 BUG-066/070（profile 预检）和 BUG-064（回放自包含）相邻：
那两条解决「跑起来」，本条解决「不被并发双跑」。
