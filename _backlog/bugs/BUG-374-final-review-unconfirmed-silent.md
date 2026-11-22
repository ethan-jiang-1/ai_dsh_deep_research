---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-374：终稿页签在 review 读不到时无「审查未定」提示——状态页警告、终稿页签照常

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/final-review-unreadable-verdict.json` + `final-review-unreadable.png`；
> 夹具 = `runtime/e2e/final-review-unreadable-e2e.mjs`。

## 症状

`review.md` 在场但读不到。状态页已正确显示：

```text
报告已交付——审查结论未确认（声明缺失/不可读）
⚠ 审查文件读取失败——无法确认最新审查结论。重试
? 审查
```

但点「读终稿 →」，终稿页签显示「审计版 · v1」和正文，**没有任何「审查未定/读取失败」提示**。
同一份交付，状态页说审查不可确认，终稿页签看起来一切正常。

## 证据

seed 已交付 run 的 `review.md` 设为不可读，真浏览器打开状态页并点「读终稿 →」。verdict
（`runtime/e2e/final-review-unreadable-verdict.json`）：

```json
{
  "face": "bound",
  "statusReviewIssue": true,
  "finalReviewIssue": false,
  "statusText": "…… 审查结论未确认（声明缺失/不可读）…… ⚠ 审查文件读取失败…… ? 审查 ……",
  "finalText": "审计版 · v1 ……（正文，无审查提示）"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-review-unreadable-e2e.mjs
```

## 根因

`ResearchFinalTab` 只从 `review.md` 计算 `pass`：

```ts
const readiness = review.ok && !review.value.truncated ? terminalReadiness(review.value.text) : null
setPass(readiness === null ? null : readiness === 'PASS')
...
const state = pass === false ? props.t('reviewFailed') : ...
```

- `review.ok === false` / 空正文 → `pass=null`；
- 组件只在 `pass === false` 时显示「审查未过」；`pass=null` 与「没有审查结论」同形，不显示
  「审查未定/读取失败」。
- 状态页已用 `reviewVerdict='unconfirmed'` 正确提示；终稿页签没有共用这个状态。

## 修法方向（未实施）

- 终稿页签复用状态页的 review 读取/声明状态（`reviewVerdict`/`readArtifact`），把
  `unconfirmed`（读失败/空/声明缺失）显示为「审查未定」+ 重试，而不是静默正常。
- `pass=null` 不能一律当“无审查状态可显示”；至少区分 absent（无 review 面）与 unconfirmed。
- 保留 `pass=false` 的「审查未过」和 `pass=true` 的正常态。

## 修复判据

- review.md 读不到/空 → 终稿页签显示「审查未定/读取失败」；不静默正常。
- 声明缺失/冲突（BUG-363/369）→ 终稿页签与状态页同判。
- review.md 确实缺席 → 不显示审查失败（absent 负控）。
- review.md PASS/FAIL → 现有正常/失败态不回退。
- 红证：把 `pass=null` 改回静默正常 → 本夹具再次无提示，exit 1；还原后绿。
- guard 落点：`ResearchFinalTab` 的 review 三态矩阵，或浏览器层用例。
