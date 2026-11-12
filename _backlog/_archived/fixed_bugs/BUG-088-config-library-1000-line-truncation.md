---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-088：配置页签读库固定 1000 行——>1000 行库被静默截断却仍标 `ok`（readText 丢掉 eof）

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 配置页签改用分页 `readLibrary`，1001 行库完整读回（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-config/useConfigFeed.ts`
> （`props.readFile(..., 1000)`）与
> `packages/deep-research-pack/src/client/workspace-files.ts`（`readText` 只返回 text，丢 `eof`）。

## 症状

研究配置页签的库读走：

```ts
const text = await props.readFile(sid, LIBRARY_PATH, signal, 1000)
```

`createWorkspaceFiles.readText` 只取 `result.value.text`，**不返回 `eof`**。一个 1001 行的
`method-library.md`：

- 远端返回 `{ text: 前1000行, lines: 1000, eof: false }`；
- `readText` 返回前 1000 行，**没有任何截断信号**；
- `libraryReadStateOf(text, files, path)` 看到文件在场 + text 非 null → `ok`；
- 配置页签把部分库当完整库显示，第 1001 行及之后的条目不可见。

适配器级复现（假 remote 返回 1000 行 + `eof:false`）：

```json
{
  "totalLines": 1001,
  "requestedLimit": 1000,
  "returnedLines": 1000,
  "hasLastLine": false,
  "remoteEof": false,
  "readState": "ok",
  "silentlyTruncated": true
}
```

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/config-library-truncation.mjs
```


## 影响与触发面

- 配置页签是方法库摘要/入口面；>1000 行的库（约 167 条 × 6 行）会少显示尾部条目；
- 用户可能以为条目不存在，或在配置页签无法管理它们；主方法库 tab 的 `readLibrary`
  分页可读全，两个面不一致；
- BUG-026 曾把 40 行写死改为 1000，但仍是硬上限；「1000 行 = 防截断」只在 <1000 时成立；
- 无告警/无 truncated 标记，属静默短读。

## 根因（已证）

- `useConfigFeed.reload` 用固定 `limit=1000` 调 `readFile`；
- `createWorkspaceFiles.readText` 只返回 `text`，丢弃 `result.value.eof`；
- `libraryReadStateOf` 的 `ok` 只看「文件在场 + text 非 null」，无法知道这是截断页；
- 主方法库走 `readLibrary`（20×1000 行分页 + `joinMethodLibraryPages`），配置页签没复用它。

## 修法候选（未实施）

1. 配置页签改用 `readLibrary`（已有分页、`absent/error` 三态）而不是 `readText(1000)`；
2. 或让 `readText` 返回 `{ text, eof, truncated }`，配置页签在 `!eof` 时显示「库较大，
   只显示前 1000 行」并链到主方法库；
3. 至少把 `libraryReadStateOf` 的 `ok` 改成 `truncated` 态。

倾向 1（复用已有完整读面）；本卡不改代码。

## 修复判据

- [ ] 1001 行库在配置页签能读到第 1001 行（或明确显示截断并给主方法库入口）；
- [ ] 正常 <1000 行库行为不变；`absent/error` 三态不回归；
- [ ] 复现脚本按所选修法通过；新增 keyless/适配器用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 workspaceFiles 的 maxLines 配置与 1000 行页的精确边界；
- 不证明全部方法库 UI 面（主库/ coach / 来源）的读全性；
- 不证明其它 `readText` 调用点（question/preview）的截断影响。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/workspace-files.test.mjs` BUG-088（1001 行两页）。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
