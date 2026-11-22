---
status: 已修
severity: P2
opened: 2026-11-22
---

# BUG-366：0 字节 review.md 让状态页显示「✓ 审查」——空文件被折成 absent

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：已修 — 结论：空 review.md → 审查未给结论；步骤 unknown，不给 ✓；去向：implemented — 批 Note；审查：agent — 纯函数矩阵 + 两入口真浏览器；修复落地记录：真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权；红证 full entry exit 1（S12 显示审查未给结论）→ 绿证 exit 0（31/31）。
> 现场 = `runtime/e2e/review-empty-verdict.json` + `review-empty.png`；
> 夹具 = `runtime/e2e/review-empty-e2e.mjs`。

## 症状

bundle 的 `review.md` 存在但是 0 字节（写坏/截断）。打开「研究状态」：

```text
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
...
证据 10 份 ✅ 已交付 读终稿 → v1 已交付
```

页面把空 review.md 显示成「审查通过（✓ 审查）」。空文件没有任何终局判定，用户会以为
critic 已经审查完毕。

## 分诊与授权

- 严重级：P2 — 0 字节 review.md 被折成 absent，步骤条给「✓ 审查」；用户以为 critic 已审完。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 空审查文件没有终局判定，必须是未定/失败态，不得 ✓。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../settled_issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

seed 已交付 run，把 `review.md` 写成空文件，真浏览器打开状态页。verdict
（`runtime/e2e/review-empty-verdict.json`）：

```json
{
  "face": "bound",
  "reviewDone": true,
  "failureShown": false,
  "text": "…… ◆立项确认 ✓ …… ✓ 审查 …… 证据 10 份 ✅ 已交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/review-empty-e2e.mjs
```

## 根因

`review-readiness.ts` 的 `readinessOfSources` 对空 reviewText 走 BUG-347 的 absent 分支：

```ts
if (terminal === null && (input.reviewText == null || input.reviewText.trim() === '')) {
  return { pass: null, source: 'absent', ... }
}
```

而 `useStatusFeed` 的步骤条输入是 `review: reviewState === 'ok'`（read 成功且未截断 → true），
不看正文是否为空、也不看 readiness 的 `absent`。于是：

- 业务摘要：absent → reviewFail null（不报错）；
- 步骤条：read ok → review=true → ✓ 审查；
- 用户看到“审查通过”，但实际没有任何判定。

根因证据：2026-11-22 复跑 `runtime/e2e/review-empty-e2e.mjs` → `reviewDone:true`、`failureShown:false`；`reviewState==='ok'` 只看 read 成功，readiness absent 被忽略。

## 牵出的失败类

- 同族第 2 次（359 读失败；366 空内容）｜处置：类修 — `empty` 态 + 步骤只认终局判定。
- 探针价值：所有「空文件折 absent」的观察面。

## 修法

落层：`artifact-read` review empty + `reviewVerdict`（empty = unconfirmed）+ `useStatusFeed`/`run-fold`；P3b 实施。

- review 读取态在 `ok` 之外再判“正文有效”（trim 非空、有终局判定行）；空/仅标题 →
  `reviewState='missing'` 或 `'Unreadable'`，不是 `ok`。
- 步骤条 review done 的输入改为“读到有效终局判定”，不是“读成功”。
- 业务摘要对空 review.md 显示「审查未给结论」（或 absent 的明确措辞），不要静默 ✓。
- 保留 review.md 确实缺席 = absent 的语义；保留非空但无终局行 = FAIL（BUG-347 负控）。

## 修复判据

- review.md 为 0 字节/纯空白 → 不显示 ✓ 审查；显示「审查未给结论/读取失败」等可行动态。
- review.md 非空且终局 PASS → ✓ 审查（正向不回退）。
- review.md 非空但无终局行 → FAIL/未给结论（BUG-347 负控）。
- review.md 确实缺席 → absent（负控）。
- 红证：把 `reviewState === 'ok'` 改回只看 read 成功 → 本夹具再次出现 ✓ 审查，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 review 状态矩阵（ok/empty/missing/unreadable）或浏览器层用例。

## 修复关联

P3b 落地；守卫 = `tests/cockpit/lib/run/artifact-read.spec.mjs` + `brief-fold.spec` + `run-fold.spec` + `checks/smoke/cockpit-artifact-truth.entry.mjs` S12；去向 = implemented — 批 Note。

## 修复落地（2026-11-22）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/run/artifact-read.ts",
    "packages/deep-research-pack/src/lib/run/brief-fold.ts",
    "packages/deep-research-pack/src/lib/run/run-fold.ts",
    "packages/deep-research-pack/src/client/research-status/useStatusFeed.ts",
    "packages/deep-research-pack/src/client/ResearchStatusTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "packages/deep-research-pack/src/client/locales/zh-fold.ts",
    "packages/deep-research-pack/src/client/locales/en-fold.ts",
    "tests/cockpit/lib/run/artifact-read.spec.mjs",
    "tests/cockpit/lib/run/brief-fold.spec.mjs",
    "tests/run/shared/run-fold.spec.mjs",
    "tests/cockpit/lib/events/status-feed.spec.mjs",
    "checks/smoke/cockpit-artifact-truth.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-artifact-truth.entry.mjs",
    "exit": 1,
    "output": "FAIL S12 显示审查未给结论 — 修复前九场景入口 15/31；还原/修复后 31/31"
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
