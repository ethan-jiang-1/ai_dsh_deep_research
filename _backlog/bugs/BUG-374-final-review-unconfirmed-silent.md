---
status: 修复落地
severity: P2
opened: 2026-11-23
---

# BUG-374：终稿页签在 review 读不到时无「审查未定」提示——状态页警告、终稿页签照常

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：修复落地 — 红证 residual full exit 1（S16 终稿页签显示审查未定/读取失败）→ 绿证 28/28 exit 0；批 observation-residuals-369-376。
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

## 分诊与授权

- 严重级：P2 — 观察面把工件/派生的读失败、空、冲突折成良性态，用户会把旧内容/缺失当正常。
- 表面 / 边界：pack client（驾驶舱观察面）/ 真浏览器；本批跨 status/final/graph/config 四个页签。
- DSH 不变量：fail-loud — 文件在场但读不到/为空/冲突必须与缺席分开，并给出可行动提示。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-23 用户 goal 放行。
- 批：`observation-residuals-369-376`。

## 批

`observation-residuals-369-376` — 同批卡：369/370/371/372/373/374/375/376；批计划：[观察面残余与跨面事实一致性修复程序](../issues/2026-11-23-observation-residuals-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-23 复跑仍红）。

```sh
node --import tsx/esm runtime/e2e/final-review-unreadable-e2e.mjs
```

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

**P0 根因证据（2026-11-23）**：P0 复跑 `final-review-unreadable-e2e.mjs`：`statusReviewIssue:true`、`finalReviewIssue:false`；状态页有「审查文件读取失败」+「? 审查」，终稿页签正常显示审计版正文。`ResearchFinalTab` 的 `pass=null`（review 读不到/空）与「无审查面」同形，只有 `pass===false` 才显示「审查未过」。

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

## 修复落地（2026-11-23）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/src/lib/review/review-readiness.ts",
    "packages/deep-research-pack/src/client/ResearchFinalTab.tsx",
    "packages/deep-research-pack/src/client/locales/zh.ts",
    "packages/deep-research-pack/src/client/locales/en.ts",
    "tests/run/gates/review-readiness.spec.mjs",
    "tests/cockpit/client/final-tab-patterns.spec.mjs",
    "checks/smoke/cockpit-truth-residuals.entry.mjs"
  ],
  "red": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs",
    "exit": 1,
    "output": "FAIL S16 终稿页签显示审查未定/读取失败（P0 全入口 17/28，exit 1）"
  },
  "green": {
    "command": "node --import tsx/esm checks/smoke/cockpit-truth-residuals.entry.mjs",
    "exit": 0
  },
  "guard": {
    "path": "checks/smoke/cockpit-truth-residuals.entry.mjs"
  }
}
```
