---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-130：方法库锁遇「活 pid」永久卡死（pid 复用/挂起属主），且错误文案不给恢复入口

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — 锁错误带锁文件路径与删除处置；活 pid 长龄锁给「疑似陈旧」而非笼统稍后重试（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/method-library-io.ts` 的 `withMethodLibraryLock`（锁接管判据）。
> 关联：BUG-114（接管后旧 owner 不得删新锁）、BUG-126（活 pid 不得被当陈旧）——那两条修好了「不误抢」，
> 本条是它们的反面缺口「永远抢不回」。

## 症状

锁判据是「属主 pid 存活 → 绝不接管（无论 mtime 多旧）」：

```js
if (pid !== null && pidAlive(pid)) throw new Error('另一个方法库写入正在进行，请稍后重试（未写入）')
```

于是两类**永久阻塞**：

1. **pid 复用**：属主进程崩溃留下锁文件，其 pid 随后被一个**无关的活进程**复用 → `pidAlive` 永远为真
   → 方法库从此**拒绝一切写入**；
2. **属主挂起**：属主进程活着但卡住（例如调试暂停），锁也永远不会被接管。

错误文案只说「稍后重试」，**不提锁文件路径、不给恢复办法**；用户/Lead 无法自行解卡（只能靠知道
`.method-library.lock` 的内部知识手删）。

## 复现（已实跑）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withMethodLibraryLock } from './packages/deep-research-pack/src/method-library-io.ts';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'mlock-'));
const child = spawn('sleep', ['30'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 200));
const lock = join(root, '.method-library.lock');
writeFileSync(lock, JSON.stringify({ pid: child.pid, token: 'other', at: new Date(Date.now() - 3600_000).toISOString() }));
const old = new Date(Date.now() - 3600_000); utimesSync(lock, old, old);
try { withMethodLibraryLock(root, () => 'ok'); console.log('ACQUIRED'); } catch (e) { console.log('THROW:', e.message); }
child.kill('SIGKILL');
"
# 实测：THROW: 另一个方法库写入正在进行，请稍后重试（未写入）   ← 锁龄 1 小时也拒不接管
# 杀掉 pid 后再跑 → ACQUIRED（说明只有 pid 死亡才能解卡）
```

## 根因（已证）

- 无「锁龄上限 + 显式接管」的宽限：活 pid 是唯一真理，mtime/`at` 完全不参与；
- 无 token/心跳机制：无法区分「同一 pid 的旧锁」与「pid 被复用的新进程」；
- 恢复入口缺失：错误文案不含锁路径与「确认无写入后删除」的操作指引。

## 影响面

- 方法库的保存/删除/默认迁移全部失败（UI 显示通用错误），且**重启进程也不解**——锁文件留在工作区；
- 与 BUG-126 的修复互为张力：126 要「不误抢活 pid」，本条要「别被失效属主永久挡住」。需要更细的判据，
  不是二选一。

## 修复判据

1. **恢复入口**：错误文案带上锁文件相对路径 + 可执行处置（「确认没有其它写入后删除 `.method-library.lock`」），
   Lead/用户无需源码知识即可解卡；
2. **判据加一层可观测性**：锁内容已有 `at`/`token`；接管前若 `age > LOCK_STALE_MS` 且 pid 存活**但**
   `at` 远早于当前（例如 > 10 分钟），至少给出「疑似陈旧锁」的明确错误码（`lock-stale-live-pid`）
   并附处置，而不是笼统的「稍后重试」；
3. 可选（需产品取舍）：提供显式 `--break-lock`/面板「强制解锁」动作，或引入 flock/heartbeat；
   不做自动接管则必须在文档（guides/61 或 skill）写明手动恢复；
4. 先红后绿：上表场景（活 pid + 1 小时旧锁）当前 THROW 无语义 → 修复后错误含锁路径与处置（或按 3 接管）；
   另加「pid 死亡后能接管」的对照（已绿，不得回归）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

[BUG-126](BUG-126-method-lock-stale-live-pid.md) 的下一层「pid 复用/
心跳/flock 语义」；[BUG-114](BUG-114-method-lock-release-stale-owner.md)
的 token 语义是修复基础。发现方式 = 上轮面包屑（pid 复用未跑）的实测。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` BUG-130。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
