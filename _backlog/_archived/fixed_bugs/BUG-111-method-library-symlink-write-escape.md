---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-111：method-library 写工具跟随 method-library.md symlink——可把库写到工作区外

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 方法库 symlink/目录目标拒绝读写，外部文件零改动（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/method-library-tool.ts`（`readLibrary` 的
> `readFileSync(path)` 与三处 `writeFileSync(path, ...)`；没有 lstat/realpath/safeTarget）。

## 症状

工作区 `method-library.md` 是指向外部文件的 symlink：

```json
{
  "symlink": true,
  "linkTarget": ".../outside-target.md",
  "before": "OUTSIDE ORIGINAL",
  "outsideChanged": true,
  "outsideHasEntry": true
}
```

按写工具的 read-modify-write 序列（`readFileSync(path)` → `upsertMethodEntry` →
`writeFileSync(path)`）执行后，**工作区外目标文件**被覆盖成方法库内容；symlink 仍保留。

## 复现（keyless，只读外部临时文件）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/method-library-symlink-write-escape.mjs
```

（脚本在临时目录建 symlink，模拟工具同款 read/write；不改仓内文件。）

## 影响与触发面

- symlink 目标可以是任意可写文件（`~/.bashrc`、其它项目文件、凭据落点）；一次保存即覆盖；
- `method_library_upsert` / `set_default` / `remove` 三个 execute 都走同一路径；
- 与 BUG-110（run source symlink 读越界）同族；对照 `/research-defaults` 的
  `safeTarget` 已拒绝 symlink，方法库写没有；
- 不需要恶意模型：用户/外部工具留下 symlink 即可触发。

## 根因（已证）

- `readLibrary(path)` 直接 `readFileSync`，跟随 symlink；
- 三个写点直接 `writeFileSync(path, ...)`，跟随 symlink；
- 没有 `lstatSync(path).isSymbolicLink()` 拒绝，也没有 realpath-inside-cwd 校验；
- `mkdirSync(cwd, {recursive:true})` 不处理目标类型。

## 修法候选（未实施）

1. 读写前 `lstatSync(path)`：symlink/目录一律拒绝（与 defaults `safeTarget` 同款）；
2. 或 realpath(target) 必须仍在 realpath(cwd) 下；symlink 目标外拒绝；
3. 写用同目录 temp + rename，且 temp 也不得是 symlink。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] `method-library.md` 为 symlink 时，三工具返回明确错误，不写外部文件；
- [ ] 正常普通文件保存/设默认/删除行为不变；写后回读判据不回归；
- [ ] 复现脚本 outsideChanged=false；新增 keyless/集成用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明其它 bundle 文件/默认文件的 symlink 写路径（defaults 已有 safeTarget）；
- 不证明 NFS/挂载点/硬链接语义；不证明并发 lost update（BUG-097）或非原子写（BUG-098）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/method-library-io.test.mjs` BUG-111 symlink。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
