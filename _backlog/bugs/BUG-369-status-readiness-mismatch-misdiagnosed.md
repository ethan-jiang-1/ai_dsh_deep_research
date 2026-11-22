---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-369：readiness 声明与 review.md 冲突时状态页说「声明缺失/不可读」——mismatch 被折成 unconfirmed

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/review-conflict-verdict.json` + `review-conflict.png`；
> 夹具 = `runtime/e2e/review-conflict-e2e.mjs`。

## 症状

bundle 有一份**合法**的 `review/readiness.json`（v2 PASS + counts），但 `review.md` 的终局块
是 FAIL（两处冲突）。打开「研究状态」：

```text
报告已交付——审查结论未确认（声明缺失/不可读）
已交付版本仍可用；审查结论未确认
⚠ 结构化审查声明未完成——不能把交付当成审查通过
⚠ 审查未定——结构化 readiness 声明缺失或不可读。重试
...
? 审查
```

同时点「读终稿 →」，终稿页签却显示：

```text
审查未过
```

状态页把「声明与散文冲突」误报成「声明缺失/不可读」，并且不给 FAIL；终稿页签又按
review.md 单独折成「审查未过」。同一 run 同一时刻，两个观察面给出不同的审查结论。

## 证据

seed 已交付 run；写入合法的 v2 PASS `review/readiness.json`，把 `review.md` 的终局
`readiness: PASS` 改为 FAIL。真浏览器打开状态页 + 终稿页签。verdict
（`runtime/e2e/review-conflict-verdict.json`）：

```json
{
  "face": "bound",
  "statusText": "…… 报告已交付——审查结论未确认（声明缺失/不可读）…… ⚠ 审查未定——结构化 readiness 声明缺失或不可读。重试 …… ? 审查 ……",
  "finalText": "审查未过过程 →……"
}
```

纯函数边界（`readinessOfSources`）：

```json
{"pass":false,"conditional":false,"source":"mismatch","detail":"声明 PASS 与 review.md 判定行 FAIL 不一致——散文与声明必须同判"}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/review-conflict-e2e.mjs
```

## 根因

- `useStatusFeed` 的 `reviewVerdict` 只显式处理 `declaration/prose/absent`；`source:'mismatch'`
  （以及 `ambiguous` / 非法声明）都落 `else -> 'unconfirmed'`，`reviewFail=null`。
- 状态页把 `unconfirmed` 的文案写成「声明缺失/不可读」，把「冲突」误诊成「没声明」。
- `ResearchFinalTab` 只读 `review.md`（`terminalReadiness`），不读 `review/readiness.json`，
  所以同一冲突在终稿页签按 prose FAIL 显示「审查未过」。
- 两处没有共用 `readinessOfSources` 的完整来源/冲突语义；声明优先的合同没有在终稿页签落地。

## 修法方向（未实施）

- `reviewVerdict` 增 `mismatch` / `ambiguous`（或统一 `conflict`），`reviewFail` 为 true/unknown；
  状态页文案明确「声明与 review.md 不一致」，不要复用「声明缺失/不可读」。
- 终稿页签改用同一 `readinessOfSources({reviewText, declarationText, hasReviewDir})`，
  不再只跑 `terminalReadiness(review.md)`；声明 PASS + 散文 FAIL（或反之）显示「审查结论冲突」。
- 保留 BUG-347 的 absent、BUG-363 的缺失声明语义；冲突是第三种状态，不折成前两种。

## 修复判据

- 声明 PASS + review.md FAIL → 状态页与终稿页签都显示「审查结论冲突/审查未过」；
  不出现「声明缺失/不可读」，也不出现单边 PASS。
- 声明 FAIL + review.md PASS → 同样显示冲突/审查未过（声明与散文必须同判）。
- 声明 PASS + review.md PASS → 审查通过（正向）。
- 声明 FAIL + review.md FAIL → 审查未过（负控）。
- 声明缺失/不可读（BUG-363）→ 仍「审查未定/声明缺失」，不冒充冲突或通过。
- 红证：把 `mismatch` 分支改回 `unconfirmed` → 本夹具再次出现「声明缺失」+终稿单边「审查未过」，
  exit 1；还原后绿。
- guard 落点：`useStatusFeed` / `ResearchFinalTab` 共用 readiness 五态矩阵（declaration/prose/
  mismatch/ambiguous/absent），或浏览器层用例（本 seed 夹具可升格）。
