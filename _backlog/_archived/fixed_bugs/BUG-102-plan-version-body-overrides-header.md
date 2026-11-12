---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-102：planVersionsOf 取全文最后一条「图版本：vN」——正文/历史引用覆盖头部声明

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — plan 版本只解析首个 `##` 之前头部，正文旧版引用不夺权（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/run-version.ts`（`planVersionsOf` 的
> `for (const match of withoutComments.matchAll(/图版本\s*[：:]\s*v?(\d+)/g)) header = version`）。

## 症状

plan 头部声明 `图版本：v2`，正文有一句「旧版图版本：v1 已废弃」：

```json
{
  "currentPlanVersion": 1,
  "versionConflicted": false,
  "label": "未交付"
}
```

`currentPlanVersion` 变成正文里的 v1；`versionConflicted` 也没有报冲突。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/plan-version-body-overrides-header.mjs
```

## 影响与触发面

- `currentPlanVersion` 被正文引用覆盖；`snapshotAnomaly`（`>= current` 的快照）与
  rerun/delivered 的状态判断跟着错；
- 头部与正文引用不一致时 `versionConflicted` 不一定报（头部/记录比较用的是错值）；
- 模板/历史备注里写「旧版图版本：vN」是自然写法；当前正则全文 matchAll 取最后一条；
- 与 BUG-084（run `phase:` 正文假阳）同族：行首/范围没有限定。

## 根因（已证）

- `planVersionsOf` 先剥 HTML 注释，然后**全文**匹配所有 `图版本：vN`，用最后一个；
- 没有限定头部块（首个 `##` 之前）或首个声明；
- 「取最后一条」原本是为了跳过模板注释里的 v1，但注释已剥，范围应回到头部。

## 修法候选（未实施）

1. 只解析首个 `##` 之前的头部块（与 plan 头合同一致）；无头部则取第一个声明；
2. 或保留 matchAll，但只在头部块内匹配；正文引用不参与；
3. 冲突判断使用头部声明 vs 重写记录，不用正文。

倾向 1；本卡不改代码。

## 修复判据

- [ ] 头部 v2 + 正文「旧版图版本：v1」→ currentPlanVersion=2，不把 v1 当声明；
- [ ] 模板注释里的 v1 仍被正确忽略；真头部冲突（header v2 / recorded v3）仍报；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明 plan 头部的全部 Markdown 形态（代码块/引用块/无 `##`）；
- 不证明 `recorded` 的斜杠字段解析；不证明版本面其它文案。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/plan-index.test.mjs` BUG-102 + `run-version` 用例。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
