---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-099：run source picker 把 listDir null 当空列表——final 目录读失败显示「无 final」，不是读取失败

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — run source 清单 null → 读取失败，不再显示「无 final」（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/method-library/useRunSourcePicker.ts`
> （`selectRunSource` 的 `finalFiles ?? []` / `runFiles?.some`）。

## 症状

选择一个已完成的 run 作为方法库来源；如果 `listDir(name/final)` 返回 `null`（通道/权限失败）：

- `const version = latestFinalVersion(finalFiles ?? [])` → null
- `hasFinal = false`
- `status = t('runNoFinal')`（「没有 final」）
- `eligible = false`

hook 级真跑（happy-dom + react-dom/client；final 目录返回 null）：

```json
{"status":"runNoFinal","eligible":false}
```

即读失败被渲染成「这个 run 没有 final」，不是「读不到」/`sourceReadFailure`。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/run-source-list-error-as-empty.mjs
```

## 影响与触发面

- 通道抖动/权限异常时，用户看到「没有 final」并放弃选择；实际 run 可能是完整的；
- `runFiles === null` 时 `deliveredRecord` / `legacyReceipt` 都是 false，也会落到
  `runNotCompleted`，而不是读取失败；
- `loadRunNames` 对 root/archive 的 null 是显式 error（正确）；`selectRunSource` 对
  单个 run 的 final/根清单没有同样处理，两个面语义分叉；
- 与 BUG-092（defaults 双读失败当 auto）同族：**无结果 vs 失败**。

## 根因（已证）

- `finalFiles ?? []` 把 null 降级为空；
- `runFiles?.some` 把 null 降级为 false；
- `status` 链只区分 `question`/`hasFinal`/`hasDeliverableContent`，没有「清单读失败」分支；
- catch 只在 Promise throw 时走 `sourceReadFailure`，而 `listDir` 的失败是返回 null，不 throw。

## 修法候选（未实施）

1. `finalFiles === null || runFiles === null` → `status: t('sourceReadFailure')`（或专门错误态），
   `eligible:false`，不进入 `runNoFinal`；
2. 区分「目录为空」与「目录不可读」；前者 runNoFinal，后者 read failure；
3. 复用 run-context 的 `Outcome` 语义（missing/unreadable 分离）。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] `listDir(name/final)` 或根清单 null 时，候选状态显示读取失败，不是「无 final」；
- [ ] 目录确实为空时仍显示 runNoFinal；正常 eligible run 不回归；
- [ ] 复现脚本断言按所选修法通过；新增 hook/组件用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 workspaceFiles 的 null 分布；不证明 `selectRunSource` 之外的 run 列表错误态；
- 不证明 `isCompletedMethodSourceRun` 的 phase/final 判据（见 BUG-084）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/run-source-picker.test.mjs` BUG-099 接线。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
