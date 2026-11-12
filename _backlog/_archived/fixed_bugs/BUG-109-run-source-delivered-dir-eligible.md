---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-109：run source picker 的 delivered.json/acceptance.md 只查名字——同名目录让 run 被当已交付、eligible

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — delivered.json/acceptance.md 只认 `type=file`，同名目录不算回执（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts`
> （`selectRunSource` 的 `runFiles?.some((file) => file.name === 'delivered.json')` /
> `acceptance.md`）。

## 症状

`drt_x/` 里 `delivered.json` 是**目录**（不是文件），run.md `phase: accepted`、final 正常：

```json
{"status":"eligibleRun","eligible":true}
```

`deliveredRecord = runFiles.some(file => file.name === 'delivered.json')` 不看 `entry.type`，
目录也算交付回执；`legacyReceipt` 的 `acceptance.md` 同理。`isCompletedMethodSourceRun`
于是判定完成，来源选择器把该 run 标成 eligible。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/run-source-delivered-dir-eligible.mjs
```

## 影响与触发面

- 畸形/手工创建的 bundle（同名目录）会让未真正交付的 run 可选为方法库来源；
- `delivered.json` 与 `acceptance.md` 的在场判定都应要求 `type === 'file'`；
- 与 BUG-100（final.md 同名目录）同族：名字在场 ≠ 文件在场；
- 来源选择器把 run 当 eligible 后，用户可把不完整 run 的方法采用进库。

## 根因（已证）

- `runFiles` 来自 `listDir`，包含 `type`；消费只比 `name`；
- `deliveredRecord`/`legacyReceipt` 没有 file 谓词；
- `isCompletedMethodSourceRun` 只看布尔，无法区分目录。

## 修法候选（未实施）

1. `runFiles?.some((file) => file.type === 'file' && file.name === 'delivered.json')`，
   acceptance 同理；
2. 抽 `hasFile(entries, name)` 统一消费，供来源选择/终稿/方法库；
3. 对目录同名给出 warning，不静默当回执。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] delivered.json/acceptance.md 为目录时，eligible 不得为 true（状态为未完成/读取异常）；
- [ ] 普通文件回执仍 eligible；正常 run 不回归；
- [ ] 复现脚本断言按所选修法通过；新增 hook/组件用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 bundle 中同名目录的分布；不证明 `isCompletedMethodSourceRun` 的 phase/final 判据（BUG-084）；
- 不证明其它「按名字在场」的消费面（BUG-100 已另卡）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/run-source-picker.test.mjs` BUG-109。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
