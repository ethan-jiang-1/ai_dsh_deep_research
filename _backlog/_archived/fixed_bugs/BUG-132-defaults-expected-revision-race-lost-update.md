---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-132：/research-defaults 的 expectedRevision 不是原子 CAS——并发写入双双成功，丢一次更新

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — defaults 读-改-写复用跨进程锁，expectedRevision 形成原子 CAS；并发写仅 1 成功、其余 stale（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/defaults/command.ts`（`runSet`/`runUnset` 的读-改-写 + `writeValue`）。
> 设计原文：「乐观并发；面板写带 expectedRevision；stale 拒绝」（D50 设计 §命令）。

## 症状

两个写者用**同一个** `expectedRevision` 并发写，**两边都返回成功**：

```
$ # 8 个进程同时：set {"expectedRevision":3,"patch":{"effort":"<band>"}}
=== batch 0 ===
ok revision=4            ← 两个进程都成功
ok revision=4            ←（其余 6 个 stale）
ERR error stale revision=4
…
```

实测第一轮就撞出 **2 个 `ok revision=4`**。语义后果：

- 用户在不同标签页/面板 + `/research-defaults` 命令同时改不同字段 → **后写覆盖先写**，其中一次
  修改静默丢失；
- revision 只 +1（不是 +2），没有「冲突」信号——两个调用者都以为自己的修改已落盘；
- 违反 D50 的「stale 拒绝」承诺：stale 只在「读完→写前别人已提交」时生效，**同时读**的两个写者都在
  对方写盘前读到同一个旧 revision。

## 复现

```sh
# 8 进程同时 set（同一 expectedRevision=3），统计多少进程返回 ok revision=4
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { spawn } from 'node:child_process';
import { mkdtempSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'race-'));
const file = join(root, 'research-defaults.json');
writeFileSync(file, JSON.stringify({ schema: 1, revision: 3, effort: 'quick' }, null, 2));
const bands = ['quick','standard','deep','quick','standard','deep','quick','standard'];
const child = '/tmp/defaults-race-child.mjs';  // 内容见下
const children = bands.map((b) => spawn(process.execPath, ['--import', 'tsx/esm', child, root, b], { stdio: ['ignore','pipe','pipe'] }));
const outs = await Promise.all(children.map((c) => new Promise((res) => { let s=''; c.stdout.on('data',d=>s+=d); c.on('exit',()=>res(s.trim())); })));
console.log('successes =', outs.filter((o) => o.startsWith('ok revision=4')).length);  // 实测 ≥2
rmSync(root, { recursive: true, force: true });
"
# /tmp/defaults-race-child.mjs:
# import { runDefaultsCommand } from '<repo>/packages/deep-research-pack/src/defaults/command.ts'
# const r = runDefaultsCommand({ cwd: process.argv[2], rawInput: `set ${JSON.stringify({ expectedRevision: 3, patch: { effort: process.argv[3] } })}` })
# console.log(r.kind === 'success' ? r.text : `ERR ${r.text}`)
```

## 根因（已证）

`runSet` 的序列是「读当前（readCurrent）→ 比 expectedRevision → merge → 写临时文件 → rename → 回读」，
**没有跨进程锁**，也没有在 rename 前再次比对磁盘 revision：

1. 两个写者都读到 revision=3，expected=3 均通过；
2. 各自写 `revision=4` 的完整文件，rename 原子但**后到者覆盖**先到者；
3. `writeValue` 的回读只检查 `back.value.revision === value.revision`（都是 4）→ 双双成功。

`unset`/`clear` 同构（同样的读-改-写；clear 是 unlink，竞态下可能删掉别人刚写的文件）。

## 影响面

- 设置面**静默丢更新**（默认深度/输出/来源被并发覆盖，用户无从发现）；
- 面板的「stale → 重读」机制被绕过：两个面板都显示成功，下一次 refresh 都拿到 revision=4，
  但只有一个字段的修改活下来；
- 与 BUG-131（未知键静默）合计，D50 的「设置可信」面两处静默。

## 修复判据

1. **read-modify-write 加跨进程锁**（推荐复用 `method-library-io` 的锁语义与 token 防误删，但注意
   [BUG-130](BUG-130-method-lock-live-pid-reuse-permanent-block.md) 的活 pid 永久阻塞问题：锁要有恢复入口）：
   锁内 read → expected 校验 → merge → 原子写 → 回读 → 解锁；
2. 或退而用**更紧的 CAS**：写入临时文件后，在 rename 前比较目标文件的 mtime/size/内容哈希（或
   `link()` 抢占），不匹配则 `error stale`——但纯文件系统 CAS 仍有窗口，锁更稳；
3. 先红后绿：上表 8 进程同 expectedRevision 场景——当前 successes ≥2（红）→ 修复后 ==1，其余 `stale`；
   另加 unset/clear 各一条并发用例；
4. 修复后 **stale 语义不变**：单写者、expected 落后、坏文件、symlink/目录等既有用例保持；
5. `pnpm test` + `pnpm verify` 绿；client-load 面板并发（两 store）不丢更新。

## 修复关联

D50 实现内；与 [BUG-130](BUG-130-method-lock-live-pid-reuse-permanent-block.md)（方法库锁）同属
「跨进程写一致性」族，修复时应共用锁实现/恢复语义。发现方式 = expectedRevision 的并发实测（首轮即中）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/defaults-command.test.mjs` BUG-132 + 8 进程并发探针（1 ok / 7 stale）。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
