---
status: 排查中
severity: P2
opened: 2026-11-22
---

# BUG-360：evidence/ 读不到时状态页显示「证据 0 份」——失败被折成空计数

> 严重级别：P2 ｜ 发现：2026-11-22 ｜ 状态：排查中 — 真浏览器现场已复现；按用户指令只报不修。
> 现场 = `runtime/e2e/evidence-read-error-verdict.json` + `evidence-read-error.png`；
> 夹具 = `runtime/e2e/evidence-read-error-e2e.mjs`。

## 症状

bundle 的 `evidence/` 目录在场但不可读（权限/IO/工作区失败）。打开「研究状态」：

```text
证据 0 份
◆立项确认 ✓ ✓ 立项 ✓ 组队 ✓ 侦察 ✓ 挖掘 ✓ 综合 ✓ 审查 ◆交付审阅 ✓ ● 交付
```

页面把「目录读不到」显示成「证据 0 份」，步骤条仍全部绿勾、交付态照常。用户会以为这场
run 没有证据卡（或证据被删），而实际上 10 张卡都在，只是读取失败。

## 证据

seed 已交付 run（`drt_unsc-p5-members`）的 `evidence/` 设为不可读（目录内仍有 10 张卡）：

```sh
chmod 000 .../drt_unsc-p5-members/evidence
```

真浏览器打开状态页。verdict（`runtime/e2e/evidence-read-error-verdict.json`）：

```json
{
  "face": "bound",
  "evidenceReadFailureShown": false,
  "paneText": "…… 证据 0 份 ✅ 已交付 读终稿 → v1 已交付 …… ◆立项确认 ✓ …… ✓ 挖掘 ✓ 综合 ✓ 审查 ◆交付审阅 ✓ ● 交付"
}
```

复跑：

```sh
node --import tsx/esm runtime/e2e/evidence-read-error-e2e.mjs
```

## 根因

`packages/deep-research-pack/src/client/research-status/useStatusFeed.ts`：

```ts
const evidenceDir = names.has('evidence') ? await view.list('evidence', { signal }) : null
const evidenceCount = evidenceDir !== null && evidenceDir.ok
  ? evidenceDir.value.filter((entry) => entry.type === 'file' && entry.name.endsWith('.md')).length
  : 0
```

- `list` 失败（`ok === false`）与「目录缺席」都落 `null` → `evidenceCount=0`；
- 没有错误状态/重试；UI 直接显示「证据 0 份」。
- 步骤条的 evidence 输入 = 计数 > 0；但 `deriveSteps` 的线性推断让后面的 final 把前面
  全部标 done，所以读失败时仍显示 ✓ 挖掘/✓ 审查/✓ 交付，形成「0 份证据但全流程通过」的
  自相矛盾画面。

## 修法方向（未实施）

- `evidence` 计数三态：`ok`（数量）/`missing`（目录确实缺席）/`error`（list 失败）；
  `error` 不落 0，显示「证据读取失败」+ 重试。
- 步骤条不要用线性推断掩盖 evidence 的读失败：`evidence` 未知时不要把挖掘/综合/审查标 done；
  或至少让「证据未知」在概览里优先于「0 份」。
- 保留空证据（目录在场、0 个 .md）的既有「证据 0 份」语义；负控不回退。

## 修复判据

- `evidence/` 不可读 → 显示「证据读取失败」+ 重试，不显示「证据 0 份」；不把流程全标绿。
- `evidence/` 缺席 → 显示「证据 0 份」/无证据（既有语义）。
- `evidence/` 在场且 0 个 .md → 0 份（负控）。
- `evidence/` 正常 10 个 .md → 10 份（正向不回退）。
- 红证：把 `!ok` 分支改回 `0` → 本夹具再次出现「证据 0 份」+全绿，exit 1；还原后绿。
- guard 落点：`useStatusFeed` 的 evidence 三态矩阵，或浏览器层用例（本 seed 夹具可升格）。
