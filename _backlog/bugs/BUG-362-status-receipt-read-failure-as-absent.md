---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-362：delivered.json 读不到时状态页说「交付未见证」——回执读失败被折成没有回执

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/status-receipt-verdict.json` + `status-receipt.png`；
> 夹具 = `runtime/e2e/status-fixture-e2e.mjs receipt`。

## 症状

bundle 有 canonical `delivered.json`（version 1 + slug + acceptedAt + gate.PASS），但文件读不到；
会话窗口里没有 `present` 事件（present 在窗口外或未落）。打开「研究状态」：

```text
研究推进中——交付
综合材料已在场——结论以交付报告为准，当前不冒充完成
...
v1 版本账 · 交付未见证
```

页面把「回执读失败」说成「没有回执/未见证」，用户会以为这场 run 从未交付；实际上回执
在盘上，只是读不到。

## 证据

seed 已交付 run；先把 journal 的 `deliverables/presented` 移除，使交付只能靠回执；再把
`delivered.json` 设为不可读。真浏览器打开状态页。verdict
（`runtime/e2e/status-receipt-verdict.json`）：

```json
{
  "face": "bound",
  "failureShown": false,
  "delivered": false,
  "text": "…… v1 版本账 · 交付未见证 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/status-fixture-e2e.mjs receipt
```

## 根因

`useStatusFeed` 的回执读取：

```ts
const receiptRead = names.has('delivered.json') ? await view.read('delivered.json', { signal }) : null
...
if (receiptRead !== null && receiptRead.ok) {
  try { receiptValue = JSON.parse(receiptRead.value.text) } catch { receiptValue = null }
}
setReceiptDelivery(deliveryFromReceipt(receiptValue, boundSlug))
```

- `receiptRead.ok === false`、`truncated`、JSON parse 失败都落 `receiptValue=null`；
- `deliveryFromReceipt(null)` 返回 null，与「没有回执」同形；
- 没有回执读取失败的独立状态；⑤ 显示「交付未见证」。
- 同一路径也把「回执畸形」折成「没有回执」，无法区分「文件坏」与「确实没交付」。

## 修法方向（未实施）

- 回执读取三态：`ok` / `missing` / `error`（含 truncated / JSON parse 失败）；`error` 显示
  「交付回执读取失败」+重试，不显示「交付未见证」。
- 回执畸形（JSON 坏 / 未知形状）按失败/不合法处理，不静默当缺席；保留 BUG-345 的「旧
  install-only 不算回执」裁定（旧形状仍拒绝，但要说明不是「没有」）。
- ⑤ 的「未见证」只在回执确实缺席且窗口无 present 时出现。

## 修复判据

- delivered.json 在场但不可读/畸形 → 显示「交付回执读取失败」+重试；不出现「交付未见证」。
- delivered.json 确实缺席 + 窗口无 present → 仍「交付未见证」（负控）。
- canonical 回执可读 → ✅ 已交付 + 终稿入口（正向不回退）。
- 旧 install-only 形状 → 不冒充已交付（BUG-345 负控不回退）。
- 红证：把 `receiptRead.ok === false` 分支改回 `receiptValue=null` → 本夹具再次出现「交付未见证」，
  exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的回执三态矩阵或浏览器层用例（本 seed 夹具可升格）。
