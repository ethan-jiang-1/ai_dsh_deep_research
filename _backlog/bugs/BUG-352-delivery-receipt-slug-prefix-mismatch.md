---
status: 排查中
severity: P2
opened: 2026-11-21
---

# BUG-352：工具回执的 slug 带 `drt_`、驾驶舱用裸 slug 比对——`run-accept` 回执永远不被接受

> 严重级别：P2 ｜ 发现：2026-11-21 ｜ 状态：排查中 — 边界已用真实回执复现；按用户指令只报不修。
> 现场 = `research-workspace/drt_api-context-caching-ds-openai/delivered.json` +
> 其见证会话 `session-cf03a459-...`。

## 症状

按 BUG-345 的生产正路交付：`run-accept` 写了 canonical `delivered.json`
（`version:1 + slug + acceptedAt + gate.PASS`）。当会话窗口里没有 `present` 事件时，
驾驶舱本应靠回执显示「✅ 已交付」并出现终稿入口；实际仍然显示「交付未见证」，
终稿页签不出现——回执兜底是死代码。

这条路径正好是 BUG-345 留的「窗口外 present + 回执」残差：修复说「生产侧正路 =
交付时跑 ops `run-accept` 写回执」，但驾驶舱不认这份回执。

## 证据

真实工具回执（`run-accept` / `buildDelivered` 落盘）：

```json
{
  "version": 1,
  "slug": "drt_api-context-caching-ds-openai",
  "acceptedAt": "2026-11-10T17:10:51.321Z",
  "gate": { "status": "PASS", "exit": 0 },
  "present": { "path": "drt_api-context-caching-ds-openai/final/v1.md", "callId": "call_01_IZrTIPmwb4oxoCRPbkLc8898", "version": 1 }
}
```

同一 run 的见证会话经 `bindingTrust` 得到的 slug **没有前缀**：

```json
{"kind":"bound","slug":"api-context-caching-ds-openai","boundBy":"write"}
```

`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts` 第 203 行：

```ts
setReceiptDelivery(deliveryFromReceipt(receiptValue, boundSlug))
```

`boundSlug` = `trust.slug` = 裸 slug。而
`packages/deep-research-pack/src/lib/run/final-target.ts` 的 `deliveryFromReceipt`
要求 `record.slug === slug`。实跑边界：

```sh
node --import tsx/esm -e "
import {readFileSync} from 'node:fs';
import {readSessionEvents} from './checks/lib/shared/session-log.mjs';
import {bindingTrust} from './packages/deep-research-pack/src/lib/run/binding-trust.ts';
import {deliveryFromReceipt} from './packages/deep-research-pack/src/lib/run/final-target.ts';
const {events}=readSessionEvents(process.argv[1]);
const trust=bindingTrust(events);
const receipt=JSON.parse(readFileSync('research-workspace/drt_api-context-caching-ds-openai/delivered.json','utf8'));
console.log(trust, deliveryFromReceipt(receipt, trust.slug), deliveryFromReceipt(receipt, receipt.slug));
" '<session log>'
```

```json
{"kind":"bound","slug":"api-context-caching-ds-openai","boundBy":"write"}
null
{"path":"drt_api-context-caching-ds-openai/final/v1.md","turn":0,"callId":"call_01_IZrTIPmwb4oxoCRPbkLc8898"}
```

即：传驾驶舱实际会传的裸 slug → `null`；传回执自己的 `drt_` slug → 交付成立。
驾驶舱永远走第一条。

## 根因

- **生产侧**：`checks/lib/shared/run-receipt.mjs` 的 `buildDelivered({ slug, ... })`
  原样写入调用方给的 `slug`；`checks/run-gates/run-accept.mjs` 的 `slug` =
  bundle 目录名 `drt_<slug>`，所以回执里带 `drt_` 前缀。
- **消费侧**：`sessionBindingOf` / `bindingTrust` 的正则 `drt_([^\\/\\s]+)[\\/]`
  捕获的是**裸 slug**；`useStatusFeed` 把它直接作为 `deliveryFromReceipt` 的 `slug`
  参数，严格相等比较失败。
- **测试缺口**：`tests/run/gates/final-target.spec.mjs` 的 `canonical()` 用的是
  `slug: 'x'`（无前缀），并且只测了 `'other'` 不匹配；没有用 `run-accept` 的真实
  产物形状（`drt_x` + 裸 `x` 调用）做对账。所以 21 个单测全绿，UI 仍不认回执。

## 修法方向（未实施）

- 在 `deliveryFromReceipt` 里把两侧归一成同一身份（去/加 `drt_` 前缀只在一处做），
  或让 `buildDelivered` 写裸 slug（但回执路径字段仍要 `drt_` 前缀）；
- 把「回执 slug 与绑定 slug 同一身份」写成契约测试，fixture 直接用 `run-accept` 的
  真实输出形状（`slug: 'drt_x'`，调用方传 `'x'`）；
- 不改变「旧 install-only 形状拒收」的 BUG-345 裁定。

## 修复判据

- 一个「窗口外无 present + canonical 工具回执」的会话在驾驶舱显示「✅ 已交付」并出现
  终稿入口；点击能读到 `final/vN.md`。
- 旧 install-only 回执仍不冒充（BUG-345 负例不回退）。
- 回执 slug 属于另一个 run 时仍拒收。
- 单测 fixture 用真实生产者形状；改回裸 slug 比较即红。
- 浏览器层：seed / dev-home 任一夹具覆盖「窗口外 present + 回执」；现有
  `client-load --seed` 终稿相位 SKIP 是同一缺口的另一面（见 E2E 矩阵 J07/J13）。

## 边界

本卡证据是纯函数 + 真实回执边界，不依赖浏览器；没有合成「窗口外 present」的会话，
因为现有唯一带工具回执的见证会话 `session-cf03a459-...` 的 present 仍在窗口内，
会掩盖回执兜底。浏览器红证可在补窗口外夹具后升级；本卡不把「未跑浏览器」写成已验证。
