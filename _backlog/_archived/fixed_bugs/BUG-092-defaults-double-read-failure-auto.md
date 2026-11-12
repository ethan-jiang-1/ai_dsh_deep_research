---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-092：defaultsStore 双读失败被当成 auto——listDir + readText 都 null 时按钮显示「自动」且无 problem

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — defaults 双读 null → unreadable，不再当「自动」（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/defaults/store.ts`（`refresh` 的
> `exists` 三元 + `phase` 计算）。消费 = composer 按钮 + 研究配置「项目默认」块。

## 症状

`refresh` 同时读 `research-defaults.json`、方法库与工作区目录；如果 `readText` 与
`listDir` 都失败（返回 null，例如 workspaceFiles 通道不可达）：

- `exists = entries === null ? text !== null : ...` → `false`
- `unreadable = text === null && exists` → `false`
- `phase = 'ready'`，`value` = empty（schema/revision），`problems = []`
- composer 按钮显示「研究默认：自动」

实测：

```json
{
  "phase": "ready",
  "value": { "schema": 1, "revision": 0 },
  "problems": [],
  "methodRead": "error",
  "buttonWouldSayAuto": true
}
```

即：**工作区不可达**被渲染成「没有项目默认」；方法库的 error 可见，但默认轴没有任何
problem/重试提示。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/defaults-double-read-failure.mjs
```

## 影响与触发面

- 通道抖动/工作区不可达时，用户看到「自动」而不是「需检查/读不到」；
- 面板方法行会显示读取失败（`methodRead:error`），但默认轴仍绿——两个面语义分叉；
- 用户可能基于「自动」误判没有默认；随后 set 会被 host 的 revision stale 拒绝（有保护），
  但 UI 没有解释，体验是「改了没生效」；
- 与 D50 的「缺席 = 自动」语义冲突：缺席应由**文件不存在**确认，不能由**读失败**推断。

## 根因（已证）

- `exists` 在 `entries === null` 时用 `text !== null` 推断；两者都 null 时 false；
- `unreadable` 只在「确认文件在场 + text null」时成立；双失败落到 ready；
- `parseDefaults(null)` 返回空值，`problems` 空；没有 `unknown` 态。

## 修法候选（未实施）

1. `entries === null && text === null` → `phase:'unreadable'` + `file:io` problem；
2. 或区分 `absent` 仅在 `entries !== null` 且确认无文件时成立；`entries === null` 一律
   unreadable/retry；
3. 保留 ready 但给 `unknown: true` 并让按钮显示「需检查」。

倾向 1/2（与 `libraryReadStateOf` 的「目录不可达 = unreadable」同口径）；本卡不改代码。

## 修复判据

- [ ] listDir + readText 双 null → 快照 `phase:'unreadable'`（或有 `file:io` problem），按钮不再说「自动」；
- [ ] 文件确实不存在、listDir 正常 → 仍是 auto/absent；
- [ ] 文件在场但 readText null → 仍 unreadable；
- [ ] 复现脚本按所选修法通过；新增 store 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 workspaceFiles 双失败的出现频率；不证明按钮/面板的完整视觉态；
- 不证明 `methodRead:error` 与默认轴组合的所有文案优先级。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/defaults-store.test.mjs` BUG-092。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
