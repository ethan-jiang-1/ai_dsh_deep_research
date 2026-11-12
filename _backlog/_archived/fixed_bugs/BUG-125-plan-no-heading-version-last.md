---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-125：无 `##` 的 plan：headerBlock=全文，版本取 last——注释说退化首个，正文旧版本仍覆盖

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 无 `##` 的 plan 取首个非引用声明，正文旧版本不再覆盖头部（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/run-version.ts`（`planVersionsOf`）与
> `packages/deep-research-pack/src/lib/plan-index.ts`（`planIndex`）。
> 背景：BUG-102 修复把版本范围收到首个 `##` 之前；但无 `##` 时 `headerBlock=全文`，仍取 last。

## 症状

plan 没有 `##` 分节，头部 v2、正文有旧版引用：

```json
{
  "runVersionCurrent": 1,
  "planIndexVersion": "v1",
  "expected": 2
}
```

注释写「无 `##` 的旧形态退化为全文首个声明」，实现却是 `headerMatches.at(-1)`（全文最后一个），
正文「旧版图版本：v1」仍覆盖头部 v2；`run-version` 与 `plan-index` 同病。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/plan-no-heading-version-last.mjs
```


## 影响与触发面

- 旧/无分节 plan（模板早期或用户简写）的 currentPlanVersion 被正文旧引用改回；
- `plan-index.version` 与 `run-version` 都错；snapshotAnomaly/rerun/delivered 判断跟着错；
- BUG-102 的修复只对「有 `##`」的 plan 生效；无 `##` 时退化路径没有按注释实现；
- 两个模块重复同一 bug，说明缺共享「版本声明范围」解析。

## 根因（已证）

- `headerBlock = withoutComments.split(/^##\s/m)[0] ?? withoutComments`；无 `##` → 全文；
- `headerMatches.length > 0 ? at(-1) : first`：全文有多个版本时取 last，永远走不到 first fallback；
- 注释与实现不一致；plan-index 同款。

## 修法候选（未实施）

1. 记录 `hasHeading`；无 `##` 时取**首个**声明，有 `##` 时取头部最后一个；
2. 或 headerBlock 为空时直接 `withoutComments.match`（首个），不再 at(-1)；
3. 抽共享 `planVersionOf` 供 run-version/plan-index 复用。

倾向 1/3；本卡不改代码。

## 修复判据

- [ ] 无 `##` 的 v2 + 正文旧 v1 → runVersionCurrent/planIndexVersion 都是 2；
- [ ] 有 `##` 的 plan 行为不回归；模板注释示例仍被忽略；
- [ ] 复现脚本 expected=2；新增 keyless 用例先红后绿；
- [ ] `pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明多版本 header 的合法形态；不证明 BUG-102/112 的其它范围问题（不同卡）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/plan-index.test.mjs` + `tests/cockpit/run-version.test.mjs` BUG-125。
- 全量 `pnpm test` 1331 绿、`pnpm verify` 全绿。
- 去向 = none。
