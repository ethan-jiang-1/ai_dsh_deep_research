---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-094：HITL2 锚点把 final.md 当交付拍板——综合步落盘即显示「交付审阅 passed」，present 仍空

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — HITL2 锚点交付事实改用 present 见证，final.md 在场不算拍板（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/lib/hitl-fold.ts`（`AnchorFileFacts.delivered` /
> `deriveAnchors`）与
> `packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`
> （`face.delivered = names.has('final.md')`；⑤ 交付用 `latestFinalDelivery(journalEvents)`）。

## 症状

同一时刻：

- `final.md` 在场（综合步就落盘的工作稿）；
- 还没有 `present` 交付见证（HITL2 后的交付动作）。

`deriveAnchors([], { question: true, delivered: true })` 返回：

```json
[
  { "key": "anchor-1", "label": "立项确认", "state": "passed" },
  { "key": "anchor-2", "label": "交付审阅", "state": "passed" }
]
```

且 `latestFinalDelivery([])` 为 `null`——即 **锚点说交付审阅已过，交付面说尚未交付**。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/anchor-final-vs-present.mjs
```

## 影响与触发面

- `useStatusFeed` 把 `face.delivered` 定义为 `names.has('final.md')`，直接传给
  `deriveAnchors` 的 `delivered`；HITL2 锚点据此判 passed；
- `useStatusFeed` 自己在注释里明确写「final.md 在场只说明有终稿可审（综合步就落盘）」，
  ⑤ 交付用 `latestFinalDelivery`（present 见证）——**同页两套交付事实**；
- 用户在 HITL2 还没发生、或 present 未落时，看到「交付审阅 passed」，可能跳过审阅；
- `hitl-fold` 注释也写「final.md 在场 = 交付拍板已落盘」，与 D28/⑤ 的 present 判据冲突。

## 根因（已证）

- `AnchorFileFacts.delivered` 的语义被写成 final.md 在场；
- `useStatusFeed` 传的是 `face.delivered = names.has('final.md')`，不是 present；
- HITL2 锚点与 ⑤ 交付面各自折同一个「交付」事实，没有单一权威成功点。

## 修法候选（未实施）

1. `deriveAnchors` 的 delivered 改由 `latestFinalDelivery(journalEvents) !== null`（present
   见证）提供；final.md 另设「终稿可审」事实；
2. 或把 HITL2 passed 改成「HITL2 ask 已被答」而非文件在场；
3. 至少把锚点标签/注释改成「终稿已落盘」，不要写「交付审阅 passed」。

倾向 1（与 ⑤ 同源）；本卡不改代码。

## 修复判据

- [ ] final.md 在场但 present 为空时，HITL2 锚点不得显示 passed（pending/upcoming/终稿可审态）；
- [ ] present 落定后 HITL2 passed 与 ⑤ 一致；
- [ ] `deriveAnchors` 的现有 HITL2 pending 分支不回归；
- [ ] 复现脚本断言按所选修法通过；新增 keyless 用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 run 中 final.md 与 HITL2/present 的精确时序分布；
- 不证明锚点之外所有「交付」文案；不证明 UI 用户是否真的会跳过审阅。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/status-feed.test.mjs` BUG-094。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
