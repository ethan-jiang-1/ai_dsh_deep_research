---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-120：method-library 安全路径只拒 symlink——hardlink 是普通文件，读可越界读工作区外内容

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 方法库安全路径拒绝 hardlink（nlink>1），不再经 hardlink 读工作区外内容（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/method-library-io.ts`
> （`safeMethodLibraryPath` 只 `isSymbolicLink`/realpath；写走 temp+rename）。

## 症状

工作区 `method-library.md` 是到外部文件的 **hardlink**：

```json
{
  "safePath": ".../ws/method-library.md",
  "readOutside": "OUTSIDE SECRET",
  "escapedRead": true,
  "outsideAfterWrite": "OUTSIDE SECRET"
}
```

`lstat` 是普通文件，`realpath` 落在 cwd 内，安全检查通过；`readLibraryFile` 读出工作区外
inode 的内容（只读泄露）。`writeLibraryFileAtomic` 的 rename 会替换目录项、断开 hardlink，
所以外部文件内容不随写改变——写面安全，读面越界。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx esm runtime/explore-20261112/method-library-hardlink-read-escape.mjs
```

（实际命令用 `tsx/esm`。）

## 影响与触发面

- 方法库页/方法编辑 coach/模型可读到工作区外文件内容（只读泄露）；
- 与 BUG-111（symlink 写）同族，修复只覆盖 symlink；hardlink 在 POSIX 同文件系统可创建；
- `nlink > 1` 的普通文件是合法形态；是否拒绝取决于产品边界策略；
- 不修改外部文件（写 rename 断开链接），但泄露仍成立。

## 根因（已证）

- `safeMethodLibraryPath` 只拒 symlink/非普通文件；realpath 对 hardlink 仍落在 cwd；
- 没有比较目标 inode 是否只属于工作区（如 `stat.nlink > 1` 或 inode/realpath 对）；
- 读面直接 `readFileSync(path)`，跟随 hardlink inode。

## 修法候选（未实施）

1. 对 `method-library.md` 拒绝 `nlink > 1`（或显式记录允许的 hardlink 例外）；
2. 读前比较 `statSync(path).ino` 与 `realpath`/cwd 的 inode 关系（对 hardlink 不充分）；
3. 产品声明方法库必须是工作区独立文件；导入 hardlink 时提示并改为 copy。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] hardlink 目标被拒绝读/写（或有明确 allowlist）；
- [ ] normal 文件/原子写/锁行为不回归；
- [ ] 复现脚本 escapedRead=false；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 NFS/跨设备 hardlink 行为；不证明写面（rename 已断开）；
- 不证明用户是否会把 hardlink 当合法库形态。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` hardlink。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
