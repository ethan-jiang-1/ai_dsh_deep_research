---
status: 已修
severity: P2
opened: 2026-11-14
---

# BUG-181：artifact 新鲜度只看最新 mtime——删掉源文件后旧 tarball 仍判 fresh

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：已修 — 构建清单（源指纹 + artifact 哈希）+ tar 文件集回退；P2 修理型
>
> 位置：[scripts/lib/artifact-freshness.mjs](../../../scripts/lib/artifact-freshness.mjs)
> `newestMtimeIn` / `artifactFreshness`；消费 = [lifecycle.entry.mjs](../../../scripts/smoke/lifecycle.entry.mjs)；
> 前科 = BUG-174（mtime 新鲜度）。

## 症状

`artifactFreshness` 只比较 artifact mtime 与 roots 里**剩余文件的最新 mtime**。删除一个源文件后，
没有「更新」的 mtime 可比，旧 artifact 仍 `fresh:true`——但 artifact 里还包含已删除的文件，
它不再由当前源生成。

## 复现（2026-11-14 实测）

```sh
node --import tsx/esm -e '
import { mkdtempSync, writeFileSync, rmSync, utimesSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifactFreshness } from "./scripts/lib/artifact-freshness.mjs";
const base = mkdtempSync(join(tmpdir(), "fresh-probe-"));
const src = join(base, "src"); const art = join(base, "artifact.tgz");
mkdirSync(src); writeFileSync(join(src, "a.mjs"), "a"); writeFileSync(join(src, "b.mjs"), "b");
const old = new Date(Date.now() - 60_000); utimesSync(join(src, "a.mjs"), old, old); utimesSync(join(src, "b.mjs"), old, old);
writeFileSync(art, "artifact");
console.log("before:", artifactFreshness(art, [src]).fresh);
rmSync(join(src, "b.mjs"));
console.log("after delete:", artifactFreshness(art, [src]).fresh, artifactFreshness(art, [src]).reason);
rmSync(base, { recursive: true, force: true });
'
# before: true / after delete: true fresh
```

同样，一个被**替换为旧 mtime** 的源文件（`touch -d`、归档工具）也不会让 artifact 变 stale。

## 根因（已证）

「新鲜」被定义为 `artifact.mtime >= max(当前 roots 文件 mtime)`；这是**单调时间**谓词，只能发现
「新增/修改得更晚」，不能发现删除、重命名或把 mtime 改旧。`newestMtimeIn` 也不记录文件集，
没有「artifact 里应有/不应有」的对照。

## 影响面

- 删除一个 pack 源文件（或删一个 `content/` 模板）后，`_dist` tarball 仍被判 fresh；lifecycle
  会安装含已删除文件的旧包并跑 content/startup/defaults 断言，给出「当前 HEAD 已验证」的错误结论。
- 与 BUG-174 同族但不同机制：174 是「旧 mtime」，本条是「文件集变化」；mtime 谓词无法闭环。

## 牵出的失败类

- **C9 夹具/产物漂移** + **C10 安装/发布**（产物 ≠ 当前源）。
- 同机制第 **2** 次（174 旧产物 → 本条删除）。类修：artifact 新鲜度按**清单/指纹**判定
  （export-dist 写文件集/哈希，消费方对账），mtime 只作快速预检。

## 修复判据

- `export-dist` 在 tarball 旁写构建清单（文件集 + 哈希或 tar listing 摘要）；`artifactFreshness`
  优先比对清单与当前源的文件集/哈希，缺失时退回 mtime 并显式标记 `mtime-only`。
- 反证：上面的删除场景 → 必须 stale；新增/修改文件仍 stale；未改源 → fresh；
  `--allow-stale` 显式覆盖仍可。
- 旧 tarball 没有清单时：至少比对 tarball 内的文件集与当前 roots（可读 tar listing），不能只看 mtime。

## 修复关联

未修。P2 修理型，授权范围 = `scripts/lib/artifact-freshness.mjs` + `export-dist` 清单 +
`tests/checks/artifact-freshness.test.mjs`；去向可记 `none — 机械修复`。

## 修复落地（2026-11-14）

- **改动**：`scripts/lib/artifact-freshness.mjs`、`scripts/dist/export-dist.mjs`、`scripts/smoke/lifecycle.entry.mjs`、`tests/checks/artifact-freshness.test.mjs`、`scripts/README.md`
- **红证**：旧实现只看 mtime；删除源文件后仍 `fresh:true`（文件集探针断言失败）：
  ```
  node --input-type=module -e '…删除 src/b.mjs 后 artifactFreshness(..., {artifactEntries:["package/a.mjs","package/b.mjs"], sourceEntries:["package/a.mjs"]})…'
  AssertionError [ERR_ASSERTION]: deleted source must be stale
    actual: true,
    expected: false,
  ```
- **绿证**：`node --test tests/checks/artifact-freshness.test.mjs`
  ```
  # tests 4
  # pass 4
  # fail 0
  ```
- **反证/边界**：manifest 矩阵覆盖删除源、同 mtime 内容替换、artifact 被替换；`file-set` 矩阵覆盖无清单旧
  tarball 的「多出已删源/缺少新增源」。本机真实 `_dist` tarball 无清单 → `lifecycle.entry` 仍
  NOT-RUN（`mtime-only` 或 `file-set`），不再 ALL PASS；`export-dist` 下次导出写 `_dist/build-manifest.json`。
  L2 全链未跑（需先 `export-dist`；CI deploy job 自带该前置）。
