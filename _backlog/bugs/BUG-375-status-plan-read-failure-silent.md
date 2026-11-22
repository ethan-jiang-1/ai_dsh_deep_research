---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-375：plan.md 读不到时状态页没有任何提示——版本面静默消失

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/status-plan-unreadable-verdict.json` + `status-plan-unreadable.png`；
> 夹具 = `runtime/e2e/status-plan-unreadable-e2e.mjs`。

## 症状

bundle 的 `plan.md` 在场但读不到。打开「研究状态」：

```text
报告已交付
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查
证据 10 份 ✅ 已交付 读终稿 → v1 已交付
```

状态页没有任何「计划读取失败」提示，也没有 plan 版本面；用户看不出计划文件读不到。
图谱页签对同一文件会显示「计划读取失败」；状态页把读失败折成“没有计划信息”。

## 证据

seed 已交付 run 的 `plan.md` 设为不可读，真浏览器打开状态页。verdict
（`runtime/e2e/status-plan-unreadable-verdict.json`）：

```json
{
  "face": "bound",
  "failureShown": false,
  "delivered": true,
  "text": "…… 报告已交付 …… ◆立项确认 ✓ …… 证据 10 份 ✅ 已交付 读终稿 → v1 已交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/status-plan-unreadable-e2e.mjs plan
```

## 根因

`useStatusFeed` 读取 plan：

```ts
const planArt = await readArtifact(view, 'plan.md', { signal })
const planText = planArt.state === 'ok' ? planArt.text : null
```

`planText=null` 后传给 `runVersionFaceOf`；状态页的 `StatusReads` 没有 plan 字段，也没有
「计划读取失败」的展示分支。`plan.md` 读失败、为空、缺席在状态面同形，只有图谱页签会提示。
状态页的版本面（plan 版本/交付版本）因此静默丢失。

## 修法方向（未实施）

- 把 plan 纳入 `StatusReads`（ArtifactState）：`unreadable/empty` 时状态页显示
  「计划读取失败/为空」+ 重试；`absent` 保持无 plan（旧 run）。
- 版本面在 plan 不可读时显示「计划版本未知」，不要静默消失。
- 保留图谱页签的独立 plan 失败态；两页签共用 `readArtifact` 状态。

## 修复判据

- plan.md 不可读/空 → 状态页显示「计划读取失败/为空」+ 重试；版本面不冒充正常。
- plan.md 确实缺席 → 旧 run 空态（负控）。
- plan.md 可读 → 版本面/图谱正常（正向不回退）。
- 图谱页签的 plan 失败态保留（不回退）。
- 红证：把 plan 的 `!ok` 分支折回 `planText=null` 且不展示 → 本夹具再次无提示，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 plan 三态矩阵，或浏览器层用例。
