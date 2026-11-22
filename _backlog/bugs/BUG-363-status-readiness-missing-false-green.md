---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-363：review/ 在场但 readiness.json 缺席/不可读时，状态页仍显示「✓ 审查」

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/status-readiness-verdict.json`（不可读）+
> `runtime/e2e/status-readiness-missing-verdict.json`（缺席）；截图同名 png；
> 夹具 = `runtime/e2e/status-fixture-e2e.mjs readiness` / `status-readiness-missing-e2e.mjs`。

## 症状

bundle 有 `review/` 目录，但 `review/readiness.json` **缺席**或**不可读**；`review.md` 的终局
仍是 PASS。打开「研究状态」：

```text
报告已交付
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
◆交付审阅 ✓ ● 交付
证据 10 份 ✅ 已交付 读终稿 →
```

页面把「结构化审查声明缺失/坏掉」显示成「审查通过（✓ 审查）」。canonical 合同要求
`review/readiness.json` v2 必须声明；缺席/非法在门禁侧是红，观察面却给绿。

## 证据

seed 已交付 run：

- `status-fixture-e2e readiness`：创建 `review/readiness.json` 后设为不可读；
- `status-readiness-missing-e2e`：创建 `review/` 目录但不写 readiness 文件。

两场真浏览器 verdict 都是：

```json
{
  "face": "bound",
  "failureShown": false,
  "delivered": true,
  "reviewFail": false,
  "text": "…… ◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查 …… ✅ 已交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/status-fixture-e2e.mjs readiness
node --import tsx/esm runtime/e2e/status-readiness-missing-e2e.mjs readiness
```

## 根因

`review-readiness.ts` 的 `readinessOfSources` 在 `hasReviewDir=true`、`declarationText` 缺失时返回：

```ts
{ pass: false, conditional: false, source: 'missing', detail: 'review/ 在场但 review/readiness.json 缺席……' }
```

但 `useStatusFeed` 只把 `source === 'declaration' || source === 'prose'` 的结果折成 PASS/FAIL：

```ts
const readiness = (reading.source === 'declaration' || reading.source === 'prose') && typeof reading.pass === 'boolean'
  ? (reading.pass ? 'PASS' : 'FAIL') : null
const reviewFail = readiness === 'FAIL' ? true : readiness === 'PASS' ? false : null
```

`missing`（以及 `ambiguous` / 非法声明）都落 `null`，`reviewFail=null`；步骤条又用
`reviewState === 'ok'`（review.md 可读）判 done → ✓ 审查。于是 canonical 声明的缺席/坏掉
被静默吞掉，只剩 prose 的 PASS 在起作用。

## 修法方向（未实施）

- `useStatusFeed` 把 `source:'missing'`/`'ambiguous'`（以及 readiness 解析失败）映射成
  **审查未定/失败**，不要只认 declaration/prose。
- 区分「prose PASS 但声明缺失」= 结构化审查未完成（fail/unknown），不显示 ✓ 审查。
- 保留 BUG-347 的「无 review 面 = absent」语义；保留 prose FAIL 的负控。
- 若希望观察面与门禁完全同源，可直接消费门禁的 readiness 判定，不再在 client 折第二套。

## 修复判据

- `review/` 在场 + readiness.json 缺席/不可读/非法 → 状态页显示审查未定/失败（可行动），
  不显示 ✓ 审查、不显示「报告已交付」为无条件事实。
- `review/` 与 review.md 都缺席 → 仍 absent（BUG-347 负控）。
- readiness.json v2 PASS + review.md PASS → ✓ 审查（正向不回退）。
- review.md FAIL → 审查失败横幅（负控）。
- 红证：把 `source:'missing'` 分支改回 `null` → 本夹具再次出现 ✓ 审查，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 readiness 四态矩阵（declaration/prose/missing/ambiguous），
  或浏览器层用例（本 seed 夹具可升格）。
