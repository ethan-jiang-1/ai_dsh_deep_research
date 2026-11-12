---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-098：方法库三写工具直接 writeFileSync 覆盖，无 temp+rename——中途失败/崩溃会截断 method-library.md

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 三写工具走同目录 temp+fsync+rename，崩溃不截断用户库（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/method-library-tool.ts:99/168/226`（upsert /
> set-default / remove 的 `writeFileSync(path, result.text, 'utf8')`）。

## 症状

三个方法库写工具都是对用户唯一的 `method-library.md` **原地覆盖**：

```ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
...
writeFileSync(path, result.text, 'utf8')            // upsert
if (result.text !== text) writeFileSync(path, ...)  // set-default
writeFileSync(path, result.text, 'utf8')            // remove
```

没有临时文件 + `rename`、没有 `fsync`、没有备份。`writeFileSync` 以 truncate 打开目标，
写入过程中进程被杀/磁盘满/权限变化，都会留下**截断或半截**的库文件；下一次读取可能把
半截当完整库（文件在场），用户的其它方法条目丢失。

对照：本包 `/research-defaults` host command 已用 temp+rename 原子写
（`src/defaults/command.ts`）；方法库写路径没有同样保护。

## 证据（源码，2026-11-12）

```sh
grep -n "writeFileSync" packages/deep-research-pack/src/method-library-tool.ts
# 12: import ... writeFileSync
# 99/168/226: writeFileSync(path, ...)
grep -n "renameSync\|mkdtemp\|tmp" packages/deep-research-pack/src/method-library-tool.ts
# （无输出——没有临时文件/rename）
```

没有运行级崩溃注入（会真的破坏 dev 工作区用户数据）；本卡止于源码路径与写语义。

## 影响与触发面

- `method-library.md` 是用户唯一方法库；三个写工具都走同一覆盖路径；
- 写入中途失败（SIGKILL/断电/磁盘满）→ 文件截断，且没有 backup/回滚；
- 读取面把「文件在场 + 可读」当完整库，半截文件会被当成真实库；
- 与 BUG-097（并发 lost update）不同：这里是单写者中途失败的原子性问题。

## 根因（已证）

- 直接 `writeFileSync` 覆盖，没有同目录临时文件 + 原子 rename；
- 没有写前备份或 journal；
- 写后回读只能发现「内容与预期不符」，不能恢复已截断的旧内容。

## 修法候选（未实施）

1. 同目录 `method-library.md.tmp-*` 写入 + `fsync` + `renameSync` 覆盖（与 defaults command 同款）；
2. 或写前保留一份 backup，失败时恢复；
3. 至少把写入期间的异常与回读失败显式报「可能截断」并停止后续写。

倾向 1；本卡不改代码。

## 修复判据

- [ ] 三个写工具都走 temp+rename（或等价原子路径），异常时旧文件保持完整；
- [ ] 正常保存/设默认/删除行为不变；写后回读判据不回归；
- [ ] 有可控的失败注入测试（写中途抛错/中断）证明旧内容仍可读；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实断电/磁盘满的恢复行为；不证明文件系统 rename 的跨平台语义；
- 不证明并发 lost update（BUG-097）或默认判定的其它 bug。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` 原子写/无 temp 残留。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
