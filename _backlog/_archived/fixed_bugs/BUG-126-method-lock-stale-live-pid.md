---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-126：withMethodLibraryLock 陈旧判定只看 mtime——活 pid 持锁 >30s 被另一个写者接管

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 锁陈旧判定先查 pid 存活；活 pid 即使 mtime 旧也不接管，死 pid 可接管（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/method-library-io.ts`
> （`withMethodLibraryLock` 的 `age = Date.now() - statSync(lock).mtimeMs; if (retry && age > LOCK_STALE_MS) rmSync(lock)`）。
> 背景：这是对 BUG-097（方法库并发）的修复；锁接管只按年龄，不查 pid 存活。

## 症状

锁文件写的是**当前活 pid**，只把 mtime 做旧 60s：

```json
{"pid":5575,"pidAlive":true,"oldLockTakenOver":true,"bug":true}
```

`withMethodLibraryLock` 仍删除旧锁并成功取得新锁——活着的持有者被当成陈旧锁接管。
之后两个写者可同时进入 read-modify-write，BUG-097 的 lost update 可复发。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/method-lock-stale-live-pid.mjs
```


## 影响与触发面

- 一次写/读超过 `LOCK_STALE_MS`（30s：大库、慢盘、GC/调试停顿）即可能被接管；
- 锁 JSON 里已有 `pid`，但接管逻辑不读；
- 与 BUG-114（释放无 token）叠加：旧 owner 还会删新锁，互斥进一步失效；
- 用户数据可能 lost update，且操作队列各自报成功。

## 根因（已证）

- 陈旧判据 = `mtime > 30s`，没有 `process.kill(pid,0)`/心跳；
- `pid` 写入但未消费；
- 没有 owner token/租约，无法区分「进程已死」与「进程暂停/长写」。

## 修法候选（未实施）

1. 接管前读锁 JSON 的 pid，`process.kill(pid,0)` 失败才视为陈旧；
2. 加心跳（定期 utimes/内容刷新），heartbeat 超时才算死；
3. 用 `flock`/OS 租约，进程死亡自动释放，不靠 mtime。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] 活 pid 锁即使 mtime 旧也不被接管；死 pid 锁可接管；
- [ ] 正常 acquire/release/串行 mutate 不回归；长写不并发；
- [ ] 复现脚本 oldLockTakenOver=false；新增 keyless/进程用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 pid 复用/权限受限下的 liveness 判据；不证明 NFS/多机锁；
- 不证明 BUG-114 的释放 token 修复（另卡）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` 活 pid 锁。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
