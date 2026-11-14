---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-176：scripts/smoke 的 symlink 扫描不可见——链接资产可存在但永不登记、永不运行

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — 共享 `scripts/lib/smoke-assets.mjs`（lstat 分类 + 三消费者）；（用户当轮指示继续推进）
>
> 位置：[scripts/lib/smoke-assets.mjs](../../../scripts/lib/smoke-assets.mjs) 与
> [tests/checks/smoke-registry.test.mjs](../../../tests/checks/smoke-registry.test.mjs)；
> 前科 = [BUG-162](BUG-162-nested-smoke-invisible-to-registry-and-lane.md)
> （顶层目录不可见）。

## 症状

`readdirSync(..., { withFileTypes: true })` 对 symlink 的 `isFile()` / `isDirectory()` 都是 false。
按「文件 + 目录」两分类过滤时，一个符号链接文件或目录会从三处同时消失：

- `smoke-registry` 的盘上集合（`files` 不包含，`subdirs` 也不包含）；
- `smoke-oracle-surface` 的扁平 `readdirSync`（名字不以 `.mjs` 结尾的链接目录被忽略）；
- `smoke-cost-budget` 只读 registry，自然也不会发现。

于是 `scripts/smoke/zz-link.e2e.mjs -> /tmp/x.mjs`（或链接目录）可以存在而永不登记、永不运行，
三个门禁全绿。

## 复现（2026-11-14 实测）

```sh
TMP=$(mktemp -d)
printf 'process.exit(0)\n' > "$TMP/zz.e2e.mjs"
ln -s "$TMP/zz.e2e.mjs" scripts/smoke/zz-link.e2e.mjs
node --test tests/checks/smoke-registry.test.mjs
# # tests 4 / # pass 4 / # fail 0   ← 应红：未登记的链接资产

rm scripts/smoke/zz-link.e2e.mjs
mkdir -p "$TMP/dir"
ln -s "$TMP/dir" scripts/smoke/zz-link-dir
node --test tests/checks/smoke-registry.test.mjs
# # tests 4 / # pass 4 / # fail 0   ← 链接目录同样不可见
rm scripts/smoke/zz-link-dir
rm -rf "$TMP"
```

## 根因（已证）

枚举用 `Dirent` 类型二分，而不是 `lstat` 看链接本身；三个消费者各写一份 `readdirSync`，
新增一种形态（symlink/其它）时没有单一收口。BUG-162 的扁平化断言只查 `isDirectory()`，链接
目录与链接文件都落在「既不是文件也不是目录」的盲区。

## 牵出的失败类

- **C2 消费者遗漏 / C7 假绿**（扫描面窄于声称面）。
- 同机制第 **4** 次（160 文本提及、161 job 正则、162 顶层目录、本条链接/异常形态）。类修：
  盘上资产枚举 = 一个 lstat 分类函数 + 三消费者共用；异常形态显式红，不靠调用点自觉。

## 修复判据

- `scripts/smoke` 顶层只许普通文件；子目录 / symlink / 其它形态一律红，文案点名形态；
- registry / oracle / cost 三个消费者共用同一枚举；registry 的每个键都能在盘上分类为普通文件；
- 反证：链接文件 → 红；链接目录 → 红；普通文件 + 普通目录 → 绿（对照）。

## 修复落地（2026-11-14）

- **改动**：新增 `scripts/lib/smoke-assets.mjs`（`inspectSmokeDir` 用 `lstatSync` 分类 files/dirs/
  symlinks/others；`smokeSurfaceIssues` 返回红项）；`smoke-registry`、`smoke-oracle-surface`、
  `smoke-cost-budget` 改用共享枚举；`tests/checks/smoke-assets.test.mjs` 用临时目录造四种形态。
- **证据**：`node --test tests/checks/smoke-assets.test.mjs tests/checks/smoke-registry.test.mjs …`
  → 10/10 PASS；`pnpm verify` / `pnpm test:checks` 绿。
- **反证**：`scripts/smoke/zz-link.e2e.mjs -> /tmp/x.mjs` → 红「符号链接 zz-link.e2e.mjs」；
  链接目录 → 同红；删除 → 绿。
