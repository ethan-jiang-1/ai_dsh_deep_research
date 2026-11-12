---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-116：latestPresentedFinalVersion 最后一条 present 不含版本时保留旧版本——与 latestFinalDelivery 错位

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 最后一条含终稿族的 present 无版本 → 版本 null，与 latestFinalDelivery 同步（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/final-target.ts`
> （`latestPresentedFinalVersion` 的 `if (versions.length > 0) latest = Math.max(...versions)`）。
> 背景：这是对 BUG-103（全历史 max）的修复；最后一条无版本 present 仍保留旧版本。

## 症状

两次 present：先 `drt_x/final/v2.md`，后 `drt_x/final.md`（不带版本）：

```json
{
  "latestDelivery": { "path": "drt_x/final.md", "turn": 3, "callId": "c3" },
  "latestPresentedVersion": 2,
  "mismatch": true
}
```

`latestFinalDelivery` 取最后一条 present（final.md，版本未知）；`latestPresentedFinalVersion`
却保留上一条的 2。函数头注说「最后一条 present 声明里点名的版本化终稿；没有 → null」，
实际不是最后一条。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/present-version-last-unversioned.mjs
```


## 影响与触发面

- 交付 final.md（可变工作稿/未点版本）后，版本面继续报上一条 vN，与终稿面最后交付不一致；
- `runVersionFaceOf` 的 deliveredFinalVersion/label 跟着旧版本；用户可能以为交付的是 v2；
- 与 BUG-103 同函数，但方向相反：一个全历史 max，一个最后无版本时保留旧值；
- 任何 re-present final.md（不带 vN）都会触发。

## 根因（已证）

- `latestPresentedFinalVersion` 遍历事件，`latest` 只在 `versions.length > 0` 时更新；
- 没有在每条 present 开始时把候选重置为 null；
- `latestFinalDelivery` 与它各自折最后一条事件，语义未绑定。

## 修法候选（未实施）

1. 每条 present 事件内先 `current = null`，再取该事件版本的 max；最后以最后一条含终稿族的
   present 为准（若该条无版本 → null）；
2. 或只找最后一条含终稿族的 present，再从该事件 files 取版本；
3. 与 `latestFinalDelivery` 共用一个「最后一条终稿族 present」折算。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] v2 后 present final.md：latestPresentedVersion 为 null，与 latestFinalDelivery 一致；
- [ ] 最后一条 present 含 v2/v1 时仍取该事件的最大/正确版本；正常递增交付不回归；
- [ ] 复现脚本 mismatch=false；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 run 是否 re-present final.md；不证明同事件多文件/reader 优先级；
- 不证明 BUG-103 的 max 修复（另一面）。

## 已落地（2026-11-13）

- 证据 = `tests/run/final-target.test.mjs` BUG-116。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
