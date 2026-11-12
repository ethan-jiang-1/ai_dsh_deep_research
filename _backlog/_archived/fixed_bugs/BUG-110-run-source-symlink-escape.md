---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-110：nodeRunSource 跟随 symlink run bundle——drt_x 可指向工作区外，run-context/status 读取外部文件

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — nodeRunSource realpath 包含性校验，逃逸 symlink 返回 unreadable（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`scripts/lib/run-source-node.mjs`（`readdirSync`/`readFileSync`/`statSync` 跟随
> symlink）+ `packages/deep-research-pack/src/lib/run-context.ts`（`safeDir`/`safeFile` 只做
> 词法检查，不做 realpath/边界）。

## 症状

工作区里 `drt_evil` 是指向工作区外目录的 symlink：

```json
{
  "listed": [{ "name": "question.md", "type": "file" }],
  "opened": true,
  "readQuestion": "OUTSIDE SECRET",
  "escaped": true
}
```

`nodeRunSource.list('drt_evil')` 跟随 symlink，`openRun`/`view.read('question.md')` 读到工作区外
文件。`run-context` 的 `safeDir`/`safeFile` 只拒 `..`/绝对路径，不检查 symlink/realpath。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/run-source-symlink-escape.mjs
```

## 影响与触发面

- `run-gates`（schema-scan/node-gate/evidence-audit）扫描工作区时，可被 symlink 引到工作区外；
- 状态页/终稿页可显示工作区外文件内容（只读泄露）；
- 用户/外部工具创建的 symlink 即可触发；不要求恶意输入；
- `browserRunSource` 由 vendor workspaceFiles 限制，Node 适配器没有同等边界；
- 与 D40 工作区边界/命令路径安全同族。

## 根因（已证）

- `nodeRunSource` 直接 `join(base, path)` 后 `readdirSync`/`readFileSync`/`statSync`，
  默认跟随 symlink；
- `run-context` 的路径安全只做词法 `..`/绝对路径，不管 symlink；
- `openRun` 的 `list` 返回的 symlink 目录被当作普通 run。

## 修法候选（未实施）

1. `nodeRunSource` 对每个组件 `lstat`，拒绝 symlink；或 realpath 后校验仍在 root 下；
2. `run-context` 增加可选 `realpath`/边界谓词，Node 适配器实现；
3. 对 symlink run bundle 返回 unreadable，不打开。

倾向 1；本卡不改代码。

## 修复判据

- [ ] `drt_x` 为指向工作区外的 symlink 时，list/open/read 返回 unreadable（或拒绝），不读外部；
- [ ] 正常目录 run 不回归；symlink 文件（非 run 根）按安全策略处理；
- [ ] 复现脚本 escaped=false；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 browserRunSource/vendor workspaceFiles 的 symlink 语义；
- 不证明写路径（方法库/默认）的 symlink 安全（另有卡）；不证明 NFS/挂载点。

## 已落地（2026-11-13）

- 证据 = `tests/run/run-context-node.test.mjs` BUG-110 symlink。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
