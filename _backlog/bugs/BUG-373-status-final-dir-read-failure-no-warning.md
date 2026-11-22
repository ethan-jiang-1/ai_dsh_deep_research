---
status: 排查中
severity: P2
opened: 2026-11-23
---

# BUG-373：final/ 目录读不到时状态页仍显示「✅ 已交付」且无警告——终稿入口点开报错

> 严重级别：P2 ｜ 发现：2026-11-23 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/final-dir-unreadable-verdict.json` + `final-dir-unreadable.png`；
> 夹具 = `runtime/e2e/final-dir-unreadable-e2e.mjs`。

## 症状

bundle 的 `final/` 目录在场但不可读（权限/IO/工作区失败），`delivered.json` 与 present 仍说
已交付。打开「研究状态」：

```text
报告已交付
当前版已交付；历史拍板见 question.md §Decisions
...
✅ 已交付   读终稿 →   v1 已交付 · 当前工作稿
```

状态页没有任何「终稿目录读取失败」警告；点「读终稿 →」后终稿页签报「读不到终稿文件」。
用户会先被告知已交付，再在入口处撞错。

## 证据

seed 已交付 run 的 `final/` 目录设为不可读，真浏览器打开状态页并点「读终稿 →」。verdict
（`runtime/e2e/final-dir-unreadable-verdict.json`）：

```json
{
  "face": "bound",
  "deliveredBadge": true,
  "statusFailure": false,
  "finalFailure": true,
  "statusText": "…… ✅ 已交付 读终稿 → v1 已交付 · 当前工作稿 ……"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/final-dir-unreadable-e2e.mjs
```

## 根因

`useStatusFeed` 的 `StatusReads` 只建模 bundle/question/review/readiness/evidence/receipt，
没有 final 目录：

```ts
const finalDir = names.has('final') ? await view.list('final', { signal }) : null
const finalFileNames = finalDir !== null && finalDir.ok ? ... : []
const versions = latestRunVersion(finalFileNames)
```

`list` 失败与「目录缺席/空」同形 → `finalFileNames=[]`、`versions=0`；`face.versions=0` 不参与
交付态（交付来自 present/回执），所以 ⑤ 仍 ✅ 已交付；没有 read 失败的提示。终稿页签自己
`list('final')` 失败后按地址读文件，才报读不到。

## 修法方向（未实施）

- 把 final 目录纳入 `StatusReads`（SourceRead）：`unreadable` 时状态页显示「终稿目录读取失败」+
  重试，不显示「v1 已交付 · 当前工作稿」的版本细节。
- 交付事实（present/回执）可以保留，但必须同时说明「终稿文件不可读」，不要让“已交付”成为
  唯一可见结论。
- 保留 final 目录缺席/空 = 0 版本（负控）；正常 final 列表照常。

## 修复判据

- final/ 不可读 → 状态页显示终稿读取失败 + 重试；不显示无条件的「v1 已交付」版本细节。
- final/ 正常 → 版本/交付入口照常（正向不回退）。
- final/ 缺席/空 → 0 版本，不冒充读取失败（负控）。
- 终稿页签的读失败态保留；点入口能看到一致的失败说明。
- 红证：把 final 目录读失败折回 `finalFileNames=[]` → 本夹具再次无警告，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 final 目录三态矩阵，或浏览器层用例。
