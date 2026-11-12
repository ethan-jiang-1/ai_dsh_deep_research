---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-122：finalPathOf 后缀匹配接受 `notes/drt_x/final.md`——非 bundle 路径被当终稿族

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — finalPathOf 相对路径只认根/archive/_abandoned 的 drt_ 开头；嵌套 notes/drafts 不认（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/final-target.ts`（`FINAL_FAMILY_SUFFIX` /
> `finalPathOf`；后缀 `((?:archive/|_abandoned/)?drt_.../final...)` 没有前缀边界）。

## 症状

```json
{"path":"drt_x/final.md","finalPath":"drt_x/final.md"}
{"path":"archive/drt_x/final.md","finalPath":"archive/drt_x/final.md"}
{"path":"notes/drt_x/final.md","finalPath":"drt_x/final.md"}
{"path":"drafts/drt_x/final/v2.md","finalPath":"drt_x/final/v2.md"}
{"path":"/tmp/notes/drt_x/final.md","finalPath":"drt_x/final.md"}
```

`notes/drt_x/final.md`、`drafts/drt_x/final/v2.md` 不是 run bundle 根/archive/_abandoned，
却被提取成 `drt_x/final.md` 终稿路径；`latestFinalDelivery`/`latestPresentedFinalVersion`
会把它们当交付。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/final-path-nested-non-bundle.mjs
```

## 影响与触发面

- `present` 可以点名任意文件；一个嵌套笔记 `notes/drt_x/final.md` 会被当运行终稿；
- 终稿页签会打开 `drt_x/final.md`（实际路径不同），显示/读取错文件或 missing；
- 版本面会从 `drafts/drt_x/final/v2.md` 推出版本 2；
- 与 BUG-101（非终稿族）不同：这里路径**包含**终稿族后缀，只是前缀不是合法 bundle 根。

## 根因（已证）

- `FINAL_FAMILY_SUFFIX` 没有 `^`/前缀约束，`finalPathOf` 对任意字符串找后缀；
- `FINAL_FAMILY_RELATIVE` 只校验后缀本身（`drt_.../final...`），不校验它是否在根/archive/
  _abandoned；
- 绝对路径允许后缀提取是设计，但没有区分「绝对路径指向工作区根下的 bundle」与「嵌套 notes」。

## 修法候选（未实施）

1. 相对路径只接受 `drt_x/...` / `archive/drt_x/...` / `_abandoned/drt_x/...` 起始，拒绝
   `notes/`、`drafts/` 等前缀；
2. 绝对路径需由会话 cwd/工作区根解析后再校验；不能只按后缀；
3. 对嵌套 `drt_` 目录给出非终稿标记，不退化成 bundle。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] `notes/drt_x/final.md` / `drafts/drt_x/final/v2.md` 不再被 finalPathOf 接受（或标记非 bundle）；
- [ ] 根/archive/_abandoned 的正常终稿仍接受；绝对路径按工作区根校验；
- [ ] 复现脚本 nested 全 null；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 present paths 的嵌套分布；不证明绝对路径在其它工作区根下的语义；
- 不证明 BUG-101 的非终稿族过滤（另一卡）。

## 已落地（2026-11-13）

- 证据 = `tests/run/final-target.test.mjs` BUG-122。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
