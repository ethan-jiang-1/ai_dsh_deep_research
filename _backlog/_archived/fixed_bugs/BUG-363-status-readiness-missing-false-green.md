---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-363：review/ 在场但 readiness.json 缺席/不可读时，状态页仍显示「✓ 审查」

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：已修 — 结论：readiness 声明缺席/坏 → 审查未定；不拿 prose PASS 给 ✓ 审查；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S8 显示审查未定）→ 绿证 exit 0（31/31）。
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

## 分诊与授权

- 严重级：P2 — 结构化 readiness 声明缺席/坏掉被 prose PASS 顶替，页面给「✓ 审查」。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — canonical 声明缺席/非法必须显示审查未定/失败；prose 不是结构化声明的替代。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../settled_issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

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

根因证据：2026-11-22 复跑 `runtime/e2e/status-fixture-e2e.mjs readiness` 与 `status-readiness-missing-e2e.mjs readiness` → 二者均 `reviewFail:false`、text 命中「✓ 审查」；`readinessOfSources` 的 `source:'missing'` 被 `useStatusFeed` 折 `null`，步骤条又用 `reviewState==='ok'` 判 done。

## 牵出的失败类

- 同族第 2 次（359 review 读失败；363 判据来源缺席/坏被 prose PASS 顶替）｜处置：类修 — `reviewVerdict` 四态 + `readinessOfSources` 全 source 映射。
- 探针价值：所有「结构化声明与散文副本并存的判据」。

## 修法

落层：`artifact-read` + `reviewVerdict` + `useStatusFeed` + `review-readiness` 全 source 映射 + `run-fold`；P3b 实施。

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

## 修复关联

P3b 落地；守卫 = `brief-fold.spec` unconfirmed + `run-fold.spec` + `checks/smoke/cockpit-artifact-truth.entry.mjs` S8/S9；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/lib/run/run-fold.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/lib/run/brief-fold.spec.mjs",
    "tests/run/shared/run-fold.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-artifact-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S8 显示审查未定 — 修复前九场景入口 15/31；还原/修复后 31/31"
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
