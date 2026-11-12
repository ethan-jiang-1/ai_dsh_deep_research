---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-100：final.md 只按名字在场判定，不校验 entry.type=file——同名目录会被当交付

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — `RunView.hasFile` + run-state lstat，同名目录不算交付（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/run-context.ts`（`RunView.names` 只存名字）+
> 消费 `src/client/research-status/useStatusFeed.ts`（`face.delivered = names.has('final.md')`）
> + `scripts/lib/run-state.mjs`（`existsSync(join(bundleDir,'final.md'))`）。

## 症状

一个 run 目录里 `final.md` 是**目录**（或目录 symlink）而不是文件：

```json
{
  "opened": true,
  "names": ["final.md", "question.md"],
  "finalEntryType": "directory",
  "consumerNamesHasFinal": true,
  "readFinalReason": { "ok": false, "reason": "missing" }
}
```

`openRun` 的 `names` 只装名字；状态页 `face.delivered = names.has('final.md')` → true，
`runStateOf` 的 `existsSync` → true；但 `view.read('final.md')` 返回 missing（目录不可读）。
交付面/终稿页签把目录当终稿，`runSettled` 也可能为 true。

## 复现（keyless，只读）

```sh
node --import tsx/esm runtime/explore-20261112/final-md-directory-as-delivered.mjs
```

## 影响与触发面

- 同名目录/目录 symlink 是畸形 bundle 的常见形态（解压、手工创建、误命名）；
- 客户端状态页的 `delivered`、`hasFinal`、`final/vN` 版本面都从 `names.has` 派生；
- `runStateOf.finalWritten` 用 `existsSync`，不校验 `isFile`；
- 终稿页签会打开一个目录路径，读取失败；用户看到「已交付」但没有内容；
- 不直接改数据，但会误报完成/交付。

## 根因（已证）

- `RunView.names` 是 `Set<string>`，把 entry.type 丢了；消费面只查名字；
- `runStateOf` 直接 `existsSync`，没有 `statSync(...).isFile()`；
- `browserRunSource`/`nodeRunSource` 都提供 type，但消费面没有统一 file 谓词。

## 修法候选（未实施）

1. `RunView` 增加 `files`/`hasFile(name)`，消费面改用；
2. `runStateOf` 用 `statSync(...).isFile()`（symlink 按既有路径安全策略拒绝）；
3. 至少对 `final.md`/`question.md`/`review.md` 的在场判定统一走 `entry.type === 'file'`。

倾向 1；本卡不改代码。

## 修复判据

- [ ] `final.md` 为目录时，`face.delivered`/`runSettled` 不得为 true；
- [ ] `final.md` 为普通文件时行为不变；symlink 按安全策略处理；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明所有 bundle 文件（question/review/plan）的同名目录形态；
- 不证明 symlink 的跨平台语义；不证明终稿页签的完整打开行为。

## 已落地（2026-11-13）

- 证据 = `tests/run/run-context.test.mjs` BUG-100 + `tests/cockpit/run-source-picker.test.mjs`。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
