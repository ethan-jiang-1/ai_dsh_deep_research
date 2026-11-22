---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-362：delivered.json 读不到时状态页说「交付未见证」——回执读失败被折成没有回执

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：已修 — 结论：回执五态；只有 ok 出交付；读失败/非法不冒充「交付未见证」；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S7 显示交付回执读取失败）→ 绿证 exit 0（31/31）。
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

## 分诊与授权

- 严重级：P2 — 回执读失败/畸形被说成「交付未见证」；用户会以为从未交付，实际回执在盘上只是读不到/坏了。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 回执读失败/非法必须独立失败态 + 重试；只有 canonical ok 回执才出交付。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../settled_issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

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

根因证据：2026-11-22 复跑 `runtime/e2e/status-fixture-e2e.mjs receipt` → `delivered:false`，text 命中「交付未见证」；`receiptRead.ok=false`/JSON parse 失败都落 `receiptValue=null`，与「没有回执」同形。

## 牵出的失败类

- 同机制第 6 次（读失败折缺席；回执身份见 345/352）｜处置：类修 — `receiptState` 五态 + 只有 ok 出交付。
- 探针价值：所有「机器事实文件在场但读不到/坏」的观察面。

## 修法

落层：`artifact-read` receipt JSON + `useStatusFeed` receiptState + `brief-fold` 回执 issue；P3c 实施。

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

## 修复关联

P3c 落地；守卫 = `tests/cockpit/lib/run/artifact-read.spec.mjs` receipt 矩阵 + `deliveryFromReceipt` 负控 + `checks/smoke/cockpit-artifact-truth.entry.mjs` S7；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/cockpit/lib/run/artifact-read.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-artifact-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S7 显示交付回执读取失败 — 修复前九场景入口 15/31；还原/修复后 31/31"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-artifact-truth.entry.mjs"
  }
}
```
