---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-114：withMethodLibraryLock 释放无 owner token——陈旧锁被接管后，旧 owner 会删掉新 owner 的锁

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 锁文件写唯一 token；release 只删 token 匹配的锁，旧 owner 不删新锁（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/method-library-io.ts`
> （`withMethodLibraryLock` 的 `finally { rmSync(lock, { force: true }) }`）。
> 背景：这是对 BUG-097（方法库并发 lost update）的修复；修复引入了锁释放竞态。

## 症状

A 持锁；锁被做成陈旧（A 卡住 >30s 的等价形态）后，B 接管并创建新锁；B 释放；C 在 A
返回前成为新 owner。A 的 `finally` **无条件 rmSync**，把 C 的锁删掉：

```json
{"lockStillExists":false,"lockOwner":null,"bug":true}
```

即：旧 owner 的释放会删掉不是自己的锁。之后 D 可以在 C 仍持有锁时进入，并发保护失效。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/method-lock-release-stale-owner.mjs
```

（脚本在临时目录跑，不碰工作区方法库。）

## 影响与触发面

- 长写/进程暂停 > `LOCK_STALE_MS`（30s）即可触发；大库/慢盘/调试停顿可能；
- B 接管后，A 的 finally 删除 B 或后续 C 的锁；并发写者重新进入；
- `mutateMethodLibrary` 的原子写/回读仍在，但跨进程互斥被打破 → BUG-097 的 lost update 可复发；
- 锁文件没有 owner/token，无法判断「这把锁还是我的」。

## 根因（已证）

- acquire 写 `{pid, at}`，但 release 不读回/不比对；
- 陈旧接管 `rmSync + acquire(false)` 后，原 owner 的 finally 无 token 校验；
- 测试只覆盖「陈旧锁可接管」，没有覆盖「旧 owner 返回时删新锁」。

## 修法候选（未实施）

1. 锁文件写唯一 token；release 只在内容 token 匹配时删除；
2. 用 `flock`/`O_EXCL` 租约，release 关闭 fd 自动释放，不做路径删除；
3. 陈旧接管时重命名旧锁并以 token 仲裁，旧 owner 的释放按 token 忽略。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] A 旧锁被 B 接管后，A 的 finally 不删除 B/C 的锁；
- [ ] 正常 acquire/release、陈旧接管、串行 mutate 不回归；
- [ ] 复现脚本 lockStillExists=true（C 锁保留）；新增并发/接管用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 >30s 写停顿的分布；不证明 NFS/多机锁语义；
- 不证明 BUG-097 的串行 lost update 修复（另一面）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` token 释放。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
