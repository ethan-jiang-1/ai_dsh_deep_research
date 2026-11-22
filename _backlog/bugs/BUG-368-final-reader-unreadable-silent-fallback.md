---
status: 修复就绪
severity: P2
opened: 2026-11-22
---

# BUG-368：readable-v1.md 读不到时静默降级为审计版——读者版失败不可见

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：修复就绪 — 真浏览器现场已复现（2026-11-22 复跑仍红）；原「只报不修」由 2026-11-22 goal 放行，P2 修理型自授权。
> 现场 = `runtime/e2e/final-reader-unreadable-verdict.json` + `final-reader-unreadable.png`；
> 夹具 = `runtime/e2e/final-reader-unreadable-e2e.mjs`。

## 症状

已交付 run 有 `final/readable-v1.md`（读者版）但读不到（权限/IO/工作区失败），审计版
`final/v1.md` 正常。点「读终稿 →」：

```text
审计版 · v1
（审计正文）
```

页面静默显示审计版，没有任何「读者版读取失败 / 已回退审计版」的提示；用户不知道读者版
存在过、也不知道它没读到。

## 分诊与授权

- 严重级：P2 — 读者版读失败被静默降级为审计版，用户不知道读者版存在过、也没读到。
- 表面 / 边界：pack client（状态页/终稿页签）/ 浏览器（真驾驶舱）。
- DSH 不变量：fail-loud — 读者版读失败/截断必须显式提示 + 重试；回退审计版可以，但必须可见。
- 触及面：none — 观察面 client + 测试；不碰入口链/门禁与验收合同/文档合同/pack 公共行为/D 号。
- 授权：自授权（P2 修理型修复）；2026-11-22 用户 goal 放行。
- 批：`artifact-truth-361-368` — 同批卡：361/362/363/364/365/366/367/368；批计划：[观察面工件真实性修复程序](../issues/2026-11-22-observation-artifact-truth-program.md)。

## 复现

复现状态：稳定 — 真浏览器 seed 夹具（2026-11-22 复跑仍红）。

seed 已交付 run，写入 `final/readable-v1.md` 后设为不可读，真浏览器点「读终稿 →」。verdict
（`runtime/e2e/final-reader-unreadable-verdict.json`）：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "readerShown": false,
  "failureShown": false,
  "finalText": "审计版 · v1……（审计正文）"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-reader-unreadable-e2e.mjs
```

## 根因

`ResearchFinalTab.tsx`：

```ts
setReaderText(reader !== null && reader.ok ? reader.value.text : null)
...
const hasReader = readerText !== null
```

读者版 `read.ok === false` 与「没有读者版」同形：`readerText=null`、`hasReader=false`，
默认 view 回落到审计版；没有读者版读取失败/降级提示。`reader.value.truncated` 有处理，
读失败没有。

根因证据：2026-11-22 复跑 `runtime/e2e/final-reader-unreadable-e2e.mjs` → `readerShown:false`、`failureShown:false`；`reader.ok=false` 与「没有读者版」同形，默认回退审计且无提示。

## 牵出的失败类

- 同族第 2 次（364 空读者版回退；368 读失败回退）｜处置：类修 — `finalViewOf` 回退必须可见。
- 探针价值：所有「互补视图静默回退」的观察面。

## 修法

落层：`finalViewOf`（reader unreadable → audit + notice + retry）+ `ResearchFinalTab`；P2 实施。

- 读者版读取三态：`ok`（非空）/ `missing` / `error`；`error`（含 truncated/空）显示一行
  「读者版读取失败，已显示审计版」+ 重试，不静默降级。
- 若读者版为空/截断，按 BUG-364 的空读者版处理（回退审计 + 提示）。
- 审计版本身不可读时仍走 `finalReadFailed`（负控不回退）。

## 修复判据

- readable-vN.md 在场但不可读/截断 → 显示「读者版读取失败，已显示审计版」+ 重试；
  不静默只显示审计版。
- readable-vN.md 确实缺席 → 只显示审计版（负控，不提示“失败”）。
- 读者版非空可读 → 默认读者版（正向不回退）。
- 红证：把 `reader.ok === false` 分支改回 `readerText=null` → 本夹具再次无提示，
  exit 1；还原后绿。
- guard 落点：`ResearchFinalTab` 的读者版三态矩阵或浏览器层用例（本 seed 夹具可升格）。

## 修复关联

P2 落地；守卫 = `tests/cockpit/lib/run/final-view.spec.mjs` + `checks/smoke/cockpit-artifact-truth.entry.mjs` S14；去向 = implemented — 批 Note。
