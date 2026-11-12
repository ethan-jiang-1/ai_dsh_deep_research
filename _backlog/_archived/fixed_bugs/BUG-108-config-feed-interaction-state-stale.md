---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-108：useConfigFeed 切换会话不重置交互态——旧会话回执/删除确认/发送中留在新会话

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — 切换会话重置 receipt/diff/replied/detail/menu/confirm/switch/sending（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
> （探索卡纪律），待 owner 决定修法。
>
> 位置：`packages/deep-research-pack/src/client/research-config/useConfigFeed.ts`
> （sessionId effect 只 `reload`，没有清 receipt/detail/menu/confirm/sending 等 state）。

## 症状

在 s1 的研究配置页签发送一条管理指令，得到一个 receipt（`sent`），然后切到 s2：

```json
{
  "afterSend": "{\"receipt\":{\"state\":\"sent\",\"text\":\"receiptSent\",\"expectsChange\":false},\"sending\":false}",
  "afterSwitch": "{\"receipt\":{\"state\":\"sent\",\"text\":\"receiptSent\",\"expectsChange\":false},\"sending\":false}",
  "staleReceipt": true
}
```

s2 的页签仍显示 s1 的「已发送」回执。同理，`detail`（方法详情）、`menuFor`（⋯ 菜单）、
`confirmDelete`（删除确认）、`switchOpen`（换一条）、`sending` 都不会复位。

## 复现（keyless，只读）

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
  node --import tsx/esm runtime/explore-20261112/config-feed-receipt-stale.mjs
```

## 影响与触发面

- 新会话页签带着旧会话的「已发送/已保存/已回话」回执，用户以为本次操作已完成；
- 旧会话的删除确认/菜单/详情可能指向已不存在的条目，点击后报错或发错目标；
- `sending` 若未复位，新会话控件被禁用；
- `receiptDiff`/`replied` 也属同组，漏复位会继续轮询/误判回话；
- 与 BUG-086（entries reload race）同 hook 的跨会话状态面，但这是**交互态**，不是数据读回写。

## 根因（已证）

- sessionId effect 只 `setEntries`/`reload`/`setEvents`，没有清 `receiptBase` / `receiptDiff` /
  `replied` / `sending` / `detail` / `menuFor` / `confirmDelete` / `switchOpen`；
- `send` 的 20×3s 轮询仍持有旧 `sid`；切会话后 receipt 不重置；
- 组件层没有 keyed remount 或 reset 调用。

## 修法候选（未实施）

1. sessionId 变化时显式重置整组交互 state（receipt/diff/replied/sending/detail/menu/confirm/switch）；
2. 或给 useConfigFeed 加 session epoch，所有 send/轮询回调按 epoch 忽略旧结果；
3. 上层 keyed remount 只能掩盖，仍建议 hook 自清。

倾向 1；本卡不改代码。

## 修复判据

- [ ] 切到新会话后 receipt/detail/menu/confirm/switch/sending 均为初始态；
- [ ] 旧会话的 send 轮询晚到不写新会话 receipt；
- [ ] 正常同会话发送/回执不回归；复现脚本 afterSwitch.receipt 为 null；
- [ ] 新增 hook/组件用例先红后绿；`pnpm test` / `pnpm verify` 绿。

## 不证明

- 不证明真实 UI 是否 keyed remount；不证明 receiptDiff/replied 的完整时序；
- 不证明其它 feed（status/defaults）的同类交互态（各有卡）。

## 已落地（2026-11-13）

- 证据 = `tests/cockpit/config-feed-session.test.mjs` BUG-108 接线。
- 全量 `pnpm test` 1319 绿、`pnpm verify` 全绿；相关 smoke 已复跑（run-accept ALL PASS / schema-scan 真违约只剩 3 例）。
- 去向 = none。
