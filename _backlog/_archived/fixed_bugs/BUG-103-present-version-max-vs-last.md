---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-103：latestPresentedFinalVersion 取所有 present 的 max，不是最后一条——re-present 旧版后交付版本错位

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 交付版本取最后一条含版本的 present，不再全历史 max（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/final-target.ts`（`latestPresentedFinalVersion`
> 的 `if (value > latest) latest = value`）。

## 症状

两次 present：先 v2，后 v1（re-present/回滚/重复交付）：

```json
{
  "latestDelivery": { "path": "drt_x/final/v1.md", "turn": 3, "callId": "c3" },
  "latestPresentedVersion": 2,
  "contradiction": true
}
```

`latestFinalDelivery` 正确取**最后一条** present（v1）；`latestPresentedFinalVersion`
却取所有事件的版本 **max**（v2）。版本面用 v2 当交付版本，与交付事实 v1 错位。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/present-version-max-vs-last.mjs
```

## 影响与触发面

- re-present 较旧版本、回滚、同一会话多次交付时，版本面「已交付 vN」与终稿面「最后交付 v1」
  不一致；
- `runVersionFaceOf` 的 deliveredFinalVersion/state/label 跟着 max 走；HITL2/终稿页签可能指错版本；
- 函数头注明确写「最后一条 present 声明里点名的版本化终稿」，实现是全局 max；
- 与 BUG-101（非终稿族路径）不同：这里是同一 run 内的 **事件顺序** 错配。

## 根因（已证）

- `latestPresentedFinalVersion` 遍历所有事件，`latest` 只增不减；
- 没有在每条 present 事件开始时重置候选，也没有把 `turn/callId` 与版本绑定；
- `latestFinalDelivery` 按事件顺序覆盖，两个函数语义不一致。

## 修法候选（未实施）

1. 先找最后一条含终稿族的 present 事件，再在该事件内取 max（或读者版优先）；
2. 或让两个函数共享「最新交付事件」的单一折算，再由它派生路径/版本；
3. 若产品语义确实是「最高已交付版本」，需改文档/命名，并解释与 latestFinalDelivery 的差异。

倾向 1/2；本卡不改代码。

## 修复判据

- [ ] v2 后 present v1：deliveredVersion=1，与 latestFinalDelivery 一致；
- [ ] 同一事件多文件时仍按族/读者版优先级选择；
- [ ] 正常递增交付（v1→v2）不回归；复现脚本断言按所选修法通过；
- [ ] 新增 keyless 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 run 是否会 re-present 旧版；不证明 turn/callId 缺失形态；
- 不证明 BUG-101 的非族路径过滤（另一卡）。

## 已落地（2026-11-13）

- 证据 = `tests/run/final-target.test.mjs` BUG-103。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
