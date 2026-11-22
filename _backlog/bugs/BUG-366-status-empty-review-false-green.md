---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-366：0 字节 review.md 让状态页显示「✓ 审查」——空文件被折成 absent

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
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

## 证据

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

## 修法方向（未实施）

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
